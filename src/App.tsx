import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  CreditCard,
  Languages,
  Link,
  Loader2,
  LockKeyhole,
  PackageCheck,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type MethodCategory =
  | "recommended"
  | "e-wallets"
  | "internet-banking"
  | "bank-transfer"
  | "cryptocurrency";

type PaymentMethod = {
  id: string;
  label: string;
  category: Exclude<MethodCategory, "recommended">;
  enabled?: boolean;
  recommended?: boolean;
  logo?: string;
  badge?: string;
  mark?: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  statusCode?: number;
  message?: string;
  data?: T;
  errors?: Array<{ field?: string; message?: string }>;
  timestamp?: string;
  path?: string;
  requestId?: string;
};

type AuthData = {
  accessToken: string;
  refreshToken?: string;
};

type CreatePaymentData = {
  status?: string;
  url?: string | null;
  paymentID?: string | null;
  bkashURL?: string | null;
  depositURL?: string | null;
  hostedCheckoutURL?: string | null;
  data?: {
    localPaymentId?: string | null;
    clientPaymentId?: string | null;
    paymentID?: string | null;
    bkashURL?: string | null;
    paymentURL?: string | null;
    depositURL?: string | null;
    hostedCheckoutURL?: string | null;
    amount?: string | null;
    currency?: string | null;
    reference?: string | null;
    merchantReference?: string | null;
    assignedAccountNumber?: string | null;
    assignedAccountType?: string | null;
    assignedWalletAccountMode?: string | null;
    paymentCreateTime?: string | null;
  };
};

type PaymentResult = {
  paymentId: string;
  checkoutUrl: string;
  amount: string;
  currency: string;
  reference: string;
  assignedAccount: string;
  createdAt: string;
  raw: ApiEnvelope<CreatePaymentData>;
};

type FlowStepStatus = "idle" | "running" | "done" | "error";

type FlowSteps = {
  login: FlowStepStatus;
  create: FlowStepStatus;
  redirect: FlowStepStatus;
  status: FlowStepStatus;
};

type AppView = "dashboard" | "deposit" | "transaction";

type TransactionItem = {
  id?: string;
  transaction_id?: string;
  bkash_trx_id?: string;
  bkash_payment_id?: string;
  payment_id?: string;
  client_payment_id?: string;
  reference?: string;
  date_time?: string;
  occurred_at?: string;
  account_type?: string;
  provider?: string;
  transaction_type?: string;
  intent?: string;
  source?: string;
  account_number?: string;
  wallet_number?: string;
  to_wallet?: string;
  from_wallet?: string;
  transaction_amount?: string;
  amount?: string;
  commission?: string;
  income_deduct?: string;
  status?: string;
};

type TransactionEnvelope = {
  success?: boolean;
  transactions?: TransactionItem[];
  count?: number;
  data?: {
    items?: TransactionItem[];
    total?: number;
    page?: number;
    limit?: number;
    transactions?: TransactionItem[];
    count?: number;
  };
};

type DashboardData = {
  main_balance?: string | number;
  total_received_from_link?: string | number;
  total_deposit_credit?: string | number;
  total_deposit_debit?: string | number;
  total_payout_credit?: string | number;
  total_payout_debit?: string | number;
  total_settlement_credit?: string | number;
  total_settlement_debit?: string | number;
  bkash_deposit?: string | number;
  bkash_payout?: string | number;
  nagad_deposit?: string | number;
  nagad_payout?: string | number;
};

type DashboardEnvelope = {
  success?: boolean;
  data?: DashboardData;
};

const apiBaseFromEnv =
  import.meta.env.VITE_FASTPSP_API_URL || "http://localhost:5000/api/v1";

const demoAmounts = ["10", "20", "50", "100", "250", "500", "1000", "1500", "2500", "5000"];
const phonePrefixes = ["13", "14", "15", "16", "17", "18", "19"];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDigits(length: number) {
  return Array.from({ length }, () => randomInt(0, 9)).join("");
}

function createRandomPaymentFields() {
  const now = Date.now();
  const orderSuffix = `${now}${randomDigits(3)}`;
  const referenceSuffix = `${now.toString().slice(-6)}${randomDigits(2)}`;
  const phonePrefix = phonePrefixes[randomInt(0, phonePrefixes.length - 1)];

  return {
    amount: demoAmounts[randomInt(0, demoAmounts.length - 1)],
    merchantOrderId: `TEST-ORDER-${orderSuffix}`,
    merchantReference: `TEST-REF-${referenceSuffix}`,
    customerPhone: `+880${phonePrefix}${randomDigits(8)}`,
  };
}

const defaultForm = {
  ...createRandomPaymentFields(),
  customerName: "Test Customer",
  customerEmail: "customer@example.com",
  webhookUrl: import.meta.env.VITE_DEMO_MERCHANT_WEBHOOK_URL || "",
  email: import.meta.env.VITE_DEMO_MERCHANT_EMAIL || "",
  password: import.meta.env.VITE_DEMO_MERCHANT_PASSWORD || "",
};

