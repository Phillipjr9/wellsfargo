import { SiteShell } from "@/components/site-shell";
import { sitemapSections } from "@/lib/navigation";
import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sitemap — All Wells Fargo Pages & Banking Services | Wells Fargo",
  description: "Complete directory of personal banking, credit cards, mortgages, investing, business, commercial, CIB, support, and privacy pages.",
};

export default function SitemapPage() {
  const totalPages = sitemapSections.reduce((sum, s) => sum + s.links.length, 0);

  return (
    <SiteShell>
      <section className="wf-page-hero wf-hero-warm">
        <div className="content-width wf-page-hero-inner">
          <div className="wf-page-hero-copy">
            <span className="wf-eyebrow">Wells Fargo Directory</span>
            <h1>Personal &amp; Enterprise Sitemap</h1>
            <p>
              Explore all {totalPages} pages, calculators, rate tables, branch tools, and banking services across our
              site.
            </p>
          </div>
        </div>
      </section>

      <section className="wf-section content-width">
        <div className="wf-sitemap-grid">
          {sitemapSections.map((group) => (
            <div key={group.heading} className="wf-sitemap-card">
              <h2>{group.heading}</h2>
              <p className="wf-muted">{group.description}</p>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link href={link.href}>
                      <span>{link.label}</span>
                      <ChevronRight size={15} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
