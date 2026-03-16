import { getNiche, nicheCatalog } from "./catalog.ts";
import { buildExperienceManifest, resolveExperienceProfile, type ExperienceMode } from "./experience.ts";
import type { ExperienceExperimentPromotion } from "./experiments.ts";
import {
  buildPlumbingIntegrationBundle,
  getPlumbingEntrypoint,
  type PlumbingEntrypointDefinition,
  type PlumbingEntrypointKind,
  type PlumbingIntegrationBundle,
} from "./plumbing-entrypoints.ts";
import type { FunnelFamily, MarketplaceAudience } from "./runtime-schema.ts";
import type { TenantConfig } from "./tenant.ts";

export type WidgetPresetId =
  | "urgent-drawer"
  | "estimate-drawer"
  | "commercial-intake-drawer"
  | "provider-join-drawer"
  | "inline-embed-form"
  | "sticky-mobile-dispatch-bar"
  | "hosted-page-iframe"
  | "full-width-section-embed";

export type DeploymentRecipeId =
  | "provider-homepage-emergency-widget"
  | "zip-seo-page-urgent-widget"
  | "estimate-page-widget"
  | "commercial-service-page-widget"
  | "provider-recruitment-widget";

export type DeploymentPattern = {
  id: DeploymentRecipeId;
  label: string;
  useCase: string;
  audience: MarketplaceAudience;
  recommendedEntrypoint: PlumbingEntrypointKind;
  recommendedWidgetPreset: WidgetPresetId;
  recommendedPageType: string;
  placement: string[];
  successMetrics: string[];
  summary: string;
};

export type WidgetPreset = {
  id: WidgetPresetId;
  label: string;
  summary: string;
  bestFor: string[];
  mobileBehavior: string;
  desktopBehavior: string;
  conversionGoal: string;
  placementGuidance: string[];
};

export type EntrypointPreset = {
  id: string;
  kind: PlumbingEntrypointKind;
  audience: MarketplaceAudience;
  label: string;
  summary: string;
  route: string;
  service: string;
  family: FunnelFamily;
  mode: ExperienceMode;
  widgetPreset: WidgetPresetId;
  recommendedPages: string[];
  deploymentSummary: string;
};

export type BootQuery = {
  niche?: string;
  service?: string;
  entrypoint?: string;
  audience?: string;
  mode?: string;
  family?: string;
  zip?: string;
  city?: string;
  pageType?: string;
  launcherLabel?: string;
};

export type ResolvedWidgetBoot = {
  niche: string;
  service: string;
  entrypointPreset: EntrypointPreset;
  widgetPreset: WidgetPreset;
  deploymentPattern?: DeploymentPattern;
  route: string;
  launcherLabel: string;
  pageType: string;
  audience: MarketplaceAudience;
  zip?: string;
  city?: string;
  experience: ReturnType<typeof buildExperienceManifest>;
  resolvedProfile: ReturnType<typeof resolveExperienceProfile>;
};

export type DeploymentGeneratorQuery = BootQuery & {
  recipe?: DeploymentRecipeId | string;
};

export type GeneratedDeploymentPackage = {
  niche: string;
  audience: MarketplaceAudience;
  pageType: string;
  entrypointPreset: EntrypointPreset;
  widgetPreset: WidgetPreset;
  deploymentPattern?: DeploymentPattern;
  experience: ReturnType<typeof buildExperienceManifest>;
  bundle: PlumbingIntegrationBundle;
  wordpressEmbedBlock: string;
  generatorEndpoint: string;
};

export type BulkZipDeploymentQuery = DeploymentGeneratorQuery & {
  zips?: string[];
  limit?: number;
};

export type BulkZipDeploymentPackage = {
  recipe?: DeploymentRecipeId | string;
  count: number;
  deployments: GeneratedDeploymentPackage[];
};

