import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Pool } from "pg";
import type { Plugin } from "vite";

type JsonObject = Record<string, unknown>;
type EnvMap = Record<string, string | undefined>;

type PersistedTransaction = {
  merchantOrderId: string;
  merchantReference: string | null;
  amount: number | null;
  currency: string | null;
  payerReference: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  checkoutUrl: string | null;
  fastpspStatus: string | null;
  paymentId: string | null;
  localPaymentId: string | null;
  provider: string | null;
  trxId: string | null;
  webhookStatus: string | null;
  webhookPayload: JsonObject | null;
  requestPayload: JsonObject | null;
  responsePayload: JsonObject | null;
  errorMessage: string | null;
};

let dbPool: Pool | null = null;
let schemaEnsured = false;
let runtimeEnv: EnvMap = process.env as EnvMap;

function readEnv(name: string) {
  const fromRuntime = runtimeEnv[name];
  if (typeof fromRuntime === "string" && fromRuntime.trim()) {
    return fromRuntime.trim();
  }

  const fromProcess = process.env[name];
  if (typeof fromProcess === "string" && fromProcess.trim()) {
    return fromProcess.trim();
  }

  return "";
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function toErrorMessage(value: unknown, fallback: string) {
  if (value instanceof Error && value.message) {
    return value.message;
  }
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return fallback;
}

async function readRawBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNullableString(value: unknown) {
  const text = toTrimmedString(value);
  return text ? text : null;
}

function toNullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const numeric = Number(value.replaceAll(",", "").trim());
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return null;
}

function defaultCallbackUrl(origin: string) {
  return origin;
}

function createIds() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 9000 + 1000);
  return {
    orderId: `ORDER-${timestamp}-${random}`,
    reference: `REF-${timestamp}-${random}`,
  };
}

function normalizeAmount(input: unknown) {
  if (typeof input === "number" && Number.isFinite(input)) {
    return input.toFixed(2);
  }
  if (typeof input === "string") {
    const numeric = Number(input.replaceAll(",", "").trim());
    if (Number.isFinite(numeric)) {
      return numeric.toFixed(2);
    }
  }
  return "200.00";
}

function buildFastPspPayload(clientBody: JsonObject, origin: string) {
  const generated = createIds();
  const merchantReference =
    typeof clientBody.merchant_reference === "string" &&
    clientBody.merchant_reference.trim()
      ? clientBody.merchant_reference.trim()
      : generated.reference;

  return {
    merchant_order_id:
      typeof clientBody.merchant_order_id === "string" &&
      clientBody.merchant_order_id.trim()
        ? clientBody.merchant_order_id.trim()
        : generated.orderId,
    merchant_reference: merchantReference,
    amount: normalizeAmount(clientBody.amount),
    callback_url:
      typeof clientBody.callback_url === "string" && clientBody.callback_url.trim()
        ? clientBody.callback_url.trim()
        : defaultCallbackUrl(origin),
  };
}

function extractCheckoutUrl(payload: JsonObject) {
  const data = (payload.data ?? {}) as JsonObject;
  const nested = (data.data ?? {}) as JsonObject;
  const values = [
    data.url,
    data.hostedCheckoutURL,
    data.depositURL,
    data.bkashURL,
    nested.hostedCheckoutURL,
    nested.depositURL,
    nested.bkashURL,
  ];

  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function extractFastPspError(payload: JsonObject) {
  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }

  const errors = payload.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const message = errors
      .map((item) => {
        if (item && typeof item === "object") {
          const field =
            typeof (item as JsonObject).field === "string" ? (item as JsonObject).field : "";
          const text =
            typeof (item as JsonObject).message === "string"
              ? (item as JsonObject).message
              : "";
          return [field, text].filter(Boolean).join(": ");
        }
        return "";
      })
      .filter(Boolean)
      .join(", ");

    if (message) {
      return message;
    }
  }

  return "FastPSP request failed.";
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function verifyWebhookSignature(rawBody: string, timestamp: string, signature: string) {
  const secret = readEnv("FASTPSP_API_SECRET");
  if (!secret || !timestamp || !signature) {
    return false;
  }

  const base = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(base).digest("hex");
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer);
}

