export type NicheDefinition = {
  slug: string;
  label: string;
  summary: string;
  assessmentTitle: string;
  calculatorBias: "time" | "revenue" | "compliance" | "experience";
  recommendedFunnels: string[];
};

export const nicheCatalog: Record<string, NicheDefinition> = {
  general: {
    slug: "general",
    label: "Business Automation",
    summary: "Automation and growth infrastructure for service businesses.",
    assessmentTitle: "Business Automation Assessment",
    calculatorBias: "time",
    recommendedFunnels: ["lead-magnet", "qualification", "chat", "webinar"],
  },
  legal: {
    slug: "legal",
    label: "Legal Operations",
    summary: "Lead capture and intake optimization for law firms.",
    assessmentTitle: "Legal Intake Readiness Assessment",
    calculatorBias: "compliance",
    recommendedFunnels: ["qualification", "authority", "webinar", "retention"],
  },
  "home-services": {
    slug: "home-services",
    label: "Home Services",
    summary: "Quote and booking acceleration for contractors and trades.",
    assessmentTitle: "Home Services Conversion Assessment",
    calculatorBias: "revenue",
    recommendedFunnels: ["qualification", "chat", "checkout", "retention"],
  },
  coaching: {
    slug: "coaching",
    label: "Coaching & Consulting",
    summary: "Qualification and appointment funnels for knowledge businesses.",
    assessmentTitle: "High-Ticket Coaching Funnel Assessment",
    calculatorBias: "experience",
    recommendedFunnels: ["authority", "webinar", "qualification", "continuity"],
  },
};

export function getNiche(slug?: string) {
  return nicheCatalog[slug ?? "general"] ?? nicheCatalog.general;
}
