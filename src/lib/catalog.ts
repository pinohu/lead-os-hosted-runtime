export type NicheDefinition = {
  slug: string;
  label: string;
  summary: string;
  assessmentTitle: string;
  calculatorBias: "time" | "revenue" | "compliance" | "experience";
  recommendedFunnels: string[];
  serviceCategories: string[];
  geographyModel: string[];
  buyerModes: string[];
};

export const nicheCatalog: Record<string, NicheDefinition> = {
  plumbing: {
    slug: "plumbing",
    label: "Plumbing Dispatch",
    summary: "Fast-response plumbing dispatch and estimate routing for urgent and high-intent demand.",
    assessmentTitle: "Plumbing Dispatch Readiness Assessment",
    calculatorBias: "time",
    recommendedFunnels: ["qualification", "chat", "checkout", "retention"],
    serviceCategories: [
      "Emergency plumbing",
      "Drain cleaning",
      "Leak detection and repair",
      "Water heater service",
      "Sewer and line work",
      "Fixture installation",
      "Commercial plumbing",
    ],
    geographyModel: ["state", "county", "city", "ZIP", "service radius", "emergency coverage window"],
    buyerModes: ["solve-now dispatch", "estimate and quote"],
  },
  general: {
    slug: "general",
    label: "Business Automation",
    summary: "Automation and growth infrastructure for service businesses.",
    assessmentTitle: "Business Automation Assessment",
    calculatorBias: "time",
    recommendedFunnels: ["lead-magnet", "qualification", "chat", "webinar"],
    serviceCategories: ["Lead capture", "Qualification", "Automation", "Follow-up"],
    geographyModel: ["market", "segment"],
    buyerModes: ["discover", "compare"],
  },
  legal: {
    slug: "legal",
    label: "Legal Operations",
    summary: "Lead capture and intake optimization for law firms.",
    assessmentTitle: "Legal Intake Readiness Assessment",
    calculatorBias: "compliance",
    recommendedFunnels: ["qualification", "authority", "webinar", "retention"],
    serviceCategories: ["Case intake", "Matter qualification", "Consult scheduling"],
    geographyModel: ["state", "practice area", "jurisdiction"],
    buyerModes: ["urgent intake", "consultation"],
  },
  "home-services": {
    slug: "home-services",
    label: "Home Services",
    summary: "Quote and booking acceleration for contractors and trades.",
    assessmentTitle: "Home Services Conversion Assessment",
    calculatorBias: "revenue",
    recommendedFunnels: ["qualification", "chat", "checkout", "retention"],
    serviceCategories: ["Emergency jobs", "Quotes", "Repairs", "Maintenance"],
    geographyModel: ["state", "county", "city", "ZIP", "service radius"],
    buyerModes: ["solve-now dispatch", "estimate and quote"],
  },
  coaching: {
    slug: "coaching",
    label: "Coaching & Consulting",
    summary: "Qualification and appointment funnels for knowledge businesses.",
    assessmentTitle: "High-Ticket Coaching Funnel Assessment",
    calculatorBias: "experience",
    recommendedFunnels: ["authority", "webinar", "qualification", "continuity"],
    serviceCategories: ["Discovery calls", "Program fit", "Sales follow-up"],
    geographyModel: ["market", "offer", "segment"],
    buyerModes: ["discover", "compare", "book strategy call"],
  },
  "mold-remediation": {
    slug: "mold-remediation",
    label: "Mold Remediation",
    summary: "Assessment, remediation, documentation, and phase-based follow-up for mold and environmental jobs.",
    assessmentTitle: "Mold Remediation Operations Assessment",
    calculatorBias: "compliance",
    recommendedFunnels: ["qualification", "authority", "retention", "rescue"],
    serviceCategories: [
      "Mold inspection",
      "Assessment and scope",
      "Containment and remediation",
      "Clearance and follow-up",
      "Warranty and reinspection",
    ],
    geographyModel: ["state", "county", "city", "ZIP", "service radius", "project coverage area"],
    buyerModes: ["urgent assessment", "compare", "project scheduling"],
  },
  hvac: {
    slug: "hvac",
    label: "HVAC Operations",
    summary: "Emergency service, maintenance agreements, and replacement revenue for HVAC teams.",
    assessmentTitle: "HVAC Operations Assessment",
    calculatorBias: "revenue",
    recommendedFunnels: ["qualification", "chat", "checkout", "retention"],
    serviceCategories: [
      "Emergency HVAC service",
      "Maintenance plans",
      "System repairs",
      "Replacement estimates",
      "Commercial HVAC",
    ],
    geographyModel: ["state", "county", "city", "ZIP", "service radius"],
    buyerModes: ["solve-now dispatch", "maintenance renewal", "estimate and quote"],
  },
  cleaning: {
    slug: "cleaning",
    label: "Cleaning Operations",
    summary: "Recurring scheduling, crew routing, and retention systems for cleaning businesses.",
    assessmentTitle: "Cleaning Operations Assessment",
    calculatorBias: "experience",
    recommendedFunnels: ["qualification", "lead-magnet", "retention", "continuity"],
    serviceCategories: [
      "Residential cleaning",
      "Commercial cleaning",
      "Recurring service",
      "Deep cleans",
      "Move-in and move-out cleaning",
    ],
    geographyModel: ["state", "county", "city", "ZIP", "route"],
    buyerModes: ["discover", "compare", "book recurring service"],
  },
  restoration: {
    slug: "restoration",
    label: "Restoration Operations",
    summary: "Emergency response, project coordination, and documentation-heavy service operations for restoration teams.",
    assessmentTitle: "Restoration Operations Assessment",
    calculatorBias: "compliance",
    recommendedFunnels: ["qualification", "authority", "retention", "rescue"],
    serviceCategories: [
      "Water damage",
      "Fire and smoke restoration",
      "Structural drying",
      "Project documentation",
      "Post-project follow-up",
    ],
    geographyModel: ["state", "county", "city", "ZIP", "service radius", "project coverage area"],
    buyerModes: ["urgent intake", "project coordination", "compare"],
  },
};

export function getNiche(slug?: string) {
  if (!slug) {
    return nicheCatalog.plumbing;
  }
  return nicheCatalog[slug] ?? nicheCatalog.plumbing;
}
