"use client";

import { AdminSubPage } from "@/components/admin-subpage";
import { adminFetch } from "@/lib/client-auth";
import { Bell, CheckCircle2, Mail, Send } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type Message = {
  id: number;
  threadCode: string;
  subject: string;
  senderRole: string;
  senderName: string;
  body: string;
  status: string;
  isReadByAdmin: boolean;
  createdAt: string;
  customerName: string;
  customerUsername: string;
};

const dateTime = (v: string) => new Date(v).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeThread, setActiveThread] = useState("");
  const [reply, setReply] = useState("");
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    const res = await adminFetch("/api/messages?scope=admin");
    if (!res.ok) return;
    const data = (await res.json()) as { messages: Message[] };
    setMessages(data.messages ?? []);
    return data.messages ?? [];
  }, []);

  useEffect(() => { void load(); }, [load]);

  function flash(t: string) {
    setToast(t);
    window.setTimeout(() => setToast(""), 3500);
  }

  async function sendReply(e: FormEvent) {
    e.preventDefault();
    const res = await adminFetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadCode: activeThread, body: reply }),
    });
    if (!res.ok) return flash("Unable to send reply.");
    setReply("");
    await load();
    flash("Reply published to the customer's secure inbox.");
  }

  async function closeThread() {
    await adminFetch("/api/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadCode: activeThread, action: "close" }),
    });
    await load();
    flash("Conversation closed.");
  }

  async function broadcast(e: FormEvent) {
    e.preventDefault();
    const res = await adminFetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: noticeTitle, body: noticeBody, kind: "Announcement", href: "/online-banking/messages" }),
    });
    if (!res.ok) return flash("Unable to publish announcement.");
    setNoticeTitle("");
    setNoticeBody("");
    flash("Announcement published to every signed-in customer.");
  }

  const threads = [...new Set(messages.map((m) => m.threadCode))];
  const threadMessages = messages.filter((m) => m.threadCode === activeThread).sort((a, b) => a.id - b.id);
  const unreadThreads = threads.filter((code) => messages.some((m) => m.threadCode === code && m.senderRole === "customer" && !m.isReadByAdmin)).length;

  return (
    <AdminSubPage title="Secure Message Center" subtitle={`${threads.length} customer conversations · ${unreadThreads} awaiting a reply`}>
      {toast && <div className="wf-toast"><CheckCircle2 size={18} /> {toast}</div>}
      <div className="adm-subgrid">
        <section className="adm-panel">
          <header className="adm-panel-head">
            <div><h2>Customer conversations</h2><p>Messages submitted from Wells Fargo Online®</p></div>
            <span className="adm-count">{threads.length} threads</span>
          </header>
          <div className="msg-layout">
            <div className="msg-thread-list">
              {threads.map((code) => {
                const items = messages.filter((m) => m.threadCode === code);
                const last = items[0];
                const needsReply = items.some((m) => m.senderRole === "customer" && !m.isReadByAdmin);
                return (
                  <button key={code} type="button" className={activeThread === code ? "msg-thread active" : "msg-thread"} onClick={() => { setActiveThread(code); setReply(""); }}>
                    <strong>{last.subject}</strong>
                    <small>{last.customerName} • {code}</small>
                    <span className={`adm-pill ${needsReply ? "warn" : last.status === "Closed" ? "muted" : "ok"}`}>{needsReply ? "Needs reply" : last.status}</span>
                  </button>
                );
              })}
              {threads.length === 0 && <p className="adm-empty">No customer messages yet.</p>}
            </div>

            <div className="msg-conversation">
              {activeThread ? (
                <>
                  {threadMessages.map((m) => (
                    <div key={m.id} className={m.senderRole === "admin" ? "msg-bubble own" : "msg-bubble"}>
                      <div className="msg-bubble-head"><strong>{m.senderName}</strong><small>{dateTime(m.createdAt)}</small></div>
                      <p>{m.body}</p>
                    </div>
                  ))}
                  <form onSubmit={sendReply} className="msg-reply">
                    <textarea required rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type an official reply to this customer…" />
                    <div className="adm-action-row">
                      <button type="submit" className="button button-red wf-btn-sm"><Send size={15} /> Send reply</button>
                      <button type="button" className="adm-btn" onClick={() => void closeThread()}>Close thread</button>
                    </div>
                  </form>
                </>
              ) : (
                <p className="adm-empty">Select a conversation to read and reply.</p>
              )}
            </div>
          </div>
        </section>

        <section className="adm-panel">
          <header className="adm-panel-head">
            <div><h2><Bell size={17} style={{ display: "inline", verticalAlign: "text-bottom" }} /> Broadcast announcement</h2><p>Publishes instantly to every signed-in customer's notification center.</p></div>
          </header>
          <form className="adm-form" onSubmit={broadcast}>
            <label className="adm-field"><span>Announcement title</span><input required value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} placeholder="e.g., New 11-Month CD rate now available" /></label>
            <label className="adm-field"><span>Message</span><textarea required rows={4} value={noticeBody} onChange={(e) => setNoticeBody(e.target.value)} placeholder="Details customers should know…" /></label>
            <button type="submit" className="adm-btn-primary"><Mail size={16} /> Publish to all customers</button>
          </form>
          <div className="adm-hint-box">
            <strong>How this works</strong>
            <p>Customer messages and broadcasts are stored in PostgreSQL. Customers see them in their Secure Messages inbox, and admins can reply or close threads here.</p>
          </div>
        </section>
      </div>
    </AdminSubPage>
  );
}