function getDbPool() {
  const connectionString = readEnv("DATABASE_URL");
  if (!connectionString) {
    return null;
  }

  if (dbPool) {
    return dbPool;
  }

  const forceDisableSsl = readEnv("DATABASE_SSL").toLowerCase() === "false";
  const shouldUseSsl =
    !forceDisableSsl && !/localhost|127\.0\.0\.1/i.test(connectionString);

  dbPool = new Pool({
    connectionString,
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
  });

  return dbPool;
}

async function ensureSchema() {
  const pool = getDbPool();
  if (!pool || schemaEnsured) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS fastpsp_transactions (
      merchant_order_id TEXT PRIMARY KEY,
      merchant_reference TEXT,
      amount NUMERIC(14,2),
      currency TEXT,
      payer_reference TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      customer_email TEXT,
      checkout_url TEXT,
      fastpsp_status TEXT,
      payment_id TEXT,
      local_payment_id TEXT,
      provider TEXT,
      trx_id TEXT,
      webhook_status TEXT,
      webhook_received_at TIMESTAMPTZ,
      webhook_payload JSONB,
      request_payload JSONB,
      response_payload JSONB,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS fastpsp_transactions_created_at_idx
      ON fastpsp_transactions (created_at DESC);
  `);

  schemaEnsured = true;
}

async function persistCreatePayment(record: PersistedTransaction) {
  const pool = getDbPool();
  if (!pool) {
    return;
  }

  await ensureSchema();

  await pool.query(
    `
      INSERT INTO fastpsp_transactions (
        merchant_order_id,
        merchant_reference,
        amount,
        currency,
        payer_reference,
        customer_name,
        customer_phone,
        customer_email,
        checkout_url,
        fastpsp_status,
        payment_id,
        local_payment_id,
        provider,
        trx_id,
        webhook_status,
        webhook_payload,
        request_payload,
        response_payload,
        error_message,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15,
        $16::jsonb, $17::jsonb, $18::jsonb, $19, NOW()
      )
      ON CONFLICT (merchant_order_id) DO UPDATE SET
        merchant_reference = EXCLUDED.merchant_reference,
        amount = EXCLUDED.amount,
        currency = EXCLUDED.currency,
        payer_reference = EXCLUDED.payer_reference,
        customer_name = EXCLUDED.customer_name,
        customer_phone = EXCLUDED.customer_phone,
        customer_email = EXCLUDED.customer_email,
        checkout_url = EXCLUDED.checkout_url,
        fastpsp_status = EXCLUDED.fastpsp_status,
        payment_id = EXCLUDED.payment_id,
        local_payment_id = EXCLUDED.local_payment_id,
        provider = EXCLUDED.provider,
        trx_id = EXCLUDED.trx_id,
        webhook_status = COALESCE(EXCLUDED.webhook_status, fastpsp_transactions.webhook_status),
        webhook_payload = COALESCE(EXCLUDED.webhook_payload, fastpsp_transactions.webhook_payload),
        request_payload = EXCLUDED.request_payload,
        response_payload = EXCLUDED.response_payload,
        error_message = EXCLUDED.error_message,
        updated_at = NOW();
    `,
    [
      record.merchantOrderId,
      record.merchantReference,
      record.amount,
      record.currency,
      record.payerReference,
      record.customerName,
      record.customerPhone,
      record.customerEmail,
      record.checkoutUrl,
      record.fastpspStatus,
      record.paymentId,
      record.localPaymentId,
      record.provider,
      record.trxId,
      record.webhookStatus,
      record.webhookPayload ? JSON.stringify(record.webhookPayload) : null,
      record.requestPayload ? JSON.stringify(record.requestPayload) : null,
      record.responsePayload ? JSON.stringify(record.responsePayload) : null,
      record.errorMessage,
    ],
  );
}

async function persistWebhook(payload: JsonObject) {
  const pool = getDbPool();
  if (!pool) {
    return;
  }

  await ensureSchema();

  const merchantOrderId =
    toTrimmedString(payload.merchantOrderId) ||
    `UNKNOWN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  await pool.query(
    `
      INSERT INTO fastpsp_transactions (
        merchant_order_id,
        merchant_reference,
        amount,
        currency,
        payment_id,
        local_payment_id,
        provider,
        trx_id,
        webhook_status,
        webhook_received_at,
        webhook_payload,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, NOW(), $10::jsonb, NOW()
      )
      ON CONFLICT (merchant_order_id) DO UPDATE SET
        merchant_reference = COALESCE(EXCLUDED.merchant_reference, fastpsp_transactions.merchant_reference),
        amount = COALESCE(EXCLUDED.amount, fastpsp_transactions.amount),
        currency = COALESCE(EXCLUDED.currency, fastpsp_transactions.currency),
        payment_id = COALESCE(EXCLUDED.payment_id, fastpsp_transactions.payment_id),
        local_payment_id = COALESCE(EXCLUDED.local_payment_id, fastpsp_transactions.local_payment_id),
        provider = COALESCE(EXCLUDED.provider, fastpsp_transactions.provider),
        trx_id = COALESCE(EXCLUDED.trx_id, fastpsp_transactions.trx_id),
        webhook_status = COALESCE(EXCLUDED.webhook_status, fastpsp_transactions.webhook_status),
        webhook_received_at = NOW(),
        webhook_payload = EXCLUDED.webhook_payload,
        updated_at = NOW();
    `,
    [
      merchantOrderId,
      toNullableString(payload.merchantReference),
      toNullableNumber(payload.amount),
      toNullableString(payload.currency),
      toNullableString(payload.paymentId),
      toNullableString(payload.localPaymentId),
      toNullableString(payload.provider),
      toNullableString(payload.trxId),
      toNullableString(payload.status),
      JSON.stringify(payload),
    ],
  );
}

async function handleCreatePayment(req: IncomingMessage, res: ServerResponse) {
  const apiKey = readEnv("FASTPSP_API_KEY");
  const apiSecret = readEnv("FASTPSP_API_SECRET");
  const baseUrl = normalizeBaseUrl(
    readEnv("FASTPSP_BASE_URL") || "https://api.fastpsp.com/api/v1",
  );

  if (!apiKey || !apiSecret) {
    sendJson(res, 500, {
      success: false,
      message:
        "Missing FASTPSP_API_KEY or FASTPSP_API_SECRET in environment variables.",
    });
    return;
  }

  const rawBody = await readRawBody(req);
  const clientBody = safeJsonParse<JsonObject>(rawBody, {});
  const originHeader = req.headers.origin;
  const hostHeader = req.headers.host;
  const origin =
    (typeof originHeader === "string" && originHeader) ||
    (typeof hostHeader === "string" && hostHeader
      ? `http://${hostHeader}`
      : "http://localhost:5173");

  const payload = buildFastPspPayload(clientBody, origin);

  try {
    const response = await fetch(`${baseUrl}/create-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "x-api-secret": apiSecret,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    const parsed = safeJsonParse<JsonObject>(text, {});

    const data = (parsed.data ?? {}) as JsonObject;
    const nested = (data.data ?? {}) as JsonObject;
    const checkoutUrl = extractCheckoutUrl(parsed);

    const recordBase: PersistedTransaction = {
      merchantOrderId: toTrimmedString(payload.merchant_order_id),
      merchantReference: toNullableString(payload.merchant_reference),
      amount: toNullableNumber(payload.amount),
      currency: "BDT",
      payerReference: null,
      customerName: null,
      customerPhone: null,
      customerEmail: null,
      checkoutUrl: checkoutUrl || null,
      fastpspStatus: toNullableString(data.status),
      paymentId:
        toNullableString(nested.paymentID) ??
        toNullableString(nested.clientPaymentId) ??
        toNullableString(data.paymentID),
      localPaymentId:
        toNullableString(nested.localPaymentId) ?? toNullableString(data.localPaymentId),
      provider: toNullableString((nested.provider ?? data.provider) as unknown),
      trxId: toNullableString(nested.trxId),
      webhookStatus: null,
      webhookPayload: null,
      requestPayload: payload as unknown as JsonObject,
      responsePayload: parsed,
      errorMessage: null,
    };

    if (!response.ok) {
      await persistCreatePayment({
        ...recordBase,
        errorMessage: extractFastPspError(parsed),
      });

      sendJson(res, response.status, {
        success: false,
        message: extractFastPspError(parsed),
        fastpsp: parsed,
      });
      return;
    }

    if (!checkoutUrl) {
      await persistCreatePayment({
        ...recordBase,
        errorMessage: "FastPSP did not return a hosted checkout URL.",
      });

      sendJson(res, 502, {
        success: false,
        message: "FastPSP did not return a hosted checkout URL.",
        fastpsp: parsed,
      });
      return;
    }

    await persistCreatePayment(recordBase);

    sendJson(res, 200, {
      success: true,
      message: "Hosted checkout created.",
      checkoutUrl,
      payment: parsed.data ?? null,
    });
  } catch (error) {
    await persistCreatePayment({
      merchantOrderId:
        toTrimmedString(payload.merchant_order_id) ||
        `FAILED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      merchantReference: toNullableString(payload.merchant_reference),
      amount: toNullableNumber(payload.amount),
      currency: "BDT",
      payerReference: null,
      customerName: null,
      customerPhone: null,
      customerEmail: null,
      checkoutUrl: null,
      fastpspStatus: null,
      paymentId: null,
      localPaymentId: null,
      provider: null,
      trxId: null,
      webhookStatus: null,
      webhookPayload: null,
      requestPayload: payload as unknown as JsonObject,
      responsePayload: null,
      errorMessage: toErrorMessage(error, "Failed to connect to FastPSP."),
    });

    sendJson(res, 502, {
      success: false,
      message: toErrorMessage(error, "Failed to connect to FastPSP."),
    });
  }
}

