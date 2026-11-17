"use client";

import { SignOnCard } from "@/components/sign-on-card";
import { SiteShell } from "@/components/site-shell";
import { customerSignIn, goToWithToken } from "@/lib/client-auth";
import {
  ArrowRight,
  BookOpen,
  CarFront,
  ChevronRight,
  CreditCard,
  House,
  PiggyBank,
  ShieldCheck,
  Star,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const quickLinks: { label: string; href: string; icon: LucideIcon; img: string }[] = [
  { label: "Checking", href: "/checking", icon: Wallet, img: "/images/icon-checking.png" },
  { label: "Savings & CDs", href: "/savings-cds", icon: PiggyBank, img: "/images/icon-home.png" },
  { label: "Credit Cards", href: "/credit-cards", icon: CreditCard, img: "/images/icon-card.png" },
  { label: "Home Loans", href: "/mortgage", icon: House, img: "/images/icon-home.png" },
  { label: "Personal Loans", href: "/personal-loans", icon: Wallet, img: "/images/icon-card.png" },
  { label: "Auto Loans", href: "/auto-loans", icon: CarFront, img: "/images/icon-card.png" },
  { label: "Investing", href: "/investing-wealth", icon: TrendingUp, img: "/images/icon-card.png" },
  { label: "Premier", href: "/premier", icon: Star, img: "/images/icon-card.png" },
  { label: "Financial Guidance", href: "/financial-guidance", icon: BookOpen, img: "/images/icon-home.png" },
];

const guidanceCards = [
  {
    image: "/images/financial-goals.jpg",
    title: "See your path forward",
    description: "Build a plan around what matters to you",
    action: "Start now",
    href: "/financial-goals",
  },
  {
    image: "/images/borrowing.jpg",
    title: "Borrowing that fits your life",
    description: "See options and take the next step toward your goal",
    action: "Explore options",
    href: "/financial-goals/borrow",
  },
  {
    image: "/images/security.jpg",
    title: "Stay up to date on security",
    description: "Get the latest tips to help keep your accounts safe",
    action: "Get security tips",
    href: "/privacy-security/security-tips",
  },
];

function RatesCard() {
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState("/mortgage/rates");

  return (
    <article className="feature-card rates-card">
      <div className="feature-card-content">
        <div className="feature-icon rates-icon">
          <TrendingUp size={39} strokeWidth={1.55} />
        </div>
        <h2>Interest rates today</h2>
        <p>See current rates and find the right options for you</p>
        {open && (
          <div className="rates-chooser">
            <label htmlFor="rate-type">Check rates</label>
            <div>
              <select id="rate-type" value={rate} onChange={(event) => setRate(event.target.value)}>
                <option value="/mortgage/rates">Mortgage rates</option>
                <option value="/savings-cds/rates">Savings and CDs rates</option>
                <option value="/credit-cards">Credit card rates</option>
                <option value="/personal-loans">Personal loan rates</option>
                <option value="/help/rates">All rates</option>
              </select>
              <Link href={rate}>Go</Link>
            </div>
          </div>
        )}
        <button type="button" className="feature-link" onClick={() => setOpen(!open)} aria-expanded={open}>
          Check rates <ChevronRight size={18} />
        </button>
      </div>
    </article>
  );
}

export default function HomeClient() {
  const [demoBusy, setDemoBusy] = useState(false);

  async function oneClickSignIn() {
    setDemoBusy(true);
    try {
      const { ok, data } = await customerSignIn({ action: "demo", username: "henry_carter" });
      if (!ok) throw new Error("Sign-in failed");
      goToWithToken("/online-banking/dashboard", typeof data.token === "string" ? data.token : undefined);
    } catch {
      window.location.assign("/sign-on");
    }
  }

  return (
    <SiteShell isHome>
      <section className="hero-section content-width" aria-labelledby="hero-heading">
              <img
                className="hero-image"
                src="/images/checking-hero.jpg"
                alt="Smartphone displaying Wells Fargo mobile banking"
                width="1700"
                height="700"
                loading="lazy"
              />
        <SignOnCard className="hero-signin" showDemoHelper={false} />
        <div className="hero-copy">
          <h1 id="hero-heading">Checking that fits perfectly</h1>
          <p>Explore all the benefits then find a checking account that suits your lifestyle</p>
          <Link className="button button-outline hero-cta" href="/checking/compare">
            Find your fit <ChevronRight size={19} strokeWidth={2.1} />
          </Link>
        </div>
      </section>

      <div className="demo-credential-bar content-width">
        <span>
          <ShieldCheck size={17} /> <strong>Demo sign-on:</strong> username <code>henry_carter</code> · password{" "}
          <code>demo1234</code>
        </span>
        <div className="demo-credential-actions">
          <button type="button" onClick={() => void oneClickSignIn()} disabled={demoBusy}>
            {demoBusy ? "Signing in…" : "One-click demo sign in"}
          </button>
          <Link href="/online-banking/dashboard">Open user dashboard →</Link>
          <Link href="/sign-on">Full sign-on page</Link>
          <Link href="/admin/login">Super Admin</Link>
        </div>
      </div>

      <nav className="mobile-quicklinks" aria-label="Popular banking services">
        {quickLinks.map(({ label, href, img }) => (
          <Link key={href} href={href}>
            <img src={img} alt="" width="31" height="31" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <section className="feature-grid content-width" aria-label="Explore Wells Fargo products">
        <article className="feature-card feature-mortgage">
          <div className="feature-card-content">
            <img loading="lazy" className="feature-icon" src="/images/icon-home.png" alt="" width="64" height="64" />
            <h2>Find mortgage happiness</h2>
            <p>With a down payment as low as 3%</p>
            <Link className="feature-link" href="/mortgage/buying-a-house">
              Learn more <ChevronRight size={18} />
            </Link>
          </div>
        </article>
        <article className="feature-card feature-checking">
          <div className="feature-card-content">
            <img loading="lazy" className="feature-icon" src="/images/icon-checking.png" alt="" width="64" height="64" />
            <h2>Check all the boxes on checking</h2>
            <p>Discover checking options with the right benefits and features for your goals</p>
            <Link className="feature-link" href="/checking/compare">
              Explore options <ChevronRight size={18} />
            </Link>
          </div>
        </article>
        <article className="feature-card feature-credit">
          <div className="feature-card-content">
            <img loading="lazy" className="feature-icon" src="/images/icon-card.png" alt="" width="64" height="64" />
            <h2>Find a credit card</h2>
            <p>Low intro rate, cash back, rewards and more</p>
            <Link className="feature-link" href="/credit-cards">
              Learn more <ChevronRight size={18} />
            </Link>
          </div>
        </article>
        <RatesCard />
      </section>

      <section className="credit-banner content-width" aria-labelledby="credit-heading">
        <img
          src="/images/autograph-banner.jpg"
          alt="Wells Fargo Autograph Visa card with 20,000 bonus points"
          width="1600"
          height="700"
        />
        <div className="credit-banner-copy">
          <h2 id="credit-heading">Earn 20,000 bonus points</h2>
          <p>Earn 3X points on dining, travel, popular streaming services &amp; more. Terms apply.</p>
          <Link className="button button-outline" href="/credit-cards/autograph">
            Learn more
          </Link>
        </div>
      </section>

      <section className="guidance-section content-width" aria-labelledby="guidance-heading">
        <div className="section-heading">
          <span className="accent-line" />
          <h2 id="guidance-heading">Financial guidance and support</h2>
        </div>
        <div className="guidance-grid">
          {guidanceCards.map((card) => (
            <article className="guidance-card" key={card.title}>
              <img loading="lazy" src={card.image} alt="" width="616" height="353" />
              <div className="guidance-card-body">
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <Link className="button button-outline" href={card.href}>
                  {card.action}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="app-section" aria-labelledby="app-heading">
        <div className="app-section-inner content-width">
          <div className="app-device">
            <img loading="lazy" src="/images/fargo-app.png" alt="Fargo mobile app showing spending insights" width="286" height="580" />
          </div>
          <div className="app-copy">
            <h2 id="app-heading">
              Need help? Ask Fargo<sup>®</sup>
            </h2>
            <p>
              Fargo<sup>1</sup> gives you valuable insights like a summary of your spending by category, retailer and
              across accounts. Find it only in the{" "}
              <Link href="/mobile-app" className="wf-inline-link">
                Wells Fargo Mobile<sup>®</sup> app
              </Link>
              .
            </p>
            <div className="app-download">
              <h3>
                Download the Wells Fargo Mobile<sup>®</sup> app
              </h3>
              <div className="store-buttons">
                <Link href="/mobile-app/ios" aria-label="Download on the App Store">
                  <img loading="lazy" src="/images/app-store.png" alt="Download on the App Store" />
                </Link>
                <Link href="/mobile-app/android" aria-label="Get it on Google Play">
                  <img loading="lazy" src="/images/google-play.png" alt="Get it on Google Play" />
                </Link>
              </div>
              <small>*Screen image is simulated</small>
            </div>
          </div>
        </div>
      </section>

      <section className="community-section content-width" aria-labelledby="community-heading">
        <div className="section-heading">
          <span className="accent-line" />
          <h2 id="community-heading">Serving our customers and communities</h2>
          <p>
            It doesn&apos;t happen with one transaction, in one day on the job, or in one quarter. It&apos;s earned
            relationship by relationship.
          </p>
        </div>
        <div className="community-grid">
          <article className="community-card">
            <img
              src="/images/community-volunteers.jpg"
              alt="Wells Fargo volunteers serving their community"
              width="616"
              height="353"
            />
            <div>
              <h3>Who we are</h3>
              <p>
                Wells Fargo helps strengthen communities through inclusion, economic empowerment, and sustainability.
              </p>
              <Link href="/about">
                About Wells Fargo <ArrowRight size={18} />
              </Link>
            </div>
          </article>
          <article className="community-card">
            <img
              src="/images/community-greenhouse.png"
              alt="Community members working together in a greenhouse"
              width="616"
              height="353"
            />
            <div>
              <h3>Why we&apos;re committed to communities</h3>
              <p>
                We don&apos;t just serve our communities—we are our communities. We&apos;re committed to helping
                customers and neighborhoods across the country thrive.
              </p>
              <Link href="/about/stories">
                Wells Fargo Stories <ArrowRight size={18} />
              </Link>
            </div>
          </article>
        </div>
      </section>
    </SiteShell>
  );
}
