"use client";

import { InteractiveTool } from "@/components/calculators";
import { SiteShell } from "@/components/site-shell";
import Link from "next/link";
import { useEffect, useState } from "react";

type RateRow = string[];

type PublishedRates = {
  mortgage?: { product: string; purpose: string; rate: string; apr: string; points: string }[];
  savings?: { product: string; standard: string; relationship: string; minimum: string }[];
  loans?: { product: string; intro: string; range: string; terms: string }[];
};

const fallback: PublishedRates = {
  mortgage: [
    { product: "30-Year Fixed-Rate Conforming", purpose: "Purchase", rate: "6.375%", apr: "6.512% APR", points: "0.875" },
    { product: "15-Year Fixed-Rate Conforming", purpose: "Purchase", rate: "5.625%", apr: "5.845% APR", points: "0.750" },
    { product: "30-Year Fixed-Rate FHA", purpose: "Purchase", rate: "6.000%", apr: "6.790% APR", points: "0.875" },
    { product: "30-Year Fixed-Rate VA", purpose: "Purchase", rate: "5.875%", apr: "6.165% APR", points: "0.750" },
    { product: "30-Year Fixed-Rate Jumbo", purpose: "Purchase", rate: "6.500%", apr: "6.604% APR", points: "0.625" },
    { product: "30-Year Fixed-Rate Conforming", purpose: "Refinance", rate: "6.500%", apr: "6.630% APR", points: "0.875" },
  ],
  savings: [
    { product: "4-Month Special Fixed Rate CD", standard: "3.75% APY", relationship: "4.00% APY", minimum: "$5,000" },
    { product: "7-Month Special Fixed Rate CD", standard: "3.65% APY", relationship: "3.90% APY", minimum: "$5,000" },
    { product: "11-Month Special Fixed Rate CD", standard: "3.50% APY", relationship: "3.75% APY", minimum: "$5,000" },
    { product: "1-Year Standard Fixed Rate CD", standard: "1.50% APY", relationship: "1.75% APY", minimum: "$2,500" },
    { product: "Platinum Savings ($100K+)", standard: "0.25% APY", relationship: "2.50% APY", minimum: "$25" },
    { product: "Way2Save® Savings", standard: "0.01% APY", relationship: "0.15% APY", minimum: "$25" },
  ],
  loans: [
    { product: "Personal Loan ($3,000–$9,999)", intro: "Fixed Rate", range: "7.49%–23.99% APR", terms: "12–60 months" },
    { product: "Personal Loan ($10,000–$100,000)", intro: "Fixed Rate", range: "6.74%–21.99% APR", terms: "12–84 months" },
    { product: "Wells Fargo Reflect® Card", intro: "0% intro APR 21 mo", range: "17.24%–28.99% Variable", terms: "$0 annual fee" },
    { product: "Wells Fargo Active Cash® Card", intro: "0% intro APR 12 mo", range: "19.24%–29.24% Variable", terms: "Unlimited 2% cash" },
    { product: "Wells Fargo Autograph® Card", intro: "0% intro APR 12 mo", range: "19.24%–29.24% Variable", terms: "3X everyday points" },
  ],
};

const cardRows: RateRow[] = [
  ["Wells Fargo Autograph® Card", "0% Intro APR (12 mo purchases)", "19.24%–29.24% Var APR", "$0 annual fee • 20,000 bonus pts"],
  ["Wells Fargo Active Cash® Card", "0% Intro APR (12 mo purch & BT)", "19.24%–29.24% Var APR", "$0 annual fee • Unlimited 2% cash"],
  ["Wells Fargo Reflect® Card", "0% Intro APR (21 mo purch & BT)", "17.24%–28.99% Var APR", "$0 annual fee • Longest intro APR"],
  ["Autograph Journey℠ Card", "60,000 bonus points", "20.24%–29.24% Var APR", "$95 annual fee • 5X hotels / 4X airlines"],
];

export default function RatesHubPage() {
  const [activeId, setActiveId] = useState("mortgage");
  const [zip, setZip] = useState("94104");
  const [published, setPublished] = useState<PublishedRates>(fallback);
  const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    fetch("/api/content/rates")
      .then((res) => res.json())
      .then((data: { rates?: PublishedRates | null; updatedAt?: string }) => {
        if (data.rates) setPublished({ ...fallback, ...data.rates });
        if (data.updatedAt) setUpdatedAt(data.updatedAt);
      })
      .catch(() => {});
  }, []);

  const tabs = [
    {
      id: "mortgage",
      label: "Mortgage Rates",
      ctaLabel: "Full mortgage page",
      ctaHref: "/mortgage",
      calc: "mortgage" as const,
      head: ["Loan Product", "Purpose", "Interest Rate", "APR", "Discount Points"],
      rows: (published.mortgage ?? []).map((r) => [r.product, r.purpose, r.rate, r.apr, r.points]),
    },
    {
      id: "savings",
      label: "Savings & CDs",
      ctaLabel: "Savings & CDs page",
      ctaHref: "/savings-cds",
      calc: "savings" as const,
      head: ["Product / Term", "Standard APY", "Relationship APY", "Minimum Deposit"],
      rows: (published.savings ?? []).map((r) => [r.product, r.standard, r.relationship, r.minimum]),
    },
    {
      id: "cards",
      label: "Credit Cards",
      ctaLabel: "Compare credit cards",
      ctaHref: "/credit-cards",
      calc: "rewards" as const,
      head: ["Card", "Intro Offer", "Variable APR", "Key Benefits"],
      rows: cardRows,
    },
    {
      id: "loans",
      label: "Personal & Auto Loans",
      ctaLabel: "Explore personal loans",
      ctaHref: "/personal-loans",
      calc: "personal-loan" as const,
      head: ["Product", "Intro / Rate Type", "APR Range", "Terms"],
      rows: (published.loans ?? []).map((r) => [r.product, r.intro, r.range, r.terms]),
    },
  ];

  const current = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <SiteShell>
      <section className="wf-page-hero wf-hero-warm">
        <div className="content-width wf-page-hero-inner">
          <div className="wf-page-hero-copy">
            <span className="wf-eyebrow">Interest Rates Today</span>
            <h1>Check today&apos;s interest rates &amp; APYs</h1>
            <p>
              Review current deposit yields, mortgage rates, credit card APRs and fixed loan rates. Rate tables are
              published from our enterprise operations console.
            </p>
            <div className="wf-zip-inline">
              <label htmlFor="rate-zip">Showing rates for ZIP code:</label>
              <input id="rate-zip" value={zip} maxLength={10} onChange={(e) => setZip(e.target.value)} />
              {updatedAt && <small className="wf-muted">Last published {new Date(updatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</small>}
            </div>
            <div className="wf-pill-row">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={tab.id === activeId ? "wf-pill active" : "wf-pill"}
                  onClick={() => setActiveId(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="wf-section content-width">
        <div className="wf-results-meta">
          <h2>
            {current.label} (ZIP {zip || "94104"})
          </h2>
          <Link href={current.ctaHref} className="button button-outline">
            {current.ctaLabel}
          </Link>
        </div>
        <div className="wf-table-wrap">
          <table className="wf-table">
            <thead>
              <tr>
                {current.head.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {current.rows.map((r) => (
                <tr key={r[0] + r[1]}>
                  {r.map((cell, i) => (
                    <td key={i}>{i === 0 ? <strong>{cell}</strong> : cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="wf-section wf-section-alt">
        <div className="content-width">
          <InteractiveTool type={current.calc} />
        </div>
      </section>
    </SiteShell>
  );
}
