import type { Metadata } from "next";
import "@/app/globals.css";
import { tenantConfig } from "@/lib/tenant";

export const metadata: Metadata = {
  title: `${tenantConfig.brandName} Hosted Runtime`,
  description: "Hosted lead capture runtime for WordPress and external sites.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
