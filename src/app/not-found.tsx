import { SiteShell } from "@/components/site-shell";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <SiteShell>
      <section className="wf-page-hero wf-hero-warm">
        <div className="content-width wf-page-hero-inner">
          <div className="wf-page-hero-copy">
            <span className="wf-eyebrow">Wells Fargo</span>
            <h1>We couldn&apos;t find the page you requested</h1>
            <p>
              The link may have changed or been mistyped. Return to Personal Banking or explore every available page in
              our complete Sitemap.
            </p>
            <div className="wf-hero-actions">
              <Link href="/" className="button button-red">
                Return to Home Page
              </Link>
              <Link href="/sitemap" className="button button-outline">
                Browse Full Sitemap
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
