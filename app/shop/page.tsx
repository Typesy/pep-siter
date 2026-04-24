import Link from "next/link";
import { CartLink } from "@/components/cart/cart-link";
import { ProductCard } from "@/components/products/product-card";
import { getActiveProducts } from "@/lib/services/products";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await getActiveProducts();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
          ← Home
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Shop</h1>
        <p className="mt-2 text-sm text-gray-600">
          Active research products only.
        </p>
        <div className="mt-3">
          <CartLink />
        </div>
      </div>

      {products.length === 0 ? (
        <p className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          No active products are available right now.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
