# Merchant Deposit Demo (FastPSP Integrated)

A Melbet-style merchant deposit UI with server-side FastPSP integration.

## What is integrated

1. `RECOMMENDED > Bkash (fastPSP)` card opens FastPSP modal.
2. Modal `CONFIRM` calls secure backend endpoint: `POST /api/fastpsp/create-payment`.
3. Backend forwards to FastPSP using:
   - `x-api-key`
   - `x-api-secret`
4. Frontend redirects customer to FastPSP hosted checkout URL from response.
5. Webhook endpoint included: `POST /api/fastpsp/webhook` with HMAC signature verification.

## Environment setup

Copy `.env.example` to `.env` and fill:

- `FASTPSP_BASE_URL`
- `FASTPSP_API_KEY`
- `FASTPSP_API_SECRET`
- `FASTPSP_WEBHOOK_URL`
- `DATABASE_URL`
- `DATABASE_SSL`

Important: keep `FASTPSP_API_SECRET` private. Never expose it in frontend code.

## Run

```bash
npm install
npm run dev
```

Vite middleware routes provided by `fastpspMiddleware.ts`:

- `POST /api/fastpsp/create-payment`
- `POST /api/fastpsp/webhook`
- `GET /api/fastpsp/transactions?limit=100`

## Transaction history storage

When `DATABASE_URL` is configured:

1. A table `fastpsp_transactions` is auto-created.
2. Every `create-payment` request/response is persisted.
3. Webhook status updates are merged into matching transactions.
4. UI `Transaction history` menu loads records from `/api/fastpsp/transactions`.

## Webhook verification rule

Signature string:

`${timestamp}.${rawBody}`

Computed with:

- `HMAC-SHA256`
- secret: `FASTPSP_API_SECRET`

Compared against request header:

- `X-FastPSP-Signature`
