import { NextResponse } from "next/server";
import { appendEvents } from "@/lib/runtime-store";
import { dispatchPublicEventFanout } from "@/lib/growth-integrations";
import { ensureTraceContext, createCanonicalEvent } from "@/lib/trace";
import { tenantConfig } from "@/lib/tenant";
import type { CanonicalEventType, FunnelFamily, MarketplaceAudience } from "@/lib/runtime-schema";

const ALLOWED_PUBLIC_EVENTS = new Set<CanonicalEventType>([
  "page_view",
  "cta_clicked",
  "form_started",
  "form_step_completed",
  "form_abandoned",
]);

type PublicEventPayload = {
  eventType?: CanonicalEventType;
  visitorId?: string;
  sessionId?: string;
  leadKey?: string;
  source?: string;
  service?: string;
  niche?: string;
  blueprintId?: string;
  stepId?: string;
  experimentId?: string;
  variantId?: string;
  family?: FunnelFamily;
  audience?: MarketplaceAudience;
  pagePath?: string;
  status?: string;
  metadata?: Record<string, unknown>;
};

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as PublicEventPayload;
  const eventType = payload.eventType;

  if (!eventType || !ALLOWED_PUBLIC_EVENTS.has(eventType)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unsupported public event type.",
      },
      { status: 400 },
    );
  }

  const trace = ensureTraceContext({
    visitorId: getString(payload.visitorId) || undefined,
    sessionId: getString(payload.sessionId) || undefined,
    leadKey: getString(payload.leadKey) || undefined,
    tenant: tenantConfig.tenantId,
    source: getString(payload.source) || "public-web",
    service: getString(payload.service) || "lead-capture",
    niche: getString(payload.niche) || "general",
    blueprintId: getString(payload.blueprintId) || getString(payload.pagePath) || "public-entry",
    stepId: getString(payload.stepId) || "public-entry",
    experimentId: getString(payload.experimentId) || undefined,
    variantId: getString(payload.variantId) || undefined,
    family: payload.family,
  });

  const event = createCanonicalEvent(
    trace,
    eventType,
    "web",
    getString(payload.status) || "RECORDED",
    {
      ...(payload.metadata ?? {}),
      audience: payload.audience,
      pagePath: getString(payload.pagePath) || undefined,
    },
  );

  await appendEvents([event]);
  const fanout = await dispatchPublicEventFanout(event, payload);

  return NextResponse.json({
    success: true,
    eventId: event.id,
    fanout,
  });
}
