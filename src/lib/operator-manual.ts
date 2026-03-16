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

export type OperatorSop = {
  id: string;
  eyebrow: string;
  title: string;
  owner: string;
  frequency: string;
  summary: string;
  steps: string[];
  surfaces: OperatorManualLink[];
  successChecks: string[];
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
        purpose: "Compact bird's-eye view of queue pressure, rollout state, provider health, and active alerts.",
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

export const operatorSops: OperatorSop[] = [
  {
    id: "daily-ops",
    eyebrow: "Daily ops",
    title: "Daily marketplace operating rhythm",
    owner: "Operator",
    frequency: "Every shift",
    summary: "This is the default sequence for starting a shift, finding pressure quickly, and keeping the plumbing marketplace moving without noise.",
    steps: [
      "Open System overview first and scan queue pulse, rollout pulse, and active alerts before touching any queue.",
      "Move into Dispatch desk and work emergency and escalation-ready plumbing demand first.",
      "Check Alerts for failed notifications, execution trouble, or recurring threshold breaches that need ownership.",
      "Review Provider health before pushing more demand into ZIP cells with thin coverage or weak contribution margin.",
      "End the shift by checking Deployment registry for stale, drifted, or unverified installs that can silently hurt volume.",
    ],
    surfaces: [
      { label: "System overview", href: "/dashboard/overview", audience: "Operator", purpose: "Start-of-shift pulse check." },
      { label: "Dispatch desk", href: "/dashboard", audience: "Operator", purpose: "Primary intervention queue." },
      { label: "Alert operations", href: "/dashboard/alerts", audience: "Operator", purpose: "Notification and threshold review." },
      { label: "Provider health", href: "/dashboard/providers", audience: "Operator", purpose: "Supply-side risk review." },
      { label: "Deployment registry", href: "/dashboard/deployments", audience: "Operator", purpose: "Rollout verification and drift review." },
    ],
    successChecks: [
      "No emergency lead sits unworked past the SLA window.",
      "No critical alert remains unowned.",
      "No constrained ZIP cell is scaled blindly.",
    ],
  },
  {
    id: "incident-response",
    eyebrow: "Incident response",
    title: "Respond to failures and urgent system degradation",
    owner: "Operator or admin",
    frequency: "When alerts trigger",
    summary: "Use this when something is breaking: failed workflows, alert paging issues, booking problems, or rollout drift.",
    steps: [
      "Open Alert operations and identify the active critical rule, failure reason, and recommended resolution.",
      "Use the drill-through link to jump into the exact queue rather than hunting manually.",
      "If the issue affects a specific lead, open the lead journey and follow the explanation and recovery guidance there.",
      "If the issue is system-wide, inspect Execution, Workflows, or Deployments based on the alert source and contain the blast radius quickly.",
      "Acknowledge the alert once ownership is clear so the rest of the team knows the incident is being worked.",
    ],
    surfaces: [
      { label: "Alert operations", href: "/dashboard/alerts", audience: "Operator", purpose: "Where alerts, failures, suppressions, and acknowledgements live." },
      { label: "Execution queue", href: "/dashboard/execution?status=failed", audience: "Operator", purpose: "Exact-once queue failures and retries." },
      { label: "Workflow runs", href: "/dashboard/workflows?status=failed", audience: "Operator", purpose: "Workflow-specific failures." },
      { label: "Booking jobs", href: "/dashboard/bookings?status=failed", audience: "Operator", purpose: "Booking and scheduling failures." },
      { label: "Deployment registry", href: "/dashboard/deployments?health=verification-danger", audience: "Operator", purpose: "Rollout drift and broken installs." },
    ],
    successChecks: [
      "Critical alerts are acknowledged and owned quickly.",
      "Root-cause queue is identified within one click from the alert.",
      "Lead-level issues are recovered or clearly escalated.",
    ],
  },
  {
    id: "provider-onboarding",
    eyebrow: "Provider onboarding",
    title: "Bring new providers into live routing safely",
    owner: "Admin or operator",
    frequency: "Whenever adding supply",
    summary: "Use this sequence to recruit, verify, and activate providers without flooding low-quality or under-configured supply into the marketplace.",
    steps: [
      "Send supply-side traffic to Join provider network so plumbers enter through the correct recruiting path.",
      "Review onboarding submissions and provider profile details before treating the provider as dispatch-ready.",
      "Confirm service area, issue fit, emergency coverage, and capacity through Provider health and provider portal data.",
      "Only scale ZIP-cell demand into providers who are executable and operationally ready, not merely configured.",
      "Re-check contribution margin and response quality after the first real jobs before increasing routing share.",
    ],
    surfaces: [
      { label: "Join provider network", href: "/join-provider-network", audience: "Public", purpose: "Supply acquisition entry point." },
      { label: "Provider portal", href: "/provider-portal", audience: "Provider", purpose: "Provider-side acceptance and completion reporting." },
      { label: "Provider health", href: "/dashboard/providers", audience: "Operator", purpose: "Readiness, routing confidence, and economics." },
      { label: "Runtime settings", href: "/dashboard/settings", audience: "Admin", purpose: "Dispatch mappings and runtime controls." },
    ],
    successChecks: [
      "Provider is executable, not just configured.",
      "Coverage and capacity are visible before routing live jobs.",
      "Early jobs close with acceptable margin and complaint profile.",
    ],
  },
  {
    id: "zip-rollout",
    eyebrow: "ZIP rollout",
    title: "Launch and verify local-market deployment waves",
    owner: "Admin or implementation lead",
    frequency: "Per metro or ZIP wave",
    summary: "Use this SOP when expanding to new local pages, provider domains, or WordPress installs across many ZIPs.",
    steps: [
      "Start in Deployment blueprint to choose the correct recipe and generate the right embed or hosted package.",
      "Use the bulk generator for ZIP waves instead of copying one-off snippets manually.",
      "Register installs in Deployment registry so generated does not get confused with truly live.",
      "Run or review deployment verification so unreachable pages, missing embeds, and drifted installs are caught fast.",
      "Check constrained ZIP cells in the dispatch desk before spending more traffic into a newly rolled-out market.",
    ],
    surfaces: [
      { label: "Deployment blueprint", href: "/deployments/plumbing", audience: "Operator", purpose: "Source of truth for snippets and packages." },
      { label: "Deployment registry", href: "/dashboard/deployments", audience: "Operator", purpose: "Registry, cohort tracking, and verification." },
      { label: "Bulk generator API", href: "/api/embed/generate-bulk", audience: "Integration", purpose: "ZIP-wave generation for automation and agency tools." },
      { label: "Widget boot", href: "/api/widgets/boot", audience: "Integration", purpose: "Live widget configuration endpoint." },
      { label: "Dispatch desk", href: "/dashboard", audience: "Operator", purpose: "ZIP-cell liquidity and post-rollout pressure check." },
    ],
    successChecks: [
      "Every rollout wave is registered, not just generated.",
      "Live pages are reachable and embed markers verify cleanly.",
      "Demand is not pushed into under-supplied ZIP cells.",
    ],
  },
  {
    id: "experiment-promotion",
    eyebrow: "Experiment promotion",
    title: "Promote a winner into the live runtime default",
    owner: "Admin",
    frequency: "After enough economic evidence exists",
    summary: "Use this SOP to move from randomized experimentation into a promoted live default without code changes.",
    steps: [
      "Open Experiments and review completed revenue, contribution margin, refunds, complaints, and review signals, not just conversion.",
      "Confirm the leading non-holdout variant is actually promotable and not merely ahead on top-funnel movement.",
      "Promote the winner from the experiment dashboard so the runtime stores it in live config.",
      "Verify the promoted winner is now the default across hosted pages, widget boot, deployment generation, and WordPress plugin output.",
      "Keep monitoring post-promotion economics to make sure the live default remains healthy in real traffic.",
    ],
    surfaces: [
      { label: "Experiments", href: "/dashboard/experiments", audience: "Admin", purpose: "Review economics and promote winners." },
      { label: "Widget boot", href: "/api/widgets/boot", audience: "Integration", purpose: "Confirms promoted winners flow into live widget resolution." },
      { label: "Embed manifest", href: "/api/embed/manifest", audience: "Integration", purpose: "Confirms promoted defaults flow into integration catalog output." },
      { label: "Deployment blueprint", href: "/deployments/plumbing", audience: "Operator", purpose: "Confirms generators and WordPress outputs reflect the promotion." },
    ],
    successChecks: [
      "Winner is chosen on economics and quality, not vanity metrics.",
      "Promoted variant becomes the synchronous live default everywhere.",
      "Post-promotion health remains stronger than the randomized baseline.",
    ],
  },
];

