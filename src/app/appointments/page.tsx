"use client";

import { SiteShell } from "@/components/site-shell";
import { CalendarDays, CheckCircle2, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

type Appointment = {
  id: number;
  confirmationCode: string;
  topic: string;
  meetingType: string;
  branchName: string;
  appointmentDate: string;
  appointmentTime: string;
  fullName: string;
  status: string;
};

const topics = [
  "Open a Checking or Savings Account",
  "Home Mortgage or 3% Down Prequalification",
  "Credit Cards & Personal Loans",
  "Wells Fargo Premier & Wealth Planning",
  "Small Business Banking & SBA Loans",
  "Notary, Medallion, or Account Maintenance",
];

const defaultBranches = [
  "Montgomery Street Main Branch (San Francisco, CA)",
  "Hudson Yards Financial Center (New York, NY)",
  "One Wells Fargo Center Branch (Charlotte, NC)",
  "Downtown Los Angeles Grand Ave (Los Angeles, CA)",
  "Dallas Arts District Branch (Dallas, TX)",
  "Chicago South Wacker Branch (Chicago, IL)",
  "Miami Biscayne Financial Center (Miami, FL)",
  "Phone Consultation with U.S. Banker",
];

const timeSlots = ["9:30 AM", "10:30 AM", "11:30 AM", "1:30 PM", "2:30 PM", "3:30 PM", "4:15 PM"];

function AppointmentsInner() {
  const searchParams = useSearchParams();
  const requestedBranch = searchParams.get("branch") ?? "";
  const branchOptions =
    requestedBranch && !defaultBranches.includes(requestedBranch)
      ? [requestedBranch, ...defaultBranches]
      : defaultBranches;

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const [topic, setTopic] = useState(topics[0]);
  const [meetingType, setMeetingType] = useState("In Branch");
  const [branchName, setBranchName] = useState(requestedBranch || branchOptions[0]);
  const [appointmentDate, setAppointmentDate] = useState(tomorrow);
  const [appointmentTime, setAppointmentTime] = useState("10:30 AM");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);
  const [recent, setRecent] = useState<Appointment[]>([]);

  async function loadRecent() {
    try {
      const res = await fetch("/api/appointments");
      const data = (await res.json()) as { appointments?: Appointment[] };
      setRecent(data.appointments ?? []);
    } catch {
      setRecent([]);
    }
  }

  useEffect(() => {
    loadRecent();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          meetingType,
          branchName: meetingType === "By Phone" ? "Phone Consultation with U.S. Banker" : branchName,
          appointmentDate,
          appointmentTime,
          fullName,
          email,
          phone,
          notes,
        }),
      });
      const data = (await res.json()) as { appointment?: Appointment; error?: string };
      if (!res.ok || !data.appointment) throw new Error(data.error || "Unable to book appointment.");
      setConfirmed(data.appointment);
      setFullName("");
      setEmail("");
      setPhone("");
      setNotes("");
      await loadRecent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to book appointment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelBooking(code: string) {
    await fetch(`/api/appointments?code=${encodeURIComponent(code)}`, { method: "DELETE" });
    if (confirmed?.confirmationCode === code) {
      setConfirmed({ ...confirmed, status: "Canceled" });
    }
    await loadRecent();
  }

  return (
    <SiteShell>
      <section className="wf-page-hero wf-hero-warm">
        <div className="content-width wf-page-hero-inner">
          <div className="wf-page-hero-copy">
            <span className="wf-eyebrow">Make an Appointment</span>
            <h1>Meet with a Wells Fargo banker on your schedule</h1>
            <p>
              Choose a topic, pick a convenient local branch or phone appointment, and reserve dedicated one-on-one time
              with no waiting in line.
            </p>
          </div>
        </div>
      </section>

      <section className="wf-section content-width wf-two-col">
        <div className="wf-panel">
          <h2>Schedule your appointment</h2>
          {confirmed && (
            <div className="wf-confirm-box" role="status">
              <CheckCircle2 size={24} />
              <div>
                <strong>Appointment {confirmed.status} — #{confirmed.confirmationCode}</strong>
                <p>
                  {confirmed.topic} • {confirmed.appointmentDate} at {confirmed.appointmentTime} ({confirmed.branchName})
                </p>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="wf-form-stack">
            <div className="wf-input-group">
              <label htmlFor="ap-topic">1. What can we help you with? *</label>
              <select id="ap-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
                {topics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="wf-input-group">
              <label>2. How would you like to meet?</label>
              <div className="wf-pill-row">
                {["In Branch", "By Phone"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={meetingType === type ? "wf-pill active" : "wf-pill"}
                    onClick={() => setMeetingType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {meetingType === "In Branch" && (
              <div className="wf-input-group">
                <label htmlFor="ap-branch">
                  Select a branch (<Link href="/locations" className="wf-inline-link">browse all locations</Link>)
                </label>
                <select id="ap-branch" value={branchName} onChange={(e) => setBranchName(e.target.value)}>
                  {branchOptions.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="wf-form-row">
              <div className="wf-input-group">
                <label htmlFor="ap-date">3. Preferred date *</label>
                <input id="ap-date" type="date" min={tomorrow} required value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} />
              </div>
              <div className="wf-input-group">
                <label htmlFor="ap-time">Preferred time *</label>
                <select id="ap-time" value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)}>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="wf-input-group">
              <label htmlFor="ap-name">4. Your full name *</label>
              <input id="ap-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Alex Morgan" />
            </div>
            <div className="wf-form-row">
              <div className="wf-input-group">
                <label htmlFor="ap-email">Email address *</label>
                <input id="ap-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@example.com" />
              </div>
              <div className="wf-input-group">
                <label htmlFor="ap-phone">Phone number *</label>
                <input id="ap-phone" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(415) 555-0194" />
              </div>
            </div>
            <div className="wf-input-group">
              <label htmlFor="ap-notes">Additional notes or accessibility requests (optional)</label>
              <input id="ap-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., Spanish-speaking banker, ASL interpreter, joint applicant" />
            </div>

            {error && <p className="wf-form-error">{error}</p>}
            <button type="submit" className="button button-red" disabled={submitting}>
              {submitting ? "Booking appointment..." : "Confirm Appointment"}
            </button>
          </form>
        </div>

        <aside className="wf-panel wf-panel-subtle">
          <h3>Your scheduled appointments</h3>
          <p className="wf-muted">View confirmation codes or cancel upcoming visits anytime.</p>
          {recent.length === 0 ? (
            <p className="wf-muted">No appointments booked yet. Complete the form to receive an instant confirmation code.</p>
          ) : (
            <div className="wf-stack-list">
              {recent.map((item) => (
                <div key={item.confirmationCode} className="wf-mini-card">
                  <div className="wf-mini-top">
                    <span className="wf-ref-pill">{item.confirmationCode}</span>
                    <span className={item.status === "Canceled" ? "wf-status-muted" : "wf-status-ok"}>{item.status}</span>
                  </div>
                  <strong>{item.topic}</strong>
                  <p><MapPin size={14} /> {item.branchName}</p>
                  <p><CalendarDays size={14} /> {item.appointmentDate} <Clock size={14} /> {item.appointmentTime}</p>
                  <p className="wf-muted">Booked for {item.fullName}</p>
                  {["Scheduled", "Pending Approval", "Confirmed", "Rescheduled"].includes(item.status) && (
                    <button type="button" className="wf-cancel-link" onClick={() => cancelBooking(item.confirmationCode)}>
                      Cancel appointment
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>
      </section>
    </SiteShell>
  );
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<SiteShell><div className="wf-section content-width"><p>Loading scheduler...</p></div></SiteShell>}>
      <AppointmentsInner />
    </Suspense>
  );
}
