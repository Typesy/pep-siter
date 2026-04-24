import Link from "next/link";
import Image from "next/image";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import type { ProductListItem } from "@/lib/services/products";

type ProductCardProps = {
  product: ProductListItem;
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 h-36 rounded bg-gray-100">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            width={640}
            height={360}
            unoptimized
            className="h-full w-full rounded object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            No image
          </div>
        )}
      </div>
      <h2 className="text-base font-semibold text-gray-900">{product.name}</h2>
      <p className="mt-1 text-sm text-gray-600">{formatPrice(product.price_cents)}</p>
      <p className="mt-2 text-sm text-gray-600">{product.description}</p>
      <Link
        href={`/products/${product.slug}`}
        className="mt-4 inline-block text-sm font-medium text-gray-900 underline"
      >
        View details
      </Link>
      <div className="mt-3">
        <AddToCartButton product={product} />
      </div>
    </article>
  );
}
