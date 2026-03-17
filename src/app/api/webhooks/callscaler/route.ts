import { NextResponse } from "next/server";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
import {
  processCallScalerWebhook,
  verifyCallScalerWebhookAuthorization,
} from "@/lib/growth-integrations";

export async function POST(request: Request) {
  const runtimeConfig = await getOperationalRuntimeConfig();
  if (!verifyCallScalerWebhookAuthorization(request, runtimeConfig.callScaler.webhookSecret)) {
    return NextResponse.json({
      success: false,
      error: "Invalid CallScaler webhook authorization",
    }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({})) as Record<string, unknown>;
  const event = await processCallScalerWebhook(payload);

  return NextResponse.json({
    success: true,
    eventId: event.id,
    eventType: event.eventType,
  });
}
