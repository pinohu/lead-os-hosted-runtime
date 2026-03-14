import { NextResponse } from "next/server";
import { getTrafftWebhookEndpointMap, hasTrafftWebhookVerificationToken } from "@/lib/trafft-webhooks";
import { tenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  const origin = tenantConfig.siteUrl.replace(/\/+$/, "");
  return NextResponse.json({
    success: true,
    provider: "Trafft",
    verificationConfigured: hasTrafftWebhookVerificationToken(),
    endpoints: getTrafftWebhookEndpointMap(origin),
  });
}
