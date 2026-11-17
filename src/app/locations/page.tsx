"use client";

import { SiteShell } from "@/components/site-shell";
import { CalendarDays, Check, Clock, MapPin, Phone, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

type Branch = {
  id: number;
  code: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  lobbyHours: string;
  saturdayHours: string;
  has24HrAtm: boolean;
  hasDriveUp: boolean;
  hasNotary: boolean;
  hasSafeDeposit: boolean;
  hasPremierBanker: boolean;
  hasSpanish: boolean;
};

function LocationsInner() {
  const searchParams = useSearchParams();
  const [qp, setQp] = useState(searchParams.get("qp") ?? "");
  const [submittedQp, setSubmittedQp] = useState(searchParams.get("qp") ?? "");
  const [driveUp, setDriveUp] = useState(false);
  const [notary, setNotary] = useState(false);
  const [safeDeposit, setSafeDeposit] = useState(false);
  const [premier, setPremier] = useState(searchParams.get("premier") === "1");
  const [spanish, setSpanish] = useState(searchParams.get("spanish") === "1");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (submittedQp) params.set("qp", submittedQp);
    if (driveUp) params.set("driveUp", "1");
    if (notary) params.set("notary", "1");
    if (safeDeposit) params.set("safeDeposit", "1");
    if (premier) params.set("premier", "1");
    if (spanish) params.set("spanish", "1");

    setLoading(true);
    fetch(`/api/locations?${params.toString()}`)
      .then((res) => res.json())
      .then((data: { branches?: Branch[] }) => setBranches(data.branches ?? []))
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
  }, [submittedQp, driveUp, notary, safeDeposit, premier, spanish]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQp(qp.trim());
  }

  return (
    <SiteShell>
      <section className="wf-page-hero wf-hero-warm">
        <div className="content-width wf-page-hero-inner">
          <div className="wf-page-hero-copy">
            <span className="wf-eyebrow">ATMs &amp; Branch Locations</span>
            <h1>Find a Wells Fargo branch or 24-hour ATM</h1>
            <p>
              Search by city, state, or ZIP code to view lobby hours, drive-up lanes, notary services, Premier bankers,
              and schedule an appointment online.
            </p>
            <form onSubmit={handleSearch} className="wf-locator-bar">
              <Search size={20} />
              <input
                value={qp}
                onChange={(e) => setQp(e.target.value)}
                placeholder="Enter city, state, or ZIP (e.g., San Francisco, NY, TX, 28202)"
                aria-label="Search by city, state, or ZIP"
              />
              <button type="submit" className="button button-red">
                Search
              </button>
              {submittedQp && (
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => {
                    setQp("");
                    setSubmittedQp("");
                  }}
                >
                  Show all
                </button>
              )}
            </form>
            <div className="wf-pill-row">
              <button type="button" className={driveUp ? "wf-pill active" : "wf-pill"} onClick={() => setDriveUp(!driveUp)}>
                Drive-Up Banking
              </button>
              <button type="button" className={premier ? "wf-pill active" : "wf-pill"} onClick={() => setPremier(!premier)}>
                Premier Banker
              </button>
              <button type="button" className={safeDeposit ? "wf-pill active" : "wf-pill"} onClick={() => setSafeDeposit(!safeDeposit)}>
                Safe Deposit Boxes
              </button>
              <button type="button" className={notary ? "wf-pill active" : "wf-pill"} onClick={() => setNotary(!notary)}>
                Notary Service
              </button>
              <button type="button" className={spanish ? "wf-pill active" : "wf-pill"} onClick={() => setSpanish(!spanish)}>
                Se habla español
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="wf-section content-width">
        <div className="wf-results-meta">
          <h2>
            {loading
              ? "Searching locations..."
              : `${branches.length} Wells Fargo location${branches.length === 1 ? "" : "s"}${submittedQp ? ` matching "${submittedQp}"` : " nationwide"}`}
          </h2>
          <Link href="/appointments" className="wf-text-cta">
            <CalendarDays size={17} /> Book a phone or branch appointment
          </Link>
        </div>

        {!loading && branches.length === 0 ? (
          <div className="wf-empty-card">
            <h3>No exact matches for &ldquo;{submittedQp}&rdquo;</h3>
            <p>Try searching by state abbreviation (like CA, NY, TX, NC, FL, IL, AZ, WA) or clear filters to browse all locations.</p>
            <button
              type="button"
              className="button button-red"
              onClick={() => {
                setQp("");
                setSubmittedQp("");
                setDriveUp(false);
                setPremier(false);
                setSafeDeposit(false);
                setNotary(false);
                setSpanish(false);
              }}
            >
              Reset search &amp; filters
            </button>
          </div>
        ) : (
          <div className="wf-branch-grid">
            {branches.map((b) => (
              <article key={b.code} className="wf-branch-card">
                <div className="wf-branch-head">
                  <span className="wf-badge">{b.city}, {b.state}</span>
                  <h3>{b.name}</h3>
                  <p className="wf-branch-addr">
                    <MapPin size={16} /> {b.address}, {b.city}, {b.state} {b.zip}
                  </p>
                  <p className="wf-branch-meta">
                    <Phone size={15} /> {b.phone}
                  </p>
                  <p className="wf-branch-meta">
                    <Clock size={15} /> {b.lobbyHours} • {b.saturdayHours}
                  </p>
                </div>
                <div className="wf-tag-list">
                  {b.has24HrAtm && <span><Check size={13} /> 24-Hr ATM</span>}
                  {b.hasDriveUp && <span><Check size={13} /> Drive-Up</span>}
                  {b.hasPremierBanker && <span><Check size={13} /> Premier Banker</span>}
                  {b.hasNotary && <span><Check size={13} /> Notary</span>}
                  {b.hasSafeDeposit && <span><Check size={13} /> Safe Deposit</span>}
                  {b.hasSpanish && <span><Check size={13} /> Español</span>}
                </div>
                <div className="wf-branch-actions">
                  <Link
                    href={`/appointments?branch=${encodeURIComponent(`${b.name} — ${b.city}, ${b.state} ${b.zip}`)}`}
                    className="button button-red"
                  >
                    Make an appointment
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </SiteShell>
  );
}

export default function LocationsPage() {
  return (
    <Suspense fallback={<SiteShell><div className="wf-section content-width"><p>Loading branch locator...</p></div></SiteShell>}>
      <LocationsInner />
    </Suspense>
  );
}
