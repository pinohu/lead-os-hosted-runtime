import { embeddedSecrets } from "./embedded-secrets.ts";
import { getOperationalRuntimeConfig } from "./runtime-config.ts";
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

interface HttpResult {
  ok: boolean;
  status: number;
  text: string;
  json?: unknown;
  contentType?: string | null;
}

type TrafftRuntimeConfig = Awaited<ReturnType<typeof getOperationalRuntimeConfig>>["trafft"];

const LIVE_MODE = process.env.LEAD_OS_ENABLE_LIVE_SENDS !== "false";
let trafftTokenCache: { token: string; expiresAt: number } | null = null;

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
  const value = getEnvValue("N8N_BASE_URL", "N8N_API_URL", "N8N_URL") ?? embeddedSecrets.n8n.apiBaseUrl;
  return value?.replace(/\/+$/, "");
}

function getN8nOriginUrl() {
  const baseUrl = getN8nBaseUrl();
  if (!baseUrl) {
    return undefined;
  }

  return baseUrl.replace(/\/api\/v1$/i, "").replace(/\/+$/, "");
}

function getN8nMcpUrl() {
  return (getEnvValue("N8N_MCP_URL", "N8N_MCP_SERVER_URL") ?? embeddedSecrets.n8n.mcpUrl)?.replace(/\/+$/, "");
}

function getN8nMcpAccessToken() {
  return getEnvValue("N8N_MCP_ACCESS_TOKEN", "N8N_INSTANCE_MCP_ACCESS_TOKEN") ?? embeddedSecrets.n8n.mcpAccessToken;
}

function getN8nMappedWebhookUrl(eventName: string, payload: Record<string, unknown>) {
  const origin = getN8nOriginUrl();
  if (!origin) {
    return undefined;
  }

  const metadata =
    payload.metadata && typeof payload.metadata === "object"
      ? payload.metadata as Record<string, unknown>
      : undefined;
  const source = String(payload.trace && typeof payload.trace === "object" && "source" in payload.trace ? (payload.trace as { source?: string }).source ?? "" : payload.source ?? "");
  const family = String(payload.family ?? metadata?.family ?? "");
  const activationReady = Boolean(metadata?.activationMilestone);

  let path: string | undefined;

  switch (eventName) {
    case "lead.captured":
      path = "leados/lead-captured";
      break;
    case "lead.hot":
      path = "leados/hot-lead";
      break;
    case "checkout_started":
      path = "leados/checkout-started";
      break;
    case "activation_milestone":
    case "customer_activated":
      path = "leados/customer-activated";
      break;
    case "lead.milestone.2":
      path = "leados/lead-milestone-2";
      break;
    case "lead.milestone.3":
      path = "leados/lead-milestone-3";
      break;
    case "customer.milestone.2":
      path = "leados/customer-milestone-2";
      break;
    case "customer.milestone.3":
    case "customer.value.realized":
      path = "leados/customer-milestone-3";
      break;
    case "lead.qualify.ai":
      path = "leados/ai-qualifier";
      break;
    default:
      if (source === "checkout" || family === "checkout") {
        path = "leados/checkout-started";
      } else if (source === "chat" || family === "chat") {
        path = "leados/ai-qualifier";
      } else if (activationReady) {
        path = "leados/customer-activated";
      }
      break;
  }

  return path ? `${origin}/webhook/${path}` : undefined;
}

function getEasyTextMarketingApiKey() {
  return getEnvValue("EASY_TEXT_MARKETING_API_KEY", "EASYTEXTMARKETING_API_KEY") ?? embeddedSecrets.easyTextMarketing.apiKey;
}

function getEasyTextMarketingWebhookUrl() {
  return getEnvValue("EASY_TEXT_MARKETING_WEBHOOK_URL", "EASYTEXTMARKETING_WEBHOOK_URL");
}

function getSmsitApiKey() {
  return getEnvValue("SMSIT_API_KEY") ?? embeddedSecrets.smsit.apiKey;
}

function getSmsitBaseUrl() {
  return (getEnvValue("SMSIT_BASE_URL", "SMSIT_API_URL") ?? embeddedSecrets.smsit.baseUrl)?.replace(/\/+$/, "");
}

function getInsightoApiKey() {
  return getEnvValue("INSIGHTO_API_KEY") ?? embeddedSecrets.insighto.apiKey;
}

function getInsightoWebhookUrl() {
  return getEnvValue("INSIGHTO_WEBHOOK_URL", "INSIGHTO_AGENT_WEBHOOK_URL");
}

function getInsightoAgentId() {
  return getEnvValue("INSIGHTO_AGENT_ID", "INSIGHTO_BOT_ID");
}

