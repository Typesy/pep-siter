import Link from "next/link";
import { getPublicOrderPaymentStatus } from "@/lib/services/orders";

type CheckoutSuccessPageProps = {
  searchParams: Promise<{ orderId?: string }>;
};

function messageForStatus(paymentStatus: string) {
  if (paymentStatus === "paid") {
    return "Payment verified. Your order is marked as paid.";
  }
  if (paymentStatus === "failed") {
    return "Payment did not complete successfully. Please try checkout again.";
  }
  if (paymentStatus === "cancelled") {
    return "Payment was cancelled.";
  }
  return "Payment is still pending verification. Refresh this page in a moment.";
}

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const params = await searchParams;
  const orderId = params.orderId?.trim() ?? "";

  if (!orderId) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-semibold text-gray-900">Checkout return</h1>
        <p className="mt-3 text-sm text-gray-700">
          Missing order ID. We cannot confirm payment state from this return.
        </p>
        <Link href="/shop" className="mt-4 inline-block text-sm font-medium text-gray-900 underline">
          Back to shop
        </Link>
      </main>
    );
  }

  let status = null;
  let statusLookupError: string | null = null;
  try {
    status = await getPublicOrderPaymentStatus(orderId);
  } catch (error) {
    statusLookupError = error instanceof Error ? error.message : "Unable to load order status";
  }

  if (statusLookupError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-semibold text-gray-900">Payment return received</h1>
        <p className="mt-3 text-sm text-gray-700">
          We could not load local payment status right now: {statusLookupError}
        </p>
        <p className="mt-3 text-xs text-gray-500">
          This page never marks orders paid directly from redirect.
        </p>
      </main>
    );
  }

  if (!status) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-semibold text-gray-900">Checkout return</h1>
        <p className="mt-3 text-sm text-gray-700">
          We could not find that order. If you were charged, contact support with your transaction ID.
        </p>
        <Link href="/shop" className="mt-4 inline-block text-sm font-medium text-gray-900 underline">
          Back to shop
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Payment return received</h1>
      <p className="mt-3 text-sm text-gray-700">{messageForStatus(status.paymentStatus)}</p>
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
      <p className="mt-3 text-xs text-gray-500">
        This page does not mark payments as paid. Status is updated only from server-side verification.
      </p>
      <Link href="/shop" className="mt-4 inline-block text-sm font-medium text-gray-900 underline">
        Continue shopping
      </Link>
    </main>
  );
}
