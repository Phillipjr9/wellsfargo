import { MobileAppView } from "@/components/mobile-app-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Wells Fargo Mobile App & Fargo | Wells Fargo" };

export default function MobileAppPage() {
  return <MobileAppView platform="all" />;
}
