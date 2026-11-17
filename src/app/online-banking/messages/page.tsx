"use client";

import { SiteShell } from "@/components/site-shell";
import { customerFetch, customerSignIn, getCustomerToken } from "@/lib/client-auth";
import { ArrowRight, Bell, CheckCircle2, Mail, MessageSquare, Send, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type Message = {
  id: number;
  threadCode: string;
  subject: string;
  senderRole: string;
  senderName: string;
  body: string;
  status: string;
  createdAt: string;
};
type Notice = { id: number; title: string; body: string; kind: string; href: string | null; isRead: boolean; createdAt: string };

const dateTime = (v: string) => new Date(v).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export default function CustomerMessagesPage() {
  const [state, setState] = useState<"checking" | "ready">("checking");
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [activeThread, setActiveThread] = useState("");
  const [subject, setSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [reply, setReply] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    if (!getCustomerToken()) {
      setNeedsSignIn(true);
      setMessages([]);
      setNotices([]);
      setState("ready");
      return null;
    }
    const [mRes, nRes] = await Promise.all([
      customerFetch("/api/messages"),
      customerFetch("/api/notifications"),
    ]);
    const mData = (await mRes.json()) as { messages: Message[]; authenticated?: boolean };
    const nData = (await nRes.json()) as { notifications: Notice[]; authenticated?: boolean };
    if (mData.authenticated === false || nData.authenticated === false || mRes.status === 401) {
      setNeedsSignIn(true);
      setMessages([]);
      setNotices([]);
      setState("ready");
      return null;
    }
    setNeedsSignIn(false);
    setMessages(mData.messages ?? []);
    setNotices(nData.notifications ?? []);
    setState("ready");
    return mData.messages ?? [];
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function flash(t: string) {
    setToast(t);
    window.setTimeout(() => setToast(""), 3500);
  }

  async function sendNew(e: FormEvent) {
    e.preventDefault();
    const res = await customerFetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body: newBody }),
    });
    if (!res.ok) return flash("Unable to send your message.");
    const data = (await res.json()) as { message: Message };
    setSubject("");
    setNewBody("");
    setActiveThread(data.message.threadCode);
    await load();
    flash("Secure message sent to Wells Fargo Support.");
  }

  async function sendReply(e: FormEvent) {
    e.preventDefault();
    const res = await customerFetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadCode: activeThread, body: reply }),
    });
    if (!res.ok) return flash("Unable to send your reply.");
    setReply("");
    await load();
    flash("Reply sent.");
  }

  async function markRead(id?: number) {
    await customerFetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : {}),
    });
    await load();
  }

  if (state === "checking") {
    return <SiteShell><div className="wf-section content-width"><p className="wf-muted">Loading your secure inbox…</p></div></SiteShell>;
  }
  async function inlineSignIn() {
    const { ok } = await customerSignIn({ action: "demo", username: "henry_carter" });
    if (ok) {
      setNeedsSignIn(false);
      await load();
    }
  }

  const threads = [...new Set(messages.map((m) => m.threadCode))].reverse();
  const threadMessages = messages.filter((m) => m.threadCode === activeThread);
  const unread = notices.filter((n) => !n.isRead).length;

  return (
    <SiteShell>
      {toast && <div className="wf-toast"><CheckCircle2 size={18} /> {toast}</div>}
      <section className="wf-page-hero wf-hero-warm">
        <div className="content-width wf-page-hero-inner">
          <div className="wf-page-hero-copy">
            <span className="wf-eyebrow">Wells Fargo Online®</span>
            <h1>Secure Messages &amp; Notifications</h1>
            <p>Communicate privately with Wells Fargo Support, track replies, and stay on top of account alerts.</p>
            <div className="wf-hero-actions">
              <Link href="/online-banking/dashboard" className="button button-red">Back to Account Summary</Link>
              <Link href="/help" className="button button-outline">Customer Service</Link>
            </div>
          </div>
        </div>
      </section>

      {needsSignIn && (
        <div className="wf-section content-width">
          <div className="wf-inline-signin">
            <ShieldCheck size={20} />
            <div>
              <strong>Sign on to view your secure messages</strong>
              <p>You can still browse the rest of the site. One click activates a secure session for this inbox.</p>
            </div>
            <button type="button" className="button button-red wf-btn-sm" onClick={() => void inlineSignIn()}>
              Sign in as Henry Carter
            </button>
          </div>
        </div>
      )}

      <section className="wf-section content-width wf-dash-columns">
        <div className="wf-panel">
          <div className="wf-panel-head">
            <h2><MessageSquare size={20} style={{ display: "inline", verticalAlign: "text-bottom" }} /> Secure message center</h2>
            <span className="wf-muted">{threads.length} conversation{threads.length === 1 ? "" : "s"}</span>
          </div>

          <div className="msg-layout">
            <div className="msg-thread-list">
              {threads.map((code) => {
                const items = messages.filter((m) => m.threadCode === code);
                const last = items[items.length - 1];
                return (
                  <button key={code} type="button" className={activeThread === code ? "msg-thread active" : "msg-thread"} onClick={() => { setActiveThread(code); setReply(""); }}>
                    <strong>{last.subject}</strong>
                    <small>{code} • {items.length} message{items.length === 1 ? "" : "s"}</small>
                    <span className={`adm-pill ${last.status === "Answered" ? "ok" : last.status === "Closed" ? "muted" : "warn"}`}>{last.status}</span>
                  </button>
                );
              })}
              {threads.length === 0 && <p className="wf-muted">No conversations yet. Start one below.</p>}
            </div>

            <div className="msg-conversation">
              {activeThread ? (
                <>
                  {threadMessages.map((m) => (
                    <div key={m.id} className={m.senderRole === "customer" ? "msg-bubble own" : "msg-bubble"}>
                      <div className="msg-bubble-head"><strong>{m.senderName}</strong><small>{dateTime(m.createdAt)}</small></div>
                      <p>{m.body}</p>
                    </div>
                  ))}
                  <form onSubmit={sendReply} className="msg-reply">
                    <textarea required rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply to Wells Fargo Support…" />
                    <button type="submit" className="button button-red wf-btn-sm"><Send size={15} /> Send reply</button>
                  </form>
                </>
              ) : (
                <p className="wf-muted">Select a conversation to read it, or start a new one below.</p>
              )}
            </div>
          </div>

          <h3 className="msg-subhead">Start a new conversation</h3>
          <form onSubmit={sendNew} className="msg-compose">
            <div className="wf-input-group">
              <label htmlFor="msg-subject">Subject</label>
              <input id="msg-subject" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Question about my mortgage payment" />
            </div>
            <div className="wf-input-group">
              <label htmlFor="msg-body">Message</label>
              <textarea id="msg-body" required rows={4} value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder="How can we help? Never include your password or full account number." />
            </div>
            <button type="submit" className="button button-red"><Mail size={16} /> Send secure message</button>
          </form>
        </div>

        <div className="wf-panel wf-panel-subtle">
          <div className="wf-panel-head">
            <h2><Bell size={19} style={{ display: "inline", verticalAlign: "text-bottom" }} /> Notifications</h2>
            <button type="button" className="wf-pill" onClick={() => void markRead()}>Mark all read</button>
          </div>
          <p className="wf-muted">{unread} unread notification{unread === 1 ? "" : "s"}</p>
          <div className="wf-stack-list">
            {notices.map((n) => (
              <div key={n.id} className={n.isRead ? "wf-mini-card" : "wf-mini-card unread"}>
                <div className="wf-mini-top">
                  <span className="wf-ref-pill">{n.kind}</span>
                  <small className="wf-muted">{dateTime(n.createdAt)}</small>
                </div>
                <strong>{n.title}</strong>
                <p className="wf-muted">{n.body}</p>
                <div className="msg-notice-actions">
                  {n.href && <Link href={n.href} className="wf-text-link">Open <ArrowRight size={14} /></Link>}
                  {!n.isRead && <button type="button" className="wf-text-link" onClick={() => void markRead(n.id)}>Mark read</button>}
                </div>
              </div>
            ))}
            {notices.length === 0 && <p className="wf-muted">You're all caught up.</p>}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
