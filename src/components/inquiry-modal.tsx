"use client";

import { CheckCircle2, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export function InquiryModal({
  productName,
  category,
  onClose,
}: {
  productName: string;
  category: string;
  onClose: () => void;
}) {
  const [applicantName, setApplicantName] = useState("");
  const [email, setEmail] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [referenceCode, setReferenceCode] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, category, applicantName, email, zipCode, notes }),
      });
      const data = (await response.json()) as { inquiry?: { referenceCode: string }; error?: string };
      if (!response.ok || !data.inquiry) {
        throw new Error(data.error || "Unable to submit right now.");
      }
      setReferenceCode(data.inquiry.referenceCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="wf-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="wf-modal-header">
          <div>
            <span className="wf-eyebrow">{category}</span>
            <h2 id="inquiry-title">{referenceCode ? "Request Received" : `Get started: ${productName}`}</h2>
          </div>
          <button type="button" className="modal-close" aria-label="Close dialog" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        {referenceCode ? (
          <div className="wf-modal-success">
            <div className="wf-success-badge">
              <CheckCircle2 size={30} />
            </div>
            <p className="wf-ref-pill">Confirmation #{referenceCode}</p>
            <p>
              Thank you, <strong>{applicantName}</strong>. Your online request for <strong>{productName}</strong> has
              been saved. You can also meet with a specialist in branch or manage accounts in Online Banking.
            </p>
            <div className="wf-modal-actions">
              <Link href="/appointments" className="button button-red" onClick={onClose}>
                Schedule banker appointment
              </Link>
              <button type="button" className="button button-outline" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="wf-form-stack">
            <p className="wf-form-note">
              <ShieldCheck size={16} /> No SSN or sensitive account numbers required in this interactive demo flow.
            </p>
            <div className="wf-input-group">
              <label htmlFor="inq-name">Full name *</label>
              <input
                id="inq-name"
                required
                value={applicantName}
                onChange={(event) => setApplicantName(event.target.value)}
                placeholder="Jordan Taylor"
              />
            </div>
            <div className="wf-form-row">
              <div className="wf-input-group">
                <label htmlFor="inq-email">Email address *</label>
                <input
                  id="inq-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="jordan@example.com"
                />
              </div>
              <div className="wf-input-group">
                <label htmlFor="inq-zip">ZIP code *</label>
                <input
                  id="inq-zip"
                  required
                  value={zipCode}
                  onChange={(event) => setZipCode(event.target.value)}
                  placeholder="94104"
                />
              </div>
            </div>
            <div className="wf-input-group">
              <label htmlFor="inq-notes">Goals or preferences (optional)</label>
              <input
                id="inq-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="e.g., Direct deposit setup, initial funding amount, or questions"
              />
            </div>
            {error && <p className="wf-form-error">{error}</p>}
            <div className="wf-modal-actions">
              <button type="submit" className="button button-red" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
              <button type="button" className="button button-outline" onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
