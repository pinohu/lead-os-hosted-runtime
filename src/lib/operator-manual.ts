export type OperatorManualLink = {
  label: string;
  href: string;
  audience: string;
  purpose: string;
};

export type OperatorManualSection = {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  links: OperatorManualLink[];
};

export const operatorManualSections: OperatorManualSection[] = [
  {
    id: "customer-entry",
    eyebrow: "Customer entry points",
    title: "Use these when routing demand-side traffic",
    summary: "These are the best public pages for homeowners, tenants, clients, ads, and local search handoff.",
    links: [
      {
        label: "Marketplace home",
        href: "/",
        audience: "Public",
        purpose: "Top-level two-sided marketplace entry when the visitor still needs to choose a path.",
      },
      {
        label: "Customer help hub",
        href: "/get-plumbing-help",
        audience: "Public",
        purpose: "Demand-side decision page for homeowners and tenants who need help choosing urgency, estimate, or commercial.",
      },
      {
        label: "Emergency plumbing",
        href: "/plumbing/emergency",
        audience: "Public",
        purpose: "Best page for urgent plumbing demand, dispatch-first ads, and mobile emergency traffic.",
      },
      {
        label: "Estimate plumbing",
        href: "/plumbing/estimate",
        audience: "Public",
        purpose: "Best page for planned repairs, installs, quote requests, and lower-pressure conversion paths.",
      },
      {
        label: "Commercial plumbing",
        href: "/plumbing/commercial",
        audience: "Public",
        purpose: "Best page for facilities, property managers, and structured commercial intake.",
      },
      {
        label: "ZIP-local example",
        href: "/local/19103",
        audience: "Public",
        purpose: "Template for city and ZIP SEO deployment patterns.",
      },
      {
        label: "Plumbing assessment",
        href: "/assess/plumbing",
        audience: "Public",
        purpose: "Hosted qualification and booking-first assessment path.",
      },
    ],
  },
  {
    id: "provider-entry",
    eyebrow: "Provider entry points",
    title: "Use these when recruiting or operating the supply side",
    summary: "These routes exist for plumbers and provider teams, not homeowners.",
    links: [
      {
        label: "Join provider network",
        href: "/join-provider-network",
        audience: "Public",
        purpose: "Recruit plumbers and service providers into the network.",
      },
      {
        label: "Provider portal",
        href: "/provider-portal",
        audience: "Provider",
        purpose: "Let approved providers accept, decline, and complete dispatch requests.",
      },
    ],
  },
  {
    id: "deployment",
    eyebrow: "Deployment and integration",
    title: "Use these when rolling out LeadOS on client sites",
    summary: "These are the core surfaces for snippet generation, plugin creation, and rollout orchestration.",
    links: [
      {
        label: "Deployment blueprint",
        href: "/deployments/plumbing",
        audience: "Operator",
        purpose: "Generate hosted links, widget snippets, iframe fallbacks, and WordPress-ready deployment packages.",
      },
      {
        label: "Deployment registry",
        href: "/dashboard/deployments",
        audience: "Operator",
        purpose: "Track generated, live, stale, paused, and drifted installs across providers and ZIP cells.",
      },
      {
        label: "Embed manifest",
        href: "/api/embed/manifest",
        audience: "Integration",
        purpose: "Catalog endpoint for plugins, deployment generators, and agency setup flows.",
      },
      {
        label: "Widget boot",
        href: "/api/widgets/boot",
        audience: "Integration",
        purpose: "Runtime startup endpoint for live embedded widgets.",
      },
      {
        label: "Deployment generator",
        href: "/api/embed/generate",
        audience: "Integration",
        purpose: "Single-deployment generator for hosted links, widget snippets, and iframe fallbacks.",
      },
      {
        label: "Bulk deployment generator",
        href: "/api/embed/generate-bulk",
        audience: "Integration",
        purpose: "ZIP-batch deployment generator for metro rollouts and local SEO scaling.",
      },
      {
        label: "WordPress plugin generator",
        href: "/api/embed/wordpress-plugin",
        audience: "Integration",
        purpose: "Installable plugin package generator for WordPress deployments.",
      },
    ],
  },
  {
    id: "operations",
    eyebrow: "Operator controls",
    title: "Use these to run the marketplace day to day",
    summary: "These are the operator-facing control planes for dispatch, observability, providers, alerts, and experiments.",
    links: [
      {
        label: "Dispatch desk",
        href: "/dashboard",
        audience: "Operator",
        purpose: "Primary queue-first control surface for live lead intervention and backup routing.",
      },
      {
        label: "System overview",
        href: "/dashboard/overview",
        audience: "Operator",
        purpose: "Compact bird’s-eye view of queue pressure, rollout state, provider health, and active alerts.",
      },
      {
        label: "Alert operations",
        href: "/dashboard/alerts",
        audience: "Operator",
        purpose: "Manage triggered rules, alert failures, suppressions, and acknowledgements.",
      },
      {
        label: "Provider health",
        href: "/dashboard/providers",
        audience: "Operator",
        purpose: "Review provider readiness, routing confidence, capacity, and economics.",
      },
      {
        label: "Experiments",
        href: "/dashboard/experiments",
        audience: "Admin",
        purpose: "Review experiment economics and promote winners into the live runtime defaults.",
      },
      {
        label: "Runtime settings",
        href: "/dashboard/settings",
        audience: "Admin",
        purpose: "Manage dispatch policy, marketplace defaults, recipients, mappings, and live runtime controls.",
      },
    ],
  },
];

export const operatorManualPlaybook = [
  "Start each shift in System overview, then move into the Dispatch desk for active intervention.",
  "Use Alerts before digging into individual queues when something feels wrong globally.",
  "Use Provider health before scaling demand into a ZIP cell or metro where supply may be thin.",
  "Use Deployment registry before assuming a rollout is live; generated does not mean installed.",
  "Use Experiments only when enough economic data exists to justify promoting a winner into the live default.",
];

