import crypto from "node:crypto";

type AuthorizeNetEnvironment = "sandbox" | "production";

type AuthorizeNetApiResponse<T> = T & {
  messages?: {
    resultCode?: "Ok" | "Error";
    message?: Array<{ code?: string; text?: string }>;
  };
};

export type HostedPaymentTokenResult = {
  token: string;
  formPostUrl: string;
};

export type TransactionDetailsResult = {
  transId: string;
  transactionStatus: string;
  responseCode: number;
  invoiceNumber: string | null;
  authAmount: number | null;
  settleAmount: number | null;
  raw: unknown;
};

type CheckoutPaymentPayload = {
  amountCents: number;
  email: string;
  fullName: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  localOrderId: string;
  invoiceNumber: string;
  refId?: string;
};

type AuthorizeNetEnv = {
  apiLoginId: string;
  transactionKey: string;
  environment: AuthorizeNetEnvironment;
  merchantName: string;
  webhookSignatureKey: string;
  appUrl: string;
};

function cleanEnvValue(value: string | undefined): string {
  const trimmed = String(value ?? "").trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function getAuthorizeNetEnv(): AuthorizeNetEnv {
  const apiLoginId = cleanEnvValue(process.env.AUTHORIZE_NET_API_LOGIN_ID);
  const transactionKey = cleanEnvValue(process.env.AUTHORIZE_NET_TRANSACTION_KEY);
  const environment = cleanEnvValue(process.env.AUTHORIZE_NET_ENVIRONMENT);
  const merchantName = cleanEnvValue(process.env.AUTHORIZE_NET_MERCHANT_NAME);
  const webhookSignatureKey = cleanEnvValue(
    process.env.AUTHORIZE_NET_WEBHOOK_SIGNATURE_KEY,
  );
  const appUrl = cleanEnvValue(process.env.NEXT_PUBLIC_APP_URL);

  if (!apiLoginId) {
    throw new Error("Missing AUTHORIZE_NET_API_LOGIN_ID");
  }
  if (!transactionKey) {
    throw new Error("Missing AUTHORIZE_NET_TRANSACTION_KEY");
  }
  if (environment !== "sandbox" && environment !== "production") {
    throw new Error(
      "Missing or invalid AUTHORIZE_NET_ENVIRONMENT (use 'sandbox' or 'production')",
    );
  }
  if (!appUrl) {
    throw new Error("Missing NEXT_PUBLIC_APP_URL");
  }

  return {
    apiLoginId,
    transactionKey,
    environment,
    merchantName,
    webhookSignatureKey,
    appUrl,
  };
}

function getAuthorizeNetApiEndpoint(environment: AuthorizeNetEnvironment): string {
  return environment === "production"
    ? "https://api.authorize.net/xml/v1/request.api"
    : "https://apitest.authorize.net/xml/v1/request.api";
}

function getAuthorizeNetHostedPaymentEndpoint(
  environment: AuthorizeNetEnvironment,
): string {
  return environment === "production"
    ? "https://accept.authorize.net/payment/payment"
    : "https://test.authorize.net/payment/payment";
}

export function buildAuthorizeRefId(orderId: string): string {
  return orderId.replace(/-/g, "").slice(0, 20);
}

function dollarsFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const tokens = fullName.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return { firstName: "Customer", lastName: "Customer" };
  }
  if (tokens.length === 1) {
    return { firstName: tokens[0], lastName: tokens[0] };
  }
  return {
    firstName: tokens.slice(0, -1).join(" "),
    lastName: tokens[tokens.length - 1],
  };
}

