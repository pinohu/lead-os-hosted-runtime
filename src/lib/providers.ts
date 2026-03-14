import { embeddedSecrets } from "./embedded-secrets.ts";
import { TOOL_OWNERSHIP_MAP } from "./runtime-schema.ts";
import { createContact } from "./suitedash.ts";
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

const LIVE_MODE = process.env.LEAD_OS_ENABLE_LIVE_SENDS !== "false";

function getEnvValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function hasAnyEnv(...keys: string[]) {
  return Boolean(getEnvValue(...keys));
}

function getN8nWebhookUrl() {
  return getEnvValue("N8N_WEBHOOK_URL", "N8N_LEADOS_WEBHOOK_URL", "LEAD_OS_N8N_WEBHOOK_URL", "N8N_WEBHOOK");
}

function getN8nApiKey() {
  return getEnvValue("N8N_API_KEY");
}

function getN8nBaseUrl() {
  const value = getEnvValue("N8N_BASE_URL", "N8N_API_URL", "N8N_URL");
  return value?.replace(/\/+$/, "");
}

function getN8nMcpUrl() {
  return (getEnvValue("N8N_MCP_URL", "N8N_MCP_SERVER_URL") ?? embeddedSecrets.n8n.mcpUrl)?.replace(/\/+$/, "");
}

function getN8nMcpAccessToken() {
  return getEnvValue("N8N_MCP_ACCESS_TOKEN", "N8N_INSTANCE_MCP_ACCESS_TOKEN") ?? embeddedSecrets.n8n.mcpAccessToken;
}

function getEasyTextMarketingApiKey() {
  return getEnvValue("EASY_TEXT_MARKETING_API_KEY", "EASYTEXTMARKETING_API_KEY");
}

function getEasyTextMarketingWebhookUrl() {
  return getEnvValue("EASY_TEXT_MARKETING_WEBHOOK_URL", "EASYTEXTMARKETING_WEBHOOK_URL");
}

function getInsightoApiKey() {
  return getEnvValue("INSIGHTO_API_KEY");
}

function getInsightoWebhookUrl() {
  return getEnvValue("INSIGHTO_WEBHOOK_URL", "INSIGHTO_AGENT_WEBHOOK_URL");
}

function getInsightoAgentId() {
  return getEnvValue("INSIGHTO_AGENT_ID", "INSIGHTO_BOT_ID");
}

function getThoughtlyApiKey() {
  return getEnvValue("THOUGHTLY_API_KEY");
}

function getThoughtlyWebhookUrl() {
  return getEnvValue("THOUGHTLY_WEBHOOK_URL", "THOUGHTLY_AGENT_WEBHOOK_URL");
}

function getThoughtlyAgentId() {
  return getEnvValue("THOUGHTLY_AGENT_ID", "THOUGHTLY_FLOW_ID");
}

function getLunacalApiKey() {
  return getEnvValue("LUNACAL_API_KEY");
}

function getLunacalBookingUrl() {
  return getEnvValue("LUNACAL_BOOKING_URL", "LUNACAL_EVENT_LINK", "LUNACAL_WEBHOOK_URL");
}

function getDocumenteroApiKey() {
  return getEnvValue("DOCUMENTERO_API_KEY");
}

function getDocumenteroTemplateId() {
  return getEnvValue("DOCUMENTERO_TEMPLATE_ID");
}

function getDocumenteroWebhookUrl() {
  return getEnvValue("DOCUMENTERO_WEBHOOK_URL");
}

function getThrivecartWebhookSecret() {
  return getEnvValue("THRIVECART_WEBHOOK_SECRET");
}

function getThrivecartCheckoutUrl() {
  return getEnvValue("THRIVECART_CHECKOUT_URL", "THRIVECART_PRODUCT_URL");
}

function getThrivecartWebhookUrl() {
  return getEnvValue("THRIVECART_WEBHOOK_URL");
}

function getPartneroApiKey() {
  return getEnvValue("PARTNERO_API_KEY");
}

