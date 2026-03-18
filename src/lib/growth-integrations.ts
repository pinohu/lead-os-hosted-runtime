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

export type GrowthSmokeResult = {
  ok: boolean;
  mode: "live" | "dry-run" | "prepared";
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

export function buildGrowthStackHealth(
  config: Awaited<ReturnType<typeof getOperationalRuntimeConfig>>,
) {
  return {
    suiteDash: {
      portalReady: Boolean(config.suiteDash.portalUrl),
      membershipReady: Boolean(config.suiteDash.defaultMembershipPlanId),
    },
    messaging: {
      primarySmsProvider: config.messaging.primarySmsProvider,
      fallbackSmsProvider: config.messaging.fallbackSmsProvider ?? "none",
    },
    callScaler: {
      webhookReady: Boolean(config.callScaler.webhookUrl),
      scriptReady: Boolean(config.callScaler.scriptUrl),
      dynamicNumbers: config.callScaler.dynamicNumberPool.length,
    },
    salespanel: {
      enabled: config.salespanel.enabled,
      webhookReady: Boolean(config.salespanel.webhookUrl),
      scriptReady: Boolean(config.salespanel.scriptUrl),
    },
    plerdy: {
      enabled: config.plerdy.enabled,
      webhookReady: Boolean(config.plerdy.eventWebhookUrl),
      scriptReady: Boolean(config.plerdy.scriptUrl),
    },
    partnero: {
      webhookReady: Boolean(config.partnero.webhookUrl),
      programReady: Boolean(config.partnero.programId),
      autoEnrollStage: config.partnero.autoEnrollStage,
    },
    thoughtly: {
      webhookReady: Boolean(config.thoughtly.webhookUrl),
      agentReady: Boolean(config.thoughtly.defaultAgentId),
      afterHoursEnabled: config.thoughtly.afterHoursEnabled,
      callbackWindowMinutes: config.thoughtly.callbackWindowMinutes,
    },
  };
}

export async function runGrowthStackSmokeTest(dryRun = true) {
  const config = await getOperationalRuntimeConfig();
  const results: Record<string, GrowthSmokeResult> = {
    suiteDash: {
      ok: Boolean(config.suiteDash.portalUrl),
      mode: dryRun ? "dry-run" : "prepared",
      detail: config.suiteDash.portalUrl
        ? "SuiteDash portal URL is configured for billing, portal, and recurring-service handoff."
        : "SuiteDash is waiting on a portal URL before portal, billing, and membership flows can verify cleanly.",
    },
    messaging: {
      ok: true,
      mode: dryRun ? "dry-run" : "prepared",
      detail: `Primary SMS: ${config.messaging.primarySmsProvider}. Fallback: ${config.messaging.fallbackSmsProvider ?? "none"}. Live message delivery should be verified in provider smoke and execution queues.`,
    },
    callScaler: {
      ok: Boolean(config.callScaler.webhookUrl || config.callScaler.scriptUrl || config.callScaler.dynamicNumberPool.length),
      mode: dryRun ? "dry-run" : config.callScaler.webhookUrl ? "live" : "prepared",
      detail: config.callScaler.webhookUrl
        ? dryRun
          ? "Dry run: CallScaler webhook configured."
          : "CallScaler webhook reachable for live smoke attempts."
        : "CallScaler is waiting on webhook or script activation.",
    },
    salespanel: {
      ok: config.salespanel.enabled,
      mode: dryRun ? "dry-run" : config.salespanel.webhookUrl ? "live" : "prepared",
      detail: config.salespanel.enabled
        ? config.salespanel.webhookUrl
          ? dryRun
            ? "Dry run: Salespanel behavioral tracking configured."
            : "Salespanel webhook reachable for live smoke attempts."
          : "Salespanel is enabled but still waiting on a webhook or script."
        : "Salespanel is disabled in runtime settings.",
    },
    plerdy: {
      ok: config.plerdy.enabled,
      mode: dryRun ? "dry-run" : config.plerdy.eventWebhookUrl ? "live" : "prepared",
      detail: config.plerdy.enabled
        ? config.plerdy.eventWebhookUrl
          ? dryRun
            ? "Dry run: Plerdy CRO tracking configured."
            : "Plerdy webhook reachable for live smoke attempts."
          : "Plerdy is enabled but still waiting on a webhook or script."
        : "Plerdy is disabled in runtime settings.",
    },
    partnero: {
      ok: Boolean(config.partnero.webhookUrl && config.partnero.programId),
      mode: dryRun ? "dry-run" : config.partnero.webhookUrl ? "live" : "prepared",
      detail: config.partnero.webhookUrl
        ? config.partnero.programId
          ? dryRun
            ? "Dry run: Partnero enrollment is configured for post-payment compounding."
            : "Partnero webhook reachable for live smoke attempts."
          : "Partnero webhook is configured, but the program ID is still missing."
        : "Partnero is waiting on webhook activation.",
    },
    thoughtly: {
      ok: Boolean(config.thoughtly.webhookUrl && config.thoughtly.defaultAgentId),
      mode: dryRun ? "dry-run" : config.thoughtly.webhookUrl ? "live" : "prepared",
      detail: config.thoughtly.webhookUrl
        ? config.thoughtly.defaultAgentId
          ? dryRun
            ? "Dry run: Thoughtly voice recovery is configured."
            : "Thoughtly webhook reachable for live smoke attempts."
          : "Thoughtly webhook is configured, but the default agent ID is still missing."
        : "Thoughtly is waiting on webhook activation.",
    },
  };

  if (!dryRun && config.callScaler.webhookUrl) {
    try {
      const response = await postJson(config.callScaler.webhookUrl, {
        provider: "callscaler",
        smoke: true,
        timestamp: new Date().toISOString(),
      }, config.callScaler.webhookSecret ? { Authorization: `Bearer ${config.callScaler.webhookSecret}` } : {});
      results.callScaler = {
        ok: response.ok,
        mode: "live",
        detail: response.ok ? "CallScaler smoke ping accepted." : `CallScaler smoke ping failed: ${response.status}`,
      };
    } catch (error) {
      results.callScaler = {
        ok: false,
        mode: "live",
        detail: error instanceof Error ? error.message : "CallScaler smoke ping failed.",
      };
    }
  }

  if (!dryRun && config.salespanel.enabled && config.salespanel.webhookUrl) {
    try {
      const response = await postJson(config.salespanel.webhookUrl, {
        provider: "salespanel",
        smoke: true,
        siteId: config.salespanel.siteId,
        timestamp: new Date().toISOString(),
      });
      results.salespanel = {
        ok: response.ok,
        mode: "live",
        detail: response.ok ? "Salespanel smoke ping accepted." : `Salespanel smoke ping failed: ${response.status}`,
      };
    } catch (error) {
      results.salespanel = {
        ok: false,
        mode: "live",
        detail: error instanceof Error ? error.message : "Salespanel smoke ping failed.",
      };
    }
  }

  if (!dryRun && config.plerdy.enabled && config.plerdy.eventWebhookUrl) {
    try {
      const response = await postJson(config.plerdy.eventWebhookUrl, {
        provider: "plerdy",
        smoke: true,
        projectId: config.plerdy.projectId,
        timestamp: new Date().toISOString(),
      });
      results.plerdy = {
        ok: response.ok,
        mode: "live",
        detail: response.ok ? "Plerdy smoke ping accepted." : `Plerdy smoke ping failed: ${response.status}`,
      };
    } catch (error) {
      results.plerdy = {
        ok: false,
        mode: "live",
        detail: error instanceof Error ? error.message : "Plerdy smoke ping failed.",
      };
    }
  }

  if (!dryRun && config.partnero.webhookUrl) {
    try {
      const response = await postJson(config.partnero.webhookUrl, {
        provider: "partnero",
        smoke: true,
        programId: config.partnero.programId,
        timestamp: new Date().toISOString(),
      });
      results.partnero = {
        ok: response.ok,
        mode: "live",
        detail: response.ok ? "Partnero smoke ping accepted." : `Partnero smoke ping failed: ${response.status}`,
      };
    } catch (error) {
      results.partnero = {
        ok: false,
        mode: "live",
        detail: error instanceof Error ? error.message : "Partnero smoke ping failed.",
      };
    }
  }

  if (!dryRun && config.thoughtly.webhookUrl) {
    try {
      const response = await postJson(config.thoughtly.webhookUrl, {
        provider: "thoughtly",
        smoke: true,
        agentId: config.thoughtly.defaultAgentId,
        timestamp: new Date().toISOString(),
      });
      results.thoughtly = {
        ok: response.ok,
        mode: "live",
        detail: response.ok ? "Thoughtly smoke ping accepted." : `Thoughtly smoke ping failed: ${response.status}`,
      };
    } catch (error) {
      results.thoughtly = {
        ok: false,
        mode: "live",
        detail: error instanceof Error ? error.message : "Thoughtly smoke ping failed.",
      };
    }
  }

  return {
    dryRun,
    health: buildGrowthStackHealth(config),
    providers: results,
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
