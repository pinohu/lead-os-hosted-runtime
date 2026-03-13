import { getNiche } from "@/lib/catalog";

export type VisitorSignal = {
  source?: string;
  page?: string;
  niche?: string;
  hasEmail?: boolean;
  returning?: boolean;
  askingForQuote?: boolean;
};

export type Decision = {
  blueprint: string;
  destination: string;
  ctaLabel: string;
  reason: string;
};

export function decideNextStep(signal: VisitorSignal): Decision {
  const niche = getNiche(signal.niche);

  if (signal.askingForQuote) {
    return {
      blueprint: "appointment-generator",
      destination: `/assess/${niche.slug}`,
      ctaLabel: "Start Qualification",
      reason: "Quote-seeking visitors should be qualified immediately.",
    };
  }

  if (signal.hasEmail && signal.returning) {
    return {
      blueprint: "documentary-vsl",
      destination: `/services?focus=${niche.slug}`,
      ctaLabel: "View Recommended Solution",
      reason: "Known returning visitors should be shown proof and solution framing.",
    };
  }

  if (signal.source === "blog" || signal.source === "content") {
    return {
      blueprint: "lead-gen",
      destination: `/assess/${niche.slug}`,
      ctaLabel: "Get Your Free Assessment",
      reason: "Content traffic converts better through a diagnostic gateway.",
    };
  }

  return {
    blueprint: "chatbot-lead",
    destination: `/calculator?niche=${niche.slug}`,
    ctaLabel: "See Your ROI",
    reason: "Cold traffic should get fast value and a measurable next step.",
  };
}
