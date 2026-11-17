"use client";

import { adminSignIn, goToWithToken } from "@/lib/client-auth";
import { AlertTriangle, ArrowRight, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

const DEMO_USERNAME = "admin";
const DEMO_PASSWORD = "wellsfargo2026";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn(user: string, pass: string) {
    setBusy(true);
    setError("");
    try {
      const { ok, data } = await adminSignIn(user, pass);
      if (!ok || !data.authenticated) {
        throw new Error(data.error ?? "Unable to sign in.");
      }
      // Token lives in localStorage (with a hash fallback) so the session
      // survives cross-origin iframe navigation.
      goToWithToken("/admin", typeof data.token === "string" ? data.token : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void signIn(username, password);
  }

  return (
    <div className="adm-login-page">
      <div className="adm-login-band" />
      <div className="adm-login-card">
        <img src="/images/wells-fargo-wordmark.png" alt="Wells Fargo" width="190" height="20" className="adm-login-logo" />
        <span className="wf-eyebrow">Internal Systems • Restricted Access</span>
        <h1>Super Admin Console</h1>
        <p className="adm-login-sub">
          Enterprise operations console for managing customer relationships, accounts, transactions, fraud cases,
          appointments, the branch network and published content.
        </p>

        <div className="adm-demo-cta">
          <button type="button" onClick={() => void signIn(DEMO_USERNAME, DEMO_PASSWORD)} disabled={busy}>
            <Sparkles size={17} /> {busy ? "Signing in…" : "One-click Super Admin sign in"}
          </button>
          <small>No typing needed — uses the demo credentials below.</small>
        </div>

        <div className="adm-or"><span>or sign in manually</span></div>

        <form className="adm-form" onSubmit={handleSubmit}>
          <label className="adm-field">
            <span>Administrator username</span>
            <input
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
            />
          </label>
          <label className="adm-field">
            <span>Password</span>
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
            />
          </label>
          {error && (
            <p className="adm-error">
              <AlertTriangle size={15} /> {error}
            </p>
          )}
          <div className="adm-action-row">
            <button type="submit" className="adm-btn-primary" disabled={busy}>
              <KeyRound size={17} /> {busy ? "Verifying credentials…" : "Sign on to console"}
            </button>
            <button
              type="button"
              className="adm-btn"
              onClick={() => {
                setUsername(DEMO_USERNAME);
                setPassword(DEMO_PASSWORD);
                setError("");
              }}
            >
              Fill demo credentials
            </button>
          </div>
        </form>

        <div className="adm-login-hint">
          <ShieldCheck size={16} />
          <div>
            <strong>Administrator demo credentials</strong>
            <p>
              Username <code>{DEMO_USERNAME}</code> • Password <code>{DEMO_PASSWORD}</code>
            </p>
            <div className="adm-role-list">
              <p><strong>Two-tier hierarchy</strong> (same password):</p>
              <ul>
                <li><code>admin</code> — <strong>Super Admin</strong>: does everything, creates Limited Admins</li>
                <li><code>operator</code>, <code>support1</code>, <code>support2</code> — <strong>Limited Admins</strong>: create users under themselves &amp; act as support agents</li>
                <li><code>auditor</code> — Read-Only Auditor</li>
              </ul>
            </div>
            <small>
              Sessions are stored server-side in PostgreSQL with a bearer token, expire after 8 hours, and every action
              is recorded in the audit trail.
            </small>
          </div>
        </div>

        <div className="adm-login-links">
          <Link href="/sign-on">
            Customer sign on <ArrowRight size={14} />
          </Link>
          <Link href="/">
            Back to public site <ArrowRight size={14} />
          </Link>
          <Link href="/sitemap">Sitemap</Link>
        </div>
      </div>
    </div>
  );
}
