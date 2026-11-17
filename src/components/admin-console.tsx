"use client";

import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Database,
  FileSearch,
  Landmark,
  LayoutDashboard,
  Lock,
  LogOut,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlock,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { LimitedAdminConsole } from "@/components/limited-admin-console";
import { adminFetch, adminSignOut, setAdminToken } from "@/lib/client-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

/* ----------------------------- Types ----------------------------- */

type AdminIdentity = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  roleType: "super_admin" | "limited_admin" | "auditor";
  parentAdminId: number | null;
  status: string;
  email: string;
};

type Overview = {
  generatedAt: string;
  kpis: {
    customers: { total: number; active: number };
    deposits: { total: string; count: number };
    loans: { total: string; count: number };
    investments: { total: string; count: number };
    credit: { balances: string; limits: string; count: number };
    transactions: { total: number; debits: string; credits: string; flagged: number; pending: number };
    appointments: { total: number; scheduled: number; pendingApproval: number; canceled: number };
    fraud: { total: number; open: number; resolved: number; refunds: string };
    inquiries: { total: number; pending: number; approved: number };
    branches: { total: number; open: number };
    cards: { total: number; locked: number };
    statements: { total: number; unviewed: number };
    bills: { total: number; autopay: number; due: string };
    searchPages: { total: number };
    activeSessions: { total: number };
    admins: { total: number };
  };
  charts: {
    accountsByType: { type: string; count: number; total: string }[];
    customerStatus: { status: string; count: number }[];
    customerTiers: { tier: string; count: number }[];
    categorySpend: { category: string; total: string; count: number }[];
    fraudByChannel: { channel: string; count: number }[];
    recentSignIns: { username: string; fullName: string; tier: string; lastSignInAt: string }[];
  };
  recentAudit: AuditRow[];
  rateSetting: string | null;
  health: { database: string; sessionStore: number; seededTables: number; latencyMs: number };
};

type AuditRow = {
  id: number;
  actor: string;
  action: string;
  resource: string;
  resourceLabel: string | null;
  detail: string | null;
  severity: string;
  createdAt: string;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const money = (v: unknown) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(v) || 0);
const moneyExact = (v: unknown) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v) || 0);
const dateTime = (v: unknown) =>
  v ? new Date(String(v)).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—";

/* --------------------------- Nav sections --------------------------- */

const SECTIONS: { id: string; label: string; icon: LucideIcon; group: string }[] = [
  { id: "overview", label: "Operations Overview", icon: LayoutDashboard, group: "Command Center" },
  { id: "customers", label: "Customers", icon: Users, group: "Relationships" },
  { id: "accounts", label: "Accounts & Balances", icon: Wallet, group: "Relationships" },
  { id: "transactions", label: "Transactions", icon: Activity, group: "Relationships" },
  { id: "cards", label: "Card Portfolio", icon: CreditCard, group: "Relationships" },
  { id: "appointments", label: "Appointments", icon: CalendarCheck2, group: "Service Queue" },
  { id: "fraud", label: "Fraud Cases", icon: ShieldAlert, group: "Service Queue" },
  { id: "inquiries", label: "Applications", icon: BadgeCheck, group: "Service Queue" },
  { id: "branches", label: "Branch Network", icon: Building2, group: "Administration" },
  { id: "content", label: "Rates & Content", icon: Settings2, group: "Administration" },
  { id: "searchIndex", label: "Search Catalog", icon: FileSearch, group: "Administration" },
  { id: "audit", label: "Audit Trail", icon: ShieldCheck, group: "Administration" },
];

/* ------------------------------ Shell ------------------------------ */

