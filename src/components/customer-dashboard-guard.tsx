"use client";

import { CustomerDashboard } from "@/components/customer-dashboard";
import type { PortalView } from "@/components/wfo-types";
import { clearCustomerToken, customerFetch, getCustomerToken, setCustomerToken } from "@/lib/client-auth";
import { useEffect, useState } from "react";

type Identity = { username: string; fullName: string };

export function CustomerDashboardGuard({
  requestedUser,
  initialView,
}: {
  requestedUser?: string;
  initialView?: PortalView;
}) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [activeUser, setActiveUser] = useState(requestedUser || "henry_carter");

  useEffect(() => {
    let active = true;
    if (requestedUser) {
      setActiveUser(requestedUser);
    }
    if (!getCustomerToken()) return;
    (async () => {
      try {
        const res = await customerFetch("/api/customer/session");
        if (!res.ok) return;
        const data = (await res.json()) as { customer?: Identity | null; token?: string; authenticated?: boolean };
        if (data.authenticated === false) {
          clearCustomerToken();
          return;
        }
        if (!active || !data.customer?.username) return;
        if (typeof data.token === "string" && data.token) setCustomerToken(data.token);
        setIdentity({ username: data.customer.username, fullName: data.customer.fullName });
        if (!requestedUser) setActiveUser(data.customer.username);
      } catch {
        /* Keep dashboard accessible even if session probe fails. */
      }
    })();
    return () => {
      active = false;
    };
  }, [requestedUser]);

  return <CustomerDashboard initialUser={activeUser} signedInAs={identity?.fullName} initialView={initialView} />;
}