function getPartneroProgramId() {
  return getEnvValue("PARTNERO_PROGRAM_ID");
}

function getPartneroWebhookUrl() {
  return getEnvValue("PARTNERO_WEBHOOK_URL");
}

function getActivepiecesWebhookUrl() {
  return getEnvValue("ACTIVEPIECES_WEBHOOK_URL", "ACTIVEPIECES_FLOW_WEBHOOK_URL");
}

function getElectroneekWebhookUrl() {
  return getEnvValue("ELECTRONEEK_WEBHOOK_URL", "ELECTRONEEK_BOT_WEBHOOK_URL");
}

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
  suitedash: integration(Boolean((process.env.SUITEDASH_PUBLIC_ID ?? embeddedSecrets.suitedash.publicId) && (process.env.SUITEDASH_SECRET_KEY ?? embeddedSecrets.suitedash.secretKey)), "crm"),
  aitable: integration(Boolean((process.env.AITABLE_API_TOKEN ?? embeddedSecrets.aitable.apiToken) && (process.env.AITABLE_DATASHEET_ID ?? embeddedSecrets.aitable.datasheetId)), "ledger"),
  agenticflow: integration(Boolean(process.env.AGENTICFLOW_API_KEY ?? embeddedSecrets.agenticflow.apiKey), "intelligence"),
  n8n: integration(Boolean(
    getN8nWebhookUrl() ||
    (getN8nApiKey() && getN8nBaseUrl()) ||
    (getN8nMcpAccessToken() && getN8nMcpUrl())
  ), "orchestration"),
  boost: integration(Boolean((process.env.BOOST_SPACE_API_KEY ?? embeddedSecrets.boost.apiKey) || (process.env.BOOST_SPACE_MAKE_TOKEN ?? embeddedSecrets.boost.makeApiToken)), "orchestration"),
  emailit: integration(Boolean(process.env.EMAILIT_API_KEY ?? embeddedSecrets.emailit.apiKey), "email"),
  wbiztool: integration(Boolean((process.env.WBIZTOOL_API_KEY ?? embeddedSecrets.wbiztool.apiKey) && (process.env.WBIZTOOL_INSTANCE_ID ?? embeddedSecrets.wbiztool.instanceId)), "whatsapp"),
  easyTextMarketing: integration(Boolean(getEasyTextMarketingApiKey() || getEasyTextMarketingWebhookUrl()), "sms"),
  insighto: integration(Boolean(getInsightoApiKey() || getInsightoWebhookUrl() || getInsightoAgentId()), "chat"),
  thoughtly: integration(Boolean(getThoughtlyApiKey() || getThoughtlyWebhookUrl() || getThoughtlyAgentId()), "voice"),
  lunacal: integration(Boolean(getLunacalApiKey() || getLunacalBookingUrl()), "booking"),
  documentero: integration(Boolean(getDocumenteroApiKey() || getDocumenteroWebhookUrl() || getDocumenteroTemplateId()), "documents"),
  thrivecart: integration(Boolean(getThrivecartWebhookSecret() || getThrivecartCheckoutUrl() || getThrivecartWebhookUrl()), "commerce"),
  upviral: integration(Boolean(process.env.UPVIRAL_API_KEY ?? embeddedSecrets.upviral.apiKey), "referral"),
  partnero: integration(Boolean(getPartneroApiKey() || getPartneroWebhookUrl() || getPartneroProgramId()), "referral"),
  activepieces: integration(Boolean(getActivepiecesWebhookUrl()), "fallbackAutomation"),
  electroneek: integration(Boolean(getElectroneekWebhookUrl()), "fallbackAutomation"),
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
  const firstName = String(payload.firstName ?? "Lead");
  const lastName = String(payload.lastName ?? ".");
  const email = String(payload.email ?? "");
  const result = await createContact({
    first_name: firstName,
    last_name: lastName,
    email,
    role: "Lead",
    company_name: payload.company ? String(payload.company) : undefined,
    phone: payload.phone ? String(payload.phone) : undefined,
    tags: [String(payload.service ?? "lead-capture"), String(payload.niche ?? "general")],
    notes: [`Lead key: ${String(payload.leadKey ?? "")}`, `Stage: ${String(payload.stage ?? "captured")}`],
    send_welcome_email: false,
  });
  return {
    ok: true,
    provider: "SuiteDash",
    mode: "live",
    detail: result.message ?? "CRM synced",
    payload: result.data as Record<string, unknown> | undefined,
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
    `https://aitable.ai/fusion/v1/datasheets/${process.env.AITABLE_DATASHEET_ID ?? embeddedSecrets.aitable.datasheetId}/records?fieldKey=name`,
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
    { Authorization: `Bearer ${process.env.AITABLE_API_TOKEN ?? embeddedSecrets.aitable.apiToken}` },
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
    { Authorization: `Bearer ${process.env.EMAILIT_API_KEY ?? embeddedSecrets.emailit.apiKey}` },
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
      instance_id: process.env.WBIZTOOL_INSTANCE_ID ?? embeddedSecrets.wbiztool.instanceId,
      to: payload.phone.replace(/[^0-9+]/g, "").replace(/^\+/, ""),
      type: "text",
      body: payload.body,
    },
    { apikey: process.env.WBIZTOOL_API_KEY ?? embeddedSecrets.wbiztool.apiKey },
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
  const webhookUrl = getEasyTextMarketingWebhookUrl();
  if (webhookUrl) {
    const response = await postJson(webhookUrl, {
      to: payload.phone,
      body: payload.body,
      provider: "easy-text-marketing",
      apiKey: getEasyTextMarketingApiKey(),
    });
    return {
      ok: response.ok,
      provider: "Easy Text Marketing",
      mode: "live",
      detail: response.ok ? "SMS request sent" : `SMS failed: ${response.status}`,
    } satisfies ProviderResult;
  }
  return {
    ok: true,
    provider: "Easy Text Marketing",
    mode: "prepared",
    detail: "SMS provider configured; direct API credentials detected without webhook bridge",
    payload,
  } satisfies ProviderResult;
}

