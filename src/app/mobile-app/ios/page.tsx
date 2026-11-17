import { MobileAppView } from "@/components/mobile-app-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Wells Fargo Mobile for iOS (App Store) | Wells Fargo" };

export default function MobileAppIosPage() {
  return <MobileAppView platform="ios" />;
}
