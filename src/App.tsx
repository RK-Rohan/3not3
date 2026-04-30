import { useEffect, useMemo, useState } from "react";
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

type MerchantCallbackNotice = {
  status: string;
  paymentId: string;
  localPaymentId: string;
  merchantOrderId: string;
  merchantReference: string;
  trxId: string;
};

type MerchantWalletState = {
  balance: number;
  pendingAmounts: Record<string, number>;
  appliedPayments: Record<string, true>;
};

class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

const apiBaseFromEnv =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const demoCurrency = import.meta.env.VITE_CURRENCY || "BDT";
const demoOrderIdPrefix =
  import.meta.env.VITE_ORDER_ID_PREFIX || "TEST-ORDER";
const demoReferencePrefix =
  import.meta.env.VITE_REFERENCE_PREFIX || "TEST-REF";
const merchantEmail = import.meta.env.VITE_MERCHANT_EMAIL || "";
const merchantPassword = import.meta.env.VITE_MERCHANT_PASSWORD || "";
const merchantWebhookUrl = import.meta.env.VITE_MERCHANT_WEBHOOK_URL || "";
const customerName = import.meta.env.VITE_CUSTOMER_NAME || "";
const customerPhone = import.meta.env.VITE_CUSTOMER_PHONE || "";
const customerEmail = import.meta.env.VITE_CUSTOMER_EMAIL || "";
const accessTokenStorageKey = "fastpsp-merchant-access-token";
const walletStateStorageKey = "fastpsp-merchant-wallet-state";
const defaultWalletState: MerchantWalletState = {
  balance: 0,
  pendingAmounts: {},
  appliedPayments: {},
};

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDigits(length: number) {
  return Array.from({ length }, () => randomInt(0, 9)).join("");
}

function createGeneratedPaymentFields() {
  const now = Date.now();
  const orderSuffix = `${now}${randomDigits(3)}`;
  const referenceSuffix = `${now}${randomDigits(2)}`;

  return {
    merchantOrderId: `${demoOrderIdPrefix}-${orderSuffix}`,
    merchantReference: `${demoReferencePrefix}-${referenceSuffix}`,
  };
}

const defaultForm = {
  amount: "",
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
  currency: demoCurrency,
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
    throw new ApiRequestError(
      readApiError(payload, response.statusText),
      response.status,
    );
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
    currency: details?.currency || demoCurrency,
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

function getStoredAccessToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(accessTokenStorageKey) || "";
}

function persistAccessToken(value: string) {
  if (typeof window === "undefined") {
    return;
  }

  if (value) {
    window.localStorage.setItem(accessTokenStorageKey, value);
    return;
  }

  window.localStorage.removeItem(accessTokenStorageKey);
}

function readWalletState(): MerchantWalletState {
  if (typeof window === "undefined") {
    return defaultWalletState;
  }

  const raw = window.localStorage.getItem(walletStateStorageKey);

  if (!raw) {
    return defaultWalletState;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<MerchantWalletState>;
    return {
      balance:
        typeof parsed.balance === "number" && Number.isFinite(parsed.balance)
          ? parsed.balance
          : 0,
      pendingAmounts:
        parsed.pendingAmounts && typeof parsed.pendingAmounts === "object"
          ? parsed.pendingAmounts
          : {},
      appliedPayments:
        parsed.appliedPayments && typeof parsed.appliedPayments === "object"
          ? parsed.appliedPayments
          : {},
    };
  } catch {
    return defaultWalletState;
  }
}

function writeWalletState(nextState: MerchantWalletState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(walletStateStorageKey, JSON.stringify(nextState));
}

function rememberPendingDeposit(paymentId: string, amount: string) {
  const numericAmount = Number(amount);

  if (!paymentId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
    return;
  }

  const state = readWalletState();
  state.pendingAmounts[paymentId] = numericAmount;
  writeWalletState(state);
}

function applyDepositSuccess(paymentId: string): MerchantWalletState {
  const state = readWalletState();

  if (!paymentId || state.appliedPayments[paymentId]) {
    return state;
  }

  const amount = state.pendingAmounts[paymentId];

  if (!Number.isFinite(amount) || amount <= 0) {
    return state;
  }

  state.balance += amount;
  state.appliedPayments[paymentId] = true;
  delete state.pendingAmounts[paymentId];
  writeWalletState(state);

  return state;
}

