"use client";

import { SiteShell } from "@/components/site-shell";
import { AlertTriangle, CheckCircle2, Phone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type FraudCase = {
  id: number;
  referenceCode: string;
  incidentType: string;
  channel: string;
  incidentDate: string;
  status: string;
};

export default function ReportFraudPage() {
  const today = new Date().toISOString().split("T")[0];
  const [incidentType, setIncidentType] = useState("Unauthorized Debit or Credit Card Charge");
  const [channel, setChannel] = useState("Suspicious Text Message (Smishing)");
  const [incidentDate, setIncidentDate] = useState(today);
  const [contactEmail, setContactEmail] = useState("");
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<FraudCase | null>(null);
  const [cases, setCases] = useState<FraudCase[]>([]);

  async function loadCases() {
    try {
      const res = await fetch("/api/fraud-reports");
      const data = (await res.json()) as { reports?: FraudCase[] };
      setCases(data.reports ?? []);
    } catch {
      setCases([]);
    }
  }

  useEffect(() => {
    loadCases();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/fraud-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentType, channel, incidentDate, contactEmail, summary }),
      });
      const data = (await res.json()) as { report?: FraudCase; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error || "Unable to submit report.");
      setSubmitted(data.report);
      setContactEmail("");
      setSummary("");
      await loadCases();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteShell>
      <section className="wf-page-hero wf-hero-crimson">
        <div className="content-width wf-page-hero-inner">
          <div className="wf-page-hero-copy">
            <span className="wf-eyebrow">Security Center • 24/7 Response</span>
            <h1>Report Fraud &amp; Suspicious Activity</h1>
            <p>
              Act right away if you notice an unauthorized transaction, a lost or stolen card, or a suspicious call,
              text, or email claiming to be from Wells Fargo.
            </p>
          </div>
        </div>
      </section>

      <section className="wf-section content-width wf-two-col">
        <div className="wf-panel">
          <h2>File an online incident report</h2>
          {submitted && (
            <div className="wf-confirm-box" role="status">
              <CheckCircle2 size={24} />
              <div>
                <strong>Fraud Case Logged — #{submitted.referenceCode}</strong>
                <p>{submitted.incidentType} • Status: {submitted.status}</p>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="wf-form-stack">
            <div className="wf-input-group">
              <label htmlFor="fr-type">What would you like to report? *</label>
              <select id="fr-type" value={incidentType} onChange={(e) => setIncidentType(e.target.value)}>
                <option>Unauthorized Debit or Credit Card Charge</option>
                <option>Phishing Email, Text, or Spoofed Phone Call</option>
                <option>Lost or Stolen Card / Device</option>
                <option>Unauthorized Zelle, Wire, or ACH Transfer</option>
                <option>Suspected Identity Theft</option>
              </select>
            </div>
            <div className="wf-form-row">
              <div className="wf-input-group">
                <label htmlFor="fr-chan">How did it occur?</label>
                <select id="fr-chan" value={channel} onChange={(e) => setChannel(e.target.value)}>
                  <option>Suspicious Text Message (Smishing)</option>
                  <option>Phishing Email</option>
                  <option>Phone Impersonation Call</option>
                  <option>Online Merchant / Card Charge</option>
                  <option>ATM or Physical Card</option>
                </select>
              </div>
              <div className="wf-input-group">
                <label htmlFor="fr-date">Date noticed *</label>
                <input id="fr-date" type="date" required value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
              </div>
            </div>
            <div className="wf-input-group">
              <label htmlFor="fr-email">Contact email for case updates *</label>
              <input id="fr-email" type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="wf-input-group">
              <label htmlFor="fr-sum">Brief description (do not include passwords or full card numbers) *</label>
              <textarea
                id="fr-sum"
                rows={4}
                required
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Describe what happened, the merchant or sender name, and approximate dollar amount..."
              />
            </div>
            {error && <p className="wf-form-error">{error}</p>}
            <button type="submit" className="button button-red" disabled={submitting}>
              {submitting ? "Submitting report..." : "Submit Fraud Report"}
            </button>
          </form>
        </div>

        <aside className="wf-panel wf-panel-subtle">
          <h3><AlertTriangle size={18} style={{ display: "inline", color: "#d71e28" }} /> 24/7 Emergency Fraud Numbers</h3>
          <ul className="wf-breakdown">
            <li><span><Phone size={14} /> Online &amp; Account Fraud</span><strong>1-866-867-5568</strong></li>
            <li><span><Phone size={14} /> Personal Banking &amp; Debit</span><strong>1-800-869-3557</strong></li>
            <li><span><Phone size={14} /> Credit Card Fraud</span><strong>1-800-642-4720</strong></li>
            <li><span><Phone size={14} /> Business Banking Fraud</span><strong>1-800-225-5935</strong></li>
          </ul>
          {cases.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <h4>Recent case log</h4>
              <div className="wf-stack-list">
                {cases.slice(0, 3).map((c) => (
                  <div key={c.referenceCode} className="wf-mini-card">
                    <div className="wf-mini-top">
                      <span className="wf-ref-pill">{c.referenceCode}</span>
                      <span className="wf-status-ok">{c.status}</span>
                    </div>
                    <strong>{c.incidentType}</strong>
                    <small className="wf-muted">{c.channel} • {c.incidentDate}</small>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="wf-quick-stack" style={{ marginTop: 20 }}>
            <Link href="/privacy-security/fraud">Visit Security Center →</Link>
            <Link href="/privacy-security/security-tips">5-Step Security Checkup →</Link>
          </div>
        </aside>
      </section>
    </SiteShell>
  );
}
