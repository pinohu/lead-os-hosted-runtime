import type {
  PlumbingDispatchMode,
  PlumbingIssueType,
  PlumbingLeadContext,
  PlumbingPropertyType,
  PlumbingUrgencyBand,
} from "./runtime-schema.ts";

type PlumbingSignal = {
  niche?: string;
  service?: string;
  message?: string;
  askingForQuote?: boolean;
  wantsBooking?: boolean;
  prefersChat?: boolean;
  metadata?: Record<string, unknown>;
};

const ISSUE_PATTERNS: Array<{ issueType: PlumbingIssueType; keywords: string[] }> = [
  { issueType: "burst-pipe", keywords: ["burst pipe", "pipe burst", "flooding", "flood", "gushing", "water everywhere"] },
  { issueType: "drain-clog", keywords: ["clog", "clogged", "drain", "toilet backed", "backed up", "slow drain"] },
  { issueType: "water-heater", keywords: ["water heater", "hot water", "no hot water", "heater leaking"] },
  { issueType: "leak", keywords: ["leak", "leaking", "ceiling drip", "pipe leak", "slab leak"] },
  { issueType: "sewer-line", keywords: ["sewer", "line break", "main line", "sewage", "backup", "rooter"] },
  { issueType: "fixture-install", keywords: ["install", "replace faucet", "toilet install", "fixture", "sink install"] },
  { issueType: "commercial-service", keywords: ["commercial", "restaurant", "office", "retail", "facility", "property manager"] },
];

const EMERGENCY_KEYWORDS = [
  "burst",
  "flood",
  "gushing",
  "overflow",
  "overflowing",
  "sewage",
  "backing up",
  "backed up",
  "emergency",
  "asap",
  "immediately",
  "right now",
  "now",
  "urgent",
  "no water",
];

const SAME_DAY_KEYWORDS = [
  "today",
  "same day",
  "this afternoon",
  "tonight",
  "leak",
  "dripping",
  "clogged",
  "no hot water",
  "water heater",
  "toilet",
];

const QUOTE_KEYWORDS = [
  "quote",
  "estimate",
  "pricing",
  "price",
  "cost",
  "compare",
  "book estimate",
];

function normalizeText(...values: Array<string | undefined>) {
  return values
    .filter(Boolean)
    .join(" ")
    .trim()
    .toLowerCase();
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function resolvePropertyType(signal: PlumbingSignal, normalizedText: string): PlumbingPropertyType {
  const metadata = signal.metadata ?? {};
  const explicit = typeof metadata.propertyType === "string" ? metadata.propertyType.toLowerCase() : "";
  if (explicit === "commercial" || explicit === "residential" || explicit === "multi-family") {
    return explicit as PlumbingPropertyType;
  }
  if (includesAny(normalizedText, ["commercial", "office", "restaurant", "storefront", "facility"])) {
    return "commercial";
  }
  if (includesAny(normalizedText, ["apartment", "condo", "duplex", "multi family", "multi-family"])) {
    return "multi-family";
  }
  if (normalizedText) {
    return "residential";
  }
  return "unknown";
}

function resolveIssueType(normalizedText: string): PlumbingIssueType {
  for (const pattern of ISSUE_PATTERNS) {
    if (includesAny(normalizedText, pattern.keywords)) {
      return pattern.issueType;
    }
  }
  return "general-plumbing";
}

function resolveUrgencyBand(signal: PlumbingSignal, normalizedText: string, propertyType: PlumbingPropertyType): PlumbingUrgencyBand {
  if (propertyType === "commercial") {
    return "commercial";
  }
  if (signal.askingForQuote || includesAny(normalizedText, QUOTE_KEYWORDS)) {
    return "estimate";
  }
  if (includesAny(normalizedText, EMERGENCY_KEYWORDS)) {
    return "emergency-now";
  }
  if (signal.wantsBooking || includesAny(normalizedText, SAME_DAY_KEYWORDS)) {
    return "same-day";
  }
  return "maintenance";
}

function resolveDispatchMode(
  urgencyBand: PlumbingUrgencyBand,
  propertyType: PlumbingPropertyType,
  prefersChat: boolean | undefined,
): PlumbingDispatchMode {
  if (propertyType === "commercial" || urgencyBand === "commercial") {
    return "commercial-intake";
  }
  if (prefersChat && urgencyBand === "emergency-now") {
    return "triage";
  }
  if (urgencyBand === "emergency-now") {
    return "dispatch-now";
  }
  if (urgencyBand === "same-day") {
    return "same-day-booking";
  }
  if (urgencyBand === "estimate") {
    return "estimate-path";
  }
  return prefersChat ? "triage" : "estimate-path";
}

function buildReasons(
  urgencyBand: PlumbingUrgencyBand,
  issueType: PlumbingIssueType,
  dispatchMode: PlumbingDispatchMode,
  propertyType: PlumbingPropertyType,
) {
  const reasons = [
    `Issue type classified as ${issueType}.`,
    `Urgency band classified as ${urgencyBand}.`,
    `Dispatch mode selected as ${dispatchMode}.`,
  ];
  if (propertyType !== "unknown") {
    reasons.push(`Property type inferred as ${propertyType}.`);
  }
  return reasons;
}

function buildConfidence(
  normalizedText: string,
  urgencyBand: PlumbingUrgencyBand,
  issueType: PlumbingIssueType,
  propertyType: PlumbingPropertyType,
) {
  let confidence = 0.45;
  if (normalizedText.length >= 16) confidence += 0.15;
  if (urgencyBand === "emergency-now" || urgencyBand === "same-day") confidence += 0.15;
  if (issueType !== "general-plumbing") confidence += 0.15;
  if (propertyType !== "unknown") confidence += 0.1;
  return Math.min(0.95, Number(confidence.toFixed(2)));
}

export function isPlumbingLead(signal: PlumbingSignal) {
  return signal.niche === "plumbing" || signal.niche === "home-services";
}

export function classifyPlumbingLead(signal: PlumbingSignal): PlumbingLeadContext {
  const normalizedText = normalizeText(
    signal.service,
    signal.message,
    typeof signal.metadata?.goalLabel === "string" ? signal.metadata.goalLabel : undefined,
    typeof signal.metadata?.goalId === "string" ? signal.metadata.goalId : undefined,
  );

  const propertyType = resolvePropertyType(signal, normalizedText);
  const issueType = resolveIssueType(normalizedText);
  const urgencyBand = resolveUrgencyBand(signal, normalizedText, propertyType);
  const dispatchMode = resolveDispatchMode(urgencyBand, propertyType, signal.prefersChat);

  return {
    issueType,
    urgencyBand,
    propertyType,
    dispatchMode,
    geo: {
      state: typeof signal.metadata?.state === "string" ? signal.metadata.state : undefined,
      county: typeof signal.metadata?.county === "string" ? signal.metadata.county : undefined,
      city: typeof signal.metadata?.city === "string" ? signal.metadata.city : undefined,
      zip: typeof signal.metadata?.zip === "string" ? signal.metadata.zip : undefined,
      serviceRadius: typeof signal.metadata?.serviceRadius === "string" ? signal.metadata.serviceRadius : undefined,
      emergencyCoverageWindow: typeof signal.metadata?.emergencyCoverageWindow === "string"
        ? signal.metadata.emergencyCoverageWindow
        : undefined,
    },
    confidence: buildConfidence(normalizedText, urgencyBand, issueType, propertyType),
    routingReasons: buildReasons(urgencyBand, issueType, dispatchMode, propertyType),
  };
}
