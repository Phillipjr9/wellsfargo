"use client";

import {
  AccountActivityView,
  BillPayView,
  BrokerageView,
  CardsControlTowerView,
  CheckDepositView,
  PlanLearnView,
  ScheduledView,
  SecurityAlertsView,
  StatementsDocsView,
  TransferView,
  ZelleView,
} from "@/components/wfo-views";
import {
  CASH_TYPES,
  CREDIT_TYPES,
  INVEST_TYPES,
  LOAN_TYPES,
  WF_DEALS,
  fmtMoney,
  routingForBranch,
  type AccountRow,
  type PortalView,
  type Profile,
} from "@/components/wfo-types";
import { customerFetch, customerSignOut, setCustomerToken } from "@/lib/client-auth";
import {
  ArrowLeftRight,
  ArrowRight,
  Bell,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Gift,
  Home,
  Landmark,
  LifeBuoy,
  Lock,
  MapPin,
  MoreVertical,
  PiggyBank,
  Receipt,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type PlanSub = "fargo" | "fico" | "goals" | "deals";

type TopMenu = {
  id: string;
  label: string;
  defaultView: PortalView;
  matchViews: PortalView[];
  items: { label: string; desc: string; view: PortalView; planSub?: PlanSub; href?: string }[];
};

const PORTAL_MENUS: TopMenu[] = [
  {
    id: "accounts",
    label: "Accounts",
    defaultView: "summary",
    matchViews: ["summary", "activity", "statements"],
    items: [
      { label: "Account Summary", desc: "Overview of all linked Wells Fargo accounts", view: "summary" },
      { label: "Account Activity", desc: "Search transactions, view routing & export CSV", view: "activity" },
      { label: "Statements & Documents", desc: "Download PDF statements & 1099/1098 tax forms", view: "statements" },
      { label: "Tax Center", desc: "Key filing deadlines & tax document guide", view: "statements", href: "/tax-center" },
    ],
  },
  {
    id: "brokerage",
    label: "Brokerage",
    defaultView: "brokerage",
    matchViews: ["brokerage"],
    items: [
      { label: "Portfolio & Holdings", desc: "WellsTrade® & Wells Fargo Advisors accounts", view: "brokerage" },
      { label: "Fund Brokerage Account", desc: "Transfer cash instantly from checking", view: "transfer" },
      { label: "Retirement & IRAs", desc: "Explore Roth, Traditional & 401(k) rollovers", view: "brokerage", href: "/investing-wealth/retirement" },
    ],
  },
  {
    id: "transfer",
    label: "Transfer & Pay",
    defaultView: "transfer",
    matchViews: ["transfer", "zelle", "bills", "deposit", "scheduled"],
    items: [
      { label: "Transfer Money", desc: "Move funds between accounts or pay cards & loans", view: "transfer" },
      { label: "Send Money with Zelle®", desc: "Fast, $0-fee payments to people you trust", view: "zelle" },
      { label: "Pay Bills", desc: "Manage eBills, payees & AutoPay schedules", view: "bills" },
      { label: "Deposit Checks", desc: "Endorse & deposit checks directly online", view: "deposit" },
      { label: "Scheduled & Recurring", desc: "Automate weekly, monthly or quarterly transfers", view: "scheduled" },
    ],
  },
  {
    id: "plan",
    label: "Plan & Learn",
    defaultView: "plan",
    matchViews: ["plan"],
    items: [
      { label: "Fargo® Spending Insights", desc: "Category breakdown, cash flow & subscriptions", view: "plan", planSub: "fargo" },
      { label: "Credit Close-Up® (FICO® Score)", desc: "Monthly FICO® Score 9 & interactive simulator", view: "plan", planSub: "fico" },
      { label: "LifeSync® Financial Goals", desc: "Track emergency, travel & retirement goals", view: "plan", planSub: "goals" },
      { label: "My Wells Fargo Deals®", desc: "Activate merchant cash-back card offers", view: "plan", planSub: "deals" },
    ],
  },
  {
    id: "security",
    label: "Security & Support",
    defaultView: "security",
    matchViews: ["cards", "security"],
    items: [
      { label: "Security Center", desc: "Passkeys, alerts, trusted devices & fraud protection", view: "security", href: "/online-banking/security" },
      { label: "Control Tower® & Manage Cards", desc: "Real card art, instant on/off, wallets & Rewards", view: "cards", href: "/online-banking/cards" },
      { label: "Secure Message Center", desc: "Private inbox with Wells Fargo Support", view: "security", href: "/online-banking/messages" },
      { label: "Make an Appointment", desc: "Meet with a banker in branch or by phone", view: "security", href: "/appointments" },
      { label: "Report Fraud", desc: "File an unauthorized activity or scam case", view: "security", href: "/privacy-security/fraud/report" },
    ],
  },
];

function FicoGauge({ score }: { score: number }) {
  const clamped = Math.max(300, Math.min(850, score));
  const pct = (clamped - 300) / 550;
  const radius = 58;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - pct);
  const rating = clamped >= 800 ? "Exceptional" : clamped >= 740 ? "Very Good" : clamped >= 670 ? "Good" : "Fair";

  return (
    <div className="wfop-fico-gauge">
      <svg viewBox="0 0 150 88" aria-label={`FICO Score ${clamped}, ${rating}`}>
        <path
          d="M 17 76 A 58 58 0 0 1 133 76"
          fill="none"
          stroke="#ebe5e2"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <path
          d="M 17 76 A 58 58 0 0 1 133 76"
          fill="none"
          stroke="url(#ficoGrad)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
        <defs>
          <linearGradient id="ficoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d71e28" />
            <stop offset="50%" stopColor="#e6a100" />
            <stop offset="100%" stopColor="#1b7a46" />
          </linearGradient>
        </defs>
        <text x="75" y="61" textAnchor="middle" className="wfop-fico-num">{clamped}</text>
        <text x="75" y="78" textAnchor="middle" className="wfop-fico-lbl">{rating}</text>
      </svg>
    </div>
  );
}

