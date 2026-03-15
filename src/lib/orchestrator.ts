import { getNiche } from "./catalog.ts";
import { getRecipeForFamily } from "./automation.ts";
import { getDefaultFunnelGraph } from "./funnel-library.ts";
import { classifyPlumbingLead, isPlumbingLead } from "./plumbing-os.ts";
import type { FunnelFamily, MarketplaceAudience, PlumbingLeadContext } from "./runtime-schema.ts";
import { tenantConfig } from "./tenant.ts";

export type DecisionSignal = {
  source?: string;
  service?: string;
  niche?: string;
  message?: string;
  metadata?: Record<string, unknown>;
  preferredFamily?: FunnelFamily;
  hasEmail?: boolean;
  hasPhone?: boolean;
  returning?: boolean;
  askingForQuote?: boolean;
  wantsBooking?: boolean;
  wantsCheckout?: boolean;
  prefersChat?: boolean;
  contentEngaged?: boolean;
  score?: number;
  marketplaceAudience?: MarketplaceAudience;
};

export type NextStepDecision = {
  family: FunnelFamily;
  blueprintId: string;
  destination: string;
  reason: string;
  ctaLabel: string;
  recommendedChannels: string[];
  operatingModel: "generic-growth" | "plumbing-dispatch" | "plumbing-provider-network";
  plumbing?: PlumbingLeadContext;
  traceDefaults: {
    service: string;
    niche: string;
    blueprintId: string;
    stepId: string;
  };
  recipe: ReturnType<typeof getRecipeForFamily>;
};

function getMarketplaceAudience(signal: DecisionSignal): MarketplaceAudience {
  if (signal.marketplaceAudience === "provider") {
    return "provider";
  }
  if (signal.metadata?.marketplaceAudience === "provider") {
    return "provider";
  }
  return "client";
}

function buildDestination(family: FunnelFamily, niche: string, audience: MarketplaceAudience) {
  const audienceQuery = audience === "provider" ? "&audience=provider" : "";
  switch (family) {
    case "qualification":
      return audience === "provider" ? `/assess/${niche}?audience=provider` : `/assess/${niche}`;
    case "chat":
      return `/calculator?niche=${niche}&mode=chat${audienceQuery}`;
    case "checkout":
      return `/offers/${niche}${audience === "provider" ? "?audience=provider" : ""}`;
    default:
      return `/funnel/${family}?niche=${niche}${audienceQuery}`;
  }
}

function decidePlumbingFamily(signal: DecisionSignal, plumbing: PlumbingLeadContext): { family: FunnelFamily; reason: string } {
  if (signal.preferredFamily) {
    return {
      family: signal.preferredFamily,
      reason: "AI routing override provided; honoring the preferred funnel family.",
    };
  }
  if (plumbing.dispatchMode === "triage" || signal.prefersChat) {
    return {
      family: "chat",
      reason: `Plumbing urgency classified as ${plumbing.urgencyBand}; use a guided triage conversation before booking.`,
    };
  }
  return {
    family: "qualification",
    reason: `Plumbing urgency classified as ${plumbing.urgencyBand}; route into the fastest dispatch and booking path.`,
  };
}

function decideFamily(signal: DecisionSignal): { family: FunnelFamily; reason: string; plumbing?: PlumbingLeadContext; operatingModel: NextStepDecision["operatingModel"] } {
  const audience = getMarketplaceAudience(signal);
  if (audience === "provider" && (signal.niche === "plumbing" || signal.niche === "home-services")) {
    return {
      family: signal.preferredFamily ?? "qualification",
      reason: "Provider-network audience detected; route into supplier onboarding instead of homeowner dispatch.",
      operatingModel: "plumbing-provider-network",
    };
  }
  if (isPlumbingLead(signal)) {
    const plumbing = classifyPlumbingLead(signal);
    const plumbingDecision = decidePlumbingFamily(signal, plumbing);
    return {
      ...plumbingDecision,
      plumbing,
      operatingModel: "plumbing-dispatch",
    };
  }

  if (signal.preferredFamily) {
    return {
      family: signal.preferredFamily,
      reason: "AI routing override provided; honoring the preferred funnel family.",
      operatingModel: "generic-growth",
    };
  }
  if (signal.wantsCheckout) {
    return { family: "checkout", reason: "Checkout intent detected; route directly into commerce flow.", operatingModel: "generic-growth" };
  }
  if (signal.askingForQuote || signal.wantsBooking) {
    return { family: "qualification", reason: "High-intent consult signal detected; move into qualification and booking.", operatingModel: "generic-growth" };
  }
  if (signal.prefersChat || signal.source === "chat" || signal.source === "messenger") {
    return { family: "chat", reason: "Conversational entry detected; use the chat qualification funnel.", operatingModel: "generic-growth" };
  }
  if (signal.source === "webinar" || signal.contentEngaged) {
    return { family: "webinar", reason: "Educational engagement detected; route into a webinar-style authority path.", operatingModel: "generic-growth" };
  }
  if (signal.source === "blog" || signal.source === "content" || signal.returning) {
    return { family: "authority", reason: "Content-led or returning traffic benefits from an authority bridge.", operatingModel: "generic-growth" };
  }
  if ((signal.score ?? 0) >= 85 && signal.hasPhone) {
    return { family: "qualification", reason: "Hot lead with phone available; prioritize consult booking.", operatingModel: "generic-growth" };
  }
  return { family: "lead-magnet", reason: "Default to a front-end capture path with nurture and offer routing.", operatingModel: "generic-growth" };
}

export function decideNextStep(signal: DecisionSignal): NextStepDecision {
  const niche = getNiche(signal.niche);
  const audience = getMarketplaceAudience(signal);
  const { family, reason, plumbing, operatingModel } = decideFamily(signal);
  const graph = getDefaultFunnelGraph(tenantConfig.tenantId, family);
  const recipe = getRecipeForFamily(family);
  const recommendedChannels = [
    signal.hasPhone ? "whatsapp" : null,
    signal.hasPhone ? "sms" : null,
    signal.hasEmail ? "email" : "web",
  ].filter(Boolean) as string[];

  return {
    family,
    blueprintId: graph.id,
    destination: buildDestination(family, niche.slug, audience),
    reason,
    operatingModel,
    plumbing,
    ctaLabel:
      operatingModel === "plumbing-provider-network"
        ? "Continue provider onboarding"
      : family === "qualification" && plumbing
        ? plumbing.dispatchMode === "estimate-path" ? "Book Estimate"
        : plumbing.dispatchMode === "commercial-intake" ? "Start Commercial Intake"
        : "Start Dispatch"
      : family === "qualification" ? "Start Assessment"
      : family === "checkout" ? "View Offer"
      : family === "chat" ? "Continue in Chat"
      : "See Next Step",
    recommendedChannels,
    traceDefaults: {
      service: signal.service ?? tenantConfig.defaultService,
      niche: niche.slug,
      blueprintId: graph.id,
      stepId: graph.nodes[0]?.id ?? `${family}-entry`,
    },
    recipe,
  };
}
