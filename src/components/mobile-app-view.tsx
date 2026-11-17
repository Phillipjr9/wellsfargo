"use client";

import { SiteShell } from "@/components/site-shell";
import { Check, CheckCircle2, Smartphone, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export function MobileAppView({ platform }: { platform: "all" | "ios" | "android" }) {
  const [fargoTab, setFargoTab] = useState<"summary" | "category" | "merchant">("category");
  const [phone, setPhone] = useState("");
  const [linkSent, setLinkSent] = useState(false);

  const headings = {
    all: {
      eyebrow: "Wells Fargo Mobile & Fargo",
      title: "Bank virtually anywhere with Wells Fargo Mobile",
      sub: "Deposit checks in seconds, send money with Zelle, lock cards instantly, and ask Fargo for personalized spending insights across your accounts.",
    },
    ios: {
      eyebrow: "Wells Fargo Mobile for iOS",
      title: "Wells Fargo Mobile for iPhone & iPad",
      sub: "Rated 4.9 stars by millions of customers—built for Face ID, Touch ID, Apple Pay, Passkeys, and Fargo AI-powered insights on iOS 16 or later.",
    },
    android: {
      eyebrow: "Wells Fargo Mobile for Android",
      title: "Wells Fargo Mobile on Google Play",
      sub: "Fast, secure mobile banking with biometric sign-on, Google Wallet provisioning, mobile check deposit, and Fargo spending summaries on Android 10+.",
    },
  }[platform];

  function handleSendLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLinkSent(true);
  }

  return (
    <SiteShell>
      <section className="app-section">
        <div className="app-section-inner content-width">
          <div className="app-device">
            <img src="/images/fargo-app.png" alt="Fargo spending insights inside the Wells Fargo Mobile app" width="286" height="580" />
          </div>
          <div className="app-copy">
            <span className="wf-eyebrow">{headings.eyebrow}</span>
            <h1>{headings.title}</h1>
            <p>{headings.sub}</p>
            <div className="wf-pill-row">
              <Link href="/mobile-app" className={platform === "all" ? "wf-pill active" : "wf-pill"}>Overview</Link>
              <Link href="/mobile-app/ios" className={platform === "ios" ? "wf-pill active" : "wf-pill"}>iOS (App Store)</Link>
              <Link href="/mobile-app/android" className={platform === "android" ? "wf-pill active" : "wf-pill"}>Android (Google Play)</Link>
            </div>
            <div className="app-download">
              <h3><Smartphone size={18} style={{ display: "inline", verticalAlign: "text-bottom" }} /> Text yourself a download setup guide</h3>
              {linkSent ? (
                <p className="wf-saved-banner">
                  <CheckCircle2 size={17} /> Ready! You can also test our live digital experience right now in the{" "}
                  <Link href="/online-banking/dashboard" className="wf-inline-link">Online Banking Demo</Link>.
                </p>
              ) : (
                <form onSubmit={handleSendLink} className="wf-inline-form">
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Mobile number (e.g., 415-555-0192)"
                    aria-label="Mobile number"
                  />
                  <button type="submit" className="button button-red">Send Link</button>
                </form>
              )}
              <div className="store-buttons" style={{ marginTop: 16 }}>
                <Link href="/mobile-app/ios" aria-label="iOS App Store details">
                  <img src="/images/app-store.png" alt="Download on the App Store" />
                </Link>
                <Link href="/mobile-app/android" aria-label="Google Play details">
                  <img src="/images/google-play.png" alt="Get it on Google Play" />
                </Link>
              </div>
              <small>*Screen image is simulated. Message and data rates may apply.</small>
            </div>
          </div>
        </div>
      </section>

      <section className="wf-section content-width wf-two-col">
        <div className="wf-panel">
          <h2><Sparkles size={20} style={{ display: "inline", color: "#5a469b" }} /> Interactive Fargo<sup>®</sup> Spending Preview</h2>
          <p className="wf-muted">Switch views just like inside the Wells Fargo Mobile app:</p>
          <div className="wf-pill-row">
            {(["summary", "category", "merchant"] as const).map((t) => (
              <button key={t} type="button" className={fargoTab === t ? "wf-pill active" : "wf-pill"} onClick={() => setFargoTab(t)}>
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          {fargoTab === "summary" && (
            <ul className="wf-breakdown" style={{ marginTop: 18 }}>
              <li><span>Monthly total spent</span><strong>$1,725.34</strong></li>
              <li><span>Change vs. prior month</span><strong className="wf-amt-pos">↓ $1,100.66 saved</strong></li>
              <li><span>Recurring subscriptions detected</span><strong>4 active ($68.96/mo)</strong></li>
              <li><span>Cash flow forecast</span><strong>On track (+$724.66)</strong></li>
            </ul>
          )}
          {fargoTab === "category" && (
            <ul className="wf-breakdown" style={{ marginTop: 18 }}>
              <li><span>Shopping</span><strong>$350.23 (20%)</strong></li>
              <li><span>Food &amp; Drink</span><strong>$325.33 (19%)</strong></li>
              <li><span>Groceries</span><strong>$462.18 (27%)</strong></li>
              <li><span>Travel &amp; Transit</span><strong>$398.40 (23%)</strong></li>
              <li><span>Utilities &amp; Streaming</span><strong>$189.20 (11%)</strong></li>
            </ul>
          )}
          {fargoTab === "merchant" && (
            <ul className="wf-breakdown" style={{ marginTop: 18 }}>
              <li><span>Trader Joe&apos;s (4 visits)</span><strong>$341.90</strong></li>
              <li><span>Delta Air Lines (1 trip)</span><strong>$318.00</strong></li>
              <li><span>Pacific Gas &amp; Electric</span><strong>$138.40</strong></li>
              <li><span>Blue Bottle Coffee (6 visits)</span><strong>$54.25</strong></li>
            </ul>
          )}
        </div>

        <div className="wf-panel wf-panel-subtle">
          <h2>Key mobile features included</h2>
          <ul className="wf-check-list">
            <li><Check size={17} /><span><strong>Mobile Check Deposit:</strong> Snap front and back photos to deposit checks in moments.</span></li>
            <li><Check size={17} /><span><strong>Zelle &amp; Bill Pay:</strong> Send money to friends and family or pay monthly bills on the go.</span></li>
            <li><Check size={17} /><span><strong>Card Controls &amp; Digital Wallets:</strong> Lock/unlock cards and add them directly to {platform === "android" ? "Google Wallet" : "Apple Pay & Google Wallet"}.</span></li>
            <li><Check size={17} /><span><strong>Biometrics &amp; Passkeys:</strong> Sign on in an instant with Face ID, fingerprint, or device passkey.</span></li>
          </ul>
          <div className="wf-hero-actions" style={{ marginTop: 22 }}>
            <Link href="/online-banking/dashboard" className="button button-red">Try Live Online Banking Demo</Link>
            <Link href="/enroll" className="button button-outline">Enroll Now</Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
