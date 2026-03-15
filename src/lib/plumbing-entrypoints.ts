import type { ExperienceInput, ExperienceMode } from "./experience";
import type { FunnelFamily, MarketplaceAudience } from "./runtime-schema";

export type PlumbingEntrypointKind =
  | "marketplace-home"
  | "help-home"
  | "emergency"
  | "estimate"
  | "commercial"
  | "provider"
  | "local";

export type PlumbingEntrypointLink = {
  href: string;
  label: string;
  description: string;
};

export type PlumbingEntrypointDefinition = {
  kind: PlumbingEntrypointKind;
  route: string;
  audience: MarketplaceAudience;
  family: FunnelFamily;
  preferredMode: ExperienceMode;
  intent: NonNullable<ExperienceInput["intent"]>;
  service: string;
  eyebrow: string;
  title: string;
  summary: string;
  chipsLabel: string;
  chips: string[];
  pathLabel: string;
  pathSteps: string[];
  trustLabel: string;
  trustSignals: string[];
  proofLabel: string;
  proofSignals: string[];
  relatedLinks: PlumbingEntrypointLink[];
};

export type PlumbingIntegrationBundle = {
  hostedUrl: string;
  launcherLabel: string;
  widgetScript: string;
  iframeEmbed: string;
  bootEndpoint: string;
  manifestEndpoint: string;
};

type PlumbingIntegrationOptions = {
  zip?: string;
  city?: string;
};

export function formatZipLabel(zip?: string) {
  if (!zip) {
    return "your area";
  }
  return zip.length === 5 ? zip : zip.toUpperCase();
}

function withZipCopy(value: string, zip?: string) {
  return value.replaceAll("{zip}", formatZipLabel(zip));
}

export function getMarketplaceEntrypointLinks(zip?: string): PlumbingEntrypointLink[] {
  return [
    {
      href: "/plumbing/emergency",
      label: "Emergency plumbing help",
      description: `Shortest path for burst pipes, active leaks, backups, and no-hot-water emergencies in ${formatZipLabel(zip)}.`,
    },
    {
      href: "/plumbing/estimate",
      label: "Book a plumbing estimate",
      description: "Lower-pressure path for installs, replacements, and planned repair work.",
    },
    {
      href: "/plumbing/commercial",
      label: "Commercial plumbing service",
      description: "Structured intake for facilities, property teams, and multi-site coordination.",
    },
    {
      href: "/join-provider-network",
      label: "Join provider network",
      description: "Supply-side onboarding for plumbers and dispatch-ready service teams.",
    },
  ];
}

