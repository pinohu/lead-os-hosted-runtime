import type { NicheDefinition } from "./catalog.ts";
import { resolveExperienceExperiment } from "./experiments.ts";
import type { FunnelFamily, MarketplaceAudience } from "./runtime-schema.ts";

export type ExperienceMode =
  | "chat-first"
  | "form-first"
  | "calculator-first"
  | "webinar-first"
  | "booking-first";

export type ExperiencePromptOption = {
  id: string;
  label: string;
  description: string;
  signals: {
    wantsBooking?: boolean;
    wantsCheckout?: boolean;
    prefersChat?: boolean;
    contentEngaged?: boolean;
  };
};

export type ExperienceInput = {
  family?: FunnelFamily;
  niche: NicheDefinition;
  audience?: MarketplaceAudience;
  supportEmail?: string;
  source?: string;
  intent?: "discover" | "compare" | "solve-now";
  returning?: boolean;
  milestone?: string;
  preferredMode?: ExperienceMode | string;
  assignmentKey?: string;
  score?: number;
  userAgent?: string;
  referrer?: string;
};

export type ExperienceProfile = {
  family: FunnelFamily;
  audience: MarketplaceAudience;
  mode: ExperienceMode;
  device: "mobile" | "desktop";
  experimentId: string;
  variantId: string;
  randomizedExperiment: boolean;
  holdout: boolean;
  heroTitle: string;
  heroSummary: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel: string;
  secondaryActionHref: string;
  trustPromise: string;
  progressLabel: string;
  anxietyReducer: string;
  proofSignals: string[];
  objectionBlocks: string[];
  discoveryPrompt: string;
  discoveryOptions: ExperiencePromptOption[];
  fieldOrder: Array<"firstName" | "email" | "phone" | "company">;
  progressSteps: Array<{ label: string; detail: string }>;
  supportingSignals: string[];
  returnOffer: string;
};

export const EXPERIENCE_HEURISTICS = [
  "Show one dominant next step and one safe fallback.",
  "Explain what happens after every action before asking for more data.",
  "Favor progressive profiling over long front-loaded forms.",
  "Mirror the visitor's niche, goal, and readiness in the copy.",
  "Use milestone-two and milestone-three return logic instead of one-touch conversion pressure.",
  "Keep visible proof close to the ask and anxiety relief close to the submit action.",
] as const;

const MODE_LABELS: Record<ExperienceMode, string> = {
  "chat-first": "Talk it through",
  "form-first": "Get a tailored plan",
  "calculator-first": "Estimate your upside",
  "webinar-first": "See the strategy first",
  "booking-first": "Book the fastest route",
};

function isPlumbingLikeNiche(niche: NicheDefinition) {
  return niche.slug === "plumbing" || niche.slug === "home-services";
}

function isProviderAudience(input: ExperienceInput) {
  return input.audience === "provider";
}

function inferDeviceClass(userAgent?: string) {
  return /android|iphone|ipad|mobile/i.test(userAgent ?? "") ? "mobile" : "desktop";
}

function sanitizeMode(value?: string): ExperienceMode | null {
  switch (value) {
    case "chat-first":
    case "form-first":
    case "calculator-first":
    case "webinar-first":
    case "booking-first":
      return value;
    default:
      return null;
  }
}

function buildModeByContext(input: ExperienceInput): ExperienceMode {
  const explicitMode = sanitizeMode(input.preferredMode);
  if (explicitMode) return explicitMode;

  if (isProviderAudience(input)) {
    if (input.source === "chat" || input.source === "messenger") {
      return "chat-first";
    }
    return "form-first";
  }

  if (isPlumbingLikeNiche(input.niche) && input.intent !== "compare" && input.intent !== "discover") {
    if ((input.score ?? 0) >= 40 || !input.returning) {
      return "booking-first";
    }
  }
  if (input.returning || input.milestone === "lead-m2-return-engaged") {
    return "form-first";
  }
  if (input.family === "qualification" || input.intent === "solve-now" || (input.score ?? 0) >= 85) {
    return "booking-first";
  }
  if (
    input.family === "chat" ||
    input.source === "chat" ||
    input.source === "messenger" ||
    inferDeviceClass(input.userAgent) === "mobile"
  ) {
    return "chat-first";
  }
  if (input.family === "webinar" || input.family === "authority" || input.source === "blog" || input.source === "content") {
    return "webinar-first";
  }
  if (
    input.family === "lead-magnet" &&
    (input.niche.calculatorBias === "revenue" || input.niche.calculatorBias === "time")
  ) {
    return "calculator-first";
  }
  return "form-first";
}

