# 3not3 Deposit Demo

A small merchant deposit portal for testing FastPSP payment gateway integration.

## Flow

1. Merchant login: `POST /api/v1/merchant/login`
2. bKash payment creation: `POST /api/v1/create-payment`
3. Optional status lookup: `POST /api/v1/bkash/payment-status`
4. Open the returned `url` or `bkashURL` to continue checkout.

## Setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` if your FastPSP API URL differs from `http://localhost:5000/api/v1`.
