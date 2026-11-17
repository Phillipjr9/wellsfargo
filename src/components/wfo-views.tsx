"use client";

import { PaymentFlowModal, usePaymentFlow } from "@/components/wfo-payment-flow";
import { customerFetch } from "@/lib/client-auth";
import {
  CASH_TYPES,
  CREDIT_TYPES,
  INVEST_TYPES,
  LOAN_TYPES,
  WF_DEALS,
  fmtMoney,
  fullAccountNumber,
  routingForBranch,
  type AccountRow,
  type PortalView,
  type PostAction,
  type Profile,
} from "@/components/wfo-types";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FileText,
  Gift,
  Lock,
  Plus,
  Receipt,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Unlock,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

/* ==================== 1. ACCOUNT ACTIVITY & DETAIL ==================== */

export function AccountActivityView({
  profile,
  selectedAccountId,
  onSelectAccount,
  onNavigate,
  post,
  notify,
  busy,
  hideBalances,
}: {
  profile: Profile;
  selectedAccountId: number | null;
  onSelectAccount: (id: number | null) => void;
  onNavigate: (v: PortalView) => void;
  post: PostAction;
  notify: (m: string) => void;
  busy: boolean;
  hideBalances: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [txType, setTxType] = useState<"all" | "debits" | "credits" | "flagged">("all");
  const [showNumbers, setShowNumbers] = useState(false);
  const [editingNick, setEditingNick] = useState(false);
  const [nickDraft, setNickDraft] = useState("");
  const [expandedTx, setExpandedTx] = useState<number | null>(null);
  const [disputeReason, setDisputeReason] = useState("Unrecognized merchant or amount");

  const activeAcct = profile.accounts.find((a) => a.id === selectedAccountId) ?? null;
  const acctMap = useMemo(() => new Map(profile.accounts.map((a) => [a.id, a])), [profile.accounts]);
  const aba = routingForBranch(profile.customer.homeBranchCode);

  const categories = useMemo(() => {
    const s = new Set(profile.transactions.map((t) => t.category));
    return ["All", ...[...s].sort()];
  }, [profile.transactions]);

  const filtered = useMemo(() => {
    return profile.transactions.filter((t) => {
      if (activeAcct && t.accountId !== activeAcct.id) return false;
      if (category !== "All" && t.category !== category) return false;
      const amt = Number(t.amount);
      if (txType === "debits" && amt >= 0) return false;
      if (txType === "credits" && amt <= 0) return false;
      if (txType === "flagged" && !t.flagged && t.status !== "Disputed") return false;
      if (query.trim()) {
        const hay = `${t.description} ${t.category} ${t.postedDate} ${t.status}`.toLowerCase();
        if (!hay.includes(query.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [profile.transactions, activeAcct, category, txType, query]);

  function copyText(label: string, val: string) {
    navigator.clipboard?.writeText(val).catch(() => {});
    notify(`${label} copied to clipboard.`);
  }

  function exportCsv() {
    const lines = [
      "Date,Account,Description,Category,Status,Amount",
      ...filtered.map((t) => {
        const a = acctMap.get(t.accountId);
        const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
        return [
          esc(t.postedDate),
          esc(`${a?.name ?? "Account"} ${a?.maskedNumber ?? ""}`),
          esc(t.description),
          esc(t.category),
          esc(t.status),
          Number(t.amount).toFixed(2),
        ].join(",");
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wellsfargo-activity-${activeAcct?.accountKey ?? "all"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(`Exported ${filtered.length} transactions to CSV.`);
  }

  const isCredit = activeAcct ? CREDIT_TYPES.includes(activeAcct.accountType) : false;
  const isLoan = activeAcct ? LOAN_TYPES.includes(activeAcct.accountType) : false;

  return (
    <div className="wfop-stack">
      <div className="wfop-crumb-row">
        <button type="button" className="wfop-back-btn" onClick={() => onNavigate("summary")}>
          <ArrowLeft size={16} /> Back to Account Summary
        </button>
        <div className="wfop-acct-switcher">
          <label htmlFor="wfop-acct-pick">Account:</label>
          <select
            id="wfop-acct-pick"
            value={selectedAccountId ?? "all"}
            onChange={(e) => {
              setShowNumbers(false);
              setEditingNick(false);
              onSelectAccount(e.target.value === "all" ? null : Number(e.target.value));
            }}
          >
            <option value="all">All Linked Accounts ({profile.accounts.length})</option>
            {profile.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {(a.nickname || a.name).toUpperCase()} {a.maskedNumber} — {fmtMoney(a.balance, hideBalances)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeAcct && (
        <section className="wfop-card wfop-detail-banner">
          <div className="wfop-detail-top">
            <div>
              <span className="wfop-kicker">{activeAcct.productLine} • Status: {activeAcct.status}</span>
              {editingNick ? (
                <form
                  className="wfop-inline-edit"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await post({ action: "nickname", accountId: activeAcct.id, nickname: nickDraft }, "Account nickname updated.");
                    setEditingNick(false);
                  }}
                >
                  <input value={nickDraft} onChange={(e) => setNickDraft(e.target.value)} placeholder={activeAcct.name} aria-label="Account nickname" />
                  <button type="submit" className="wfop-btn wfop-btn-red wfop-btn-sm" disabled={busy}>Save</button>
                  <button type="button" className="wfop-btn wfop-btn-ghost wfop-btn-sm" onClick={() => setEditingNick(false)}>Cancel</button>
                </form>
              ) : (
                <h1 className="wfop-detail-title">
                  {activeAcct.nickname || activeAcct.name} <span>{activeAcct.maskedNumber}</span>
                  <button
                    type="button"
                    className="wfop-link-btn"
                    onClick={() => {
                      setNickDraft(activeAcct.nickname ?? activeAcct.name);
                      setEditingNick(true);
                    }}
                  >
                    Edit nickname
                  </button>
                </h1>
              )}
            </div>
            <div className="wfop-detail-bal">
              <strong>{fmtMoney(isCredit || isLoan ? activeAcct.balance : activeAcct.availableBalance, hideBalances)}</strong>
              <span>{isCredit ? "Current balance" : isLoan ? "Principal balance" : "Available balance"}</span>
            </div>
          </div>

          <div className="wfop-detail-metrics">
            <div>
              <span>{isCredit ? "Available credit" : "Posted balance"}</span>
              <strong>{fmtMoney(isCredit ? activeAcct.availableBalance : activeAcct.balance, hideBalances)}</strong>
            </div>
            {activeAcct.creditLimit && (
              <div>
                <span>Total credit line</span>
                <strong>{fmtMoney(activeAcct.creditLimit, hideBalances)}</strong>
              </div>
            )}
            {activeAcct.monthlyPayment && (
              <div>
                <span>{isCredit ? "Minimum due" : "Monthly payment"}</span>
                <strong>
                  {fmtMoney(activeAcct.monthlyPayment, hideBalances)}
                  {activeAcct.nextPaymentDate ? ` (${activeAcct.nextPaymentDate})` : ""}
                </strong>
              </div>
            )}
            <div>
              <span>Interest / Rate</span>
              <strong>{activeAcct.rateOrApr}</strong>
            </div>
            <div>
              <span>Account &amp; routing numbers</span>
              <button type="button" className="wfop-link-btn" onClick={() => setShowNumbers(!showNumbers)}>
                {showNumbers ? <><EyeOff size={14} /> Hide numbers</> : <><Eye size={14} /> View numbers</>}
              </button>
            </div>
          </div>

          {showNumbers && (
            <div className="wfop-routing-drawer">
              <div>
                <span>Full Account Number</span>
                <strong>{fullAccountNumber(activeAcct)}</strong>
                <button type="button" onClick={() => copyText("Account number", fullAccountNumber(activeAcct))}>
                  <Copy size={13} /> Copy
                </button>
              </div>
              <div>
                <span>Direct Deposit &amp; ACH Routing (ABA)</span>
                <strong>{aba}</strong>
                <button type="button" onClick={() => copyText("ACH routing number", aba)}>
                  <Copy size={13} /> Copy
                </button>
              </div>
              <div>
                <span>Domestic Wire Routing</span>
                <strong>121000248</strong>
                <button type="button" onClick={() => copyText("Wire routing number", "121000248")}>
                  <Copy size={13} /> Copy
                </button>
              </div>
              <div>
                <span>Opened Date</span>
                <strong>{activeAcct.openedOn}</strong>
              </div>
            </div>
          )}

          <div className="wfop-detail-actions">
            <button type="button" className="wfop-btn wfop-btn-red wfop-btn-sm" onClick={() => onNavigate("transfer")}>
              <ArrowLeftRight size={15} /> {isCredit || isLoan ? "Make Payment" : "Transfer Money"}
            </button>
            {CASH_TYPES.includes(activeAcct.accountType) && (
              <button type="button" className="wfop-btn wfop-btn-outline wfop-btn-sm" onClick={() => onNavigate("deposit")}>
                <Camera size={15} /> Deposit Check
              </button>
            )}
            <button type="button" className="wfop-btn wfop-btn-outline wfop-btn-sm" onClick={() => onNavigate("bills")}>
              <Receipt size={15} /> Pay Bills
            </button>
            <button type="button" className="wfop-btn wfop-btn-outline wfop-btn-sm" onClick={() => onNavigate("statements")}>
              <FileText size={15} /> Statements ({activeAcct.statements.length})
            </button>
            <button type="button" className="wfop-btn wfop-btn-outline wfop-btn-sm" onClick={exportCsv}>
              <Download size={15} /> Download CSV
            </button>
          </div>
        </section>
      )}

      <section className="wfop-card">
        <div className="wfop-card-head">
          <div>
            <h2>Transactions &amp; Posted Activity</h2>
            <p className="wfop-sub">{filtered.length} transactions shown • Click any row for receipt details or to dispute</p>
          </div>
          {!activeAcct && (
            <button type="button" className="wfop-btn wfop-btn-outline wfop-btn-sm" onClick={exportCsv}>
              <Download size={15} /> Download CSV
            </button>
          )}
        </div>

        <div className="wfop-filter-row">
          <div className="wfop-search-box">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search merchant, keyword, or date…"
              aria-label="Search transactions"
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter category">
            {categories.map((c) => (
              <option key={c} value={c}>{c === "All" ? "All categories" : c}</option>
            ))}
          </select>
          <select value={txType} onChange={(e) => setTxType(e.target.value as typeof txType)} aria-label="Filter transaction type">
            <option value="all">All transactions</option>
            <option value="credits">Deposits &amp; credits</option>
            <option value="debits">Withdrawals &amp; debits</option>
            <option value="flagged">Disputed / flagged</option>
          </select>
        </div>

        <div className="wfop-table-wrap">
          <table className="wfop-ledger">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                {!activeAcct && <th>Account</th>}
                <th>Category</th>
                <th>Status</th>
                <th className="num">Amount</th>
                {activeAcct && <th className="num">Balance</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 75).map((tx) => {
                const acct = acctMap.get(tx.accountId);
                const amt = Number(tx.amount);
                const isOpen = expandedTx === tx.id;
                const colSpan = activeAcct ? 6 : 6;
                return (
                  <tr key={tx.id} className={tx.flagged ? "wfop-row-flagged" : isOpen ? "wfop-row-open" : ""}>
                    <td className="nowrap">{tx.postedDate}</td>
                    <td>
                      <button
                        type="button"
                        className="wfop-tx-title"
                        onClick={() => setExpandedTx(isOpen ? null : tx.id)}
                        aria-expanded={isOpen}
                      >
                        {tx.description}
                        {tx.flagged && <span className="wfop-pill wfop-pill-red">Disputed</span>}
                      </button>
                      {isOpen && (
                        <div className="wfop-tx-drawer" data-colspan={colSpan}>
                          <span>Ref #WF-{100000 + tx.id} • {acct?.name} {acct?.maskedNumber}</span>
                          {!tx.flagged && amt < 0 ? (
                            <div className="wfop-dispute-bar">
                              <input
                                value={disputeReason}
                                onChange={(e) => setDisputeReason(e.target.value)}
                                aria-label="Dispute reason"
                              />
                              <button
                                type="button"
                                className="wfop-btn wfop-btn-outline wfop-btn-sm"
                                disabled={busy}
                                onClick={async () => {
                                  await post(
                                    { action: "disputeTx", txId: tx.id, reason: disputeReason },
                                    "Dispute filed and escalated to Fraud Operations.",
                                  );
                                  setExpandedTx(null);
                                }}
                              >
                                <AlertTriangle size={14} /> Dispute transaction
                              </button>
                            </div>
                          ) : tx.flagged ? (
                            <em className="wfop-dispute-note">Under active review by Wells Fargo Fraud Specialists.</em>
                          ) : null}
                        </div>
                      )}
                    </td>
                    {!activeAcct && (
                      <td className="nowrap muted">
                        {acct?.nickname || acct?.name} {acct?.maskedNumber}
                      </td>
                    )}
                    <td><span className="wfop-cat-tag">{tx.category}</span></td>
                    <td>
                      <span className={`wfop-pill ${tx.status === "Pending" || tx.status === "Scheduled" ? "wfop-pill-gold" : tx.flagged ? "wfop-pill-red" : "wfop-pill-ok"}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className={`num amt ${amt > 0 ? "pos" : ""}`}>
                      {amt > 0 ? `+${fmtMoney(amt, hideBalances)}` : fmtMoney(amt, hideBalances)}
                    </td>
                    {activeAcct && (
                      <td className="num muted">
                        {tx.runningBalance ? fmtMoney(tx.runningBalance, hideBalances) : "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="wfop-empty">No transactions match your search criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ==================== 2. TRANSFER MONEY ==================== */

export function TransferView({
  profile,
  post,
  busy,
  onNavigate,
  hideBalances,
}: {
  profile: Profile;
  post: PostAction;
  busy: boolean;
  onNavigate: (v: PortalView) => void;
  hideBalances: boolean;
}) {
  const flowCtl = usePaymentFlow();
  const sources = profile.accounts.filter((a) => CASH_TYPES.includes(a.accountType) && a.status === "Open");
  const [from, setFrom] = useState(sources[0]?.accountKey ?? "");
  const [to, setTo] = useState(
    profile.accounts.find((a) => a.accountKey !== sources[0]?.accountKey)?.accountKey ?? "",
  );
  const [amount, setAmount] = useState("250.00");
  const [memo, setMemo] = useState("");

  const fromAcct = profile.accounts.find((a) => a.accountKey === from);
  const toAcct = profile.accounts.find((a) => a.accountKey === to);
  const isLoanPay = toAcct ? LOAN_TYPES.includes(toAcct.accountType) : false;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const fromLabel = `${fromAcct?.nickname || fromAcct?.name || "Account"} ${fromAcct?.maskedNumber ?? ""}`;
    const toLabel = `${toAcct?.nickname || toAcct?.name || "Account"} ${toAcct?.maskedNumber ?? ""}`;
    const ok = await flowCtl.run(
      {
        kind: "transfer",
        title: isLoanPay ? "Payment sent" : "Transfer sent",
        amount: fmtMoney(amount, hideBalances),
        fromLabel,
        toLabel,
      },
      () =>
        post(
          {
            action: isLoanPay ? "loanpay" : "transfer",
            fromAccount: from,
            toAccount: to,
            amount: Number(amount),
            memo,
          },
          `${isLoanPay ? "Payment" : "Transfer"} of ${fmtMoney(amount)} completed.`,
        ),
    );
    if (ok) setMemo("");
  }

  return (
    <div className="wfop-two-col">
      <section className="wfop-card">
        <div className="wfop-card-head">
          <div>
            <h2>Transfer Money &amp; Make Payments</h2>
            <p className="wfop-sub">Instant, $0-fee transfers between your Wells Fargo checking, savings, credit card, and loan accounts.</p>
          </div>
        </div>
        <div className="wfop-subnav-pills">
          <button type="button" className="active">Between My Accounts</button>
          <button type="button" onClick={() => onNavigate("zelle")}>Send with Zelle®</button>
          <button type="button" onClick={() => onNavigate("bills")}>Bill Pay</button>
          <button type="button" onClick={() => onNavigate("deposit")}>Deposit Check</button>
          <button type="button" onClick={() => onNavigate("scheduled")}>Recurring</button>
        </div>

        <form className="wfop-form" onSubmit={submit}>
          <label className="wfop-field">
            <span>From account</span>
            <select value={from} onChange={(e) => setFrom(e.target.value)}>
              {sources.map((a) => (
                <option key={a.accountKey} value={a.accountKey}>
                  {a.nickname || a.name} {a.maskedNumber} — Available {fmtMoney(a.availableBalance, hideBalances)}
                </option>
              ))}
            </select>
          </label>
          <label className="wfop-field">
            <span>To account</span>
            <select value={to} onChange={(e) => setTo(e.target.value)}>
              {profile.accounts
                .filter((a) => a.accountKey !== from)
                .map((a) => (
                  <option key={a.accountKey} value={a.accountKey}>
                    {a.nickname || a.name} {a.maskedNumber} ({a.accountType} — {fmtMoney(a.balance, hideBalances)})
                  </option>
                ))}
            </select>
          </label>
          <div className="wfop-field-row">
            <label className="wfop-field">
              <span>Amount (USD)</span>
              <input type="number" min="0.01" max="100000" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label className="wfop-field">
              <span>Memo (optional)</span>
              <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="e.g., Monthly savings" />
            </label>
          </div>
          <div className="wfop-quick-amts">
            {["50.00", "100.00", "250.00", "500.00", "1000.00"].map((preset) => (
              <button key={preset} type="button" onClick={() => setAmount(preset)}>${preset}</button>
            ))}
            {toAcct?.monthlyPayment && (
              <button type="button" onClick={() => setAmount(Number(toAcct.monthlyPayment).toFixed(2))}>
                Amount due ({fmtMoney(toAcct.monthlyPayment)})
              </button>
            )}
          </div>
          <button type="submit" className="wfop-btn wfop-btn-red" disabled={busy || sources.length === 0}>
            {busy ? "Processing…" : `Submit ${fmtMoney(amount)} ${isLoanPay ? "Payment" : "Transfer"}`}
          </button>
        </form>
      </section>

      <aside className="wfop-card wfop-card-tinted">
        <h3>Recent Transfers &amp; Payments</h3>
        <div className="wfop-mini-list">
          {profile.transactions
            .filter((t) => ["Transfer", "Payment", "Loan Payment", "Zelle", "Bill Pay"].includes(t.category))
            .slice(0, 6)
            .map((t) => (
              <div key={t.id} className="wfop-mini-row">
                <div>
                  <strong>{t.description}</strong>
                  <small>{t.postedDate} • {t.status}</small>
                </div>
                <strong className={Number(t.amount) > 0 ? "pos" : ""}>{fmtMoney(t.amount, hideBalances)}</strong>
              </div>
            ))}
        </div>
      </aside>
      <PaymentFlowModal state={flowCtl.flow} onClose={flowCtl.close} />
    </div>
  );
}

/* ==================== 3. ZELLE® ==================== */

export function ZelleView({
  profile,
  post,
  busy,
  hideBalances,
}: {
  profile: Profile;
  post: PostAction;
  busy: boolean;
  hideBalances: boolean;
}) {
  const flowCtl = usePaymentFlow();
  const sources = profile.accounts.filter((a) => CASH_TYPES.includes(a.accountType) && a.status === "Open");
  const [from, setFrom] = useState(sources[0]?.accountKey ?? "");
  const [selectedRec, setSelectedRec] = useState(profile.recipients[0]?.recipientName ?? "");
  const [amount, setAmount] = useState("75.00");
  const [memo, setMemo] = useState("");
  const [newName, setNewName] = useState("");
  const [newHandle, setNewHandle] = useState("");

  async function sendZelle(e: FormEvent) {
    e.preventDefault();
    const fromAcct = profile.accounts.find((a) => a.accountKey === from);
    const rec = profile.recipients.find((r) => r.recipientName === selectedRec);
    const ok = await flowCtl.run(
      {
        kind: "zelle",
        title: "Money sent",
        amount: fmtMoney(amount, hideBalances),
        fromLabel: `${fromAcct?.nickname || fromAcct?.name || "Account"} ${fromAcct?.maskedNumber ?? ""}`,
        toLabel: rec ? `${rec.recipientName} • ${rec.handle}` : selectedRec,
        recipientInitials: selectedRec.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase(),
      },
      () =>
        post(
          { action: "zelle", fromAccount: from, recipient: selectedRec, amount: Number(amount), memo },
          `Sent ${fmtMoney(amount)} to ${selectedRec} with Zelle®. `,
        ),
    );
    if (ok) setMemo("");
  }

  async function addContact(e: FormEvent) {
    e.preventDefault();
    const handleType = newHandle.includes("@") ? "Email" : "Mobile";
    const ok = await post(
      { action: "addRecipient", recipientName: newName, handle: newHandle, handleType, favorite: true },
      `Added ${newName} to your Zelle® recipients.`,
    );
    if (ok) {
      setSelectedRec(newName);
      setNewName("");
      setNewHandle("");
    }
  }

  return (
    <div className="wfop-two-col">
      <section className="wfop-card">
        <div className="wfop-zelle-banner">
          <span className="wfop-zelle-mark">Zelle<sup>®</sup></span>
          <div>
            <h2>Send Money with Zelle®</h2>
            <p>Fast, $0-fee transfers to friends, family, and people you know and trust — typically arrives in minutes.</p>
          </div>
        </div>

        <div className="wfop-contact-strip">
          {profile.recipients.map((r) => {
            const initials = r.recipientName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
            return (
              <button
                key={r.id}
                type="button"
                className={selectedRec === r.recipientName ? "wfop-contact active" : "wfop-contact"}
                onClick={() => setSelectedRec(r.recipientName)}
              >
                <span className="wfop-contact-avatar">{initials}</span>
                <strong>{r.recipientName}</strong>
                <small>{r.handle}</small>
              </button>
            );
          })}
        </div>

        <form className="wfop-form" onSubmit={sendZelle}>
          <div className="wfop-field-row">
            <label className="wfop-field">
              <span>Recipient</span>
              <input required value={selectedRec} onChange={(e) => setSelectedRec(e.target.value)} placeholder="Select or type recipient" />
            </label>
            <label className="wfop-field">
              <span>From account</span>
              <select value={from} onChange={(e) => setFrom(e.target.value)}>
                {sources.map((a) => (
                  <option key={a.accountKey} value={a.accountKey}>
                    {a.nickname || a.name} {a.maskedNumber} ({fmtMoney(a.availableBalance, hideBalances)})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="wfop-field-row">
            <label className="wfop-field">
              <span>Amount (USD)</span>
              <input type="number" min="1" max="3500" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label className="wfop-field">
              <span>What&apos;s this for? (optional)</span>
              <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Dinner, utilities, gift…" />
            </label>
          </div>
          <button type="submit" className="wfop-btn wfop-btn-zelle" disabled={busy || !selectedRec}>
            <Send size={15} /> Send {fmtMoney(amount)} with Zelle®
          </button>
        </form>
      </section>

      <aside className="wfop-card wfop-card-tinted">
        <h3><Plus size={16} /> Add a Zelle® Recipient</h3>
        <form className="wfop-form" onSubmit={addContact}>
          <label className="wfop-field">
            <span>Full name</span>
            <input required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Elena Brooks" />
          </label>
          <label className="wfop-field">
            <span>U.S. mobile number or email</span>
            <input required value={newHandle} onChange={(e) => setNewHandle(e.target.value)} placeholder="(415) 555-0130 or email" />
          </label>
          <button type="submit" className="wfop-btn wfop-btn-outline" disabled={busy}>Save Recipient</button>
        </form>
        <p className="wfop-legal-note">
          <ShieldCheck size={15} /> Neither Wells Fargo nor Zelle® offers purchase protection for items bought from strangers. See <Link href="/help/online-banking/zelle-faqs">Zelle® FAQs</Link>.
        </p>
      </aside>
      <PaymentFlowModal state={flowCtl.flow} onClose={flowCtl.close} />
    </div>
  );
}

/* ==================== 4. BILL PAY ==================== */

export function BillPayView({
  profile,
  post,
  busy,
  hideBalances,
}: {
  profile: Profile;
  post: PostAction;
  busy: boolean;
  hideBalances: boolean;
}) {
  const flowCtl = usePaymentFlow();
  const sources = profile.accounts.filter((a) => CASH_TYPES.includes(a.accountType) && a.status === "Open");
  const [from, setFrom] = useState(sources[0]?.accountKey ?? "");
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [payeeName, setPayeeName] = useState("");
  const [acctLast4, setAcctLast4] = useState("");
  const [dueAmt, setDueAmt] = useState("95.00");
  const [dueDate, setDueDate] = useState("May 15, 2026");

  function payBill(payee: string, payeeMasked: string, val: string) {
    const fromAcct = profile.accounts.find((a) => a.accountKey === from);
    void flowCtl.run(
      {
        kind: "billpay",
        title: "Bill payment scheduled",
        amount: fmtMoney(val, hideBalances),
        fromLabel: `${fromAcct?.nickname || fromAcct?.name || "Account"} ${fromAcct?.maskedNumber ?? ""}`,
        toLabel: `${payee} ${payeeMasked}`,
      },
      () => post({ action: "billpay", fromAccount: from, payee, amount: Number(val) }, `Scheduled ${fmtMoney(val)} payment to ${payee}.`),
    );
  }

  async function addNewPayee(e: FormEvent) {
    e.preventDefault();
    const ok = await post(
      { action: "addPayee", payeeName, accountLast4: acctLast4, amountDue: Number(dueAmt), dueDate, category: "Utilities", autoPay: false },
      `${payeeName} added to your Bill Pay payees.`,
    );
    if (ok) {
      setPayeeName("");
      setAcctLast4("");
    }
  }

  return (
    <div className="wfop-two-col">
      <section className="wfop-card">
        <div className="wfop-card-head">
          <div>
            <h2>Bill Pay Center</h2>
            <p className="wfop-sub">Pay utilities, housing, and insurance from one dashboard with our Payment Guarantee.</p>
          </div>
          <select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Pay bills from account">
            {sources.map((a) => (
              <option key={a.accountKey} value={a.accountKey}>
                Pay from: {a.nickname || a.name} ({fmtMoney(a.availableBalance, hideBalances)})
              </option>
            ))}
          </select>
        </div>

        <div className="wfop-bill-list">
          {profile.bills.map((b) => {
            const val = amounts[b.id] ?? b.amountDue;
            const paid = Number(b.amountDue) <= 0;
            return (
              <div key={b.id} className="wfop-bill-item">
                <div className="wfop-bill-info">
                  <strong>{b.payeeName} <span>{b.payeeAccountMasked}</span></strong>
                  <small>{b.category} • {paid ? "Paid in full this cycle" : `Due ${b.dueDate}`}</small>
                  <label className="wfop-autopay-toggle">
                    <input
                      type="checkbox"
                      checked={b.autoPay}
                      disabled={busy}
                      onChange={(e) => post({ action: "toggleAutoPay", billId: b.id, autoPay: e.target.checked }, `AutoPay ${e.target.checked ? "enabled" : "turned off"} for ${b.payeeName}.`)}
                    />
                    <span>AutoPay {b.autoPay ? "On" : "Off"}</span>
                  </label>
                </div>
                <div className="wfop-bill-pay">
                  {paid ? (
                    <span className="wfop-pill wfop-pill-ok"><Check size={13} /> Paid ($0.00 due)</span>
                  ) : (
                    <>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={val}
                        onChange={(e) => setAmounts((p) => ({ ...p, [b.id]: e.target.value }))}
                        aria-label={`Amount for ${b.payeeName}`}
                      />
                      <button
                        type="button"
                        className="wfop-btn wfop-btn-red wfop-btn-sm"
                        disabled={busy || Number(val) <= 0}
                        onClick={() => payBill(b.payeeName, b.payeeAccountMasked, val)}
                      >
                        Pay Now
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {profile.bills.length === 0 && <p className="wfop-empty">No enrolled payees yet. Add your first payee on the right.</p>}
        </div>
      </section>

      <aside className="wfop-card wfop-card-tinted">
        <h3><Plus size={16} /> Add New Payee</h3>
        <form className="wfop-form" onSubmit={addNewPayee}>
          <label className="wfop-field">
            <span>Company or person name</span>
            <input required value={payeeName} onChange={(e) => setPayeeName(e.target.value)} placeholder="e.g., AT&T Fiber" />
          </label>
          <label className="wfop-field">
            <span>Last 4 digits of bill account</span>
            <input maxLength={4} value={acctLast4} onChange={(e) => setAcctLast4(e.target.value)} placeholder="4820" />
          </label>
          <div className="wfop-field-row">
            <label className="wfop-field">
              <span>Amount due ($)</span>
              <input type="number" min="1" step="0.01" required value={dueAmt} onChange={(e) => setDueAmt(e.target.value)} />
            </label>
            <label className="wfop-field">
              <span>Due date</span>
              <input required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
          </div>
          <button type="submit" className="wfop-btn wfop-btn-outline" disabled={busy}>Enroll Payee</button>
        </form>
      </aside>
      <PaymentFlowModal state={flowCtl.flow} onClose={flowCtl.close} />
    </div>
  );
}

/* ==================== 5. MOBILE CHECK DEPOSIT ==================== */

export function CheckDepositView({
  profile,
  post,
  busy,
  hideBalances,
}: {
  profile: Profile;
  post: PostAction;
  busy: boolean;
  hideBalances: boolean;
}) {
  const flowCtl = usePaymentFlow();
  const eligible = profile.accounts.filter((a) => ["Checking", "Savings", "Business Checking", "Business Savings"].includes(a.accountType) && a.status === "Open");
  const [toAccount, setToAccount] = useState(eligible[0]?.accountKey ?? "");
  const [amount, setAmount] = useState("485.00");
  const [checkNumber, setCheckNumber] = useState("1048");
  const [memo, setMemo] = useState("Client reimbursement");
  const [endorsed, setEndorsed] = useState(true);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const toAcct = profile.accounts.find((a) => a.accountKey === toAccount);
    await flowCtl.run(
      {
        kind: "deposit",
        title: "Check deposited",
        amount: fmtMoney(amount, hideBalances),
        fromLabel: `Check #${checkNumber || "1001"}${memo ? ` — ${memo}` : ""}`,
        toLabel: `${toAcct?.nickname || toAcct?.name || "Account"} ${toAcct?.maskedNumber ?? ""}`,
      },
      () =>
        post(
          { action: "depositCheck", toAccount, amount: Number(amount), checkNumber, memo },
          `Check #${checkNumber} for ${fmtMoney(amount)} deposited and credited to your balance.`,
        ),
    );
  }

  return (
    <div className="wfop-two-col">
      <section className="wfop-card">
        <div className="wfop-card-head">
          <div>
            <h2>Deposit Checks Online</h2>
            <p className="wfop-sub">Daily mobile deposit limit: $25,000.00 • Funds posted immediately in eligible accounts.</p>
          </div>
        </div>
        <form className="wfop-form" onSubmit={submit}>
          <label className="wfop-field">
            <span>Deposit to account</span>
            <select value={toAccount} onChange={(e) => setToAccount(e.target.value)}>
              {eligible.map((a) => (
                <option key={a.accountKey} value={a.accountKey}>
                  {a.nickname || a.name} {a.maskedNumber} — Current {fmtMoney(a.availableBalance, hideBalances)}
                </option>
              ))}
            </select>
          </label>
          <div className="wfop-field-row">
            <label className="wfop-field">
              <span>Check amount (USD)</span>
              <input type="number" min="0.01" max="25000" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label className="wfop-field">
              <span>Check number</span>
              <input value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} placeholder="1048" />
            </label>
          </div>
          <label className="wfop-field">
            <span>Payer / Memo</span>
            <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Payroll, consulting, gift…" />
          </label>
          <label className="wfop-check-confirm">
            <input type="checkbox" required checked={endorsed} onChange={(e) => setEndorsed(e.target.checked)} />
            <span>Back of check is signed and marked <strong>&ldquo;For Mobile Deposit at Wells Fargo Bank Only&rdquo;</strong></span>
          </label>
          <button type="submit" className="wfop-btn wfop-btn-red" disabled={busy || !endorsed}>
            <Camera size={16} /> Deposit {fmtMoney(amount)} Check
          </button>
        </form>
      </section>

      <aside className="wfop-card wfop-card-tinted">
        <h3>Captured Check Preview</h3>
        <div className="wfop-check-mock">
          <div className="wfop-check-row">
            <span>PAY TO THE ORDER OF</span>
            <span>#{checkNumber || "1001"}</span>
          </div>
          <div className="wfop-check-payee">
            <strong>{profile.customer.fullName}</strong>
            <span className="wfop-check-amt">{fmtMoney(amount)}</span>
          </div>
          <div className="wfop-check-memo">MEMO: {memo || "Deposit"}</div>
          <div className="wfop-check-micr">⑆121042882⑆ ⑈004829104⑈ {checkNumber || "1001"}</div>
        </div>
        <p className="wfop-legal-note">
          Retain your paper check in a safe place for 5 days after verifying the deposit in Account Activity, then destroy it.
        </p>
      </aside>
      <PaymentFlowModal state={flowCtl.flow} onClose={flowCtl.close} />
    </div>
  );
}

/* ==================== 6. SCHEDULED TRANSFERS ==================== */

type ScheduleItem = {
  id: number;
  label: string;
  fromAccountKey: string;
  toAccountKey: string | null;
  amount: string;
  frequency: string;
  nextRunDate: string;
  status: string;
  lastRunAt: string | null;
};

export function ScheduledView({ profile, notify }: { profile: Profile; notify: (m: string) => void }) {
  const [rows, setRows] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("Way2Save Monthly Goal");
  const [from, setFrom] = useState(profile.accounts[0]?.accountKey ?? "");
  const [to, setTo] = useState(profile.accounts[1]?.accountKey ?? "");
  const [amount, setAmount] = useState("150.00");
  const [frequency, setFrequency] = useState("Monthly");
  const [nextRunDate, setNextRunDate] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));

  const user = profile.customer.username;
  const load = useCallback(async () => {
    const res = await customerFetch(`/api/scheduled-transfers?user=${encodeURIComponent(user)}`);
    if (res.ok) {
      const d = (await res.json()) as { schedules: ScheduleItem[] };
      setRows(d.schedules ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    const res = await customerFetch("/api/scheduled-transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, label, fromAccountKey: from, toAccountKey: to, amount: Number(amount), frequency, nextRunDate }),
    });
    const d = (await res.json()) as { error?: string };
    if (!res.ok) return notify(d.error ?? "Unable to create schedule.");
    await load();
    notify(`Scheduled "${label}" (${frequency}).`);
  }

  async function updateStatus(id: number, status: string) {
    const res = await customerFetch("/api/scheduled-transfers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, id, status }),
    });
    if (res.ok) {
      await load();
      notify(`Schedule ${status.toLowerCase()}.`);
    }
  }

  const labelFor = (key: string | null) => {
    const a = profile.accounts.find((x) => x.accountKey === key);
    return a ? `${a.nickname || a.name} ${a.maskedNumber}` : key ?? "—";
  };

  return (
    <div className="wfop-two-col">
      <section className="wfop-card">
        <div className="wfop-card-head">
          <div>
            <h2>Recurring &amp; Scheduled Transfers</h2>
            <p className="wfop-sub">Automate your savings and extra loan principal payments on your calendar.</p>
          </div>
        </div>
        {loading ? (
          <p className="wfop-sub">Loading schedules…</p>
        ) : rows.length === 0 ? (
          <p className="wfop-empty">No recurring transfers scheduled yet. Create one on the right.</p>
        ) : (
          <div className="wfop-bill-list">
            {rows.map((s) => (
              <div key={s.id} className="wfop-bill-item">
                <div>
                  <strong>{s.label}</strong>
                  <small>{labelFor(s.fromAccountKey)} → {labelFor(s.toAccountKey)}</small>
                  <small>{s.frequency} • Next date: {s.nextRunDate}</small>
                </div>
                <div className="wfop-sched-actions">
                  <strong>{fmtMoney(s.amount)}</strong>
                  <span className={`wfop-pill ${s.status === "Active" ? "wfop-pill-ok" : "wfop-pill-gold"}`}>{s.status}</span>
                  <div>
                    {s.status === "Active" && <button type="button" className="wfop-link-btn" onClick={() => void updateStatus(s.id, "Paused")}>Pause</button>}
                    {s.status === "Paused" && <button type="button" className="wfop-link-btn" onClick={() => void updateStatus(s.id, "Active")}>Resume</button>}
                    {s.status !== "Canceled" && <button type="button" className="wfop-link-btn danger" onClick={() => void updateStatus(s.id, "Canceled")}>Cancel</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <aside className="wfop-card wfop-card-tinted">
        <h3>Set Up Automatic Transfer</h3>
        <form className="wfop-form" onSubmit={create}>
          <label className="wfop-field"><span>Nickname</span><input required value={label} onChange={(e) => setLabel(e.target.value)} /></label>
          <label className="wfop-field">
            <span>From</span>
            <select value={from} onChange={(e) => setFrom(e.target.value)}>
              {profile.accounts.map((a) => <option key={a.accountKey} value={a.accountKey}>{a.nickname || a.name} {a.maskedNumber}</option>)}
            </select>
          </label>
          <label className="wfop-field">
            <span>To</span>
            <select value={to} onChange={(e) => setTo(e.target.value)}>
              {profile.accounts.map((a) => <option key={a.accountKey} value={a.accountKey}>{a.nickname || a.name} {a.maskedNumber}</option>)}
            </select>
          </label>
          <div className="wfop-field-row">
            <label className="wfop-field"><span>Amount ($)</span><input type="number" min="1" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
            <label className="wfop-field">
              <span>Frequency</span>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                <option>Weekly</option><option>Biweekly</option><option>Monthly</option><option>Quarterly</option>
              </select>
            </label>
          </div>
          <label className="wfop-field"><span>Start date</span><input type="date" required value={nextRunDate} onChange={(e) => setNextRunDate(e.target.value)} /></label>
          <button type="submit" className="wfop-btn wfop-btn-red">Save Recurring Transfer</button>
        </form>
      </aside>
    </div>
  );
}

/* ==================== 7. BROKERAGE & WEALTH ==================== */

export function BrokerageView({
  profile,
  onNavigate,
  hideBalances,
}: {
  profile: Profile;
  onNavigate: (v: PortalView) => void;
  hideBalances: boolean;
}) {
  const invAccounts = profile.accounts.filter((a) => INVEST_TYPES.includes(a.accountType));
  const totalValue = invAccounts.reduce((s, a) => s + Number(a.balance), 0);
  const cashSweep = invAccounts.reduce((s, a) => s + Number(a.availableBalance), 0);
  const invested = Math.max(0, totalValue - cashSweep);

  if (invAccounts.length === 0) {
    return (
      <section className="wfop-card">
        <h2>Wells Fargo Advisors &amp; WellsTrade®</h2>
        <p className="wfop-sub">
          No brokerage or advisory accounts are currently linked to this profile. Open a self-directed WellsTrade® account with $0 online stock and ETF commissions, or launch an automated Intuitive Investor® portfolio with $500.
        </p>
        <div className="wfop-detail-actions">
          <Link href="/investing-wealth" className="wfop-btn wfop-btn-red">Explore Investing Options</Link>
          <Link href="/appointments" className="wfop-btn wfop-btn-outline">Meet with a Financial Advisor</Link>
        </div>
      </section>
    );
  }

  const holdings = [
    { ticker: "VTI", name: "Vanguard Total Stock Market ETF", asset: "U.S. Equities", weight: 0.44, change: "+9.84%" },
    { ticker: "VXUS", name: "Vanguard Total International Stock ETF", asset: "Int'l Equities", weight: 0.21, change: "+6.12%" },
    { ticker: "AGG", name: "iShares Core U.S. Aggregate Bond ETF", asset: "Fixed Income", weight: 0.22, change: "+2.45%" },
    { ticker: "MSFT", name: "Microsoft Corp.", asset: "U.S. Equities", weight: 0.08, change: "+14.30%" },
    { ticker: "SCHD", name: "Schwab U.S. Dividend Equity ETF", asset: "Dividend Equity", weight: 0.05, change: "+5.90%" },
  ];

  return (
    <div className="wfop-stack">
      <section className="wfop-card">
        <div className="wfop-detail-top">
          <div>
            <span className="wfop-kicker">WELLS FARGO ADVISORS • PORTFOLIO SUMMARY</span>
            <h2 style={{ margin: "4px 0 0" }}>Investments, Brokerage &amp; Trusts</h2>
          </div>
          <div className="wfop-detail-bal">
            <strong>{fmtMoney(totalValue, hideBalances)}</strong>
            <span className="pos">▲ +8.24% YTD • $0 online equity trades</span>
          </div>
        </div>
        <div className="wfop-detail-metrics">
          {invAccounts.map((a) => (
            <div key={a.id}>
              <span>{a.nickname || a.name} {a.maskedNumber}</span>
              <strong>{fmtMoney(a.balance, hideBalances)} <em className="pos">({a.rateOrApr})</em></strong>
            </div>
          ))}
          <div>
            <span>Cash Sweep Available</span>
            <strong>{fmtMoney(cashSweep, hideBalances)}</strong>
          </div>
        </div>
        <div className="wfop-detail-actions">
          <button type="button" className="wfop-btn wfop-btn-red wfop-btn-sm" onClick={() => onNavigate("transfer")}>Fund Brokerage Account</button>
          <button type="button" className="wfop-btn wfop-btn-outline wfop-btn-sm" onClick={() => onNavigate("statements")}>1099 Tax Documents</button>
          <Link href="/investing-wealth/retirement" className="wfop-btn wfop-btn-outline wfop-btn-sm">Retirement Calculator</Link>
        </div>
      </section>

      <section className="wfop-card">
        <h3>Portfolio Holdings</h3>
        <div className="wfop-table-wrap">
          <table className="wfop-ledger">
            <thead>
              <tr><th>Symbol</th><th>Security</th><th>Asset Class</th><th className="num">Allocation</th><th className="num">YTD Return</th><th className="num">Market Value</th></tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.ticker}>
                  <td><strong>{h.ticker}</strong></td>
                  <td>{h.name}</td>
                  <td><span className="wfop-cat-tag">{h.asset}</span></td>
                  <td className="num">{Math.round(h.weight * 100)}%</td>
                  <td className="num pos"><strong>{h.change}</strong></td>
                  <td className="num amt">{fmtMoney(invested * h.weight, hideBalances)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="wfop-legal-note">
          Investment and Insurance Products are: Not Insured by the FDIC or Any Federal Government Agency • Not a Deposit or Guaranteed by the Bank • Subject to Investment Risks, Including Possible Loss of Principal.
        </p>
      </section>
    </div>
  );
}

/* ==================== 8. CONTROL TOWER® CARDS & REWARDS ==================== */

/* ==================== 9. STATEMENTS & TAX DOCS ==================== */

export function StatementsDocsView({
  profile,
  post,
  notify,
}: {
  profile: Profile;
  post: PostAction;
  notify: (m: string) => void;
}) {
  const [acctFilter, setAcctFilter] = useState("all");
  const allDocs = profile.accounts.flatMap((a) => a.statements.map((s) => ({ s, account: a })));
  const visible = acctFilter === "all" ? allDocs : allDocs.filter((d) => String(d.account.id) === acctFilter);

  async function downloadPdf(id: number, period: string, docType: string) {
    const res = await customerFetch(`/api/documents/statement/${id}?user=${encodeURIComponent(profile.customer.username)}`);
    if (!res.ok) return notify("Unable to generate PDF statement right now.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wellsfargo-${docType.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${period.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    await post({ action: "statementView", statementId: id }, `Downloaded ${docType} (${period}) PDF.`);
  }

  return (
    <section className="wfop-card">
      <div className="wfop-card-head">
        <div>
          <span className="wfop-kicker">PAPERLESS DELIVERY ACTIVE • UP TO 7 YEARS ONLINE</span>
          <h2>Statements &amp; Tax Documents</h2>
          <p className="wfop-sub">Download official monthly PDF statements plus Forms 1099-INT, 1098, and Consolidated 1099.</p>
        </div>
        <select value={acctFilter} onChange={(e) => setAcctFilter(e.target.value)} aria-label="Filter statements by account">
          <option value="all">All Accounts ({allDocs.length})</option>
          {profile.accounts.map((a) => (
            <option key={a.id} value={String(a.id)}>
              {a.nickname || a.name} {a.maskedNumber} ({a.statements.length})
            </option>
          ))}
        </select>
      </div>
      <div className="wfop-table-wrap">
        <table className="wfop-ledger">
          <thead>
            <tr><th>Document</th><th>Account</th><th>Statement Period</th><th>Issued</th><th>Status</th><th className="num">PDF</th></tr>
          </thead>
          <tbody>
            {visible.map(({ s, account }) => (
              <tr key={s.id}>
                <td><strong><FileText size={15} style={{ display: "inline", verticalAlign: "text-bottom", color: "#d71e28" }} /> {s.documentType}</strong></td>
                <td>{account.nickname || account.name} {account.maskedNumber}</td>
                <td>{s.period}</td>
                <td>{s.issuedOn}</td>
                <td><span className={`wfop-pill ${s.viewed ? "wfop-pill-ok" : "wfop-pill-gold"}`}>{s.viewed ? "Viewed" : "Unread"}</span></td>
                <td className="num">
                  <button type="button" className="wfop-link-btn" onClick={() => void downloadPdf(s.id, s.period, s.documentType)}>
                    <Download size={14} /> Download PDF ({s.sizeKb} KB)
                  </button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && <tr><td colSpan={6} className="wfop-empty">No statements posted for this account yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ==================== 10. PLAN & LEARN (FARGO / FICO / LIFESYNC / DEALS) ==================== */

export function PlanLearnView({
  profile,
  initialSub = "fargo",
  activatedDeals,
  onToggleDeal,
  onNavigate,
  hideBalances,
}: {
  profile: Profile;
  initialSub?: "fargo" | "fico" | "goals" | "deals";
  activatedDeals: Record<string, boolean>;
  onToggleDeal: (id: string, merchant: string) => void;
  onNavigate: (v: PortalView) => void;
  hideBalances: boolean;
}) {
  const [sub, setSub] = useState(initialSub);
  const [paydownSim, setPaydownSim] = useState(500);
  const [goalBoost, setGoalBoost] = useState(0);

  useEffect(() => setSub(initialSub), [initialSub]);

  const spendByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of profile.transactions) {
      const n = Number(t.amount);
      if (n < 0 && !["Transfer", "Payment", "Loan Payment"].includes(t.category)) {
        map.set(t.category, (map.get(t.category) ?? 0) + Math.abs(n));
      }
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [profile.transactions]);

  const totalSpend = spendByCategory.reduce((s, [, v]) => s + v, 0);
  const totalIncome = profile.transactions.filter((t) => Number(t.amount) > 0 && t.category === "Income").reduce((s, t) => s + Number(t.amount), 0);
  const baseFico = profile.customer.tier === "Private Client" ? 818 : profile.customer.tier === "Premier" ? 792 : 744;
  const simFico = Math.min(850, baseFico + Math.round(paydownSim / 250) * 3);

  const savingsBal = profile.accounts.filter((a) => a.accountType === "Savings" || a.accountType === "CD").reduce((s, a) => s + Number(a.balance), 0) + goalBoost;

  return (
    <div className="wfop-stack">
      <div className="wfop-subnav-pills">
        <button type="button" className={sub === "fargo" ? "active" : ""} onClick={() => setSub("fargo")}>
          <Sparkles size={15} /> Fargo® Spending Insights
        </button>
        <button type="button" className={sub === "fico" ? "active" : ""} onClick={() => setSub("fico")}>
          <TrendingUp size={15} /> Credit Close-Up® (FICO® Score)
        </button>
        <button type="button" className={sub === "goals" ? "active" : ""} onClick={() => setSub("goals")}>
          <Target size={15} /> LifeSync® Goals
        </button>
        <button type="button" className={sub === "deals" ? "active" : ""} onClick={() => setSub("deals")}>
          <Gift size={15} /> My Wells Fargo Deals®
        </button>
      </div>

      {sub === "fargo" && (
        <div className="wfop-two-col">
          <section className="wfop-card">
            <span className="wfop-kicker">FARGO® SPENDING INSIGHTS</span>
            <h2>Spending by Category</h2>
            <div className="wfop-detail-metrics" style={{ marginBottom: 20 }}>
              <div><span>Everyday spending</span><strong>{fmtMoney(totalSpend, hideBalances)}</strong></div>
              <div><span>Payroll &amp; deposits</span><strong className="pos">{fmtMoney(totalIncome, hideBalances)}</strong></div>
              <div><span>Net monthly cash flow</span><strong className={totalIncome - totalSpend >= 0 ? "pos" : ""}>{fmtMoney(totalIncome - totalSpend, hideBalances)}</strong></div>
            </div>
            <div className="wfop-bars">
              {spendByCategory.map(([cat, val]) => {
                const pct = Math.round((val / (totalSpend || 1)) * 100);
                return (
                  <div key={cat} className="wfop-bar-item">
                    <div className="wfop-bar-top"><strong>{cat}</strong><span>{fmtMoney(val, hideBalances)} ({pct}%)</span></div>
                    <div className="wfop-bar-track"><span style={{ width: `${Math.max(4, pct)}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </section>
          <aside className="wfop-card wfop-card-tinted">
            <h3>Subscriptions &amp; Recurring</h3>
            <p className="wfop-sub">Detected automatically across your linked Wells Fargo cards and checking:</p>
            <div className="wfop-mini-list">
              {profile.bills.slice(0, 4).map((b) => (
                <div key={b.id} className="wfop-mini-row">
                  <div><strong>{b.payeeName}</strong><small>Due {b.dueDate}</small></div>
                  <strong>{fmtMoney(b.amountDue, hideBalances)}</strong>
                </div>
              ))}
            </div>
            <button type="button" className="wfop-btn wfop-btn-outline wfop-btn-sm" style={{ marginTop: 14 }} onClick={() => onNavigate("bills")}>
              Manage in Bill Pay
            </button>
          </aside>
        </div>
      )}

      {sub === "fico" && (
        <div className="wfop-two-col">
          <section className="wfop-card">
            <span className="wfop-kicker">CREDIT CLOSE-UP® • EXPERIAN® DATA</span>
            <h2>Your FICO® Score 9: {simFico} ({simFico >= 800 ? "Exceptional" : simFico >= 740 ? "Very Good" : "Good"})</h2>
            <p className="wfop-sub">Updated monthly with zero impact to your credit score. Baseline score: {baseFico} (+6 pts vs. last month).</p>
            <div className="wfop-bars" style={{ marginTop: 18 }}>
              {[
                { label: "Payment History (35% weight)", val: "100% on-time", pct: 100 },
                { label: "Credit Utilization (30% weight)", val: "11% used — Excellent", pct: 89 },
                { label: "Length of Credit History (15% weight)", val: `Since ${profile.customer.relationshipSince}`, pct: 84 },
                { label: "Credit Mix (10% weight)", val: "Cards, Deposit & Installment", pct: 92 },
                { label: "New Credit Inquiries (10% weight)", val: "1 inquiry in 12 months", pct: 88 },
              ].map((f) => (
                <div key={f.label} className="wfop-bar-item">
                  <div className="wfop-bar-top"><strong>{f.label}</strong><span>{f.val}</span></div>
                  <div className="wfop-bar-track ok"><span style={{ width: `${f.pct}%` }} /></div>
                </div>
              ))}
            </div>
          </section>
          <aside className="wfop-card wfop-card-tinted">
            <h3>FICO® Score Simulator</h3>
            <p className="wfop-sub">Slide to preview how paying down revolving card balances could lift your FICO® Score 9:</p>
            <label className="wfop-limit-slider">
              <span>Pay down card balance by: <strong>{fmtMoney(paydownSim)}</strong></span>
              <input type="range" min={0} max={2500} step={250} value={paydownSim} onChange={(e) => setPaydownSim(Number(e.target.value))} />
            </label>
            <div className="wfop-sim-box">
              <span>Simulated Score</span>
              <strong>{simFico}</strong>
              <small className="pos">+{simFico - baseFico} estimated points</small>
            </div>
            <button type="button" className="wfop-btn wfop-btn-red wfop-btn-sm" onClick={() => onNavigate("transfer")}>Make a Card Payment</button>
          </aside>
        </div>
      )}

      {sub === "goals" && (
        <section className="wfop-card">
          <div className="wfop-card-head">
            <div>
              <span className="wfop-kicker">LIFESYNC® • PERSONALIZED GOAL TRACKING</span>
              <h2>Your Financial Goals</h2>
              <p className="wfop-sub">Aligned automatically with your live Wells Fargo savings, CD, and investment balances.</p>
            </div>
            <button type="button" className="wfop-btn wfop-btn-red wfop-btn-sm" onClick={() => setGoalBoost((g) => g + 250)}>
              + Preview $250 Contribution
            </button>
          </div>
          <div className="wfop-goals-grid">
            {[
              { name: "6-Month Emergency Reserve", current: Math.min(40000, savingsBal), target: 40000, note: "Linked to Way2Save® & Special CD" },
              { name: "2026 Family Travel Fund", current: Math.min(8500, savingsBal * 0.22), target: 8500, note: "On track for August target" },
              { name: "Long-Term Retirement Milestone", current: profile.accounts.filter((a) => INVEST_TYPES.includes(a.accountType)).reduce((s, a) => s + Number(a.balance), 0), target: 250000, note: "Linked to WellsTrade® / Advisors" },
            ].map((g) => {
              const pct = Math.min(100, Math.round((g.current / g.target) * 100));
              return (
                <div key={g.name} className="wfop-goal-card">
                  <strong>{g.name}</strong>
                  <div className="wfop-goal-nums">
                    <span>{fmtMoney(g.current, hideBalances)}</span>
                    <small>of {fmtMoney(g.target, hideBalances)} ({pct}%)</small>
                  </div>
                  <div className="wfop-bar-track ok"><span style={{ width: `${pct}%` }} /></div>
                  <small className="wfop-sub">{g.note}</small>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {sub === "deals" && (
        <section className="wfop-card">
          <span className="wfop-kicker">MY WELLS FARGO DEALS®</span>
          <h2>Earn Automatic Cash Back with Your Eligible Cards</h2>
          <p className="wfop-sub">Activate deals with one click, shop with your Wells Fargo debit or credit card, and receive statement credits automatically.</p>
          <div className="wfop-deals-grid">
            {WF_DEALS.map((d) => {
              const on = Boolean(activatedDeals[d.id]);
              return (
                <div key={d.id} className="wfop-deal-tile">
                  <span className="wfop-deal-logo"><img src={d.logo} alt={`${d.merchant} logo`} width={42} height={42} loading="lazy" /></span>
                  <div>
                    <span className="wfop-cat-tag">{d.badge}</span>
                    <strong>{d.merchant} — {d.offer}</strong>
                    <small>{d.detail}</small>
                  </div>
                  <button
                    type="button"
                    className={`wfop-btn wfop-btn-sm ${on ? "wfop-btn-ok" : "wfop-btn-outline"}`}
                    onClick={() => onToggleDeal(d.id, d.merchant)}
                  >
                    {on ? <><CheckCircle2 size={14} /> Activated</> : "Activate"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

/* Rebuilt standalone pages (real card art + dedicated Security Center) */
export { CardsControlTowerView } from "@/components/wfo-card-page";
export { SecurityAlertsView } from "@/components/wfo-security-page";
