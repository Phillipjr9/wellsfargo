"use client";

import { InteractiveTool, type CalculatorType } from "@/components/calculators";
import { InquiryModal } from "@/components/inquiry-modal";
import { SiteShell } from "@/components/site-shell";
import { ArrowRight, Check, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export type ProductCardSpec = {
  badge?: string;
  title: string;
  highlight: string;
  highlightLabel?: string;
  description: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref?: string;
  applyProduct?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export type PageSpec = {
  slug: string;
  category: string;
  breadcrumbs: { label: string; href: string }[];
  title: string;
  subtitle: string;
  heroImage?: string;
  heroTheme?: "light" | "crimson" | "plum" | "warm";
  primaryCta: { label: string; href?: string; applyProduct?: string };
  secondaryCta?: { label: string; href?: string; applyProduct?: string };
  stats?: { value: string; label: string }[];
  productsHeading?: string;
  productsSubheading?: string;
  products?: ProductCardSpec[];
  comparison?: {
    heading: string;
    columns: string[];
    rows: string[][];
  };
  calculator?: CalculatorType;
  sections?: {
    heading: string;
    body: string;
    bullets?: string[];
    linkLabel?: string;
    linkHref?: string;
  }[];
  faqs?: { question: string; answer: string }[];
  relatedLinks: { title: string; description: string; href: string }[];
  disclosures?: string[];
};

export function PageTemplate({ page }: { page: PageSpec }) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [modalProduct, setModalProduct] = useState<string | null>(null);
  const theme = page.heroTheme ?? "warm";

  return (
    <SiteShell>
      <div className="wf-breadcrumb-bar">
        <nav className="content-width wf-breadcrumbs" aria-label="Breadcrumb">
          {page.breadcrumbs.map((crumb, idx) => (
            <span key={crumb.href + crumb.label}>
              <Link href={crumb.href}>{crumb.label}</Link>
              {idx < page.breadcrumbs.length - 1 && <ChevronRight size={14} />}
            </span>
          ))}
          <ChevronRight size={14} />
          <span className="wf-crumb-current">{page.title}</span>
        </nav>
      </div>

      <section className={`wf-page-hero wf-hero-${theme}`}>
        <div className={`content-width wf-page-hero-inner ${page.heroImage ? "with-image" : ""}`}>
          <div className="wf-page-hero-copy">
            <span className="wf-eyebrow">{page.category}</span>
            <h1>{page.title}</h1>
            <p>{page.subtitle}</p>
            <div className="wf-hero-actions">
              {page.primaryCta.applyProduct ? (
                <button
                  type="button"
                  className="button button-red"
                  onClick={() => setModalProduct(page.primaryCta.applyProduct ?? page.title)}
                >
                  {page.primaryCta.label}
                </button>
              ) : (
                <Link href={page.primaryCta.href ?? "/appointments"} className="button button-red">
                  {page.primaryCta.label}
                </Link>
              )}
              {page.secondaryCta &&
                (page.secondaryCta.applyProduct ? (
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => setModalProduct(page.secondaryCta?.applyProduct ?? page.title)}
                  >
                    {page.secondaryCta.label}
                  </button>
                ) : (
                  <Link href={page.secondaryCta.href ?? "/help"} className="button button-outline">
                    {page.secondaryCta.label}
                  </Link>
                ))}
            </div>
          </div>
          {page.heroImage && (
            <div className="wf-page-hero-media">
              <img src={page.heroImage} alt={page.title} />
            </div>
          )}
        </div>
      </section>

      {page.stats && page.stats.length > 0 && (
        <section className="wf-stats-band">
          <div className="content-width wf-stats-grid">
            {page.stats.map((stat) => (
              <div key={stat.label} className="wf-stat-item">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {page.products && page.products.length > 0 && (
        <section className="wf-section content-width">
          {page.productsHeading && (
            <div className="section-heading">
              <span className="accent-line" />
              <h2>{page.productsHeading}</h2>
              {page.productsSubheading && <p>{page.productsSubheading}</p>}
            </div>
          )}
          <div className={`wf-product-grid cols-${Math.min(page.products.length, 3)}`}>
            {page.products.map((product) => (
              <article key={product.title} className="wf-product-card">
                {product.badge && <span className="wf-badge">{product.badge}</span>}
                <h3>{product.title}</h3>
                <div className="wf-product-highlight">
                  <strong>{product.highlight}</strong>
                  {product.highlightLabel && <span>{product.highlightLabel}</span>}
                </div>
                <p className="wf-product-desc">{product.description}</p>
                <ul className="wf-check-list">
                  {product.bullets.map((bullet) => (
                    <li key={bullet}>
                      <Check size={16} />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                <div className="wf-product-actions">
                  {product.applyProduct ? (
                    <button
                      type="button"
                      className="button button-red"
                      onClick={() => setModalProduct(product.applyProduct ?? product.title)}
                    >
                      {product.ctaLabel}
                    </button>
                  ) : (
                    <Link href={product.ctaHref ?? "/appointments"} className="button button-red">
                      {product.ctaLabel}
                    </Link>
                  )}
                  {product.secondaryLabel && product.secondaryHref && (
                    <Link href={product.secondaryHref} className="wf-text-cta">
                      {product.secondaryLabel} <ChevronRight size={16} />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {page.calculator && (
        <section className="wf-section wf-section-alt">
          <div className="content-width">
            <InteractiveTool type={page.calculator} />
          </div>
        </section>
      )}

      {page.comparison && (
        <section className="wf-section content-width">
          <div className="section-heading">
            <span className="accent-line" />
            <h2>{page.comparison.heading}</h2>
          </div>
          <div className="wf-table-wrap">
            <table className="wf-table">
              <thead>
                <tr>
                  {page.comparison.columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {page.comparison.rows.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, cellIdx) => (
                      <td key={row[0] + cellIdx}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {page.sections && page.sections.length > 0 && (
        <section className="wf-section content-width">
          <div className="wf-info-grid">
            {page.sections.map((sec) => (
              <article key={sec.heading} className="wf-info-card">
                <h3>{sec.heading}</h3>
                <p>{sec.body}</p>
                {sec.bullets && (
                  <ul className="wf-check-list">
                    {sec.bullets.map((b) => (
                      <li key={b}>
                        <Check size={16} />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {sec.linkLabel && sec.linkHref && (
                  <Link href={sec.linkHref} className="wf-text-cta">
                    {sec.linkLabel} <ArrowRight size={16} />
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {page.faqs && page.faqs.length > 0 && (
        <section className="wf-section wf-section-alt">
          <div className="content-width wf-faq-container">
            <div className="section-heading">
              <span className="accent-line" />
              <h2>Frequently asked questions</h2>
            </div>
            <div className="wf-faq-list">
              {page.faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={faq.question} className="wf-faq-item">
                    <button
                      type="button"
                      className="wf-faq-trigger"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                    >
                      <span>{faq.question}</span>
                      <ChevronDown size={20} className={isOpen ? "rotated" : ""} />
                    </button>
                    {isOpen && <div className="wf-faq-answer">{faq.answer}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="wf-section content-width">
        <div className="section-heading">
          <span className="accent-line" />
          <h2>Related resources &amp; next steps</h2>
        </div>
        <div className="wf-related-grid">
          {page.relatedLinks.map((rel) => (
            <Link key={rel.href + rel.title} href={rel.href} className="wf-related-card">
              <h3>{rel.title}</h3>
              <p>{rel.description}</p>
              <span className="wf-text-cta">
                Explore <ArrowRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {page.disclosures && page.disclosures.length > 0 && (
        <section className="content-width wf-disclosures" aria-label="Important disclosures">
          <h4>Important Information &amp; Disclosures</h4>
          <ol>
            {page.disclosures.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ol>
        </section>
      )}

      {modalProduct && (
        <InquiryModal productName={modalProduct} category={page.category} onClose={() => setModalProduct(null)} />
      )}
    </SiteShell>
  );
}
