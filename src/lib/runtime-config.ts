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
  dispatch: {
    providers: Array<{
      id: string;
      label: string;
      active: boolean;
      priorityWeight: number;
      maxConcurrentJobs?: number;
      activeJobs?: number;
      acceptsEmergency: boolean;
      acceptsCommercial: boolean;
      propertyTypes: string[];
      issueTypes: string[];
      states: string[];
      counties: string[];
      cities: string[];
      zipPrefixes: string[];
      emergencyCoverageWindow?: string;
    }>;
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
  dispatch: {
    providers: [],
  },
  documentero: {},
  crove: {},
};

const RECORD_KEYS: Record<RuntimeConfigSectionKey, string> = {
  trafft: "provider.trafft",
  dispatch: "provider.dispatch",
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

function sanitizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return [...new Set(value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean)
    .map((entry) => entry.toLowerCase()))];
}

function sanitizeDispatchProviders(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as OperationalRuntimeConfig["dispatch"]["providers"];
  }

  return value
    .map((entry) => entry && typeof entry === "object" ? entry as Record<string, unknown> : null)
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => ({
      id: getStringValue(entry.id) ?? crypto.randomUUID(),
      label: getStringValue(entry.label) ?? "Unnamed provider",
      active: entry.active !== false,
      priorityWeight: typeof entry.priorityWeight === "number" && Number.isFinite(entry.priorityWeight)
        ? Math.max(0, Math.min(100, entry.priorityWeight))
        : 50,
      maxConcurrentJobs: typeof entry.maxConcurrentJobs === "number" && Number.isFinite(entry.maxConcurrentJobs)
        ? Math.max(0, entry.maxConcurrentJobs)
        : undefined,
      activeJobs: typeof entry.activeJobs === "number" && Number.isFinite(entry.activeJobs)
        ? Math.max(0, entry.activeJobs)
        : undefined,
      acceptsEmergency: entry.acceptsEmergency !== false,
      acceptsCommercial: entry.acceptsCommercial === true,
      propertyTypes: sanitizeStringArray(entry.propertyTypes),
      issueTypes: sanitizeStringArray(entry.issueTypes),
      states: sanitizeStringArray(entry.states),
      counties: sanitizeStringArray(entry.counties),
      cities: sanitizeStringArray(entry.cities),
      zipPrefixes: sanitizeStringArray(entry.zipPrefixes),
      emergencyCoverageWindow: getStringValue(entry.emergencyCoverageWindow),
    }))
    .sort((left, right) => right.priorityWeight - left.priorityWeight);
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

function sanitizeDispatchSection(value: Partial<OperationalRuntimeConfig["dispatch"]> | undefined) {
  if (!value) {
    return DEFAULT_CONFIG.dispatch;
  }

  return {
    providers: sanitizeDispatchProviders(value.providers),
  } satisfies OperationalRuntimeConfig["dispatch"];
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
  const [trafft, dispatch, documentero, crove] = await Promise.all([
    getRuntimeConfig(RECORD_KEYS.trafft),
    getRuntimeConfig(RECORD_KEYS.dispatch),
    getRuntimeConfig(RECORD_KEYS.documentero),
    getRuntimeConfig(RECORD_KEYS.crove),
  ]);

  return {
    trafft: sanitizeTrafftSection(getRecordValue(trafft) as OperationalRuntimeConfig["trafft"]),
    dispatch: sanitizeDispatchSection(getRecordValue(dispatch) as OperationalRuntimeConfig["dispatch"]),
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
    dispatch: sanitizeDispatchSection({ ...current.dispatch, ...config.dispatch }),
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
      key: RECORD_KEYS.dispatch,
      value: next.dispatch,
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
    dispatch: {
      providerCount: config.dispatch.providers.length,
      activeProviders: config.dispatch.providers.filter((provider) => provider.active).length,
      emergencyReadyProviders: config.dispatch.providers.filter((provider) => provider.active && provider.acceptsEmergency).length,
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
