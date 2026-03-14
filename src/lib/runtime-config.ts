import {
  getRuntimeConfig,
  upsertRuntimeConfig,
  type RuntimeConfigRecord,
} from "./runtime-store.ts";

export type OperationalRuntimeConfig = {
  trafft: {
    publicBookingUrl?: string;
    defaultServiceId?: string;
    serviceMap: Record<string, string>;
  };
  documentero: {
    defaultFormat?: string;
    proposalTemplateId?: string;
    agreementTemplateId?: string;
    onboardingTemplateId?: string;
  };
  crove: {
    webhookUrl?: string;
    proposalTemplateId?: string;
    agreementTemplateId?: string;
    onboardingTemplateId?: string;
  };
};

type RuntimeConfigSectionKey = keyof OperationalRuntimeConfig;

const DEFAULT_CONFIG: OperationalRuntimeConfig = {
  trafft: {
    serviceMap: {},
  },
  documentero: {},
  crove: {},
};

const RECORD_KEYS: Record<RuntimeConfigSectionKey, string> = {
  trafft: "provider.trafft",
  documentero: "provider.documentero",
  crove: "provider.crove",
};

function getStringValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function getRecordValue(record: RuntimeConfigRecord | undefined) {
  return record?.value && typeof record.value === "object"
    ? record.value as Record<string, unknown>
    : {};
}

function sanitizeMap(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, string>;
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, entry]) => {
    if (typeof entry === "string" && entry.trim().length > 0) {
      acc[key.trim().toLowerCase()] = entry.trim();
    }
    return acc;
  }, {});
}

function sanitizeTrafftSection(value: Partial<OperationalRuntimeConfig["trafft"]> | undefined) {
  if (!value) {
    return DEFAULT_CONFIG.trafft;
  }

  return {
    publicBookingUrl: getStringValue(value.publicBookingUrl),
    defaultServiceId: getStringValue(value.defaultServiceId),
    serviceMap: sanitizeMap(value.serviceMap),
  } satisfies OperationalRuntimeConfig["trafft"];
}

function sanitizeDocumenteroSection(value: Partial<OperationalRuntimeConfig["documentero"]> | undefined) {
  if (!value) {
    return DEFAULT_CONFIG.documentero;
  }

  return {
    defaultFormat: getStringValue(value.defaultFormat),
    proposalTemplateId: getStringValue(value.proposalTemplateId),
    agreementTemplateId: getStringValue(value.agreementTemplateId),
    onboardingTemplateId: getStringValue(value.onboardingTemplateId),
  } satisfies OperationalRuntimeConfig["documentero"];
}

function sanitizeCroveSection(value: Partial<OperationalRuntimeConfig["crove"]> | undefined) {
  if (!value) {
    return DEFAULT_CONFIG.crove;
  }

  return {
    webhookUrl: getStringValue(value.webhookUrl),
    proposalTemplateId: getStringValue(value.proposalTemplateId),
    agreementTemplateId: getStringValue(value.agreementTemplateId),
    onboardingTemplateId: getStringValue(value.onboardingTemplateId),
  } satisfies OperationalRuntimeConfig["crove"];
}

export async function getOperationalRuntimeConfig(): Promise<OperationalRuntimeConfig> {
  const [trafft, documentero, crove] = await Promise.all([
    getRuntimeConfig(RECORD_KEYS.trafft),
    getRuntimeConfig(RECORD_KEYS.documentero),
    getRuntimeConfig(RECORD_KEYS.crove),
  ]);

  return {
    trafft: sanitizeTrafftSection(getRecordValue(trafft) as OperationalRuntimeConfig["trafft"]),
    documentero: sanitizeDocumenteroSection(getRecordValue(documentero) as OperationalRuntimeConfig["documentero"]),
    crove: sanitizeCroveSection(getRecordValue(crove) as OperationalRuntimeConfig["crove"]),
  };
}

export async function updateOperationalRuntimeConfig(
  config: Partial<OperationalRuntimeConfig>,
  updatedBy?: string,
) {
  const current = await getOperationalRuntimeConfig();
  const next: OperationalRuntimeConfig = {
    trafft: sanitizeTrafftSection({ ...current.trafft, ...config.trafft }),
    documentero: sanitizeDocumenteroSection({ ...current.documentero, ...config.documentero }),
    crove: sanitizeCroveSection({ ...current.crove, ...config.crove }),
  };

  await Promise.all([
    upsertRuntimeConfig({
      key: RECORD_KEYS.trafft,
      value: next.trafft,
      updatedBy,
    }),
    upsertRuntimeConfig({
      key: RECORD_KEYS.documentero,
      value: next.documentero,
      updatedBy,
    }),
    upsertRuntimeConfig({
      key: RECORD_KEYS.crove,
      value: next.crove,
      updatedBy,
    }),
  ]);

  return next;
}

export function buildRuntimeConfigSummary(config: OperationalRuntimeConfig) {
  return {
    trafft: {
      hasPublicBookingUrl: Boolean(config.trafft.publicBookingUrl),
      hasDefaultServiceId: Boolean(config.trafft.defaultServiceId),
      mappedServices: Object.keys(config.trafft.serviceMap).length,
    },
    documentero: {
      hasProposalTemplate: Boolean(config.documentero.proposalTemplateId),
      hasAgreementTemplate: Boolean(config.documentero.agreementTemplateId),
      hasOnboardingTemplate: Boolean(config.documentero.onboardingTemplateId),
      defaultFormat: config.documentero.defaultFormat ?? "pdf",
    },
    crove: {
      hasWebhookUrl: Boolean(config.crove.webhookUrl),
      hasProposalTemplate: Boolean(config.crove.proposalTemplateId),
      hasAgreementTemplate: Boolean(config.crove.agreementTemplateId),
      hasOnboardingTemplate: Boolean(config.crove.onboardingTemplateId),
    },
  };
}
