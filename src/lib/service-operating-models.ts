export type OperatingModelPriority = {
  rank: number;
  title: string;
  businessValue: string;
  plumbing: string;
  moldRemediation: string;
  otherServiceBusinesses: string;
};

export type VerticalOperatingModel = {
  slug: string;
  label: string;
  tagline: string;
  corePromise: string;
  schedulingMode: string;
  pricingModel: string;
  documentationBias: string;
  repeatRevenueModel: string;
  jobFlow: string[];
  profitabilityViews: string[];
  documentationNeeds: string[];
  automationFocus: string[];
};

export const universalOperatingPriorities: OperatingModelPriority[] = [
  {
    rank: 1,
    title: "Call-to-cash system",
    businessValue: "One connected flow from lead or call through booking, work completion, invoicing, and payment.",
    plumbing: "Lead to book to dispatch to invoice to pay with no leaks.",
    moldRemediation: "Lead to assess to quote to remediate to invoice to pay with phase-aware handoff.",
    otherServiceBusinesses: "Lead to schedule to perform to invoice to pay without broken transitions.",
  },
  {
    rank: 2,
    title: "Dispatch and schedule control",
    businessValue: "Protect labor utilization and daily job capacity.",
    plumbing: "Technicians, trucks, time slots, and urgent dispatch.",
    moldRemediation: "Crew allocation, equipment scheduling, and multi-day project windows.",
    otherServiceBusinesses: "Recurring slots, maintenance windows, or emergency same-day routing depending on vertical.",
  },
  {
    rank: 3,
    title: "Pricing and estimating discipline",
    businessValue: "Consistent quoting, margin protection, and customer confidence.",
    plumbing: "Flat-rate price book and standardized estimates.",
    moldRemediation: "Scope-based pricing with assessment, severity, containment, and remediation templates.",
    otherServiceBusinesses: "Price books, scope templates, or recurring-service packages by service type.",
  },
  {
    rank: 4,
    title: "Fast invoicing and payment collection",
    businessValue: "Shorten the time from completed work to collected cash.",
    plumbing: "Invoice at the job and collect on-site or digitally.",
    moldRemediation: "Invoice at phase completion or final completion and collect without paperwork lag.",
    otherServiceBusinesses: "Same operational goal regardless of vertical: work is not complete until payment is collected.",
  },
  {
    rank: 5,
    title: "Customer history and CRM",
    businessValue: "Retain context, support repeat work, and improve service quality.",
    plumbing: "Address, prior work, equipment, notes, warranties, and unpaid balances.",
    moldRemediation: "Property history, water events, moisture logs, clearance docs, and warranties.",
    otherServiceBusinesses: "Job history, site details, prior service, assets, and account notes.",
  },
  {
    rank: 6,
    title: "Profitability reporting",
    businessValue: "Show which work, crews, ZIPs, and sources produce real cash and margin.",
    plumbing: "By job type, technician, service type, ZIP, and source.",
    moldRemediation: "By crew, assessment vs remediation vs testing, ZIP, and lead source.",
    otherServiceBusinesses: "By job type, team, route, contract, and marketing source.",
  },
  {
    rank: 7,
    title: "Membership and repeat-service systems",
    businessValue: "Increase recurring revenue and reduce new-lead dependency.",
    plumbing: "Maintenance plans, annual inspections, renewals, and reactivation.",
    moldRemediation: "Warranty follow-ups, reinspection cycles, and post-remediation checkups.",
    otherServiceBusinesses: "Maintenance agreements, recurring cleanings, service plans, or warranty programs.",
  },
  {
    rank: 8,
    title: "Field documentation",
    businessValue: "Protect the business, reduce disputes, and preserve operational knowledge.",
    plumbing: "Photos, approvals, parts used, notes, and job summaries.",
    moldRemediation: "Before and after photos, moisture logs, scope sheets, containment notes, and clearance docs.",
    otherServiceBusinesses: "Photos, service notes, approvals, checklists, and compliance records.",
  },
  {
    rank: 9,
    title: "Marketing attribution",
    businessValue: "Show which channels create paying work instead of vanity activity.",
    plumbing: "Track which calls and jobs came from Google, referrals, SEO, ads, or repeat customers.",
    moldRemediation: "Track the same sources so spend is tied to collected revenue.",
    otherServiceBusinesses: "Same need across verticals: know what actually produces booked and collected work.",
  },
  {
    rank: 10,
    title: "Standard operating workflows",
    businessValue: "Make average staff perform more like strong staff through standard execution.",
    plumbing: "How calls, estimates, dispatch, documentation, invoicing, and callbacks are handled.",
    moldRemediation: "How assessments, approvals, documentation, project phases, and close-out are handled.",
    otherServiceBusinesses: "How the business answers, schedules, performs, documents, and follows up consistently.",
  },
];

