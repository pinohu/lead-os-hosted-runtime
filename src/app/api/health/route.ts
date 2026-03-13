import { NextResponse } from "next/server";
import { tenantConfig } from "@/lib/tenant";

export async function GET() {
  return NextResponse.json({
    success: true,
    service: "lead-os-hosted-runtime",
    brandName: tenantConfig.brandName,
    siteUrl: tenantConfig.siteUrl,
    widgetOrigins: tenantConfig.widgetOrigins,
  });
}
