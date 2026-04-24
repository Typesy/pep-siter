"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/cart-provider";

export function CartLink() {
  const { itemCount, isHydrated } = useCart();

  return (
    <Link className="text-sm font-medium text-gray-900 underline" href="/cart">
      <span suppressHydrationWarning>Cart ({isHydrated ? itemCount : 0})</span>
    </Link>
  );
}
