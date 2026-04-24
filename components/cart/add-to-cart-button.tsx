"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";

type AddToCartButtonProps = {
  product: {
    id: string;
    slug: string;
    name: string;
    image_url: string | null;
    price_cents: number;
  };
};

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      className="rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
      onClick={() => {
        addItem({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          imageUrl: product.image_url,
          priceCents: product.price_cents,
        });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1200);
      }}
    >
      {added ? "Added" : "Add to cart"}
    </button>
  );
}