const widgetPresets: WidgetPreset[] = [
  {
    id: "urgent-drawer",
    label: "Urgent dispatch drawer",
    summary: "Fast-launching drawer optimized for emergency plumbing and same-session dispatch intent.",
    bestFor: ["Emergency service pages", "ZIP SEO pages", "Sticky launchers", "Paid traffic landing pages"],
    mobileBehavior: "Sticky launcher + minimal-step drawer with phone-first emphasis.",
    desktopBehavior: "Drawer from the bottom-right with short triage and human fallback.",
    conversionGoal: "Speed-to-contact and booking start",
    placementGuidance: ["Sticky corner launcher", "Hero CTA secondary path", "Emergency service page sidebar"],
  },
  {
    id: "estimate-drawer",
    label: "Estimate request drawer",
    summary: "Lower-pressure widget for planned repairs, replacements, and booked estimates.",
    bestFor: ["Estimate pages", "Water heater pages", "Repiping pages", "Project service pages"],
    mobileBehavior: "Inline CTA that opens a calmer multi-step drawer.",
    desktopBehavior: "Drawer with project-type framing and explicit expectation setting.",
    conversionGoal: "Estimate request completion",
    placementGuidance: ["Mid-page inline CTA", "After proof block", "Before FAQ"],
  },
  {
    id: "commercial-intake-drawer",
    label: "Commercial intake drawer",
    summary: "Structured B2B intake for facilities, property management, and repeat-work accounts.",
    bestFor: ["Commercial plumbing pages", "Facilities pages", "Property management pages"],
    mobileBehavior: "Compact launcher with structured intake after open.",
    desktopBehavior: "Wider drawer with business-oriented intake framing.",
    conversionGoal: "Commercial request submission",
    placementGuidance: ["Dedicated commercial sections", "Contact pages", "Account-service pages"],
  },
  {
    id: "provider-join-drawer",
    label: "Provider network drawer",
    summary: "Supply-side onboarding drawer for service-area, specialty, and coverage intake.",
    bestFor: ["Provider recruiting pages", "Join our network pages", "Marketplace supply pages"],
    mobileBehavior: "Compact recruiter launcher with simplified first-step qualification.",
    desktopBehavior: "Drawer with supply-side trust framing and operations language.",
    conversionGoal: "Provider onboarding start",
    placementGuidance: ["Recruiting pages", "Marketplace footer CTA", "Supply-side landing pages"],
  },
  {
    id: "inline-embed-form",
    label: "Inline embedded form",
    summary: "Embedded inline form for mid-page conversion sections and high-intent service pages.",
    bestFor: ["Service pages", "Commercial pages", "Estimate pages"],
    mobileBehavior: "Full-width stacked section with single-column fields.",
    desktopBehavior: "Inline block integrated into content or CTA sections.",
    conversionGoal: "Inline form completion",
    placementGuidance: ["Mid-content section", "Below trust band", "Above FAQ"],
  },
  {
    id: "sticky-mobile-dispatch-bar",
    label: "Sticky mobile dispatch bar",
    summary: "Mobile-only emergency launcher designed for thumb-zone urgency behavior.",
    bestFor: ["Emergency pages", "Local ZIP pages", "Paid traffic mobile pages"],
    mobileBehavior: "Persistent bottom bar with one dominant action.",
    desktopBehavior: "Fallback to urgent drawer launcher.",
    conversionGoal: "Mobile urgency engagement",
    placementGuidance: ["Mobile-only fixed bar", "Emergency landing pages"],
  },
  {
    id: "hosted-page-iframe",
    label: "Hosted page iframe",
    summary: "Embed the full hosted LeadOS page when a client wants more than the widget drawer.",
    bestFor: ["Partner embeds", "Microsites", "Rapid deployments"],
    mobileBehavior: "Scrollable hosted section with full LeadOS experience.",
    desktopBehavior: "Large inline embed with hosted entry page.",
    conversionGoal: "Full hosted-page handoff without domain switch",
    placementGuidance: ["Dedicated conversion section", "Microsite blocks"],
  },
  {
    id: "full-width-section-embed",
    label: "Full-width section embed",
    summary: "Visually integrated section-based embed for premium client-site deployments.",
    bestFor: ["Homepage sections", "Service hub pages", "Brand-sensitive embeds"],
    mobileBehavior: "Single-column content-first block.",
    desktopBehavior: "Two-column integrated section.",
    conversionGoal: "High-trust embedded capture",
    placementGuidance: ["Homepage feature section", "Trust + CTA split layouts"],
  },
];