export function getPlumbingEntrypoint(
  kind: PlumbingEntrypointKind,
  options?: { zip?: string },
): PlumbingEntrypointDefinition {
  const zip = options?.zip;
  const relatedLinks = getMarketplaceEntrypointLinks(zip);

  switch (kind) {
    case "marketplace-home":
      return {
        kind,
        route: "/",
        audience: "client",
        family: "qualification",
        preferredMode: "booking-first",
        intent: "solve-now",
        service: "emergency-plumbing",
        eyebrow: "Plumbing marketplace hub",
        title: "A two-sided plumbing marketplace built for speed, coverage, and trust",
        summary:
          "LeadOS now serves both sides of the marketplace: homeowners and tenants who need help fast, and plumbing providers who want better-fit jobs with real dispatch context.",
        chipsLabel: "Entry points",
        chips: [
          "Emergency plumbing help",
          "Estimate booking",
          "Commercial service intake",
          "Provider network onboarding",
        ],
        pathLabel: "How the marketplace routes people",
        pathSteps: [
          "Homeowners and tenants pick the fastest path for urgency, estimate, or property complexity.",
          "Providers join through a separate onboarding path that captures coverage, specialties, and readiness.",
          "LeadOS keeps the two journeys distinct so the marketplace can route demand without directory-style friction.",
        ],
        trustLabel: "What makes the marketplace feel credible",
        trustSignals: [
          "Different entry points for buyers and providers prevent confusion at the very first screen.",
          "Every path explains what happens next before asking for more information.",
          "Mobile urgency flows stay short while provider onboarding captures operational details without bloating the homeowner journey.",
        ],
        proofLabel: "Choose the path that matches the moment",
        proofSignals: [
          "Fast dispatch for urgent homeowner demand",
          "Quote-friendly flow for planned jobs",
          "Structured commercial intake",
          "Provider network path with service-area and specialty mapping",
        ],
        relatedLinks,
      };
    case "help-home":
      return {
        kind,
        route: "/get-plumbing-help",
        audience: "client",
        family: "qualification",
        preferredMode: "booking-first",
        intent: "solve-now",
        service: "plumbing-help",
        eyebrow: "Demand-side marketplace path",
        title: "Choose the right plumbing help path without re-explaining the job twice",
        summary:
          "This is the homeowner, tenant, and client entry point. Pick the urgency and job type first, then LeadOS keeps the next step short, local, and clear.",
        chipsLabel: "Demand-side paths",
        chips: ["Emergency", "Estimate", "Commercial", "Talk to dispatch"],
        pathLabel: "How this demand path works",
        pathSteps: [
          "Choose whether the job is urgent, planned, or commercial before filling anything long.",
          "LeadOS keeps the path short and preserves your issue, location, and urgency context.",
          "If the job is unusual, you can fall back to a dispatch-style human path instead of getting trapped in a form.",
        ],
        trustLabel: "What users need to trust immediately",
        trustSignals: [
          "Clear split between urgent help and estimate shopping.",
          "Human fallback stays visible for jobs that do not fit a neat booking path.",
          "Commercial requests get routed into a different operating model than home repair jobs.",
        ],
        proofLabel: "Explore the customer-facing entries",
        proofSignals: [
          "Emergency-first flow for active problems",
          "Estimate flow for planned work",
          "Commercial flow for property teams",
          "Local ZIP entry pages for search-driven traffic",
        ],
        relatedLinks,
      };
    case "emergency":
      return {
        kind,
        route: "/plumbing/emergency",
        audience: "client",
        family: "qualification",
        preferredMode: "booking-first",
        intent: "solve-now",
        service: "emergency-plumbing",
        eyebrow: "Emergency plumbing dispatch",
        title: `Need a plumber fast in ${formatZipLabel(zip)}?`,
        summary:
          "This path is optimized for burst pipes, active leaks, sewer backups, no hot water, and other urgent problems where dead-end quote forms cost time and trust.",
        chipsLabel: "Urgent issue types",
        chips: ["Burst pipe", "Active leak", "Sewer backup", "No hot water", "Overflowing drain"],
        pathLabel: "What happens next",
        pathSteps: [
          "Tell us what is happening and confirm the fastest contact path.",
          "LeadOS preserves urgency, issue type, and location so dispatch can act without asking you to start over.",
          "If the exact booking path is not right, talk-to-dispatch stays available as a safe fallback.",
        ],
        trustLabel: "What reduces urgency anxiety",
        trustSignals: [
          `Local routing context for ${formatZipLabel(zip)} stays visible from the first step.`,
          "One dominant action, one human fallback, and no long front-loaded estimate form.",
          "The screen explains what happens next before it asks for contact details.",
        ],
        proofLabel: "Other useful paths if this is not an emergency",
        proofSignals: [
          "Switch to estimate path for planned work",
          "Switch to commercial intake for building or facilities issues",
          "Use local ZIP page for neighborhood-specific trust framing",
          "Provider network path remains separate from the homeowner experience",
        ],
        relatedLinks,
      };
    case "estimate":
      return {
        kind,
        route: "/plumbing/estimate",
        audience: "client",
        family: "qualification",
        preferredMode: "form-first",
        intent: "compare",
        service: "plumbing-estimate",
        eyebrow: "Estimate and quote path",
        title: "Book a plumbing estimate without the usual quote-form drag",
        summary:
          "This path is for planned repairs, replacements, installs, and comparison shopping. It collects only the information needed to route the estimate, not a giant intake dossier.",
        chipsLabel: "Planned-work categories",
        chips: ["Water heater replacement", "Fixture install", "Drain repair", "Leak repair", "Repiping estimate"],
        pathLabel: "How the estimate path works",
        pathSteps: [
          "Pick the job type and outcome you want before giving full contact details.",
          "LeadOS keeps the estimate flow lighter than emergency dispatch while preserving job context for follow-up.",
          "You can still move to a faster human path if the job becomes more urgent than expected.",
        ],
        trustLabel: "What makes the estimate flow credible",
        trustSignals: [
          "Planned jobs are not forced through the same urgency copy as emergency jobs.",
          "The system sets expectations about the next step instead of implying an instant dispatch when that is not realistic.",
          "Your job type stays visible across the flow so you do not have to remember or restate it.",
        ],
        proofLabel: "Related paths",
        proofSignals: [
          "Emergency help if the issue cannot wait",
          "Commercial intake for properties and facilities",
          "Provider network if you are a plumber, not a buyer",
          "Local ZIP pages for search-intent entry",
        ],
        relatedLinks,
      };
    case "commercial":
      return {
        kind,
        route: "/plumbing/commercial",
        audience: "client",
        family: "qualification",
        preferredMode: "form-first",
        intent: "compare",
        service: "commercial-plumbing",
        eyebrow: "Commercial plumbing desk",
        title: "Commercial plumbing service intake for property teams and facilities",
        summary:
          "This path is for businesses, facilities managers, property managers, and multi-unit operators who need a more structured service request than a homeowner emergency screen can provide.",
        chipsLabel: "Commercial request types",
        chips: ["Facilities issue", "Multi-unit property", "Scheduled service", "Emergency building issue", "Coverage conversation"],
        pathLabel: "How commercial intake works",
        pathSteps: [
          "Use a structured intake path designed for site details, property complexity, and repeat work.",
          "LeadOS keeps business and property context attached so the next operator or provider does not start blind.",
          "For immediate building problems, a dispatch-style fallback remains available without collapsing everything into homeowner copy.",
        ],
        trustLabel: "Why commercial users stay in the flow",
        trustSignals: [
          "Commercial language, not residential emergency language.",
          "Property and facilities context gets treated as first-class data, not an afterthought in a notes field.",
          "The next step is framed around coordination and service continuity, not just raw lead capture.",
        ],
        proofLabel: "Related marketplace paths",
        proofSignals: [
          "Emergency residential path",
          "Planned estimate path",
          "Provider onboarding path",
          "Local ZIP entry for area-specific demand capture",
        ],
        relatedLinks,
      };
    case "provider":
      return {
        kind,
        route: "/join-provider-network",
        audience: "provider",
        family: "qualification",
        preferredMode: "form-first",
        intent: "compare",
        service: "provider-network",
        eyebrow: "Provider network onboarding",
        title: "Join the plumbing provider network with real coverage, specialties, and capacity",
        summary:
          "This is a supply-side path, not a directory signup. Providers use it to declare service area, emergency readiness, specialties, and job fit so LeadOS can route better work.",
        chipsLabel: "Provider setup topics",
        chips: ["Service area", "Emergency coverage", "Specialties", "Commercial capacity", "Response readiness"],
        pathLabel: "How provider onboarding works",
        pathSteps: [
          "Declare the kinds of jobs you want before filling generic company data.",
          "Map service area, issue-type fit, and availability so the marketplace can route intelligently.",
          "LeadOS uses this data to build dispatch-ready supply instead of treating providers like static directory listings.",
        ],
        trustLabel: "Why providers should trust this path",
        trustSignals: [
          "Clear split between buyer funnels and provider onboarding avoids junk consumer-style forms.",
          "Coverage and specialty signals are captured up front because they actually matter for assignment.",
          "The path explains how better response readiness improves routing quality over time.",
        ],
        proofLabel: "Related marketplace paths",
        proofSignals: [
          "Demand-side help for homeowners and tenants",
          "Commercial service intake",
          "Local ZIP demand pages",
          "Emergency dispatch path for urgent buyers",
        ],
        relatedLinks,
      };
    case "local":
      return {
        kind,
        route: `/local/${zip ?? "zip"}`,
        audience: "client",
        family: "qualification",
        preferredMode: "booking-first",
        intent: "solve-now",
        service: "local-plumbing",
        eyebrow: "Local plumbing routing",
        title: `Plumbing help in ${formatZipLabel(zip)} without generic national-directory friction`,
        summary:
          "This entry point is designed for ZIP-level traffic. It keeps local trust, urgency, and service relevance close to the first action so search-driven visitors do not bounce.",
        chipsLabel: "Common local intents",
        chips: ["Need help now", "Book an estimate", "Commercial service", "Talk to dispatch", "Compare local options"],
        pathLabel: "How local routing works",
        pathSteps: [
          `The page keeps ${formatZipLabel(zip)} visible so the next step feels local from the start.`,
          "Emergency, estimate, and commercial branches stay distinct instead of forcing everyone through one form.",
          "LeadOS preserves ZIP context for routing, follow-up, and marketplace reporting.",
        ],
        trustLabel: "What local visitors need to trust",
        trustSignals: [
          "Local specificity shows up before the form, not after submission.",
          "The page acknowledges different buyer modes: urgent, planned, and commercial.",
          "If the visitor came from search, the next action still feels immediate and relevant to the area.",
        ],
        proofLabel: "Choose a local path",
        proofSignals: [
          withZipCopy("Emergency routing in {zip}", zip),
          withZipCopy("Estimate flow in {zip}", zip),
          withZipCopy("Commercial service in {zip}", zip),
          "Provider network remains a separate entry path",
        ],
        relatedLinks,
      };
    default:
      return getPlumbingEntrypoint("marketplace-home", options);
  }
}

