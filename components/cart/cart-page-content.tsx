"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/cart/cart-provider";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function CartPageContent() {
  const { items, subtotalCents, updateQuantity, removeItem, clearCart, isHydrated } =
    useCart();

  if (!isHydrated) {
    return (
      <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        Loading cart...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        <p>Your cart is empty.</p>
        <Link className="mt-3 inline-block font-medium text-gray-900 underline" href="/shop">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-3">
        {items.map((item) => {
          const lineTotal = item.priceCents * item.quantity;
          return (
            <li
              key={item.productId}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex gap-4">
                <div className="h-20 w-20 shrink-0 rounded bg-gray-100">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      width={160}
                      height={160}
                      unoptimized
                      className="h-full w-full rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-500">
                      No image
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatPrice(lineTotal)}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    Unit: {formatPrice(item.priceCents)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="text-sm text-gray-700" htmlFor={`qty-${item.productId}`}>
                      Qty
                    </label>
                    <input
                      id={`qty-${item.productId}`}
                      className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(event) => {
                        updateQuantity(item.productId, Number(event.target.value));
                      }}
                    />
                    <button
                      type="button"
                      className="text-sm font-medium text-red-700 underline"
                      onClick={() => removeItem(item.productId)}
                    >
                      Remove
                    </button>
                    <Link
                      href={`/products/${item.slug}`}
                      className="text-sm font-medium text-gray-900 underline"
                    >
                      View product
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">Subtotal</p>
          <p className="text-base font-semibold text-gray-900">
            {formatPrice(subtotalCents)}
          </p>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Shipping details are collected at checkout. Payment starts in the next phase.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/checkout"
            className="rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Checkout
          </Link>
          <button
            type="button"
            className="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            onClick={clearCart}
          >
            Empty cart
          </button>
        </div>
      </div>
    </div>
  );
}
