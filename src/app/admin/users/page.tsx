import { AdminUsersPage } from "@/components/admin-users-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Management | Wells Fargo Admin Console",
  description: "Create and manage users assigned to Super Admins and Limited Admins.",
};

export default function AdminUsersRoute() {
  return <AdminUsersPage />;
}