export async function sendAlertAction(payload: { title: string; body: string; trace: TraceContext }) {
  if (!LIVE_MODE) {
    return dryRunResult("Ops Alert", "Discord/Telegram alert prepared", payload);
  }

  const webhook = process.env.DISCORD_HIGH_VALUE_WEBHOOK ?? embeddedSecrets.discord.highValueWebhook;
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

  const webhookUrl = getN8nWebhookUrl();
  if (!webhookUrl) {
    return {
      ok: true,
      provider: "n8n",
      mode: "prepared",
      detail: getN8nMcpAccessToken() && getN8nMcpUrl()
        ? "n8n MCP credentials detected; add a workflow webhook URL if you want direct event emission from the runtime"
        : "n8n API credentials detected; add a workflow webhook URL to emit runtime events",
      payload: {
        eventName,
        payload,
        baseUrl: getN8nBaseUrl(),
        mcpUrl: getN8nMcpUrl(),
      },
    } satisfies ProviderResult;
  }

  const response = await postJson(webhookUrl, { eventName, payload });

  return {
    ok: response.ok,
    provider: "n8n",
    mode: "live",
    detail: response.ok ? "Workflow emitted" : `Workflow failed: ${response.status}`,
  } satisfies ProviderResult;
}

export async function startChatAction(payload: Record<string, unknown>) {
  const provider = integrationMap.insighto;
  if (!provider.configured || !provider.live) {
    return dryRunResult("Insighto.ai", "Chat workflow prepared", payload);
  }
  const webhookUrl = getInsightoWebhookUrl();
  if (webhookUrl) {
    const response = await postJson(webhookUrl, {
      agentId: getInsightoAgentId(),
      payload,
    }, getInsightoApiKey() ? { Authorization: `Bearer ${getInsightoApiKey()}` } : {});
    return {
      ok: response.ok,
      provider: "Insighto.ai",
      mode: "live",
      detail: response.ok ? "Chat workflow started" : `Chat workflow failed: ${response.status}`,
    } satisfies ProviderResult;
  }
  return {
    ok: true,
    provider: "Insighto.ai",
    mode: "prepared",
    detail: getInsightoAgentId()
      ? "Insighto configured with agent metadata; add webhook to trigger live chat workflows"
      : "Insighto adapter is wired and awaiting account-specific endpoint details",
    payload: {
      ...payload,
      agentId: getInsightoAgentId(),
    },
  } satisfies ProviderResult;
}