const deploymentPatterns: DeploymentPattern[] = [
  {
    id: "provider-homepage-emergency-widget",
    label: "Provider homepage emergency widget",
    useCase: "Independent plumber or local service website needs urgent demand conversion without redirecting away.",
    audience: "client",
    recommendedEntrypoint: "emergency",
    recommendedWidgetPreset: "urgent-drawer",
    recommendedPageType: "provider-homepage",
    placement: ["Sticky launcher", "Hero CTA", "Emergency service page sidebar"],
    successMetrics: ["Widget open rate", "Dispatch-start rate", "Booked lead rate"],
    summary: "Best default for provider websites that want more emergency plumbing calls and bookings.",
  },
  {
    id: "zip-seo-page-urgent-widget",
    label: "ZIP SEO page urgent widget",
    useCase: "Local search landing page needs ZIP-aware urgency capture and local trust framing.",
    audience: "client",
    recommendedEntrypoint: "local",
    recommendedWidgetPreset: "sticky-mobile-dispatch-bar",
    recommendedPageType: "zip-seo-page",
    placement: ["Sticky mobile bar", "Inline section after local trust copy", "Repeat CTA lower on page"],
    successMetrics: ["Local page conversion rate", "ZIP-specific booking starts", "Human fallback usage"],
    summary: "Best for high-volume local SEO deployments across many ZIPs.",
  },
  {
    id: "estimate-page-widget",
    label: "Estimate page widget",
    useCase: "Planned project page needs lower-pressure estimate capture without emergency framing.",
    audience: "client",
    recommendedEntrypoint: "estimate",
    recommendedWidgetPreset: "inline-embed-form",
    recommendedPageType: "estimate-service-page",
    placement: ["Inline CTA section", "After proof block", "Above FAQ"],
    successMetrics: ["Estimate requests", "Form completion rate", "Follow-up conversion rate"],
    summary: "Best for water heater, repiping, fixture, and planned project pages.",
  },
  {
    id: "commercial-service-page-widget",
    label: "Commercial service page widget",
    useCase: "Facilities or property-management page needs business-oriented intake and coordination.",
    audience: "client",
    recommendedEntrypoint: "commercial",
    recommendedWidgetPreset: "commercial-intake-drawer",
    recommendedPageType: "commercial-service-page",
    placement: ["Commercial service page body", "Contact page", "Account service section"],
    successMetrics: ["Commercial lead quality", "Commercial intake completion", "Account conversation rate"],
    summary: "Best for property teams, facilities managers, and building operators.",
  },
  {
    id: "provider-recruitment-widget",
    label: "Provider recruitment widget",
    useCase: "Marketplace or region page needs to recruit more plumbers into coverage cells.",
    audience: "provider",
    recommendedEntrypoint: "provider",
    recommendedWidgetPreset: "provider-join-drawer",
    recommendedPageType: "provider-recruitment-page",
    placement: ["Recruiting microsite", "Join our network page", "Marketplace footer CTA"],
    successMetrics: ["Provider application starts", "Approved provider rate", "Coverage growth by ZIP"],
    summary: "Best for scaling the supply side of the marketplace.",
  },
];

function findWidgetPreset(id: WidgetPresetId) {
  return widgetPresets.find((preset) => preset.id === id) ?? widgetPresets[0];
}