function readMerchantCallbackNotice(): MerchantCallbackNotice | null {
  if (typeof window === "undefined") {
    return null;
  }

  const { pathname, searchParams } = new URL(window.location.href);
  const status = (searchParams.get("status") || "").toUpperCase();

  if (!pathname.startsWith("/payment/") || !status) {
    return null;
  }

  return {
    status,
    paymentId: searchParams.get("payment_id") || "",
    localPaymentId: searchParams.get("local_payment_id") || "",
    merchantOrderId: searchParams.get("merchant_order_id") || "",
    merchantReference: searchParams.get("merchant_reference") || "",
    trxId: searchParams.get("trx_id") || "",
  };
}

function App() {
  const [activeCategory, setActiveCategory] = useState<MethodCategory | "all">(
    "all",
  );
  const [selectedMethod, setSelectedMethod] = useState("bkash-free");
  const [isAmountModalOpen, setIsAmountModalOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [accessToken, setAccessToken] = useState(() => getStoredAccessToken());
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [statusResponse, setStatusResponse] =
    useState<ApiEnvelope<unknown> | null>(null);
  const [lastError, setLastError] = useState("");
  const [steps, setSteps] = useState<FlowSteps>(initialSteps);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [copied, setCopied] = useState("");
  const [walletBalance, setWalletBalance] = useState(() => readWalletState().balance);
  const [callbackNotice, setCallbackNotice] =
    useState<MerchantCallbackNotice | null>(() => readMerchantCallbackNotice());

  useEffect(() => {
    const notice = readMerchantCallbackNotice();

    if (!notice) {
      return;
    }

    setCallbackNotice(notice);

    if (notice.status === "SUCCESS") {
      setSteps({
        login: "done",
        create: "done",
        redirect: "done",
        status: "done",
      });
    }
  }, []);

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

  const handleFieldChange = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    setForm(defaultForm);
    setPaymentResult(null);
    setStatusResponse(null);
    setLastError("");
    setSteps(initialSteps);
    setCopied("");
    setIsAmountModalOpen(true);
  };

  const updateStep = (step: keyof FlowSteps, status: FlowStepStatus) => {
    setSteps((current) => ({ ...current, [step]: status }));
  };

  const storeAccessToken = (value: string) => {
    setAccessToken(value);
    persistAccessToken(value);
  };

  const loginMerchant = async () => {
    const authResponse = await postJson<AuthData>(apiBaseFromEnv, "/merchant/login", {
      email: merchantEmail.trim(),
      password: merchantPassword,
    });
    const token = authResponse.data?.accessToken;

    if (!token) {
      throw new Error("Merchant login did not return an access token.");
    }

    storeAccessToken(token);
    return token;
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

    if (!merchantEmail.trim() || !merchantPassword) {
      setLastError("Merchant email and password are required.");
      setSteps({ ...initialSteps, login: "error" });
      return;
    }

    if (!customerName.trim() && !customerPhone.trim() && !customerEmail.trim()) {
      setLastError("Add at least one customer identifier.");
      setSteps({ ...initialSteps, login: "error" });
      return;
    }

    setIsSubmitting(true);

    try {
      const generatedPaymentFields = createGeneratedPaymentFields();
      let token = accessToken || getStoredAccessToken();

      if (token) {
        updateStep("login", "done");
      } else {
        token = await loginMerchant();
        updateStep("login", "done");
      }

      const payerReference =
        customerPhone.trim() ||
        customerEmail.trim() ||
        customerName.trim() ||
        generatedPaymentFields.merchantReference;

      const paymentBody = {
        merchant_order_id: generatedPaymentFields.merchantOrderId,
        merchant_reference: generatedPaymentFields.merchantReference,
        amount: amount.toFixed(2),
        currency: demoCurrency,
        payerReference,
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        customer_email: customerEmail.trim() || undefined,
        success_url: `${window.location.origin}/payment/success`,
        failure_url: `${window.location.origin}/payment/failure`,
        cancel_url: `${window.location.origin}/payment/cancel`,
        webhook_url: merchantWebhookUrl.trim() || undefined,
      };

      updateStep("create", "running");

      let paymentResponse: ApiEnvelope<CreatePaymentData>;

      try {
        paymentResponse = await postJson<CreatePaymentData>(
          apiBaseFromEnv,
          "/create-payment",
          paymentBody,
          token,
        );
      } catch (error) {
        if (
          error instanceof ApiRequestError &&
          (error.status === 401 || error.status === 403)
        ) {
          storeAccessToken("");
          updateStep("login", "running");
          token = await loginMerchant();
          updateStep("login", "done");
          paymentResponse = await postJson<CreatePaymentData>(
            apiBaseFromEnv,
            "/create-payment",
            paymentBody,
            token,
          );
        } else {
          throw error;
        }
      }

      const nextPaymentResult = buildPaymentResult(paymentResponse);
      rememberPendingDeposit(nextPaymentResult.paymentId, nextPaymentResult.amount);

      setPaymentResult(nextPaymentResult);
      updateStep("create", "done");
      updateStep("redirect", "done");
      setIsAmountModalOpen(false);

      window.open(nextPaymentResult.checkoutUrl, "_blank", "noopener,noreferrer");
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
        apiBaseFromEnv,
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

  const dismissCallbackNotice = () => {
    if (callbackNotice?.status === "SUCCESS" && callbackNotice.paymentId) {
      const nextState = applyDepositSuccess(callbackNotice.paymentId);
      setWalletBalance(nextState.balance);
    }

    setCallbackNotice(null);
    window.location.replace(window.location.origin);
  };

  return (
    <div className="app-shell">
      <TopBar walletBalance={walletBalance} />

      <main className="deposit-frame">
        <section className="notice-band">
          <div>
            <p className="eyebrow">Merchant Checkout Test</p>
            <h1>Deposit request</h1>
          </div>
          <div className="notice-meta">
            <span>{demoCurrency} wallet</span>
            <strong>
              {demoCurrency} {walletBalance.toFixed(2)}
            </strong>
          </div>
        </section>

        {callbackNotice ? (
          <MerchantCallbackToast
            notice={callbackNotice}
            onDismiss={dismissCallbackNotice}
          />
        ) : null}

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

          <aside
            className="checkout-panel hidden"
            aria-label="FastPSP merchant request"
          >
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

            <div className="sequence-note">
              Click a payment method card to open the amount popup, then submit
              the request to FastPSP from there.
            </div>

            {lastError ? <div className="error-box">{lastError}</div> : null}

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

      {isAmountModalOpen ? (
        <div
          className="modal-backdrop"
          onClick={() => setIsAmountModalOpen(false)}
          role="presentation"
        >
          <div
            aria-labelledby="amount-modal-title"
            aria-modal="true"
            className="amount-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="amount-modal-header">
              <div>
                <p className="eyebrow">Create Deposit</p>
                <h2 id="amount-modal-title">{selectedPaymentMethod.label}</h2>
              </div>
              <button
                className="modal-close"
                onClick={() => setIsAmountModalOpen(false)}
                title="Close"
                type="button"
              >
                <XCircle size={18} />
              </button>
            </div>

            <p className="amount-modal-copy">
              Enter the deposit amount and submit to create the hosted checkout
              page for this payment method.
            </p>

            <div className="form-grid">
              <label>
                Amount
                <input
                  autoFocus
                  inputMode="decimal"
                  placeholder={`Enter amount in ${demoCurrency}`}
                  value={form.amount}
                  onChange={(event) =>
                    handleFieldChange("amount", event.target.value)
                  }
                />
              </label>
            </div>

            {lastError ? <div className="error-box">{lastError}</div> : null}

            <div className="modal-actions">
              <button
                className="secondary-action"
                onClick={() => setIsAmountModalOpen(false)}
                type="button"
              >
                Cancel
              </button>
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
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TopBar({ walletBalance }: { walletBalance: number }) {
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
          <strong>{walletBalance.toFixed(2)}</strong>
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

function MerchantCallbackToast({
  notice,
  onDismiss,
}: {
  notice: MerchantCallbackNotice;
  onDismiss: () => void;
}) {
  const isSuccess = notice.status === "SUCCESS";

  return (
    <div className="callback-modal-backdrop" role="presentation">
      <section
        aria-modal="true"
        className={`callback-modal ${isSuccess ? "success" : "warning"}`}
        role="dialog"
      >
        <div className="callback-icon">
          {isSuccess ? <CheckCircle2 size={30} /> : <Clock3 size={30} />}
        </div>
        <div className="callback-content">
          <h2>
            {isSuccess ? "Deposit Success!" : `Payment ${notice.status}`}
          </h2>
        </div>
        <button
          className="primary-action callback-action"
          onClick={onDismiss}
          type="button"
        >
          Dismiss
        </button>
      </section>
    </div>
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
