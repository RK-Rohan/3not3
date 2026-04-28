# Merchant Deposit Demo

A small merchant deposit portal for testing FastPSP payment gateway integration.

## Flow

1. Merchant login: `POST /api/v1/merchant/login`
2. Merchant posts customer/order data to FastPSP: `POST /api/v1/create-payment`
3. FastPSP returns a hosted deposit URL for the selected method.
4. Optional status lookup: `POST /api/v1/bkash/payment-status`

## Setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` if your FastPSP API URL, merchant login, or webhook URL differs from the defaults.
