"use client";

import { AdminSubPage } from "@/components/admin-subpage";
import { adminFetch } from "@/lib/client-auth";
import { CheckCircle2, MessageSquare, Plus, Search, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type ManagedUser = {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  tier: string;
  status: string;
  assignedAdminId: number | null;
  adminName: string | null;
  relationshipSince: string;
  createdAt: string;
  accountCount: number;
  deposits: string;
};

type AdminOption = { id: number; fullName: string; role: string };

export function AdminUsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [viewer, setViewer] = useState<{ fullName: string; roleType: string } | null>(null);
  const [canCreate, setCanCreate] = useState(false);
  const [canReassign, setCanReassign] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("(415) 555-0100");
  const [tier, setTier] = useState("Standard");
  const [password, setPassword] = useState("WelcomeBank!2026");
  const [openingDeposit, setOpeningDeposit] = useState("500");
  const [assignedAdminId, setAssignedAdminId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await adminFetch("/api/admin/customers");
    if (res.ok) {
      const data = (await res.json()) as {
        customers: ManagedUser[];
        admins: AdminOption[];
        viewer: { fullName: string; roleType: string };
        canCreateUsers: boolean;
        canReassign: boolean;
      };
      setUsers(data.customers ?? []);
      setAdmins(data.admins ?? []);
      setViewer(data.viewer ?? null);
      setCanCreate(Boolean(data.canCreateUsers));
      setCanReassign(Boolean(data.canReassign));
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => users.filter((u) => !query || `${u.fullName} ${u.username} ${u.email} ${u.tier}`.toLowerCase().includes(query.toLowerCase())) , [users, query]);

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setMessage("");
    const payload: Record<string, unknown> = { fullName, username, email, phone, tier, password, openingDeposit: Number(openingDeposit) };
    if (canReassign && assignedAdminId) payload.assignedAdminId = Number(assignedAdminId);
    const res = await adminFetch("/api/admin/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { error?: string; customer?: { fullName: string; username: string; ownerName: string }; temporaryPassword?: string };
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Unable to create user.");
    setMessage(`Created ${data.customer?.fullName} (@${data.customer?.username}) assigned to ${data.customer?.ownerName}. Temporary password: ${data.temporaryPassword}.`);
    setFullName(""); setUsername(""); setEmail("");
    await load();
  }

  async function reassign(id: number, ownerId: number) {
    const res = await adminFetch("/api/admin/customers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, assignedAdminId: ownerId }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      return setError(data.error ?? "Unable to reassign user.");
    }
    setMessage("User reassigned.");
    await load();
  }

  return (
    <AdminSubPage
      title={viewer?.roleType === "super_admin" ? "User Management" : "My Users"}
      subtitle={viewer?.roleType === "super_admin"
        ? "Super Admins can create users for any Limited Admin, reassign ownership, and see every relationship."
        : "Create users under your own admin account, view their balances, and support them in the Secure Message Center."}
    >
      {message && <div className="adm-hierarchy-alert ok"><CheckCircle2 size={17} /> {message}</div>}
      {error && <div className="adm-hierarchy-alert error"><ShieldCheck size={17} /> {error}</div>}

      <div className="adm-hierarchy-kpis">
        <div><span>Users in scope</span><strong>{users.length}</strong></div>
        <div><span>Total deposits</span><strong>${users.reduce((s, u) => s + Number(u.deposits || 0), 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}</strong></div>
        <div><span>Active relationships</span><strong>{users.filter((u) => u.status === "Active").length}</strong></div>
        <div><span>Role</span><strong>{viewer?.roleType === "super_admin" ? "Super Admin" : "Limited Admin"}</strong></div>
      </div>

      {canCreate && (
        <section className="adm-panel adm-hierarchy-panel">
          <h2><Plus size={19} /> Create a user under {viewer?.roleType === "super_admin" ? "an administrator" : "your account"}</h2>
          <form className="adm-hierarchy-form" onSubmit={createUser}>
            <label className="adm-field"><span>Full name</span><input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g., Morgan Lee" /></label>
            <label className="adm-field"><span>Username</span><input required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="morgan_lee" /></label>
            <label className="adm-field"><span>Email</span><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="morgan@example.com" /></label>
            <label className="adm-field"><span>Phone</span><input value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
            <label className="adm-field"><span>Relationship tier</span><select value={tier} onChange={(e) => setTier(e.target.value)}><option>Standard</option><option>Premier</option><option>Private Client</option><option>Business</option></select></label>
            <label className="adm-field"><span>Opening deposit ($)</span><input type="number" min="0" step="50" value={openingDeposit} onChange={(e) => setOpeningDeposit(e.target.value)} /></label>
            <label className="adm-field"><span>Temporary password</span><input value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            {canReassign && (
              <label className="adm-field"><span>Assign to admin</span>
                <select value={assignedAdminId} onChange={(e) => setAssignedAdminId(e.target.value)}>
                  <option value="">Create &amp; assign to me (Super Admin)</option>
                  {admins.filter((a) => a.role.includes("Limited") || a.role.includes("Support")).map((a) => <option key={a.id} value={a.id}>{a.fullName} — {a.role}</option>)}
                </select>
              </label>
            )}
            <button type="submit" className="adm-btn-primary" disabled={busy}>{busy ? "Creating…" : "Create User"}</button>
          </form>
        </section>
      )}

      <section className="adm-panel adm-hierarchy-panel">
        <div className="adm-hierarchy-panel-head">
          <h2><Users size={19} /> {viewer?.roleType === "super_admin" ? "All users" : "Your users"} ({filtered.length})</h2>
          <div className="adm-hierarchy-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users" /></div>
        </div>
        {loading ? <p className="wf-muted">Loading users…</p> : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>User</th><th>Tier</th><th>Status</th><th>Managing admin</th><th>Accounts</th><th>Deposits</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.fullName}</strong><small>@{u.username} · {u.email}</small></td>
                    <td>{u.tier}</td>
                    <td><span className={`adm-hierarchy-pill ${u.status === "Active" ? "super" : "limited"}`}>{u.status}</span></td>
                    <td>{u.adminName ?? "Unassigned"}</td>
                    <td>{u.accountCount}</td>
                    <td>${Number(u.deposits || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                    <td>
                      <div className="adm-hierarchy-row-actions">
                        <Link href={`/online-banking/dashboard?user=${encodeURIComponent(u.username)}`} className="adm-link-btn">View dashboard</Link>
                        <Link href="/admin/support" className="adm-link-btn"><MessageSquare size={14} /> Message</Link>
                        {canReassign && (
                          <select value={u.assignedAdminId ?? ""} onChange={(e) => void reassign(u.id, Number(e.target.value))} aria-label={`Reassign ${u.fullName}`}>
                            <option value="">Reassign…</option>
                            {admins.map((a) => <option key={a.id} value={a.id}>{a.fullName}</option>)}
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7}><p className="wf-muted">No users in your scope yet.</p></td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminSubPage>
  );
}
