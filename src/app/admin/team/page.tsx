import { AdminTeamPage } from "@/components/admin-team-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administrator Team | Wells Fargo Super Admin Console",
  description: "Super Admin management of Limited Admin accounts.",
};

export default function AdminTeamRoute() {
  return <AdminTeamPage />;
}
