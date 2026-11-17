"use client";

import { adminFetch, adminSignOut } from "@/lib/client-auth";
import { ArrowLeft, LogOut, ShieldCheck, Users, MessageSquare, UserCog, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

type SessionAdmin = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  roleType: "super_admin" | "limited_admin" | "auditor";
};

export function AdminSubPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ready" | "denied">("checking");
  const [admin, setAdmin] = useState<SessionAdmin | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await adminFetch("/api/admin/session");
        if (res.ok) {
          const data = (await res.json()) as { admin?: SessionAdmin | null; authenticated?: boolean };
          if (data.authenticated && data.admin) {
            if (!active) return;
            setAdmin(data.admin);
            setState("ready");
            return;
          }
        }
      } catch {
        /* fall through */
      }
      if (active) setState("denied");
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state === "checking") {
    return <div className="adm-loading"><ShieldCheck size={32} /><p>Verifying administrator session…</p></div>;
  }

  if (state === "denied") {
    return (
      <div className="adm-loading">
        <ShieldCheck size={32} />
        <h2>Sign on required</h2>
        <p>This console requires an active administrator session.</p>
        <Link href="/admin/login" className="button button-red">Go to admin sign on</Link>
      </div>
    );
  }

  const isSuper = admin?.roleType === "super_admin";

  return (
    <div className="adm-subpage">
      <header className="adm-subpage-header">
        <div className="adm-subpage-brand">
          <img src="/images/wf-logo-220.png" alt="Wells Fargo" width="150" height="16" style={{ filter: "brightness(0) invert(1)" }} />
          <span>{isSuper ? "Super Admin Console" : "Limited Admin Workspace"}</span>
        </div>
        <div className="adm-subpage-user">
          <ShieldCheck size={16} /> {admin?.fullName}
          <span className={`adm-hierarchy-pill ${isSuper ? "super" : "limited"}`}>
            {isSuper ? "Super Admin" : admin?.roleType === "auditor" ? "Read-Only" : "Limited Admin"}
          </span>
        </div>
        <button
          type="button"
          className="adm-subpage-signout"
          onClick={async () => {
            await adminSignOut();
            router.replace("/admin/login");
          }}
        >
          <LogOut size={15} /> Sign Off
        </button>
      </header>
      <div className="adm-subpage-body content-width">
        <div className="adm-subpage-links">
          <Link href="/admin"><ArrowLeft size={15} /> {isSuper ? "Operations Overview" : "My Workspace"}</Link>
          <Link href="/admin/users"><Users size={15} /> Users</Link>
          <Link href="/admin/support"><MessageSquare size={15} /> Support Inbox</Link>
          <Link href="/admin/team"><UserCog size={15} /> Team</Link>
          {isSuper && <Link href="/admin/reports"><FileText size={15} /> Reports &amp; Exports</Link>}
        </div>
        <h1>{title}</h1>
        <p className="wf-muted">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