function buildDefaultFamily(input: ExperienceInput): FunnelFamily {
  if (input.family) return input.family;
  if (isProviderAudience(input)) {
    return "qualification";
  }
  switch (buildModeByContext(input)) {
    case "booking-first":
      return "qualification";
    case "chat-first":
      return "chat";
    case "webinar-first":
      return "webinar";
    case "calculator-first":
      return "lead-magnet";
    case "form-first":
    default:
      return "lead-magnet";
  }
}

function buildDestination(family: FunnelFamily, niche: NicheDefinition, audience: MarketplaceAudience) {
  const audienceQuery = audience === "provider" ? "&audience=provider" : "";
  switch (family) {
    case "qualification":
      return audience === "provider"
        ? `/assess/${niche.slug}?mode=form-first&audience=provider`
        : `/assess/${niche.slug}?mode=booking-first`;
    case "chat":
      return `/calculator?niche=${niche.slug}&mode=chat-first${audienceQuery}`;
    case "checkout":
      return `/offers/${niche.slug}?mode=form-first${audienceQuery}`;
    default:
      return `/funnel/${family}?niche=${niche.slug}${audienceQuery}`;
  }
}

function buildProofSignals(
  niche: NicheDefinition,
  family: FunnelFamily,
  mode: ExperienceMode,
  audience: MarketplaceAudience,
) {
  if (audience === "provider" && isPlumbingLikeNiche(niche)) {
    return [
      "Apply once and route leads by service area, issue fit, and live capacity",
      "Show emergency coverage, specialties, and response readiness before jobs are assigned",
      family === "qualification" ? "Provider onboarding and dispatch-readiness path already wired" : "Marketplace supply path already connected to LeadOS routing",
      mode === "chat-first" ? "Human-assisted network join path for complex provider onboarding" : "Faster self-serve network entry for plumbers ready to receive jobs",
    ];
  }

  if (isPlumbingLikeNiche(niche)) {
    return [
      "Urgent plumbing routing with booking and dispatch-first logic",
      "Licensed and insured trust framing near the first ask",
      family === "qualification" ? "Booking, backup routing, and estimate recovery are already wired" : "Phone, chat, and follow-up stay ready for urgent jobs",
      mode === "chat-first" ? "Talk-to-dispatch fallback for low-form visitors" : "Fast-path capture built for mobile emergency traffic",
    ];
  }

  return [
    `${niche.label} copy and next-step logic`,
    "Milestone-two and milestone-three return automation",
    family === "qualification" ? "Booking, proposal, and follow-up already wired" : "Multi-channel follow-up already wired",
    mode === "chat-first" ? "Low-friction conversational path" : "Adaptive form and content path",
  ];
}

function buildObjections(niche: NicheDefinition, mode: ExperienceMode, audience: MarketplaceAudience) {
  if (audience === "provider" && isPlumbingLikeNiche(niche)) {
    return [
      "You are not joining a junk-lead directory. LeadOS is built to route jobs by urgency, fit, and operational readiness.",
      mode === "chat-first"
        ? "If your coverage, specialties, or availability are unusual, you can still join through a guided onboarding conversation."
        : "If you are ready, we keep the network-join path short and focused on coverage, capacity, and job fit.",
    ];
  }

  const nicheSpecific =
    niche.slug === "legal" ? "You will not get a generic intake script. The questions adapt to risk, urgency, and case-fit." :
    niche.slug === "plumbing" ? "We bias for fast-response dispatch, clear next steps, and fewer dead-end form completions on urgent jobs." :
    niche.slug === "home-services" ? "We bias for fast-response booking and quote recovery so good jobs do not cool off." :
    niche.slug === "coaching" ? "The flow is built to protect show rate and fit, not just inflate call volume." :
    "The system adapts the next step so people do not get pushed into the wrong funnel.";

  const modeSpecific =
    mode === "booking-first" ? "If you are ready, we shorten the path and get you to the right booking action quickly." :
    mode === "webinar-first" ? "If you are skeptical, we show the proof and method before asking for a commitment." :
    mode === "chat-first" ? "If you dislike forms, you can still qualify through a guided conversation." :
    "If you are not ready yet, we keep the next ask light and useful.";

  return [nicheSpecific, modeSpecific];
}

