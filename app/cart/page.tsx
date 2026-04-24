import Link from "next/link";
import { CartPageContent } from "@/components/cart/cart-page-content";

export default function CartPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8">
        <Link href="/shop" className="text-sm text-gray-600 hover:text-gray-900">
          ← Back to shop
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Cart</h1>
      </div>
      <CartPageContent />
    </main>
  );
}
