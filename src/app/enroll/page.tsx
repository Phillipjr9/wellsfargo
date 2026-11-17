"use client";

import { SiteShell } from "@/components/site-shell";
import { customerSignIn, goToWithToken } from "@/lib/client-auth";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function EnrollPage() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] = useState("Checking or Savings Account");
  const [chosenHandle, setChosenHandle] = useState("");
  const [enablePasskey, setEnablePasskey] = useState(true);

  function nextStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStep((s) => Math.min(3, s + 1));
  }

  return (
    <SiteShell>
      <section className="wf-page-hero wf-hero-warm">
        <div className="content-width wf-page-hero-inner">
          <div className="wf-page-hero-copy">
            <span className="wf-eyebrow">Wells Fargo Online Enrollment</span>
            <h1>Let&apos;s set up your online access</h1>
            <p>
              Enroll once to manage your checking, savings, credit cards, loans, and investments together. Already
              enrolled? <Link href="/sign-on" className="wf-inline-link">Sign On now</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="wf-section content-width" style={{ maxWidth: 760 }}>
        <div className="wf-panel">
          <div className="wf-stepper" aria-label="Enrollment progress">
            <span className={step >= 1 ? "active" : ""}>1. Account profile</span>
            <span className={step >= 2 ? "active" : ""}>2. Access preferences</span>
            <span className={step >= 3 ? "active" : ""}>3. Ready to bank</span>
          </div>

          {step === 1 && (
            <form onSubmit={nextStep} className="wf-form-stack">
              <p className="wf-form-note">
                <ShieldCheck size={16} /> Safe demo enrollment—no Social Security number, card number, or password is
                requested or stored.
              </p>
              <div className="wf-input-group">
                <label htmlFor="en-name">Full name *</label>
                <input id="en-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Henry Carter" />
              </div>
              <div className="wf-input-group">
                <label htmlFor="en-email">Email for security alerts *</label>
                <input id="en-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="henry@example.com" />
              </div>
              <div className="wf-input-group">
                <label htmlFor="en-type">Primary account you&apos;re enrolling</label>
                <select id="en-type" value={accountType} onChange={(e) => setAccountType(e.target.value)}>
                  <option>Checking or Savings Account</option>
                  <option>Wells Fargo Credit Card</option>
                  <option>Home Mortgage or Personal Loan</option>
                  <option>Wells Fargo Auto Loan</option>
                  <option>Business Banking Account</option>
                </select>
              </div>
              <button type="submit" className="button button-red">Continue</button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={nextStep} className="wf-form-stack">
              <div className="wf-input-group">
                <label htmlFor="en-handle">Preferred display nickname *</label>
                <input id="en-handle" required value={chosenHandle} onChange={(e) => setChosenHandle(e.target.value)} placeholder="henry_wf" />
              </div>
              <label className="wf-toggle-row">
                <input type="checkbox" checked={enablePasskey} onChange={(e) => setEnablePasskey(e.target.checked)} />
                <span><strong>Enable Passkey &amp; 2-Step Verification</strong> for faster, phishing-resistant sign-on.</span>
              </label>
              <label className="wf-toggle-row">
                <input type="checkbox" defaultChecked required />
                <span>
                  I have reviewed the <Link href="/online-banking/online-access-agreement" className="wf-inline-link">Online Access Agreement</Link> and paperless delivery preferences.
                </span>
              </label>
              <div className="wf-hero-actions">
                <button type="submit" className="button button-red">Complete Enrollment</button>
                <button type="button" className="button button-outline" onClick={() => setStep(1)}>Back</button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="wf-modal-success">
              <div className="wf-success-badge"><CheckCircle2 size={32} /></div>
              <h2>Online access is ready, {fullName || "Welcome"}!</h2>
              <p>
                Your demo profile (<strong>{chosenHandle}</strong>) for <strong>{accountType}</strong> is set up
                {enablePasskey ? " with Passkey protection enabled" : ""}.
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
                  Go to Account Summary
                </button>
                <Link href="/mobile-app" className="button button-outline">Get the Mobile App</Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
