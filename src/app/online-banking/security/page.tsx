import { CustomerDashboardGuard } from "@/components/customer-dashboard-guard";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Security Center | Wells Fargo Online®",
  description: "Manage 2-Step Verification, passkeys, account alerts, trusted devices, card security, and fraud protection.",
};

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const sp = await searchParams;
  return <CustomerDashboardGuard requestedUser={sp.user} initialView="security" />;
}
