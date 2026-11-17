"use client";

import { InquiryModal } from "@/components/inquiry-modal";
import { SiteShell } from "@/components/site-shell";
import { Briefcase, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const roles = [
  { id: "R-48201", title: "Senior Software Engineer — Digital Banking", dept: "Technology", loc: "San Francisco, CA / Charlotte, NC (Hybrid)", type: "Full-time" },
  { id: "R-48214", title: "Personal Banker (SAFE) — Branch Network", dept: "Consumer Banking", loc: "Dallas, TX / Phoenix, AZ", type: "Full-time" },
  { id: "R-48229", title: "Premier Relationship Banker", dept: "Consumer Banking", loc: "New York, NY / Miami, FL", type: "Full-time" },
  { id: "R-48242", title: "Financial Advisor Associate", dept: "Wealth & Investing", loc: "Chicago, IL / Los Angeles, CA", type: "Full-time" },
  { id: "R-48256", title: "Commercial Banking Portfolio Manager", dept: "Commercial & CIB", loc: "Charlotte, NC / Atlanta, GA", type: "Full-time" },
  { id: "R-48270", title: "Cybersecurity & Fraud Analytics Specialist", dept: "Risk & Operations", loc: "Minneapolis, MN / Dallas, TX", type: "Full-time" },
  { id: "R-48288", title: "Investment Banking Analyst Program", dept: "Commercial & CIB", loc: "New York, NY / San Francisco, CA", type: "Early Careers" },
  { id: "R-48295", title: "AI & Machine Learning Engineer — Fargo Assistant", dept: "Technology", loc: "San Francisco, CA / Seattle, WA", type: "Full-time" },
];

const depts = ["All Teams", "Technology", "Consumer Banking", "Wealth & Investing", "Commercial & CIB", "Risk & Operations"];

export default function CareersPage() {
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("All Teams");
  const [applyingRole, setApplyingRole] = useState<string | null>(null);

  const filtered = roles.filter((r) => {
    const matchDept = dept === "All Teams" || r.dept === dept;
    const matchQ =
      !query.trim() ||
      `${r.title} ${r.dept} ${r.loc} ${r.type}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchDept && matchQ;
  });

  return (
    <SiteShell>
      <section className="wf-page-hero wf-hero-warm">
        <div className="content-width wf-page-hero-inner">
          <div className="wf-page-hero-copy">
            <span className="wf-eyebrow">Careers at Wells Fargo</span>
            <h1>Build a career where your impact adds up</h1>
            <p>
              Explore opportunities across engineering, branch banking, wealth management, commercial &amp; investment
              banking, and risk—backed by comprehensive health, 401(k) matching, tuition support, and paid volunteer days.
            </p>
            <div className="wf-locator-bar">
              <Search size={20} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search job title, city, or skill (e.g., Engineer, Banker, New York)"
                aria-label="Search careers"
              />
            </div>
            <div className="wf-pill-row">
              {depts.map((d) => (
                <button key={d} type="button" className={dept === d ? "wf-pill active" : "wf-pill"} onClick={() => setDept(d)}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="wf-section content-width">
        <div className="wf-results-meta">
          <h2>{filtered.length} open position{filtered.length === 1 ? "" : "s"}</h2>
          <Link href="/about/diversity" className="wf-text-cta">Inclusion &amp; workplace accommodations →</Link>
        </div>
        <div className="wf-branch-grid">
          {filtered.map((role) => (
            <article key={role.id} className="wf-branch-card">
              <div>
                <span className="wf-badge">{role.dept} • {role.id}</span>
                <h3>{role.title}</h3>
                <p className="wf-branch-addr"><MapPin size={15} /> {role.loc}</p>
                <p className="wf-branch-meta"><Briefcase size={15} /> {role.type}</p>
              </div>
              <div className="wf-branch-actions">
                <button
                  type="button"
                  className="button button-red"
                  onClick={() => setApplyingRole(`${role.title} (${role.id})`)}
                >
                  Apply online
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {applyingRole && (
        <InquiryModal productName={applyingRole} category="Wells Fargo Careers" onClose={() => setApplyingRole(null)} />
      )}
    </SiteShell>
  );
}
