import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildAuthorizeRefId,
  findUnsettledTransactionIdByInvoiceNumber,
  getHostedPaymentToken,
  getTransactionAmountCents,
  getTransactionDetails,
  mapAuthorizeTransactionState,
} from "@/lib/payments/authorize-net";

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

type PaymentRow = {
  id: string;
  status: string;
  amount_cents: number;
  provider_transaction_id: string | null;
  raw_response: Record<string, unknown> | null;
};

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
  const refId = buildAuthorizeRefId(orderId);

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
          authorize_ref_id: refId,
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
      refId,
    });

    const paymentUpdate = await supabaseAdmin
      .from("payments")
      .update({
        raw_response: {
          authorize_invoice_number: invoiceNumber,
          authorize_ref_id: refId,
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
  refId?: string | null;
  paymentStatus: "pending" | "authorized" | "paid" | "failed" | "cancelled";
  orderStatus: "pending" | "paid" | "cancelled";
  rawResponse: unknown;
}) {
  const supabaseAdmin = createSupabaseAdminClient();

  let paymentLookup = null as { id: string; order_id: string } | null;
  if (params.invoiceNumber) {
    const byInvoice = await supabaseAdmin
      .from("payments")
      .select("id, order_id")
      .contains("raw_response", { authorize_invoice_number: params.invoiceNumber })
      .maybeSingle();
    if (byInvoice.error) {
      throw new Error(
        `Failed to look up payment by invoice number: ${byInvoice.error.message}`,
      );
    }
    paymentLookup = (byInvoice.data as { id: string; order_id: string } | null) ?? null;
  }

  if (!paymentLookup && params.refId) {
    const byRefId = await supabaseAdmin
      .from("payments")
      .select("id, order_id")
      .contains("raw_response", { authorize_ref_id: params.refId })
      .maybeSingle();
    if (byRefId.error) {
      throw new Error(`Failed to look up payment by refId: ${byRefId.error.message}`);
    }
    paymentLookup = (byRefId.data as { id: string; order_id: string } | null) ?? null;
  }

  if (!paymentLookup) {
    throw new Error("No local payment found for Authorize.net transaction mapping");
  }

  const paymentId = paymentLookup.id;
  const orderId = paymentLookup.order_id;

  const paymentUpdate = await supabaseAdmin
    .from("payments")
    .update({
      status: params.paymentStatus,
      provider_transaction_id: params.transactionId,
      raw_response: {
        authorize_invoice_number: params.invoiceNumber,
        authorize_ref_id: params.refId ?? null,
        authorize_order_id: orderId,
        authorize_verified: true,
        authorize_transaction_id: params.transactionId,
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

async function getOrderAndPaymentForVerification(orderId: string): Promise<{
  orderId: string;
  orderStatus: string;
  totalCents: number;
  payment: PaymentRow | null;
}> {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id, status, total_cents, payments(id, status, amount_cents, provider_transaction_id, raw_response)",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch order for verification: ${error.message}`);
  }
  if (!data) {
    throw new Error("Order not found");
  }

  const payment = Array.isArray(data.payments) ? data.payments[0] : data.payments;
  return {
    orderId: String(data.id),
    orderStatus: String(data.status),
    totalCents: Number(data.total_cents),
    payment: payment
      ? {
          id: String(payment.id),
          status: String(payment.status),
          amount_cents: Number(payment.amount_cents),
          provider_transaction_id: payment.provider_transaction_id
            ? String(payment.provider_transaction_id)
            : null,
          raw_response:
            payment.raw_response && typeof payment.raw_response === "object"
              ? (payment.raw_response as Record<string, unknown>)
              : null,
        }
      : null,
  };
}

function getRawResponseString(
  rawResponse: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = rawResponse?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function attemptFinalizePendingOrder(orderId: string): Promise<{
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  verificationAttempted: boolean;
}> {
  const snapshot = await getOrderAndPaymentForVerification(orderId);
  if (!snapshot.payment) {
    return {
      orderId: snapshot.orderId,
      orderStatus: snapshot.orderStatus,
      paymentStatus: "pending",
      verificationAttempted: false,
    };
  }
  if (snapshot.payment.status === "paid") {
    return {
      orderId: snapshot.orderId,
      orderStatus: snapshot.orderStatus,
      paymentStatus: snapshot.payment.status,
      verificationAttempted: false,
    };
  }

  const invoiceNumber = getRawResponseString(
    snapshot.payment.raw_response,
    "authorize_invoice_number",
  );
  const refId = getRawResponseString(snapshot.payment.raw_response, "authorize_ref_id");

  let transactionId = snapshot.payment.provider_transaction_id;
  if (!transactionId && invoiceNumber) {
    transactionId = await findUnsettledTransactionIdByInvoiceNumber(invoiceNumber);
  }
  if (!transactionId) {
    return {
      orderId: snapshot.orderId,
      orderStatus: snapshot.orderStatus,
      paymentStatus: snapshot.payment.status,
      verificationAttempted: true,
    };
  }

  const details = await getTransactionDetails(transactionId);
  const mapped = mapAuthorizeTransactionState({
    transactionStatus: details.transactionStatus,
    responseCode: details.responseCode,
  });
  const amountCents = getTransactionAmountCents(details);
  const amountMatches = amountCents === snapshot.totalCents;

  const canMarkPaid = mapped.paymentStatus === "paid" && amountMatches;
  const nextPaymentStatus = canMarkPaid
    ? "paid"
    : mapped.paymentStatus === "paid"
      ? "failed"
      : mapped.paymentStatus;
  const nextOrderStatus = canMarkPaid ? "paid" : mapped.orderStatus;

  const updated = await updateOrderPaymentFromAuthorizeNet({
    transactionId: details.transId,
    invoiceNumber: details.invoiceNumber ?? invoiceNumber,
    refId,
    paymentStatus: nextPaymentStatus,
    orderStatus: nextOrderStatus,
    rawResponse: {
      verification_source: "order_success_fallback",
      transactionStatus: details.transactionStatus,
      responseCode: details.responseCode,
      expectedAmountCents: snapshot.totalCents,
      gatewayAmountCents: amountCents,
      amountMatches,
      details: details.raw,
    },
  });

  return {
    orderId: updated.orderId,
    orderStatus: nextOrderStatus,
    paymentStatus: nextPaymentStatus,
    verificationAttempted: true,
  };
}

export async function processAuthorizeNetTransactionVerification(params: {
  transactionId: string;
  webhookEventType?: string;
  webhookPayload?: {
    payload?: {
      invoiceNumber?: string;
      refId?: string;
    };
  };
}) {
  const details = await getTransactionDetails(params.transactionId);
  const mapped = mapAuthorizeTransactionState({
    transactionStatus: details.transactionStatus,
    responseCode: details.responseCode,
  });

  const supabaseAdmin = createSupabaseAdminClient();
  const invoiceNumber =
    details.invoiceNumber ?? params.webhookPayload?.payload?.invoiceNumber ?? null;
  const refId = params.webhookPayload?.payload?.refId ?? null;

  let paymentLookup = null as {
    order_id: string;
    amount_cents: number;
    raw_response: Record<string, unknown> | null;
  } | null;
  if (invoiceNumber) {
    const byInvoice = await supabaseAdmin
      .from("payments")
      .select("order_id, amount_cents, raw_response")
      .contains("raw_response", { authorize_invoice_number: invoiceNumber })
      .maybeSingle();
    if (byInvoice.error) {
      throw new Error(
        `Failed to fetch mapped payment by invoice for verification: ${byInvoice.error.message}`,
      );
    }
    paymentLookup = (byInvoice.data as typeof paymentLookup) ?? null;
  }
  if (!paymentLookup && refId) {
    const byRefId = await supabaseAdmin
      .from("payments")
      .select("order_id, amount_cents, raw_response")
      .contains("raw_response", { authorize_ref_id: refId })
      .maybeSingle();
    if (byRefId.error) {
      throw new Error(
        `Failed to fetch mapped payment by refId for verification: ${byRefId.error.message}`,
      );
    }
    paymentLookup = (byRefId.data as typeof paymentLookup) ?? null;
  }
  if (!paymentLookup) {
    throw new Error("No local payment mapping found for transaction verification");
  }

  const expectedAmountCents = Number(paymentLookup.amount_cents);
  const amountCents = getTransactionAmountCents(details);
  const amountMatches = amountCents === expectedAmountCents;

  const canMarkPaid = mapped.paymentStatus === "paid" && amountMatches;
  const nextPaymentStatus = canMarkPaid
    ? "paid"
    : mapped.paymentStatus === "paid"
      ? "failed"
      : mapped.paymentStatus;
  const nextOrderStatus = canMarkPaid ? "paid" : mapped.orderStatus;

  return updateOrderPaymentFromAuthorizeNet({
    transactionId: details.transId,
    invoiceNumber,
    refId,
    paymentStatus: nextPaymentStatus,
    orderStatus: nextOrderStatus,
    rawResponse: {
      verification_source: "authorize_webhook",
      webhookEventType: params.webhookEventType ?? null,
      webhookPayload: params.webhookPayload ?? null,
      transactionStatus: details.transactionStatus,
      responseCode: details.responseCode,
      expectedAmountCents,
      gatewayAmountCents: amountCents,
      amountMatches,
      details: details.raw,
    },
  });
}