function buildDiscoveryOptions(
  niche: NicheDefinition,
  family: FunnelFamily,
  mode: ExperienceMode,
  audience: MarketplaceAudience,
): ExperiencePromptOption[] {
  if (audience === "provider" && isPlumbingLikeNiche(niche)) {
    return [
      {
        id: "emergency-jobs",
        label: "Get more emergency jobs",
        description: "Show that you can respond quickly to urgent plumbing demand in your service area.",
        signals: {},
      },
      {
        id: "fill-schedule",
        label: "Fill open schedule",
        description: "Bring in more same-day and estimate work without wasting time on bad-fit leads.",
        signals: { contentEngaged: true },
      },
      {
        id: "expand-coverage",
        label: "Expand coverage",
        description: "Add more ZIPs, issue types, or commercial capacity to your dispatch footprint.",
        signals: { prefersChat: mode === "chat-first" },
      },
    ];
  }

  const commonOptions: ExperiencePromptOption[] = [
    {
      id: "speed",
      label: "Move faster",
      description: "Reduce lag between interest and the next qualified action.",
      signals: { wantsBooking: family === "qualification", contentEngaged: family === "webinar" },
    },
    {
      id: "fit",
      label: "Improve lead quality",
      description: "Filter for higher-fit opportunities before the handoff.",
      signals: { contentEngaged: true },
    },
    {
      id: "follow-up",
      label: "Recover more opportunities",
      description: "Bring back warm prospects who would otherwise drift away.",
      signals: { prefersChat: mode === "chat-first" },
    },
  ];

  if (niche.slug === "legal") {
    return [
      {
        id: "intake",
        label: "Reduce intake drop-off",
        description: "Keep prospective clients moving without adding compliance risk.",
        signals: { wantsBooking: true },
      },
      {
        id: "case-fit",
        label: "Qualify higher-value cases",
        description: "Make your second touch feel relevant and serious.",
        signals: { contentEngaged: true },
      },
      commonOptions[2],
    ];
  }

  if (niche.slug === "home-services") {
    return [
      {
        id: "quotes",
        label: "Book more estimates",
        description: "Turn fast-response leads into more scheduled opportunities.",
        signals: { wantsBooking: true },
      },
      {
        id: "response",
        label: "Respond before competitors",
        description: "Shorten time-to-first-value for urgent homeowners.",
        signals: { prefersChat: true },
      },
      commonOptions[2],
    ];
  }

  if (niche.slug === "plumbing") {
    return [
      {
        id: "dispatch-now",
        label: "Get a plumber confirmed fast",
        description: "Shorten the path to booking or dispatch for urgent issues.",
        signals: { wantsBooking: true },
      },
      {
        id: "estimate",
        label: "Book an estimate",
        description: "Route non-urgent jobs into a clearer quote and scheduling path.",
        signals: { wantsBooking: true, contentEngaged: true },
      },
      {
        id: "dispatch-help",
        label: "Talk to dispatch",
        description: "Use a human-assisted path when the job is urgent or unusual.",
        signals: { prefersChat: true },
      },
    ];
  }

  if (niche.slug === "coaching") {
    return [
      {
        id: "show-rate",
        label: "Raise show rate",
        description: "Use better qualification and milestone-two trust events.",
        signals: { wantsBooking: true },
      },
      {
        id: "authority",
        label: "Warm skeptical prospects",
        description: "Lead with insight, proof, and selective friction.",
        signals: { contentEngaged: true },
      },
      commonOptions[2],
    ];
  }

  return commonOptions;
}

function buildProgressSteps(mode: ExperienceMode, family: FunnelFamily, audience: MarketplaceAudience) {
  if (audience === "provider") {
    const stepTwo = mode === "chat-first"
      ? "We clarify your service area, specialties, and response model through a guided onboarding conversation."
      : "We capture only the roster details needed to route jobs by fit, capacity, and geography.";
    const stepThree =
      family === "qualification"
        ? "Qualified providers move into readiness review, dispatch mapping, and network activation."
        : "Your provider profile stays ready for follow-up and dispatch activation.";
    return [
      { label: "Choose the kind of work you want", detail: "This keeps the supply-side path aligned with the jobs you actually want to receive." },
      { label: "Show your coverage and capacity", detail: stepTwo },
      { label: "Activate your provider path", detail: stepThree },
    ];
  }

  const stepTwo =
    mode === "chat-first" ? "We adapt the questions as answers come in." :
    mode === "calculator-first" ? "We turn your inputs into an immediate upside estimate." :
    mode === "webinar-first" ? "We surface the best proof and next learning asset first." :
    "We tailor the next step around your intent and milestone state.";

  const stepThree =
    family === "qualification" ? "Qualified visitors go straight to assessment, booking, or proposal." :
    family === "checkout" ? "High-intent visitors get the shortest path to the offer and recovery ladder." :
    "Your second-touch and third-touch follow-up paths are preloaded.";

  return [
    { label: "Tell us the outcome you want", detail: "One quick choice keeps the path relevant from the start." },
    { label: "See a tailored next step", detail: stepTwo },
    { label: "Keep momentum into visit two and three", detail: stepThree },
  ];
}

