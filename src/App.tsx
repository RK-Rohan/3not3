import { useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  CreditCard,
  Languages,
  Loader2,
  LockKeyhole,
  PackageCheck,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
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

const apiBaseFromEnv =
  import.meta.env.VITE_FASTPSP_API_URL || "http://localhost:5000/api/v1";

const demoAmounts = [
  "10",
  "20",
  "50",
  "100",
  "250",
  "500",
  "1000",
  "1500",
  "2500",
  "5000",
];
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
      <TopBar />

      <main className="deposit-frame">
        <section className="notice-band">
          <div>
            <p className="eyebrow">Merchant Checkout Test</p>
            <h1>Deposit request</h1>
          </div>
          <div className="notice-meta">
            <span>BDT wallet</span>
            <strong>{amountPreview}</strong>
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
      </main>
    </div>
  );
}

function TopBar() {
  return (
    <header className="top-bar">
      <div className="brand-lockup">
        <div className="brand-mark">TM</div>
        <strong>Test Merchant</strong>
      </div>
      <nav className="nav-strip" aria-label="Portal navigation">
        <a>IPL 2026</a>
        <a>Cricket</a>
        <a>
          Sports <ChevronDown size={14} />
        </a>
        <a>
          Live <ChevronDown size={14} />
        </a>
        <a>
          Casino <ChevronDown size={14} />
        </a>
      </nav>
      <div className="top-actions">
        <button className="small-icon" title="Notifications" type="button">
          <Bell size={18} />
        </button>
        <button className="balance-chip" type="button">
          <span>BDT</span>
          <strong>0.00</strong>
        </button>
        <button className="deposit-button" type="button">
          Make a Deposit
        </button>
        <button className="small-icon" title="Language" type="button">
          <Languages size={18} />
        </button>
        <button className="small-icon" title="Settings" type="button">
          <Settings size={18} />
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
