"use client";

import { AdminSubPage } from "@/components/admin-subpage";
import { adminFetch } from "@/lib/client-auth";
import { CheckCircle2, Crown, ShieldCheck, Trash2, UserCog, Users } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type TeamAdmin = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  roleType: "super_admin" | "limited_admin" | "auditor";
  parentAdminId: number | null;
  status: string;
  email: string;
  lastSignInAt: string | null;
  createdAt: string;
  customerCount: number;
};

export function AdminTeamPage() {
  const [admins, setAdmins] = useState<TeamAdmin[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("SupportAgent!2026");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await adminFetch("/api/admin/team");
    if (res.ok) {
      const data = (await res.json()) as { admins: TeamAdmin[]; canCreateAdmins: boolean };
      setAdmins(data.admins ?? []);
      setCanCreate(Boolean(data.canCreateAdmins));
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createAdmin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const res = await adminFetch("/api/admin/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, username, email, password, role: "Limited Admin — Support Agent" }),
    });
    const data = (await res.json()) as { error?: string; admin?: { fullName: string; username: string }; temporaryPassword?: string };
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Unable to create admin.");
    setMessage(`Created ${data.admin?.fullName} (@${data.admin?.username}) with temporary password ${data.temporaryPassword}.`);
    setFullName(""); setUsername(""); setEmail("");
    await load();
  }

  async function setStatus(id: number, status: string) {
    setError("");
    const res = await adminFetch("/api/admin/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      return setError(data.error ?? "Unable to update admin.");
    }
    setMessage(`Administrator status set to ${status}.`);
    await load();
  }

  async function removeAdmin(id: number) {
    if (!window.confirm("Remove this Limited Admin? Their users will remain for reassignment.")) return;
    const res = await adminFetch(`/api/admin/team?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      return setError(data.error ?? "Unable to delete admin.");
    }
    setMessage("Limited Admin removed.");
    await load();
  }

  return (
    <AdminSubPage title="Administrator Team" subtitle="Only a Super Admin can create, suspend, or remove Limited Admins. Limited Admins can view the team but never manage it.">
      {message && <div className="adm-hierarchy-alert ok"><CheckCircle2 size={17} /> {message}</div>}
      {error && <div className="adm-hierarchy-alert error"><ShieldCheck size={17} /> {error}</div>}

      {canCreate && (
        <section className="adm-panel adm-hierarchy-panel">
          <h2><UserCog size={19} /> Create a Limited Admin under your account</h2>
          <p className="wf-muted">New admins are always created with the <code>limited_admin</code> role, parented to you. They may create users and act as support agents — never create other admins.</p>
          <form className="adm-hierarchy-form" onSubmit={createAdmin}>
            <label className="adm-field"><span>Full name</span><input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g., Jamie Rivera" /></label>
            <label className="adm-field"><span>Username</span><input required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="jamie_rivera" /></label>
            <label className="adm-field"><span>Email</span><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jamie@wellsfargo.internal" /></label>
            <label className="adm-field"><span>Temporary password</span><input required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <button type="submit" className="adm-btn-primary" disabled={busy}>{busy ? "Creating…" : "Create Limited Admin"}</button>
          </form>
        </section>
      )}

      {!canCreate && (
        <section className="adm-panel adm-hierarchy-panel">
          <h2><ShieldCheck size={19} /> Team view is read-only</h2>
          <p className="wf-muted">You are signed on as a Limited Admin. Only the Super Admin can create or manage administrator accounts. You can still create users and reply to their secure messages.</p>
        </section>
      )}

      <section className="adm-panel adm-hierarchy-panel">
        <h2><Users size={19} /> Administrators ({admins.length})</h2>
        {loading ? <p className="wf-muted">Loading team…</p> : (
          <div className="adm-hierarchy-grid">
            {admins.map((a) => (
              <article key={a.id} className={`adm-hierarchy-card ${a.roleType === "super_admin" ? "super" : ""}`}>
                <div className="adm-hierarchy-card-top">
                  <span className="adm-hierarchy-avatar">{a.roleType === "super_admin" ? <Crown size={20} /> : <UserCog size={20} />}</span>
                  <div>
                    <strong>{a.fullName}</strong>
                    <small>@{a.username} · {a.email}</small>
                  </div>
                  <span className={`adm-hierarchy-pill ${a.roleType === "super_admin" ? "super" : "limited"}`}>{a.roleType === "super_admin" ? "Super Admin" : a.roleType === "auditor" ? "Read-Only" : "Limited Admin"}</span>
                </div>
                <p className="wf-muted">{a.role}</p>
                <div className="adm-hierarchy-stats">
                  <div><span>Status</span><strong className={a.status === "Active" ? "pos" : ""}>{a.status}</strong></div>
                  <div><span>Assigned users</span><strong>{a.customerCount}</strong></div>
                  <div><span>Reports to</span><strong>{a.parentAdminId ? admins.find((x) => x.id === a.parentAdminId)?.fullName ?? "Super Admin" : "—"}</strong></div>
                </div>
                {canCreate && a.roleType !== "super_admin" && (
                  <div className="adm-hierarchy-actions">
                    <button type="button" className="adm-btn" onClick={() => void setStatus(a.id, a.status === "Active" ? "Suspended" : "Active")}>
                      {a.status === "Active" ? "Suspend" : "Reactivate"}
                    </button>
                    <button type="button" className="adm-btn adm-btn-danger" onClick={() => void removeAdmin(a.id)}><Trash2 size={14} /> Remove</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </AdminSubPage>
  );
}
