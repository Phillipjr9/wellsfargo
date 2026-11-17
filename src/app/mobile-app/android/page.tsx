import { MobileAppView } from "@/components/mobile-app-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Wells Fargo Mobile for Android (Google Play) | Wells Fargo" };

export default function MobileAppAndroidPage() {
  return <MobileAppView platform="android" />;
}