async function handleWebhook(req: IncomingMessage, res: ServerResponse) {
  const rawBody = await readRawBody(req);
  const payload = safeJsonParse<JsonObject>(rawBody, {});
  const timestamp =
    typeof req.headers["x-fastpsp-timestamp"] === "string"
      ? req.headers["x-fastpsp-timestamp"]
      : "";
  const signature =
    typeof req.headers["x-fastpsp-signature"] === "string"
      ? req.headers["x-fastpsp-signature"]
      : "";

  const valid = verifyWebhookSignature(rawBody, timestamp, signature);

  if (!valid) {
    sendJson(res, 401, { success: false, message: "Invalid webhook signature." });
    return;
  }

  await persistWebhook(payload);

  sendJson(res, 200, {
    success: true,
    received: true,
    event: payload.event ?? null,
    status: payload.status ?? null,
    paymentId: payload.paymentId ?? null,
  });
}

async function handleTransactions(req: IncomingMessage, res: ServerResponse) {
  const pool = getDbPool();
  if (!pool) {
    sendJson(res, 200, {
      success: true,
      transactions: [],
      message: "DATABASE_URL not configured. No transaction history is persisted.",
    });
    return;
  }

  await ensureSchema();

  const parsedUrl = new URL(req.url ?? "/", "http://localhost");
  const requestedLimit = Number(parsedUrl.searchParams.get("limit") || "50");
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(200, Math.floor(requestedLimit)))
    : 50;

  const result = await pool.query(
    `
      SELECT
        merchant_order_id,
        merchant_reference,
        amount,
        currency,
        fastpsp_status,
        webhook_status,
        payment_id,
        local_payment_id,
        checkout_url,
        provider,
        trx_id,
        error_message,
        created_at,
        updated_at
      FROM fastpsp_transactions
      ORDER BY created_at DESC
      LIMIT $1;
    `,
    [limit],
  );

  sendJson(res, 200, {
    success: true,
    transactions: result.rows,
  });
}

function registerFastPspMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) {
  const url = req.url ?? "";
  const pathname = url.split("?")[0] || "";
  const method = req.method ?? "GET";

  if (pathname === "/api/fastpsp/create-payment" && method.toUpperCase() === "POST") {
    void handleCreatePayment(req, res);
    return;
  }

  if (pathname === "/api/fastpsp/webhook" && method.toUpperCase() === "POST") {
    void handleWebhook(req, res);
    return;
  }

  if (pathname === "/api/fastpsp/transactions" && method.toUpperCase() === "GET") {
    void handleTransactions(req, res);
    return;
  }

  next();
}

export function fastpspMiddlewarePlugin(initialEnv: EnvMap = {}): Plugin {
  return {
    name: "fastpsp-middleware",
    configureServer(server) {
      runtimeEnv = { ...(process.env as EnvMap), ...initialEnv };
      server.middlewares.use(registerFastPspMiddleware);
    },
    configurePreviewServer(server) {
      runtimeEnv = { ...(process.env as EnvMap), ...initialEnv };
      server.middlewares.use(registerFastPspMiddleware);
    },
  };
}
