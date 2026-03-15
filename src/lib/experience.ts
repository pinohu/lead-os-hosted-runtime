import type { NicheDefinition } from "./catalog.ts";
import type { FunnelFamily } from "./runtime-schema.ts";

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
  supportEmail?: string;
  source?: string;
  intent?: "discover" | "compare" | "solve-now";
  returning?: boolean;
  milestone?: string;
  preferredMode?: ExperienceMode | string;
  score?: number;
  userAgent?: string;
  referrer?: string;
};

export type ExperienceProfile = {
  family: FunnelFamily;
  mode: ExperienceMode;
  device: "mobile" | "desktop";
  experimentId: string;
  variantId: string;
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

function buildDestination(family: FunnelFamily, niche: NicheDefinition) {
  switch (family) {
    case "qualification":
      return `/assess/${niche.slug}?mode=booking-first`;
    case "chat":
      return `/calculator?niche=${niche.slug}&mode=chat-first`;
    case "checkout":
      return `/offers/${niche.slug}?mode=form-first`;
    default:
      return `/funnel/${family}?niche=${niche.slug}`;
  }
}

function buildProofSignals(niche: NicheDefinition, family: FunnelFamily, mode: ExperienceMode) {
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

function buildObjections(niche: NicheDefinition, mode: ExperienceMode) {
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

function buildDiscoveryOptions(niche: NicheDefinition, family: FunnelFamily, mode: ExperienceMode): ExperiencePromptOption[] {
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

function buildProgressSteps(mode: ExperienceMode, family: FunnelFamily) {
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

function buildFieldOrder(mode: ExperienceMode) {
  if (mode === "booking-first") {
    return ["firstName", "email", "phone", "company"] as const;
  }
  if (mode === "chat-first") {
    return ["firstName", "email", "phone"] as const;
  }
  return ["firstName", "email", "company", "phone"] as const;
}

export function resolveExperienceProfile(input: ExperienceInput): ExperienceProfile {
  const mode = buildModeByContext(input);
  const family = buildDefaultFamily(input);
  const device = inferDeviceClass(input.userAgent);
  const destination = buildDestination(family, input.niche);
  const plumbingLike = isPlumbingLikeNiche(input.niche);
  const returnOffer = input.returning
    ? plumbingLike
      ? "You are not starting over. We will resume with the lightest useful next step and preserve your job context."
      : "You are not starting over. We will resume with a lighter second-touch ask and skip repeated context."
    : plumbingLike
      ? "If you are not ready to book now, LeadOS keeps the second-touch path light so the job does not go cold."
      : "If you come back, LeadOS shifts from first-touch clarity into milestone-two trust building automatically.";

  return {
    family,
    mode,
    device,
    experimentId: `${input.niche.slug}:${family}:${device}`,
    variantId: `${input.niche.slug}:${family}:${mode}:${device}`,
    heroTitle:
      plumbingLike
        ? input.returning
          ? "Resume your plumbing request without starting over"
          : "Get a plumber confirmed fast without dead-end forms"
        : input.returning
        ? `${input.niche.label} momentum, resumed without friction`
        : `${input.niche.label} growth paths that adapt to visitor intent`,
    heroSummary:
      plumbingLike && mode === "booking-first"
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
    secondaryActionLabel: "Talk to a human",
    secondaryActionHref: `mailto:${input.supportEmail ?? "support@example.com"}`,
    trustPromise: plumbingLike
      ? "No dead-end quote form. We bias for fast routing, clear next steps, and a human fallback when the job needs it."
      : "No generic bait-and-switch. The next step adapts to niche, intent, return state, and contact preference.",
    progressLabel:
      plumbingLike
        ? input.returning
          ? "We already have your context. The goal now is getting you to the fastest useful human or booking step."
          : "The first interaction should confirm urgency, location, and the fastest credible next step."
        : input.returning
        ? "You are on visit two or beyond. The goal is momentum, not re-explaining yourself."
        : "The first interaction should feel clear, light, and immediately useful.",
    anxietyReducer: plumbingLike
      ? "You can take the fast booking path, ask for dispatch help, or switch to a lighter estimate path if the job is not urgent."
      : "You can stop at any point, ask for a human path, or take the lighter next step instead of the heavier one.",
    proofSignals: buildProofSignals(input.niche, family, mode),
    objectionBlocks: buildObjections(input.niche, mode),
    discoveryPrompt:
      mode === "calculator-first"
        ? "Which upside would make this worth exploring right now?"
        : "Which outcome matters most first?",
    discoveryOptions: buildDiscoveryOptions(input.niche, family, mode),
    fieldOrder: [...buildFieldOrder(mode)],
    progressSteps: buildProgressSteps(mode, family),
    supportingSignals: [
      input.referrer ? `Arrived from ${new URL(input.referrer).hostname}` : plumbingLike ? "Adaptive by urgency, service type, and entry source" : "Adaptive by source and referral context",
      device === "mobile" ? "Mobile-optimized path with lower cognitive load" : "Desktop path can support richer proof and comparison",
      ...(plumbingLike ? [`Service model: ${input.niche.serviceCategories.slice(0, 3).join(", ")}`] : []),
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
