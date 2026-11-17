import { AdminSupportPage } from "@/components/admin-support-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support Agent Inbox | Wells Fargo Admin Console",
  description: "Support agents communicate with their assigned users through secure messages.",
};

export default function AdminSupportRoute() {
  return <AdminSupportPage />;
}