export function CustomerDashboard({
  initialUser,
  signedInAs,
  initialView,
}: {
  initialUser: string;
  signedInAs?: string;
  initialView?: PortalView;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<PortalView>(initialView ?? "summary");
  const [planSub, setPlanSub] = useState<PlanSub>("fargo");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [rowMenuId, setRowMenuId] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [hideBalances, setHideBalances] = useState(false);
  const [greeting, setGreeting] = useState("Good afternoon");
  const [lastSignInText, setLastSignInText] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [activatedDeals, setActivatedDeals] = useState<Record<string, boolean>>({ sbux: true });
  const [fargoPrompt, setFargoPrompt] = useState("");
  const [fargoAnswer, setFargoAnswer] = useState<string | null>(null);

  const load = useCallback(async (username: string) => {
    setLoading(true);
    try {
      const res = await customerFetch(`/api/online-banking?user=${encodeURIComponent(username)}`);
      const data = (await res.json()) as { profile: Profile | null };
      if (data.profile) {
        setProfile(data.profile);
        setLastSignInText(
          new Date(data.profile.customer.lastSignInAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(initialUser);
    const h = new Date().getHours();
    setGreeting(h >= 3 && h < 12 ? "Good morning" : h >= 12 && h < 18 ? "Good afternoon" : "Good evening");
  }, [initialUser, load]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 4200);
  }

  async function post(body: Record<string, unknown>, successMessage: string) {
    if (!profile) return false;
    setBusy(true);
    try {
      const res = await customerFetch("/api/online-banking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: profile.customer.username, ...body }),
      });
      const data = (await res.json()) as { profile?: Profile | null; error?: string };
      if (!res.ok || !data.profile) {
        notify(data.error ?? "Unable to complete that request.");
        return false;
      }
      setProfile(data.profile);
      notify(successMessage);
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function switchCustomer(nextUsername: string) {
    setProfileMenuOpen(false);
    setSelectedAccountId(null);
    setFargoAnswer(null);
    try {
      const res = await customerFetch("/api/customer/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "demo", username: nextUsername }),
      });
      if (res.ok) {
        const data = (await res.json()) as { token?: string };
        if (data.token) setCustomerToken(data.token);
      }
    } catch {
      /* Still switch view even for locked demo profiles. */
    }
    window.history.replaceState(null, "", `/online-banking/dashboard?user=${encodeURIComponent(nextUsername)}`);
    await load(nextUsername);
    setView("summary");
    notify(`Switched account view to ${nextUsername.replace("_", " ")}.`);
  }

  function openAccount(acct: AccountRow) {
    setSelectedAccountId(acct.id);
    setRowMenuId(null);
    if (INVEST_TYPES.includes(acct.accountType)) {
      setView("brokerage");
    } else {
      setView("activity");
    }
  }

  function toggleDeal(id: string, merchant: string) {
    setActivatedDeals((prev) => {
      const next = !prev[id];
      notify(next ? `${merchant} cash-back deal activated on your cards.` : `${merchant} deal removed.`);
      return { ...prev, [id]: next };
    });
  }

  const groups = useMemo(() => {
    const accts = profile?.accounts ?? [];
    const cash = accts.filter((a) => CASH_TYPES.includes(a.accountType));
    const credit = accts.filter((a) => CREDIT_TYPES.includes(a.accountType));
    const loans = accts.filter((a) => LOAN_TYPES.includes(a.accountType));
    const invest = accts.filter((a) => INVEST_TYPES.includes(a.accountType));
    const sum = (list: AccountRow[], field: "balance" | "availableBalance" = "balance") =>
      list.reduce((s, a) => s + (Number(a[field]) || 0), 0);
    const rewards = accts.flatMap((a) => a.cards).reduce((s, c) => s + c.rewardsPoints, 0);
    return {
      cash,
      credit,
      loans,
      invest,
      cashTotal: sum(cash),
      creditTotal: sum(credit),
      creditAvail: sum(credit, "availableBalance"),
      loanTotal: sum(loans),
      investTotal: sum(invest),
      rewards,
    };
  }, [profile]);

  function askFargo(rawQuestion: string) {
    if (!profile) return;
    const q = rawQuestion.toLowerCase();
    const aba = routingForBranch(profile.customer.homeBranchCode);
    if (q.includes("routing") || q.includes("wire")) {
      setFargoAnswer(`Your Direct Deposit & ACH routing number is ${aba}. For domestic wire transfers, use 121000248 (SWIFT: WFBIUS6S).`);
    } else if (q.includes("bill") || q.includes("due")) {
      const unpaid = profile.bills.filter((b) => Number(b.amountDue) > 0);
      const dueSum = unpaid.reduce((s, b) => s + Number(b.amountDue), 0);
      setFargoAnswer(
        unpaid.length
          ? `You have ${unpaid.length} upcoming bills totaling ${fmtMoney(dueSum)}. Next up: ${unpaid[0].payeeName} (${fmtMoney(unpaid[0].amountDue)} due ${unpaid[0].dueDate}).`
          : "All enrolled Bill Pay accounts are paid up with $0.00 currently due.",
      );
    } else if (q.includes("reward") || q.includes("point")) {
      setFargoAnswer(
        `You have ${groups.rewards.toLocaleString()} Wells Fargo Rewards® points — worth ${fmtMoney(groups.rewards / 100)} toward cash deposits, statement credits, or travel.`,
      );
    } else if (q.includes("card") || q.includes("lock")) {
      const allCards = profile.accounts.flatMap((a) => a.cards);
      const locked = allCards.filter((c) => c.status === "Locked").length;
      setFargoAnswer(
        `You have ${allCards.length} linked card${allCards.length === 1 ? "" : "s"} (${locked} locked, ${allCards.length - locked} active). Open Control Tower® under Security & Support to toggle any card instantly.`,
      );
    } else {
      const spend = profile.transactions
        .filter((t) => Number(t.amount) < 0 && !["Transfer", "Payment", "Loan Payment"].includes(t.category))
        .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
      setFargoAnswer(
        `You hold ${fmtMoney(groups.cashTotal)} across ${groups.cash.length} cash account${groups.cash.length === 1 ? "" : "s"}, with ${fmtMoney(spend)} in recent everyday purchases across ${profile.transactions.length} posted items.`,
      );
    }
  }

  if (loading || !profile) {
    return (
      <div className="wfop-shell">
        <header className="wfop-masthead">
          <div className="wfop-container wfop-masthead-inner">
            <Link href="/" className="wfop-logo" aria-label="Wells Fargo Home">
              <img src="/images/wells-fargo-wordmark.png" alt="Wells Fargo" width="196" height="21" />
            </Link>
            <span className="wfop-mast-badge">Wells Fargo Online<sup>®</sup></span>
          </div>
        </header>
        <main className="wfop-canvas">
          <div className="wfop-container wfop-loading-box">
            <span className="wfop-spinner" aria-hidden="true" />
            <p>Loading your Wells Fargo Online<sup>®</sup> Account Summary…</p>
          </div>
        </main>
      </div>
    );
  }

  const c = profile.customer;
  const firstName = (signedInAs || c.fullName).split(" ")[0];
  const ficoScore = c.tier === "Private Client" ? 818 : c.tier === "Premier" ? 792 : 744;
  const unpaidBills = profile.bills.filter((b) => Number(b.amountDue) > 0);
  const unreadDocs = profile.accounts.flatMap((a) => a.statements).filter((s) => !s.viewed).length;

  return (
    <div
      className="wfop-shell"
      onClick={() => {
        if (rowMenuId !== null) setRowMenuId(null);
      }}
    >
      {/* 1. AUTHENTIC WELLS FARGO ONLINE® CRIMSON MASTHEAD */}
      <header className="wfop-masthead">
        <div className="wfop-container wfop-masthead-inner">
          <div className="wfop-mast-left">
              <button
                type="button"
                className="wfop-logo"
                onClick={() => {
                  setSelectedAccountId(null);
                  setView("summary");
                }}
                aria-label="Wells Fargo Online Account Summary"
              >
                <img src="/images/wf-logo-220.png" alt="Wells Fargo" width="196" height="21" />
              </button>
          </div>

          <div className="wfop-mast-right">
            <button
              type="button"
              className="wfop-mast-util"
              onClick={() => {
                setPlanSub("fargo");
                setView("plan");
              }}
            >
              <img src="/images/fargo-mark.png" alt="" width="18" height="18" className="wfop-mast-icon" />
              <span>Ask Fargo<sup>®</sup></span>
            </button>

            <Link href="/locations" className="wfop-mast-util">
              <MapPin size={17} />
              <span>Locations</span>
            </Link>

            <Link href="/help" className="wfop-mast-util">
              <LifeBuoy size={17} />
              <span>Help</span>
            </Link>

            <Link href="/online-banking/messages" className="wfop-mast-util" aria-label="Messages and notifications">
              <Bell size={17} />
              <span>Messages</span>
              {unreadDocs > 0 && <em className="wfop-mast-count">{unreadDocs}</em>}
            </Link>

            <div className="wfop-profile-wrap">
              <button
                type="button"
                className="wfop-mast-util"
                aria-expanded={profileMenuOpen}
                onClick={() => {
                  setProfileMenuOpen(!profileMenuOpen);
                  setOpenMenu(null);
                }}
              >
                <User size={17} />
                <span>Welcome, {firstName}</span>
                <ChevronDown size={15} />
              </button>

              {profileMenuOpen && (
                <div className="wfop-profile-menu" role="menu">
                  <div className="wfop-profile-head">
                    <strong>{c.fullName}</strong>
                    <small>{c.tier} Relationship • Since {c.relationshipSince}</small>
                  </div>
                  <div className="wfop-profile-links">
                    <button type="button" onClick={() => { setProfileMenuOpen(false); setView("security"); }}>
                      Profile, Security &amp; Alerts
                    </button>
                    <button type="button" onClick={() => { setProfileMenuOpen(false); setView("cards"); }}>
                      Control Tower® &amp; Cards
                    </button>
                    <button type="button" onClick={() => { setProfileMenuOpen(false); setView("statements"); }}>
                      Statements &amp; Tax Documents
                    </button>
                    <Link href="/online-banking/messages" onClick={() => setProfileMenuOpen(false)}>
                      Secure Message Center
                    </Link>
                  </div>
                  <div className="wfop-profile-switch">
                    <label htmlFor="wfop-switch-select">Switch customer profile</label>
                    <select
                      id="wfop-switch-select"
                      value={c.username}
                      onChange={(e) => void switchCustomer(e.target.value)}
                    >
                      {profile.profiles.map((p) => (
                        <option key={p.username} value={p.username}>
                          {p.fullName} ({p.tier}{p.status && p.status !== "Active" ? ` • ${p.status}` : ""})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="wfop-profile-foot">
                    <Link href="/">Public Home</Link>
                    <Link href="/admin/login">Super Admin Console</Link>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="wfop-signoff-pill"
              onClick={async () => {
                await customerSignOut();
                window.location.assign("/sign-on");
              }}
            >
              <Lock size={14} /> Sign Off
            </button>
          </div>
        </div>
      </header>

      {/* 2. AUTHENTIC WELLS FARGO ONLINE® 5-TAB PRIMARY NAV */}
      <nav
        className="wfop-topnav"
        aria-label="Wells Fargo Online primary navigation"
        onMouseLeave={() => setOpenMenu(null)}
      >
        <div className="wfop-container wfop-topnav-inner">
          {PORTAL_MENUS.map((menu) => {
            const isActive = menu.matchViews.includes(view);
            const isOpen = openMenu === menu.id;
            return (
              <div
                key={menu.id}
                className="wfop-nav-item"
                onMouseEnter={() => setOpenMenu(menu.id)}
              >
                <button
                  type="button"
                  className={`wfop-nav-trigger ${isActive ? "active" : ""}`}
                  aria-expanded={isOpen}
                  onClick={() => {
                    if (menu.defaultView === "summary") setSelectedAccountId(null);
                    setView(menu.defaultView);
                    setOpenMenu(null);
                  }}
                >
                  <span>{menu.label}</span>
                  <ChevronDown size={15} />
                </button>
                {isOpen && (
                  <div className="wfop-dropdown" role="menu">
                    {menu.items.map((item) =>
                      item.href ? (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="wfop-drop-link"
                          onClick={() => setOpenMenu(null)}
                        >
                          <strong>{item.label}</strong>
                          <span>{item.desc}</span>
                        </Link>
                      ) : (
                        <button
                          key={item.label}
                          type="button"
                          className="wfop-drop-link"
                          onClick={() => {
                            if (item.view === "summary" || item.view === "activity") setSelectedAccountId(null);
                            if (item.planSub) setPlanSub(item.planSub);
                            setView(item.view);
                            setOpenMenu(null);
                          }}
                        >
                          <strong>{item.label}</strong>
                          <span>{item.desc}</span>
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="wfop-topnav-right">
            <button
              type="button"
              className="wfop-privacy-btn"
              onClick={() => setHideBalances(!hideBalances)}
              title={hideBalances ? "Show account balances" : "Hide account balances"}
            >
              {hideBalances ? <Eye size={15} /> : <EyeOff size={15} />}
              <span>{hideBalances ? "Show balances" : "Hide balances"}</span>
            </button>
          </div>
        </div>
      </nav>

      {toast && (
        <div className="wf-toast" role="status">
          <CheckCircle2 size={18} /> {toast}
        </div>
      )}

      {/* 3. MAIN WELLS FARGO ONLINE® WORKSPACE CANVAS */}
      <main className="wfop-canvas">
        <div className="wfop-container">
          {c.status !== "Active" && (
            <div className="wfop-alert-banner" role="alert">
              <ShieldCheck size={18} />
              <span>
                <strong>Account access notice:</strong> This profile is currently marked <strong>{c.status}</strong>. Outgoing transfers are paused until unlocked in the <Link href="/admin/login">Super Admin Console</Link> or by switching profiles under <em>Welcome, {firstName}</em>.
              </span>
            </div>
          )}

          {view === "summary" ? (
            <>
              {/* Greeting & Quick Money Movement Strip */}
              <div className="wfop-greeting-bar">
                <div>
                  <div className="wfop-greeting-title">
                    <h1>{greeting}, {c.fullName.split(" ")[0]}</h1>
                    <span className="wfop-tier-badge">
                      {c.tier === "Premier" ? "Wells Fargo Premier®" : c.tier === "Private Client" ? "The Private Bank" : c.tier === "Business" ? "Business Online®" : "Wells Fargo Online®"}
                    </span>
                  </div>
                  <p className="wfop-last-signon">
                    Account Summary{lastSignInText ? ` • Last sign on: ${lastSignInText}` : ""}
                  </p>
                </div>

                <div className="wfop-quick-actions" aria-label="Quick banking actions">
                  <button type="button" onClick={() => setView("transfer")}>
                    <ArrowLeftRight size={16} /> Transfer
                  </button>
                  <button type="button" onClick={() => setView("zelle")}>
                    <Send size={16} /> Zelle<sup>®</sup>
                  </button>
                  <button type="button" onClick={() => setView("bills")}>
                    <Receipt size={16} /> Pay Bills
                  </button>
                  <button type="button" onClick={() => setView("deposit")}>
                    <Camera size={16} /> Deposit
                  </button>
                  <button type="button" onClick={() => setView("cards")}>
                    <CreditCard size={16} /> Cards
                  </button>
                </div>
              </div>

              {/* Notices & offers strip — real Wells Fargo Online® shows these above the account list */}
              <div className="wfop-notice-strip" aria-label="Notices and offers">
                <button
                  type="button"
                  className="wfop-notice"
                  onClick={() => {
                    setPlanSub("deals");
                    setView("plan");
                  }}
                >
                  <Gift size={16} />
                  <span>
                    <strong>My Wells Fargo Deals®</strong> — 10% cash back at Starbucks &amp; more waiting to activate
                  </span>
                  <ChevronRight size={15} />
                </button>
                <button type="button" className="wfop-notice" onClick={() => setView("statements")}>
                  <FileText size={16} />
                  <span>
                    <strong>Your March statement is ready</strong> — download the PDF in Statements &amp; Documents
                  </span>
                  <ChevronRight size={15} />
                </button>
                <Link href="/savings-cds/rates" className="wfop-notice">
                  <TrendingUp size={16} />
                  <span>
                    <strong>Special CD rate</strong> — 3.75% APY with your Premier relationship on the 11-month CD
                  </span>
                  <ChevronRight size={15} />
                </Link>
              </div>

              <div className="wfop-summary-grid">
                {/* LEFT PRIMARY COLUMN — GROUPED ACCOUNT MODULES */}
                <div className="wfop-main-col">
                  {/* CASH ACCOUNTS */}
                  {groups.cash.length > 0 && (
                    <section className="wfop-group-card accent-red" aria-label="Cash Accounts">
                      <button
                        type="button"
                        className="wfop-group-head"
                        aria-expanded={!collapsed.cash}
                        onClick={() => setCollapsed((p) => ({ ...p, cash: !p.cash }))}
                      >
                        <span className="wfop-group-label">Cash Accounts</span>
                        <span className="wfop-group-right">
                          {collapsed.cash && <strong>{fmtMoney(groups.cashTotal, hideBalances)}</strong>}
                          <ChevronDown size={18} className={collapsed.cash ? "closed" : ""} />
                        </span>
                      </button>

                      {!collapsed.cash && (
                        <>
                          <div className="wfop-acct-rows">
                            {groups.cash.map((a) => (
                              <div key={a.accountKey} className="wfop-acct-row">
                                <div className="wfop-acct-info">
                                  <button type="button" className="wfop-acct-link" onClick={() => openAccount(a)}>
                                    {(a.nickname || a.name).toUpperCase()}
                                  </button>
                                  <span className="wfop-acct-meta">
                                    {a.maskedNumber} • {a.productLine} • {a.rateOrApr}
                                    {a.status !== "Open" && <em className="wfop-restricted"> • {a.status}</em>}
                                  </span>
                                  <div className="wfop-row-shortcuts">
                                    <button type="button" onClick={() => openAccount(a)}>View activity</button>
                                    <span aria-hidden="true">|</span>
                                    <button type="button" onClick={() => setView("transfer")}>Transfer money</button>
                                    <span aria-hidden="true">|</span>
                                    <button type="button" onClick={() => setView("statements")}>Statements</button>
                                  </div>
                                </div>
                                <div className="wfop-acct-bal-wrap">
                                  <div className="wfop-acct-bal">
                                    <strong>{fmtMoney(a.availableBalance, hideBalances)}</strong>
                                    <span>Available balance</span>
                                  </div>
                                  <div className="wfop-kebab" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      aria-label={`Account options for ${a.nickname || a.name}`}
                                      aria-expanded={rowMenuId === a.id}
                                      onClick={() => setRowMenuId(rowMenuId === a.id ? null : a.id)}
                                    >
                                      <MoreVertical size={18} />
                                    </button>
                                    {rowMenuId === a.id && (
                                      <div className="wfop-kebab-menu" role="menu">
                                        <button type="button" onClick={() => openAccount(a)}>Account activity &amp; routing #</button>
                                        <button type="button" onClick={() => { setRowMenuId(null); setView("transfer"); }}>Transfer money</button>
                                        <button type="button" onClick={() => { setRowMenuId(null); setView("deposit"); }}>Deposit a check</button>
                                        <button type="button" onClick={() => { setRowMenuId(null); setView("bills"); }}>Pay bills</button>
                                        <button type="button" onClick={() => { setRowMenuId(null); setView("statements"); }}>View statements (PDF)</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="wfop-group-total">
                            <span>Total Cash Accounts</span>
                            <strong>{fmtMoney(groups.cashTotal, hideBalances)}</strong>
                          </div>
                        </>
                      )}
                    </section>
                  )}

                  {/* CREDIT CARDS */}
                  {groups.credit.length > 0 && (
                    <section className="wfop-group-card accent-plum" aria-label="Credit Cards">
                      <button
                        type="button"
                        className="wfop-group-head"
                        aria-expanded={!collapsed.credit}
                        onClick={() => setCollapsed((p) => ({ ...p, credit: !p.credit }))}
                      >
                        <span className="wfop-group-label">Credit Cards</span>
                        <span className="wfop-group-right">
                          {collapsed.credit && <strong>{fmtMoney(groups.creditTotal, hideBalances)}</strong>}
                          <ChevronDown size={18} className={collapsed.credit ? "closed" : ""} />
                        </span>
                      </button>

                      {!collapsed.credit && (
                        <>
                          <div className="wfop-acct-rows">
                            {groups.credit.map((a) => {
                              const limit = Number(a.creditLimit) || 1;
                              const usedPct = Math.min(100, Math.round((Number(a.balance) / limit) * 100));
                              const cardLocked = a.cards.some((cc) => cc.status === "Locked");
                              const cardPts = a.cards.reduce((s, cc) => s + cc.rewardsPoints, 0);
                              return (
                                <div key={a.accountKey} className="wfop-acct-row">
                                  <div className="wfop-acct-info">
                                    <div className="wfop-acct-title-line">
                                      <button type="button" className="wfop-acct-link" onClick={() => openAccount(a)}>
                                        {(a.nickname || a.name).toUpperCase()}
                                      </button>
                                      {cardLocked && <span className="wfop-pill wfop-pill-red"><Lock size={11} /> Card Off</span>}
                                    </div>
                                    <span className="wfop-acct-meta">
                                      {a.maskedNumber} • Available credit: <strong>{fmtMoney(a.availableBalance, hideBalances)}</strong> of {fmtMoney(a.creditLimit ?? 0, hideBalances)}
                                    </span>
                                    <div className="wfop-util-bar" aria-label={`${usedPct}% credit utilized`}>
                                      <span style={{ width: `${Math.max(3, usedPct)}%` }} />
                                    </div>
                                    <div className="wfop-row-shortcuts">
                                      <button type="button" onClick={() => setView("transfer")}>Make payment</button>
                                      <span aria-hidden="true">|</span>
                                      <button type="button" onClick={() => setView("cards")}>Manage card</button>
                                      {cardPts > 0 && (
                                        <>
                                          <span aria-hidden="true">|</span>
                                          <button type="button" onClick={() => setView("cards")}>{cardPts.toLocaleString()} Rewards pts</button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="wfop-acct-bal-wrap">
                                    <div className="wfop-acct-bal">
                                      <strong>{fmtMoney(a.balance, hideBalances)}</strong>
                                      <span>Current balance</span>
                                      {a.monthlyPayment && (
                                        <small className="wfop-due-note">
                                          Min due {fmtMoney(a.monthlyPayment, hideBalances)}{a.nextPaymentDate ? ` • ${a.nextPaymentDate}` : ""}
                                        </small>
                                      )}
                                    </div>
                                    <div className="wfop-kebab" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        aria-label={`Account options for ${a.nickname || a.name}`}
                                        onClick={() => setRowMenuId(rowMenuId === a.id ? null : a.id)}
                                      >
                                        <MoreVertical size={18} />
                                      </button>
                                      {rowMenuId === a.id && (
                                        <div className="wfop-kebab-menu" role="menu">
                                          <button type="button" onClick={() => openAccount(a)}>View card transactions</button>
                                          <button type="button" onClick={() => { setRowMenuId(null); setView("transfer"); }}>Make a payment</button>
                                          <button type="button" onClick={() => { setRowMenuId(null); setView("cards"); }}>Lock card / Redeem Rewards</button>
                                          <button type="button" onClick={() => { setRowMenuId(null); setView("statements"); }}>Card statements (PDF)</button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="wfop-group-total">
                            <span>Total Credit Balance ({fmtMoney(groups.creditAvail, hideBalances)} available)</span>
                            <strong>{fmtMoney(groups.creditTotal, hideBalances)}</strong>
                          </div>
                        </>
                      )}
                    </section>
                  )}

                  {/* LOANS & MORTGAGES */}
                  {groups.loans.length > 0 && (
                    <section className="wfop-group-card accent-gold" aria-label="Loans and Credit Lines">
                      <button
                        type="button"
                        className="wfop-group-head"
                        aria-expanded={!collapsed.loans}
                        onClick={() => setCollapsed((p) => ({ ...p, loans: !p.loans }))}
                      >
                        <span className="wfop-group-label">Loans &amp; Mortgages</span>
                        <span className="wfop-group-right">
                          {collapsed.loans && <strong>{fmtMoney(groups.loanTotal, hideBalances)}</strong>}
                          <ChevronDown size={18} className={collapsed.loans ? "closed" : ""} />
                        </span>
                      </button>

                      {!collapsed.loans && (
                        <>
                          <div className="wfop-acct-rows">
                            {groups.loans.map((a) => (
                              <div key={a.accountKey} className="wfop-acct-row">
                                <div className="wfop-acct-info">
                                  <button type="button" className="wfop-acct-link" onClick={() => openAccount(a)}>
                                    {(a.nickname || a.name).toUpperCase()}
                                  </button>
                                  <span className="wfop-acct-meta">
                                    {a.maskedNumber} • {a.productLine} • {a.rateOrApr}
                                  </span>
                                  <div className="wfop-row-shortcuts">
                                    <button type="button" onClick={() => setView("transfer")}>Make payment</button>
                                    <span aria-hidden="true">|</span>
                                    <button type="button" onClick={() => openAccount(a)}>Payment history</button>
                                    <span aria-hidden="true">|</span>
                                    <button type="button" onClick={() => setView("statements")}>Statements &amp; 1098</button>
                                  </div>
                                </div>
                                <div className="wfop-acct-bal-wrap">
                                  <div className="wfop-acct-bal">
                                    <strong>{fmtMoney(a.balance, hideBalances)}</strong>
                                    <span>Principal balance</span>
                                    {a.monthlyPayment && (
                                      <small className="wfop-due-note">
                                        Payment {fmtMoney(a.monthlyPayment, hideBalances)}{a.nextPaymentDate ? ` due ${a.nextPaymentDate}` : ""}
                                      </small>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="wfop-group-total">
                            <span>Total Loan Balances</span>
                            <strong>{fmtMoney(groups.loanTotal, hideBalances)}</strong>
                          </div>
                        </>
                      )}
                    </section>
                  )}

                  {/* INVESTMENTS & TRUSTS */}
                  {groups.invest.length > 0 && (
                    <section className="wfop-group-card accent-slate" aria-label="Investments and Trusts">
                      <button
                        type="button"
                        className="wfop-group-head"
                        aria-expanded={!collapsed.invest}
                        onClick={() => setCollapsed((p) => ({ ...p, invest: !p.invest }))}
                      >
                        <span className="wfop-group-label">Investments &amp; Trusts</span>
                        <span className="wfop-group-right">
                          {collapsed.invest && <strong>{fmtMoney(groups.investTotal, hideBalances)}</strong>}
                          <ChevronDown size={18} className={collapsed.invest ? "closed" : ""} />
                        </span>
                      </button>

                      {!collapsed.invest && (
                        <>
                          <div className="wfop-acct-rows">
                            {groups.invest.map((a) => (
                              <div key={a.accountKey} className="wfop-acct-row">
                                <div className="wfop-acct-info">
                                  <button type="button" className="wfop-acct-link" onClick={() => openAccount(a)}>
                                    {(a.nickname || a.name).toUpperCase()}
                                  </button>
                                  <span className="wfop-acct-meta">
                                    {a.maskedNumber} • {a.productLine} • <strong className="pos">{a.rateOrApr}</strong>
                                  </span>
                                  <div className="wfop-row-shortcuts">
                                    <button type="button" onClick={() => setView("brokerage")}>View holdings</button>
                                    <span aria-hidden="true">|</span>
                                    <button type="button" onClick={() => setView("transfer")}>Transfer cash</button>
                                    <span aria-hidden="true">|</span>
                                    <button type="button" onClick={() => setView("statements")}>Tax documents</button>
                                  </div>
                                </div>
                                <div className="wfop-acct-bal-wrap">
                                  <div className="wfop-acct-bal">
                                    <strong>{fmtMoney(a.balance, hideBalances)}</strong>
                                    <span>Total market value</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="wfop-group-total">
                            <span>Total Investments &amp; Trusts</span>
                            <strong>{fmtMoney(groups.investTotal, hideBalances)}</strong>
                          </div>
                        </>
                      )}
                    </section>
                  )}

                  {/* OPEN AN ACCOUNT STRIP (exact Wells Fargo Online® tile tray) */}
                  <section className="wfop-card wfop-explore-strip" aria-label="Open an account">
                    <div className="wfop-explore-head">
                      <h2>Open an account</h2>
                      <Link href="/help/rates">Check today&apos;s rates <ChevronRight size={15} /></Link>
                    </div>
                    <div className="wfop-explore-tiles">
                      <Link href="/checking/compare"><img src="/images/icon-checking.png" alt="" width="22" height="22" /><span>Checking</span></Link>
                      <Link href="/savings-cds"><img src="/images/icon-home.png" alt="" width="22" height="22" /><span>Savings &amp; CDs</span></Link>
                      <Link href="/credit-cards"><img src="/images/icon-card.png" alt="" width="22" height="22" /><span>Credit Cards</span></Link>
                      <Link href="/mortgage"><img src="/images/icon-home.png" alt="" width="22" height="22" /><span>Home Loans</span></Link>
                      <Link href="/personal-loans"><img src="/images/icon-card.png" alt="" width="22" height="22" /><span>Personal Loans</span></Link>
                      <Link href="/investing-wealth"><img src="/images/icon-card.png" alt="" width="22" height="22" /><span>Investing</span></Link>
                    </div>
                  </section>
                </div>

                {/* RIGHT COMPANION RAIL — REAL WELLS FARGO ONLINE® WIDGETS */}
                <aside className="wfop-rail" aria-label="Insights, rewards and tools">
                  {/* Widget 1: Ask Fargo® */}
                  <section className="wfop-rail-card wfop-fargo-widget">
                    <div className="wfop-fargo-head">
                      <span className="wfop-fargo-orb"><img src="/images/fargo-mark.png" alt="Fargo®" width="22" height="22" /></span>
                      <div>
                        <strong>Ask Fargo<sup>®</sup></strong>
                        <small>Your virtual banking assistant</small>
                      </div>
                    </div>
                    <form
                      className="wfop-fargo-input"
                      onSubmit={(e: FormEvent) => {
                        e.preventDefault();
                        if (fargoPrompt.trim()) askFargo(fargoPrompt);
                      }}
                    >
                      <input
                        value={fargoPrompt}
                        onChange={(e) => setFargoPrompt(e.target.value)}
                        placeholder="Ask about spending, bills, routing #…"
                        aria-label="Ask Fargo a question"
                      />
                      <button type="submit" aria-label="Ask Fargo"><ArrowRight size={16} /></button>
                    </form>
                    <div className="wfop-fargo-chips">
                      {["Spending summary", "Upcoming bills", "Routing number", "My rewards"].map((chip) => (
                        <button key={chip} type="button" onClick={() => askFargo(chip)}>{chip}</button>
                      ))}
                    </div>
                    {fargoAnswer && <p className="wfop-fargo-reply">{fargoAnswer}</p>}
                    <button
                      type="button"
                      className="wfop-rail-cta"
                      onClick={() => {
                        setPlanSub("fargo");
                        setView("plan");
                      }}
                    >
                      View Fargo® Spending Insights <ChevronRight size={15} />
                    </button>
                  </section>

                  {/* Widget 2: Wells Fargo Rewards® */}
                  <section className="wfop-rail-card">
                    <div className="wfop-rail-title">
                      <h3>Wells Fargo Rewards<sup>®</sup></h3>
                      <Gift size={18} />
                    </div>
                    <div className="wfop-rewards-big">
                      <strong>{hideBalances ? "•••••" : `${groups.rewards.toLocaleString()} pts`}</strong>
                      <span>{fmtMoney(groups.rewards / 100, hideBalances)} cash redemption value</span>
                    </div>
                    <button type="button" className="wfop-rail-cta" onClick={() => setView("cards")}>
                      Redeem or manage rewards <ChevronRight size={15} />
                    </button>
                  </section>

                  {/* Widget 3: Credit Close-Up® FICO® Score */}
                  <section className="wfop-rail-card">
                    <div className="wfop-rail-title">
                      <h3>Your FICO<sup>®</sup> Credit Score</h3>
                      <span className="wfop-pill wfop-pill-ok">+6 pts</span>
                    </div>
                    <FicoGauge score={ficoScore} />
                    <small className="wfop-fico-foot">FICO® Score 9 based on Experian® data</small>
                    <button
                      type="button"
                      className="wfop-rail-cta"
                      onClick={() => {
                        setPlanSub("fico");
                        setView("plan");
                      }}
                    >
                      Open Credit Close-Up® <ChevronRight size={15} />
                    </button>
                  </section>

                  {/* Widget 4: Upcoming Bills */}
                  {unpaidBills.length > 0 && (
                    <section className="wfop-rail-card">
                      <div className="wfop-rail-title">
                        <h3>Upcoming Bills</h3>
                        <CalendarDays size={17} />
                      </div>
                      <div className="wfop-rail-list">
                        {unpaidBills.slice(0, 3).map((b) => (
                          <div key={b.id} className="wfop-rail-row">
                            <div>
                              <strong>{b.payeeName}</strong>
                              <small>Due {b.dueDate}{b.autoPay ? " • AutoPay" : ""}</small>
                            </div>
                            <span>{fmtMoney(b.amountDue, hideBalances)}</span>
                          </div>
                        ))}
                      </div>
                      <button type="button" className="wfop-rail-cta" onClick={() => setView("bills")}>
                        Go to Bill Pay ({unpaidBills.length}) <ChevronRight size={15} />
                      </button>
                    </section>
                  )}

                  {/* Widget 5: My Wells Fargo Deals® */}
                  <section className="wfop-rail-card">
                    <div className="wfop-rail-title">
                      <h3>My Wells Fargo Deals<sup>®</sup></h3>
                      <span className="wfop-sub">{Object.values(activatedDeals).filter(Boolean).length} active</span>
                    </div>
                    <div className="wfop-rail-deals">
                      {WF_DEALS.slice(0, 3).map((d) => {
                        const on = Boolean(activatedDeals[d.id]);
                        return (
                          <div key={d.id} className="wfop-rail-deal">
                            <span className="wfop-deal-dot"><img src={d.logo} alt={`${d.merchant} logo`} width={32} height={32} loading="lazy" /></span>
                            <div>
                              <strong>{d.merchant}</strong>
                              <small>{d.offer}</small>
                            </div>
                            <button
                              type="button"
                              className={on ? "on" : ""}
                              onClick={() => toggleDeal(d.id, d.merchant)}
                            >
                              {on ? "Active ✓" : "+ Add"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className="wfop-rail-cta"
                      onClick={() => {
                        setPlanSub("deals");
                        setView("plan");
                      }}
                    >
                      See all {WF_DEALS.length} deals <ChevronRight size={15} />
                    </button>
                  </section>
                </aside>
              </div>
            </>
          ) : view === "activity" ? (
            <AccountActivityView
              profile={profile}
              selectedAccountId={selectedAccountId}
              onSelectAccount={setSelectedAccountId}
              onNavigate={setView}
              post={post}
              notify={notify}
              busy={busy}
              hideBalances={hideBalances}
            />
          ) : view === "transfer" ? (
            <TransferView profile={profile} post={post} busy={busy} onNavigate={setView} hideBalances={hideBalances} />
          ) : view === "zelle" ? (
            <ZelleView profile={profile} post={post} busy={busy} hideBalances={hideBalances} />
          ) : view === "bills" ? (
            <BillPayView profile={profile} post={post} busy={busy} hideBalances={hideBalances} />
          ) : view === "deposit" ? (
            <CheckDepositView profile={profile} post={post} busy={busy} hideBalances={hideBalances} />
          ) : view === "scheduled" ? (
            <ScheduledView profile={profile} notify={notify} />
          ) : view === "brokerage" ? (
            <BrokerageView profile={profile} onNavigate={setView} hideBalances={hideBalances} />
          ) : view === "cards" ? (
            <CardsControlTowerView profile={profile} post={post} busy={busy} hideBalances={hideBalances} />
          ) : view === "statements" ? (
            <StatementsDocsView profile={profile} post={post} notify={notify} />
          ) : view === "plan" ? (
            <PlanLearnView
              profile={profile}
              initialSub={planSub}
              activatedDeals={activatedDeals}
              onToggleDeal={toggleDeal}
              onNavigate={setView}
              hideBalances={hideBalances}
            />
          ) : (
            <SecurityAlertsView profile={profile} post={post} busy={busy} />
          )}
        </div>
      </main>

      {/* 4. AUTHENTIC WELLS FARGO ONLINE® AUTHENTICATED FOOTER */}
      <footer className="wfop-footer">
        <div className="wfop-container">
          <div className="wfop-footer-grid">
            <div className="wfop-footer-col">
              <h4>Online Banking</h4>
              <ul>
                <li><button type="button" onClick={() => setView("summary")}>Account Summary</button></li>
                <li><button type="button" onClick={() => setView("activity")}>Account Activity</button></li>
                <li><button type="button" onClick={() => setView("statements")}>Statements &amp; Documents</button></li>
                <li><button type="button" onClick={() => setView("scheduled")}>Scheduled Transfers</button></li>
                <li><Link href="/online-banking/messages">Secure Message Center</Link></li>
              </ul>
            </div>
            <div className="wfop-footer-col">
              <h4>Transfer &amp; Pay</h4>
              <ul>
                <li><button type="button" onClick={() => setView("transfer")}>Transfer Money</button></li>
                <li><button type="button" onClick={() => setView("zelle")}>Send Money with Zelle®</button></li>
                <li><button type="button" onClick={() => setView("bills")}>Pay Bills</button></li>
                <li><button type="button" onClick={() => setView("deposit")}>Deposit Checks</button></li>
                <li><Link href="/mobile-app">Wells Fargo Mobile® App</Link></li>
              </ul>
            </div>
            <div className="wfop-footer-col">
              <h4>Support &amp; Services</h4>
              <ul>
                <li><Link href="/help">Customer Service</Link></li>
                <li><Link href="/help/routing-number">Routing &amp; Account Numbers</Link></li>
                <li><Link href="/locations">ATMs/Locations</Link></li>
                <li><Link href="/appointments">Make an Appointment</Link></li>
                <li><Link href="/privacy-security/fraud/report">Report Fraud</Link></li>
                <li><Link href="/online-banking/security">Security Center</Link></li>
                <li><Link href="/online-banking/cards">Manage Cards</Link></li>
                <li><Link href="/help/rates">Interest Rates Today</Link></li>
              </ul>
            </div>
            <div className="wfop-footer-col">
              <h4>Legal &amp; About</h4>
              <ul>
                <li><Link href="/privacy-security">Privacy, Cookies, Security &amp; Legal</Link></li>
                <li><Link href="/online-banking/online-access-agreement">Online Access Agreement</Link></li>
                <li><Link href="/privacy-security/terms">General Terms of Use</Link></li>
                <li><Link href="/about">About Wells Fargo</Link></li>
                <li><Link href="/sitemap">Sitemap</Link></li>
                <li><Link href="/admin/login">Super Admin Console</Link></li>
              </ul>
            </div>
            <div className="wfop-footer-col wfop-footer-social">
              <h4>Connect with us</h4>
              <div className="wfop-social-row">
                <a href="https://www.facebook.com/wellsfargo" target="_blank" rel="noreferrer" aria-label="Facebook"><img src="/images/social-facebook.png" alt="Facebook" width="20" height="20" /></a>
                <a href="https://www.linkedin.com/company/wellsfargo" target="_blank" rel="noreferrer" aria-label="LinkedIn"><img src="/images/social-linkedin.png" alt="LinkedIn" width="20" height="20" /></a>
                <a href="https://www.instagram.com/wellsfargo" target="_blank" rel="noreferrer" aria-label="Instagram"><img src="/images/social-instagram.png" alt="Instagram" width="20" height="20" /></a>
                <a href="https://www.youtube.com/user/wellsfargo" target="_blank" rel="noreferrer" aria-label="YouTube"><img src="/images/social-youtube.png" alt="YouTube" width="20" height="20" /></a>
                <a href="https://twitter.com/wellsfargo" target="_blank" rel="noreferrer" aria-label="X (Twitter)"><img src="/images/social-x.png" alt="X (Twitter)" width="18" height="18" /></a>
              </div>
              <p className="wfop-social-note">For support 7 days a week, message us @WellsFargo</p>
            </div>
          </div>

          <div className="wfop-footer-legal-grid">
            <div className="wfop-footer-box">
              <strong>Investment and Insurance Products are:</strong>
              <ul>
                <li>Not Insured by the FDIC or Any Federal Government Agency</li>
                <li>Not a Deposit or Other Obligation of, or Guaranteed by, the Bank or Any Bank Affiliate</li>
                <li>Subject to Investment Risks, Including Possible Loss of the Principal Amount Invested</li>
              </ul>
            </div>
            <div className="wfop-footer-box">
              <p>
                Deposit products offered by <strong>Wells Fargo Bank, N.A. Member FDIC.</strong>
              </p>
              <p>
                <strong>Equal Housing Lender</strong>. NMLSR ID 399801.
              </p>
              <p>
                Investment products and services are offered through Wells Fargo Advisors. Wells Fargo Advisors is a trade
                name used by Wells Fargo Clearing Services, LLC (WFCS) and Wells Fargo Advisors Financial Network, LLC,
                Members SIPC.
              </p>
            </div>
          </div>

          <div className="wfop-footer-base">
            <p>© 1999 – {new Date().getFullYear()} Wells Fargo. All rights reserved. NMLSR ID 399801</p>
            <p className="wfop-demo-note">Interactive Wells Fargo Online® demo environment — sample data only.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