export default function AdminConsole() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [checking, setChecking] = useState(true);
  const [section, setSection] = useState("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [notice, setNotice] = useState("");

  const loadOverview = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/overview");
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      setOverview((await res.json()) as Overview);
    } catch {
      setNotice("Unable to refresh operations data.");
    }
  }, [router]);

  useEffect(() => {
    (async () => {
      const res = await adminFetch("/api/admin/session");
      if (res.status !== 200) {
        router.replace("/admin/login");
        return;
      }
      const data = (await res.json()) as { admin: AdminIdentity | null; token?: string; authenticated?: boolean };
      if (!data.authenticated || !data.admin) {
        router.replace("/admin/login");
        return;
      }
      if (typeof data.token === "string") setAdminToken(data.token);
      setAdmin(data.admin);
      setChecking(false);
      // Limited Admins get a scoped workspace; global overview is Super Admin only.
      if (data.admin.roleType !== "super_admin") return;
      await loadOverview();
    })();
  }, [router, loadOverview]);

  async function signOut() {
    await adminSignOut();
    window.location.assign("/admin/login");
  }

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4200);
    void loadOverview();
  }

  if (checking) {
    return (
      <div className="adm-loading">
        <ShieldCheck size={34} />
        <p>Verifying administrator credentials…</p>
      </div>
    );
  }

  if (admin && admin.roleType !== "super_admin") {
    return <LimitedAdminConsole admin={admin} />;
  }

  const groups = [...new Set(SECTIONS.map((s) => s.group))];

  return (
    <div className="adm-shell">
      <aside className="adm-sidebar">
        <div className="adm-brand">
          <img src="/images/wells-fargo-wordmark.png" alt="Wells Fargo" width="150" height="16" />
          <span>Super Admin Console</span>
        </div>
        <nav aria-label="Admin sections">
          {groups.map((group) => (
            <div key={group} className="adm-nav-group">
              <h4>{group}</h4>
              {SECTIONS.filter((s) => s.group === group).map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={section === s.id ? "adm-nav-item active" : "adm-nav-item"}
                    onClick={() => setSection(s.id)}
                  >
                    <Icon size={17} />
                    <span>{s.label}</span>
                    {s.id === "fraud" && overview && overview.kpis.fraud.open > 0 && (
                      <em className="adm-badge">{overview.kpis.fraud.open}</em>
                    )}
                    {s.id === "inquiries" && overview && overview.kpis.inquiries.pending > 0 && (
                      <em className="adm-badge">{overview.kpis.inquiries.pending}</em>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="adm-sidebar-foot">
          <Link href="/admin/users" className="adm-foot-link">
            👤 User Management
          </Link>
          <Link href="/admin/support" className="adm-foot-link">
            ✉ Support Agent Inbox
          </Link>
          <Link href="/admin/team" className="adm-foot-link">
            ⚙ Administrator Team
          </Link>
          <Link href="/admin/messages" className="adm-foot-link">
            ✉ All secure messages
          </Link>
          <Link href="/admin/reports" className="adm-foot-link">
            ▤ Reports &amp; data exports
          </Link>
          <Link href="/online-banking/dashboard" className="adm-foot-link">
            Customer dashboard
          </Link>
          <Link href="/" className="adm-foot-link">
            ← View public site
          </Link>
        </div>
      </aside>

      <div className="adm-main">
        <header className="adm-topbar">
          <div>
            <h1>{SECTIONS.find((s) => s.id === section)?.label}</h1>
            <p>
              Enterprise operations console • Data refreshed {overview ? dateTime(overview.generatedAt) : "—"}
            </p>
          </div>
          <div className="adm-topbar-right">
            <button type="button" className="adm-icon-btn" onClick={() => void loadOverview()} aria-label="Refresh data">
              <RefreshCw size={18} />
            </button>
            <div className="adm-user">
              <span className="adm-avatar">{admin?.fullName?.[0] ?? "A"}</span>
              <div>
                <strong>{admin?.fullName}</strong>
                <small>{admin?.role}</small>
              </div>
            </div>
            <button type="button" className="adm-icon-btn" onClick={() => void signOut()} aria-label="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {admin?.role.includes("Read-Only") && (
          <div className="adm-readonly-banner">
            <ShieldCheck size={16} /> Read-only auditor session — you can view data, analytics and exports, but changes are blocked by server-side role checks.
          </div>
        )}
        {notice && (
          <div className="adm-notice" role="status">
            <CheckCircle2 size={17} /> {notice}
          </div>
        )}

        <main className="adm-content">
          {section === "overview" && <OverviewSection overview={overview} />}
          {section === "customers" && <CustomersSection flash={flash} />}
          {section === "accounts" && <AccountsSection flash={flash} />}
          {section === "transactions" && <TransactionsSection flash={flash} />}
          {section === "cards" && <CardsSection flash={flash} />}
          {section === "appointments" && <AppointmentsSection flash={flash} />}
          {section === "fraud" && <FraudSection flash={flash} />}
          {section === "inquiries" && <InquiriesSection flash={flash} />}
          {section === "branches" && <BranchesSection flash={flash} />}
          {section === "content" && <ContentSection overview={overview} flash={flash} />}
          {section === "searchIndex" && <SearchIndexSection flash={flash} />}
          {section === "audit" && <AuditSection />}
        </main>
      </div>
    </div>
  );
}

/* ------------------------- Shared primitives ------------------------- */

function useAdminData(resource: string, deps: unknown[] = []) {
  const [rows, setRows] = useState<Row[]>([]);
  const [facets, setFacets] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ resource });
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      const res = await adminFetch(`/api/admin/data?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { rows?: Row[]; facets?: string[] };
        setRows(data.rows ?? []);
        setFacets(data.facets ?? []);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, q, status, ...deps]);

  useEffect(() => {
    const t = window.setTimeout(load, q ? 200 : 0);
    return () => window.clearTimeout(t);
  }, [load, q]);

  return { rows, facets, q, setQ, status, setStatus, loading, reload: load };
}

async function mutate(resource: string, action: string, payload: Record<string, unknown>, id?: number) {
  const res = await adminFetch("/api/admin/mutate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resource, action, id, payload }),
  });
  const data = (await res.json()) as { error?: string; ok?: boolean };
  if (!res.ok) throw new Error(data.error ?? "Operation failed.");
  return data;
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="adm-panel">
      <header className="adm-panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function FilterBar({
  q,
  setQ,
  placeholder,
  statusOptions,
  status,
  setStatus,
  right,
}: {
  q: string;
  setQ: (v: string) => void;
  placeholder: string;
  statusOptions?: { value: string; label: string }[];
  status?: string;
  setStatus?: (v: string) => void;
  right?: ReactNode;
}) {
  return (
    <div className="adm-filter-bar">
      <span className="adm-search">
        <Search size={17} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      </span>
      {statusOptions && setStatus && (
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      {right}
    </div>
  );
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Drawer({ open, onClose, title, subtitle, children }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="adm-drawer-backdrop" onMouseDown={onClose}>
      <aside className="adm-drawer" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <header>
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close panel">
            <X size={20} />
          </button>
        </header>
        <div className="adm-drawer-body">{children}</div>
      </aside>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const tone =
    ["Active", "Open", "Posted", "Completed", "Confirmed", "Approved", "Resolved", "Settled", "Verified"].includes(value)
      ? "ok"
      : ["Locked", "Restricted", "Frozen", "Disputed", "Under Review", "Acknowledged", "Under Investigation", "Pending Review", "Pending Approval", "Scheduled", "Needs Review", "Dormant"].includes(value)
        ? "warn"
        : "muted";
  return <span className={`adm-pill ${tone}`}>{value}</span>;
}

function BarChart({ data, valueKey, labelKey, formatter }: { data: Row[]; valueKey: string; labelKey: string; formatter?: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey]) || 0));
  return (
    <div className="adm-bars">
      {data.map((d) => {
        const value = Number(d[valueKey]) || 0;
        return (
          <div key={String(d[labelKey])} className="adm-bar-row">
            <span className="adm-bar-label">{String(d[labelKey])}</span>
            <span className="adm-bar-track">
              <span className="adm-bar-fill" style={{ width: `${Math.max(3, (value / max) * 100)}%` }} />
            </span>
            <span className="adm-bar-value">{formatter ? formatter(value) : value.toLocaleString()}</span>
          </div>
        );
      })}
      {data.length === 0 && <p className="adm-empty">No data available yet.</p>}
    </div>
  );
}

function Donut({ data }: { data: { status: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const colors = ["#1b7a46", "#c99a12", "#b01c24", "#4c378f", "#6e6563"];
  let acc = 0;
  const stops = data.map((d, i) => {
    const start = (acc / total) * 100;
    acc += d.count;
    const end = (acc / total) * 100;
    return `${colors[i % colors.length]} ${start}% ${end}%`;
  });
  return (
    <div className="adm-donut-wrap">
      <div className="adm-donut" style={{ background: `conic-gradient(${stops.join(", ")})` }} />
      <ul className="adm-legend">
        {data.map((d, i) => (
          <li key={d.status}>
            <span style={{ background: colors[i % colors.length] }} />
            {d.status} <strong>{d.count}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="adm-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ActionButton({
  children,
  onClick,
  tone = "default",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "default" | "danger" | "success";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button type={type} className={`adm-btn ${tone}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/* ----------------------------- Overview ----------------------------- */

function OverviewSection({ overview }: { overview: Overview | null }) {
  if (!overview) return <p className="adm-empty">Loading operations telemetry…</p>;
  const k = overview.kpis;

  const kpis = [
    { label: "Customer relationships", value: k.customers.total.toLocaleString(), sub: `${k.customers.active} active profiles`, icon: Users, tone: "red" },
    { label: "Total deposits", value: money(k.deposits.total), sub: `${k.deposits.count} deposit accounts`, icon: Landmark, tone: "green" },
    { label: "Loan portfolio", value: money(k.loans.total), sub: `${k.loans.count} mortgage, auto & personal loans`, icon: Wallet, tone: "plum" },
    { label: "Investments & trusts", value: money(k.investments.total), sub: `${k.investments.count} advisory relationships`, icon: BarChart3, tone: "gold" },
    { label: "Credit card balances", value: money(k.credit.balances), sub: `${money(k.credit.limits)} total approved limits`, icon: CreditCard, tone: "red" },
    { label: "Transactions logged", value: k.transactions.total.toLocaleString(), sub: `${k.transactions.flagged} flagged • ${k.transactions.pending} pending`, icon: Activity, tone: "green" },
    { label: "Open fraud cases", value: k.fraud.open.toLocaleString(), sub: `${moneyExact(k.fraud.refunds)} reimbursed to date`, icon: ShieldAlert, tone: k.fraud.open > 0 ? "red" : "green" },
    { label: "Applications pending", value: k.inquiries.pending.toLocaleString(), sub: `${k.inquiries.approved} approved`, icon: BadgeCheck, tone: "gold" },
  ];

  return (
    <>
      <div className="adm-kpi-grid">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className={`adm-kpi ${item.tone}`}>
              <span className="adm-kpi-icon">
                <Icon size={19} />
              </span>
              <div>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.sub}</small>
              </div>
            </article>
          );
        })}
      </div>

      <div className="adm-grid-2">
        <Panel title="Deposit & lending mix" subtitle="Balances grouped by account type across the customer base">
          <BarChart
            data={overview.charts.accountsByType.map((r) => ({ ...r, totalNum: Number(r.total) }))}
            valueKey="totalNum"
            labelKey="type"
            formatter={(v) => money(v)}
          />
        </Panel>
        <Panel title="Relationship tiers" subtitle="Distribution across Standard, Premier, Private Client and Business">
          <BarChart data={overview.charts.customerTiers} valueKey="count" labelKey="tier" />
        </Panel>
      </div>

      <div className="adm-grid-2">
        <Panel title="Customer status" subtitle="Access state across all profiles">
          <Donut data={overview.charts.customerStatus} />
        </Panel>
        <Panel title="Spending by category" subtitle="Aggregate customer debit volume">
          <BarChart
            data={overview.charts.categorySpend.map((r) => ({ ...r, totalNum: Number(r.total) }))}
            valueKey="totalNum"
            labelKey="category"
            formatter={(v) => money(v)}
          />
        </Panel>
      </div>

      <div className="adm-grid-3">
        <Panel title="Service queue" subtitle="Items requiring administrator action">
          <ul className="adm-queue">
            <li>
              <span>Appointments pending approval</span>
              <strong>{k.appointments.pendingApproval}</strong>
            </li>
            <li>
              <span>Open fraud cases</span>
              <strong>{k.fraud.open}</strong>
            </li>
            <li>
              <span>Applications awaiting review</span>
              <strong>{k.inquiries.pending}</strong>
            </li>
            <li>
              <span>Flagged transactions</span>
              <strong>{k.transactions.flagged}</strong>
            </li>
            <li>
              <span>Locked cards</span>
              <strong>{k.cards.locked}</strong>
            </li>
            <li>
              <span>Unviewed statements</span>
              <strong>{k.statements.unviewed}</strong>
            </li>
          </ul>
        </Panel>

        <Panel title="Recent sign-ons" subtitle="Latest customer sessions">
          <ul className="adm-list">
            {overview.charts.recentSignIns.map((s) => (
              <li key={s.username}>
                <strong>{s.fullName}</strong>
                <small>
                  {s.tier} • {dateTime(s.lastSignInAt)}
                </small>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="System health" subtitle="Platform and data integrity">
          <ul className="adm-queue">
            <li>
              <span>
                <Database size={15} /> PostgreSQL connection
              </span>
              <strong className="adm-ok">{overview.health.database}</strong>
            </li>
            <li>
              <span>Query latency</span>
              <strong>{overview.health.latencyMs} ms</strong>
            </li>
            <li>
              <span>Active admin sessions</span>
              <strong>{overview.health.sessionStore}</strong>
            </li>
            <li>
              <span>Seeded data tables</span>
              <strong>{overview.health.seededTables}</strong>
            </li>
            <li>
              <span>Branch locations</span>
              <strong>
                {k.branches.open}/{k.branches.total} open
              </strong>
            </li>
            <li>
              <span>Published site pages</span>
              <strong>{k.searchPages.total}</strong>
            </li>
          </ul>
        </Panel>
      </div>

      <Panel title="Latest audit activity" subtitle="Most recent administrator and customer-system events">
        <Table head={["Timestamp", "Actor", "Action", "Resource", "Detail", "Severity"]}>
          {overview.recentAudit.map((a) => (
            <tr key={a.id}>
              <td>{dateTime(a.createdAt)}</td>
              <td>
                <strong>{a.actor}</strong>
              </td>
              <td>
                <code>{a.action}</code>
              </td>
              <td>{a.resourceLabel ?? a.resource}</td>
              <td className="adm-cell-muted">{a.detail}</td>
              <td>
                <StatusPill value={a.severity} />
              </td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}

/* ----------------------------- Customers ----------------------------- */

function CustomersSection({ flash }: { flash: (m: string) => void }) {
  const { rows, q, setQ, status, setStatus, loading, reload } = useAdminData("customers");
  const [selected, setSelected] = useState<Row | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  async function openDetail(row: Row) {
    setSelected(row);
    setEmail(row.email);
    setPhone(row.phone);
    const res = await adminFetch(`/api/admin/data?resource=customerDetail&id=${row.id}`);
    if (res.ok) setDetail((await res.json()) as Row);
  }

  async function run(action: string, payload: Record<string, unknown>, message: string) {
    if (!selected) return;
    setBusy(true);
    try {
      await mutate("customers", action, payload, selected.id);
      flash(message);
      await reload();
      await openDetail({ ...selected, ...payload });
    } catch (e) {
      flash(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel
        title="Customer relationships"
        subtitle={`${rows.length} profiles • search by name, username, email, phone or tier`}
        action={<span className="adm-count">{loading ? "Loading…" : `${rows.length} records`}</span>}
      >
        <FilterBar
          q={q}
          setQ={setQ}
          status={status}
          setStatus={setStatus}
          placeholder="Search customers…"
          statusOptions={[
            { value: "Active", label: "Active" },
            { value: "Locked", label: "Locked" },
            { value: "Restricted", label: "Restricted" },
            { value: "Closed", label: "Closed" },
          ]}
        />
        <Table head={["Customer", "Tier", "Status", "Accounts", "Deposits", "AUM", "Last sign-on", ""]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <strong>{r.fullName}</strong>
                <small className="adm-sub">
                  @{r.username} • {r.email}
                </small>
              </td>
              <td>{r.tier}</td>
              <td>
                <StatusPill value={r.status} />
                {r.kycStatus !== "Verified" && <small className="adm-sub">KYC: {r.kycStatus}</small>}
              </td>
              <td>{r.accountCount}</td>
              <td>{money(r.totalDeposits)}</td>
              <td>{money(r.totalAum)}</td>
              <td>{dateTime(r.lastSignInAt)}</td>
              <td>
                <ActionButton onClick={() => void openDetail(r)}>Manage</ActionButton>
              </td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Drawer
        open={Boolean(selected)}
        onClose={() => {
          setSelected(null);
          setDetail(null);
        }}
        title={selected?.fullName ?? ""}
        subtitle={selected ? `@${selected.username} • ${selected.tier} • Customer since ${selected.relationshipSince}` : ""}
      >
        {selected && (
          <>
            <div className="adm-drawer-kpis">
              <div>
                <span>Accounts</span>
                <strong>{selected.accountCount}</strong>
              </div>
              <div>
                <span>Deposits</span>
                <strong>{money(selected.totalDeposits)}</strong>
              </div>
              <div>
                <span>Credit used</span>
                <strong>{money(selected.totalCreditUsed)}</strong>
              </div>
              <div>
                <span>Investments</span>
                <strong>{money(selected.totalAum)}</strong>
              </div>
            </div>

            <h3>Access controls</h3>
            <div className="adm-action-row">
              <ActionButton tone={selected.status === "Active" ? "danger" : "success"} disabled={busy} onClick={() => void run("setStatus", { status: selected.status === "Active" ? "Locked" : "Active" }, `Profile ${selected.status === "Active" ? "locked" : "reactivated"}.`)}>
                <Lock size={15} /> {selected.status === "Active" ? "Lock profile" : "Unlock profile"}
              </ActionButton>
              <ActionButton disabled={busy} onClick={() => void run("resetSecurity", {}, "Security settings reset; 2-Step Verification re-enabled.")}>
                <ShieldCheck size={15} /> Reset security
              </ActionButton>
            </div>

            <h3>Relationship tier</h3>
            <div className="adm-action-row">
              {["Standard", "Premier", "Private Client", "Business"].map((tier) => (
                <ActionButton key={tier} tone={selected.tier === tier ? "success" : "default"} disabled={busy} onClick={() => void run("setTier", { tier }, `Tier updated to ${tier}.`)}>
                  {tier}
                </ActionButton>
              ))}
            </div>

            <h3>Contact details</h3>
            <form
              className="adm-form"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void run("updateContact", { email, phone }, "Contact details updated.");
              }}
            >
              <Field label="Email">
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
              </Field>
              <Field label="Phone">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </Field>
              <ActionButton type="submit" tone="success" disabled={busy}>
                <Save size={15} /> Save contact details
              </ActionButton>
            </form>

            {detail && (
              <>
                <h3>Accounts ({detail.accounts?.length ?? 0})</h3>
                <Table head={["Account", "Type", "Balance", "Status"]}>
                  {(detail.accounts ?? []).map((a: Row) => (
                    <tr key={a.id}>
                      <td>
                        <strong>{a.nickname || a.name}</strong>
                        <small className="adm-sub">
                          {a.maskedNumber} • {a.productLine}
                        </small>
                      </td>
                      <td>{a.accountType}</td>
                      <td>{moneyExact(a.balance)}</td>
                      <td>
                        <StatusPill value={a.status} />
                      </td>
                    </tr>
                  ))}
                </Table>

                <h3>Cards ({detail.cards?.length ?? 0})</h3>
                <Table head={["Card", "Network", "Status", "Daily limit", "Rewards"]}>
                  {(detail.cards ?? []).map((c: Row) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.cardName}</strong>
                        <small className="adm-sub">····{c.last4} exp {c.expires}</small>
                      </td>
                      <td>{c.network}</td>
                      <td>
                        <StatusPill value={c.status} />
                      </td>
                      <td>{money(c.dailySpendLimit)}</td>
                      <td>{Number(c.rewardsPoints).toLocaleString()}</td>
                    </tr>
                  ))}
                </Table>

                <h3>Recent transactions</h3>
                <Table head={["Date", "Description", "Category", "Amount", "Status"]}>
                  {(detail.transactions ?? []).slice(0, 12).map((t: Row) => (
                    <tr key={t.id}>
                      <td>{t.postedDate}</td>
                      <td>{t.description}</td>
                      <td>{t.category}</td>
                      <td className={Number(t.amount) >= 0 ? "adm-pos" : "adm-neg"}>{moneyExact(t.amount)}</td>
                      <td>
                        <StatusPill value={t.status} />
                      </td>
                    </tr>
                  ))}
                </Table>

                <h3>Alerts & enrolled bills</h3>
                <ul className="adm-list">
                  {(detail.alerts ?? []).map((a: Row) => (
                    <li key={a.id}>
                      <strong>{a.kind}</strong>
                      <small>
                        {a.channel} • {a.threshold} • {a.enabled ? "Enabled" : "Disabled"}
                      </small>
                    </li>
                  ))}
                  {(detail.bills ?? []).map((b: Row) => (
                    <li key={b.id}>
                      <strong>{b.payeeName}</strong>
                      <small>
                        {moneyExact(b.amountDue)} due {b.dueDate} • {b.autoPay ? "Autopay" : "Manual"}
                      </small>
                    </li>
                  ))}
                  {(detail.recipients ?? []).map((r: Row) => (
                    <li key={r.id}>
                      <strong>Zelle® — {r.recipientName}</strong>
                      <small>
                        {r.handleType}: {r.handle}
                      </small>
                    </li>
                  ))}
                </ul>

                <h3>Customer activity log</h3>
                <ul className="adm-list">
                  {(detail.audit ?? []).map((a: Row) => (
                    <li key={a.id}>
                      <strong>{a.action}</strong>
                      <small>
                        {dateTime(a.createdAt)} • {a.detail}
                      </small>
                    </li>
                  ))}
                  {(detail.audit ?? []).length === 0 && <li><small className="adm-sub">No recorded activity yet.</small></li>}
                </ul>
              </>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}

/* ----------------------------- Accounts ----------------------------- */

function AccountsSection({ flash }: { flash: (m: string) => void }) {
  const { rows, facets, q, setQ, status, setStatus, loading, reload } = useAdminData("accounts");
  const [selected, setSelected] = useState<Row | null>(null);
  const [delta, setDelta] = useState("100.00");
  const [rate, setRate] = useState("");
  const [busy, setBusy] = useState(false);

  function open(row: Row) {
    setSelected(row);
    setRate(row.rateOrApr);
    setDelta("100.00");
  }

  async function run(action: string, payload: Record<string, unknown>, message: string) {
    if (!selected) return;
    setBusy(true);
    try {
      await mutate("accounts", action, payload, selected.id);
      flash(message);
      await reload();
      setSelected(null);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel
        title="Accounts & balances"
        subtitle="Adjust balances, freeze accounts and update pricing across every product line"
        action={<span className="adm-count">{loading ? "Loading…" : `${rows.length} accounts`}</span>}
      >
        <FilterBar
          q={q}
          setQ={setQ}
          status={status}
          setStatus={setStatus}
          placeholder="Search account name, number or product…"
          statusOptions={[
            { value: "Open", label: "Open" },
            { value: "Restricted", label: "Restricted" },
            { value: "Frozen", label: "Frozen" },
            { value: "Dormant", label: "Dormant" },
            { value: "Closed", label: "Closed" },
          ]}
        />
        <Table head={["Account", "Customer", "Type", "Balance", "Available", "Pricing", "Status", ""]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <strong>
                  {r.nickname || r.name} <em>{r.maskedNumber}</em>
                </strong>
                <small className="adm-sub">{r.productLine}</small>
              </td>
              <td>
                {r.customerName}
                <small className="adm-sub">{r.customerTier}</small>
              </td>
              <td>{r.accountType}</td>
              <td>{moneyExact(r.balance)}</td>
              <td>{moneyExact(r.availableBalance)}</td>
              <td>{r.rateOrApr}</td>
              <td>
                <StatusPill value={r.status} />
              </td>
              <td>
                <ActionButton onClick={() => open(r)}>Manage</ActionButton>
              </td>
            </tr>
          ))}
        </Table>
        {facets.length > 0 && (
          <p className="adm-footnote">Product lines in scope: {facets.join(", ")}.</p>
        )}
      </Panel>

      <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `${selected.nickname || selected.name} ${selected.maskedNumber}` : ""} subtitle={selected ? `${selected.customerName} • ${selected.productLine} • Opened ${selected.openedOn}` : ""}>
        {selected && (
          <>
            <div className="adm-drawer-kpis">
              <div>
                <span>Balance</span>
                <strong>{moneyExact(selected.balance)}</strong>
              </div>
              <div>
                <span>Available</span>
                <strong>{moneyExact(selected.availableBalance)}</strong>
              </div>
              <div>
                <span>Credit limit</span>
                <strong>{selected.creditLimit ? moneyExact(selected.creditLimit) : "—"}</strong>
              </div>
              <div>
                <span>Pricing</span>
                <strong>{selected.rateOrApr}</strong>
              </div>
            </div>

            <h3>Balance adjustment</h3>
            <form
              className="adm-form"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void run("adjustBalance", { delta: Number(delta) }, `Balance adjusted by ${moneyExact(delta)}.`);
              }}
            >
              <Field label="Adjustment amount (use negative to debit)">
                <input type="number" step="0.01" value={delta} onChange={(e) => setDelta(e.target.value)} required />
              </Field>
              <ActionButton type="submit" tone="success" disabled={busy}>
                <Save size={15} /> Post adjustment
              </ActionButton>
            </form>
            <p className="adm-footnote">Projected balance after posting: {moneyExact(Number(selected.balance) + Number(delta))}</p>

            <h3>Account status</h3>
            <div className="adm-action-row">
              {["Open", "Restricted", "Frozen", "Dormant", "Closed"].map((s) => (
                <ActionButton key={s} tone={selected.status === s ? "success" : s === "Frozen" || s === "Closed" ? "danger" : "default"} disabled={busy} onClick={() => void run("setStatus", { status: s }, `Account status set to ${s}.`)}>
                  {s}
                </ActionButton>
              ))}
            </div>

            <h3>Pricing</h3>
            <form
              className="adm-form"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void run("setRate", { rate }, "Pricing updated.");
              }}
            >
              <Field label="Rate / APY / APR label">
                <input value={rate} onChange={(e) => setRate(e.target.value)} required />
              </Field>
              <ActionButton type="submit" tone="success" disabled={busy}>
                <Save size={15} /> Save pricing
              </ActionButton>
            </form>
          </>
        )}
      </Drawer>
    </>
  );
}

/* --------------------------- Transactions --------------------------- */

function TransactionsSection({ flash }: { flash: (m: string) => void }) {
  const { rows, q, setQ, status, setStatus, loading, reload } = useAdminData("transactions");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function run(id: number, action: string, payload: Record<string, unknown>, message: string) {
    setBusyId(id);
    try {
      await mutate("transactions", action, payload, id);
      flash(message);
      await reload();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  const flagged = rows.filter((r) => r.flagged).length;

  return (
    <Panel
      title="Transaction ledger"
      subtitle={`${rows.length} entries • ${flagged} flagged for review`}
      action={<span className="adm-count">{loading ? "Loading…" : `${rows.length} records`}</span>}
    >
      <FilterBar
        q={q}
        setQ={setQ}
        status={status}
        setStatus={setStatus}
        placeholder="Search description or category…"
        statusOptions={[
          { value: "Posted", label: "Posted" },
          { value: "Pending", label: "Pending" },
          { value: "Completed", label: "Completed" },
          { value: "Scheduled", label: "Scheduled" },
          { value: "Disputed", label: "Disputed" },
          { value: "Under Review", label: "Under Review" },
          { value: "Voided", label: "Voided" },
        ]}
      />
      <Table head={["Date", "Description", "Account", "Customer", "Category", "Amount", "Status", "Actions"]}>
        {rows.map((r) => (
          <tr key={r.id} className={r.flagged ? "adm-row-flagged" : undefined}>
            <td>{r.postedDate}</td>
            <td>
              <strong>{r.description}</strong>
              {r.flagged && <small className="adm-sub">Flagged for fraud review</small>}
            </td>
            <td>
              {r.accountName} <em>{r.accountMasked}</em>
            </td>
            <td>
              {r.customerName}
              <small className="adm-sub">@{r.customerUsername}</small>
            </td>
            <td>{r.category}</td>
            <td className={Number(r.amount) >= 0 ? "adm-pos" : "adm-neg"}>{moneyExact(r.amount)}</td>
            <td>
              <StatusPill value={r.status} />
            </td>
            <td>
              <div className="adm-action-row">
                <ActionButton disabled={busyId === r.id} onClick={() => void run(r.id, "flag", {}, r.flagged ? "Flag cleared." : "Transaction flagged.")}>
                  {r.flagged ? "Unflag" : <><AlertTriangle size={14} /> Flag</>}
                </ActionButton>
                <ActionButton tone="danger" disabled={busyId === r.id || r.status === "Voided"} onClick={() => void run(r.id, "void", {}, "Transaction voided and funds reversed.")}>
                  Void
                </ActionButton>
                {(r.status === "Disputed" || r.status === "Under Review") && (
                  <ActionButton tone="success" disabled={busyId === r.id} onClick={() => void run(r.id, "resolveDispute", { status: "Posted" }, "Dispute resolved.")}>
                    Resolve
                  </ActionButton>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </Panel>
  );
}

/* ------------------------------- Cards ------------------------------- */

function CardsSection({ flash }: { flash: (m: string) => void }) {
  const { rows, q, setQ, loading, reload } = useAdminData("cards");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function run(id: number, action: string, payload: Record<string, unknown>, message: string) {
    setBusyId(id);
    try {
      await mutate("cards", action, payload, id);
      flash(message);
      await reload();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Panel title="Card portfolio" subtitle="Lock, replace or re-issue cards and adjust daily spend limits" action={<span className="adm-count">{loading ? "Loading…" : `${rows.length} cards`}</span>}>
      <FilterBar q={q} setQ={setQ} placeholder="Search card name or customer…" />
      <Table head={["Card", "Customer", "Network", "Status", "Daily limit", "Rewards", "Wallets", "Actions"]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>
              <strong>{r.cardName}</strong>
              <small className="adm-sub">
                ····{r.last4} exp {r.expires} • {r.accountName}
              </small>
            </td>
            <td>{r.customerName}</td>
            <td>{r.network}</td>
            <td>
              <StatusPill value={r.status} />
            </td>
            <td>{money(r.dailySpendLimit)}</td>
            <td>{Number(r.rewardsPoints).toLocaleString()}</td>
            <td className="adm-cell-muted">{r.digitalWallets}</td>
            <td>
              <div className="adm-action-row">
                <ActionButton tone={r.status === "Locked" ? "success" : "danger"} disabled={busyId === r.id} onClick={() => void run(r.id, "setStatus", { status: r.status === "Locked" ? "Active" : "Locked" }, `Card ${r.status === "Locked" ? "unlocked" : "locked"}.`)}>
                  {r.status === "Locked" ? <><Unlock size={14} /> Unlock</> : <><Lock size={14} /> Lock</>}
                </ActionButton>
                <ActionButton disabled={busyId === r.id} onClick={() => void run(r.id, "setLimit", { limit: Math.max(100, Number(r.dailySpendLimit) * 2) }, "Daily limit doubled.")}>
                  Double limit
                </ActionButton>
                <ActionButton disabled={busyId === r.id} onClick={() => void run(r.id, "setStatus", { status: "Replaced" }, "Replacement card ordered.")}>
                  Replace
                </ActionButton>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </Panel>
  );
}

/* --------------------------- Appointments --------------------------- */

function AppointmentsSection({ flash }: { flash: (m: string) => void }) {
  const { rows, q, setQ, status, setStatus, loading, reload } = useAdminData("appointments");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function run(id: number, action: string, payload: Record<string, unknown>, message: string) {
    setBusyId(id);
    try {
      await mutate("appointments", action, payload, id);
      flash(message);
      await reload();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Panel title="Appointment queue" subtitle="Approve, reschedule, decline or cancel banker appointments" action={<span className="adm-count">{loading ? "Loading…" : `${rows.length} appointments`}</span>}>
      <FilterBar
        q={q}
        setQ={setQ}
        status={status}
        setStatus={setStatus}
        placeholder="Search customer, topic, branch or code…"
        statusOptions={[
          { value: "Scheduled", label: "Scheduled" },
          { value: "Pending Approval", label: "Pending Approval" },
          { value: "Confirmed", label: "Confirmed" },
          { value: "Rescheduled", label: "Rescheduled" },
          { value: "Declined", label: "Declined" },
          { value: "Canceled", label: "Canceled" },
        ]}
      />
      {rows.length === 0 && !loading && (
        <p className="adm-empty">
          No appointments booked yet. Customers schedule visits from the{" "}
          <Link href="/appointments" className="adm-inline-link">
            public appointment page
          </Link>
          .
        </p>
      )}
      <Table head={["Code", "Customer", "Topic", "Location", "When", "Status", "Actions"]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>
              <code>{r.confirmationCode}</code>
            </td>
            <td>
              <strong>{r.fullName}</strong>
              <small className="adm-sub">
                {r.email} • {r.phone}
              </small>
            </td>
            <td>
              {r.topic}
              <small className="adm-sub">{r.meetingType}</small>
            </td>
            <td className="adm-cell-muted">{r.branchName}</td>
            <td>
              {r.appointmentDate}
              <small className="adm-sub">{r.appointmentTime}</small>
            </td>
            <td>
              <StatusPill value={r.status} />
            </td>
            <td>
              <div className="adm-action-row">
                {r.status !== "Confirmed" && r.status !== "Canceled" && (
                  <ActionButton tone="success" disabled={busyId === r.id} onClick={() => void run(r.id, "approve", {}, "Appointment confirmed.")}>
                    Approve
                  </ActionButton>
                )}
                <ActionButton disabled={busyId === r.id} onClick={() => void run(r.id, "reschedule", {}, "Appointment rescheduled.")}>
                  Reschedule
                </ActionButton>
                <ActionButton tone="danger" disabled={busyId === r.id || r.status === "Canceled"} onClick={() => void run(r.id, "cancel", {}, "Appointment canceled.")}>
                  Cancel
                </ActionButton>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </Panel>
  );
}

/* ------------------------------- Fraud ------------------------------- */

function FraudSection({ flash }: { flash: (m: string) => void }) {
  const { rows, q, setQ, status, setStatus, loading, reload } = useAdminData("fraud");
  const [selected, setSelected] = useState<Row | null>(null);
  const [refund, setRefund] = useState("0");
  const [busy, setBusy] = useState(false);

  async function run(action: string, payload: Record<string, unknown>, message: string) {
    if (!selected) return;
    setBusy(true);
    try {
      await mutate("fraud", action, payload, selected.id);
      flash(message);
      await reload();
      setSelected(null);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel title="Fraud & security cases" subtitle="Triage customer-reported incidents, authorize reimbursements and close cases" action={<span className="adm-count">{loading ? "Loading…" : `${rows.length} cases`}</span>}>
        <FilterBar
          q={q}
          setQ={setQ}
          status={status}
          setStatus={setStatus}
          placeholder="Search reference, email or incident type…"
          statusOptions={[
            { value: "Under Review", label: "Under Review" },
            { value: "Acknowledged", label: "Acknowledged" },
            { value: "Under Investigation", label: "Under Investigation" },
            { value: "Resolved", label: "Resolved" },
            { value: "Closed — No Loss", label: "Closed — No Loss" },
          ]}
        />
        {rows.length === 0 && !loading && (
          <p className="adm-empty">
            No fraud cases filed yet. Customers submit reports from the{" "}
            <Link href="/privacy-security/fraud/report" className="adm-inline-link">
              Report Fraud page
            </Link>
            .
          </p>
        )}
        <Table head={["Reference", "Incident", "Channel", "Reported", "Customer email", "Refund", "Status", ""]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <code>{r.referenceCode}</code>
              </td>
              <td>
                <strong>{r.incidentType}</strong>
                <small className="adm-sub">{String(r.summary).slice(0, 90)}…</small>
              </td>
              <td>{r.channel}</td>
              <td>{r.incidentDate}</td>
              <td className="adm-cell-muted">{r.contactEmail}</td>
              <td>{moneyExact(r.refundAmount)}</td>
              <td>
                <StatusPill value={r.status} />
              </td>
              <td>
                <ActionButton
                  onClick={() => {
                    setSelected(r);
                    setRefund(String(r.refundAmount ?? "0"));
                  }}
                >
                  Triage
                </ActionButton>
              </td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `Case ${selected.referenceCode}` : ""} subtitle={selected ? `${selected.incidentType} • reported ${selected.incidentDate}` : ""}>
        {selected && (
          <>
            <div className="adm-quote">
              <strong>Customer statement</strong>
              <p>{selected.summary}</p>
              <small>
                Channel: {selected.channel} • Contact: {selected.contactEmail} • Filed {dateTime(selected.createdAt)}
              </small>
            </div>

            <h3>Case workflow</h3>
            <div className="adm-action-row">
              <ActionButton disabled={busy} onClick={() => void run("acknowledge", {}, "Case acknowledged.")}>
                Acknowledge
              </ActionButton>
              <ActionButton disabled={busy} onClick={() => void run("investigate", {}, "Case moved to investigation.")}>
                <FileSearch size={15} /> Investigate
              </ActionButton>
              <ActionButton tone="danger" disabled={busy} onClick={() => void run("close", {}, "Case closed with no loss.")}>
                Close — no loss
              </ActionButton>
            </div>

            <h3>Authorize reimbursement</h3>
            <form
              className="adm-form"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void run("resolve", { refund: Number(refund) }, `Case resolved with ${moneyExact(refund)} reimbursement.`);
              }}
            >
              <Field label="Refund amount ($)">
                <input type="number" min="0" step="0.01" value={refund} onChange={(e) => setRefund(e.target.value)} required />
              </Field>
              <ActionButton type="submit" tone="success" disabled={busy}>
                <CheckCircle2 size={15} /> Resolve &amp; reimburse
              </ActionButton>
            </form>
            <p className="adm-footnote">
              Resolving a case records a high-severity audit entry and credits the customer for the authorized amount.
            </p>
          </>
        )}
      </Drawer>
    </>
  );
}

/* ---------------------------- Applications ---------------------------- */

function InquiriesSection({ flash }: { flash: (m: string) => void }) {
  const { rows, q, setQ, status, setStatus, loading, reload } = useAdminData("inquiries");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function run(id: number, action: string, message: string) {
    setBusyId(id);
    try {
      await mutate("inquiries", action, {}, id);
      flash(message);
      await reload();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Panel title="Product applications" subtitle="Review account, card, loan and career applications submitted from the public site" action={<span className="adm-count">{loading ? "Loading…" : `${rows.length} applications`}</span>}>
      <FilterBar
        q={q}
        setQ={setQ}
        status={status}
        setStatus={setStatus}
        placeholder="Search applicant, product or reference…"
        statusOptions={[
          { value: "Pending Review", label: "Pending Review" },
          { value: "More Information Requested", label: "More Information Requested" },
          { value: "Approved", label: "Approved" },
          { value: "Declined", label: "Declined" },
        ]}
      />
      {rows.length === 0 && !loading && <p className="adm-empty">No applications submitted yet.</p>}
      <Table head={["Reference", "Applicant", "Product", "Category", "ZIP", "Submitted", "Status", "Actions"]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>
              <code>{r.referenceCode}</code>
            </td>
            <td>
              <strong>{r.applicantName}</strong>
              <small className="adm-sub">{r.email}</small>
            </td>
            <td>{r.productName}</td>
            <td>{r.category}</td>
            <td>{r.zipCode}</td>
            <td>{dateTime(r.createdAt)}</td>
            <td>
              <StatusPill value={r.status} />
            </td>
            <td>
              <div className="adm-action-row">
                <ActionButton tone="success" disabled={busyId === r.id || r.status === "Approved"} onClick={() => void run(r.id, "approve", "Application approved.")}>
                  Approve
                </ActionButton>
                <ActionButton disabled={busyId === r.id} onClick={() => void run(r.id, "requestInfo", "Information request sent.")}>
                  Request info
                </ActionButton>
                <ActionButton tone="danger" disabled={busyId === r.id || r.status === "Declined"} onClick={() => void run(r.id, "deny", "Application declined.")}>
                  Decline
                </ActionButton>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </Panel>
  );
}

/* ------------------------------ Branches ------------------------------ */

const emptyBranch = {
  code: "",
  name: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  lobbyHours: "Mon–Fri 9:00 AM – 5:00 PM",
  saturdayHours: "Sat 9:00 AM – 1:00 PM",
  status: "Open",
  has24HrAtm: true,
  hasDriveUp: false,
  hasNotary: true,
  hasSafeDeposit: false,
  hasPremierBanker: false,
  hasSpanish: true,
};

function BranchesSection({ flash }: { flash: (m: string) => void }) {
  const { rows, q, setQ, loading, reload } = useAdminData("branches");
  const [form, setForm] = useState<Row>(emptyBranch);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof Row>(key: K, value: Row[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (editingId) {
        await mutate("branches", "update", form, editingId);
        flash("Branch updated.");
      } else {
        await mutate("branches", "create", form);
        flash("Branch published to the locator.");
      }
      setForm(emptyBranch);
      setEditingId(null);
      await reload();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Unable to save branch.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: Row) {
    setBusy(true);
    try {
      await mutate("branches", "delete", {}, row.id);
      flash(`Branch ${row.code} removed.`);
      await reload();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Unable to delete branch.");
    } finally {
      setBusy(false);
    }
  }

  const serviceFlags: { key: string; label: string }[] = [
    { key: "has24HrAtm", label: "24-hour ATM" },
    { key: "hasDriveUp", label: "Drive-up" },
    { key: "hasNotary", label: "Notary" },
    { key: "hasSafeDeposit", label: "Safe deposit" },
    { key: "hasPremierBanker", label: "Premier banker" },
    { key: "hasSpanish", label: "Español" },
  ];

  return (
    <>
      <Panel title={editingId ? `Edit branch ${form.code}` : "Add a branch location"} subtitle="New locations appear immediately in the public ATM & branch locator">
        <form className="adm-form adm-form-grid" onSubmit={submit}>
          <Field label="Branch code *">
            <input required value={form.code} disabled={Boolean(editingId)} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="BOS-BACK" />
          </Field>
          <Field label="Branch name *">
            <input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Boston Back Bay Branch" />
          </Field>
          <Field label="Street address *">
            <input required value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="200 Clarendon St" />
          </Field>
          <Field label="City *">
            <input required value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Boston" />
          </Field>
          <Field label="State *">
            <input required maxLength={2} value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase())} placeholder="MA" />
          </Field>
          <Field label="ZIP *">
            <input required value={form.zip} onChange={(e) => set("zip", e.target.value)} placeholder="02116" />
          </Field>
          <Field label="Phone *">
            <input required value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(617) 555-0100" />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option>Open</option>
              <option>Closed</option>
              <option>Temporarily Closed</option>
            </select>
          </Field>
          <Field label="Lobby hours">
            <input value={form.lobbyHours} onChange={(e) => set("lobbyHours", e.target.value)} />
          </Field>
          <Field label="Saturday hours">
            <input value={form.saturdayHours} onChange={(e) => set("saturdayHours", e.target.value)} />
          </Field>
          <div className="adm-checkbox-grid">
            {serviceFlags.map((f) => (
              <label key={f.key} className="adm-check">
                <input type="checkbox" checked={Boolean(form[f.key])} onChange={(e) => set(f.key, e.target.checked)} />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
          <div className="adm-action-row">
            <ActionButton type="submit" tone="success" disabled={busy}>
              <Save size={15} /> {editingId ? "Save changes" : "Publish branch"}
            </ActionButton>
            {editingId && (
              <ActionButton
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyBranch);
                }}
              >
                Cancel edit
              </ActionButton>
            )}
          </div>
        </form>
      </Panel>

      <Panel title="Branch network" subtitle={`${rows.length} locations in the locator database`} action={<span className="adm-count">{loading ? "Loading…" : `${rows.length} branches`}</span>}>
        <FilterBar q={q} setQ={setQ} placeholder="Search city, state, ZIP or branch name…" />
        <Table head={["Branch", "Location", "Phone", "Hours", "Services", "Status", "Actions"]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <strong>{r.name}</strong>
                <small className="adm-sub">
                  <code>{r.code}</code>
                </small>
              </td>
              <td>
                {r.address}
                <small className="adm-sub">
                  {r.city}, {r.state} {r.zip}
                </small>
              </td>
              <td>{r.phone}</td>
              <td className="adm-cell-muted">
                {r.lobbyHours}
                <small className="adm-sub">{r.saturdayHours}</small>
              </td>
              <td className="adm-cell-muted">
                {[r.has24HrAtm && "24hr ATM", r.hasDriveUp && "Drive-up", r.hasNotary && "Notary", r.hasSafeDeposit && "Safe deposit", r.hasPremierBanker && "Premier", r.hasSpanish && "Español"]
                  .filter(Boolean)
                  .join(" • ")}
              </td>
              <td>
                <StatusPill value={r.status} />
              </td>
              <td>
                <div className="adm-action-row">
                  <ActionButton
                    onClick={() => {
                      setEditingId(r.id);
                      setForm({ ...emptyBranch, ...r });
                    }}
                  >
                    Edit
                  </ActionButton>
                  <ActionButton tone="danger" disabled={busy} onClick={() => void remove(r)}>
                    <Trash2 size={14} /> Delete
                  </ActionButton>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}

/* ------------------------------- Content ------------------------------- */

function ContentSection({ overview, flash }: { overview: Overview | null; flash: (m: string) => void }) {
  const [draft, setDraft] = useState(overview?.rateSetting ?? "{}");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (overview?.rateSetting) setDraft(overview.rateSetting);
  }, [overview?.rateSetting]);

  async function publish() {
    setError("");
    try {
      JSON.parse(draft);
    } catch {
      setError("Invalid JSON — fix the syntax before publishing.");
      return;
    }
    setBusy(true);
    try {
      await mutate("settings", "update", { key: "rates", value: draft });
      flash("Rate sheet published to /help/rates.");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Unable to publish.");
    } finally {
      setBusy(false);
    }
  }

  let parsed: Row | null = null;
  try {
    parsed = JSON.parse(draft) as Row;
  } catch {
    parsed = null;
  }

  return (
    <>
      <Panel
        title="Interest rate publisher"
        subtitle="Edits publish instantly to the public Interest Rates Today page"
        action={
          <div className="adm-action-row">
            <ActionButton disabled={busy} onClick={() => setDraft(JSON.stringify(parsed ?? {}, null, 2))}>
              Format JSON
            </ActionButton>
            <ActionButton tone="success" disabled={busy} onClick={() => void publish()}>
              <Save size={15} /> Publish rate sheet
            </ActionButton>
          </div>
        }
      >
        <textarea className="adm-editor" value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false} aria-label="Rate sheet JSON" />
        {error && <p className="adm-error">{error}</p>}
        {parsed && (
          <div className="adm-grid-3" style={{ marginTop: 18 }}>
            {Object.entries(parsed).map(([group, items]) => (
              <div key={group} className="adm-preview-card">
                <h3>{group}</h3>
                <Table head={Object.keys((items as Row[])[0] ?? { Item: "" })}>
                  {(items as Row[]).map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((v, i) => (
                        <td key={i}>{String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </Table>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}

/* ---------------------------- Search catalog ---------------------------- */

function SearchIndexSection({ flash }: { flash: (m: string) => void }) {
  const { rows, q, setQ, loading, reload } = useAdminData("searchIndex");
  const [form, setForm] = useState<Row>({ title: "", description: "", category: "", keywords: "", url: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (editingId) {
        await mutate("searchIndex", "update", form, editingId);
        flash("Search entry updated.");
      } else {
        await mutate("searchIndex", "create", form);
        flash("Search entry published.");
      }
      setForm({ title: "", description: "", category: "", keywords: "", url: "" });
      setEditingId(null);
      await reload();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Unable to save entry.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: Row) {
    setBusy(true);
    try {
      await mutate("searchIndex", "delete", {}, row.id);
      flash(`Removed “${row.title}” from search.`);
      await reload();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Unable to delete entry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel title={editingId ? "Edit search entry" : "Add a search entry"} subtitle="Controls what customers find in the site-wide search dialog">
        <form className="adm-form adm-form-grid" onSubmit={submit}>
          <Field label="Title *">
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Checking Accounts" />
          </Field>
          <Field label="Internal URL *">
            <input required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="/checking" />
          </Field>
          <Field label="Category *">
            <input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Personal Banking" />
          </Field>
          <Field label="Keywords">
            <input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="checking everyday premier" />
          </Field>
          <div className="adm-field-wide">
            <Field label="Description *">
              <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short customer-facing summary" />
            </Field>
          </div>
          <div className="adm-action-row">
            <ActionButton type="submit" tone="success" disabled={busy}>
              <Save size={15} /> {editingId ? "Save entry" : "Publish entry"}
            </ActionButton>
            {editingId && (
              <ActionButton
                onClick={() => {
                  setEditingId(null);
                  setForm({ title: "", description: "", category: "", keywords: "", url: "" });
                }}
              >
                Cancel edit
              </ActionButton>
            )}
          </div>
        </form>
      </Panel>

      <Panel title="Search catalog" subtitle={`${rows.length} indexed pages`} action={<span className="adm-count">{loading ? "Loading…" : `${rows.length} entries`}</span>}>
        <FilterBar q={q} setQ={setQ} placeholder="Search title, URL or keyword…" />
        <Table head={["Title", "URL", "Category", "Description", "Actions"]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <strong>{r.title}</strong>
                <small className="adm-sub">{r.keywords}</small>
              </td>
              <td>
                <Link href={r.url} className="adm-inline-link">
                  {r.url} <ChevronRight size={13} />
                </Link>
              </td>
              <td>{r.category}</td>
              <td className="adm-cell-muted">{r.description}</td>
              <td>
                <div className="adm-action-row">
                  <ActionButton onClick={() => { setEditingId(r.id); setForm({ title: r.title, description: r.description, category: r.category, keywords: r.keywords, url: r.url }); }}>
                    Edit
                  </ActionButton>
                  <ActionButton tone="danger" disabled={busy} onClick={() => void remove(r)}>
                    <Trash2 size={14} /> Delete
                  </ActionButton>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}

/* ------------------------------- Audit ------------------------------- */

function AuditSection() {
  const { rows, q, setQ, status, setStatus, loading } = useAdminData("audit");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) map[r.severity] = (map[r.severity] ?? 0) + 1;
    return map;
  }, [rows]);

  async function purge() {
    setBusy(true);
    try {
      await mutate("audit", "clear", {});
      setMessage("Audit trail purged and a new purge event recorded.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to purge audit trail.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Audit trail"
      subtitle={`${rows.length} recorded events • ${Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(" • ")}`}
      action={
        <ActionButton tone="danger" disabled={busy} onClick={() => void purge()}>
          <Trash2 size={15} /> Purge history
        </ActionButton>
      }
    >
      <FilterBar
        q={q}
        setQ={setQ}
        status={status}
        setStatus={setStatus}
        placeholder="Search actor, action, resource or detail…"
        statusOptions={[
          { value: "Info", label: "Info" },
          { value: "Medium", label: "Medium" },
          { value: "High", label: "High" },
        ]}
      />
      {message && <p className="adm-notice-inline">{message}</p>}
      <Table head={["Timestamp", "Actor", "Action", "Resource", "Detail", "Severity"]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{dateTime(r.createdAt)}</td>
            <td>
              <strong>{r.actor}</strong>
            </td>
            <td>
              <code>{r.action}</code>
            </td>
            <td>{r.resourceLabel ?? r.resource}</td>
            <td className="adm-cell-muted">{r.detail}</td>
            <td>
              <StatusPill value={r.severity} />
            </td>
          </tr>
        ))}
      </Table>
      {loading && <p className="adm-empty">Loading audit history…</p>}
    </Panel>
  );
}
