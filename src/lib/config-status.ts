import { embeddedSecrets } from "./embedded-secrets.ts";

export type ConfigSource = "env" | "embedded" | "mixed" | "missing";

type ProviderConfigDescriptor = {
  key: string;
  label: string;
  notes?: string;
  envKeys: string[];
  embedded: boolean;
};

export type ProviderConfigStatus = {
  key: string;
  label: string;
  source: ConfigSource;
  envKeysPresent: string[];
  missingEnvKeys: string[];
  usesEmbeddedFallback: boolean;
  notes?: string;
};

const PROVIDER_CONFIGS: ProviderConfigDescriptor[] = [
  { key: "suitedash", label: "SuiteDash", envKeys: ["SUITEDASH_PUBLIC_ID", "SUITEDASH_SECRET_KEY"], embedded: Boolean(embeddedSecrets.suitedash.publicId && embeddedSecrets.suitedash.secretKey) },
  { key: "aitable", label: "AITable", envKeys: ["AITABLE_API_TOKEN", "AITABLE_DATASHEET_ID"], embedded: Boolean(embeddedSecrets.aitable.apiToken && embeddedSecrets.aitable.datasheetId) },
  { key: "agenticflow", label: "AgenticFlow", envKeys: ["AGENTICFLOW_API_KEY"], embedded: Boolean(embeddedSecrets.agenticflow.apiKey) },
  { key: "n8n", label: "n8n", envKeys: ["N8N_WEBHOOK_URL", "N8N_API_KEY", "N8N_BASE_URL", "N8N_MCP_URL", "N8N_MCP_ACCESS_TOKEN"], embedded: Boolean(embeddedSecrets.n8n.apiBaseUrl || embeddedSecrets.n8n.apiKey || embeddedSecrets.n8n.mcpUrl || embeddedSecrets.n8n.mcpAccessToken) },
  { key: "boost", label: "Boost.space", envKeys: ["BOOST_SPACE_API_KEY", "BOOST_SPACE_MAKE_TOKEN"], embedded: Boolean(embeddedSecrets.boost.apiKey || embeddedSecrets.boost.makeApiToken) },
  { key: "emailit", label: "Emailit", envKeys: ["EMAILIT_API_KEY"], embedded: Boolean(embeddedSecrets.emailit.apiKey) },
  { key: "wbiztool", label: "WbizTool", envKeys: ["WBIZTOOL_API_KEY", "WBIZTOOL_INSTANCE_ID"], embedded: Boolean(embeddedSecrets.wbiztool.apiKey && embeddedSecrets.wbiztool.instanceId) },
  { key: "easyTextMarketing", label: "Easy Text Marketing", envKeys: ["EASY_TEXT_MARKETING_API_KEY", "EASY_TEXT_MARKETING_WEBHOOK_URL"], embedded: Boolean(embeddedSecrets.easyTextMarketing.apiKey) },
  { key: "smsit", label: "SMS-IT", envKeys: ["SMSIT_API_KEY", "SMSIT_BASE_URL"], embedded: Boolean(embeddedSecrets.smsit.apiKey && embeddedSecrets.smsit.baseUrl) },
  { key: "insighto", label: "Insighto.ai", envKeys: ["INSIGHTO_API_KEY", "INSIGHTO_WEBHOOK_URL", "INSIGHTO_AGENT_ID"], embedded: Boolean(embeddedSecrets.insighto.apiKey) },
  { key: "thoughtly", label: "Thoughtly", envKeys: ["THOUGHTLY_API_KEY", "THOUGHTLY_WEBHOOK_URL", "THOUGHTLY_AGENT_ID"], embedded: Boolean(embeddedSecrets.thoughtly.apiKey) },
  { key: "trafft", label: "Trafft", envKeys: ["TRAFFT_API_URL", "TRAFFT_CLIENT_ID", "TRAFFT_CLIENT_SECRET", "TRAFFT_BEARER_TOKEN", "TRAFFT_DEFAULT_SERVICE_ID", "TRAFFT_SERVICE_MAP"], embedded: Boolean(embeddedSecrets.trafft.apiUrl && embeddedSecrets.trafft.clientId && embeddedSecrets.trafft.clientSecret), notes: "A bearer token or a full public-booking handoff config is still needed for fully automatic booking creation." },
  { key: "documentero", label: "Documentero", envKeys: ["DOCUMENTERO_API_KEY", "DOCUMENTERO_TEMPLATE_PROPOSAL_ID", "DOCUMENTERO_TEMPLATE_AGREEMENT_ID", "DOCUMENTERO_TEMPLATE_ONBOARDING_ID"], embedded: Boolean(embeddedSecrets.documentero.apiKey), notes: "Template IDs are still needed to turn prepared document jobs into generated production documents." },
  { key: "crove", label: "Crove", envKeys: ["CROVE_API_KEY", "CROVE_BASE_URL", "CROVE_TEMPLATE_PROPOSAL_ID", "CROVE_TEMPLATE_AGREEMENT_ID", "CROVE_TEMPLATE_ONBOARDING_ID"], embedded: Boolean(embeddedSecrets.crove.apiKey && embeddedSecrets.crove.baseUrl) },
  { key: "thrivecart", label: "ThriveCart", envKeys: ["THRIVECART_API_KEY", "THRIVECART_CHECKOUT_URL", "THRIVECART_WEBHOOK_URL"], embedded: Boolean(embeddedSecrets.thrivecart.apiKey) },
  { key: "upviral", label: "UpViral", envKeys: ["UPVIRAL_API_KEY"], embedded: Boolean(embeddedSecrets.upviral.apiKey) },
  { key: "partnero", label: "Partnero", envKeys: ["PARTNERO_API_KEY", "PARTNERO_PROGRAM_ID", "PARTNERO_ASSETS_HOST"], embedded: Boolean(embeddedSecrets.partnero.programId) },
  { key: "electroneek", label: "ElectroNeek", envKeys: ["ELECTRONEEK_API_KEY", "ELECTRONEEK_WEBHOOK_URL"], embedded: Boolean(embeddedSecrets.electroneek.apiKey) },
  { key: "auth", label: "Operator auth", envKeys: ["LEAD_OS_AUTH_SECRET", "LEAD_OS_OPERATOR_EMAILS"], embedded: Boolean(embeddedSecrets.cron.secret), notes: "The operator auth secret still falls back to an embedded value if env is absent." },
];

