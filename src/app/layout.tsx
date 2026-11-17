import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wells Fargo Bank | Financial Services & Online Banking",
  description: "Explore checking, savings, credit cards, home loans, financial guidance, and banking services in this Wells Fargo homepage visual demo.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
