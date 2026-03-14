import { TOOL_OWNERSHIP_MAP } from "./runtime-schema.ts";
import type { CanonicalEvent, TraceContext } from "./trace.ts";

type ProviderStatus = "configured" | "dry-run" | "missing";

export interface ProviderResult {
  ok: boolean;
  provider: string;
  mode: "live" | "dry-run" | "prepared";
  detail: string;
  payload?: Record<string, unknown>;
}

interface IntegrationConfig {
  configured: boolean;
  live: boolean;
  owner: string;
  responsibility: string;
}

const LIVE_MODE = process.env.LEAD_OS_ENABLE_LIVE_SENDS === "true";

function integration(configured: boolean, ownerKey: keyof typeof TOOL_OWNERSHIP_MAP): IntegrationConfig {
  const owner = TOOL_OWNERSHIP_MAP[ownerKey];
  return {
    configured,
    live: configured && LIVE_MODE,
    owner: owner.primary,
    responsibility: owner.responsibility,
  };
}

export const integrationMap = {
  suitedash: integration(Boolean(process.env.SUITEDASH_PUBLIC_ID && process.env.SUITEDASH_SECRET_KEY), "crm"),
  aitable: integration(Boolean(process.env.AITABLE_API_TOKEN && process.env.AITABLE_DATASHEET_ID), "ledger"),
  agenticflow: integration(Boolean(process.env.AGENTICFLOW_API_KEY), "intelligence"),
  n8n: integration(Boolean(process.env.N8N_WEBHOOK_URL), "orchestration"),
  boost: integration(Boolean(process.env.BOOST_SPACE_API_KEY), "orchestration"),
  emailit: integration(Boolean(process.env.EMAILIT_API_KEY), "email"),
  wbiztool: integration(Boolean(process.env.WBIZTOOL_API_KEY && process.env.WBIZTOOL_INSTANCE_ID), "whatsapp"),
  easyTextMarketing: integration(Boolean(process.env.EASY_TEXT_MARKETING_API_KEY), "sms"),
  insighto: integration(Boolean(process.env.INSIGHTO_API_KEY), "chat"),
  thoughtly: integration(Boolean(process.env.THOUGHTLY_API_KEY), "voice"),
  lunacal: integration(Boolean(process.env.LUNACAL_API_KEY), "booking"),
  documentero: integration(Boolean(process.env.DOCUMENTERO_API_KEY), "documents"),
  thrivecart: integration(Boolean(process.env.THRIVECART_WEBHOOK_SECRET), "commerce"),
  upviral: integration(Boolean(process.env.UPVIRAL_API_KEY), "referral"),
  partnero: integration(Boolean(process.env.PARTNERO_API_KEY), "referral"),
  activepieces: integration(Boolean(process.env.ACTIVEPIECES_WEBHOOK_URL), "fallbackAutomation"),
  electroneek: integration(Boolean(process.env.ELECTRONEEK_WEBHOOK_URL), "fallbackAutomation"),
};

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
    text: await response.text(),
  };
}

function dryRunResult(provider: string, detail: string, payload?: Record<string, unknown>): ProviderResult {
  return { ok: true, provider, mode: "dry-run", detail, payload };
}

export function getAutomationHealth() {
  const providers = Object.entries(integrationMap).reduce<Record<string, { status: ProviderStatus; owner: string; responsibility: string; live: boolean }>>(
    (acc, [key, value]) => {
      acc[key] = {
        status: value.configured ? (value.live ? "configured" : "dry-run") : "missing",
        owner: value.owner,
        responsibility: value.responsibility,
        live: value.live,
      };
      return acc;
    },
    {},
  );

  return {
    liveMode: LIVE_MODE,
    providers,
    channels: {
      email: providers.emailit.status,
      whatsapp: providers.wbiztool.status,
      sms: providers.easyTextMarketing.status,
      chat: providers.insighto.status,
      voice: providers.thoughtly.status,
    },
  };
}

export async function syncLeadToCrm(payload: Record<string, unknown>) {
  const provider = integrationMap.suitedash;
  if (!provider.configured || !provider.live) {
    return dryRunResult("SuiteDash", "CRM sync prepared", payload);
  }
  return {
    ok: true,
    provider: "SuiteDash",
    mode: "prepared",
    detail: "SuiteDash credentials detected; payload prepared for sync",
    payload,
  } satisfies ProviderResult;
}

export async function logEventsToLedger(events: CanonicalEvent[]) {
  const provider = integrationMap.aitable;
  if (!provider.configured || !provider.live) {
    return dryRunResult("AITable", `Ledger write prepared for ${events.length} events`, {
      count: events.length,
    });
  }

  const response = await postJson(
    `https://aitable.ai/fusion/v1/datasheets/${process.env.AITABLE_DATASHEET_ID}/records?fieldKey=name`,
    {
      records: events.map((event) => ({
        fields: {
          Title: `${event.eventType} - ${event.blueprintId}`,
          Scenario: event.service,
          Company: String(event.metadata.company ?? event.metadata.brandName ?? "Lead"),
          "Contact Email": String(event.metadata.email ?? ""),
          "Contact Name": String(event.metadata.fullName ?? ""),
          Status: event.status,
          Touchpoint: event.eventType,
          "AI Generated": JSON.stringify(event).slice(0, 900),
        },
      })),
      fieldKey: "name",
    },
    { Authorization: `Bearer ${process.env.AITABLE_API_TOKEN}` },
  );

  return {
    ok: response.ok,
    provider: "AITable",
    mode: "live",
    detail: response.ok ? "Events written to ledger" : `Ledger write failed: ${response.status}`,
  } satisfies ProviderResult;
}

