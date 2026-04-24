import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { CartLink } from "@/components/cart/cart-link";
import { getActiveProductBySlug } from "@/lib/services/products";

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>;
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/shop" className="text-sm text-gray-600 hover:text-gray-900">
        ← Back to shop
      </Link>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 h-56 rounded bg-gray-100">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              width={960}
              height={540}
              unoptimized
              className="h-full w-full rounded object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              No image
            </div>
          )}
        </div>

        <h1 className="text-2xl font-semibold text-gray-900">{product.name}</h1>
        <p className="mt-2 text-sm font-medium text-gray-900">
          {formatPrice(product.price_cents)}
        </p>
        <p className="mt-4 text-sm text-gray-700">{product.description}</p>
        <div className="mt-5 flex items-center gap-4">
          <AddToCartButton product={product} />
          <CartLink />
        </div>
      </div>
    </main>
  );
}
