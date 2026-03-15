import { generateDeploymentPackage, type DeploymentGeneratorQuery } from "./embed-deployment.ts";
import { tenantConfig } from "./tenant.ts";
import {
  getDeploymentRegistryRecords,
  upsertDeploymentRegistryRecord,
  type DeploymentRegistryRecord,
  type DeploymentInstallType,
  type DeploymentStatus,
} from "./runtime-store.ts";
import { generateWordPressPluginPackage } from "./wordpress-plugin.ts";

export type RegisterDeploymentInput = DeploymentGeneratorQuery & {
  id?: string;
  installType?: DeploymentInstallType;
  status?: DeploymentStatus;
  domain?: string;
  pageUrl?: string;
  providerId?: string;
  providerLabel?: string;
  notes?: string;
  tags?: string[];
  updatedBy?: string;
};

export type RegisterDeploymentBatchInput = {
  deployments: RegisterDeploymentInput[];
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildDeploymentId(input: RegisterDeploymentInput, hostedUrl: string) {
  const zip = input.zip?.trim();
  const pageType = input.pageType ?? "deployment";
  const entrypoint = input.entrypoint ?? input.recipe ?? "lead-os";
  const domain = input.domain?.trim().toLowerCase() ?? "";
  const city = input.city?.trim().toLowerCase() ?? "";
  return slugify([entrypoint, pageType, zip, city, domain || hostedUrl].filter(Boolean).join("-"));
}

function sanitizeTags(tags?: string[]) {
  return [...new Set((tags ?? [])
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean))];
}

function daysSince(timestamp: string) {
  const delta = Date.now() - new Date(timestamp).getTime();
  return Math.floor(delta / (1000 * 60 * 60 * 24));
}

export async function registerDeployment(input: RegisterDeploymentInput) {
  const existing = input.id ? await getDeploymentRegistryRecords({ id: input.id }).then((records) => records[0]) : undefined;
  const existingSeed = existing ? {
    recipe: existing.recipe,
    entrypoint: existing.entrypoint,
    niche: existing.niche,
    audience: existing.audience,
    pageType: existing.pageType,
    zip: existing.zip,
    city: existing.city,
    providerId: existing.providerId,
    providerLabel: existing.providerLabel,
    domain: existing.domain,
    pageUrl: existing.pageUrl,
    notes: existing.notes,
    tags: existing.tags,
  } : {};
  const mergedInput: RegisterDeploymentInput = {
    ...existingSeed,
    ...input,
  };
  const deployment = generateDeploymentPackage(mergedInput, tenantConfig);
  const id = input.id ?? buildDeploymentId(mergedInput, deployment.bundle.hostedUrl);
  const record: Omit<DeploymentRegistryRecord, "createdAt" | "updatedAt"> & { createdAt?: string; updatedAt?: string } = {
    id,
    recipe: typeof mergedInput.recipe === "string" ? mergedInput.recipe : deployment.deploymentPattern?.id,
    entrypoint: deployment.entrypointPreset.id,
    niche: deployment.niche,
    audience: deployment.audience,
    pageType: deployment.pageType,
    installType: input.installType ?? existing?.installType ?? "widget",
    status: input.status ?? existing?.status ?? "generated",
    domain: mergedInput.domain?.trim().toLowerCase() || undefined,
    pageUrl: mergedInput.pageUrl?.trim() || undefined,
    zip: mergedInput.zip?.trim() || undefined,
    city: mergedInput.city?.trim() || undefined,
    providerId: mergedInput.providerId?.trim() || undefined,
    providerLabel: mergedInput.providerLabel?.trim() || undefined,
    hostedUrl: deployment.bundle.hostedUrl,
    bootEndpoint: deployment.bundle.bootEndpoint,
    manifestEndpoint: deployment.bundle.manifestEndpoint,
    generatorEndpoint: deployment.generatorEndpoint,
    pluginDownloadPath: (input.installType ?? existing?.installType) === "wordpress-plugin"
      ? generateWordPressPluginPackage(deployment, tenantConfig).downloadPath
      : undefined,
    notes: mergedInput.notes?.trim() || undefined,
    tags: sanitizeTags(mergedInput.tags),
    updatedBy: input.updatedBy,
    createdAt: existing?.createdAt,
  };

  return upsertDeploymentRegistryRecord(record);
}

export async function registerDeploymentBatch(input: RegisterDeploymentBatchInput) {
  const records: DeploymentRegistryRecord[] = [];
  for (const deployment of input.deployments) {
    records.push(await registerDeployment(deployment));
  }
  return records;
}

export function summarizeDeploymentRegistry(records: DeploymentRegistryRecord[]) {
  const countByStatus = (status: DeploymentStatus) => records.filter((record) => record.status === status).length;
  const countByInstallType = (installType: DeploymentInstallType) => records.filter((record) => record.installType === installType).length;
  const zipScoped = records.filter((record) => Boolean(record.zip)).length;
  const providerScoped = records.filter((record) => Boolean(record.providerId || record.providerLabel)).length;
  const generatedOlderThanSevenDays = records.filter((record) => record.status === "generated" && daysSince(record.updatedAt) >= 7).length;
  const liveWithoutPageUrl = records.filter((record) => record.status === "live" && !record.pageUrl).length;
  const staleDeployments = records.filter((record) => daysSince(record.updatedAt) >= 30).length;
  const byCity = Object.entries(records.reduce<Record<string, number>>((acc, record) => {
    if (!record.city) return acc;
    const key = record.city.toLowerCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {}))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([city, count]) => ({ city, count }));
  const byRecipe = Object.entries(records.reduce<Record<string, number>>((acc, record) => {
    const key = record.recipe ?? "custom";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {}))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([recipe, count]) => ({ recipe, count }));

  return {
    total: records.length,
    live: countByStatus("live"),
    planned: countByStatus("planned"),
    generated: countByStatus("generated"),
    paused: countByStatus("paused"),
    retired: countByStatus("retired"),
    widget: countByInstallType("widget"),
    iframe: countByInstallType("iframe"),
    wordpressPlugin: countByInstallType("wordpress-plugin"),
    hostedLink: countByInstallType("hosted-link"),
    zipScoped,
    providerScoped,
    generatedOlderThanSevenDays,
    liveWithoutPageUrl,
    staleDeployments,
    topDomains: Object.entries(records.reduce<Record<string, number>>((acc, record) => {
      if (!record.domain) return acc;
      acc[record.domain] = (acc[record.domain] ?? 0) + 1;
      return acc;
    }, {}))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([domain, count]) => ({ domain, count })),
    byCity,
    byRecipe,
  };
}

export async function getDeploymentRegistrySnapshot(filters?: {
  status?: DeploymentStatus;
  pageType?: string;
  audience?: string;
}) {
  const records = await getDeploymentRegistryRecords(filters);
  return {
    records,
    summary: summarizeDeploymentRegistry(records),
  };
}
