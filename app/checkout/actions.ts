"use server";

import {
  parseCheckoutInput,
  validateCheckoutInput
} from "@/lib/services/checkout";
import type { CheckoutActionState } from "@/app/checkout/state";

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
    };
  }

  return {
    success:
      "Checkout details are valid. Payment and final server-side price verification are added in Phase 7.",
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
    preparedSubtotalCents: validation.preparedCheckout.subtotalCents,
  };
}