export function buildPlumbingIntegrationBundle(
  entry: PlumbingEntrypointDefinition,
  runtimeBaseUrl: string,
  options?: PlumbingIntegrationOptions,
): PlumbingIntegrationBundle {
  const origin = runtimeBaseUrl.replace(/\/$/, "");
  const routeUrl = `${origin}${entry.route}`;
  const zip = options?.zip ?? (entry.kind === "local" ? entry.route.split("/").pop() : undefined);
  const city = options?.city;
  const pageType =
    entry.kind === "provider"
      ? "provider-recruitment-page"
      : entry.kind === "commercial"
        ? "commercial-service-page"
        : entry.kind === "estimate"
          ? "estimate-service-page"
          : entry.kind === "local"
            ? "zip-seo-page"
            : "provider-homepage";
  const modeLabel =
    entry.kind === "provider"
      ? "Join provider network"
      : entry.kind === "emergency"
        ? "Need a plumber now?"
        : entry.kind === "estimate"
          ? "Book a plumbing estimate"
          : entry.kind === "commercial"
            ? "Talk to plumbing desk"
            : entry.kind === "local"
              ? "Get local plumbing help"
              : "Get plumbing help";
  const bootQuery = new URLSearchParams({
    niche: "plumbing",
    service: entry.service,
    family: entry.family,
    mode: entry.preferredMode,
    entrypoint: `plumbing-${entry.kind}`,
    audience: entry.audience,
    pageType,
    launcherLabel: modeLabel,
  });
  if (entry.kind === "local") {
    if (zip) {
      bootQuery.set("zip", zip);
    }
  }
  if (city) {
    bootQuery.set("city", city);
  }
  const bootEndpoint = `${origin}/api/widgets/boot?${bootQuery.toString()}`;
  const widgetConfig = [
    "<script>",
    "  window.LeadOSConfig = {",
    `    runtimeBaseUrl: "${origin}",`,
    `    niche: "plumbing",`,
    `    service: "${entry.service}",`,
    `    family: "${entry.family}",`,
    `    mode: "${entry.preferredMode}",`,
    `    entrypoint: "plumbing-${entry.kind}",`,
    `    audience: "${entry.audience}",`,
    `    pageType: "${pageType}",`,
    ...(zip ? [`    zip: "${zip}",`] : []),
    ...(city ? [`    city: "${city}",`] : []),
    `    launcherLabel: "${modeLabel}"`,
    "  };",
    "</script>",
    `<script src="${origin}/embed/lead-os-embed.js"></script>`,
  ].join("\n");
  const iframeEmbed = `<iframe src="${routeUrl}" title="${entry.title}" loading="lazy" style="width:100%;min-height:860px;border:0;border-radius:24px;"></iframe>`;

  return {
    hostedUrl: routeUrl,
    launcherLabel: modeLabel,
    widgetScript: widgetConfig,
    iframeEmbed,
    bootEndpoint,
    manifestEndpoint: `${origin}/api/embed/manifest`,
  };
}
