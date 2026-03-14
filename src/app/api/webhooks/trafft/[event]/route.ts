import { NextResponse } from "next/server";
import {
  isKnownTrafftWebhookEvent,
  processTrafftWebhook,
  verifyTrafftWebhookAuthorization,
} from "@/lib/trafft-webhooks";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ event: string }> }) {
  const { event } = await context.params;
  if (!isKnownTrafftWebhookEvent(event)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unknown Trafft webhook event",
      },
      { status: 404 },
    );
  }

  if (!verifyTrafftWebhookAuthorization(request.headers.get("authorization"))) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid Trafft webhook verification token",
      },
      { status: 401 },
    );
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid JSON payload",
      },
      { status: 400 },
    );
  }

  const result = await processTrafftWebhook(event, payload);
  return NextResponse.json({
    verified: true,
    ...result,
  });
}