export async function startVoiceAction(payload: Record<string, unknown>) {
  const provider = integrationMap.thoughtly;
  if (!provider.configured || !provider.live) {
    return dryRunResult("Thoughtly", "Voice workflow prepared", payload);
  }
  const webhookUrl = getThoughtlyWebhookUrl();
  if (webhookUrl) {
    const response = await postJson(webhookUrl, {
      agentId: getThoughtlyAgentId(),
      payload,
    }, getThoughtlyApiKey() ? { Authorization: `Bearer ${getThoughtlyApiKey()}` } : {});
    return {
      ok: response.ok,
      provider: "Thoughtly",
      mode: "live",
      detail: response.ok ? "Voice workflow started" : `Voice workflow failed: ${response.status}`,
    } satisfies ProviderResult;
  }
  return {
    ok: true,
    provider: "Thoughtly",
    mode: "prepared",
    detail: getThoughtlyAgentId()
      ? "Thoughtly configured with agent metadata; add webhook to trigger live voice workflows"
      : "Thoughtly adapter is wired and awaiting account-specific endpoint details",
    payload: {
      ...payload,
      agentId: getThoughtlyAgentId(),
    },
  } satisfies ProviderResult;
}

export async function createBookingAction(payload: Record<string, unknown>) {
  const provider = integrationMap.lunacal;
  if (!provider.configured || !provider.live) {
    return dryRunResult("Lunacal", "Booking request prepared", payload);
  }
  const bookingUrl = getLunacalBookingUrl();
  if (bookingUrl?.startsWith("http")) {
    return {
      ok: true,
      provider: "Lunacal",
      mode: "live",
      detail: "Booking destination resolved",
      payload: {
        ...payload,
        bookingUrl,
      },
    } satisfies ProviderResult;
  }
  return {
    ok: true,
    provider: "Lunacal",
    mode: "prepared",
    detail: getLunacalApiKey()
      ? "Lunacal API key detected; add booking or webhook URL to activate runtime handoff"
      : "Lunacal adapter is wired and awaiting account-specific endpoint details",
    payload: {
      ...payload,
      bookingUrl,
    },
  } satisfies ProviderResult;
}

export async function generateDocumentAction(payload: Record<string, unknown>) {
  const provider = integrationMap.documentero;
  if (!provider.configured || !provider.live) {
    return dryRunResult("Documentero", "Document generation prepared", payload);
  }
  const webhookUrl = getDocumenteroWebhookUrl();
  if (webhookUrl) {
    const response = await postJson(webhookUrl, {
      templateId: getDocumenteroTemplateId(),
      payload,
    }, getDocumenteroApiKey() ? { Authorization: `Bearer ${getDocumenteroApiKey()}` } : {});
    return {
      ok: response.ok,
      provider: "Documentero",
      mode: "live",
      detail: response.ok ? "Document request sent" : `Document request failed: ${response.status}`,
    } satisfies ProviderResult;
  }
  return {
    ok: true,
    provider: "Documentero",
    mode: "prepared",
    detail: getDocumenteroTemplateId()
      ? "Documentero template detected; add webhook URL to render documents from the runtime"
      : "Documentero adapter is wired and awaiting account-specific endpoint details",
    payload: {
      ...payload,
      templateId: getDocumenteroTemplateId(),
    },
  } satisfies ProviderResult;
}

