"use client";

import { SignOnCard } from "@/components/sign-on-card";
import { SiteShell } from "@/components/site-shell";
import { ArrowRight, ShieldCheck, Sparkles, Users } from "lucide-react";
import Link from "next/link";

export function CustomerLoginGate({ reason }: { reason?: string }) {
  return (
    <SiteShell>
      <section className="wf-auth-section">
        <div className="content-width wf-auth-grid">
          <div className="wf-auth-card-wrap">
            <SignOnCard />
          </div>
          <div className="wf-auth-info">
            <span className="wf-eyebrow">Wells Fargo Online® • Secure Access</span>
            <h1>Sign on to view your Account Summary</h1>
            {reason && <p className="wf-gate-reason">{reason}</p>}
            <p>
              Your accounts, transfers, Bill Pay, card controls, statements, alerts and Fargo® spending insights are
              protected by a server-side session. Enter the demo credentials on the left or use the one-click sign in.
            </p>
            <div className="wf-gate-cards">
              <div>
                <Users size={20} />
                <strong>8 demo profiles</strong>
                <span>Switch between Standard, Premier, Private Client and Business relationships after signing on.</span>
              </div>
              <div>
                <ShieldCheck size={20} />
                <strong>Real session security</strong>
                <span>Passwords are salted and hashed; sessions live in PostgreSQL and expire after 8 hours.</span>
              </div>
              <div>
                <Sparkles size={20} />
                <strong>One-click access</strong>
                <span>No typing needed — sign in as Henry Carter instantly from the sign-on card.</span>
              </div>
            </div>
            <div className="wf-hero-actions">
              <Link href="/sign-on" className="button button-outline">
                Full sign-on page <ArrowRight size={17} />
              </Link>
              <Link href="/admin/login" className="button button-outline">
                Super Admin Console
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