function getThoughtlyApiKey() {
  return getEnvValue("THOUGHTLY_API_KEY") ?? embeddedSecrets.thoughtly.apiKey;
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

function getTrafftApiUrl() {
  return (getEnvValue("TRAFFT_API_URL", "TRAFFT_BASE_URL") ?? embeddedSecrets.trafft.apiUrl)?.replace(/\/+$/, "");
}

function getTrafftBookingUrl() {
  return getEnvValue("TRAFFT_BOOKING_URL", "TRAFFT_PUBLIC_BOOKING_URL", "TRAFFT_EVENT_LINK");
}

function getTrafftClientId() {
  return getEnvValue("TRAFFT_CLIENT_ID") ?? embeddedSecrets.trafft.clientId;
}

function getTrafftClientSecret() {
  return getEnvValue("TRAFFT_CLIENT_SECRET") ?? embeddedSecrets.trafft.clientSecret;
}

function getTrafftBearerToken() {
  return getEnvValue("TRAFFT_BEARER_TOKEN", "TRAFFT_API_TOKEN", "TRAFFT_ACCESS_TOKEN");
}

function getTrafftDefaultServiceId() {
  return getEnvValue("TRAFFT_DEFAULT_SERVICE_ID");
}

function getTrafftServiceMap() {
  const raw = getEnvValue("TRAFFT_SERVICE_MAP");
  if (!raw) {
    return {} as Record<string, string>;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.entries(parsed).reduce<Record<string, string>>((acc, [key, value]) => {
      if (typeof value === "string" && value.trim().length > 0) {
        acc[key.trim().toLowerCase()] = value.trim();
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function getDocumenteroApiKey() {
  return getEnvValue("DOCUMENTERO_API_KEY") ?? embeddedSecrets.documentero.apiKey;
}

function getDocumenteroTemplateId() {
  return getEnvValue("DOCUMENTERO_TEMPLATE_ID");
}

function getDocumenteroProposalTemplateId() {
  return getEnvValue("DOCUMENTERO_TEMPLATE_PROPOSAL_ID");
}

function getDocumenteroAgreementTemplateId() {
  return getEnvValue("DOCUMENTERO_TEMPLATE_AGREEMENT_ID");
}

function getDocumenteroOnboardingTemplateId() {
  return getEnvValue("DOCUMENTERO_TEMPLATE_ONBOARDING_ID");
}

function getDocumenteroDefaultFormat() {
  return getEnvValue("DOCUMENTERO_DEFAULT_FORMAT") ?? "pdf";
}

function getDocumenteroWebhookUrl() {
  return getEnvValue("DOCUMENTERO_WEBHOOK_URL");
}

function getCroveApiKey() {
  return getEnvValue("CROVE_API_KEY") ?? embeddedSecrets.crove.apiKey;
}

function getCroveBaseUrl() {
  return (getEnvValue("CROVE_BASE_URL", "CROVE_API_URL") ?? embeddedSecrets.crove.baseUrl)?.replace(/\/+$/, "");
}

function getCroveWebhookUrl() {
  return getEnvValue("CROVE_WEBHOOK_URL");
}

function getCroveTemplateId() {
  return getEnvValue("CROVE_TEMPLATE_ID");
}

function getCroveProposalTemplateId() {
  return getEnvValue("CROVE_TEMPLATE_PROPOSAL_ID");
}

function getCroveAgreementTemplateId() {
  return getEnvValue("CROVE_TEMPLATE_AGREEMENT_ID");
}

function getCroveOnboardingTemplateId() {
  return getEnvValue("CROVE_TEMPLATE_ONBOARDING_ID");
}

function getThrivecartApiKey() {
  return getEnvValue("THRIVECART_API_KEY", "THRIVECART_API_KEY") ?? embeddedSecrets.thrivecart.apiKey;
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
  return getEnvValue("PARTNERO_PROGRAM_ID") ?? embeddedSecrets.partnero.programId;
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

function getElectroneekApiKey() {
  return getEnvValue("ELECTRONEEK_API_KEY") ?? embeddedSecrets.electroneek.apiKey;
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
  smsit: integration(Boolean(getSmsitApiKey() && getSmsitBaseUrl()), "sms"),
  insighto: integration(Boolean(getInsightoApiKey() || getInsightoWebhookUrl() || getInsightoAgentId()), "chat"),
  thoughtly: integration(Boolean(getThoughtlyApiKey() || getThoughtlyWebhookUrl() || getThoughtlyAgentId()), "voice"),
  trafft: integration(Boolean((getTrafftClientId() && getTrafftClientSecret() && getTrafftApiUrl()) || getTrafftBearerToken() || getTrafftBookingUrl() || getLunacalApiKey() || getLunacalBookingUrl()), "booking"),
  documentero: integration(Boolean(getDocumenteroApiKey() || getDocumenteroWebhookUrl() || getDocumenteroTemplateId()), "documents"),
  crove: integration(Boolean((getCroveApiKey() && getCroveBaseUrl()) || getCroveWebhookUrl() || getCroveTemplateId()), "documents"),
  thrivecart: integration(Boolean(getThrivecartApiKey() || getThrivecartWebhookSecret() || getThrivecartCheckoutUrl() || getThrivecartWebhookUrl()), "commerce"),
  upviral: integration(Boolean(process.env.UPVIRAL_API_KEY ?? embeddedSecrets.upviral.apiKey), "referral"),
  partnero: integration(Boolean(getPartneroApiKey() || getPartneroWebhookUrl() || getPartneroProgramId()), "referral"),
  activepieces: integration(Boolean(getActivepiecesWebhookUrl()), "fallbackAutomation"),
  electroneek: integration(Boolean(getElectroneekWebhookUrl() || getElectroneekApiKey()), "fallbackAutomation"),
};

function parseJson(text: string) {
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function getNestedRecord(value: unknown, key: string) {
  const record = asRecord(value);
  const nested = record?.[key];
  return asRecord(nested);
}

function getStringValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function getBooleanValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "boolean") {
      return value;
    }
  }
  return undefined;
}

async function request(url: string, init: RequestInit): Promise<HttpResult> {
  const response = await fetch(url, init);
  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    text,
    json: parseJson(text),
    contentType: response.headers.get("content-type"),
  };
}

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}) {
  return request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function postForm(url: string, fields: Record<string, string>, headers: Record<string, string> = {}) {
  return request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body: new URLSearchParams(fields).toString(),
  });
}

async function getJson(url: string, headers: Record<string, string> = {}) {
  return request(url, {
    method: "GET",
    headers,
  });
}

function dryRunResult(provider: string, detail: string, payload?: Record<string, unknown>): ProviderResult {
  return { ok: true, provider, mode: "dry-run", detail, payload };
}

function buildTrafftApiUrl(path: string) {
  const baseUrl = getTrafftApiUrl();
  if (!baseUrl) {
    return undefined;
  }

  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function getTrafftPublicOrigin(runtimeConfig?: TrafftRuntimeConfig) {
  const directBookingUrl = buildTrafftBookingUrl(undefined, runtimeConfig);
  if (directBookingUrl) {
    try {
      return new URL(directBookingUrl).origin;
    } catch {
      // Ignore invalid booking URLs and fall back to host transformation.
    }
  }

  const adminUrl = getTrafftApiUrl();
  if (!adminUrl) {
    return undefined;
  }

  try {
    const url = new URL(adminUrl);
    url.hostname = url.hostname.replace(".admin.", ".");
    return url.origin;
  } catch {
    return undefined;
  }
}

function buildTrafftPublicApiUrl(path: string, runtimeConfig?: TrafftRuntimeConfig) {
  const origin = getTrafftPublicOrigin(runtimeConfig);
  if (!origin) {
    return undefined;
  }

  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

function getTrafftAuthEndpoints() {
  return [
    buildTrafftApiUrl("/api/v1/auth/token"),
    buildTrafftApiUrl("/auth/token"),
  ].filter((value): value is string => Boolean(value));
}

function extractTrafftAccessToken(value: unknown) {
  const record = asRecord(value);
  const nestedData = asRecord(record?.data);
  return getStringValue(
    record?.access_token,
    record?.accessToken,
    record?.token,
    nestedData?.access_token,
    nestedData?.accessToken,
    nestedData?.token,
  );
}

function buildTrafftBasicAuthHeader(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

async function requestTrafftBearerToken() {
  const directToken = getTrafftBearerToken();
  if (directToken) {
    return {
      token: directToken,
      strategy: "env",
      endpoint: "TRAFFT_BEARER_TOKEN",
    };
  }

  if (trafftTokenCache && trafftTokenCache.expiresAt > Date.now()) {
    return {
      token: trafftTokenCache.token,
      strategy: "cache",
      endpoint: "cache",
    };
  }

  const clientId = getTrafftClientId();
  const clientSecret = getTrafftClientSecret();
  if (!clientId || !clientSecret) {
    return null;
  }

  const endpoints = getTrafftAuthEndpoints();
  for (const endpoint of endpoints) {
    const attempts = [
      async () => ({
        strategy: "oauth-json",
        response: await postJson(endpoint, {
          clientId,
          clientSecret,
          grantType: "client_credentials",
        }),
      }),
      async () => ({
        strategy: "oauth-json-snake",
        response: await postJson(endpoint, {
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "client_credentials",
        }),
      }),
      async () => ({
        strategy: "oauth-form",
        response: await postForm(endpoint, {
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "client_credentials",
        }),
      }),
      async () => ({
        strategy: "oauth-basic",
        response: await postForm(
          endpoint,
          { grant_type: "client_credentials" },
          { Authorization: buildTrafftBasicAuthHeader(clientId, clientSecret) },
        ),
      }),
    ];

    for (const attempt of attempts) {
      try {
        const { strategy, response } = await attempt();
        const token = extractTrafftAccessToken(response.json);
        if (!response.ok || !token) {
          continue;
        }

        const tokenTtlSeconds = Number(
          getStringValue(
            asRecord(response.json)?.expires_in,
            asRecord(response.json)?.expiresIn,
            asRecord(asRecord(response.json)?.data)?.expires_in,
            asRecord(asRecord(response.json)?.data)?.expiresIn,
          ) ?? "2700",
        );
        trafftTokenCache = {
          token,
          expiresAt: Date.now() + Math.max(300, tokenTtlSeconds) * 1000,
        };

        return {
          token,
          strategy,
          endpoint,
        };
      } catch {
        continue;
      }
    }
  }

  return null;
}

function buildTrafftBookingUrl(
  payload: Record<string, unknown> | undefined,
  runtimeConfig?: Awaited<ReturnType<typeof getOperationalRuntimeConfig>>["trafft"],
) {
  const directBookingUrl = getTrafftBookingUrl();
  if (directBookingUrl) {
    return directBookingUrl;
  }

  const metadata = getNestedRecord(payload, "metadata");
  return getStringValue(
    payload?.bookingUrl,
    payload?.publicBookingUrl,
    metadata?.bookingUrl,
    metadata?.publicBookingUrl,
    metadata?.bookingLink,
    runtimeConfig?.publicBookingUrl,
  );
}

function resolveTrafftServiceId(
  payload: Record<string, unknown>,
  runtimeConfig?: Awaited<ReturnType<typeof getOperationalRuntimeConfig>>["trafft"],
) {
  const metadata = getNestedRecord(payload, "metadata");
  const explicitId = getStringValue(
    payload.serviceId,
    payload.trafftServiceId,
    metadata?.serviceId,
    metadata?.trafftServiceId,
  );
  if (explicitId) {
    return explicitId;
  }

  const serviceName = getStringValue(payload.service, metadata?.service)?.toLowerCase();
  if (!serviceName) {
    return getTrafftDefaultServiceId() ?? runtimeConfig?.defaultServiceId;
  }

  const serviceMap = getTrafftServiceMap();
  return serviceMap[serviceName] ?? runtimeConfig?.serviceMap[serviceName] ?? getTrafftDefaultServiceId() ?? runtimeConfig?.defaultServiceId;
}

function buildTrafftCalendarWindow(payload: Record<string, unknown>) {
  const metadata = getNestedRecord(payload, "metadata");
  const desiredDate =
    getStringValue(payload.desiredDate, payload.selectedDate, metadata?.desiredDate, metadata?.selectedDate);
  const anchor = desiredDate ? new Date(`${desiredDate}T00:00:00`) : new Date();
  const safeAnchor = Number.isNaN(anchor.getTime()) ? new Date() : anchor;
  const start = new Date(Date.UTC(safeAnchor.getUTCFullYear(), safeAnchor.getUTCMonth(), 1));
  const end = new Date(Date.UTC(safeAnchor.getUTCFullYear(), safeAnchor.getUTCMonth() + 1, 15));

  return {
    calendarStartDate: start.toISOString().slice(0, 10),
    calendarEndDate: end.toISOString().slice(0, 10),
  };
}

function flattenTrafftAvailability(raw: unknown, desiredDate?: string) {
  const slots = asRecord(raw);
  if (!slots) {
    return [] as Array<Record<string, unknown>>;
  }

  const dates = Object.keys(slots).sort();
  const prioritizedDates = desiredDate && dates.includes(desiredDate)
    ? [desiredDate, ...dates.filter((date) => date !== desiredDate)]
    : dates;

  const availability: Array<Record<string, unknown>> = [];
  for (const date of prioritizedDates) {
    const timeslots = asRecord(slots[date]);
    if (!timeslots) {
      continue;
    }

    for (const time of Object.keys(timeslots).sort()) {
      availability.push({
        date,
        time,
        slot: timeslots[time],
      });
      if (availability.length >= 10) {
        return availability;
      }
    }
  }

  return availability;
}

function selectTrafftAvailabilitySlot(
  availability: Array<Record<string, unknown>>,
  desiredDate?: string,
  desiredTime?: string,
) {
  if (availability.length === 0) {
    return undefined;
  }

  if (desiredDate && desiredTime) {
    const exact = availability.find((slot) => slot.date === desiredDate && slot.time === desiredTime);
    if (exact) {
      return exact;
    }
  }

  if (desiredDate) {
    const sameDay = availability.find((slot) => slot.date === desiredDate);
    if (sameDay) {
      return sameDay;
    }
  }

  return availability[0];
}

function normalizePhoneNumber(value?: string) {
  if (!value) {
    return "";
  }

  return value.trim().replace(/\s+/g, " ");
}

function normalizePhoneDigits(value?: string) {
  const normalized = normalizePhoneNumber(value);
  if (!normalized) {
    return "";
  }

  return normalized.replace(/[^\d]/g, "");
}

function resolveTrafftPhoneCountryCode(payload: Record<string, unknown>, metadata?: Record<string, unknown>) {
  const explicit = getStringValue(
    payload.phoneCountryCode,
    metadata?.phoneCountryCode,
  );
  if (explicit) {
    return explicit.toUpperCase();
  }

  const phone = normalizePhoneNumber(getStringValue(payload.phone, metadata?.phone));
  if (phone.startsWith("+1")) {
    return "US";
  }
  if (phone.startsWith("+44")) {
    return "GB";
  }
  if (phone.startsWith("+61")) {
    return "AU";
  }
  if (phone.startsWith("+234")) {
    return "NG";
  }

  return "US";
}

function buildTrafftPublicBookingPayload(
  payload: Record<string, unknown>,
  selectedSlot: Record<string, unknown>,
  serviceId: string,
  desiredDate: string | undefined,
  desiredTime: string | undefined,
  runtimeConfig?: TrafftRuntimeConfig,
) {
  const metadata = getNestedRecord(payload, "metadata");
  const slotDate = getStringValue(selectedSlot.date, desiredDate);
  const slotTime = getStringValue(selectedSlot.time, desiredTime);
  const slotPayload = selectedSlot.slot;
  const locationId = getStringValue(payload.locationId, metadata?.locationId);
  const employeeId = getStringValue(payload.employeeId, metadata?.employeeId);
  const firstName = getStringValue(payload.firstName, metadata?.firstName) ?? "Lead";
  const lastName = getStringValue(payload.lastName, metadata?.lastName) ?? "Guest";
  const rawPhoneNumber = normalizePhoneNumber(getStringValue(payload.phone, metadata?.phone));
  const phoneNumber = rawPhoneNumber || "";
  const phoneDigits = normalizePhoneDigits(rawPhoneNumber);
  const language = getStringValue(
    payload.language,
    metadata?.language,
    payload.locale,
    metadata?.locale,
  ) ?? "en";

  return {
    additionalPersons: Math.max(
      0,
      Number(payload.additionalPersons ?? metadata?.additionalPersons ?? 0) || 0,
    ),
    authorizePaymentData: null,
    stripePaymentData: null,
    squarePaymentData: null,
    customFields: asRecord(payload.customFields) ?? {},
    customer: {
      appliedPromo: null,
      confirmPassword: "",
      promoCode: "",
      createAccount: false,
      email: getStringValue(payload.email, metadata?.email) ?? "",
      emailSubscription: false,
      firstName,
      language,
      lastName,
      newPassword: "",
      password: "",
      phoneCountryCode: phoneDigits ? resolveTrafftPhoneCountryCode(payload, metadata) : "",
      phoneNumber,
      phoneValid: Boolean(phoneDigits),
      rawPhoneNumber,
      status: "new",
    },
    employee: employeeId,
    externalPaymentId: null,
    extras: Array.isArray(payload.extras) ? payload.extras : [],
    location: locationId,
    payAppointmentInFull: false,
    paymentGateway: "onSite",
    recurringBookings: Array.isArray(payload.recurringBookings) ? payload.recurringBookings : [],
    selectedDate: slotDate,
    selectedSlot: slotPayload,
    selectedTime: slotTime,
    service: serviceId,
    serviceCategory: getStringValue(payload.serviceCategory, metadata?.serviceCategory),
    userTimezone: getStringValue(
      payload.userTimezone,
      metadata?.userTimezone,
      payload.timezone,
      metadata?.timezone,
    ) ?? "America/New_York",
    shareUuid: getStringValue(payload.shareUuid, metadata?.shareUuid) ?? "",
    paymentMethods: Array.isArray(payload.paymentMethods) ? payload.paymentMethods : [],
    isIframe: false,
    numberOfBookingsForPayment: 1,
    publicBookingOrigin: getTrafftPublicOrigin(runtimeConfig),
  };
}

function resolveDocumentType(payload: Record<string, unknown>) {
  const metadata = getNestedRecord(payload, "metadata");
  return getStringValue(
    payload.documentType,
    payload.type,
    metadata?.documentType,
    metadata?.type,
  ) ?? "proposal";
}

function resolveDocumentTemplateId(
  payload: Record<string, unknown>,
  documentType: string,
  runtimeConfig?: Awaited<ReturnType<typeof getOperationalRuntimeConfig>>["documentero"],
) {
  const metadata = getNestedRecord(payload, "metadata");
  const explicitId = getStringValue(
    payload.templateId,
    payload.documentTemplateId,
    metadata?.templateId,
    metadata?.documentTemplateId,
  );
  if (explicitId) {
    return explicitId;
  }

  switch (documentType) {
    case "agreement":
    case "service-agreement":
      return getDocumenteroAgreementTemplateId() ?? runtimeConfig?.agreementTemplateId ?? getDocumenteroTemplateId();
    case "onboarding":
    case "onboarding-pack":
      return getDocumenteroOnboardingTemplateId() ?? runtimeConfig?.onboardingTemplateId ?? getDocumenteroTemplateId();
    case "proposal":
    default:
      return getDocumenteroProposalTemplateId() ?? runtimeConfig?.proposalTemplateId ?? getDocumenteroTemplateId();
  }
}

function resolveCroveTemplateId(
  payload: Record<string, unknown>,
  documentType: string,
  runtimeConfig?: Awaited<ReturnType<typeof getOperationalRuntimeConfig>>["crove"],
) {
  const metadata = getNestedRecord(payload, "metadata");
  const explicitId = getStringValue(
    payload.croveTemplateId,
    metadata?.croveTemplateId,
  );
  if (explicitId) {
    return explicitId;
  }

  switch (documentType) {
    case "agreement":
    case "service-agreement":
      return getCroveAgreementTemplateId() ?? runtimeConfig?.agreementTemplateId ?? getCroveTemplateId();
    case "onboarding":
    case "onboarding-pack":
      return getCroveOnboardingTemplateId() ?? runtimeConfig?.onboardingTemplateId ?? getCroveTemplateId();
    case "proposal":
    default:
      return getCroveProposalTemplateId() ?? runtimeConfig?.proposalTemplateId ?? getCroveTemplateId();
  }
}

function buildDocumentData(payload: Record<string, unknown>) {
  const explicit = asRecord(payload.documentData) ?? asRecord(payload.data);
  if (explicit) {
    return explicit;
  }

  const trace = getNestedRecord(payload, "trace");
  const metadata = getNestedRecord(payload, "metadata");

  return {
    leadKey: getStringValue(payload.leadKey, trace?.leadKey),
    firstName: getStringValue(payload.firstName),
    lastName: getStringValue(payload.lastName),
    fullName: `${getStringValue(payload.firstName) ?? ""} ${getStringValue(payload.lastName) ?? ""}`.trim(),
    email: getStringValue(payload.email, metadata?.email),
    phone: getStringValue(payload.phone, metadata?.phone),
    company: getStringValue(payload.company, metadata?.company),
    service: getStringValue(payload.service, trace?.service),
    niche: getStringValue(payload.niche, trace?.niche),
    family: getStringValue(payload.family),
    stage: getStringValue(payload.stage),
    score: typeof payload.score === "number" ? payload.score : undefined,
    metadata,
  };
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
      email: providers.emailit.live,
      whatsapp: providers.wbiztool.live,
      sms: providers.easyTextMarketing.live || providers.smsit.live,
      chat: providers.insighto.live,
      voice: providers.thoughtly.live,
    },
  };
}

export async function syncLeadToCrm(payload: Record<string, unknown>) {
  const provider = integrationMap.suitedash;
  if (payload.dryRun || !provider.configured || !provider.live) {
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

  try {
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
  } catch (error) {
    return {
      ok: false,
      provider: "Emailit",
      mode: "live",
      detail: error instanceof Error && error.message
        ? `Email failed: ${error.message}`
        : "Email failed",
    } satisfies ProviderResult;
  }
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

export async function sendSmsFallbackAction(payload: { phone: string; body: string }) {
  const provider = integrationMap.smsit;
  if (!provider.configured || !provider.live) {
    return dryRunResult("SMS-IT", "SMS fallback prepared", { to: payload.phone });
  }

  return {
    ok: true,
    provider: "SMS-IT",
    mode: "prepared",
    detail: "SMS-IT credentials detected; direct endpoint mapping still needs account-specific send-route confirmation",
    payload: {
      ...payload,
      baseUrl: getSmsitBaseUrl(),
    },
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

  const webhookUrl = getN8nMappedWebhookUrl(eventName, payload) ?? getN8nWebhookUrl();
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
    detail: response.ok ? `Workflow emitted to ${webhookUrl}` : `Workflow failed: ${response.status}`,
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
  const provider = integrationMap.trafft;
  if (payload.dryRun || !provider.configured || !provider.live) {
    return dryRunResult("Trafft", "Booking request prepared", payload);
  }
  const runtimeConfig = await getOperationalRuntimeConfig();
  const trafftUrl = getTrafftApiUrl();
  const trafftPublicOrigin = getTrafftPublicOrigin(runtimeConfig.trafft);
  const bookingUrl = buildTrafftBookingUrl(payload, runtimeConfig.trafft);
  const authResolution = await requestTrafftBearerToken();
  const authToken = authResolution?.token;
  const metadata = getNestedRecord(payload, "metadata");
  const serviceId = resolveTrafftServiceId(payload, runtimeConfig.trafft);
  const employeeId = getStringValue(payload.employeeId, metadata?.employeeId);
  const locationId = getStringValue(payload.locationId, metadata?.locationId);
  const desiredDate = getStringValue(payload.desiredDate, payload.selectedDate, metadata?.desiredDate, metadata?.selectedDate);
  const desiredTime = getStringValue(payload.desiredTime, payload.selectedTime, metadata?.desiredTime, metadata?.selectedTime);
  let tenantData: Record<string, unknown> | undefined;

  if (trafftUrl) {
    const tenantDataResponse = await getJson(buildTrafftApiUrl("/api/v1/common/tenant-data") ?? "");
    if (tenantDataResponse.ok) {
      tenantData = asRecord(tenantDataResponse.json);
    }

    if (authToken && asRecord(payload.appointmentPayload)) {
      const appointmentResponse = await postJson(
        buildTrafftApiUrl("/api/v1/appointments") ?? "",
        payload.appointmentPayload,
        { Authorization: `Bearer ${authToken}` },
      );
      return {
        ok: appointmentResponse.ok,
        provider: "Trafft",
        mode: "live",
        detail: appointmentResponse.ok
          ? "Booking request submitted to Trafft"
          : `Trafft booking request failed: ${appointmentResponse.status}`,
        payload: {
          ...payload,
          tenantId: tenantData?.tenantId,
          bookingUrl,
          authStrategy: authResolution?.strategy,
          authEndpoint: authResolution?.endpoint,
          response: appointmentResponse.json ?? appointmentResponse.text,
        },
      } satisfies ProviderResult;
    }
  }

  if (serviceId && trafftPublicOrigin) {
    const { calendarStartDate, calendarEndDate } = buildTrafftCalendarWindow(payload);
    const params = new URLSearchParams({
      calendarStartDate,
      calendarEndDate,
      service: serviceId,
      strictDateRange: "false",
      showAllAvailableTimes: "false",
    });
    if (employeeId) {
      params.set("employee", employeeId);
    }
    if (locationId) {
      params.set("location", locationId);
    }
    if (desiredDate) {
      params.set("selectedDate", desiredDate);
    }
    if (desiredTime) {
      params.set("selectedTime", desiredTime);
    }

    const availabilityUrl = `${buildTrafftPublicApiUrl("/api/v1/public/booking/steps/date-time", runtimeConfig.trafft)}?${params.toString()}`;
    const availabilityResponse = await getJson(availabilityUrl);
    const availabilityPreview = flattenTrafftAvailability(availabilityResponse.json, desiredDate);
    const selectedSlot = selectTrafftAvailabilitySlot(availabilityPreview, desiredDate, desiredTime);

    if (availabilityResponse.ok && selectedSlot) {
      const bookingSubmitPayload = buildTrafftPublicBookingPayload(
        payload,
        selectedSlot,
        serviceId,
        desiredDate,
        desiredTime,
        runtimeConfig.trafft,
      );
      const bookingSubmitResponse = await postJson(
        buildTrafftPublicApiUrl("/api/v1/public/booking", runtimeConfig.trafft) ?? "",
        bookingSubmitPayload,
      );

      if (bookingSubmitResponse.ok) {
        return {
          ok: true,
          provider: "Trafft",
          mode: "live",
          detail: "Booking request submitted to Trafft public booking flow",
          payload: {
            ...payload,
            bookingUrl,
            publicBookingOrigin: trafftPublicOrigin,
            serviceId,
            employeeId,
            locationId,
            desiredDate,
            desiredTime,
            selectedSlot,
            availabilityPreview,
            bookingSubmitPayload,
            response: bookingSubmitResponse.json ?? bookingSubmitResponse.text,
          },
        } satisfies ProviderResult;
      }

      if (bookingUrl?.startsWith("http")) {
        return {
          ok: true,
          provider: "Trafft",
          mode: "live",
          detail: `Trafft public booking submit failed: ${bookingSubmitResponse.status}; booking handoff ready`,
          payload: {
            ...payload,
            bookingUrl,
            publicBookingOrigin: trafftPublicOrigin,
            serviceId,
            employeeId,
            locationId,
            desiredDate,
            desiredTime,
            selectedSlot,
            availabilityPreview,
            bookingSubmitPayload,
            response: bookingSubmitResponse.json ?? bookingSubmitResponse.text,
          },
        } satisfies ProviderResult;
      }

      return {
        ok: false,
        provider: "Trafft",
        mode: "live",
        detail: `Trafft public booking submit failed: ${bookingSubmitResponse.status}`,
        payload: {
          ...payload,
          publicBookingOrigin: trafftPublicOrigin,
          serviceId,
          employeeId,
          locationId,
          desiredDate,
          desiredTime,
          selectedSlot,
          availabilityPreview,
          bookingSubmitPayload,
          response: bookingSubmitResponse.json ?? bookingSubmitResponse.text,
        },
      } satisfies ProviderResult;
    }

    return {
      ok: (availabilityResponse.ok && availabilityPreview.length > 0) || Boolean(bookingUrl?.startsWith("http")),
      provider: "Trafft",
      mode: "live",
      detail: availabilityResponse.ok
        ? availabilityPreview.length > 0
          ? desiredTime
            ? `Trafft availability loaded${availabilityPreview.some((slot) => slot.date === desiredDate && slot.time === desiredTime) ? "; desired slot is present" : "; desired slot was not in the first availability window"}`
            : `Trafft availability loaded with ${availabilityPreview.length} candidate slots`
          : bookingUrl?.startsWith("http")
          ? "Trafft availability returned no public slots in the first window; booking handoff ready"
          : "Trafft availability loaded but no open slots were returned for the requested window"
        : bookingUrl?.startsWith("http")
        ? `Trafft availability lookup failed: ${availabilityResponse.status}; booking handoff ready`
        : `Trafft availability lookup failed: ${availabilityResponse.status}`,
      payload: {
        ...payload,
        publicBookingOrigin: trafftPublicOrigin,
        serviceId,
        employeeId,
        locationId,
        desiredDate,
        desiredTime,
        bookingUrl,
        authStrategy: authResolution?.strategy,
        authEndpoint: authResolution?.endpoint,
        availabilityPreview,
      },
    } satisfies ProviderResult;
  }

  if (tenantData) {
    if (bookingUrl?.startsWith("http")) {
      return {
        ok: true,
        provider: "Trafft",
        mode: "live",
        detail: "Trafft tenant verified; booking handoff ready",
        payload: {
          ...payload,
          tenantId: tenantData?.tenantId,
          tenantName: tenantData?.tenantName,
          bookingUrl,
          apiUrl: trafftUrl,
          publicBookingOrigin: trafftPublicOrigin,
          authStrategy: authResolution?.strategy,
          authEndpoint: authResolution?.endpoint,
          clientIdPresent: Boolean(getTrafftClientId()),
          clientSecretPresent: Boolean(getTrafftClientSecret()),
          authTokenPresent: Boolean(authToken),
          runtimeConfig,
        },
      } satisfies ProviderResult;
    }

    return {
      ok: true,
      provider: "Trafft",
      mode: "live",
      detail: "Trafft tenant verified; add a service id or service map to perform slot lookup or direct booking submission",
      payload: {
        ...payload,
        tenantId: tenantData?.tenantId,
        tenantName: tenantData?.tenantName,
        bookingUrl,
        apiUrl: trafftUrl,
        publicBookingOrigin: trafftPublicOrigin,
        clientIdPresent: Boolean(getTrafftClientId()),
        clientSecretPresent: Boolean(getTrafftClientSecret()),
        authTokenPresent: Boolean(authToken),
        authStrategy: authResolution?.strategy,
        authEndpoint: authResolution?.endpoint,
        runtimeConfig,
      },
    } satisfies ProviderResult;
  }

  const lunacalUrl = getLunacalBookingUrl();
  if (bookingUrl?.startsWith("http")) {
    return {
      ok: true,
      provider: "Trafft",
      mode: "live",
      detail: "Booking handoff URL resolved",
      payload: {
        ...payload,
        bookingUrl,
      },
    } satisfies ProviderResult;
  }
  if (lunacalUrl?.startsWith("http")) {
    return {
      ok: true,
      provider: "Lunacal",
      mode: "live",
      detail: "Booking destination resolved",
      payload: {
        ...payload,
        bookingUrl: lunacalUrl,
      },
    } satisfies ProviderResult;
  }
  return {
    ok: true,
    provider: "Trafft",
    mode: "prepared",
    detail: (getTrafftClientId() && getTrafftClientSecret()) || getTrafftBearerToken()
      ? "Trafft booking adapter is wired; add a public booking URL or service mapping to enable live slot lookup and handoff"
      : getLunacalApiKey()
      ? "Lunacal API key detected; add booking or webhook URL to activate runtime handoff"
      : "Booking adapter is wired and awaiting account-specific endpoint details",
    payload: {
      ...payload,
      trafftUrl,
      bookingUrl,
      lunacalUrl,
    },
  } satisfies ProviderResult;
}

export async function generateDocumentAction(payload: Record<string, unknown>) {
  const provider = integrationMap.documentero;
  const croveProvider = integrationMap.crove;
  if (payload.dryRun || ((!provider.configured || !provider.live) && (!croveProvider.configured || !croveProvider.live))) {
    return dryRunResult("Document Provider", "Document generation prepared", payload);
  }

  const runtimeConfig = await getOperationalRuntimeConfig();
  const documentType = resolveDocumentType(payload);
  const documentData = buildDocumentData(payload);
  const templateId = resolveDocumentTemplateId(payload, documentType, runtimeConfig.documentero);
  if (provider.configured && provider.live && getDocumenteroApiKey() && templateId) {
    const format = getStringValue(payload.documentFormat, payload.format) ?? runtimeConfig.documentero.defaultFormat ?? getDocumenteroDefaultFormat();
    const response = await postJson(
      "https://app.documentero.com/api",
      {
        document: templateId,
        data: documentData,
        format,
      },
      { Authorization: `apiKey ${getDocumenteroApiKey()}` },
    );
    return {
      ok: response.ok,
      provider: "Documentero",
      mode: "live",
      detail: response.ok ? `Documentero generated ${documentType}` : `Documentero request failed: ${response.status}`,
      payload: {
        ...payload,
        documentType,
        templateId,
        format,
        response: response.json ?? response.text,
      },
    } satisfies ProviderResult;
  }

  const documenteroWebhookUrl = getDocumenteroWebhookUrl();
  if (provider.configured && provider.live && documenteroWebhookUrl) {
    const response = await postJson(documenteroWebhookUrl, {
      templateId,
      documentType,
      payload: {
        ...payload,
        documentData,
      },
    }, getDocumenteroApiKey() ? { Authorization: `apiKey ${getDocumenteroApiKey()}` } : {});
    return {
      ok: response.ok,
      provider: "Documentero",
      mode: "live",
      detail: response.ok ? `Documentero webhook accepted ${documentType}` : `Documentero webhook failed: ${response.status}`,
      payload: {
        ...payload,
        documentType,
        templateId,
      },
    } satisfies ProviderResult;
  }

  const croveTemplateId = resolveCroveTemplateId(payload, documentType, runtimeConfig.crove);
  const croveWebhookUrl = getCroveWebhookUrl() ?? runtimeConfig.crove.webhookUrl;
  if (croveProvider.configured && croveProvider.live && croveWebhookUrl) {
    const response = await postJson(croveWebhookUrl, {
      templateId: croveTemplateId,
      documentType,
      payload: {
        ...payload,
        documentData,
      },
    }, getCroveApiKey() ? { Authorization: `Bearer ${getCroveApiKey()}` } : {});
    return {
      ok: response.ok,
      provider: "Crove",
      mode: "live",
      detail: response.ok ? `Crove webhook accepted ${documentType}` : `Crove webhook failed: ${response.status}`,
      payload: {
        ...payload,
        documentType,
        templateId: croveTemplateId,
      },
    } satisfies ProviderResult;
  }

  if (provider.configured && provider.live) {
    return {
      ok: true,
      provider: "Documentero",
      mode: "prepared",
      detail: templateId
        ? "Documentero template detected; direct execution is available, but the request still needs live template-specific payload mapping or webhook flow"
        : "Documentero API key is present; add a template id to generate real documents from the runtime",
      payload: {
        ...payload,
        documentType,
        templateId,
        documentData,
      },
    } satisfies ProviderResult;
  }

  return {
    ok: true,
    provider: "Crove",
    mode: "prepared",
    detail: croveTemplateId
      ? "Crove template detected; add webhook URL to render documents from the runtime"
      : "Crove adapter is wired and awaiting account-specific endpoint details",
    payload: {
      ...payload,
      documentType,
      templateId: croveTemplateId,
      documentData,
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
      : getThrivecartApiKey()
      ? "ThriveCart API key detected; add checkout or webhook URL to activate runtime commerce handoff"
      : "ThriveCart adapter is wired and awaiting account-specific endpoint details",
    payload: {
      ...payload,
      apiKeyPresent: Boolean(getThrivecartApiKey()),
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
  const webhookUrl = getElectroneekWebhookUrl();
  if (!webhookUrl) {
    return {
      ok: true,
      provider: "ElectroNeek",
      mode: "prepared",
      detail: "ElectroNeek API key detected; add webhook URL to activate runtime fallback emission",
      payload,
    } satisfies ProviderResult;
  }
  const response = await postJson(webhookUrl, payload, getElectroneekApiKey() ? { Authorization: `Bearer ${getElectroneekApiKey()}` } : {});
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
