import type { PlumbingLeadContext } from "./runtime-schema.ts";
import type { OperationalRuntimeConfig } from "./runtime-config.ts";

type DispatchProvider = OperationalRuntimeConfig["dispatch"]["providers"][number];

export type DispatchProviderRecommendation = {
  providerId: string;
  providerLabel: string;
  score: number;
  availableCapacity: number | null;
  reason: string;
};

function lower(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function matchesList(value: string | undefined, list: string[]) {
  if (list.length === 0) {
    return true;
  }
  const normalized = lower(value);
  return Boolean(normalized) && list.includes(normalized);
}

function matchesZip(zip: string | undefined, prefixes: string[]) {
  if (prefixes.length === 0) {
    return true;
  }
  const normalized = lower(zip);
  return Boolean(normalized) && prefixes.some((prefix) => normalized.startsWith(lower(prefix)));
}

function scoreCoverage(plumbing: PlumbingLeadContext, provider: DispatchProvider) {
  const geo = plumbing.geo ?? {};
  let score = 0;
  if (provider.states.length === 0 && provider.counties.length === 0 && provider.cities.length === 0 && provider.zipPrefixes.length === 0) {
    score += 8;
  }
  if (matchesList(geo.state, provider.states)) score += 10;
  if (matchesList(geo.county, provider.counties)) score += 12;
  if (matchesList(geo.city, provider.cities)) score += 14;
  if (matchesZip(geo.zip, provider.zipPrefixes)) score += 12;
  return score;
}

function scoreFit(plumbing: PlumbingLeadContext, provider: DispatchProvider) {
  let score = 0;
  if (!provider.active) {
    return -1000;
  }
  if (plumbing.urgencyBand === "emergency-now" && !provider.acceptsEmergency) {
    return -1000;
  }
  if (plumbing.propertyType === "commercial" && !provider.acceptsCommercial) {
    return -1000;
  }
  if (provider.propertyTypes.length === 0 || provider.propertyTypes.includes(plumbing.propertyType)) {
    score += 10;
  }
  if (provider.issueTypes.length === 0 || provider.issueTypes.includes(plumbing.issueType)) {
    score += 10;
  }
  if (plumbing.urgencyBand === "emergency-now" && provider.acceptsEmergency) {
    score += 18;
  }
  if (plumbing.propertyType === "commercial" && provider.acceptsCommercial) {
    score += 16;
  }
  return score;
}

function scoreCapacity(provider: DispatchProvider) {
  if (typeof provider.maxConcurrentJobs !== "number") {
    return { score: 8, availableCapacity: null };
  }
  const activeJobs = provider.activeJobs ?? 0;
  const availableCapacity = Math.max(0, provider.maxConcurrentJobs - activeJobs);
  if (availableCapacity <= 0) {
    return { score: -1000, availableCapacity };
  }
  return {
    score: Math.min(20, availableCapacity * 5),
    availableCapacity,
  };
}

export function recommendDispatchProviders(
  plumbing: PlumbingLeadContext,
  providers: OperationalRuntimeConfig["dispatch"]["providers"],
) {
  return providers
    .map((provider) => {
      const capacity = scoreCapacity(provider);
      const fitScore = scoreFit(plumbing, provider);
      const coverageScore = scoreCoverage(plumbing, provider);
      const score = provider.priorityWeight + fitScore + coverageScore + capacity.score;
      const reasonParts = [
        `priority ${provider.priorityWeight}`,
        plumbing.urgencyBand === "emergency-now" && provider.acceptsEmergency
          ? "Emergency coverage"
          : plumbing.propertyType === "commercial" && provider.acceptsCommercial
            ? "Commercial coverage"
            : null,
        fitScore > 0 ? "service fit" : "limited fit",
        coverageScore > 0 ? "geo match" : "broad coverage",
        capacity.availableCapacity == null
          ? "capacity unknown"
          : `${capacity.availableCapacity} open slots`,
      ].filter(Boolean);

      return {
        providerId: provider.id,
        providerLabel: provider.label,
        score,
        availableCapacity: capacity.availableCapacity,
        reason: reasonParts.join(" | "),
      } satisfies DispatchProviderRecommendation;
    })
    .filter((provider) => provider.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
}
