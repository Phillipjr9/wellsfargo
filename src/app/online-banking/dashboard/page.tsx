import { CustomerDashboardGuard } from "@/components/customer-dashboard-guard";
import { ensureBankingSeeded, ensureCustomerCredentialsSeeded } from "@/db/seed";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account Summary — Wells Fargo Online® | Wells Fargo",
  description:
    "Manage your Wells Fargo accounts, transfers, bill pay, cards, statements, alerts and Fargo spending insights.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  await ensureBankingSeeded();
  await ensureCustomerCredentialsSeeded();
  const sp = await searchParams;
  return <CustomerDashboardGuard requestedUser={(sp.user ?? "").slice(0, 60) || undefined} />;
}