function buildEntrypointPreset(
  entry: PlumbingEntrypointDefinition,
  widgetPreset: WidgetPresetId,
  recommendedPages: string[],
  deploymentSummary: string,
): EntrypointPreset {
  return {
    id: `plumbing-${entry.kind}`,
    kind: entry.kind,
    audience: entry.audience,
    label: entry.title,
    summary: entry.summary,
    route: entry.route,
    service: entry.service,
    family: entry.family,
    mode: entry.preferredMode,
    widgetPreset,
    recommendedPages,
    deploymentSummary,
  };
}

export function listEntrypointPresets() {
  return [
    buildEntrypointPreset(
      getPlumbingEntrypoint("marketplace-home"),
      "full-width-section-embed",
      ["Marketplace homepages", "Local service hubs"],
      "Best for top-level marketplace home pages where both sides of the plumbing marketplace need a clear split.",
    ),
    buildEntrypointPreset(
      getPlumbingEntrypoint("help-home"),
      "full-width-section-embed",
      ["Customer help hubs", "Service overview pages"],
      "Best for demand-side hubs where homeowners and tenants need to choose urgency, estimate, or commercial paths.",
    ),
    buildEntrypointPreset(
      getPlumbingEntrypoint("emergency"),
      "urgent-drawer",
      ["Emergency pages", "Paid traffic pages", "Provider homepages"],
      "Best for urgent plumbing demand where speed-to-contact is the primary conversion objective.",
    ),
    buildEntrypointPreset(
      getPlumbingEntrypoint("estimate"),
      "inline-embed-form",
      ["Estimate pages", "Project-specific service pages"],
      "Best for planned work where a calmer estimate-oriented interaction outperforms emergency framing.",
    ),
    buildEntrypointPreset(
      getPlumbingEntrypoint("commercial"),
      "commercial-intake-drawer",
      ["Commercial plumbing pages", "Facilities pages", "Property management pages"],
      "Best for B2B intake with property complexity and repeat-work context.",
    ),
    buildEntrypointPreset(
      getPlumbingEntrypoint("provider"),
      "provider-join-drawer",
      ["Join our network pages", "Provider recruiting pages"],
      "Best for supply-side onboarding and provider recruitment.",
    ),
    buildEntrypointPreset(
      getPlumbingEntrypoint("local", { zip: "19103" }),
      "sticky-mobile-dispatch-bar",
      ["ZIP SEO pages", "Neighborhood pages", "Location landing pages"],
      "Best for local search landing pages where ZIP-specific urgency and trust need to stay visible.",
    ),
  ];
}

function inferEntrypointKind(query: BootQuery): PlumbingEntrypointKind {
  if (query.entrypoint) {
    const explicit = query.entrypoint.replace(/^plumbing-/, "") as PlumbingEntrypointKind;
    if (["marketplace-home", "help-home", "emergency", "estimate", "commercial", "provider", "local"].includes(explicit)) {
      return explicit;
    }
  }
  if (query.audience === "provider") return "provider";
  if (query.zip || query.pageType === "zip-seo-page") return "local";
  if (query.service === "commercial-plumbing" || query.pageType === "commercial-service-page") return "commercial";
  if (query.service === "plumbing-estimate" || query.mode === "form-first" || query.pageType === "estimate-service-page") return "estimate";
  return "emergency";
}

function inferPageType(query: BootQuery, entrypoint: PlumbingEntrypointKind) {
  if (query.pageType) return query.pageType;
  switch (entrypoint) {
    case "provider":
      return "provider-recruitment-page";
    case "commercial":
      return "commercial-service-page";
    case "estimate":
      return "estimate-service-page";
    case "local":
      return "zip-seo-page";
    default:
      return "provider-homepage";
  }
}

function findDeploymentPattern(entrypoint: PlumbingEntrypointKind, pageType: string) {
  return deploymentPatterns.find((pattern) => pattern.recommendedEntrypoint === entrypoint && pattern.recommendedPageType === pageType);
}

function findDeploymentPatternById(id?: string) {
  if (!id) return undefined;
  return deploymentPatterns.find((pattern) => pattern.id === id);
}

