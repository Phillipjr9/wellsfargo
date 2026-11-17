"use client";

import { SignOnCard } from "@/components/sign-on-card";
import { SiteShell } from "@/components/site-shell";
import { Fingerprint, Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function SignOnPage() {
  return (
    <SiteShell>
      <section className="wf-auth-section">
        <div className="content-width wf-auth-grid">
          <div className="wf-auth-card-wrap">
            <SignOnCard />
          </div>
          <div className="wf-auth-info">
            <span className="wf-eyebrow">Wells Fargo Online</span>
            <h1>Manage all of your accounts with one sign-on</h1>
            <p>
              Check balances, transfer funds, pay bills, redeem Wells Fargo Rewards, and track your financial goals from
              any browser. Use the demo credentials shown on the sign-on card, or click the one-click demo sign-in.
            </p>
            <div className="wf-credential-panel">
              <ShieldCheck size={20} />
              <div>
                <strong>Demo account credentials</strong>
                <p>
                  Username <code>henry_carter</code> • Password <code>demo1234</code>
                </p>
                <small>All 8 demo profiles share this password. Sessions are server-side and expire after 8 hours.</small>
              </div>
            </div>
            <div className="wf-hero-actions">
              <Link href="/online-banking/dashboard" className="button button-red">
                Open the user dashboard now
              </Link>
              <Link href="/sign-on/passkey" className="button button-outline">
                <Fingerprint size={18} /> Try Passkey Sign-On
              </Link>
              <Link href="/help/password-help" className="button button-outline">
                Forgot username or password?
              </Link>
            </div>
            <div className="wf-auth-tips">
              <div><Lock size={18} /><span>Protected with 2-Step Verification, encrypted sessions, and Zero Liability coverage.</span></div>
              <div><ShieldCheck size={18} /><span>New to online banking? <Link href="/enroll" className="wf-inline-link">Enroll in minutes</Link> or read our <Link href="/help/online-banking/sign-on-faqs" className="wf-inline-link">Sign-On FAQs</Link>.</span></div>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
