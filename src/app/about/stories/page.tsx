"use client";

import { SiteShell } from "@/components/site-shell";
import Link from "next/link";
import { useState } from "react";

const stories = [
  {
    id: "greenhouse",
    category: "Small Business",
    image: "/images/community-greenhouse.png",
    title: "Growing fresh produce and local jobs inside urban greenhouses",
    summary: "How community-led urban growers paired CDFI small business grants with coaching to bring year-round produce to neighborhood grocers.",
    fullText: "Across dozens of metropolitan neighborhoods, local entrepreneurs are transforming vacant parcels into thriving year-round greenhouses. Through Wells Fargo small business grants, mentorship clinics, and flexible SBA working capital, founders have upgraded climate-controlled irrigation, hired local youth apprentices, and expanded weekly farm-stand distribution to thousands of families.",
    date: "Featured Story",
  },
  {
    id: "volunteers",
    category: "Community Impact",
    image: "/images/community-volunteers.jpg",
    title: "Neighbors helping neighbors: Mobile food pantries reach 120+ cities",
    summary: "Thousands of Wells Fargo team members volunteer every month to pack and distribute fresh groceries alongside regional food banks.",
    fullText: "Every weekend, employee volunteer chapters team up with Feeding America partner food banks to run drive-through distribution hubs. Beyond packing nutritious produce boxes, local branches host free financial health workshops and help families connect with low-cost, no-overdraft-fee banking tools.",
    date: "Community Spotlight",
  },
  {
    id: "housing",
    category: "Housing Access",
    image: "/images/borrowing.jpg",
    title: "Opening doors for first-generation homebuyers",
    summary: "Down payment assistance grants, closing cost credits, and housing counselor partnerships help renters become long-term homeowners.",
    fullText: "Saving for upfront closing costs remains the single biggest hurdle for first-time buyers. By pairing 3% down Dream. Plan. Home. mortgages with up to $10,000 in Homebuyer Access grants in eligible communities and nonprofit homebuyer education, families are building lasting generational home equity.",
    date: "Housing Affordability",
  },
  {
    id: "financial-health",
    category: "Financial Health",
    image: "/images/financial-goals.jpg",
    title: "How small automated habits build resilient emergency savings",
    summary: "New coaching tools help everyday savers turn modest weekly transfers into three months of peace-of-mind reserves.",
    fullText: "Financial confidence rarely happens overnight—it builds one paycheck at a time. Customers combining automated Way2Save transfers with Fargo monthly category insights report spotting unused recurring bills earlier and staying consistent toward emergency fund and debt-payoff goals.",
    date: "Financial Guidance",
  },
];

const categories = ["All Stories", "Community Impact", "Small Business", "Housing Access", "Financial Health"];

export default function StoriesPage() {
  const [filter, setFilter] = useState("All Stories");
  const [openId, setOpenId] = useState<string | null>("greenhouse");
  const visible = filter === "All Stories" ? stories : stories.filter((s) => s.category === filter);

  return (
    <SiteShell>
      <section className="wf-page-hero wf-hero-warm">
        <div className="content-width wf-page-hero-inner">
          <div className="wf-page-hero-copy">
            <span className="wf-eyebrow">Wells Fargo Stories</span>
            <h1>Why we&apos;re committed to communities</h1>
            <p>
              We don&apos;t just serve our communities—we are our communities. Read how employees, nonprofit partners,
              and customers across the country are building stronger neighborhoods together.
            </p>
            <div className="wf-pill-row">
              {categories.map((cat) => (
                <button key={cat} type="button" className={filter === cat ? "wf-pill active" : "wf-pill"} onClick={() => setFilter(cat)}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="wf-section content-width">
        <div className="community-grid">
          {visible.map((story) => {
            const expanded = openId === story.id;
            return (
              <article key={story.id} className="community-card">
                <img src={story.image} alt={story.title} width="616" height="353" />
                <div>
                  <span className="wf-badge">{story.category} • {story.date}</span>
                  <h3>{story.title}</h3>
                  <p>{expanded ? story.fullText : story.summary}</p>
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => setOpenId(expanded ? null : story.id)}
                  >
                    {expanded ? "Show summary" : "Read full story"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="wf-related-grid" style={{ marginTop: 48 }}>
          <Link href="/about" className="wf-related-card">
            <h3>About Wells Fargo</h3>
            <p>Explore our company history, business segments, and community pillars.</p>
          </Link>
          <Link href="/about/diversity" className="wf-related-card">
            <h3>Diversity &amp; Accessibility</h3>
            <p>See how we champion inclusion and accessible banking nationwide.</p>
          </Link>
          <Link href="/about/careers" className="wf-related-card">
            <h3>Join Our Team</h3>
            <p>Browse open roles and employee benefits across Wells Fargo.</p>
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
