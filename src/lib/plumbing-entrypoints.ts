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

export type PlumbingValueCard = {
  title: string;
  detail: string;
};

export type PlumbingFaqItem = {
  question: string;
  answer: string;
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
  audienceLabel: string;
  heroHighlights: string[];
  commitmentNote: string;
  chipsLabel: string;
  chips: string[];
  pathLabel: string;
  pathSteps: string[];
  trustLabel: string;
  trustSignals: string[];
  proofLabel: string;
  proofSignals: string[];
  valueCards: PlumbingValueCard[];
  faq: PlumbingFaqItem[];
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
        audienceLabel: "For homeowners, tenants, property teams, and plumbing providers",
        heroHighlights: ["Local ZIP-aware routing", "One clear next step", "Separate buyer and provider journeys"],
        commitmentNote: "Start on the right side of the marketplace first, then move into the shortest path for the job or opportunity in front of you.",
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
        valueCards: [
          {
            title: "Faster self-selection",
            detail: "Visitors choose the right lane first instead of getting trapped in a generic plumbing form.",
          },
          {
            title: "Lower confusion",
            detail: "Demand and supply are split immediately, which reduces the friction that kills momentum in two-sided marketplaces.",
          },
          {
            title: "Better-fit routing",
            detail: "LeadOS can route urgent demand, estimate traffic, commercial requests, and provider onboarding with different logic from the start.",
          },
        ],
        faq: [
          {
            question: "Who should start here?",
            answer: "Anyone who needs the marketplace overview first: homeowners, tenants, commercial buyers, and providers comparing their correct next path.",
          },
          {
            question: "What if I already know what I need?",
            answer: "Use the more direct emergency, estimate, commercial, or provider page to reduce steps and get to the right next action faster.",
          },
          {
            question: "Why split the paths so early?",
            answer: "Because urgent buyers, estimate shoppers, property teams, and providers need different copy, different friction, and different next-step promises to convert well.",
          },
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
        audienceLabel: "For homeowners, tenants, and people trying to get plumbing help now",
        heroHighlights: ["Emergency and estimate split", "Human fallback stays visible", "Local context preserved"],
        commitmentNote: "Choose the kind of help you need first. That single commitment lets LeadOS shorten the rest of the experience.",
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
        valueCards: [
          {
            title: "No dead-end first screen",
            detail: "Visitors choose their job context before the form gets longer, which reduces hesitation and bad-fit submissions.",
          },
          {
            title: "Shorter urgent path",
            detail: "People with active plumbing problems are not forced through the same path as estimate shoppers.",
          },
          {
            title: "Safer fallback",
            detail: "If the job is unusual, the visitor can still move toward a human dispatch path instead of abandoning the page.",
          },
        ],
        faq: [
          {
            question: "Should I choose emergency or estimate?",
            answer: "Choose emergency if speed matters more than comparison. Choose estimate if the job is planned and you want a lighter quote path.",
          },
          {
            question: "What if my issue is complicated?",
            answer: "Use the dispatch-style fallback so you can keep moving without forcing the job into the wrong form path.",
          },
          {
            question: "Will I need to explain everything twice?",
            answer: "No. The path keeps your urgency, job type, and location attached so the next step starts with context already in place.",
          },
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
        audienceLabel: `For homeowners and tenants who need urgent plumbing help in ${formatZipLabel(zip)}`,
        heroHighlights: ["Phone-first fast path", "Local routing context", "Human dispatch fallback"],
        commitmentNote: "This page is built to get you to the fastest credible next step, not to bury you in a long quote request while the problem gets worse.",
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
        valueCards: [
          {
            title: "Built for speed",
            detail: "Urgent users should see the problem type, the action, and the next step almost immediately.",
          },
          {
            title: "Built for anxious buyers",
            detail: "The page reduces uncertainty by showing what happens next before asking for more information.",
          },
          {
            title: "Built for mobile emergencies",
            detail: "The path stays thumb-friendly, short, and easy to continue when someone is under pressure.",
          },
        ],
        faq: [
          {
            question: "Will this connect me to a real next step quickly?",
            answer: "That is the purpose of this path. It prioritizes urgency, location, and the best contact route before any extra detail.",
          },
          {
            question: "What if this is urgent but unusual?",
            answer: "The page keeps a human dispatch fallback visible so the visitor is not stranded when the job does not fit a simple booking path.",
          },
          {
            question: "What if it turns out not to be an emergency?",
            answer: "You can switch into the estimate path without losing the momentum you already created.",
          },
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
        audienceLabel: "For homeowners and tenants planning repairs, replacements, and quote comparisons",
        heroHighlights: ["Lower-pressure estimate path", "Only the needed details", "Easy switch to faster help if needed"],
        commitmentNote: "This page is meant to feel calm, clear, and useful for people who are comparing options rather than trying to solve a crisis this minute.",
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
        valueCards: [
          {
            title: "Less friction up front",
            detail: "People can describe the type of work they want before being asked for every possible project detail.",
          },
          {
            title: "More realistic expectations",
            detail: "The page frames the next step as estimate routing, not false instant dispatch promises.",
          },
          {
            title: "Better comparison support",
            detail: "Visitors can stay in evaluation mode while still moving toward a useful next step.",
          },
        ],
        faq: [
          {
            question: "How is this different from emergency plumbing?",
            answer: "This page is for planned jobs and quote comparison, so it uses lighter friction and calmer expectations than the urgent dispatch path.",
          },
          {
            question: "What if the issue becomes urgent while I’m here?",
            answer: "You can switch into the faster emergency path instead of starting over in a different form.",
          },
          {
            question: "Why not ask for every project detail right away?",
            answer: "Because long front-loaded forms reduce completion. This page asks for the minimum needed to keep the estimate path moving.",
          },
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
        audienceLabel: "For property managers, facilities teams, and commercial buyers",
        heroHighlights: ["Structured service intake", "Property-aware coordination", "Commercial-safe language and expectations"],
        commitmentNote: "This page should feel like a capable commercial desk, not a residential emergency form with a business label slapped on it.",
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
        valueCards: [
          {
            title: "Structured for property complexity",
            detail: "Commercial users need room for site, building, and coordination context without wading through homeowner-oriented copy.",
          },
          {
            title: "Designed for repeat work",
            detail: "The path can support both immediate requests and longer-term service relationships.",
          },
          {
            title: "Clear next-step framing",
            detail: "Commercial buyers should know whether they are requesting service, starting a coverage conversation, or moving toward coordinated dispatch.",
          },
        ],
        faq: [
          {
            question: "Is this only for emergencies?",
            answer: "No. It supports urgent building issues, scheduled service, property coordination, and recurring commercial plumbing needs.",
          },
          {
            question: "Why not use the residential flow?",
            answer: "Because property, facilities, and portfolio context materially changes what should be asked and how the next step should be handled.",
          },
          {
            question: "Can this support multi-site or ongoing work?",
            answer: "Yes. The commercial path is the right starting place for anything that goes beyond a simple residential service request.",
          },
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
        audienceLabel: "For plumbers and service teams that want better-fit work",
        heroHighlights: ["Coverage and capacity first", "No junk-lead directory framing", "Operational readiness matters"],
        commitmentNote: "This page should convert serious providers by showing operational relevance and opportunity quality, not by using generic recruiting copy.",
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
        valueCards: [
          {
            title: "Better-fit job promise",
            detail: "Providers are more likely to convert when they see that routing depends on geography, issue fit, and readiness rather than random rotation.",
          },
          {
            title: "Less signup fatigue",
            detail: "The path asks for the information that matters to dispatch quality instead of bloated directory-style profile trivia.",
          },
          {
            title: "Operational upside",
            detail: "Providers can see why accurate coverage and capacity data improves the quality of the opportunities they receive.",
          },
        ],
        faq: [
          {
            question: "What kinds of providers should apply?",
            answer: "Providers with clear service areas, issue fit, and real dispatch capacity are the best fit for this onboarding path.",
          },
          {
            question: "Why ask about coverage and specialties so early?",
            answer: "Because those details are what make the marketplace useful. They improve lead fit, routing accuracy, and response quality.",
          },
          {
            question: "Is this a public directory signup?",
            answer: "No. It is a dispatch-readiness path designed to map providers into the routing engine more intelligently.",
          },
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
        audienceLabel: `For people searching for plumbing help in ${formatZipLabel(zip)}`,
        heroHighlights: ["ZIP-aware trust framing", "Urgent and estimate split", "Local-feeling next step"],
        commitmentNote: "Local search visitors decide quickly whether a page feels relevant. This page should prove locality and usefulness before asking for much effort.",
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
        valueCards: [
          {
            title: "Local relevance fast",
            detail: `Keeping ${formatZipLabel(zip)} visible early reduces the “generic national lead site” feeling that causes search users to bounce.`,
          },
          {
            title: "Better search-intent fit",
            detail: "The page acknowledges that some local visitors need urgent help while others are comparing options or booking planned work.",
          },
          {
            title: "Cleaner next-step trust",
            detail: "Local pages work best when they connect location, service type, and next-step certainty without forcing a long scroll first.",
          },
        ],
        faq: [
          {
            question: "Is this page specific to my area?",
            answer: `Yes. The page is meant to keep ${formatZipLabel(zip)} visible so the visitor feels local fit before they commit to the next step.`,
          },
          {
            question: "What should I do if I need help now?",
            answer: "Use the urgent path first. It is designed to shorten the decision and contact process for active plumbing problems.",
          },
          {
            question: "What if I’m just comparing plumbers in this ZIP?",
            answer: "The local page still supports estimate and commercial branches so comparison-minded visitors can keep moving without false urgency.",
          },
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
