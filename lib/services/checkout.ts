export type CheckoutFormInput = {
  email: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  cartSnapshotRaw: string;
};

export type CheckoutCartItem = {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  quantity: number;
};

export type CheckoutFieldErrors = Partial<
  Record<
    | "email"
    | "fullName"
    | "line1"
    | "city"
    | "state"
    | "postalCode"
    | "country"
    | "cart",
    string
  >
>;

export type PreparedCheckout = {
  contact: {
    email: string;
    fullName: string;
    phone: string | null;
  };
  shippingAddress: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  cartItems: CheckoutCartItem[];
  subtotalCents: number;
};

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseCartSnapshot(raw: string): CheckoutCartItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((item) => {
      const row = item as Partial<CheckoutCartItem>;
      const price = Number(row.priceCents);
      const quantity = Number(row.quantity);
      if (!row.productId || !row.slug || !row.name) {
        return null;
      }
      if (!Number.isFinite(price) || price < 0) {
        return null;
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return null;
      }
      return {
        productId: String(row.productId),
        slug: String(row.slug),
        name: String(row.name),
        priceCents: Math.round(price),
        quantity: Math.floor(quantity),
      } satisfies CheckoutCartItem;
    })
    .filter((row): row is CheckoutCartItem => Boolean(row));
}

export function parseCheckoutInput(formData: FormData): CheckoutFormInput {
  return {
    email: cleanText(formData.get("email")),
    fullName: cleanText(formData.get("full_name")),
    phone: cleanText(formData.get("phone")),
    line1: cleanText(formData.get("line1")),
    line2: cleanText(formData.get("line2")),
    city: cleanText(formData.get("city")),
    state: cleanText(formData.get("state")),
    postalCode: cleanText(formData.get("postal_code")),
    country: cleanText(formData.get("country")),
    cartSnapshotRaw: String(formData.get("cart_snapshot") ?? "[]"),
  };
}

export function validateCheckoutInput(input: CheckoutFormInput) {
  const fieldErrors: CheckoutFieldErrors = {};

  if (!input.email) {
    fieldErrors.email = "Email is required.";
  } else if (!isValidEmail(input.email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (!input.fullName) {
    fieldErrors.fullName = "Full name is required.";
  }
  if (!input.line1) {
    fieldErrors.line1 = "Address line 1 is required.";
  }
  if (!input.city) {
    fieldErrors.city = "City is required.";
  }
  if (!input.state) {
    fieldErrors.state = "State is required.";
  }
  if (!input.postalCode) {
    fieldErrors.postalCode = "Postal code is required.";
  }
  if (!input.country) {
    fieldErrors.country = "Country is required.";
  }

  const cartItems = parseCartSnapshot(input.cartSnapshotRaw);
  if (cartItems.length === 0) {
    fieldErrors.cart = "Your cart is empty.";
  }

  const subtotalCents = cartItems.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0,
  );

  const preparedCheckout: PreparedCheckout = {
    contact: {
      email: input.email,
      fullName: input.fullName,
      phone: input.phone || null,
    },
    shippingAddress: {
      line1: input.line1,
      line2: input.line2 || null,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      country: input.country,
    },
    cartItems,
    subtotalCents,
  };

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    preparedCheckout,
  };
}
