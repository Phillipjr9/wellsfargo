"use client";

import { adminFetch, adminSignOut } from "@/lib/client-auth";
import { ArrowRight, LogOut, MessageSquare, Plus, ShieldCheck, UserCog, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type AdminIdentity = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  roleType: string;
};

type ScopedUser = { id: number; fullName: string; username: string; status: string; deposits: string };
type Thread = { customerName: string; subject: string; status: string; unread: number };

export function LimitedAdminConsole({ admin }: { admin: AdminIdentity }) {
  const [users, setUsers] = useState<ScopedUser[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [uRes, sRes] = await Promise.all([
      adminFetch("/api/admin/customers"),
      adminFetch("/api/admin/support"),
    ]);
    if (uRes.ok) {
      const data = (await uRes.json()) as { customers: ScopedUser[] };
      setUsers(data.customers ?? []);
    }
    if (sRes.ok) {
      const data = (await sRes.json()) as { threads: Thread[]; unread: number };
      setThreads(data.threads ?? []);
      setUnread(data.unread ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="adm-limited-shell">
      <header className="adm-limited-header">
        <div className="adm-limited-brand">
          <img src="/images/wf-logo-220.png" alt="Wells Fargo" width="170" height="18" />
          <span>Limited Admin Workspace</span>
        </div>
        <div className="adm-limited-user">
          <span className="adm-hierarchy-avatar">{admin.fullName[0]}</span>
          <div><strong>{admin.fullName}</strong><small>{admin.role}</small></div>
          <span className="adm-hierarchy-pill limited">Limited Admin</span>
          <button type="button" className="adm-icon-btn" onClick={async () => { await adminSignOut(); window.location.assign("/admin/login"); }} aria-label="Sign off"><LogOut size={17} /></button>
        </div>
      </header>

      <main className="adm-limited-main content-width">
        <div className="adm-limited-hero">
          <div>
            <span className="wf-eyebrow">Wells Fargo Support Operations</span>
            <h1>Good day, {admin.fullName.split(" ")[0]}</h1>
            <p>Manage the users assigned to you, create new relationships, and reply to their secure messages. Only the Super Admin can manage other administrators.</p>
          </div>
          <ShieldCheck size={34} />
        </div>

        <div className="adm-hierarchy-kpis">
          <div><span>Your users</span><strong>{users.length}</strong></div>
          <div><span>Active conversations</span><strong>{threads.filter((t) => t.status !== "Closed").length}</strong></div>
          <div><span>Unread messages</span><strong>{unread}</strong></div>
          <div><span>Admin creation</span><strong className="pos">Restricted</strong></div>
        </div>

        <div className="adm-limited-actions">
          <Link href="/admin/users" className="adm-limited-action-card">
            <Users size={24} />
            <div><strong>My Users</strong><span>Create users under your admin account and review their balances.</span></div>
            <ArrowRight size={18} />
          </Link>
          <Link href="/admin/users" className="adm-limited-action-card">
            <Plus size={24} />
            <div><strong>Create a User</strong><span>Open a new checking and savings relationship in seconds.</span></div>
            <ArrowRight size={18} />
          </Link>
          <Link href="/admin/support" className="adm-limited-action-card">
            <MessageSquare size={24} />
            <div><strong>Support Inbox</strong><span>Reply to your assigned users as their dedicated support agent.</span></div>
            <ArrowRight size={18} />
          </Link>
          <Link href="/admin/team" className="adm-limited-action-card">
            <UserCog size={24} />
            <div><strong>View Team</strong><span>Read-only. Limited Admins cannot create or manage admins.</span></div>
            <ArrowRight size={18} />
          </Link>
        </div>

        <section className="adm-panel adm-hierarchy-panel">
          <div className="adm-hierarchy-panel-head">
            <h2><Users size={19} /> Users assigned to you ({users.length})</h2>
            <Link href="/admin/users" className="adm-link-btn">Manage users <ArrowRight size={14} /></Link>
          </div>
          {loading ? <p className="wf-muted">Loading your relationships…</p> : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead><tr><th>User</th><th>Status</th><th>Deposits</th><th>Action</th></tr></thead>
                <tbody>
                  {users.slice(0, 8).map((u) => (
                    <tr key={u.id}>
                      <td><strong>{u.fullName}</strong><small>@{u.username}</small></td>
                      <td>{u.status}</td>
                      <td>${Number(u.deposits || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                      <td><Link href="/admin/support" className="adm-link-btn">Message</Link></td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan={4}><p className="wf-muted">No users assigned yet. Create your first user.</p></td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
