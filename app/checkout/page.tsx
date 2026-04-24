import Link from "next/link";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export default function CheckoutPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <Link href="/cart" className="text-sm text-gray-600 hover:text-gray-900">
          ← Back to cart
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Checkout</h1>
        <p className="mt-2 text-sm text-gray-600">
          Enter contact and shipping information before payment.
        </p>
      </div>
      <CheckoutForm />
    </main>
  );
}
