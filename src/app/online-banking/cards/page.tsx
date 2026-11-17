import { CustomerDashboardGuard } from "@/components/customer-dashboard-guard";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Control Tower® — Manage Cards | Wells Fargo Online®",
  description: "Turn debit and credit cards on or off, manage digital wallets, set spending limits, and redeem Wells Fargo Rewards®.",
};

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const sp = await searchParams;
  return <CustomerDashboardGuard requestedUser={sp.user} initialView="cards" />;
}
