"use client";

import { customerSignIn, goToWithToken } from "@/lib/client-auth";
import { AlertTriangle, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";

const DEMO_USERNAME = "henry_carter";
const DEMO_PASSWORD = "demo1234";

export function SignOnCard({
  onAfterSubmit,
  className = "",
  showDemoHelper = true,
}: {
  onAfterSubmit?: () => void;
  className?: string;
  showDemoHelper?: boolean;
}) {
  const id = useId();
  const [greeting, setGreeting] = useState("Welcome");
  const [showPassword, setShowPassword] = useState(false);
  const [saveUsername, setSaveUsername] = useState(false);
  const [showSaveNotice, setShowSaveNotice] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour >= 3 && hour < 12 ? "Good morning" : hour >= 12 && hour < 18 ? "Good afternoon" : "Good evening");
  }, []);

  async function signIn(user: string, pass: string, action: "password" | "demo" = "password") {
    setBusy(true);
    setError("");
    try {
      const { ok, data } = await customerSignIn({ username: user, password: pass, action });
      if (!ok || !data.authenticated) {
        throw new Error(data.error ?? "Unable to sign on.");
      }
      onAfterSubmit?.();
      goToWithToken("/online-banking/dashboard", typeof data.token === "string" ? data.token : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign on.");
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void signIn(username.trim(), password);
  }

  return (
    <div className={`signin-card ${className}`}>
      <div className="signin-top">
        <h2>{greeting}</h2>
        <p className="signin-intro">Sign on to manage your accounts.</p>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="signin-field">
            <label htmlFor={`${id}-username`}>Username</label>
            <input
              id={`${id}-username`}
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="henry_carter"
              aria-label="Username"
            />
          </div>
          <div className="signin-field password-field">
            <label htmlFor={`${id}-password`}>Password</label>
            <input
              id={`${id}-password`}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="off"
              placeholder="demo1234"
              aria-label="Password"
            />
            <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error && (
            <p className="signin-error" role="alert">
              <AlertTriangle size={15} /> {error}
            </p>
          )}

          <div className="save-row">
            <label className="save-label">
              <input
                type="checkbox"
                checked={saveUsername}
                onChange={(event) => {
                  setSaveUsername(event.target.checked);
                  setShowSaveNotice(event.target.checked);
                }}
              />
              <span>Save username</span>
            </label>
            {showSaveNotice && (
              <div className="save-notice" role="note">
                <button type="button" aria-label="Close notice" onClick={() => setShowSaveNotice(false)}>
                  <X size={14} />
                </button>
                <strong>Notice</strong>
                <p>For your security, we do not recommend using this feature on a shared device.</p>
              </div>
            )}
          </div>
          <div className="signin-actions">
            <button type="submit" className="button button-red" disabled={busy}>
              {busy ? "Signing on…" : "Sign On"}
            </button>
            <Link href="/enroll">Enroll</Link>
          </div>
        </form>

        {showDemoHelper && (
          <div className="signin-demo-box">
            <strong>Demo sign-on credentials</strong>
            <p>
              Username <code>{DEMO_USERNAME}</code> • Password <code>{DEMO_PASSWORD}</code>
            </p>
            <div className="signin-demo-actions">
              <button
                type="button"
                className="signin-demo-btn"
                disabled={busy}
                onClick={() => void signIn(DEMO_USERNAME, DEMO_PASSWORD, "demo")}
              >
                <Sparkles size={15} /> Sign in as Henry Carter
              </button>
              <button
                type="button"
                className="signin-fill-btn"
                disabled={busy}
                onClick={() => {
                  setUsername(DEMO_USERNAME);
                  setPassword(DEMO_PASSWORD);
                  setError("");
                }}
              >
                Fill fields
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="signin-bottom">
        <Link href="/sign-on/passkey">Sign on with a passkey</Link>
        <Link href="/help/password-help">Forgot username or password?</Link>
        <Link href="/privacy-security/fraud">Security Center</Link>
      </div>
    </div>
  );
}
