import { NextResponse } from "next/server";
import { getTrafftWebhookEndpointMap, hasTrafftWebhookVerificationToken } from "@/lib/trafft-webhooks";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return NextResponse.json({
    success: true,
    provider: "Trafft",
    verificationConfigured: hasTrafftWebhookVerificationToken(),
    endpoints: getTrafftWebhookEndpointMap(origin),
  });
}
