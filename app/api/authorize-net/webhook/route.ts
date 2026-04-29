import { NextResponse } from "next/server";
import {
  inspectAuthorizeNetWebhookSignature,
  verifyAuthorizeNetWebhookSignature,
} from "@/lib/payments/authorize-net";
import { processAuthorizeNetTransactionVerification } from "@/lib/services/orders";

type AuthorizeNetWebhookPayload = {
  eventType?: string;
  payload?: {
    entityName?: string;
    id?: string;
    invoiceNumber?: string;
    refId?: string;
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("X-ANET-Signature");
  const signatureCheck = inspectAuthorizeNetWebhookSignature(rawBody, signature);

  if (!signatureCheck.isValid || !verifyAuthorizeNetWebhookSignature(rawBody, signature)) {
    console.warn(
      `[authorize-net:webhook] signature verification failed ${JSON.stringify(signatureCheck.diagnostics)}`,
    );
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  let payload: AuthorizeNetWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as AuthorizeNetWebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  const transactionId = payload.payload?.id?.trim();

  if (!transactionId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    await processAuthorizeNetTransactionVerification({
      transactionId,
      webhookEventType: payload.eventType,
      webhookPayload: payload,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown webhook processing error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