function overrideEntry(entry: PlumbingEntrypointDefinition, query: BootQuery) {
  return {
    ...entry,
    service: query.service ?? entry.service,
    preferredMode: ((query.mode as ExperienceMode | undefined) ?? entry.preferredMode),
    family: ((query.family as FunnelFamily | undefined) ?? entry.family),
  };
}

export function resolveWidgetBoot(
  query: BootQuery,
  tenantConfig: TenantConfig,
  experimentPromotions: ExperienceExperimentPromotion[] = [],
): ResolvedWidgetBoot {
  const entrypoint = inferEntrypointKind(query);
  const baseEntry = getPlumbingEntrypoint(entrypoint, { zip: query.zip });
  const entry = overrideEntry(baseEntry, query);
  const niche = query.niche ?? "plumbing";
  const pageType = inferPageType(query, entrypoint);
  const deploymentPattern = findDeploymentPattern(entrypoint, pageType);
  const entrypointPreset =
    listEntrypointPresets().find((preset) => preset.kind === entrypoint) ??
    listEntrypointPresets()[0];
  const widgetPreset = findWidgetPreset(deploymentPattern?.recommendedWidgetPreset ?? entrypointPreset.widgetPreset);
  const nicheDef = getNiche(niche);
  const audience = (query.audience === "provider" ? "provider" : entry.audience) as MarketplaceAudience;
  const resolvedProfile = resolveExperienceProfile({
    niche: nicheDef,
    audience,
    family: entry.family,
    preferredMode: entry.preferredMode,
    intent: entry.intent,
    source: "embedded_widget",
    experimentPromotions,
  });

  return {
    niche,
    service: entry.service,
    entrypointPreset,
    widgetPreset,
    deploymentPattern,
    route: entry.route,
    launcherLabel: query.launcherLabel ?? widgetPreset.label,
    pageType,
    audience,
    zip: query.zip,
    city: query.city,
    experience: buildExperienceManifest(nicheDef, experimentPromotions),
    resolvedProfile,
  };
}

export function buildManifestCatalog(
  tenantConfig: TenantConfig,
  experimentPromotions: ExperienceExperimentPromotion[] = [],
) {
  const experienceCatalog = Object.values(nicheCatalog).map((niche) => ({
    niche: niche.slug,
    manifest: buildExperienceManifest(niche, experimentPromotions),
  }));

  return {
    niches: Object.values(nicheCatalog),
    experienceCatalog,
    entrypointPresets: listEntrypointPresets(),
    widgetPresets,
    deploymentPatterns,
    themePresets: [
      {
        id: "lead-os-default",
        label: "LeadOS default",
        accent: tenantConfig.accent,
        surface: "#fffaf2",
        text: "#14211d",
        secondary: "#225f54",
      },
      {
        id: "dispatch-dark",
        label: "Dispatch dark",
        accent: "#c4632d",
        surface: "#15211e",
        text: "#f7f3ea",
        secondary: "#4ea792",
      },
    ],
    supportedIntegrations: [
      {
        id: "hosted-link",
        label: "Hosted link handoff",
        description: "Use the hosted LeadOS page directly for ads, email, SMS, directories, and QR flows.",
      },
      {
        id: "js-widget",
        label: "JavaScript widget",
        description: "Use lead-os-embed.js to launch a drawer or inline widget on client sites.",
      },
      {
        id: "iframe",
        label: "Iframe embed",
        description: "Embed the full hosted page in a client page when a full-hosted experience is preferred.",
      },
      {
        id: "plugin",
        label: "Plugin and deployment generators",
        description: "Use manifest-driven setup to generate embeds at scale for CMS and agency tools.",
      },
      {
        id: "generator-api",
        label: "Deployment generator API",
        description: "Generate hosted URLs, widget snippets, iframe fallbacks, and preset-aware boot payloads for a specific page deployment.",
      },
    ],
    localSeoPresets: [
      {
        id: "zip-emergency",
        label: "ZIP emergency page",
        summary: "Best for local urgent-demand pages targeting one ZIP or neighborhood.",
      },
      {
        id: "city-estimate",
        label: "City estimate page",
        summary: "Best for planned-work landing pages targeting a city or metro.",
      },
    ],
  };
}

