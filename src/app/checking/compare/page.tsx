"use client";

import { InquiryModal } from "@/components/inquiry-modal";
import { SiteShell } from "@/components/site-shell";
import { Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const tiers = [
  {
    key: "clear",
    name: "Clear Access Banking",
    tag: "Checkless • $0 Overdraft Fees",
    fee: "$5/mo",
    waiver: "$0 for primary account owners ages 13–24 or linked qualifying military direct deposit",
    minOpen: "$25",
    interest: "No",
    overdraft: "$0 overdraft or NSF fees",
    checks: "No paper checks (debit, Zelle & Bill Pay included)",
    atms: "$0 at 11,000+ Wells Fargo ATMs",
  },
  {
    key: "everyday",
    name: "Everyday Checking",
    tag: "Most Popular Everyday Fit",
    fee: "$10/mo",
    waiver: "$0 with $500+ monthly direct deposits, $500 min daily balance, ages 17–24, or Campus Card",
    minOpen: "$25",
    interest: "No",
    overdraft: "Overdraft Rewind & Extra Day Grace Period",
    checks: "Full check-writing enabled",
    atms: "$0 at 11,000+ Wells Fargo ATMs",
  },
  {
    key: "prime",
    name: "Prime Checking",
    tag: "Interest + Relationship Perks",
    fee: "$25/mo",
    waiver: "$0 with $20,000+ in qualifying linked bank deposit balances",
    minOpen: "$25",
    interest: "Yes — variable tiered interest",
    overdraft: "Overdraft Rewind & Extra Day Grace Period",
    checks: "Standard personal checks at $0 fee",
    atms: "$0 Wells Fargo fee at non-WF U.S. ATMs",
  },
  {
    key: "premier",
    name: "Premier Checking",
    tag: "Highest Relationship Tier",
    fee: "$35/mo",
    waiver: "$0 with $250,000+ in qualifying linked bank and investment balances",
    minOpen: "$25",
    interest: "Yes — Premier relationship rates",
    overdraft: "Overdraft Rewind & Extra Day Grace Period",
    checks: "Personal checks, cashier's checks & money orders included",
    atms: "$0 worldwide + non-WF ATM fee reimbursements",
  },
];

const goals = [
  { id: "all", label: "Show all 4 accounts", recommended: "everyday" },
  { id: "daily", label: "Simple everyday direct deposit", recommended: "everyday" },
  { id: "no-od", label: "Avoid overdraft fees / teen or student", recommended: "clear" },
  { id: "interest", label: "Earn interest on $20K+ balances", recommended: "prime" },
  { id: "wealth", label: "Premier banking & investing ($250K+)", recommended: "premier" },
];

export default function CompareCheckingPage() {
  const [goal, setGoal] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const recommendedKey = goals.find((g) => g.id === goal)?.recommended ?? "everyday";

  return (
    <SiteShell>
      <section className="wf-page-hero wf-hero-warm">
        <div className="content-width wf-page-hero-inner with-image">
          <div className="wf-page-hero-copy">
            <span className="wf-eyebrow">Find Your Checking Fit</span>
            <h1>Checking that fits perfectly</h1>
            <p>
              Select what matters most to your lifestyle below to highlight your best match, compare all four checking
              accounts side by side, and open online with as little as $25.
            </p>
            <div className="wf-pill-row">
              {goals.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={goal === g.id ? "wf-pill active" : "wf-pill"}
                  onClick={() => setGoal(g.id)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div className="wf-page-hero-media">
            <img src="/images/checking-hero.jpg" alt="Compare Wells Fargo checking accounts" />
          </div>
        </div>
      </section>

      <section className="wf-section content-width">
        <div className="wf-compare-cards">
          {tiers.map((tier) => {
            const isMatch = tier.key === recommendedKey;
            return (
              <article key={tier.key} className={isMatch ? "wf-product-card wf-card-featured" : "wf-product-card"}>
                {isMatch ? (
                  <span className="wf-badge wf-badge-red">
                    <Sparkles size={13} /> Recommended Fit
                  </span>
                ) : (
                  <span className="wf-badge">{tier.tag}</span>
                )}
                <h3>{tier.name}</h3>
                <div className="wf-product-highlight">
                  <strong>{tier.fee}</strong>
                  <span>Monthly service fee</span>
                </div>
                <p className="wf-product-desc">{tier.waiver}</p>
                <ul className="wf-check-list">
                  <li><Check size={16} /><span><strong>Min to open:</strong> {tier.minOpen}</span></li>
                  <li><Check size={16} /><span><strong>Earns interest:</strong> {tier.interest}</span></li>
                  <li><Check size={16} /><span><strong>Overdraft:</strong> {tier.overdraft}</span></li>
                  <li><Check size={16} /><span><strong>Checks:</strong> {tier.checks}</span></li>
                  <li><Check size={16} /><span><strong>ATMs:</strong> {tier.atms}</span></li>
                </ul>
                <div className="wf-product-actions">
                  <button
                    type="button"
                    className="button button-red"
                    onClick={() => setSelectedProduct(tier.name)}
                  >
                    Open now
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="wf-related-grid" style={{ marginTop: 48 }}>
          <Link href="/checking" className="wf-related-card">
            <h3>Checking Overview &amp; FAQs</h3>
            <p>Learn about Early Pay Day, mobile deposit, and debit card controls.</p>
          </Link>
          <Link href="/savings-cds" className="wf-related-card">
            <h3>Add a Savings Account</h3>
            <p>Pair your checking account with Way2Save or Platinum Savings.</p>
          </Link>
          <Link href="/appointments" className="wf-related-card">
            <h3>Open in a Local Branch</h3>
            <p>Schedule an appointment to sit down with a personal banker.</p>
          </Link>
        </div>
      </section>

      {selectedProduct && (
        <InquiryModal
          productName={selectedProduct}
          category="Checking Account Application"
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </SiteShell>
  );
}