function getPresentEnvKeys(keys: string[]) {
  return keys.filter((key) => {
    const value = process.env[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

function resolveSource(envKeysPresent: string[], embedded: boolean): ConfigSource {
  if (envKeysPresent.length > 0 && embedded) {
    return "mixed";
  }
  if (envKeysPresent.length > 0) {
    return "env";
  }
  if (embedded) {
    return "embedded";
  }
  return "missing";
}

export function getProviderConfigStatuses(): ProviderConfigStatus[] {
  return PROVIDER_CONFIGS.map((descriptor) => {
    const envKeysPresent = getPresentEnvKeys(descriptor.envKeys);
    const source = resolveSource(envKeysPresent, descriptor.embedded);
    return {
      key: descriptor.key,
      label: descriptor.label,
      source,
      envKeysPresent,
      missingEnvKeys: descriptor.envKeys.filter((key) => !envKeysPresent.includes(key)),
      usesEmbeddedFallback: source === "embedded" || source === "mixed",
      notes: descriptor.notes,
    };
  });
}

export function getConfigStatusSummary() {
  const providers = getProviderConfigStatuses();
  return {
    envOnlyReady: providers.every((provider) => provider.source === "env" || provider.source === "missing"),
    embeddedFallbacks: providers.filter((provider) => provider.usesEmbeddedFallback).map((provider) => provider.key),
    missingEnvBackedProviders: providers
      .filter((provider) => provider.source !== "env")
      .map((provider) => ({
        key: provider.key,
        label: provider.label,
        missingEnvKeys: provider.missingEnvKeys,
      })),
    providers,
  };
}
