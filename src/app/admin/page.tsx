import AdminConsole from "@/components/admin-console";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Super Admin Console | Wells Fargo Enterprise Operations",
  description: "Internal enterprise operations console for managing customers, accounts, transactions, fraud cases, appointments, branches and published content.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminConsole />;
}
