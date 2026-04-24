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
  const refId = payload.localOrderId.replace(/-/g, "").slice(0, 20);

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
    raw: response,
  };
}

export function verifyAuthorizeNetWebhookSignature(
  rawBody: string,
  headerSignature: string | null,
): boolean {
  if (!headerSignature) {
    return false;
  }
  const env = getAuthorizeNetEnv();
  if (!env.webhookSignatureKey) {
    throw new Error("Missing AUTHORIZE_NET_WEBHOOK_SIGNATURE_KEY");
  }

  const expected = crypto
    .createHmac("sha512", Buffer.from(env.webhookSignatureKey, "hex"))
    .update(rawBody)
    .digest("hex")
    .toUpperCase();

  const provided = headerSignature.replace(/^sha512=/i, "").trim().toUpperCase();
  if (provided.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(provided, "hex"),
    Buffer.from(expected, "hex"),
  );
}
