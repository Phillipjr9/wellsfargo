"use client";

import { AdminSubPage } from "@/components/admin-subpage";
import { adminFetch } from "@/lib/client-auth";
import { BarChart3, Download, FileSpreadsheet } from "lucide-react";
import { useEffect, useState } from "react";

type Analytics = {
  generatedAt: string;
  popular: { query: string; count: number; avgResults: string }[];
  volume: { day: string; count: number }[];
  spend: { category: string; total: string; count: number }[];
  statusMix: { status: string; count: number }[];
  auditMix: { severity: string; count: number }[];
  recent: { id: number; actor: string; action: string; detail: string | null; createdAt: string }[];
  totals: { customerCount: number; totalBalance: string; txCount: number };
};

const reports = [
  { type: "customers", label: "Customer relationships", desc: "Profiles, tiers, KYC and status" },
  { type: "accounts", label: "Accounts & balances", desc: "All deposit, credit, loan and trust accounts" },
  { type: "transactions", label: "Transaction ledger", desc: "Full debit and credit history" },
  { type: "appointments", label: "Appointments", desc: "Bookings, topics and statuses" },
  { type: "fraud", label: "Fraud cases", desc: "Incidents, refunds and resolution state" },
  { type: "applications", label: "Product applications", desc: "Submitted inquiries and decisions" },
  { type: "audit", label: "Audit trail", desc: "Every administrative and customer action" },
];

const money = (v: unknown) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(v) || 0);

type Schedule = { id: number; label: string; amount: string; frequency: string; nextRunDate: string; status: string; lastRunAt: string | null };

