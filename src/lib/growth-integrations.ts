import type { CanonicalEvent } from "./trace.ts";
import { createCanonicalEvent, ensureTraceContext } from "./trace.ts";
import { appendEvents } from "./runtime-store.ts";
import { getOperationalRuntimeConfig } from "./runtime-config.ts";
import { tenantConfig } from "./tenant.ts";
import type { CanonicalEventType, FunnelFamily, MarketplaceAudience } from "./runtime-schema.ts";

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

type FanoutResult = {
  provider: string;
  sent: boolean;
  detail: string;
};

function getString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  return {
    ok: response.ok,
    status: response.status,
  };
}

export async function dispatchPublicEventFanout(event: CanonicalEvent, payload: PublicEventPayload) {
  const runtimeConfig = await getOperationalRuntimeConfig();
  const results: FanoutResult[] = [];

  if (runtimeConfig.salespanel.enabled && runtimeConfig.salespanel.webhookUrl) {
    try {
      const response = await postJson(runtimeConfig.salespanel.webhookUrl, {
        provider: "salespanel",
        siteId: runtimeConfig.salespanel.siteId,
        trackAnonymous: runtimeConfig.salespanel.trackAnonymous,
        event,
        audience: payload.audience,
        pagePath: payload.pagePath,
      });
      results.push({
        provider: "Salespanel",
        sent: response.ok,
        detail: response.ok ? "Behavior event sent" : `Behavior event failed: ${response.status}`,
      });
    } catch (error) {
      results.push({
        provider: "Salespanel",
        sent: false,
        detail: error instanceof Error ? error.message : "Behavior event failed",
      });
    }
  }

  if (runtimeConfig.plerdy.enabled && runtimeConfig.plerdy.eventWebhookUrl) {
    try {
      const response = await postJson(runtimeConfig.plerdy.eventWebhookUrl, {
        provider: "plerdy",
        projectId: runtimeConfig.plerdy.projectId,
        heatmapsEnabled: runtimeConfig.plerdy.heatmapsEnabled,
        popupsEnabled: runtimeConfig.plerdy.popupsEnabled,
        event,
        audience: payload.audience,
        pagePath: payload.pagePath,
      });
      results.push({
        provider: "Plerdy",
        sent: response.ok,
        detail: response.ok ? "CRO event sent" : `CRO event failed: ${response.status}`,
      });
    } catch (error) {
      results.push({
        provider: "Plerdy",
        sent: false,
        detail: error instanceof Error ? error.message : "CRO event failed",
      });
    }
  }

  return results;
}

export function buildPublicGrowthBootConfig(
  config: Awaited<ReturnType<typeof getOperationalRuntimeConfig>>,
  context: {
    audience: MarketplaceAudience;
    pagePath: string;
    service: string;
    family: FunnelFamily;
  },
) {
  return {
    callScaler: {
      enabled: Boolean(config.callScaler.scriptUrl || config.callScaler.defaultTrackingNumber || config.callScaler.dynamicNumberPool.length),
      scriptUrl: config.callScaler.scriptUrl,
      defaultTrackingNumber: config.callScaler.defaultTrackingNumber,
      dynamicNumberPool: config.callScaler.dynamicNumberPool,
    },
    salespanel: {
      enabled: config.salespanel.enabled,
      scriptUrl: config.salespanel.scriptUrl,
      siteId: config.salespanel.siteId,
      trackAnonymous: config.salespanel.trackAnonymous,
    },
    plerdy: {
      enabled: config.plerdy.enabled,
      scriptUrl: config.plerdy.scriptUrl,
      projectId: config.plerdy.projectId,
      heatmapsEnabled: config.plerdy.heatmapsEnabled,
      popupsEnabled: config.plerdy.popupsEnabled,
    },
    context,
  };
}

export function verifyCallScalerWebhookAuthorization(request: Request, secret?: string) {
  if (!secret) {
    return true;
  }

  const authorization = request.headers.get("authorization");
  if (authorization?.trim() === `Bearer ${secret}`) {
    return true;
  }

  const headerSecret = request.headers.get("x-callscaler-secret");
  return headerSecret?.trim() === secret;
}

export async function processCallScalerWebhook(payload: Record<string, unknown>) {
  const trace = ensureTraceContext({
    visitorId: getString(payload.visitorId),
    sessionId: getString(payload.sessionId),
    leadKey: getString(payload.leadKey),
    tenant: tenantConfig.tenantId,
    source: getString(payload.source) ?? "callscaler",
    service: getString(payload.service) ?? "phone-call",
    niche: getString(payload.niche) ?? "general",
    blueprintId: getString(payload.blueprintId) ?? "callscaler-phone",
    stepId: "callscaler-webhook",
    family: "qualification",
    email: getString(payload.email),
    phone: getString(payload.phone),
  });

  const callStatus = getString(payload.callStatus)?.toLowerCase();
  const eventType: CanonicalEventType =
    callStatus === "answered"
      ? "call_answered"
      : callStatus === "completed"
        ? "call_completed"
        : "call_started";

  const event = createCanonicalEvent(trace, eventType, "voice", (getString(payload.status) ?? "RECORDED").toUpperCase(), {
    callId: getString(payload.callId),
    trackingNumber: getString(payload.trackingNumber),
    destinationNumber: getString(payload.destinationNumber),
    campaign: getString(payload.campaign),
    durationSeconds: payload.durationSeconds,
    recordingUrl: getString(payload.recordingUrl),
    transcriptUrl: getString(payload.transcriptUrl),
    callerName: getString(payload.callerName),
  });

  await appendEvents([event]);
  return event;
}
