import {
  getRuntimeConfig,
  upsertRuntimeConfig,
  type RuntimeConfigRecord,
} from "./runtime-store.ts";

export type OperationalRuntimeConfig = {
  observability: {
    notifications: {
      defaultChannel: "email" | "sms" | "whatsapp";
      cooldownMinutes: number;
      recipients: Array<{
        id: string;
        label: string;
        active: boolean;
        email?: string;
        phone?: string;
        channels: Array<"email" | "sms" | "whatsapp">;
        ruleIds: string[];
      }>;
    };
  };
  trafft: {
    publicBookingUrl?: string;
    defaultServiceId?: string;
    serviceMap: Record<string, string>;
  };
  dispatch: {
    providers: Array<{
      id: string;
      label: string;
      contactEmail?: string;
      phone?: string;
      active: boolean;
      acceptingNewJobs: boolean;
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
      payoutModel?: "flat-fee" | "revenue-share";
      payoutFlatFee?: number;
      payoutSharePercent?: number;
      payoutNotes?: string;
      lastSelfUpdatedAt?: string;
    }>;
  };
  marketplace: {
    defaultLeadAcquisitionCost?: number;
    zipLeadAcquisitionCosts: Record<string, number>;
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
  observability: {
    notifications: {
      defaultChannel: "email",
      cooldownMinutes: 30,
      recipients: [],
    },
  },
  trafft: {
    serviceMap: {},
  },
  dispatch: {
    providers: [],
  },
  marketplace: {
    zipLeadAcquisitionCosts: {},
  },
  documentero: {},
  crove: {},
};

const RECORD_KEYS: Record<RuntimeConfigSectionKey, string> = {
  observability: "runtime.observability",
  trafft: "provider.trafft",
  dispatch: "provider.dispatch",
  marketplace: "provider.marketplace",
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

function sanitizeNumberMap(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, number>;
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>((acc, [key, entry]) => {
    const normalizedKey = key.trim().toLowerCase();
    if (!normalizedKey) {
      return acc;
    }
    const parsed = typeof entry === "number" ? entry : typeof entry === "string" ? Number(entry.trim()) : NaN;
    if (Number.isFinite(parsed) && parsed >= 0) {
      acc[normalizedKey] = Number(parsed);
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

function sanitizeObservabilityChannels(value: unknown) {
  const allowed = new Set(["email", "sms", "whatsapp"]);
  return sanitizeStringArray(value).filter((entry): entry is "email" | "sms" | "whatsapp" => allowed.has(entry));
}

function sanitizeObservabilityRecipients(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as OperationalRuntimeConfig["observability"]["notifications"]["recipients"];
  }

  return value
    .map((entry) => entry && typeof entry === "object" ? entry as Record<string, unknown> : null)
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry): OperationalRuntimeConfig["observability"]["notifications"]["recipients"][number] => {
      const email = getStringValue(entry.email)?.toLowerCase();
      const phone = getStringValue(entry.phone);
      const channels = sanitizeObservabilityChannels(entry.channels);
      const inferredChannels = channels.length > 0
        ? channels
        : [
            ...(email ? ["email" as const] : []),
            ...(phone ? ["sms" as const] : []),
          ];

      return {
        id: getStringValue(entry.id) ?? crypto.randomUUID(),
        label: getStringValue(entry.label) ?? "Unnamed recipient",
        active: entry.active !== false,
        email,
        phone,
        channels: [...new Set(inferredChannels)],
        ruleIds: sanitizeStringArray(entry.ruleIds),
      };
    });
}

function sanitizeObservabilitySection(value: Partial<OperationalRuntimeConfig["observability"]> | undefined) {
  if (!value) {
    return DEFAULT_CONFIG.observability;
  }

  const notifications = (value.notifications ?? {}) as Partial<OperationalRuntimeConfig["observability"]["notifications"]>;
  const defaultChannel = notifications.defaultChannel === "sms" || notifications.defaultChannel === "whatsapp"
    ? notifications.defaultChannel
    : "email";
  const cooldownMinutes = typeof notifications.cooldownMinutes === "number" && Number.isFinite(notifications.cooldownMinutes)
    ? Math.max(0, Math.min(1440, notifications.cooldownMinutes))
    : DEFAULT_CONFIG.observability.notifications.cooldownMinutes;

  return {
    notifications: {
      defaultChannel,
      cooldownMinutes,
      recipients: sanitizeObservabilityRecipients(notifications.recipients),
    },
  } satisfies OperationalRuntimeConfig["observability"];
}

function sanitizeDispatchProviders(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as OperationalRuntimeConfig["dispatch"]["providers"];
  }

  return value
    .map((entry) => entry && typeof entry === "object" ? entry as Record<string, unknown> : null)
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry): OperationalRuntimeConfig["dispatch"]["providers"][number] => {
      const payoutModel: "flat-fee" | "revenue-share" = entry.payoutModel === "revenue-share"
        ? "revenue-share"
        : "flat-fee";

      return {
        id: getStringValue(entry.id) ?? crypto.randomUUID(),
        label: getStringValue(entry.label) ?? "Unnamed provider",
        contactEmail: getStringValue(entry.contactEmail)?.toLowerCase(),
        phone: getStringValue(entry.phone),
        active: entry.active !== false,
        acceptingNewJobs: entry.acceptingNewJobs !== false,
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
        payoutModel,
        payoutFlatFee: typeof entry.payoutFlatFee === "number" && Number.isFinite(entry.payoutFlatFee)
          ? Math.max(0, entry.payoutFlatFee)
          : undefined,
        payoutSharePercent: typeof entry.payoutSharePercent === "number" && Number.isFinite(entry.payoutSharePercent)
          ? Math.max(0, Math.min(100, entry.payoutSharePercent))
          : undefined,
        payoutNotes: getStringValue(entry.payoutNotes),
        lastSelfUpdatedAt: getStringValue(entry.lastSelfUpdatedAt),
      };
    })
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

function sanitizeMarketplaceSection(value: Partial<OperationalRuntimeConfig["marketplace"]> | undefined) {
  if (!value) {
    return DEFAULT_CONFIG.marketplace;
  }

  const defaultLeadAcquisitionCost =
    typeof value.defaultLeadAcquisitionCost === "number" && Number.isFinite(value.defaultLeadAcquisitionCost)
      ? Math.max(0, value.defaultLeadAcquisitionCost)
      : undefined;

  return {
    defaultLeadAcquisitionCost,
    zipLeadAcquisitionCosts: sanitizeNumberMap(value.zipLeadAcquisitionCosts),
  } satisfies OperationalRuntimeConfig["marketplace"];
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
  const [observability, trafft, dispatch, marketplace, documentero, crove] = await Promise.all([
    getRuntimeConfig(RECORD_KEYS.observability),
    getRuntimeConfig(RECORD_KEYS.trafft),
    getRuntimeConfig(RECORD_KEYS.dispatch),
    getRuntimeConfig(RECORD_KEYS.marketplace),
    getRuntimeConfig(RECORD_KEYS.documentero),
    getRuntimeConfig(RECORD_KEYS.crove),
  ]);

  return {
    observability: sanitizeObservabilitySection(getRecordValue(observability) as OperationalRuntimeConfig["observability"]),
    trafft: sanitizeTrafftSection(getRecordValue(trafft) as OperationalRuntimeConfig["trafft"]),
    dispatch: sanitizeDispatchSection(getRecordValue(dispatch) as OperationalRuntimeConfig["dispatch"]),
    marketplace: sanitizeMarketplaceSection(getRecordValue(marketplace) as OperationalRuntimeConfig["marketplace"]),
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
    observability: sanitizeObservabilitySection({
      notifications: {
        ...current.observability.notifications,
        ...config.observability?.notifications,
      },
    }),
    trafft: sanitizeTrafftSection({ ...current.trafft, ...config.trafft }),
    dispatch: sanitizeDispatchSection({ ...current.dispatch, ...config.dispatch }),
    marketplace: sanitizeMarketplaceSection({ ...current.marketplace, ...config.marketplace }),
    documentero: sanitizeDocumenteroSection({ ...current.documentero, ...config.documentero }),
    crove: sanitizeCroveSection({ ...current.crove, ...config.crove }),
  };

  await Promise.all([
    upsertRuntimeConfig({
      key: RECORD_KEYS.observability,
      value: next.observability,
      updatedBy,
    }),
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
      key: RECORD_KEYS.marketplace,
      value: next.marketplace,
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
    observability: {
      defaultChannel: config.observability.notifications.defaultChannel,
      cooldownMinutes: config.observability.notifications.cooldownMinutes,
      activeRecipients: config.observability.notifications.recipients.filter((recipient) => recipient.active).length,
      smsRecipients: config.observability.notifications.recipients.filter((recipient) =>
        recipient.active && recipient.channels.includes("sms") && Boolean(recipient.phone)
      ).length,
      whatsappRecipients: config.observability.notifications.recipients.filter((recipient) =>
        recipient.active && recipient.channels.includes("whatsapp") && Boolean(recipient.phone)
      ).length,
      emailRecipients: config.observability.notifications.recipients.filter((recipient) =>
        recipient.active && recipient.channels.includes("email") && Boolean(recipient.email)
      ).length,
    },
    trafft: {
      hasPublicBookingUrl: Boolean(config.trafft.publicBookingUrl),
      hasDefaultServiceId: Boolean(config.trafft.defaultServiceId),
      mappedServices: Object.keys(config.trafft.serviceMap).length,
    },
    dispatch: {
      providerCount: config.dispatch.providers.length,
      activeProviders: config.dispatch.providers.filter((provider) => provider.active).length,
      emergencyReadyProviders: config.dispatch.providers.filter((provider) => provider.active && provider.acceptsEmergency).length,
      selfServeEnabledProviders: config.dispatch.providers.filter((provider) => Boolean(provider.contactEmail)).length,
      payoutConfiguredProviders: config.dispatch.providers.filter((provider) =>
        (provider.payoutModel === "revenue-share" && typeof provider.payoutSharePercent === "number") ||
        (provider.payoutModel !== "revenue-share" && typeof provider.payoutFlatFee === "number")
      ).length,
    },
    marketplace: {
      defaultLeadAcquisitionCost: config.marketplace.defaultLeadAcquisitionCost ?? 0,
      zipCostOverrides: Object.keys(config.marketplace.zipLeadAcquisitionCosts).length,
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

export async function getDispatchProviderById(providerId: string) {
  const config = await getOperationalRuntimeConfig();
  return config.dispatch.providers.find((provider) => provider.id === providerId);
}

export async function getDispatchProviderByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const config = await getOperationalRuntimeConfig();
  return config.dispatch.providers.find((provider) => provider.contactEmail === normalized);
}

export async function updateDispatchProviderSelfServe(
  providerId: string,
  updates: Partial<OperationalRuntimeConfig["dispatch"]["providers"][number]>,
  updatedBy?: string,
) {
  const config = await getOperationalRuntimeConfig();
  const providers = config.dispatch.providers.map((provider) =>
    provider.id === providerId
      ? {
          ...provider,
          ...updates,
          id: provider.id,
          label: updates.label?.trim() || provider.label,
          contactEmail: updates.contactEmail?.trim().toLowerCase() || provider.contactEmail,
          phone: updates.phone?.trim() || provider.phone,
          propertyTypes: updates.propertyTypes ?? provider.propertyTypes,
          issueTypes: updates.issueTypes ?? provider.issueTypes,
          states: updates.states ?? provider.states,
          counties: updates.counties ?? provider.counties,
          cities: updates.cities ?? provider.cities,
          zipPrefixes: updates.zipPrefixes ?? provider.zipPrefixes,
          emergencyCoverageWindow: updates.emergencyCoverageWindow?.trim() || provider.emergencyCoverageWindow,
          lastSelfUpdatedAt: new Date().toISOString(),
        }
      : provider,
  );

  const next = await updateOperationalRuntimeConfig({
    dispatch: {
      providers,
    },
  }, updatedBy);

  return next.dispatch.providers.find((provider) => provider.id === providerId);
}
