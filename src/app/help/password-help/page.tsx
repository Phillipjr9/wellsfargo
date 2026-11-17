"use client";

import { SiteShell } from "@/components/site-shell";
import { customerSignIn, goToWithToken } from "@/lib/client-auth";
import { CheckCircle2, KeyRound } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function PasswordHelpPage() {
  const [option, setOption] = useState<"password" | "username">("password");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <SiteShell>
      <section className="wf-page-hero wf-hero-warm">
        <div className="content-width wf-page-hero-inner">
          <div className="wf-page-hero-copy">
            <span className="wf-eyebrow">Online Access Help</span>
            <h1>Forgot username or password?</h1>
            <p>Select what you need help recovering and we&apos;ll walk you through getting back into your account safely.</p>
          </div>
        </div>
      </section>

      <section className="wf-section content-width wf-two-col">
        <div className="wf-panel">
          <div className="wf-pill-row" style={{ marginTop: 0 }}>
            <button
              type="button"
              className={option === "password" ? "wf-pill active" : "wf-pill"}
              onClick={() => { setOption("password"); setSent(false); }}
            >
              Reset password
            </button>
            <button
              type="button"
              className={option === "username" ? "wf-pill active" : "wf-pill"}
              onClick={() => { setOption("username"); setSent(false); }}
            >
              Find username
            </button>
          </div>

          {sent ? (
            <div className="wf-modal-success" style={{ marginTop: 20 }}>
              <div className="wf-success-badge"><CheckCircle2 size={30} /></div>
              <h3>{option === "password" ? "Recovery instructions prepared" : "Username reminder prepared"}</h3>
              <p>
                Demo username <code>henry_carter</code> • Demo password <code>demo1234</code>. You can also sign in
                instantly as Henry below or switch to passkey sign-on.
              </p>
              <div className="wf-modal-actions">
                <button
                  type="button"
                  className="button button-red"
                  onClick={async () => {
                    const { data } = await customerSignIn({ action: "demo", username: "henry_carter" });
                    goToWithToken("/online-banking/dashboard", typeof data.token === "string" ? data.token : undefined);
                  }}
                >
                  Open Demo Dashboard
                </button>
                <Link href="/sign-on" className="button button-outline">Return to Sign On</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="wf-form-stack" style={{ marginTop: 18 }}>
              <div className="wf-input-group">
                <label htmlFor="rec-email">
                  <KeyRound size={16} style={{ display: "inline", verticalAlign: "text-bottom" }} /> Email address on profile *
                </label>
                <input
                  id="rec-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
              <button type="submit" className="button button-red">
                {option === "password" ? "Send Verification Step" : "Look Up Username"}
              </button>
            </form>
          )}
        </div>

        <aside className="wf-panel wf-panel-subtle">
          <div className="wf-credential-panel" style={{ marginTop: 0, marginBottom: 20 }}>
            <KeyRound size={20} />
            <div>
              <strong>Demo credentials</strong>
              <p>
                Username <code>henry_carter</code> • Password <code>demo1234</code>
              </p>
              <small>All eight demo profiles use this same password.</small>
            </div>
          </div>
          <h3>Need additional support?</h3>
          <p className="wf-muted">Wells Fargo Online Technical Support is available 24/7 at <strong>1-800-956-4442</strong>.</p>
          <div className="wf-quick-stack">
            <Link href="/sign-on/passkey">Sign on without a password using a Passkey →</Link>
            <Link href="/help/online-banking/sign-on-faqs">Browse Sign-On &amp; 2-Step Verification FAQs →</Link>
            <Link href="/privacy-security/fraud/report">Suspect unauthorized access? Report Fraud →</Link>
          </div>
        </aside>
      </section>
    </SiteShell>
  );
}