async function authorizeNetRequest<TResponse>(
  requestBody: Record<string, unknown>,
): Promise<AuthorizeNetApiResponse<TResponse>> {
  const env = getAuthorizeNetEnv();
  const endpoint = getAuthorizeNetApiEndpoint(env.environment);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Authorize.net API request failed with ${response.status}`);
  }

  return (await response.json()) as AuthorizeNetApiResponse<TResponse>;
}

function ensureAuthorizeNetSuccess(
  response: AuthorizeNetApiResponse<{ token?: string }>,
) {
  const resultCode = response.messages?.resultCode;
  if (resultCode === "Ok") {
    return;
  }
  const firstMessage = response.messages?.message?.[0];
  const code = firstMessage?.code ?? "UNKNOWN";
  const text = firstMessage?.text ?? "Authorize.net request failed";
  throw new Error(`Authorize.net error ${code}: ${text}`);
}

export async function getHostedPaymentToken(
  payload: CheckoutPaymentPayload,
): Promise<HostedPaymentTokenResult> {
  const env = getAuthorizeNetEnv();
  const { firstName, lastName } = splitFullName(payload.fullName);
  const successUrl = `${env.appUrl}/checkout/success?orderId=${encodeURIComponent(payload.localOrderId)}`;
  const cancelUrl = `${env.appUrl}/checkout/cancel?orderId=${encodeURIComponent(payload.localOrderId)}`;
  const refId = payload.refId ?? buildAuthorizeRefId(payload.localOrderId);

  const request = {
    getHostedPaymentPageRequest: {
      merchantAuthentication: {
        name: env.apiLoginId,
        transactionKey: env.transactionKey,
      },
      refId,
      transactionRequest: {
        transactionType: "authCaptureTransaction",
        amount: dollarsFromCents(payload.amountCents),
        order: {
          invoiceNumber: payload.invoiceNumber,
          description: `Order ${payload.localOrderId}`,
        },
        customer: {
          email: payload.email,
        },
        billTo: {
          firstName,
          lastName,
          address: payload.line1,
          city: payload.city,
          state: payload.state,
          zip: payload.postalCode,
          country: payload.country,
        },
      },
      hostedPaymentSettings: {
        setting: [
          {
            settingName: "hostedPaymentReturnOptions",
            settingValue: JSON.stringify({
              showReceipt: true,
              url: successUrl,
              urlText: "Return to store",
              cancelUrl,
              cancelUrlText: "Cancel",
            }),
          },
          {
            settingName: "hostedPaymentPaymentOptions",
            settingValue: JSON.stringify({
              showCreditCard: true,
              showBankAccount: false,
            }),
          },
          {
            settingName: "hostedPaymentShippingAddressOptions",
            settingValue: JSON.stringify({
              show: false,
              required: false,
            }),
          },
          {
            settingName: "hostedPaymentBillingAddressOptions",
            settingValue: JSON.stringify({
              show: true,
              required: false,
            }),
          },
          {
            settingName: "hostedPaymentCustomerOptions",
            settingValue: JSON.stringify({
              showEmail: true,
              requiredEmail: true,
            }),
          },
          {
            settingName: "hostedPaymentButtonOptions",
            settingValue: JSON.stringify({
              text: "Pay",
            }),
          },
          {
            settingName: "hostedPaymentOrderOptions",
            settingValue: JSON.stringify({
              show: true,
              merchantName: env.merchantName || undefined,
            }),
          },
        ],
      },
    },
  };

  const response = await authorizeNetRequest<{
    token?: string;
  }>(request);
  ensureAuthorizeNetSuccess(response);

  if (!response.token) {
    throw new Error("Authorize.net did not return a hosted payment token");
  }

  return {
    token: response.token,
    formPostUrl: getAuthorizeNetHostedPaymentEndpoint(env.environment),
  };
}

export async function getTransactionDetails(
  transactionId: string,
): Promise<TransactionDetailsResult> {
  const env = getAuthorizeNetEnv();
  const request = {
    getTransactionDetailsRequest: {
      merchantAuthentication: {
        name: env.apiLoginId,
        transactionKey: env.transactionKey,
      },
      transId: transactionId,
    },
  };

  const response = await authorizeNetRequest<{
    transaction?: {
      transId?: string;
      transactionStatus?: string;
      responseCode?: number;
      authAmount?: number | string;
      settleAmount?: number | string;
      order?: { invoiceNumber?: string };
    };
  }>(request);
  ensureAuthorizeNetSuccess(response);

  const transaction = response.transaction;
  if (!transaction?.transId || !transaction.transactionStatus) {
    throw new Error("Authorize.net transaction details response is missing fields");
  }

  return {
    transId: transaction.transId,
    transactionStatus: transaction.transactionStatus,
    responseCode: Number(transaction.responseCode ?? 0),
    invoiceNumber: transaction.order?.invoiceNumber ?? null,
    authAmount:
      transaction.authAmount !== undefined ? Number(transaction.authAmount) : null,
    settleAmount:
      transaction.settleAmount !== undefined ? Number(transaction.settleAmount) : null,
    raw: response,
  };
}

export function getTransactionAmountCents(details: TransactionDetailsResult): number | null {
  const settle = details.settleAmount;
  if (settle !== null && Number.isFinite(settle) && settle > 0) {
    return Math.round(settle * 100);
  }
  const auth = details.authAmount;
  if (auth !== null && Number.isFinite(auth) && auth > 0) {
    return Math.round(auth * 100);
  }
  return null;
}

export type AuthorizeTransactionState = {
  paymentStatus: "pending" | "authorized" | "paid" | "failed" | "cancelled";
  orderStatus: "pending" | "paid" | "cancelled";
};

export type AuthorizeWebhookSignatureDiagnostics = {
  keyLength: number;
  keyIsValidHex: boolean;
  receivedSignatureLength: number;
  computedSignatureLength: number;
  prefixPresent: boolean;
};

export function mapAuthorizeTransactionState(params: {
  transactionStatus: string;
  responseCode: number;
}): AuthorizeTransactionState {
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

export async function findUnsettledTransactionIdByInvoiceNumber(
  invoiceNumber: string,
): Promise<string | null> {
  const env = getAuthorizeNetEnv();
  const request = {
    getUnsettledTransactionListRequest: {
      merchantAuthentication: {
        name: env.apiLoginId,
        transactionKey: env.transactionKey,
      },
    },
  };

  const response = await authorizeNetRequest<{
    messages?: {
      resultCode?: "Ok" | "Error";
      message?: Array<{ code?: string; text?: string }>;
    };
    transactions?:
      | Array<{
          transId?: string;
          invoiceNumber?: string;
        }>
      | {
          transaction?: Array<{
            transId?: string;
            invoiceNumber?: string;
          }>;
        };
  }>(request);

  if (response.messages?.resultCode === "Error") {
    const firstMessage = response.messages.message?.[0];
    const code = firstMessage?.code ?? "UNKNOWN";
    const text = firstMessage?.text ?? "Authorize.net request failed";
    throw new Error(`Authorize.net error ${code}: ${text}`);
  }

  const transactions = Array.isArray(response.transactions)
    ? response.transactions
    : response.transactions?.transaction ?? [];
  const matched = transactions.find(
    (row) =>
      row.invoiceNumber?.trim().toLowerCase() === invoiceNumber.trim().toLowerCase(),
  );

  return matched?.transId?.trim() ?? null;
}

export function verifyAuthorizeNetWebhookSignature(
  rawBody: string,
  headerSignature: string | null,
): boolean {
  return inspectAuthorizeNetWebhookSignature(rawBody, headerSignature).isValid;
}

export function inspectAuthorizeNetWebhookSignature(
  rawBody: string,
  headerSignature: string | null,
): {
  isValid: boolean;
  diagnostics: AuthorizeWebhookSignatureDiagnostics;
} {
  const env = getAuthorizeNetEnv();
  if (!env.webhookSignatureKey) {
    throw new Error("Missing AUTHORIZE_NET_WEBHOOK_SIGNATURE_KEY");
  }

  const signatureKey = env.webhookSignatureKey.trim();
  const keyIsValidHex = /^[0-9a-fA-F]{128}$/.test(signatureKey);
  const prefixPresent = /^sha512=/i.test(headerSignature ?? "");
  const provided = (headerSignature ?? "")
    .replace(/^sha512=/i, "")
    .trim()
    .toUpperCase();
  const providedIsHex =
    provided.length > 0 && provided.length % 2 === 0 && /^[0-9A-F]+$/.test(provided);

  const expected = keyIsValidHex
    ? crypto
        .createHmac("sha512", Buffer.from(signatureKey, "hex"))
        .update(rawBody)
        .digest("hex")
        .toUpperCase()
    : "";

  const receivedSignatureLength = provided.length;
  const computedSignatureLength = expected.length;

  const sameLength = receivedSignatureLength === computedSignatureLength;
  const isValid =
    keyIsValidHex &&
    providedIsHex &&
    sameLength &&
    crypto.timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(expected, "hex"));

  return {
    isValid,
    diagnostics: {
      keyLength: signatureKey.length,
      keyIsValidHex,
      receivedSignatureLength,
      computedSignatureLength,
      prefixPresent,
    },
  };
}
