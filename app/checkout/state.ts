import type { CheckoutFieldErrors } from "@/lib/services/checkout";

export type CheckoutActionState = {
  success: string | null;
  formError: string | null;
  fieldErrors: CheckoutFieldErrors;
  values: {
    email: string;
    fullName: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  preparedSubtotalCents: number | null;
  orderId: string | null;
  hostedPayment: {
    token: string;
    formActionUrl: string;
  } | null;
};

export const initialCheckoutActionState: CheckoutActionState = {
  success: null,
  formError: null,
  fieldErrors: {},
  values: {
    email: "",
    fullName: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  },
  preparedSubtotalCents: null,
  orderId: null,
  hostedPayment: null,
};