export async function sendEmailAction(payload: {
  to: string;
  subject: string;
  html: string;
  trace: TraceContext;
}) {
  const provider = integrationMap.emailit;
  if (!provider.configured || !provider.live) {
    return dryRunResult("Emailit", "Email prepared", { to: payload.to, subject: payload.subject });
  }

  const response = await postJson(
    "https://api.emailit.com/v1/emails",
    {
      from: process.env.LEAD_OS_FROM_EMAIL ?? process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "LeadOS <support@example.com>",
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      metadata: {
        leadKey: payload.trace.leadKey,
        blueprintId: payload.trace.blueprintId,
      },
    },
    { Authorization: `Bearer ${process.env.EMAILIT_API_KEY}` },
  );

  return {
    ok: response.ok,
    provider: "Emailit",
    mode: "live",
    detail: response.ok ? "Email sent" : `Email failed: ${response.status}`,
  } satisfies ProviderResult;
}

export async function sendWhatsAppAction(payload: { phone: string; body: string }) {
  const provider = integrationMap.wbiztool;
  if (!provider.configured || !provider.live) {
    return dryRunResult("WbizTool", "WhatsApp message prepared", { to: payload.phone });
  }

  const response = await postJson(
    "https://app.wbiztool.com/api/send",
    {
      instance_id: process.env.WBIZTOOL_INSTANCE_ID,
      to: payload.phone.replace(/[^0-9+]/g, "").replace(/^\+/, ""),
      type: "text",
      body: payload.body,
    },
    { apikey: process.env.WBIZTOOL_API_KEY ?? "" },
  );

  return {
    ok: response.ok,
    provider: "WbizTool",
    mode: "live",
    detail: response.ok ? "WhatsApp sent" : `WhatsApp failed: ${response.status}`,
  } satisfies ProviderResult;
}

export async function sendSmsAction(payload: { phone: string; body: string }) {
  const provider = integrationMap.easyTextMarketing;
  if (!provider.configured || !provider.live) {
    return dryRunResult("Easy Text Marketing", "SMS prepared", { to: payload.phone });
  }
  return {
    ok: true,
    provider: "Easy Text Marketing",
    mode: "prepared",
    detail: "SMS provider configured; request prepared for live adapter",
    payload,
  } satisfies ProviderResult;
}

export async function sendAlertAction(payload: { title: string; body: string; trace: TraceContext }) {
  if (!LIVE_MODE) {
    return dryRunResult("Ops Alert", "Discord/Telegram alert prepared", payload);
  }

  const webhook = process.env.DISCORD_HIGH_VALUE_WEBHOOK;
  if (!webhook) {
    return {
      ok: false,
      provider: "Ops Alert",
      mode: "live",
      detail: "Missing Discord webhook",
    } satisfies ProviderResult;
  }

  const response = await postJson(webhook, {
    embeds: [
      {
        title: payload.title,
        description: payload.body,
        color: 0xff4d4f,
        fields: [
          { name: "Lead Key", value: payload.trace.leadKey, inline: true },
          { name: "Blueprint", value: payload.trace.blueprintId, inline: true },
        ],
      },
    ],
  });

  return {
    ok: response.ok,
    provider: "Ops Alert",
    mode: "live",
    detail: response.ok ? "Alert sent" : `Alert failed: ${response.status}`,
  } satisfies ProviderResult;
}

export async function emitWorkflowAction(eventName: string, payload: Record<string, unknown>) {
  const provider = integrationMap.n8n;
  if (!provider.configured || !provider.live) {
    return dryRunResult("n8n", `${eventName} workflow prepared`, payload);
  }

  const response = await postJson(process.env.N8N_WEBHOOK_URL ?? "", {
    eventName,
    payload,
  });

  return {
    ok: response.ok,
    provider: "n8n",
    mode: "live",
    detail: response.ok ? "Workflow emitted" : `Workflow failed: ${response.status}`,
  } satisfies ProviderResult;
}

export async function runSmokeTest(dryRun = true) {
  return {
    dryRun,
    health: getAutomationHealth(),
    providers: {
      crm: await syncLeadToCrm({ smoke: true, dryRun }),
      ledger: await logEventsToLedger([]),
      workflow: await emitWorkflowAction("lead.smoke", { dryRun }),
      email: await sendEmailAction({
        to: "smoke@example.com",
        subject: "LeadOS Smoke",
        html: "<p>Smoke</p>",
        trace: {
          visitorId: "visitor-smoke",
          sessionId: "session-smoke",
          leadKey: "email:smoke@example.com",
          tenant: "smoke",
          source: "manual",
          service: "smoke",
          niche: "general",
          blueprintId: "lead-magnet-default",
          stepId: "smoke-step",
        },
      }),
      whatsapp: await sendWhatsAppAction({ phone: "+15555550123", body: "Smoke test" }),
      sms: await sendSmsAction({ phone: "+15555550123", body: "Smoke test" }),
    },
  };
}
