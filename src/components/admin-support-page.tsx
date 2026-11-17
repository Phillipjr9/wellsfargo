"use client";

import { AdminSubPage } from "@/components/admin-subpage";
import { adminFetch } from "@/lib/client-auth";
import { CheckCircle2, MessageSquare, Plus, Send, ShieldCheck, UserRound } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type ThreadMessage = {
  id: number;
  senderRole: string;
  senderName: string;
  body: string;
  createdAt: string;
  status: string;
  isReadByAdmin: boolean;
};

type Thread = {
  threadCode: string;
  customerId: number;
  customerName: string;
  customerUsername: string;
  ownerAdminId: number | null;
  subject: string;
  status: string;
  lastMessageAt: string;
  unread: number;
  messages: ThreadMessage[];
};

type SimpleUser = { id: number; fullName: string; username: string };

export function AdminSupportPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [canReply, setCanReply] = useState(true);
  const [viewer, setViewer] = useState<{ fullName: string; roleType: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [newMode, setNewMode] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [supportRes, usersRes] = await Promise.all([
      adminFetch("/api/admin/support"),
      adminFetch("/api/admin/customers"),
    ]);
    if (supportRes.ok) {
      const data = (await supportRes.json()) as { threads: Thread[]; unread: number; canReply: boolean; viewer: { fullName: string; roleType: string } };
      setThreads(data.threads ?? []);
      setUnread(data.unread ?? 0);
      setCanReply(Boolean(data.canReply));
      setViewer(data.viewer ?? null);
      setSelected((prev) => prev ?? data.threads?.[0]?.threadCode ?? null);
    }
    if (usersRes.ok) {
      const data = (await usersRes.json()) as { customers: SimpleUser[] };
      setUsers(data.customers ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = threads.find((t) => t.threadCode === selected) ?? null;

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setMessage("");
    const payload = newMode
      ? { action: "new", customerId: Number(newCustomerId), subject: newSubject || "Message from your support agent", body: newBody }
      : { action: "reply", threadCode: selected, body: reply };
    const res = await adminFetch("/api/admin/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { error?: string; threadCode?: string };
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Unable to send message.");
    setMessage(newMode ? "New support conversation started." : "Reply sent to your user.");
    setReply(""); setNewBody(""); setNewSubject(""); setNewMode(false);
    if (data.threadCode) setSelected(data.threadCode);
    await load();
  }

  async function closeThread(code: string, close: boolean) {
    const res = await adminFetch("/api/admin/support", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadCode: code, status: close ? "Closed" : "Answered" }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      return setError(data.error ?? "Unable to update thread.");
    }
    setMessage(close ? "Conversation closed." : "Conversation reopened.");
    await load();
  }

  return (
    <AdminSubPage title="Support Agent Inbox" subtitle="Communicate with your assigned users. Limited Admins only see threads for users they manage; the Super Admin sees every conversation.">
      {message && <div className="adm-hierarchy-alert ok"><CheckCircle2 size={17} /> {message}</div>}
      {error && <div className="adm-hierarchy-alert error"><ShieldCheck size={17} /> {error}</div>}

      <div className="adm-hierarchy-kpis">
        <div><span>Conversations</span><strong>{threads.length}</strong></div>
        <div><span>Unread from users</span><strong>{unread}</strong></div>
        <div><span>Assigned users</span><strong>{users.length}</strong></div>
        <div><span>Signed in as</span><strong>{viewer?.fullName ?? "—"}</strong></div>
      </div>

      <div className="adm-support-grid">
        <section className="adm-panel adm-hierarchy-panel">
          <div className="adm-hierarchy-panel-head">
            <h2><MessageSquare size={19} /> Conversations</h2>
            {canReply && <button type="button" className="adm-btn" onClick={() => setNewMode(!newMode)}><Plus size={14} /> New message</button>}
          </div>
          {newMode && (
            <form className="adm-support-compose" onSubmit={sendMessage}>
              <label className="adm-field"><span>User</span><select required value={newCustomerId} onChange={(e) => setNewCustomerId(e.target.value)}><option value="">Select one of your users…</option>{users.map((u) => <option key={u.id} value={u.id}>{u.fullName} (@{u.username})</option>)}</select></label>
              <label className="adm-field"><span>Subject</span><input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="e.g., Your account is ready" /></label>
              <label className="adm-field"><span>Message</span><textarea required rows={3} value={newBody} onChange={(e) => setNewBody(e.target.value)} /></label>
              <button type="submit" className="adm-btn-primary" disabled={busy}>Send new message</button>
            </form>
          )}
          {loading ? <p className="wf-muted">Loading inbox…</p> : (
            <div className="adm-support-thread-list">
              {threads.map((t) => (
                <button
                  type="button"
                  key={t.threadCode}
                  className={selected === t.threadCode ? "adm-support-thread active" : "adm-support-thread"}
                  onClick={() => { setSelected(t.threadCode); setNewMode(false); }}
                >
                  <div><strong>{t.customerName}</strong><small>{t.subject}</small></div>
                  <span className={`adm-hierarchy-pill ${t.status === "Closed" ? "limited" : "super"}`}>{t.status}</span>
                  {t.unread > 0 && <em>{t.unread} new</em>}
                </button>
              ))}
              {threads.length === 0 && <p className="wf-muted">No conversations assigned to you yet. Create a user, then start a thread.</p>}
            </div>
          )}
        </section>

        <section className="adm-panel adm-hierarchy-panel">
          {active ? (
            <>
              <div className="adm-hierarchy-panel-head">
                <div>
                  <h2><UserRound size={19} /> {active.customerName}</h2>
                  <p className="wf-muted">@{active.customerUsername} · {active.subject} · {active.threadCode}</p>
                </div>
                {canReply && (
                  <button type="button" className="adm-btn" onClick={() => void closeThread(active.threadCode, active.status !== "Closed")}>
                    {active.status === "Closed" ? "Reopen" : "Close thread"}
                  </button>
                )}
              </div>
              <div className="adm-support-conversation">
                {active.messages.map((m) => (
                  <div key={m.id} className={`adm-support-bubble ${m.senderRole === "admin" ? "own" : ""}`}>
                    <div className="adm-support-bubble-head"><strong>{m.senderName}</strong><small>{new Date(m.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</small></div>
                    <p>{m.body}</p>
                  </div>
                ))}
              </div>
              {canReply ? (
                <form className="adm-support-reply" onSubmit={sendMessage}>
                  <textarea required rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Reply as ${viewer?.fullName ?? "support agent"}…`} />
                  <button type="submit" className="adm-btn-primary" disabled={busy}><Send size={15} /> {busy ? "Sending…" : "Send reply"}</button>
                </form>
              ) : (
                <p className="wf-muted">Read-Only Auditors can view conversations but cannot reply.</p>
              )}
            </>
          ) : <p className="wf-muted">Select a conversation to read and reply.</p>}
        </section>
      </div>
    </AdminSubPage>
  );
}
