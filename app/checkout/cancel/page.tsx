import Link from "next/link";
import { getPublicOrderPaymentStatus } from "@/lib/services/orders";

type CheckoutCancelPageProps = {
  searchParams: Promise<{ orderId?: string }>;
};

export default async function CheckoutCancelPage({
  searchParams,
}: CheckoutCancelPageProps) {
  const params = await searchParams;
  const orderId = params.orderId?.trim() ?? "";
  let status = null;
  let statusLookupError: string | null = null;
  if (orderId) {
    try {
      status = await getPublicOrderPaymentStatus(orderId);
    } catch (error) {
      statusLookupError = error instanceof Error ? error.message : "Unable to load order status";
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Payment cancelled</h1>
      <p className="mt-3 text-sm text-gray-700">
        Your hosted checkout was cancelled. Your order remains pending until a verified payment
        succeeds.
      </p>
      {statusLookupError ? (
        <p className="mt-3 text-xs text-gray-500">
          Local status could not be loaded right now: {statusLookupError}
        </p>
      ) : null}

      {status ? (
        <dl className="mt-4 rounded border border-gray-200 bg-white p-4 text-sm text-gray-800">
          <div className="flex justify-between gap-2">
            <dt>Order ID</dt>
            <dd className="font-mono">{status.orderId}</dd>
          </div>
          <div className="mt-2 flex justify-between gap-2">
            <dt>Order status</dt>
            <dd>{status.orderStatus}</dd>
          </div>
          <div className="mt-2 flex justify-between gap-2">
            <dt>Payment status</dt>
            <dd>{status.paymentStatus}</dd>
          </div>
        </dl>
      ) : null}

      <div className="mt-5 flex gap-4 text-sm">
        <Link href="/checkout" className="font-medium text-gray-900 underline">
          Return to checkout
        </Link>
        <Link href="/cart" className="font-medium text-gray-900 underline">
          Back to cart
        </Link>
      </div>
    </main>
  );
}