function buildFieldOrder(mode: ExperienceMode, audience: MarketplaceAudience) {
  if (audience === "provider") {
    return ["firstName", "company", "email", "phone"] as const;
  }
  if (mode === "booking-first") {
    return ["firstName", "email", "phone", "company"] as const;
  }
  if (mode === "chat-first") {
    return ["firstName", "email", "phone"] as const;
  }
  return ["firstName", "email", "company", "phone"] as const;
}

export function resolveExperienceProfile(input: ExperienceInput): ExperienceProfile {
  const audience = input.audience ?? "client";
  const baseMode = buildModeByContext(input);
  const family = buildDefaultFamily(input);
  const device = inferDeviceClass(input.userAgent);
  const assignment = resolveExperienceExperiment({
    assignmentKey: input.assignmentKey,
    nicheSlug: input.niche.slug,
    family,
    audience,
    device,
    baseMode,
  });
  const mode = assignment.mode;
  const destination = buildDestination(family, input.niche, audience);
  const plumbingLike = isPlumbingLikeNiche(input.niche);
  const returnOffer = audience === "provider"
    ? input.returning
      ? "You are not starting over. We will resume with your coverage, specialty, and capacity context intact."
      : "If you are not ready to finish onboarding now, LeadOS keeps your provider path warm so you can come back without re-entering everything."
    : input.returning
    ? plumbingLike
      ? "You are not starting over. We will resume with the lightest useful next step and preserve your job context."
      : "You are not starting over. We will resume with a lighter second-touch ask and skip repeated context."
    : plumbingLike
      ? "If you are not ready to book now, LeadOS keeps the second-touch path light so the job does not go cold."
      : "If you come back, LeadOS shifts from first-touch clarity into milestone-two trust building automatically.";

  return {
    family,
    audience,
    mode,
    device,
    experimentId: assignment.experimentId,
    variantId: assignment.variantId,
    randomizedExperiment: assignment.randomized,
    holdout: assignment.holdout,
    heroTitle:
      audience === "provider" && plumbingLike
        ? input.returning
          ? "Resume your provider setup without losing your coverage profile"
          : "Join the plumbing dispatch network with the jobs you actually want"
      : plumbingLike
        ? input.returning
          ? "Resume your plumbing request without starting over"
          : "Get a plumber confirmed fast without dead-end forms"
        : input.returning
        ? `${input.niche.label} momentum, resumed without friction`
        : `${input.niche.label} growth paths that adapt to visitor intent`,
    heroSummary:
      input.niche.slug === "plumbing" && assignment.variantId === "dispatch-proof"
        ? "This version keeps proof, speed, and local trust signals tight to the first ask so urgent plumbing buyers can move fast with confidence."
      : input.niche.slug === "plumbing" && assignment.variantId === "rapid-triage"
        ? "This version opens with a faster guided dispatch conversation so urgent mobile visitors can move before the job cools off."
      : input.niche.slug === "plumbing" && assignment.variantId === "comparison-assist"
        ? "This version gives estimate-minded visitors a calmer comparison path before the stronger booking ask."
      : audience === "provider" && assignment.variantId === "coverage-proof"
        ? "This version leads with service area, job fit, and capacity proof so serious providers can see how the network routes work."
      : audience === "provider" && assignment.variantId === "ops-guided"
        ? "This version uses a more guided onboarding path for providers with complex specialties, coverage, or dispatch constraints."
      : audience === "provider" && assignment.holdout
        ? "This holdout path keeps the onboarding flow simple so LeadOS can compare richer provider onboarding against a lean baseline."
      :
      audience === "provider" && plumbingLike
        ? mode === "chat-first"
          ? "For providers with complex coverage or specialty constraints, we keep a guided onboarding path open instead of forcing a brittle signup form."
          : "For plumbers and service teams, we bias the first interaction toward service area fit, live capacity, and dispatch-readiness instead of generic directory signup."
      : plumbingLike && mode === "booking-first"
        ? "For urgent plumbing demand, we bias the first interaction toward dispatch speed, booking readiness, and clear next-step certainty."
        : plumbingLike && mode === "chat-first"
        ? "For unusual or urgent jobs, we keep a dispatch-style conversation path open instead of forcing a dead-end form."
        : plumbingLike
        ? "For estimate and quote traffic, we keep the path light while preserving urgency, location, and service context."
        : mode === "booking-first"
        ? "For ready-to-move buyers, we keep the path short, credible, and qualification-aware."
        : mode === "chat-first"
        ? "For lower-form-tolerance visitors, we lead with a conversation and still capture real buying signals."
        : mode === "webinar-first"
        ? "For skeptical or education-driven visitors, we build trust before the heavier ask."
        : mode === "calculator-first"
        ? "For outcome-focused visitors, we quantify upside first so the next step feels earned."
        : "For most qualified visitors, the fastest win is a tailored plan that explains exactly what happens next.",
    primaryActionLabel: MODE_LABELS[mode],
    primaryActionHref: destination,
    secondaryActionLabel: audience === "provider" ? "Talk to network ops" : "Talk to a human",
    secondaryActionHref: `mailto:${input.supportEmail ?? "support@example.com"}`,
    trustPromise: audience === "provider" && plumbingLike
      ? "No directory-style bait. We collect only what is needed to map your coverage, specialties, and readiness to live plumbing demand."
      : plumbingLike
      ? "No dead-end quote form. We bias for fast routing, clear next steps, and a human fallback when the job needs it."
      : "No generic bait-and-switch. The next step adapts to niche, intent, return state, and contact preference.",
    progressLabel:
      audience === "provider" && plumbingLike
        ? input.returning
          ? "We already have your provider context. The goal now is moving you toward dispatch-readiness without duplicating setup work."
          : "The first interaction should confirm where you work, what jobs you want, and how ready you are to take dispatch traffic."
      : plumbingLike
        ? input.returning
          ? "We already have your context. The goal now is getting you to the fastest useful human or booking step."
          : "The first interaction should confirm urgency, location, and the fastest credible next step."
        : input.returning
        ? "You are on visit two or beyond. The goal is momentum, not re-explaining yourself."
        : "The first interaction should feel clear, light, and immediately useful.",
    anxietyReducer: audience === "provider" && plumbingLike
      ? "You can join the network, ask for a human onboarding path, or come back later without losing your service-area and capacity details."
      : plumbingLike
      ? "You can take the fast booking path, ask for dispatch help, or switch to a lighter estimate path if the job is not urgent."
      : "You can stop at any point, ask for a human path, or take the lighter next step instead of the heavier one.",
    proofSignals: buildProofSignals(input.niche, family, mode, audience),
    objectionBlocks: buildObjections(input.niche, mode, audience),
    discoveryPrompt:
      audience === "provider"
        ? "Which provider outcome matters most first?"
      : mode === "calculator-first"
        ? "Which upside would make this worth exploring right now?"
        : "Which outcome matters most first?",
    discoveryOptions: buildDiscoveryOptions(input.niche, family, mode, audience),
    fieldOrder: [...buildFieldOrder(mode, audience)],
    progressSteps: buildProgressSteps(mode, family, audience),
    supportingSignals: [
      audience === "provider" ? "Two-sided marketplace path for plumbers and service providers" : "Two-sided marketplace path for homeowners, tenants, and clients",
      input.referrer ? `Arrived from ${new URL(input.referrer).hostname}` : plumbingLike ? "Adaptive by urgency, service type, and entry source" : "Adaptive by source and referral context",
      device === "mobile" ? "Mobile-optimized path with lower cognitive load" : "Desktop path can support richer proof and comparison",
      ...(plumbingLike ? [`Service model: ${input.niche.serviceCategories.slice(0, 3).join(", ")}`] : []),
      assignment.randomized ? `Experiment assignment: ${assignment.variantId}${assignment.holdout ? " (holdout)" : ""}` : "Deterministic default experience path",
      returnOffer,
    ],
    returnOffer,
  };
}

export function buildExperienceManifest(niche: NicheDefinition) {
  return {
    heuristics: EXPERIENCE_HEURISTICS,
    supportedModes: ["chat-first", "form-first", "calculator-first", "webinar-first", "booking-first"],
    defaults: resolveExperienceProfile({ niche }),
  };
}