export default function AdminReportsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [jobResult, setJobResult] = useState("");
  const [jobBusy, setJobBusy] = useState(false);

  const loadSchedules = async () => {
    const res = await adminFetch("/api/scheduled-transfers?scope=admin");
    if (res.ok) setSchedules(((await res.json()) as { schedules: Schedule[] }).schedules ?? []);
  };

  useEffect(() => {
    adminFetch("/api/admin/analytics")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Analytics | null) => setData(d))
      .catch(() => {});
    void loadSchedules();
  }, []);

  async function runJob() {
    setJobBusy(true);
    setJobResult("");
    try {
      const res = await adminFetch("/api/jobs/process-schedules", { method: "POST" });
      const body = (await res.json()) as { processed?: number; skipped?: number; error?: string; details?: string[] };
      setJobResult(
        res.ok
          ? `${body.processed ?? 0} transfer(s) processed, ${body.skipped ?? 0} skipped.${body.details?.length ? ` ${body.details[0]}` : ""}`
          : body.error ?? "Job failed.",
      );
      await loadSchedules();
      const refreshed = await adminFetch("/api/admin/analytics");
      if (refreshed.ok) setData((await refreshed.json()) as Analytics);
    } finally {
      setJobBusy(false);
    }
  }

  async function download(type: string) {
    // Fetch with the bearer header, then trigger a real browser download.
    const res = await adminFetch(`/api/admin/reports?type=${encodeURIComponent(type)}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wellsfargo-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const maxPopular = Math.max(1, ...(data?.popular ?? []).map((p) => p.count));
  const maxSpend = Math.max(1, ...(data?.spend ?? []).map((s) => Number(s.total)));

  return (
    <AdminSubPage title="Reports & Data Exports" subtitle="Live PostgreSQL analytics, search trends, and downloadable CSV datasets">
      <div className="adm-report-kpis">
        <div><span>Customer relationships</span><strong>{data?.totals?.customerCount ?? "—"}</strong></div>
        <div><span>Total account balances</span><strong>{data ? money(data.totals.totalBalance) : "—"}</strong></div>
        <div><span>Ledger transactions</span><strong>{data?.totals?.txCount ?? "—"}</strong></div>
        <div><span>Logged search queries</span><strong>{data?.volume?.reduce((s, v) => s + v.count, 0) ?? "—"}</strong></div>
      </div>

      <div className="adm-subgrid">
        <section className="adm-panel">
          <header className="adm-panel-head">
            <div><h2><BarChart3 size={17} style={{ display: "inline", verticalAlign: "text-bottom" }} /> Most searched topics</h2><p>Recorded live from the site-wide search dialog.</p></div>
          </header>
          <div className="adm-bars">
            {(data?.popular ?? []).map((p) => (
              <div className="adm-bar-row" key={p.query}>
                <span className="adm-bar-label">{p.query}</span>
                <span className="adm-bar-track"><span className="adm-bar-fill" style={{ width: `${Math.max(5, (p.count / maxPopular) * 100)}%` }} /></span>
                <span className="adm-bar-value">{p.count} hits</span>
              </div>
            ))}
            {!data && <p className="adm-empty">Loading analytics…</p>}
          </div>
        </section>

        <section className="adm-panel">
          <header className="adm-panel-head">
            <div><h2>Spending volume by category</h2><p>Aggregate customer debit activity across the ledger.</p></div>
          </header>
          <div className="adm-bars">
            {(data?.spend ?? []).slice(0, 8).map((s) => (
              <div className="adm-bar-row" key={s.category}>
                <span className="adm-bar-label">{s.category}</span>
                <span className="adm-bar-track"><span className="adm-bar-fill" style={{ width: `${Math.max(5, (Number(s.total) / maxSpend) * 100)}%` }} /></span>
                <span className="adm-bar-value">{money(s.total)}</span>
              </div>
            ))}
            {!data && <p className="adm-empty">Loading analytics…</p>}
          </div>
        </section>
      </div>

      <section className="adm-panel" style={{ marginTop: 20 }}>
        <header className="adm-panel-head">
          <div><h2><FileSpreadsheet size={17} style={{ display: "inline", verticalAlign: "text-bottom" }} /> Export datasets (CSV)</h2><p>Generated server-side from live database tables with your authenticated session.</p></div>
          <span className="adm-count">{reports.length} datasets</span>
        </header>
        <div className="adm-export-grid">
          {reports.map((r) => (
            <button key={r.type} type="button" className="adm-export-card" onClick={() => void download(r.type)}>
              <Download size={19} />
              <div><strong>{r.label}</strong><span>{r.desc}</span></div>
              <small>{r.type}.csv</small>
            </button>
          ))}
        </div>
      </section>

      <section className="adm-panel" style={{ marginTop: 20 }}>
        <header className="adm-panel-head">
          <div><h2>Recurring transfer job</h2><p>A real background-style job that executes due schedules, posts ledger entries and advances next run dates.</p></div>
          <button type="button" className="adm-btn success" onClick={() => void runJob()} disabled={jobBusy}>
            {jobBusy ? "Running…" : "Run due transfers now"}
          </button>
        </header>
        {jobResult && <p className="adm-notice-inline">{jobResult}</p>}
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Schedule</th><th>Amount</th><th>Frequency</th><th>Next run</th><th>Last run</th><th>Status</th></tr></thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.label}</strong></td>
                  <td>{money(s.amount)}</td>
                  <td>{s.frequency}</td>
                  <td>{s.nextRunDate}</td>
                  <td>{s.lastRunAt ? new Date(s.lastRunAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "Never"}</td>
                  <td><span className={`adm-pill ${s.status === "Active" ? "ok" : "muted"}`}>{s.status}</span></td>
                </tr>
              ))}
              {schedules.length === 0 && <tr><td colSpan={6}><p className="adm-empty">No scheduled transfers yet.</p></td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="adm-panel" style={{ marginTop: 20 }}>
        <header className="adm-panel-head"><div><h2>Recent audit events</h2><p>Most recent actions across both dashboards.</p></div></header>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Detail</th></tr></thead>
            <tbody>
              {(data?.recent ?? []).map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td><strong>{a.actor}</strong></td>
                  <td><code>{a.action}</code></td>
                  <td className="adm-cell-muted">{a.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminSubPage>
  );
}
