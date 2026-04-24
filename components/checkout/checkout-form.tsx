"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-provider";
import { initialCheckoutActionState } from "@/app/checkout/state";
import {
  prepareCheckoutAction,
} from "@/app/checkout/actions";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function fieldErrorText(message?: string) {
  if (!message) {
    return null;
  }
  return <p className="mt-1 text-xs text-red-700">{message}</p>;
}

export function CheckoutForm() {
  const { items, subtotalCents, isHydrated } = useCart();
  const [state, formAction] = useActionState(
    prepareCheckoutAction,
    initialCheckoutActionState,
  );
  const safeState = state ?? initialCheckoutActionState;
  const safeValues = safeState.values ?? initialCheckoutActionState.values;
  const safeFieldErrors = safeState.fieldErrors ?? {};
  const safeFormError = safeState.formError ?? null;
  const safeSuccess = safeState.success ?? null;
  const safePreparedSubtotal = safeState.preparedSubtotalCents ?? null;
  const hostedPayment = safeState.hostedPayment;
  const hostedFormRef = useRef<HTMLFormElement | null>(null);

  const cartSnapshot = useMemo(
    () =>
      JSON.stringify(
        items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      ),
    [items],
  );

  useEffect(() => {
    if (!hostedPayment) {
      return;
    }
    hostedFormRef.current?.submit();
  }, [hostedPayment]);

  if (!isHydrated) {
    return (
      <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        Loading checkout...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        <p>Your cart is empty. Add products before checkout.</p>
        <Link className="mt-3 inline-block font-medium text-gray-900 underline" href="/shop">
          Browse products
        </Link>
      </div>
    );
  }

  if (hostedPayment) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Redirecting to secure payment...</h2>
        <p className="mt-2 text-sm text-gray-600">
          You are being sent to Authorize.net to enter payment details securely.
        </p>
        <form
          ref={hostedFormRef}
          action={hostedPayment.formActionUrl}
          method="post"
          className="mt-4 space-y-3"
        >
          <input type="hidden" name="token" value={hostedPayment.token} />
          <button
            type="submit"
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Continue to Authorize.net
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <form action={formAction} className="space-y-6 rounded-lg border border-gray-200 bg-white p-5">
        <input type="hidden" name="cart_snapshot" value={cartSnapshot} />

        <section>
          <h2 className="text-base font-semibold text-gray-900">Contact</h2>
          <div className="mt-3 grid gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Contact email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={safeValues.email}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
              {fieldErrorText(safeFieldErrors.email)}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">Shipping</h2>
          <div className="mt-3 grid gap-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                Full name
              </label>
              <input
                id="full_name"
                name="full_name"
                required
                defaultValue={safeValues.fullName}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
              {fieldErrorText(safeFieldErrors.fullName)}
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone (optional)
              </label>
              <input
                id="phone"
                name="phone"
                defaultValue={safeValues.phone}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="line1" className="block text-sm font-medium text-gray-700">
                Address line 1
              </label>
              <input
                id="line1"
                name="line1"
                required
                defaultValue={safeValues.line1}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
              {fieldErrorText(safeFieldErrors.line1)}
            </div>
            <div>
              <label htmlFor="line2" className="block text-sm font-medium text-gray-700">
                Address line 2 (optional)
              </label>
              <input
                id="line2"
                name="line2"
                defaultValue={safeValues.line2}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  id="city"
                  name="city"
                  required
                  defaultValue={safeValues.city}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                {fieldErrorText(safeFieldErrors.city)}
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                  State
                </label>
                <input
                  id="state"
                  name="state"
                  required
                  defaultValue={safeValues.state}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                {fieldErrorText(safeFieldErrors.state)}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
                  Postal code
                </label>
                <input
                  id="postal_code"
                  name="postal_code"
                  required
                  defaultValue={safeValues.postalCode}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                {fieldErrorText(safeFieldErrors.postalCode)}
              </div>
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                  Country
                </label>
                <input
                  id="country"
                  name="country"
                  required
                  defaultValue={safeValues.country}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                {fieldErrorText(safeFieldErrors.country)}
              </div>
            </div>
          </div>
        </section>

        {safeFormError ? (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {safeFormError}
          </p>
        ) : null}
        {safeFieldErrors.cart ? (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {safeFieldErrors.cart}
          </p>
        ) : null}
        {safeSuccess ? (
          <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {safeSuccess}
          </p>
        ) : null}

        <button
          type="submit"
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Continue to payment
        </button>
      </form>

      <aside className="h-fit rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Order summary</h2>
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item.productId} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">Qty {item.quantity}</p>
              </div>
              <p className="font-medium text-gray-900">
                {formatPrice(item.priceCents * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-gray-200 pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">Subtotal</span>
            <span className="font-semibold text-gray-900">{formatPrice(subtotalCents)}</span>
          </div>
          {safePreparedSubtotal !== null ? (
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <span>Prepared subtotal</span>
              <span>{formatPrice(safePreparedSubtotal)}</span>
            </div>
          ) : null}
          <p className="mt-3 text-xs text-gray-500">
            Final pricing and product status are re-validated server-side before payment token
            creation.
          </p>
        </div>
      </aside>
    </div>
  );
}