const methods: PaymentMethod[] = [
  {
    id: "fast-nagad",
    label: "Fast Nagad",
    category: "e-wallets",
    recommended: true,
    logo: "/payment-icons/nagad.svg",
  },
  {
    id: "local-nagad",
    label: "The Local Nagad",
    category: "e-wallets",
    logo: "/payment-icons/nagad.svg",
  },
  {
    id: "bkash",
    label: "Bkash",
    category: "e-wallets",
    enabled: true,
    recommended: true,
    logo: "/payment-icons/bkash.svg",
    badge: "API READY",
  },
  {
    id: "upay",
    label: "Upay",
    category: "e-wallets",
    recommended: true,
    mark: "U",
  },
  {
    id: "bkash-free",
    label: "Bkash Free",
    category: "e-wallets",
    enabled: true,
    recommended: true,
    logo: "/payment-icons/bkash.svg",
    badge: "0% COMMISSION",
  },
  {
    id: "internet-banking",
    label: "Internet Banking",
    category: "internet-banking",
    recommended: true,
    mark: "NP",
  },
  {
    id: "bank-transfer",
    label: "Bank Transfer",
    category: "bank-transfer",
    recommended: true,
    mark: "BT",
  },
  {
    id: "citytouch",
    label: "Citytouch",
    category: "internet-banking",
    recommended: true,
    logo: "/payment-icons/rocket.svg",
  },
  {
    id: "fast-upay",
    label: "Fast Upay",
    category: "e-wallets",
    recommended: true,
    mark: "U+",
    badge: "+5%",
  },
  {
    id: "pubali-bank",
    label: "Pubali Bank",
    category: "bank-transfer",
    recommended: true,
    mark: "PB",
  },
  {
    id: "tether-tron",
    label: "Tether on Tron",
    category: "cryptocurrency",
    recommended: true,
    mark: "USDT",
  },
  {
    id: "tron",
    label: "TRON",
    category: "cryptocurrency",
    recommended: true,
    mark: "TRX",
  },
  {
    id: "rocket",
    label: "Fast Rocket free",
    category: "e-wallets",
    logo: "/payment-icons/rocket.svg",
    badge: "0% COMMISSION",
  },
  {
    id: "moneygo",
    label: "MoneyGo",
    category: "e-wallets",
    mark: "MG",
  },
  {
    id: "binance-pay",
    label: "BinancePay",
    category: "e-wallets",
    mark: "B",
  },
  {
    id: "bitcoin",
    label: "Bitcoin",
    category: "cryptocurrency",
    mark: "BTC",
  },
  {
    id: "ethereum",
    label: "Ethereum",
    category: "cryptocurrency",
    mark: "ETH",
  },
  {
    id: "binance-coin-bsc",
    label: "Binance Coin BSC",
    category: "cryptocurrency",
    mark: "BNB",
  },
  {
    id: "dogecoin",
    label: "Dogecoin",
    category: "cryptocurrency",
    mark: "DOGE",
  },
  {
    id: "xrp",
    label: "XRP",
    category: "cryptocurrency",
    mark: "XRP",
  },
  {
    id: "polygon",
    label: "Polygon",
    category: "cryptocurrency",
    mark: "MATIC",
  },
  {
    id: "toncoin",
    label: "Toncoin",
    category: "cryptocurrency",
    mark: "TON",
  },
  {
    id: "monero",
    label: "Monero",
    category: "cryptocurrency",
    mark: "XMR",
  },
  {
    id: "dash",
    label: "Dash",
    category: "cryptocurrency",
    mark: "DASH",
  },
  {
    id: "solana",
    label: "Solana",
    category: "cryptocurrency",
    mark: "SOL",
  },
  {
    id: "usd-solana",
    label: "USD Coin on Solana",
    category: "cryptocurrency",
    mark: "USDC",
  },
  {
    id: "eth-classic",
    label: "Ethereum Classic",
    category: "cryptocurrency",
    mark: "ETC",
  },
  {
    id: "cardano",
    label: "Cardano",
    category: "cryptocurrency",
    mark: "ADA",
  },
  {
    id: "usd-optimism",
    label: "USD Coin on Optimism",
    category: "cryptocurrency",
    mark: "OP",
  },
  {
    id: "eth-optimism",
    label: "Ethereum on Optimism",
    category: "cryptocurrency",
    mark: "ETH",
  },
  {
    id: "tether-arbitrum",
    label: "Tether on Arbitrum One",
    category: "cryptocurrency",
    mark: "ARB",
  },
  {
    id: "algorand",
    label: "Algorand",
    category: "cryptocurrency",
    mark: "ALGO",
  },
  {
    id: "bitcoin-cash",
    label: "Bitcoin Cash",
    category: "cryptocurrency",
    mark: "BCH",
  },
  {
    id: "stellar",
    label: "Stellar",
    category: "cryptocurrency",
    mark: "XLM",
  },
  {
    id: "polkadot",
    label: "Polkadot",
    category: "cryptocurrency",
    mark: "DOT",
  },
  {
    id: "zcash",
    label: "ZCash",
    category: "cryptocurrency",
    mark: "ZEC",
  },
  {
    id: "usd-ethereum",
    label: "USD Coin on Ethereum",
    category: "cryptocurrency",
    mark: "USDC",
  },
];

const sections: Array<{
  id: MethodCategory;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "recommended", label: "Recommended", icon: ShieldCheck },
  { id: "e-wallets", label: "E-Wallets", icon: Wallet },
  { id: "internet-banking", label: "Internet Banking", icon: CreditCard },
  { id: "bank-transfer", label: "Bank Transfer", icon: PackageCheck },
  { id: "cryptocurrency", label: "Cryptocurrency", icon: LockKeyhole },
];

const currencyFormatter = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 2,
});

const initialSteps: FlowSteps = {
  login: "idle",
  create: "idle",
  redirect: "idle",
  status: "idle",
};

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

async function postJson<T>(
  apiBaseUrl: string,
  path: string,
  body: unknown,
  accessToken?: string,
): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${normalizeBaseUrl(apiBaseUrl)}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as ApiEnvelope<T>) : {};

  if (!response.ok) {
    throw new Error(readApiError(payload, response.statusText));
  }

  return payload;
}