export const verticalOperatingModels: Record<string, VerticalOperatingModel> = {
  plumbing: {
    slug: "plumbing",
    label: "Plumbing Operations OS",
    tagline: "From first call to collected payment without the usual leaks.",
    corePromise: "Tighten booking, dispatch, flat-rate quoting, invoicing, and payment collection for every plumbing job.",
    schedulingMode: "Technician, truck, and emergency dispatch scheduling.",
    pricingModel: "Flat-rate price book with estimate support for larger replacements and installs.",
    documentationBias: "Service notes, photos, approvals, equipment context, and warranty history.",
    repeatRevenueModel: "Maintenance plans, annual inspections, and reactivation campaigns.",
    jobFlow: ["Lead or call", "Book", "Dispatch", "Quote or perform", "Invoice", "Collect", "Follow up"],
    profitabilityViews: ["By job type", "By technician", "By ZIP", "By lead source"],
    documentationNeeds: ["Before and after photos", "Job notes", "Approvals", "Parts used", "Warranty and equipment history"],
    automationFocus: ["Missed-call recovery", "Estimate follow-up", "Invoice chase", "Maintenance renewals"],
  },
  "mold-remediation": {
    slug: "mold-remediation",
    label: "Mold Remediation Operations OS",
    tagline: "Keep every property, phase, and document tied to collected revenue.",
    corePromise: "Unify assessment, scope, remediation, documentation, invoicing, and follow-up into one controlled operating flow.",
    schedulingMode: "Crew, equipment, assessment, remediation, and multi-day project scheduling.",
    pricingModel: "Scope-based pricing with assessment, containment, severity, and remediation templates.",
    documentationBias: "Property history, moisture logs, containment records, clearance documents, and warranty tracking.",
    repeatRevenueModel: "Post-remediation checks, warranty renewals, annual reinspection, and air-quality follow-up.",
    jobFlow: ["Lead", "Assessment", "Quote", "Remediation", "Clearance", "Invoice", "Collect", "Warranty follow-up"],
    profitabilityViews: ["By crew", "By service phase", "By ZIP", "By lead source"],
    documentationNeeds: ["Before and after photos", "Moisture logs", "Scope sheets", "Signed approvals", "Clearance certificates"],
    automationFocus: ["Assessment scheduling", "Estimate follow-up", "Phase completion reminders", "Warranty reactivation"],
  },
  hvac: {
    slug: "hvac",
    label: "HVAC Operations OS",
    tagline: "Handle emergency service, maintenance, and replacement work without admin drag.",
    corePromise: "Connect service dispatch, maintenance scheduling, quoting, invoicing, and customer history in one HVAC operating system.",
    schedulingMode: "Mixed emergency dispatch, scheduled maintenance, and install project coordination.",
    pricingModel: "Service-price books plus replacement and maintenance-plan quoting.",
    documentationBias: "Equipment history, service notes, maintenance records, and replacement recommendations.",
    repeatRevenueModel: "Maintenance agreements, seasonal tune-up reminders, and replacement follow-up.",
    jobFlow: ["Lead or call", "Book", "Dispatch", "Diagnose", "Quote", "Perform", "Invoice", "Collect", "Renew"],
    profitabilityViews: ["By tech", "By maintenance agreement", "By system type", "By source"],
    documentationNeeds: ["Equipment model records", "Photos", "Service notes", "Approvals", "Maintenance history"],
    automationFocus: ["Maintenance renewals", "No-cool/no-heat emergency follow-up", "Replacement nurture", "Invoice chase"],
  },
  cleaning: {
    slug: "cleaning",
    label: "Cleaning Operations OS",
    tagline: "Run recurring work, route quality, and clean collections from one system.",
    corePromise: "Unify recurring scheduling, crew assignment, customer history, invoicing, and retention for cleaning businesses.",
    schedulingMode: "Recurring slot scheduling, crew routing, and contract-based service windows.",
    pricingModel: "Package pricing, recurring plans, add-on services, and quote templates for larger jobs.",
    documentationBias: "Checklist completion, site notes, before and after condition, and account preferences.",
    repeatRevenueModel: "Recurring schedules, upsells, plan renewals, and reactivation.",
    jobFlow: ["Lead", "Quote", "Schedule", "Service", "Document", "Invoice", "Collect", "Renew"],
    profitabilityViews: ["By route", "By crew", "By account type", "By source"],
    documentationNeeds: ["Checklist records", "Photos when needed", "Access notes", "Site preferences", "Issue flags"],
    automationFocus: ["Recurring reminders", "Upsell follow-up", "Service reviews", "Renewal retention"],
  },
  restoration: {
    slug: "restoration",
    label: "Restoration Operations OS",
    tagline: "Manage urgent response, project phases, and documentation without losing the financial trail.",
    corePromise: "Coordinate emergency intake, project scheduling, documentation, invoicing, and payment across restoration work.",
    schedulingMode: "Emergency response plus crew and phase scheduling for larger restoration projects.",
    pricingModel: "Scope-based and phase-based estimating with emergency intake and project templates.",
    documentationBias: "Loss records, photos, approvals, equipment logs, and phased completion notes.",
    repeatRevenueModel: "Reinspection, claim follow-up, and ongoing property service relationships.",
    jobFlow: ["Lead", "Emergency response", "Assessment", "Scope", "Project work", "Invoice", "Collect", "Follow up"],
    profitabilityViews: ["By project phase", "By crew", "By loss type", "By ZIP", "By source"],
    documentationNeeds: ["Site photos", "Scope approvals", "Equipment logs", "Project notes", "Completion records"],
    automationFocus: ["Rapid response scheduling", "Phase updates", "Invoice follow-up", "Post-project reactivation"],
  },
};

export function getVerticalOperatingModel(slug?: string) {
  if (!slug) return verticalOperatingModels.plumbing;
  return verticalOperatingModels[slug] ?? verticalOperatingModels.plumbing;
}

export function listVerticalOperatingModels() {
  return Object.values(verticalOperatingModels);
}

