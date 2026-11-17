"use client";

import { SiteShell } from "@/components/site-shell";
import { customerSignIn, goToWithToken } from "@/lib/client-auth";
import { Check, Fingerprint, Laptop, ShieldCheck, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PasskeySignOnPage() {
  const router = useRouter();
  const [verifying, setVerifying] = useState(false);

  async function handlePasskeyDemo() {
    setVerifying(true);
    try {
      const { ok, data } = await customerSignIn({ action: "passkey", username: "henry_carter" });
      if (!ok) throw new Error("Passkey verification failed.");
      goToWithToken("/online-banking/dashboard", typeof data.token === "string" ? data.token : undefined);
    } catch {
      setVerifying(false);
      router.push("/sign-on");
    }
  }

  return (
    <SiteShell>
      <section className="wf-auth-section">
        <div className="content-width wf-two-col">
          <div className="wf-panel">
            <div className="wf-passkey-badge">
              <Fingerprint size={34} />
            </div>
            <h1>Sign on with a passkey</h1>
            <p className="wf-muted">
              Skip typing passwords. Authenticate securely using Face ID, Touch ID, Windows Hello, or your device screen
              lock.
            </p>
            <button
              type="button"
              className="button button-red wf-full-btn"
              onClick={handlePasskeyDemo}
              disabled={verifying}
            >
              {verifying ? "Verifying device passkey..." : "Continue with Passkey (Demo)"}
            </button>
            <div className="wf-quick-stack" style={{ marginTop: 22 }}>
              <Link href="/sign-on">Use username and password instead →</Link>
              <Link href="/enroll">New to Wells Fargo Online? Enroll →</Link>
              <Link href="/help/online-banking/sign-on-faqs">Read Passkey &amp; Sign-On FAQs →</Link>
            </div>
          </div>

          <div className="wf-panel wf-panel-subtle">
            <h2>Why customers love passkeys</h2>
            <ul className="wf-check-list">
              <li><Check size={17} /><span><strong>Phishing-resistant:</strong> Passkeys are cryptographically bound to the official domain and can never be guessed or phished.</span></li>
              <li><Check size={17} /><span><strong>Biometric stays private:</strong> Your face or fingerprint never leaves your personal phone or computer.</span></li>
              <li><Check size={17} /><span><strong>Works across devices:</strong> Sync securely across iCloud Keychain, Google Password Manager, or Windows Hello.</span></li>
            </ul>
            <div className="wf-device-row">
              <span><Smartphone size={18} /> iOS &amp; Android</span>
              <span><Laptop size={18} /> Mac &amp; Windows</span>
              <span><ShieldCheck size={18} /> FIDO2 Standard</span>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