export async function startReferralAction(payload: Record<string, unknown>) {
  const provider = integrationMap.partnero;
  if (!provider.configured || !provider.live) {
    return dryRunResult("Partnero", "Referral workflow prepared", payload);
  }
  const webhookUrl = getPartneroWebhookUrl();
  if (webhookUrl) {
    const response = await postJson(webhookUrl, {
      programId: getPartneroProgramId(),
      payload,
    }, getPartneroApiKey() ? { Authorization: `Bearer ${getPartneroApiKey()}` } : {});
    return {
      ok: response.ok,
      provider: "Partnero",
      mode: "live",
      detail: response.ok ? "Referral workflow started" : `Referral workflow failed: ${response.status}`,
    } satisfies ProviderResult;
  }
  return {
    ok: true,
    provider: "Partnero",
    mode: "prepared",
    detail: getPartneroProgramId()
      ? "Partnero program detected; add webhook URL to activate referral enrollment"
      : "Partnero adapter is wired and awaiting account-specific endpoint details",
    payload: {
      ...payload,
      programId: getPartneroProgramId(),
    },
  } satisfies ProviderResult;
}

export async function startCommerceAction(payload: Record<string, unknown>) {
  const provider = integrationMap.thrivecart;
  if (!provider.configured || !provider.live) {
    return dryRunResult("ThriveCart", "Commerce workflow prepared", payload);
  }
  const webhookUrl = getThrivecartWebhookUrl();
  if (webhookUrl) {
    const response = await postJson(webhookUrl, {
      webhookSecret: getThrivecartWebhookSecret(),
      payload,
    });
    return {
      ok: response.ok,
      provider: "ThriveCart",
      mode: "live",
      detail: response.ok ? "Commerce workflow started" : `Commerce workflow failed: ${response.status}`,
    } satisfies ProviderResult;
  }
  const checkoutUrl = getThrivecartCheckoutUrl();
  if (checkoutUrl) {
    return {
      ok: true,
      provider: "ThriveCart",
      mode: "live",
      detail: "Checkout destination resolved",
      payload: {
        ...payload,
        checkoutUrl,
      },
    } satisfies ProviderResult;
  }
  return {
    ok: true,
    provider: "ThriveCart",
    mode: "prepared",
    detail: getThrivecartWebhookSecret()
      ? "ThriveCart webhook secret detected; add checkout or webhook URL to activate runtime commerce handoff"
      : "ThriveCart adapter is wired and awaiting account-specific endpoint details",
    payload: {
      ...payload,
      checkoutUrl,
    },
  } satisfies ProviderResult;
}

export async function emitSecondaryWorkflowAction(payload: Record<string, unknown>) {
  const provider = integrationMap.activepieces;
  if (!provider.configured || !provider.live) {
    return dryRunResult("Activepieces", "Secondary workflow prepared", payload);
  }
  const response = await postJson(getActivepiecesWebhookUrl() ?? "", payload);
  return {
    ok: response.ok,
    provider: "Activepieces",
    mode: "live",
    detail: response.ok ? "Secondary workflow emitted" : `Secondary workflow failed: ${response.status}`,
  } satisfies ProviderResult;
}

export async function emitRpaFallbackAction(payload: Record<string, unknown>) {
  const provider = integrationMap.electroneek;
  if (!provider.configured || !provider.live) {
    return dryRunResult("ElectroNeek", "RPA fallback prepared", payload);
  }
  const response = await postJson(getElectroneekWebhookUrl() ?? "", payload);
  return {
    ok: response.ok,
    provider: "ElectroNeek",
    mode: "live",
    detail: response.ok ? "RPA fallback emitted" : `RPA fallback failed: ${response.status}`,
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
      chat: await startChatAction({ dryRun }),
      voice: await startVoiceAction({ dryRun }),
      booking: await createBookingAction({ dryRun }),
      documents: await generateDocumentAction({ dryRun }),
      referral: await startReferralAction({ dryRun }),
      commerce: await startCommerceAction({ dryRun }),
      activepieces: await emitSecondaryWorkflowAction({ dryRun }),
      electroneek: await emitRpaFallbackAction({ dryRun }),
    },
  };
}
