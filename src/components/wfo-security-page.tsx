"use client";

import { CARD_ART, getCardArt } from "@/components/card-art";
import type { PostAction, Profile } from "@/components/wfo-types";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Fingerprint,
  KeyRound,
  Laptop,
  Lock,
  Mail,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

export function SecurityAlertsView({
  profile,
  post,
  busy,
}: {
  profile: Profile;
  post: PostAction;
  busy: boolean;
}) {
  const c = profile.customer;
  const [email, setEmail] = useState(c.email);
  const [phone, setPhone] = useState(c.phone);
  const channels = ["Push notification", "Push, SMS & Email", "Email", "SMS only"];

  useEffect(() => {
    setEmail(c.email);
    setPhone(c.phone);
  }, [c.email, c.phone]);

  const allCards = profile.accounts.flatMap((a) => a.cards.map((card) => ({ card, account: a })));
  const activeAlerts = profile.alerts.filter((a) => a.enabled).length;
  const lockedCards = allCards.filter((r) => r.card.status !== "Active").length;
  const primaryCard = allCards.find((r) => getCardArt(r.card).kind === "Debit Card") ?? allCards[0] ?? null;
  const cardArt = primaryCard ? getCardArt(primaryCard.card) : null;
  const signOnTime = new Date(c.lastSignInAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  const checklist = [
    { label: "2-Step Verification enabled", done: c.twoFactorEnabled },
    { label: "Passkey sign-on enabled", done: c.passkeyEnabled },
    { label: "Account alerts active", done: activeAlerts >= 3 },
    { label: "Fraud monitoring active on every card", done: true },
    { label: "No cards currently turned off", done: lockedCards === 0 },
  ];
  const score = checklist.filter((item) => item.done).length;

  return (
    <div className="wfop-stack">
      {/* Security Center header */}
      <header className="wfop-card wfop-security-head">
        <div>
          <span className="wfop-kicker">WELLS FARGO ONLINE® • SECURITY CENTER</span>
          <h2>Your security at a glance</h2>
          <p className="wfop-sub">Manage how you sign on, control account alerts, review trusted devices, and protect your cards 24/7.</p>
        </div>
        <div className="wfop-security-score">
          <span>{score} of {checklist.length}</span>
          <strong>Recommended protections active</strong>
        </div>
      </header>

      <div className="wfop-security-kpis">
        <div><KeyRound size={19} /><span>Sign-on protection</span><strong>{c.twoFactorEnabled ? "2-Step + Passkey" : "Standard"}</strong></div>
        <div><BellRing size={19} /><span>Active alerts</span><strong>{activeAlerts} of {profile.alerts.length}</strong></div>
        <div><Laptop size={19} /><span>Trusted devices</span><strong>3 devices</strong></div>
        <div><ShieldCheck size={19} /><span>Fraud monitoring</span><strong className="pos">Active 24/7</strong></div>
      </div>

      <div className="wfop-two-col">
        <div className="wfop-stack">
          {/* Sign-on & authentication */}
          <section className="wfop-card">
            <div className="wfop-card-head">
              <div><span className="wfop-kicker">SIGN-ON &amp; AUTHENTICATION</span><h3>Sign-on settings</h3></div>
              <Fingerprint size={20} />
            </div>
            <label className="wfop-switch-row">
              <span><strong>2-Step Verification</strong><small>Require a one-time code on unrecognized devices</small></span>
              <input type="checkbox" checked={c.twoFactorEnabled} disabled={busy} onChange={(e) => post({ action: "profileUpdate", twoFactorEnabled: e.target.checked }, "2-Step Verification updated.")} />
            </label>
            <label className="wfop-switch-row">
              <span><strong>Passkey sign-on</strong><small>Face ID®, Touch ID®, Windows Hello, or device PIN</small></span>
              <input type="checkbox" checked={c.passkeyEnabled} disabled={busy} onChange={(e) => post({ action: "profileUpdate", passkeyEnabled: e.target.checked }, "Passkey preference saved.")} />
            </label>
            <div className="wfop-security-links">
              <Link href="/help/password-help"><KeyRound size={15} /> Change password or username <ChevronRight size={14} /></Link>
              <Link href="/sign-on/passkey"><Fingerprint size={15} /> Set up a passkey <ChevronRight size={14} /></Link>
            </div>
            <div className="wfop-meta-kv">
              <span>Identity verification</span><strong className="pos">{c.kycStatus}</strong>
              <span>Relationship tier</span><strong>{c.tier} · since {c.relationshipSince}</strong>
              <span>Last sign-on</span><strong>{signOnTime}</strong>
            </div>
          </section>

          {/* Alerts */}
          <section className="wfop-card">
            <div className="wfop-card-head">
              <div><span className="wfop-kicker">REAL-TIME MONITORING</span><h3>Account &amp; security alerts</h3></div>
              <BellRing size={20} />
            </div>
            <div className="wfop-bill-list">
              {profile.alerts.map((alert) => (
                <div key={alert.id} className="wfop-bill-item">
                  <label className="wfop-check-confirm" style={{ margin: 0 }}>
                    <input type="checkbox" checked={alert.enabled} disabled={busy} onChange={(e) => post({ action: "alertToggle", alertId: alert.id, enabled: e.target.checked, channel: alert.channel }, "Alert preference saved.")} />
                    <span><strong>{alert.kind}</strong><small style={{ display: "block", color: "#6e6563" }}>Threshold: {alert.threshold}</small></span>
                  </label>
                  <select value={alert.channel} disabled={busy || !alert.enabled} onChange={(e) => post({ action: "alertToggle", alertId: alert.id, enabled: alert.enabled, channel: e.target.value }, "Delivery channel updated.")} aria-label={`Channel for ${alert.kind}`}>
                    {channels.map((channel) => <option key={channel} value={channel}>{channel}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </section>

          {/* Trusted devices & sign-on activity */}
          <section className="wfop-card">
            <div className="wfop-card-head">
              <div><span className="wfop-kicker">TRUSTED DEVICES &amp; ACTIVITY</span><h3>Where you're signed on</h3></div>
              <Laptop size={20} />
            </div>
            <div className="wfop-device-list">
              <div className="wfop-device-row"><span className="wfop-device-icon"><Laptop size={18} /></span><div><strong>Chrome on Windows 11</strong><small>San Francisco, CA · Current session · {signOnTime}</small></div><span className="wfop-pill wfop-pill-ok">This device</span></div>
              <div className="wfop-device-row"><span className="wfop-device-icon"><Smartphone size={18} /></span><div><strong>Wells Fargo Mobile® · iPhone 15 Pro</strong><small>San Francisco, CA · Last used yesterday</small></div><span className="wfop-pill wfop-pill-ok">Trusted</span></div>
              <div className="wfop-device-row"><span className="wfop-device-icon"><Laptop size={18} /></span><div><strong>Safari on macOS</strong><small>Seattle, WA · Last used 12 days ago</small></div><span className="wfop-pill wfop-pill-gold">Review</span></div>
            </div>
            <p className="wfop-sub" style={{ marginTop: 12 }}>If you don't recognize a device, change your password immediately and <Link href="/privacy-security/fraud/report" className="wfop-link-btn">report it to us</Link>.</p>
          </section>
        </div>

        <aside className="wfop-stack">
          {/* Security checklist */}
          <section className="wfop-card wfop-card-tinted">
            <h3>Security checklist</h3>
            <ul className="wfop-check-list">
              {checklist.map((item) => (
                <li key={item.label}>{item.done ? <CheckCircle2 size={16} className="pos" /> : <AlertTriangle size={16} />} <span>{item.label}</span></li>
              ))}
            </ul>
          </section>

          {/* Card security with real card art */}
          <section className="wfop-card">
            <h3>Card security</h3>
            {cardArt && primaryCard ? (
              <div className="wfop-security-card">
                <img src={cardArt.src} alt={cardArt.alt} width="180" height="114" loading="lazy" />
                <div><strong>{primaryCard.card.cardName}</strong><small>{cardArt.kind} · ····{primaryCard.card.last4}</small><span className={`wfop-pill ${primaryCard.card.status === "Active" ? "wfop-pill-ok" : "wfop-pill-red"}`}>{primaryCard.card.status === "Active" ? "Card on" : primaryCard.card.status}</span></div>
              </div>
            ) : (
              <img src={CARD_ART.debit} alt="Wells Fargo Visa Debit Card" width="180" height="114" loading="lazy" />
            )}
            <div className="wfop-security-links">
              <Link href="/online-banking/cards"><Lock size={15} /> Control Tower® — turn cards on/off <ChevronRight size={14} /></Link>
              <Link href="/privacy-security/fraud/report"><AlertTriangle size={15} /> Report fraud or a lost card <ChevronRight size={14} /></Link>
              <Link href="/privacy-security/fraud"><ShieldCheck size={15} /> Zero Liability protection <ChevronRight size={14} /></Link>
            </div>
          </section>

          {/* Privacy & support */}
          <section className="wfop-card">
            <h3>Privacy &amp; support</h3>
            <div className="wfop-security-links">
              <Link href="/privacy-security"><ShieldCheck size={15} /> Privacy, Cookies, Security &amp; Legal <ChevronRight size={14} /></Link>
              <Link href="/online-banking/messages"><Mail size={15} /> Secure Message Center <ChevronRight size={14} /></Link>
              <Link href="/help"><BellRing size={15} /> Customer service &amp; FAQs <ChevronRight size={14} /></Link>
            </div>
          </section>

          {/* Contact information */}
          <section className="wfop-card wfop-card-tinted">
            <h3>Contact information</h3>
            <form className="wfop-form" onSubmit={(e: FormEvent) => { e.preventDefault(); void post({ action: "profileUpdate", email, phone }, "Contact information saved."); }}>
              <label className="wfop-field"><span>Primary email</span><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              <label className="wfop-field"><span>Mobile phone</span><input required value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
              <button type="submit" className="wfop-btn wfop-btn-red wfop-btn-sm" disabled={busy}>Save Contact Info</button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