function normalizeGeneratorQuery(query: DeploymentGeneratorQuery): BootQuery {
  const recipe = findDeploymentPatternById(query.recipe);
  if (!recipe) {
    return query;
  }

  return {
    ...query,
    audience: query.audience ?? recipe.audience,
    entrypoint: query.entrypoint ?? `plumbing-${recipe.recommendedEntrypoint}`,
    pageType: query.pageType ?? recipe.recommendedPageType,
  };
}

function resolveDeploymentEntry(boot: ResolvedWidgetBoot, query: BootQuery): PlumbingEntrypointDefinition {
  return getPlumbingEntrypoint(boot.entrypointPreset.kind, {
    zip: query.zip ?? boot.zip,
  });
}

function buildWordpressEmbedBlock(bundle: PlumbingIntegrationBundle) {
  return [
    "<!-- LeadOS HTML block for WordPress -->",
    '<div class="leados-embed-slot"></div>',
    bundle.widgetScript,
  ].join("\n");
}

function normalizeZipList(zips?: string[]) {
  return [...new Set((zips ?? [])
    .map((zip) => String(zip).trim())
    .filter(Boolean)
    .map((zip) => zip.replace(/[^\dA-Za-z-]/g, "")))];
}

export function generateDeploymentPackage(
  query: DeploymentGeneratorQuery,
  tenantConfig: TenantConfig,
  experimentPromotions: ExperienceExperimentPromotion[] = [],
): GeneratedDeploymentPackage {
  const normalized = normalizeGeneratorQuery(query);
  const resolved = resolveWidgetBoot(normalized, tenantConfig, experimentPromotions);
  const entry = resolveDeploymentEntry(resolved, normalized);
  const bundle = buildPlumbingIntegrationBundle(entry, tenantConfig.siteUrl, {
    zip: resolved.zip,
    city: resolved.city,
  });
  const generatorQuery = new URLSearchParams();
  if (query.recipe) generatorQuery.set("recipe", String(query.recipe));
  if (resolved.niche) generatorQuery.set("niche", resolved.niche);
  if (resolved.service) generatorQuery.set("service", resolved.service);
  if (resolved.entrypointPreset.id) generatorQuery.set("entrypoint", resolved.entrypointPreset.id);
  if (resolved.audience) generatorQuery.set("audience", resolved.audience);
  if (resolved.pageType) generatorQuery.set("pageType", resolved.pageType);
  if (resolved.zip) generatorQuery.set("zip", resolved.zip);
  if (resolved.city) generatorQuery.set("city", resolved.city);

  return {
    niche: resolved.niche,
    audience: resolved.audience,
    pageType: resolved.pageType,
    entrypointPreset: resolved.entrypointPreset,
    widgetPreset: resolved.widgetPreset,
    deploymentPattern: resolved.deploymentPattern ?? findDeploymentPatternById(query.recipe),
    experience: resolved.experience,
    bundle,
    wordpressEmbedBlock: buildWordpressEmbedBlock(bundle),
    generatorEndpoint: `${tenantConfig.siteUrl}/api/embed/generate?${generatorQuery.toString()}`,
  };
}

export function generateBulkZipDeploymentPackage(
  query: BulkZipDeploymentQuery,
  tenantConfig: TenantConfig,
  experimentPromotions: ExperienceExperimentPromotion[] = [],
): BulkZipDeploymentPackage {
  const limit = Math.max(1, Math.min(query.limit ?? 25, 250));
  const zipList = normalizeZipList(query.zips).slice(0, limit);
  const deployments = zipList.map((zip) =>
    generateDeploymentPackage({
      ...query,
      zip,
    }, tenantConfig, experimentPromotions),
  );

  return {
    recipe: query.recipe,
    count: deployments.length,
    deployments,
  };
}
