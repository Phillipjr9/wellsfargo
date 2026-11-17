"use client";

import { CARD_ART, getCardArt, sortCards } from "@/components/card-art";
import { CASH_TYPES, fmtMoney, type PostAction, type Profile } from "@/components/wfo-types";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Gift,
  Globe2,
  Lock,
  Plane,
  ShieldCheck,
  Smartphone,
  Unlock,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type CardTab = "controls" | "rewards" | "wallets" | "security";

export function CardsControlTowerView({
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
  const allCards = useMemo(
    () => sortCards(profile.accounts.flatMap((account) => account.cards.map((card) => ({ card, account })))),
    [profile.accounts],
  );
  const cashAccounts = profile.accounts.filter((a) => CASH_TYPES.includes(a.accountType) && a.status === "Open");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<CardTab>("controls");
  const [redeemDest, setRedeemDest] = useState(cashAccounts[0]?.accountKey ?? profile.accounts[0]?.accountKey ?? "");

  const selected = allCards.find((row) => row.card.id === selectedId) ?? allCards[0] ?? null;
  const art = selected ? getCardArt(selected.card) : null;
  const locked = selected?.card.status === "Locked";
  const cardTransactions = selected
    ? profile.transactions.filter((t) => t.accountId === selected.account.id).slice(0, 8)
    : [];

  const activeCount = allCards.filter((r) => r.card.status === "Active").length;
  const lockedCount = allCards.filter((r) => r.card.status !== "Active").length;

  if (!selected || !art) {
    return (
      <section className="wfop-card">
        <h2>Manage Cards</h2>
        <p className="wfop-sub">No cards are linked to this profile.</p>
      </section>
    );
  }

  return (
    <div className="wfop-stack">
      {/* Page header */}
      <header className="wfop-card wfop-cardpage-head">
        <div>
          <span className="wfop-kicker">CONTROL TOWER® • CARD MANAGEMENT</span>
          <h2>Manage your debit &amp; credit cards</h2>
          <p className="wfop-sub">
            {allCards.length} linked cards · {activeCount} active · {lockedCount} turned off or replaced. Control every card,
            digital wallet, and Wells Fargo Rewards® balance in one place.
          </p>
        </div>
        <Link href="/online-banking/security" className="wfop-btn wfop-btn-outline wfop-btn-sm">
          <ShieldCheck size={16} /> Security Center <ChevronRight size={15} />
        </Link>
      </header>

      <div className="wfop-cardpage-grid">
        {/* Card selector rail */}
        <aside className="wfop-card">
          <h3>Your cards</h3>
          <div className="wfop-card-selector">
            {allCards.map(({ card, account }) => {
              const info = getCardArt(card);
              const isSelected = card.id === selected.card.id;
              const isOff = card.status !== "Active";
              return (
                <button
                  key={card.id}
                  type="button"
                  className={isSelected ? "wfop-card-option selected" : "wfop-card-option"}
                  onClick={() => {
                    setSelectedId(card.id);
                    setTab("controls");
                  }}
                >
                  <img src={info.src} alt={info.alt} width="76" height="48" loading="lazy" />
                  <span className="wfop-card-option-copy">
                    <strong>{card.cardName}</strong>
                    <small>{info.kind} · ····{card.last4} · {account.maskedNumber}</small>
                  </span>
                  <span className={`wfop-pill ${isOff ? "wfop-pill-red" : "wfop-pill-ok"}`}>{isOff ? card.status : "On"}</span>
                </button>
              );
            })}
          </div>
          <div className="wfop-card-services">
            <h4>Card services</h4>
            <Link href="/privacy-security/fraud/report"><CreditCard size={16} /> Report lost or stolen card <ChevronRight size={14} /></Link>
            <Link href="/appointments"><Wallet size={16} /> Replace or reorder a card <ChevronRight size={14} /></Link>
            <Link href="/mobile-app"><Smartphone size={16} /> Activate a new card <ChevronRight size={14} /></Link>
            <Link href="/online-banking/messages"><Plane size={16} /> Set a travel notice <ChevronRight size={14} /></Link>
          </div>
        </aside>

        {/* Selected card workspace */}
        <section className="wfop-card wfop-selected-card">
          <div className="wfop-card-hero">
            <div className="wfop-real-card">
              <img src={art.src} alt={art.alt} width="420" height="266" className={locked ? "is-locked" : ""} />
              {locked && <span className="wfop-card-off-badge"><Lock size={14} /> Card Off</span>}
            </div>
            <div className="wfop-card-hero-info">
              <span className="wfop-kicker">{art.kind.toUpperCase()}</span>
              <h3>{selected.card.cardName}</h3>
              <p className="wfop-sub">{art.label}</p>
              <dl className="wfop-card-facts">
                <div><dt>Card number</dt><dd>···· ···· ···· {selected.card.last4}</dd></div>
                <div><dt>Network</dt><dd>{selected.card.network}</dd></div>
                <div><dt>Expires</dt><dd>{selected.card.expires}</dd></div>
                <div><dt>Linked account</dt><dd>{selected.account.nickname || selected.account.name} {selected.account.maskedNumber}</dd></div>
                <div><dt>Daily purchase limit</dt><dd>{fmtMoney(selected.card.dailySpendLimit, hideBalances)}</dd></div>
                <div><dt>Cardholder</dt><dd>{profile.customer.fullName}</dd></div>
              </dl>
              <div className="wfop-card-hero-actions">
                <button
                  type="button"
                  className={`wfop-btn wfop-btn-sm ${locked ? "wfop-btn-red" : "wfop-btn-outline"}`}
                  disabled={busy}
                  onClick={() =>
                    post(
                      { action: "cardControl", cardId: selected.card.id, field: "status", value: locked ? "Active" : "Locked" },
                      `${selected.card.cardName} turned ${locked ? "on" : "off"}.`,
                    )
                  }
                >
                  {locked ? <><Unlock size={14} /> Turn card on</> : <><Lock size={14} /> Turn card off</>}
                </button>
                <Link href="/online-banking/security" className="wfop-btn wfop-btn-outline wfop-btn-sm">
                  <ShieldCheck size={14} /> Card security
                </Link>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="wfop-card-tabs" role="tablist" aria-label="Card management sections">
            {([
              { id: "controls", label: "Card Controls", icon: Lock },
              { id: "rewards", label: "Rewards", icon: Gift },
              { id: "wallets", label: "Digital Wallets", icon: Smartphone },
              { id: "security", label: "Security", icon: ShieldCheck },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          {tab === "controls" && (
            <div className="wfop-card-panel">
              <h4>Instant card controls</h4>
              <p className="wfop-sub">Changes take effect immediately across your physical card and connected digital wallets.</p>
              <label className="wfop-switch-row">
                <span><strong>Contactless tap to pay</strong><small>Use your card at contactless terminals</small></span>
                <input type="checkbox" checked={selected.card.contactlessEnabled} disabled={busy} onChange={(e) => post({ action: "cardControl", cardId: selected.card.id, field: "contactlessEnabled", value: e.target.checked }, "Contactless setting updated.")} />
              </label>
              <label className="wfop-switch-row">
                <span><strong>Online &amp; phone purchases</strong><small>Card-not-present transactions</small></span>
                <input type="checkbox" checked={selected.card.onlinePurchasesEnabled} disabled={busy} onChange={(e) => post({ action: "cardControl", cardId: selected.card.id, field: "onlinePurchasesEnabled", value: e.target.checked }, "Online purchase setting updated.")} />
              </label>
              <label className="wfop-switch-row">
                <span><strong>International purchases</strong><small>Allow transactions outside the U.S.</small></span>
                <input type="checkbox" checked={selected.card.internationalEnabled} disabled={busy} onChange={(e) => post({ action: "cardControl", cardId: selected.card.id, field: "internationalEnabled", value: e.target.checked }, "International purchase setting updated.")} />
              </label>
              <label className="wfop-limit-slider">
                <span>Daily purchase limit: <strong>{fmtMoney(selected.card.dailySpendLimit, hideBalances)}</strong></span>
                <input type="range" min={200} max={25000} step={200} value={Number(selected.card.dailySpendLimit)} disabled={busy} onChange={(e) => post({ action: "cardControl", cardId: selected.card.id, field: "dailySpendLimit", value: e.target.value }, "Daily purchase limit saved.")} />
              </label>
              <div className="wfop-card-note"><BellRing size={16} /> Get an instant push, text, or email alert whenever this card is used above your threshold in <Link href="/online-banking/security">Security Center</Link>.</div>
            </div>
          )}

          {tab === "rewards" && (
            <div className="wfop-card-panel">
              <h4>Wells Fargo Rewards®</h4>
              {selected.card.rewardsPoints > 0 ? (
                <>
                  <div className="wfop-rewards-hero">
                    <div><span>Available points</span><strong>{selected.card.rewardsPoints.toLocaleString()} pts</strong><small>{fmtMoney(selected.card.rewardsPoints / 100)} redemption value</small></div>
                    <img src={CARD_ART.autograph} alt="Wells Fargo Autograph® Card" width="200" height="126" loading="lazy" />
                  </div>
                  <div className="wfop-redeem-row">
                    <select value={redeemDest} onChange={(e) => setRedeemDest(e.target.value)} aria-label="Redeem destination">
                      {cashAccounts.map((a) => <option key={a.accountKey} value={a.accountKey}>Deposit to {a.nickname || a.name} {a.maskedNumber}</option>)}
                      <option value={selected.account.accountKey}>Statement credit ({selected.account.maskedNumber})</option>
                    </select>
                    <button type="button" className="wfop-btn wfop-btn-red wfop-btn-sm" disabled={busy || selected.card.rewardsPoints < 2500} onClick={() => post({ action: "redeemRewards", cardId: selected.card.id, points: 2500, toAccount: redeemDest }, "Redeemed 2,500 points ($25.00)!")}>
                      Redeem $25 (2,500 pts)
                    </button>
                  </div>
                  <ul className="wfop-check-list">
                    <li><CheckCircle2 size={15} /> Points do not expire while your account is open</li>
                    <li><CheckCircle2 size={15} /> Redeem to an eligible Wells Fargo deposit account at 1¢ per point</li>
                    <li><CheckCircle2 size={15} /> Use Pay With Rewards at checkout with eligible cards</li>
                  </ul>
                </>
              ) : (
                <p className="wfop-empty">This debit card does not earn Wells Fargo Rewards® points. <Link href="/credit-cards" className="wfop-link-btn">Explore rewards credit cards <ArrowRight size={14} /></Link></p>
              )}
            </div>
          )}

          {tab === "wallets" && (
            <div className="wfop-card-panel">
              <h4>Digital wallets &amp; connected devices</h4>
              <p className="wfop-sub">Connected wallet: <strong>{selected.card.digitalWallets}</strong></p>
              <div className="wfop-wallet-grid">
                {[
                  { name: "Apple Pay®", device: "iPhone 15 Pro", icon: Smartphone, active: selected.card.digitalWallets.includes("Apple") },
                  { name: "Google Pay™", device: "Pixel 8", icon: Wallet, active: selected.card.digitalWallets.includes("Google") },
                  { name: "Samsung Wallet", device: "Galaxy S24", icon: CreditCard, active: selected.card.digitalWallets.includes("Samsung") },
                ].map(({ name, device, icon: Icon, active }) => (
                  <div key={name} className="wfop-wallet-tile">
                    <Icon size={20} />
                    <div><strong>{name}</strong><small>{device}</small></div>
                    <span className={`wfop-pill ${active ? "wfop-pill-ok" : "wfop-pill-gold"}`}>{active ? "Connected" : "Not set up"}</span>
                  </div>
                ))}
              </div>
              <div className="wfop-card-note"><Globe2 size={16} /> Use your Wells Fargo Mobile® app to add this card to a digital wallet. <Link href="/mobile-app">Learn how <ChevronRight size={13} /></Link></div>
            </div>
          )}

          {tab === "security" && (
            <div className="wfop-card-panel">
              <h4>Card security</h4>
              <div className="wfop-security-actions">
                <Link href="/online-banking/security"><ShieldCheck size={19} /><div><strong>Security Center</strong><small>2-Step Verification, passkeys, alerts &amp; trusted devices</small></div><ChevronRight size={16} /></Link>
                <Link href="/privacy-security/fraud/report"><Lock size={19} /><div><strong>Report fraud or a lost card</strong><small>Open a case with Wells Fargo Fraud Operations 24/7</small></div><ChevronRight size={16} /></Link>
                <Link href="/privacy-security/fraud"><Globe2 size={19} /><div><strong>Zero Liability protection</strong><small>Review how we protect unauthorized transactions</small></div><ChevronRight size={16} /></Link>
              </div>
              <div className="wfop-card-note"><CheckCircle2 size={16} /> 24/7 fraud monitoring is active on all linked Wells Fargo cards. Turning a card off blocks new purchases but does not stop recurring payments already authorized.</div>
            </div>
          )}
        </section>
      </div>

      {/* Recent card activity */}
      <section className="wfop-card">
        <div className="wfop-card-head">
          <div><h3>Recent card activity</h3><p className="wfop-sub">Transactions posted to {selected.card.cardName} · ····{selected.card.last4}</p></div>
          <Link href="/online-banking/dashboard" className="wfop-link-btn">View all activity <ChevronRight size={14} /></Link>
        </div>
        <div className="wfop-table-wrap">
          <table className="wfop-ledger">
            <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Status</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {cardTransactions.map((t) => (
                <tr key={t.id}>
                  <td className="nowrap">{t.postedDate}</td>
                  <td><strong>{t.description}</strong></td>
                  <td><span className="wfop-cat-tag">{t.category}</span></td>
                  <td><span className="wfop-pill wfop-pill-ok">{t.status}</span></td>
                  <td className={`num amt ${Number(t.amount) > 0 ? "pos" : ""}`}>{fmtMoney(t.amount, hideBalances)}</td>
                </tr>
              ))}
              {cardTransactions.length === 0 && <tr><td colSpan={5} className="wfop-empty">No recent transactions on this card.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
