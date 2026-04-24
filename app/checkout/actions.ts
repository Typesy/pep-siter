"use server";

import {
  parseCheckoutInput,
  validateCheckoutInput,
} from "@/lib/services/checkout";
import type { CheckoutActionState } from "@/app/checkout/state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPendingCheckoutPayment } from "@/lib/services/orders";

export async function prepareCheckoutAction(
  _prevState: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const parsed = parseCheckoutInput(formData);
  const validation = validateCheckoutInput(parsed);

  if (!validation.isValid) {
    return {
      success: null,
      formError: "Please fix the highlighted fields.",
      fieldErrors: validation.fieldErrors,
      values: {
        email: parsed.email,
        fullName: parsed.fullName,
        phone: parsed.phone,
        line1: parsed.line1,
        line2: parsed.line2,
        city: parsed.city,
        state: parsed.state,
        postalCode: parsed.postalCode,
        country: parsed.country,
      },
      preparedSubtotalCents: null,
      orderId: null,
      hostedPayment: null,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const created = await createPendingCheckoutPayment({
      userId: user?.id ?? null,
      guestEmail: parsed.email,
      address: {
        email: parsed.email,
        fullName: parsed.fullName,
        phone: parsed.phone || null,
        line1: parsed.line1,
        line2: parsed.line2 || null,
        city: parsed.city,
        state: parsed.state,
        postalCode: parsed.postalCode,
        country: parsed.country,
      },
      productRequests: validation.preparedCheckout.cartItems,
    });

    return {
      success: "Checkout accepted. Redirecting to secure Authorize.net payment...",
      formError: null,
      fieldErrors: {},
      values: {
        email: parsed.email,
        fullName: parsed.fullName,
        phone: parsed.phone,
        line1: parsed.line1,
        line2: parsed.line2,
        city: parsed.city,
        state: parsed.state,
        postalCode: parsed.postalCode,
        country: parsed.country,
      },
      preparedSubtotalCents: created.subtotalCents,
      orderId: created.orderId,
      hostedPayment: {
        token: created.hostedPaymentToken,
        formActionUrl: created.hostedPaymentFormUrl,
      },
    };
  } catch (error) {
    return {
      success: null,
      formError:
        error instanceof Error
          ? error.message
          : "Checkout could not be prepared for payment.",
      fieldErrors: {},
      values: {
        email: parsed.email,
        fullName: parsed.fullName,
        phone: parsed.phone,
        line1: parsed.line1,
        line2: parsed.line2,
        city: parsed.city,
        state: parsed.state,
        postalCode: parsed.postalCode,
        country: parsed.country,
      },
      preparedSubtotalCents: null,
      orderId: null,
      hostedPayment: null,
    };
  }

}
