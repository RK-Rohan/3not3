import { useState } from "react";

type MethodTile = {
  label: string;
  logo?: "nagad" | "bkash" | "rocket";
  badge?: string;
  muted?: boolean;
};

type MethodGroupType = {
  title: string;
  items: MethodTile[];
  crypto?: boolean;
};

type TransactionHistoryRow = {
  merchant_order_id: string;
  merchant_reference: string | null;
  amount: string | number | null;
  currency: string | null;
  fastpsp_status: string | null;
  webhook_status: string | null;
  payment_id: string | null;
  local_payment_id: string | null;
  checkout_url: string | null;
  provider: string | null;
  trx_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

const categoryItems = [
  { label: "RECOMMENDED", count: 10 },
  { label: "ALL METHODS", count: 82, active: true },
  { label: "E-WALLETS", count: 22 },
  { label: "PAYMENT SYSTEMS", count: 1 },
  { label: "INTERNET BANKING", count: 1 },
  { label: "BANK TRANSFER", count: 3 },
  { label: "CRYPTOCURRENCY", count: 45 },
];

const recommendedItems: MethodTile[] = [
  { label: "Nagad Quick", logo: "nagad" },
  { label: "Bkash", logo: "bkash" },
  { label: "Nagad", logo: "nagad" },
  { label: "Bkash Free", logo: "bkash", badge: "0% COMMISSION" },
  { label: "Rocket", logo: "rocket" },
  { label: "Nagad by Paykassma", logo: "nagad" },
  { label: "Nagad Free", logo: "nagad", badge: "0% COMMISSION" },
  { label: "Bkash Quick", logo: "bkash" },
  { label: "Rocket Free", logo: "rocket" },
  { label: "Neteller" },
];

const eWalletItems: MethodTile[] = [
  { label: "Nagad Quick", logo: "nagad" },
  { label: "Cellfin Free" },
  { label: "Bkash", logo: "bkash" },
  { label: "Nagad", logo: "nagad" },
  { label: "Bkash Free", logo: "bkash", badge: "0% COMMISSION" },
  { label: "Rocket", logo: "rocket" },
  { label: "Nagad by Paykassma", logo: "nagad" },
  { label: "uPay", badge: "NEW" },
  { label: "Nagad Free", logo: "nagad", badge: "0% COMMISSION" },
  { label: "Bkash Quick", logo: "bkash" },
  { label: "Trust Axiata Pay" },
  { label: "MoneyGO" },
  { label: "BinancePay" },
  { label: "Rocket Free", logo: "rocket" },
  { label: "WebMoney" },
  { label: "MiFinity wallet" },
  { label: "Skrill" },
  { label: "Skrill 1-Tap", badge: "NEW" },
  { label: "iPay", badge: "NEW" },
  { label: "BybitPay" },
  { label: "Rocket by Paykassma", logo: "rocket", badge: "NEW" },
  { label: "uPay Kass", badge: "NEW" },
];

const paymentSystemItems: MethodTile[] = [{ label: "Neteller" }];
const internetBankingItems: MethodTile[] = [{ label: "Nexus Pay" }];
const bankTransferItems: MethodTile[] = [
  { label: "Cellfin" },
  { label: "OK Wallet" },
  { label: "Bank Transfer" },
];

const cryptoNames = [
  "Solana",
  "Tether on Tron",
  "Tether on TON",
  "Tether on POL",
  "Tether on BSC",
  "Tether on Ethereum",
  "TRON",
  "Bitcoin",
  "Litecoin",
  "Ethereum",
  "Binance Coin BSC",
  "Dogecoin",
  "USD Coin on Ethereum",
  "XRP",
  "Polygon",
  "Toncoin",
  "Monero",
  "Dash",
  "USD Coin on Solana",
  "Ethereum Classic",
  "Cardano",
  "USD Coin on Optimism",
  "Tether on Optimism",
  "Ethereum on Optimism",
  "Bridged USD Coin on Optimism",
  "SHIBA INU on BSC",
  "Tether on Arbitrum One",
  "Ethereum on Arbitrum One",
  "USD Coin on Arbitrum One",
  "Bridged USD Coin on Arbitrum",
  "Algorand",
  "Bitcoin Cash",
  "Cosmos Atom",
  "Tether on Solana",
  "USD Coin on Base",
  "Digibyte",
  "Stellar",
  "Chainlink on Ethereum",
  "Ethereum on Base",
  "SHIBA INU on Ethereum",
  "Polkadot",
  "Avalanche C-Chain",
  "QTUM",
  "Verge",
  "ZCash",
];

const methodGroups: MethodGroupType[] = [
  { title: "RECOMMENDED", items: recommendedItems },
  { title: "E-WALLETS", items: eWalletItems },
  { title: "PAYMENT SYSTEMS", items: paymentSystemItems },
  { title: "INTERNET BANKING", items: internetBankingItems },
  { title: "BANK TRANSFER", items: bankTransferItems },
  {
    title: "CRYPTOCURRENCY",
    items: cryptoNames.map((label) => ({ label, muted: true })),
    crypto: true,
  },
];

const mainMenuItems = [
  "Deposit",
  "Withdraw funds",
  "Bet history",
  "Transaction history",
  "Payment queries",
];

const profileMenuItems = ["Profile"];

const footerColumns = [
  {
    title: "INFORMATION",
    links: [
      "About us",
      "Terms and Conditions",
      "How to top up your account with crypto",
      "Affiliate Program",
      "Become an agent",
      "TeamCash agents",
      "Privacy Policy",
      "Cookie Policy",
      "Contacts",
      "We are on social media",
      "How to place a bet",
    ],
  },
  {
    title: "BETTING",
    links: ["Cricket", "Sports", "Multi-LIVE", "Live", "Toto"],
  },
  {
    title: "GAMES",
    links: ["Casino", "Fast Games", "Live Casino"],
  },
  {
    title: "STATISTICS",
    links: ["Statistics", "Results"],
  },
  {
    title: "USEFUL LINKS",
    links: ["Mobile version", "Partnership", "Responsible Gambling"],
  },
];

const partners = [
  "LaLiga",
  "Juventus",
  "Icon 1",
  "Icon 2",
  "Kings",
  "Icon 3",
  "MOT",
  "Icon 4",
  "Icon 5",
  "OG",
];

const balanceStorageKey = "melbet-demo-balance-bdt";
const fastPspPresetAmounts = [200, 300, 500, 1000, 5000];

function readStoredBalance() {
  if (typeof window === "undefined") {
    return 0;
  }

  const raw = window.localStorage.getItem(balanceStorageKey);
  const value = raw ? Number(raw) : 0;

  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Number(value.toFixed(2));
}

function writeStoredBalance(value: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(balanceStorageKey, value.toFixed(2));
}

function formatBalance(value: number) {
  const rounded = Number(value.toFixed(2));
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  return rounded.toFixed(2);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("en-BD", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function App() {
  const [balance, setBalance] = useState(() => readStoredBalance());
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [isFastPspModalOpen, setIsFastPspModalOpen] = useState(false);
  const [isSubmittingFastPsp, setIsSubmittingFastPsp] = useState(false);
  const [isTransactionHistoryOpen, setIsTransactionHistoryOpen] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionHistoryError, setTransactionHistoryError] = useState("");
  const [transactions, setTransactions] = useState<TransactionHistoryRow[]>([]);
  const [amount, setAmount] = useState("200.00");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("880");
  const [modalError, setModalError] = useState("");

  const refreshBalance = async () => {
    if (isRefreshingBalance) {
      return;
    }

    setIsRefreshingBalance(true);

    await new Promise<void>((resolve) => {
      window.setTimeout(() => resolve(), 380);
    });

    const currentBalance = readStoredBalance();
    const nextBalance =
      currentBalance <= 0
        ? Number((Math.random() * 1200 + 50).toFixed(2))
        : Number(Math.max(0, currentBalance + (Math.random() * 90 - 45)).toFixed(2));

    writeStoredBalance(nextBalance);
    setBalance(nextBalance);
    setIsRefreshingBalance(false);
  };

  const openFastPspModal = () => {
    setAmount("200.00");
    setModalError("");
    setIsFastPspModalOpen(true);
  };

  const closeFastPspModal = () => {
    if (isSubmittingFastPsp) {
      return;
    }
    setIsFastPspModalOpen(false);
  };

  const setPresetAmount = (nextAmount: number) => {
    setAmount(nextAmount.toFixed(2));
    setModalError("");
  };

  const confirmFastPspPayment = async () => {
    if (isSubmittingFastPsp) {
      return;
    }

    const numericAmount = Number(amount.replaceAll(" ", ""));
    if (!Number.isFinite(numericAmount) || numericAmount < 200 || numericAmount > 25000) {
      setModalError("Amount must be between 200.00 and 25,000.00 BDT.");
      return;
    }

    setModalError("");
    setIsSubmittingFastPsp(true);

    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 9000 + 1000);
    const merchantOrderId = `ORDER-${timestamp}-${random}`;
    const merchantReference = `REF-${timestamp}-${random}`;

    try {
      const response = await fetch("/api/fastpsp/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchant_order_id: merchantOrderId,
          merchant_reference: merchantReference,
          amount: numericAmount.toFixed(2),
          currency: "BDT",
          payerReference: phoneNumber.trim() || email.trim() || merchantReference,
          customer_name: fullName.trim(),
          customer_phone: phoneNumber.trim(),
          customer_email: email.trim(),
          success_url: `${window.location.origin}/payment/success`,
          failure_url: `${window.location.origin}/payment/failure`,
          cancel_url: `${window.location.origin}/payment/cancel`,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        checkoutUrl?: string;
      };

      if (!response.ok || !payload.success || !payload.checkoutUrl) {
        throw new Error(payload.message || "Failed to create FastPSP payment.");
      }

      window.location.assign(payload.checkoutUrl);
      return;
    } catch (error) {
      setModalError(
        error instanceof Error ? error.message : "Unable to create payment link.",
      );
    } finally {
      setIsSubmittingFastPsp(false);
    }
  };

  const fetchTransactions = async () => {
    setIsLoadingTransactions(true);
    setTransactionHistoryError("");
    try {
      const response = await fetch("/api/fastpsp/transactions?limit=100");
      const payload = (await response.json()) as {
        success?: boolean;
        transactions?: TransactionHistoryRow[];
        message?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Failed to load transaction history.");
      }

      setTransactions(Array.isArray(payload.transactions) ? payload.transactions : []);
    } catch (error) {
      setTransactionHistoryError(
        error instanceof Error ? error.message : "Unable to load transaction history.",
      );
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const openTransactionHistory = () => {
    setIsTransactionHistoryOpen(true);
    void fetchTransactions();
  };

  const closeTransactionHistory = () => {
    if (isLoadingTransactions) {
      return;
    }
    setIsTransactionHistoryOpen(false);
  };

  return (
    <div className="melbet-page">
      <header className="top-header">
        <div className="logo-wrap">
          <span className="logo-text">
            <span className="logo-mel">MEL</span>
            <span className="logo-bet">BET</span>
          </span>
          <span className="bd-flag" aria-hidden="true">
            <span />
          </span>
        </div>

        <div className="header-shortcuts">
          <span className="shortcut-item" />
          <span className="shortcut-item" />
          <span className="shortcut-item" />
          <span className="shortcut-item" />
          <span className="shortcut-item" />
          <span className="shortcut-item" />
        </div>

        <div className="header-tools">
          <div className="header-balance">
            <span className="header-balance-currency">BDT</span>
            <strong className="header-balance-amount">{formatBalance(balance)}</strong>
          </div>
          <button
            type="button"
            className={`header-balance-refresh ${
              isRefreshingBalance ? "header-balance-refresh--spinning" : ""
            }`}
            aria-label="Refresh balance"
            title="Refresh balance"
            onClick={refreshBalance}
            disabled={isRefreshingBalance}
          >
            ↻
          </button>
        </div>
      </header>

      <nav className="primary-nav">
        <a href="/" className="mayan-link">
          Mayan Tomb
        </a>
      </nav>

      <div className="layout">
        <aside className="left-sidebar">
          <section className="menu-group">
            <div className="menu-title">ACCOUNT</div>
            <nav className="account-menu">
              {mainMenuItems.map((item, index) => (
                <button
                  type="button"
                  className={`menu-item ${index === 0 ? "menu-item--active" : ""}`}
                  key={item}
                  onClick={item === "Transaction history" ? openTransactionHistory : undefined}
                >
                  <span className="menu-dot" />
                  {item}
                </button>
              ))}
            </nav>
          </section>

          <section className="menu-group">
            <div className="menu-title">PROFILE</div>
            <nav className="account-menu">
              {profileMenuItems.map((item) => (
                <button type="button" className="menu-item" key={item}>
                  <span className="menu-dot" />
                  {item}
                </button>
              ))}
            </nav>
          </section>
        </aside>

        <section className="deposit-content">
          <div className="deposit-panel">
            <div className="panel-header">
              <h1>ACCOUNT 1668665073</h1>
              <p>Select payment method to top up your account:</p>
            </div>

            <div className="promo-banner">
              <span>MELBET DEPOSIT BONUS</span>
              <button type="button">START NOW</button>
            </div>

            <div className="payment-layout">
              <aside className="methods-filter">
                {categoryItems.map((item) => (
                  <button
                    type="button"
                    key={item.label}
                    className={`filter-item ${item.active ? "filter-item--active" : ""}`}
                  >
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </button>
                ))}
              </aside>

              <div className="methods-groups">
                {methodGroups.map((group) => (
                  <section className="method-group" key={group.title}>
                    <h2>{group.title}</h2>
                    <div
                      className={`method-grid ${
                        group.crypto ? "method-grid--crypto" : ""
                      }`}
                    >
                      {group.items.map((item) => (
                        <MethodCard
                          item={item}
                          groupTitle={group.title}
                          onOpenFastPspModal={openFastPspModal}
                          key={`${group.title}-${item.label}`}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="site-footer">
        <div className="footer-accordion">ONLINE BETTING SITE - MELBET</div>
        <div className="footer-accordion">POPULAR EVENTS AND SPORTS NEWS</div>

        <div className="footer-columns">
          {footerColumns.map((column) => (
            <div key={column.title} className="footer-column">
              <h3>{column.title}</h3>
              <ul>
                {column.links.map((link) => (
                  <li key={link}>{link}</li>
                ))}
              </ul>
            </div>
          ))}
          <div className="footer-column footer-column--apps">
            <h3>APPS</h3>
            <div className="app-buttons">
              <span>Android</span>
              <span>iOS</span>
            </div>
            <div className="app-card">
              <div className="qr">QR</div>
              <div>
                <strong>MOBILE APPLICATION</strong>
                <p>Download</p>
              </div>
            </div>
          </div>
        </div>

        <div className="partners-strip">
          {partners.map((partner) => (
            <div className="partner-tile" key={partner}>
              {partner}
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <p>
            Melbet uses cookies to ensure the best user experience. By remaining on
            the website, you consent to the use of cookies.
          </p>
          <div className="bottom-badges">
            <span>18+</span>
            <span>BeGambleAware.org</span>
            <span>DMCA Protected</span>
          </div>
          <div className="support-row">
            <span className="support-chip">CUSTOMER SUPPORT 442038077601</span>
            <span className="support-chip">MOBILE VERSION</span>
          </div>
        </div>
      </footer>

      {isTransactionHistoryOpen ? (
        <div className="history-modal-backdrop" role="presentation" onClick={closeTransactionHistory}>
          <section
            className="history-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Transaction history"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="history-modal-header">
              <h3>Transaction History</h3>
              <button
                type="button"
                className="history-modal-close"
                onClick={closeTransactionHistory}
                disabled={isLoadingTransactions}
                aria-label="Close transaction history"
              >
                ×
              </button>
            </header>

            <div className="history-modal-body">
              {transactionHistoryError ? (
                <div className="history-error">{transactionHistoryError}</div>
              ) : null}

              {isLoadingTransactions ? <div className="history-loading">Loading...</div> : null}

              {!isLoadingTransactions && transactions.length === 0 ? (
                <div className="history-empty">No transactions found yet.</div>
              ) : null}

              {!isLoadingTransactions && transactions.length > 0 ? (
                <div className="history-table-wrap">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((row) => (
                        <tr key={row.merchant_order_id}>
                          <td>{row.merchant_order_id}</td>
                          <td>
                            {row.currency || "BDT"} {row.amount ?? "-"}
                          </td>
                          <td>
                            {row.webhook_status || row.fastpsp_status || (row.error_message ? "FAILED" : "PENDING")}
                          </td>
                          <td>{formatDateTime(row.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {isFastPspModalOpen ? (
        <div className="fastpsp-modal-backdrop" role="presentation" onClick={closeFastPspModal}>
          <section
            className="fastpsp-modal"
            role="dialog"
            aria-modal="true"
            aria-label="fastPSP Bkash payment form"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="fastpsp-modal-header">
              <div className="fastpsp-logo">
                <img src="/payment-icons/bkash.svg" alt="Bkash" />
                <span>fastPSP</span>
              </div>
              <button
                type="button"
                className="fastpsp-modal-close"
                onClick={closeFastPspModal}
                disabled={isSubmittingFastPsp}
                aria-label="Close modal"
              >
                ×
              </button>
            </header>

            <div className="fastpsp-modal-body">
              <div className="fastpsp-field-row">
                <label htmlFor="fastpsp-amount" className="fastpsp-field-label">
                  Amount (Min 200.00 BDT / Max 25 000.00 BDT):
                </label>
                <input
                  id="fastpsp-amount"
                  className="fastpsp-input"
                  type="text"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setModalError("");
                  }}
                  inputMode="decimal"
                  placeholder="200.00"
                />
              </div>

              {modalError ? <div className="fastpsp-error">{modalError}</div> : null}

              <div className="fastpsp-presets-title">
                Please enter or select your deposit amount
              </div>
              <div className="fastpsp-presets">
                {fastPspPresetAmounts.map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    className="fastpsp-preset-btn"
                    onClick={() => setPresetAmount(preset)}
                    disabled={isSubmittingFastPsp}
                  >
                    {preset.toLocaleString("en-US")}
                  </button>
                ))}
              </div>

              <div className="fastpsp-field-row">
                <label htmlFor="fastpsp-fullname" className="fastpsp-field-label">
                  First name and surname:
                </label>
                <input
                  id="fastpsp-fullname"
                  className="fastpsp-input"
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </div>

              <div className="fastpsp-field-row">
                <label htmlFor="fastpsp-email" className="fastpsp-field-label">
                  Email:
                </label>
                <input
                  id="fastpsp-email"
                  className="fastpsp-input"
                  type="text"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="fastpsp-field-row">
                <label htmlFor="fastpsp-phone" className="fastpsp-field-label">
                  Phone number:
                </label>
                <input
                  id="fastpsp-phone"
                  className="fastpsp-input"
                  type="text"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                />
              </div>

              <button
                type="button"
                className="fastpsp-confirm-btn"
                onClick={confirmFastPspPayment}
                disabled={isSubmittingFastPsp}
              >
                {isSubmittingFastPsp ? "PROCESSING..." : "CONFIRM"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function MethodCard({
  item,
  groupTitle,
  onOpenFastPspModal,
}: {
  item: MethodTile;
  groupTitle: string;
  onOpenFastPspModal: () => void;
}) {
  const showGatewayLabel = groupTitle === "RECOMMENDED" && item.label === "Bkash";

  return (
    <article
      className={`method-card ${item.muted ? "method-card--muted" : ""} ${
        showGatewayLabel ? "method-card--interactive" : ""
      }`}
      onClick={showGatewayLabel ? onOpenFastPspModal : undefined}
      role={showGatewayLabel ? "button" : undefined}
      tabIndex={showGatewayLabel ? 0 : undefined}
      onKeyDown={
        showGatewayLabel
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpenFastPspModal();
              }
            }
          : undefined
      }
    >
      {item.badge ? <span className="method-badge">{item.badge}</span> : null}
      <div className={`method-top ${item.logo ? `logo-${item.logo}` : ""}`}>
        {item.logo ? (
          <div
            className={`logo-with-gateway ${
              showGatewayLabel ? "logo-with-gateway--bkash" : ""
            }`}
          >
            <img src={logoPath(item.logo)} alt={item.label} />
            {showGatewayLabel ? (
              <span className="gateway-label">fastPSP</span>
            ) : null}
          </div>
        ) : (
          <span>{item.label}</span>
        )}
      </div>
      <div className="method-bottom">{item.label}</div>
    </article>
  );
}

function logoPath(logo: NonNullable<MethodTile["logo"]>) {
  if (logo === "bkash") {
    return "/payment-icons/bkash.svg";
  }
  if (logo === "nagad") {
    return "/payment-icons/nagad.svg";
  }
  return "/payment-icons/rocket.svg";
}

export default App;
