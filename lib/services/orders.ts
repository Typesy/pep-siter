import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getHostedPaymentToken } from "@/lib/payments/authorize-net";

export type CheckoutProductRequestItem = {
  productId: string;
  quantity: number;
};

export type CheckoutAddressInput = {
  email: string;
  fullName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type CreatePendingCheckoutPaymentInput = {
  userId: string | null;
  guestEmail: string;
  address: CheckoutAddressInput;
  productRequests: CheckoutProductRequestItem[];
};

export type CreatePendingCheckoutPaymentResult = {
  orderId: string;
  paymentId: string;
  hostedPaymentToken: string;
  hostedPaymentFormUrl: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
};

type DbProduct = {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  is_active: boolean;
};

function buildInvoiceNumber(orderId: string): string {
  return `ORD${orderId.replace(/-/g, "").slice(0, 17)}`;
}

function normalizeProductRequests(
  items: CheckoutProductRequestItem[],
): CheckoutProductRequestItem[] {
  const grouped = new Map<string, number>();
  for (const item of items) {
    const quantity = Math.floor(item.quantity);
    if (!item.productId || quantity <= 0) {
      continue;
    }
    grouped.set(item.productId, (grouped.get(item.productId) ?? 0) + quantity);
  }
  return Array.from(grouped.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export async function createPendingCheckoutPayment(
  input: CreatePendingCheckoutPaymentInput,
): Promise<CreatePendingCheckoutPaymentResult> {
  const supabaseAdmin = createSupabaseAdminClient();
  const normalizedRequests = normalizeProductRequests(input.productRequests);

  if (normalizedRequests.length === 0) {
    throw new Error("Checkout contains no valid products");
  }

  const productIds = normalizedRequests.map((item) => item.productId);
  const { data: products, error: productError } = await supabaseAdmin
    .from("products")
    .select("id, name, slug, price_cents, is_active")
    .in("id", productIds);

  if (productError) {
    throw new Error(`Failed to fetch products: ${productError.message}`);
  }

  const productsById = new Map<string, DbProduct>(
    (products ?? []).map((product) => [product.id, product as DbProduct]),
  );

  for (const requestItem of normalizedRequests) {
    const product = productsById.get(requestItem.productId);
    if (!product) {
      throw new Error("One or more products no longer exist");
    }
    if (!product.is_active) {
      throw new Error("One or more products are no longer available");
    }
  }

  const subtotalCents = normalizedRequests.reduce((sum, requestItem) => {
    const product = productsById.get(requestItem.productId);
    if (!product) {
      return sum;
    }
    return sum + product.price_cents * requestItem.quantity;
  }, 0);
  const shippingCents = 0;
  const totalCents = subtotalCents + shippingCents;

  const orderInsert = await supabaseAdmin
    .from("orders")
    .insert({
      user_id: input.userId,
      guest_email: input.userId ? null : input.guestEmail,
      status: "pending",
      subtotal_cents: subtotalCents,
      shipping_cents: shippingCents,
      total_cents: totalCents,
    })
    .select("id")
    .single();

  if (orderInsert.error || !orderInsert.data) {
    throw new Error(`Failed to create order: ${orderInsert.error?.message ?? "unknown"}`);
  }
  const orderId = orderInsert.data.id as string;
  const invoiceNumber = buildInvoiceNumber(orderId);

  try {
    const orderItemsPayload = normalizedRequests.map((requestItem) => {
      const product = productsById.get(requestItem.productId)!;
      return {
        order_id: orderId,
        product_id: product.id,
        product_name: product.name,
        unit_price_cents: product.price_cents,
        quantity: requestItem.quantity,
        line_total_cents: product.price_cents * requestItem.quantity,
      };
    });

    const orderItemsInsert = await supabaseAdmin
      .from("order_items")
      .insert(orderItemsPayload);
    if (orderItemsInsert.error) {
      throw new Error(`Failed to create order items: ${orderItemsInsert.error.message}`);
    }

    const addressInsert = await supabaseAdmin.from("addresses").insert({
      order_id: orderId,
      full_name: input.address.fullName,
      email: input.address.email,
      phone: input.address.phone,
      line1: input.address.line1,
      line2: input.address.line2,
      city: input.address.city,
      state: input.address.state,
      postal_code: input.address.postalCode,
      country: input.address.country,
    });
    if (addressInsert.error) {
      throw new Error(`Failed to create address: ${addressInsert.error.message}`);
    }

    const paymentInsert = await supabaseAdmin
      .from("payments")
      .insert({
        order_id: orderId,
        provider: "authorize_net",
        status: "pending",
        amount_cents: totalCents,
        raw_response: {
          authorize_invoice_number: invoiceNumber,
          authorize_order_id: orderId,
        },
      })
      .select("id")
      .single();
    if (paymentInsert.error || !paymentInsert.data) {
      throw new Error(
        `Failed to create payment record: ${paymentInsert.error?.message ?? "unknown"}`,
      );
    }
    const paymentId = paymentInsert.data.id as string;

    const token = await getHostedPaymentToken({
      amountCents: totalCents,
      email: input.address.email,
      fullName: input.address.fullName,
      line1: input.address.line1,
      city: input.address.city,
      state: input.address.state,
      postalCode: input.address.postalCode,
      country: input.address.country,
      localOrderId: orderId,
      invoiceNumber,
    });

    const paymentUpdate = await supabaseAdmin
      .from("payments")
      .update({
        raw_response: {
          authorize_invoice_number: invoiceNumber,
          authorize_order_id: orderId,
          authorize_hosted_token_obtained: true,
        },
      })
      .eq("id", paymentId);
    if (paymentUpdate.error) {
      throw new Error(
        `Failed to update payment hosted token status: ${paymentUpdate.error.message}`,
      );
    }

    return {
      orderId,
      paymentId,
      hostedPaymentToken: token.token,
      hostedPaymentFormUrl: token.formPostUrl,
      subtotalCents,
      shippingCents,
      totalCents,
    };
  } catch (error) {
    // Reason: if any pre-payment step fails, delete pending order and cascaded rows.
    await supabaseAdmin.from("orders").delete().eq("id", orderId);
    throw error;
  }
}

export type PublicOrderPaymentStatus = {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  providerTransactionId: string | null;
};

export async function getPublicOrderPaymentStatus(
  orderId: string,
): Promise<PublicOrderPaymentStatus | null> {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, status, payments(status, provider_transaction_id)")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch order status: ${error.message}`);
  }
  if (!data) {
    return null;
  }

  const payment = Array.isArray(data.payments) ? data.payments[0] : data.payments;
  return {
    orderId: data.id as string,
    orderStatus: String(data.status),
    paymentStatus: payment ? String(payment.status) : "pending",
    providerTransactionId: payment?.provider_transaction_id
      ? String(payment.provider_transaction_id)
      : null,
  };
}

export async function updateOrderPaymentFromAuthorizeNet(params: {
  transactionId: string;
  invoiceNumber: string | null;
  paymentStatus: "pending" | "authorized" | "paid" | "failed" | "cancelled";
  orderStatus: "pending" | "paid" | "cancelled";
  rawResponse: unknown;
}) {
  const supabaseAdmin = createSupabaseAdminClient();

  if (!params.invoiceNumber) {
    throw new Error("Authorize.net transaction is missing invoice number");
  }

  const paymentLookup = await supabaseAdmin
    .from("payments")
    .select("id, order_id")
    .contains("raw_response", { authorize_invoice_number: params.invoiceNumber })
    .maybeSingle();

  if (paymentLookup.error) {
    throw new Error(`Failed to look up payment by invoice number: ${paymentLookup.error.message}`);
  }
  if (!paymentLookup.data) {
    throw new Error("No local payment found for Authorize.net invoice number");
  }

  const paymentId = paymentLookup.data.id as string;
  const orderId = paymentLookup.data.order_id as string;

  const paymentUpdate = await supabaseAdmin
    .from("payments")
    .update({
      status: params.paymentStatus,
      provider_transaction_id: params.transactionId,
      raw_response: {
        authorize_invoice_number: params.invoiceNumber,
        authorize_order_id: orderId,
        authorize_verified: true,
        authorize_last_response: params.rawResponse,
      },
    })
    .eq("id", paymentId);
  if (paymentUpdate.error) {
    throw new Error(`Failed to update payment status: ${paymentUpdate.error.message}`);
  }

  const orderUpdate = await supabaseAdmin
    .from("orders")
    .update({
      status: params.orderStatus,
    })
    .eq("id", orderId);
  if (orderUpdate.error) {
    throw new Error(`Failed to update order status: ${orderUpdate.error.message}`);
  }

  return { orderId, paymentId };
}