async function getJson<T>(
  apiBaseUrl: string,
  path: string,
  params: Record<string, string | number>,
  accessToken: string,
): Promise<T> {
  const url = new URL(`${normalizeBaseUrl(apiBaseUrl)}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(payload.message || response.statusText || "Request failed.");
  }
  return payload as T;
}

function readApiError(payload: ApiEnvelope<unknown>, fallback: string) {
  if (payload.errors?.length) {
    return payload.errors
      .map((error) => [error.field, error.message].filter(Boolean).join(": "))
      .join(", ");
  }

  return payload.message || fallback || "Request failed.";
}

function buildPaymentResult(
  response: ApiEnvelope<CreatePaymentData>,
): PaymentResult {
  const data = response.data;
  const details = data?.data;
  const checkoutUrl =
    data?.url ||
    data?.depositURL ||
    data?.hostedCheckoutURL ||
    data?.bkashURL ||
    details?.depositURL ||
    details?.hostedCheckoutURL ||
    details?.bkashURL ||
    details?.paymentURL ||
    "";
  const paymentId =
    data?.paymentID ||
    details?.paymentID ||
    details?.localPaymentId ||
    details?.clientPaymentId ||
    "";

  if (!checkoutUrl || !paymentId) {
    throw new Error("FastPSP did not return a hosted deposit URL and payment ID.");
  }

  return {
    paymentId,
    checkoutUrl,
    amount: details?.amount || "",
    currency: details?.currency || "BDT",
    reference: details?.merchantReference || details?.reference || "",
    assignedAccount: [
      details?.assignedWalletAccountMode || details?.assignedAccountType,
      details?.assignedAccountNumber,
    ]
      .filter(Boolean)
      .join(" "),
    createdAt: details?.paymentCreateTime || "",
    raw: response,
  };
}

function shortToken(value: string) {
  return value.length > 16 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}

function App() {
  const [currentView, setCurrentView] = useState<AppView>("dashboard");
  const [apiBaseUrl, setApiBaseUrl] = useState(apiBaseFromEnv);
  const [activeCategory, setActiveCategory] = useState<MethodCategory | "all">(
    "all",
  );
  const [selectedMethod, setSelectedMethod] = useState("bkash-free");
  const [form, setForm] = useState(defaultForm);
  const [autoOpen, setAutoOpen] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [statusResponse, setStatusResponse] =
    useState<ApiEnvelope<unknown> | null>(null);
  const [lastError, setLastError] = useState("");
  const [steps, setSteps] = useState<FlowSteps>(initialSteps);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [copied, setCopied] = useState("");

  const selectedPaymentMethod = useMemo(
    () => methods.find((method) => method.id === selectedMethod) || methods[2],
    [selectedMethod],
  );

  const visibleSections = useMemo(() => {
    if (activeCategory === "all") {
      return sections;
    }

    return sections.filter((section) => section.id === activeCategory);
  }, [activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<MethodCategory | "all", number>();
    counts.set("all", methods.length);
    counts.set(
      "recommended",
      methods.filter((method) => method.recommended).length,
    );

    for (const section of sections.slice(1)) {
      counts.set(
        section.id,
        methods.filter((method) => method.category === section.id).length,
      );
    }

    return counts;
  }, []);

  const amountPreview = useMemo(() => {
    const amount = Number(form.amount);
    return Number.isFinite(amount) && amount > 0
      ? currencyFormatter.format(amount)
      : "BDT 0.00";
  }, [form.amount]);

  const handleFieldChange = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    setForm((current) => ({
      ...current,
      ...createRandomPaymentFields(),
    }));
    setPaymentResult(null);
    setStatusResponse(null);
    setLastError("");
    setSteps(initialSteps);
    setCopied("");
  };

  const updateStep = (step: keyof FlowSteps, status: FlowStepStatus) => {
    setSteps((current) => ({ ...current, [step]: status }));
  };

  const createBkashPayment = async () => {
    setLastError("");
    setStatusResponse(null);
    setPaymentResult(null);
    setSteps({ ...initialSteps, login: "running" });

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setLastError("Enter a valid deposit amount.");
      setSteps({ ...initialSteps, login: "error" });
      return;
    }

    if (!form.email.trim() || !form.password) {
      setLastError("Merchant email and password are required.");
      setSteps({ ...initialSteps, login: "error" });
      return;
    }

    if (!form.merchantOrderId.trim() || !form.merchantReference.trim()) {
      setLastError("Merchant order ID and merchant reference are required.");
      setSteps({ ...initialSteps, login: "error" });
      return;
    }

    if (
      !form.customerName.trim() &&
      !form.customerPhone.trim() &&
      !form.customerEmail.trim()
    ) {
      setLastError("Add at least one customer identifier.");
      setSteps({ ...initialSteps, login: "error" });
      return;
    }

    setIsSubmitting(true);

    try {
      const authResponse = await postJson<AuthData>(
        apiBaseUrl,
        "/merchant/login",
        {
          email: form.email.trim(),
          password: form.password,
        },
      );
      const token = authResponse.data?.accessToken;

      if (!token) {
        throw new Error("Merchant login did not return an access token.");
      }

      setAccessToken(token);
      updateStep("login", "done");
      updateStep("create", "running");

      const payerReference =
        form.customerPhone.trim() ||
        form.customerEmail.trim() ||
        form.customerName.trim() ||
        form.merchantReference.trim();

      const paymentResponse = await postJson<CreatePaymentData>(
        apiBaseUrl,
        "/create-payment",
        {
          merchant_order_id: form.merchantOrderId.trim(),
          merchant_reference: form.merchantReference.trim(),
          amount: amount.toFixed(2),
          currency: "BDT",
          payerReference,
          customer_name: form.customerName.trim() || undefined,
          customer_phone: form.customerPhone.trim() || undefined,
          customer_email: form.customerEmail.trim() || undefined,
          success_url: `${window.location.origin}/payment/success`,
          failure_url: `${window.location.origin}/payment/failure`,
          cancel_url: `${window.location.origin}/payment/cancel`,
          webhook_url: form.webhookUrl.trim() || undefined,
        },
        token,
      );
      const nextPaymentResult = buildPaymentResult(paymentResponse);

      setPaymentResult(nextPaymentResult);
      updateStep("create", "done");
      updateStep("redirect", "done");

      if (autoOpen) {
        window.open(nextPaymentResult.checkoutUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Payment failed.");
      setSteps((current) => ({
        ...current,
        login: current.login === "running" ? "error" : current.login,
        create: current.create === "running" ? "error" : current.create,
        redirect: current.redirect === "running" ? "error" : current.redirect,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!paymentResult?.paymentId || !accessToken) {
      setLastError("Create a payment before checking status.");
      return;
    }

    setLastError("");
    setIsCheckingStatus(true);
    updateStep("status", "running");

    try {
      const response = await postJson<unknown>(
        apiBaseUrl,
        "/bkash/payment-status",
        { paymentID: paymentResult.paymentId },
        accessToken,
      );
      setStatusResponse(response);
      updateStep("status", "done");
    } catch (error) {
      updateStep("status", "error");
      setLastError(
        error instanceof Error ? error.message : "Status lookup failed.",
      );
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const copyValue = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1200);
  };

  return (
    <div className="app-shell">
      <MerchantSidebar currentView={currentView} onViewChange={setCurrentView} />

      <div className="workspace-shell">
        <DashboardHeader />

        {currentView === "dashboard" ? (
          <DashboardPage apiBaseUrl={apiBaseUrl} defaultEmail={form.email} defaultPassword={form.password} />
        ) : null}

        {currentView === "transaction" ? (
          <TransactionPage apiBaseUrl={apiBaseUrl} defaultEmail={form.email} defaultPassword={form.password} />
        ) : null}

        {currentView === "deposit" ? <main className="deposit-frame">
        <section className="notice-band">
          <div className="notice-copy">
            <p className="eyebrow">Merchant Dashboard</p>
            <h1>Hosted deposit test</h1>
            <p>
              Create a customer bKash payment from the merchant portal and
              receive the FastPSP hosted deposit URL.
            </p>
          </div>
          <div className="notice-stats">
            <div>
              <span>Selected Method</span>
              <strong>{selectedPaymentMethod.label}</strong>
            </div>
            <div>
              <span>Request Amount</span>
              <strong>{amountPreview}</strong>
            </div>
            <div>
              <span>Gateway Source</span>
              <strong>API wallet</strong>
            </div>
          </div>
        </section>

        <div className="deposit-layout">
          <aside className="method-menu" aria-label="Payment method categories">
            <CategoryButton
              active={activeCategory === "all"}
              count={categoryCounts.get("all") || 0}
              icon={Search}
              label="All Methods"
              onClick={() => setActiveCategory("all")}
            />
            {sections.map((section) => (
              <CategoryButton
                key={section.id}
                active={activeCategory === section.id}
                count={categoryCounts.get(section.id) || 0}
                icon={section.icon}
                label={section.label}
                onClick={() => setActiveCategory(section.id)}
              />
            ))}
          </aside>

          <section className="methods-stack" aria-label="Deposit methods">
            {visibleSections.map((section) => (
              <MethodSection
                key={section.id}
                section={section}
                methods={
                  section.id === "recommended"
                    ? methods.filter((method) => method.recommended)
                    : methods.filter((method) => method.category === section.id)
                }
                selectedMethod={selectedMethod}
                onSelect={handleMethodSelect}
              />
            ))}
          </section>

          <aside className="checkout-panel" aria-label="FastPSP merchant request">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Merchant Request</p>
                <h2>{selectedPaymentMethod.label}</h2>
              </div>
              <span className="method-pill">
                {selectedPaymentMethod.enabled ? "Live API" : "Soon"}
              </span>
            </div>

            <div className="sequence-note">
              Merchant posts customer and order data to FastPSP. FastPSP
              creates the selected payment method and returns the hosted
              deposit URL.
            </div>

            <div className="form-grid">
              <label>
                API Base URL
                <input
                  value={apiBaseUrl}
                  onChange={(event) => setApiBaseUrl(event.target.value)}
                  spellCheck={false}
                />
              </label>
              <label>
                Merchant Email
                <input
                  autoComplete="username"
                  value={form.email}
                  onChange={(event) =>
                    handleFieldChange("email", event.target.value)
                  }
                  placeholder="merchant@example.com"
                />
              </label>
              <label>
                Merchant Password
                <input
                  autoComplete="current-password"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    handleFieldChange("password", event.target.value)
                  }
                  placeholder="StrongPass123!"
                />
              </label>
              <div className="split-fields">
                <label>
                  Amount
                  <input
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(event) =>
                      handleFieldChange("amount", event.target.value)
                    }
                  />
                </label>
                <label>
                  Currency
                  <input value="BDT" disabled />
                </label>
              </div>
              <label>
                Merchant Order ID
                <input
                  value={form.merchantOrderId}
                  onChange={(event) =>
                    handleFieldChange("merchantOrderId", event.target.value)
                  }
                  spellCheck={false}
                />
              </label>
              <label>
                Merchant Reference
                <input
                  value={form.merchantReference}
                  onChange={(event) =>
                    handleFieldChange("merchantReference", event.target.value)
                  }
                  spellCheck={false}
                />
              </label>
              <div className="split-fields customer-fields">
                <label>
                  Customer Name
                  <input
                    value={form.customerName}
                    onChange={(event) =>
                      handleFieldChange("customerName", event.target.value)
                    }
                  />
                </label>
                <label>
                  Customer Phone
                  <input
                    value={form.customerPhone}
                    onChange={(event) =>
                      handleFieldChange("customerPhone", event.target.value)
                    }
                    spellCheck={false}
                  />
                </label>
              </div>
              <label>
                Customer Email
                <input
                  value={form.customerEmail}
                  onChange={(event) =>
                    handleFieldChange("customerEmail", event.target.value)
                  }
                  spellCheck={false}
                />
              </label>
              <label>
                Webhook URL
                <input
                  value={form.webhookUrl}
                  onChange={(event) =>
                    handleFieldChange("webhookUrl", event.target.value)
                  }
                  placeholder="https://merchant.example.com/webhook"
                  spellCheck={false}
                />
              </label>
            </div>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={autoOpen}
                onChange={(event) => setAutoOpen(event.target.checked)}
              />
              Open checkout after create
            </label>

            {lastError ? <div className="error-box">{lastError}</div> : null}

            <div className="action-row">
              <button
                className="primary-action"
                disabled={!selectedPaymentMethod.enabled || isSubmitting}
                onClick={createBkashPayment}
                type="button"
              >
                {isSubmitting ? (
                  <Loader2 className="spin" size={18} />
                ) : (
                  <CreditCard size={18} />
                )}
                Post to FastPSP
              </button>
              <button
                className="icon-action"
                disabled={!paymentResult?.checkoutUrl}
                onClick={() =>
                  paymentResult &&
                  window.open(
                    paymentResult.checkoutUrl,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                title="Open checkout"
                type="button"
              >
                <ShoppingCart size={18} />
              </button>
            </div>

            <FlowTimeline steps={steps} />

            <ResultPanel
              accessToken={accessToken}
              copied={copied}
              onCheckStatus={checkPaymentStatus}
              onCopy={copyValue}
              paymentResult={paymentResult}
              statusResponse={statusResponse}
              isCheckingStatus={isCheckingStatus}
            />
          </aside>
        </div>
        </main> : null}
      </div>
    </div>
  );
}

function DashboardPage({
  apiBaseUrl,
  defaultEmail,
  defaultPassword,
}: {
  apiBaseUrl: string;
  defaultEmail: string;
  defaultPassword: string;
}) {
  const [token, setToken] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(
    async (authToken?: string) => {
      setLoading(true);
      setError("");
      try {
        let activeToken = authToken ?? token;
        if (!activeToken) {
          const authResp = await postJson<AuthData>(apiBaseUrl, "/merchant/login", {
            email: defaultEmail,
            password: defaultPassword,
          });
          activeToken = authResp.data?.accessToken ?? "";
          if (!activeToken) throw new Error("Login failed: no token returned.");
          setToken(activeToken);
        }
        const resp = await getJson<DashboardEnvelope>(
          apiBaseUrl,
          "/merchant/dashboard",
          {},
          activeToken,
        );
        setData(resp.data ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, defaultEmail, defaultPassword, token],
  );

  useEffect(() => { fetchDashboard(); }, []);

  const fmt = (v?: string | number) =>
    `৳ ${parseFloat((v ?? 0).toString()).toLocaleString()}`;

  const cards: Array<{ title: string; value: string; icon: LucideIcon }> = [
    { title: "Main Balance", value: fmt(data?.main_balance), icon: Wallet },
    { title: "Total Received", value: fmt(data?.total_received_from_link), icon: Link },
    { title: "Total Deposit Cr", value: fmt(data?.total_deposit_credit), icon: ArrowDownRight },
    { title: "Total Deposit Dr", value: fmt(data?.total_deposit_debit), icon: ArrowUpRight },
    { title: "Total Payout Cr", value: fmt(data?.total_payout_credit), icon: TrendingUp },
    { title: "Total Payout Dr", value: fmt(data?.total_payout_debit), icon: TrendingDown },
    { title: "Settlement Cr", value: fmt(data?.total_settlement_credit), icon: TrendingUp },
    { title: "Settlement Dr", value: fmt(data?.total_settlement_debit), icon: TrendingDown },
    { title: "Bkash Deposit", value: fmt(data?.bkash_deposit), icon: CreditCard },
    { title: "Bkash Payout", value: fmt(data?.bkash_payout), icon: CreditCard },
    { title: "Nagad Deposit", value: fmt(data?.nagad_deposit), icon: CreditCard },
    { title: "Nagad Payout", value: fmt(data?.nagad_payout), icon: CreditCard },
  ];

  return (
    <main className="deposit-frame">
      <div className="dash-top-bar">
        <div>
          <p className="eyebrow">Merchant Dashboard</p>
          <h1 style={{ fontSize: "clamp(22px,2.5vw,32px)" }}>Overview</h1>
        </div>
        <button
          className="tx-refresh-btn"
          disabled={loading}
          onClick={() => fetchDashboard(token || undefined)}
          type="button"
        >
          {loading ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
          Refresh
        </button>
      </div>

      {error ? <div className="error-box" style={{ marginBottom: 16 }}>{error}</div> : null}

      <div className="dash-cards">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div className="dash-card" key={card.title}>
              <div className="dash-card-body">
                <div>
                  <span className="dash-card-label">{card.title}</span>
                  <span className="dash-card-value">
                    {loading ? <span className="dash-skeleton" /> : card.value}
                  </span>
                </div>
                <div className="dash-card-icon">
                  <Icon size={22} />
                </div>
              </div>
              <div className="dash-card-bar" />
            </div>
          );
        })}
      </div>

      <div className="dash-charts">
        <div className="dash-chart-card dash-chart-wide">
          <div className="dash-chart-header">
            <div>
              <h3>Revenue Overview</h3>
              <p>Total deposits vs payouts over 7 days</p>
            </div>
            <div className="dash-chart-legend">
              <span><span className="dot dot-green" />Deposits</span>
              <span><span className="dot dot-gold" />Payouts</span>
            </div>
          </div>
          <AreaChart
            deposits={[3100, 4000, 2800, 5100, 4200, 10900, 10000]}
            payouts={[1100, 3200, 4500, 3200, 3400, 5200, 4100]}
            labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
          />
        </div>

        <div className="dash-chart-card">
          <div className="dash-chart-header">
            <div>
              <h3>Gateways</h3>
              <p>Transaction volume by source</p>
            </div>
          </div>
          <BarChart
            values={[2500, 1800, 3800]}
            labels={["Bkash", "Nagad", "Link"]}
          />
        </div>
      </div>
    </main>
  );
}

function AreaChart({
  deposits,
  payouts,
  labels,
}: {
  deposits: number[];
  payouts: number[];
  labels: string[];
}) {
  const W = 580;
  const H = 200;
  const pad = { top: 10, bottom: 30, left: 8, right: 8 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = Math.max(...deposits, ...payouts);
  const n = deposits.length;

  const px = (i: number) => pad.left + (i / (n - 1)) * innerW;
  const py = (v: number) => pad.top + innerH - (v / max) * innerH;

  const pathD = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"} ${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");

  const areaD = (vals: number[]) =>
    `${pathD(vals)} L ${px(n - 1).toFixed(1)},${(pad.top + innerH).toFixed(1)} L ${pad.left},${(pad.top + innerH).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="area-chart-svg" aria-hidden>
      <defs>
        <linearGradient id="grad-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8cc63f" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8cc63f" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="grad-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b88a1f" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#b88a1f" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={pad.left} x2={W - pad.right}
          y1={pad.top + innerH * (1 - t)} y2={pad.top + innerH * (1 - t)}
          stroke="#2b3a52" strokeWidth="1" strokeDasharray="4 4"
        />
      ))}
      <path d={areaD(deposits)} fill="url(#grad-green)" />
      <path d={areaD(payouts)} fill="url(#grad-gold)" />
      <path d={pathD(deposits)} fill="none" stroke="#8cc63f" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d={pathD(payouts)} fill="none" stroke="#b88a1f" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {labels.map((label, i) => (
        <text
          key={label}
          x={px(i)} y={H - 6}
          textAnchor="middle" fill="#7a90a8"
          fontSize="11" fontWeight="700"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}

function BarChart({
  values,
  labels,
}: {
  values: number[];
  labels: string[];
}) {
  const W = 280;
  const H = 220;
  const pad = { top: 16, bottom: 36, left: 16, right: 16 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = Math.max(...values);
  const n = values.length;
  const barW = (innerW / n) * 0.55;
  const gap = innerW / n;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="bar-chart-svg" aria-hidden>
      {values.map((v, i) => {
        const barH = (v / max) * innerH;
        const x = pad.left + i * gap + (gap - barW) / 2;
        const y = pad.top + innerH - barH;
        return (
          <g key={labels[i]}>
            <rect
              x={x} y={y} width={barW} height={barH}
              rx="5" fill="#8cc63f" opacity="0.9"
            />
            <text
              x={x + barW / 2} y={H - 10}
              textAnchor="middle" fill="#7a90a8"
              fontSize="11" fontWeight="700"
            >
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function TransactionPage({
  apiBaseUrl,
  defaultEmail,
  defaultPassword,
}: {
  apiBaseUrl: string;
  defaultEmail: string;
  defaultPassword: string;
}) {
  const [token, setToken] = useState("");
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTransactions = useCallback(
    async (currentPage: number, authToken?: string) => {
      setLoading(true);
      setError("");
      try {
        let activeToken = authToken ?? token;
        if (!activeToken) {
          const authResp = await postJson<AuthData>(apiBaseUrl, "/merchant/login", {
            email: defaultEmail,
            password: defaultPassword,
          });
          activeToken = authResp.data?.accessToken ?? "";
          if (!activeToken) throw new Error("Login failed: no token returned.");
          setToken(activeToken);
        }
        const resp = await getJson<TransactionEnvelope>(
          apiBaseUrl,
          "/merchant/transactions",
          { page: currentPage, limit: pageSize },
          activeToken,
        );
        const items =
          resp.transactions ??
          resp.data?.transactions ??
          resp.data?.items ??
          [];
        const count = resp.count ?? resp.data?.total ?? resp.data?.count ?? 0;
        setTransactions(items);
        setTotal(count);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load transactions.");
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, defaultEmail, defaultPassword, pageSize, token],
  );

  useEffect(() => {
    fetchTransactions(1);
  }, []);

  const totalAmount = useMemo(
    () =>
      transactions
        .reduce((sum, t) => sum + parseFloat(t.transaction_amount ?? t.amount ?? "0"), 0)
        .toFixed(2),
    [transactions],
  );

  const totalPages = Math.ceil(total / pageSize) || 1;

  const getStatusStyle = (status?: string) => {
    const s = status?.toUpperCase();
    if (s === "SUCCESS" || s === "COMPLETED") return "status-success";
    if (s === "PENDING" || s === "CREATED") return "status-pending";
    if (s === "FAILED" || s === "CANCELED") return "status-failed";
    return "status-neutral";
  };

  const txId = (t: TransactionItem) =>
    t.transaction_id ?? t.bkash_trx_id ?? t.bkash_payment_id ?? t.payment_id ?? t.client_payment_id ?? t.reference ?? t.id ?? "—";

  const formatDate = (v?: string | null) => {
    if (!v) return "—";
    const d = new Date(v);
    return isNaN(d.getTime()) ? v : d.toLocaleString();
  };

  const fmt = (v?: string | null) =>
    `${parseFloat(v ?? "0").toFixed(2)} BDT`;

  return (
    <main className="deposit-frame">
      <section className="tx-notice-band">
        <div className="notice-copy">
          <p className="eyebrow">Merchant Dashboard</p>
          <h1>Transactions</h1>
          <p>Unified merchant transaction feed from the `transactions` table.</p>
        </div>
        <div className="notice-stats">
          <div>
            <span>Total Transactions</span>
            <strong>{total}</strong>
          </div>
          <div>
            <span>Rows This Page</span>
            <strong>{transactions.length}</strong>
          </div>
          <div>
            <span>Page Amount</span>
            <strong>{fmt(totalAmount)}</strong>
          </div>
          <div className="tx-refresh-cell">
            <button
              className="tx-refresh-btn"
              disabled={loading}
              onClick={() => fetchTransactions(page)}
              type="button"
            >
              {loading ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
              Refresh
            </button>
          </div>
        </div>
      </section>

      {error ? <div className="error-box" style={{ marginBottom: 16 }}>{error}</div> : null}

      <div className="tx-table-wrap">
        {loading && transactions.length === 0 ? (
          <div className="tx-loading"><Loader2 className="spin" size={26} /> Loading transactions…</div>
        ) : transactions.length === 0 ? (
          <div className="tx-empty">No transactions found.</div>
        ) : (
          <table className="tx-table">
            <thead>
              <tr>
                <th>SL</th>
                <th>Transaction ID</th>
                <th>Account Type</th>
                <th>Type</th>
                <th>Source</th>
                <th>Account Number</th>
                <th>Amount</th>
                <th>Commission</th>
                <th>Income Deduct</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, idx) => (
                <tr key={t.id ?? idx}>
                  <td className="tx-sl">{(page - 1) * pageSize + idx + 1}</td>
                  <td>
                    <div className="tx-id-cell">
                      <span className="tx-date">{formatDate(t.date_time ?? t.occurred_at)}</span>
                      <span className="tx-id">{txId(t)}</span>
                    </div>
                  </td>
                  <td>{t.account_type ?? t.provider ?? "bKash"}</td>
                  <td>{t.transaction_type ?? t.intent ?? t.source ?? "—"}</td>
                  <td>
                    <span className="tx-source-badge">{t.source ?? "—"}</span>
                  </td>
                  <td>{t.account_number ?? t.wallet_number ?? t.to_wallet ?? t.from_wallet ?? "—"}</td>
                  <td><span className="tx-amount">{fmt(t.transaction_amount ?? t.amount)}</span></td>
                  <td><span className="tx-commission">{fmt(t.commission)}</span></td>
                  <td><span className="tx-deduct">{fmt(t.income_deduct)}</span></td>
                  <td>
                    <span className={`tx-status ${getStatusStyle(t.status)}`}>
                      {t.status ?? "Unknown"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="tx-pagination">
          <button
            className="tx-page-btn"
            disabled={page <= 1 || loading}
            onClick={() => { const p = page - 1; setPage(p); fetchTransactions(p); }}
            type="button"
          >
            ← Prev
          </button>
          <span className="tx-page-info">Page {page} / {totalPages}</span>
          <button
            className="tx-page-btn"
            disabled={page >= totalPages || loading}
            onClick={() => { const p = page + 1; setPage(p); fetchTransactions(p); }}
            type="button"
          >
            Next →
          </button>
        </div>
      )}
    </main>
  );
}

function MerchantSidebar({
  currentView,
  onViewChange,
}: {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
}) {
  const sidebarItems: Array<{ label: string; icon: typeof ShieldCheck; view?: AppView }> = [
    { label: "Dashboard", icon: ShieldCheck, view: "dashboard" },
    { label: "Transaction", icon: RefreshCw, view: "transaction" },
    { label: "Cash In (Auto)", icon: CreditCard },
    { label: "Cash In (Manual)", icon: Wallet },
    { label: "Withdraw", icon: PackageCheck },
    { label: "Pay With Link", icon: Copy },
    { label: "Developer", icon: LockKeyhole },
    { label: "Support", icon: Bell },
    { label: "Payment Setting", icon: Settings },
  ];

  return (
    <aside className="merchant-sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">F</div>
        <strong>
          Fast<span>PSP</span>
        </strong>
      </div>

      <nav className="sidebar-nav" aria-label="Merchant dashboard navigation">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.view ? currentView === item.view : false;

          return (
            <button
              className={`sidebar-link ${isActive ? "active" : ""}`}
              key={item.label}
              type="button"
              onClick={() => item.view && onViewChange(item.view)}
            >
              <Icon size={22} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function DashboardHeader() {
  return (
    <header className="dashboard-header">
      <button className="back-button" title="Back" type="button">
        <ChevronDown size={22} />
      </button>

      <div className="header-actions">
        <button className="round-tool" title="Language" type="button">
          <Languages size={18} />
        </button>
        <button className="round-tool has-dot" title="Notifications" type="button">
          <Bell size={18} />
        </button>
        <button className="round-tool" title="Settings" type="button">
          <Settings size={18} />
        </button>
        <button className="merchant-chip" type="button">
          <span className="merchant-avatar">MR</span>
          <strong>mr6430119</strong>
          <ChevronDown size={16} />
        </button>
      </div>
    </header>
  );
}

function CategoryButton({
  active,
  count,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`category-button ${active ? "active" : ""}`}
      onClick={onClick}
      type="button"
    >
      <Icon size={16} />
      <span>{label}</span>
      <strong>{count}</strong>
    </button>
  );
}

function MethodSection({
  methods: sectionMethods,
  onSelect,
  section,
  selectedMethod,
}: {
  methods: PaymentMethod[];
  onSelect: (id: string) => void;
  section: { id: MethodCategory; label: string };
  selectedMethod: string;
}) {
  return (
    <div className="method-section">
      <div className="section-title">{section.label}</div>
      <div className="method-grid">
        {sectionMethods.map((method) => (
          <button
            key={`${section.id}-${method.id}`}
            className={`method-card ${
              selectedMethod === method.id ? "selected" : ""
            } ${method.enabled ? "enabled" : ""}`}
            disabled={!method.enabled}
            onClick={() => onSelect(method.id)}
            type="button"
          >
            {method.badge ? <span className="badge">{method.badge}</span> : null}
            <div className="method-logo">
              {method.logo ? (
                <img alt="" src={method.logo} />
              ) : (
                <span>{method.mark || method.label.slice(0, 2)}</span>
              )}
            </div>
            <div className="method-name">{method.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function FlowTimeline({ steps }: { steps: FlowSteps }) {
  const rows: Array<{
    key: keyof FlowSteps;
    label: string;
  }> = [
    { key: "login", label: "Merchant login" },
    { key: "create", label: "FastPSP create" },
    { key: "redirect", label: "Hosted deposit" },
    { key: "status", label: "Status check" },
  ];

  return (
    <div className="timeline">
      {rows.map((row) => (
        <div key={row.key} className={`timeline-row ${steps[row.key]}`}>
          <StatusIcon status={steps[row.key]} />
          <span>{row.label}</span>
        </div>
      ))}
    </div>
  );
}

function StatusIcon({ status }: { status: FlowStepStatus }) {
  if (status === "done") {
    return <CheckCircle2 size={16} />;
  }

  if (status === "running") {
    return <Loader2 className="spin" size={16} />;
  }

  if (status === "error") {
    return <XCircle size={16} />;
  }

  return <Clock3 size={16} />;
}

function ResultPanel({
  accessToken,
  copied,
  isCheckingStatus,
  onCheckStatus,
  onCopy,
  paymentResult,
  statusResponse,
}: {
  accessToken: string;
  copied: string;
  isCheckingStatus: boolean;
  onCheckStatus: () => void;
  onCopy: (label: string, value: string) => void;
  paymentResult: PaymentResult | null;
  statusResponse: ApiEnvelope<unknown> | null;
}) {
  if (!paymentResult && !accessToken) {
    return <div className="empty-result">No payment created yet.</div>;
  }

  return (
    <div className="result-card">
      {accessToken ? (
        <div className="result-row">
          <span>Access Token</span>
          <button
            className="copy-button"
            onClick={() => onCopy("token", accessToken)}
            title="Copy access token"
            type="button"
          >
            {shortToken(accessToken)}
            <Copy size={14} />
          </button>
        </div>
      ) : null}

      {paymentResult ? (
        <>
          <div className="result-row">
            <span>Payment ID</span>
            <button
              className="copy-button"
              onClick={() => onCopy("payment", paymentResult.paymentId)}
              title="Copy payment ID"
              type="button"
            >
              {paymentResult.paymentId}
              <Copy size={14} />
            </button>
          </div>
          <div className="result-row">
            <span>Amount</span>
            <strong>
              {paymentResult.currency} {paymentResult.amount || "0.00"}
            </strong>
          </div>
          <div className="result-row">
            <span>Merchant Ref</span>
            <strong>{paymentResult.reference || "-"}</strong>
          </div>
          <div className="result-row">
            <span>Wallet Route</span>
            <strong>{paymentResult.assignedAccount || "-"}</strong>
          </div>
          <div className="result-row stacked">
            <span>Hosted Deposit URL</span>
            <button
              className="copy-button wide"
              onClick={() => onCopy("url", paymentResult.checkoutUrl)}
              title="Copy checkout URL"
              type="button"
            >
              {paymentResult.checkoutUrl}
              <Copy size={14} />
            </button>
          </div>
          <button
            className="secondary-action"
            disabled={isCheckingStatus}
            onClick={onCheckStatus}
            type="button"
          >
            {isCheckingStatus ? (
              <Loader2 className="spin" size={17} />
            ) : (
              <RefreshCw size={17} />
            )}
            Check Status
          </button>
          <details>
            <summary>Payment JSON</summary>
            <pre>{JSON.stringify(paymentResult.raw, null, 2)}</pre>
          </details>
        </>
      ) : null}

      {statusResponse ? (
        <details open>
          <summary>Status JSON</summary>
          <pre>{JSON.stringify(statusResponse, null, 2)}</pre>
        </details>
      ) : null}

      {copied ? <div className="copy-toast">Copied {copied}</div> : null}
    </div>
  );
}

export default App;
