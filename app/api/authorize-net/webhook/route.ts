import { NextResponse } from "next/server";
import {
  getTransactionDetails,
  verifyAuthorizeNetWebhookSignature,
} from "@/lib/payments/authorize-net";
import { updateOrderPaymentFromAuthorizeNet } from "@/lib/services/orders";

type AuthorizeNetWebhookPayload = {
  eventType?: string;
  payload?: {
    entityName?: string;
    id?: string;
  };
};

function mapAuthorizeTransactionStatus(params: {
  transactionStatus: string;
  responseCode: number;
}): {
  paymentStatus: "pending" | "authorized" | "paid" | "failed" | "cancelled";
  orderStatus: "pending" | "paid" | "cancelled";
} {
  const status = params.transactionStatus.toLowerCase();
  const approved = params.responseCode === 1;

  if (approved && (status === "capturedpendingsettlement" || status === "settledsuccessfully")) {
    return { paymentStatus: "paid", orderStatus: "paid" };
  }
  if (approved && status === "authorizedpendingcapture") {
    return { paymentStatus: "authorized", orderStatus: "pending" };
  }
  if (status.includes("void") || status.includes("cancel")) {
    return { paymentStatus: "cancelled", orderStatus: "cancelled" };
  }
  if (status.includes("declin") || status.includes("fail") || status.includes("error")) {
    return { paymentStatus: "failed", orderStatus: "pending" };
  }
  return { paymentStatus: "pending", orderStatus: "pending" };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("X-ANET-Signature");

  if (!verifyAuthorizeNetWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  let payload: AuthorizeNetWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as AuthorizeNetWebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  const transactionId =
    payload.payload?.entityName === "transaction" ? payload.payload.id?.trim() : undefined;

  if (!transactionId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const details = await getTransactionDetails(transactionId);
    const status = mapAuthorizeTransactionStatus({
      transactionStatus: details.transactionStatus,
      responseCode: details.responseCode,
    });

    await updateOrderPaymentFromAuthorizeNet({
      transactionId: details.transId,
      invoiceNumber: details.invoiceNumber,
      paymentStatus: status.paymentStatus,
      orderStatus: status.orderStatus,
      rawResponse: {
        webhookEventType: payload.eventType ?? null,
        transactionStatus: details.transactionStatus,
        responseCode: details.responseCode,
        details: details.raw,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown webhook processing error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
