import type { ExperienceInput, ExperienceMode } from "./experience";
import type { FunnelFamily, MarketplaceAudience } from "./runtime-schema";

export type EndUserFunnelKind =
  | "hub"
  | "emergency"
  | "estimate"
  | "commercial"
  | "provider"
  | "local";

export type EndUserFunnelSection = {
  eyebrow: string;
  title: string;
  items: Array<{
    title: string;
    detail: string;
  }>;
};

export type EndUserFunnelFaq = {
  question: string;
  answer: string;
};

export type EndUserFunnelLink = {
  href: string;
  label: string;
  description: string;
};

export type EndUserFunnelDefinition = {
  kind: EndUserFunnelKind;
  route: string;
  audience: MarketplaceAudience;
  family: FunnelFamily;
  preferredMode: ExperienceMode;
  intent: NonNullable<ExperienceInput["intent"]>;
  service: string;
  eyebrow: string;
  title: string;
  summary: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  stickyLabel: string;
  heroPills: string[];
  trustStrip: string[];
  valueStack?: Array<{
    title: string;
    detail: string;
  }>;
  systemModules?: Array<{
    title: string;
    detail: string;
  }>;
  sections: EndUserFunnelSection[];
  faq: EndUserFunnelFaq[];
  relatedLinks: EndUserFunnelLink[];
};

function zipLabel(zip?: string) {
  return zip?.trim() || "your area";
}

function marketplaceLinks(zip?: string): EndUserFunnelLink[] {
  return [
    {
      href: "/start/plumbing/emergency",
      label: "Emergency plumbing",
      description: `Fastest path for active leaks, backups, and no-hot-water issues in ${zipLabel(zip)}.`,
    },
    {
      href: "/start/plumbing/estimate",
      label: "Plumbing estimate",
      description: "For planned repairs, replacements, and installation work.",
    },
    {
      href: "/start/plumbing/commercial",
      label: "Commercial plumbing",
      description: "For property managers, facilities teams, and site coordination.",
    },
    {
      href: "/start/providers/join",
      label: "Join provider network",
      description: "For plumbers and service teams interested in joining the network.",
    },
  ];
}

export function getEndUserFunnel(kind: EndUserFunnelKind, options?: { zip?: string }): EndUserFunnelDefinition {
  const zip = options?.zip;
  const links = marketplaceLinks(zip);

  switch (kind) {
    case "hub":
      return {
        kind,
        route: "/start",
        audience: "client",
        family: "qualification",
        preferredMode: "booking-first",
        intent: "solve-now",
        service: "plumbing-help",
        eyebrow: "Plumbing help",
        title: "Choose the right plumbing path in seconds",
        summary: "Emergency help, estimates, commercial service, and provider signup should not start in the same form.",
        primaryLabel: "Get plumbing help",
        primaryHref: "#capture-form",
        secondaryLabel: "Join provider network",
        secondaryHref: "/start/providers/join",
        stickyLabel: "Get plumbing help",
        heroPills: ["Emergency help", "Estimate path", "Commercial service", "Provider network"],
        trustStrip: ["Local-first routes", "Clear next step", "Human fallback when needed"],
        sections: [
          {
            eyebrow: "Choose your lane",
            title: "Different situations need different first screens",
            items: [
              {
                title: "Emergency",
                detail: "For active leaks, backups, no hot water, and other urgent plumbing problems.",
              },
              {
                title: "Estimate",
                detail: "For planned repairs, replacements, and installation projects.",
              },
              {
                title: "Commercial",
                detail: "For properties, buildings, facilities, and repeat-work coordination.",
              },
            ],
          },
          {
            eyebrow: "Why this works",
            title: "The first step should remove confusion, not create it",
            items: [
              {
                title: "Faster decisions",
                detail: "People move faster when the page matches their urgency and situation right away.",
              },
              {
                title: "Less friction",
                detail: "You do not need to explain a commercial request inside a homeowner emergency page.",
              },
              {
                title: "Better handoff",
                detail: "The next step keeps your context attached so you do not start over.",
              },
            ],
          },
        ],
        faq: [
          {
            question: "What if I already know what I need?",
            answer: "Use the direct emergency, estimate, commercial, or provider page to get there faster.",
          },
          {
            question: "What if my situation is unusual?",
            answer: "You can still use the closest path. The fallback and follow-up routes are designed to keep unusual jobs moving.",
          },
        ],
        relatedLinks: links,
      };
    case "emergency":
      return {
        kind,
        route: "/start/plumbing/emergency",
        audience: "client",
        family: "qualification",
        preferredMode: "booking-first",
        intent: "solve-now",
        service: "emergency-plumbing",
        eyebrow: "Emergency plumbing",
        title: "Need a plumber now?",
        summary: "Tell us what is happening and we will guide the fastest useful next step for your home.",
        primaryLabel: "Get emergency help",
        primaryHref: "#capture-form",
        secondaryLabel: "Need an estimate instead?",
        secondaryHref: "/start/plumbing/estimate",
        stickyLabel: "Get emergency help",
        heroPills: ["Burst pipe", "Active leak", "Backup", "No hot water"],
        trustStrip: ["Fast-response routing", "Licensed and insured providers", "Human fallback if needed"],
        sections: [
          {
            eyebrow: "How it works",
            title: "A short path for urgent problems",
            items: [
              {
                title: "Pick the issue",
                detail: "Start with what is happening so the page stays relevant from the first tap.",
              },
              {
                title: "Add your ZIP and best phone",
                detail: "We ask for the minimum needed to keep the fast path open.",
              },
              {
                title: "Get matched or routed",
                detail: "If the job is unusual, you still have a human fallback instead of a dead end.",
              },
            ],
          },
          {
            eyebrow: "When to use this page",
            title: "Best for active plumbing problems",
            items: [
              {
                title: "Water is leaking now",
                detail: "Burst pipes, active leaks, or overflow risk.",
              },
              {
                title: "The issue is disrupting the home",
                detail: "No hot water, blocked drains, or plumbing failure affecting daily use.",
              },
              {
                title: "You want the fastest next step",
                detail: "This path is built for speed and clarity, not shopping around.",
              },
            ],
          },
        ],
        faq: [
          {
            question: "Do I need to fill a long form?",
            answer: "No. This path is designed to stay short and mobile-friendly.",
          },
          {
            question: "What if I am not sure it is an emergency?",
            answer: "Start here if speed matters. If it turns out to be planned work, the next step can still shift into a lighter path.",
          },
        ],
        relatedLinks: links,
      };
    case "estimate":
      return {
        kind,
        route: "/start/plumbing/estimate",
        audience: "client",
        family: "qualification",
        preferredMode: "form-first",
        intent: "compare",
        service: "plumbing-estimate",
        eyebrow: "Plumbing estimate",
        title: "Book a plumbing estimate without the back-and-forth",
        summary: "For planned repairs, replacements, and installs. Start with the type of project and we will guide the next step.",
        primaryLabel: "Book an estimate",
        primaryHref: "#capture-form",
        secondaryLabel: "Need emergency help instead?",
        secondaryHref: "/start/plumbing/emergency",
        stickyLabel: "Book an estimate",
        heroPills: ["Repairs", "Replacements", "Installs", "Project planning"],
        trustStrip: ["Quote-friendly path", "Clear expectations", "No emergency-style pressure"],
        sections: [
          {
            eyebrow: "Common projects",
            title: "Built for the work people usually plan ahead",
            items: [
              {
                title: "Repair",
                detail: "Leaks, drains, fixtures, and scoped problem-solving work.",
              },
              {
                title: "Replace",
                detail: "Water heaters, valves, aging fixtures, and system upgrades.",
              },
              {
                title: "Install",
                detail: "New equipment, remodel plumbing, and planned improvements.",
              },
            ],
          },
          {
            eyebrow: "What to expect",
            title: "A quote path that stays useful",
            items: [
              {
                title: "Start with the project",
                detail: "We use the project type to keep the next step relevant.",
              },
              {
                title: "Share only what helps now",
                detail: "You do not need to write out everything up front.",
              },
              {
                title: "Keep momentum",
                detail: "If you are still comparing, the path can move forward without false urgency.",
              },
            ],
          },
        ],
        faq: [
          {
            question: "Can I still use this if I am comparing options?",
            answer: "Yes. This page is designed for buyers who want clarity before they commit.",
          },
          {
            question: "What if the problem becomes urgent?",
            answer: "Switch to the emergency path if speed becomes more important than planning.",
          },
        ],
        relatedLinks: links,
      };
    case "commercial":
      return {
        kind,
        route: "/start/plumbing/commercial",
        audience: "client",
        family: "qualification",
        preferredMode: "form-first",
        intent: "solve-now",
        service: "commercial-plumbing",
        eyebrow: "Commercial plumbing",
        title: "Commercial plumbing service for properties and facilities",
        summary: "Request service for one site or many. Built for property teams, managers, and commercial buyers.",
        primaryLabel: "Request service",
        primaryHref: "#capture-form",
        secondaryLabel: "Need residential help instead?",
        secondaryHref: "/start",
        stickyLabel: "Request service",
        heroPills: ["Property managers", "Facilities teams", "Multi-site coverage", "Repeat work"],
        trustStrip: ["Structured intake", "Site-aware service path", "Clear coordination next step"],
        sections: [
          {
            eyebrow: "Who this is for",
            title: "Built for commercial requests, not homeowner forms",
            items: [
              {
                title: "Facilities teams",
                detail: "For site issues, system problems, and service coordination.",
              },
              {
                title: "Property managers",
                detail: "For tenant issues, building needs, and recurring work.",
              },
              {
                title: "Multi-site operators",
                detail: "For broader service conversations and coverage planning.",
              },
            ],
          },
          {
            eyebrow: "How requests move",
            title: "A more structured first step",
            items: [
              {
                title: "Start with the request type",
                detail: "Urgent service and longer-term coverage conversations should not feel the same.",
              },
              {
                title: "Add site context",
                detail: "Building, property, and coordination details can be captured without making the form feel bloated.",
              },
              {
                title: "Move into the right conversation",
                detail: "The path is built to support service requests, account discussions, and continuity planning.",
              },
            ],
          },
        ],
        faq: [
          {
            question: "Can I use this for urgent building issues?",
            answer: "Yes. Start here for commercial service and the next step can still reflect urgency.",
          },
          {
            question: "Can this support repeat work?",
            answer: "Yes. This path is designed to leave room for ongoing service conversations, not just one-off requests.",
          },
        ],
        relatedLinks: links,
      };
    case "provider":
      return {
        kind,
        route: "/start/providers/join",
        audience: "provider",
        family: "qualification",
        preferredMode: "form-first",
        intent: "compare",
        service: "provider-network",
        eyebrow: "Provider network",
        title: "Join the plumbing provider network",
        summary: "Grow with better-fit work across your preferred service area, specialties, and response windows.",
        primaryLabel: "Apply to join",
        primaryHref: "#capture-form",
        secondaryLabel: "See customer-facing pages",
        secondaryHref: "/start",
        stickyLabel: "Apply to join",
        heroPills: ["Call-to-cash", "Dispatch control", "Flat-rate quoting", "Repeat revenue"],
        trustStrip: [
          "Built around profitable jobs",
          "Less admin leakage between call and payment",
          "Made for serious plumbing operators",
        ],
        valueStack: [
          {
            title: "Book faster",
            detail: "Keep leads, phone calls, and job requests moving without missed handoffs or front-office chaos.",
          },
          {
            title: "Route smarter",
            detail: "Dispatch and schedule around technician time, fit, and geography so margin is not lost on the calendar.",
          },
          {
            title: "Quote consistently",
            detail: "Use a tighter price-book and estimate path so the customer hears a confident number instead of a guess.",
          },
          {
            title: "Collect sooner",
            detail: "Finish the job, invoice immediately, and shorten the gap between completed work and collected cash.",
          },
        ],
        systemModules: [
          {
            title: "Call-to-cash flow",
            detail: "Lead capture, booking, dispatch, work completion, invoicing, and payment collection should live in one connected operating system.",
          },
          {
            title: "Dispatch and schedule control",
            detail: "Empty technician time, late arrivals, and poor routing destroy margin. Strong dispatch control fixes that first.",
          },
          {
            title: "Flat-rate pricing and estimating",
            detail: "Standardized quoting protects margin, improves customer confidence, and keeps technician pricing consistent.",
          },
          {
            title: "CRM and customer history",
            detail: "When a customer calls, the team should instantly see prior work, equipment, notes, warranties, and unpaid balances.",
          },
          {
            title: "Job profitability visibility",
            detail: "Owners need to know which techs, job types, ZIP codes, and lead sources actually turn into collected profit.",
          },
          {
            title: "Membership and follow-up",
            detail: "Recurring inspections, maintenance plans, reminders, and reactivation turn one-time work into steadier revenue.",
          },
        ],
        sections: [
          {
              eyebrow: "What owners actually want",
              title: "A tighter operating system, not more disconnected software",
              items: [
                {
                  title: "Less leakage",
                  detail: "The biggest gain is reducing what gets lost between the phone call, the dispatch board, the estimate, and the invoice.",
                },
                {
                  title: "More collected revenue",
                  detail: "The point is not just to book work. It is to finish more jobs cleanly and collect faster from the same volume of work.",
                },
                {
                  title: "Standardized execution",
                  detail: "Good systems help average office staff and average techs perform more like strong ones because the workflow is harder to break.",
                },
              ],
            },
            {
              eyebrow: "Why serious shops care",
              title: "The system should make every job easier to run",
              items: [
                {
                  title: "Before the truck rolls",
                  detail: "Capture the lead, book quickly, route well, and show the tech the right context before they arrive.",
                },
                {
                  title: "On the job",
                  detail: "Quote cleanly, document the work, get approval, and invoice without creating loose ends.",
                },
                {
                  title: "After the job",
                  detail: "Collect promptly, keep the customer history current, and use follow-up to create repeat revenue instead of a forgotten invoice.",
                },
              ],
            },
          ],
        faq: [
          {
            question: "Who is the best fit?",
            answer: "Plumbing owners who want tighter dispatch, more consistent quoting, faster collection, and clearer profit visibility are the strongest fit.",
          },
          {
            question: "Do I need to share everything up front?",
            answer: "No. The first step is short and focused on fit, not paperwork.",
          },
          {
            question: "Is this mainly a lead source?",
            answer: "No. The bigger value is running work more cleanly from booked job to collected payment while keeping customer history and follow-up usable.",
          },
        ],
        relatedLinks: links,
      };
    case "local":
      return {
        kind,
        route: `/start/local/${zip ?? "19103"}`,
        audience: "client",
        family: "qualification",
        preferredMode: "booking-first",
        intent: "solve-now",
        service: "local-plumbing",
        eyebrow: `Plumbing in ${zipLabel(zip)}`,
        title: `Need a plumber in ${zipLabel(zip)}?`,
        summary: "Choose emergency help, an estimate, or the right next step for your area without bouncing through a generic page.",
        primaryLabel: "Get local help",
        primaryHref: "#capture-form",
        secondaryLabel: "View all plumbing paths",
        secondaryHref: "/start",
        stickyLabel: "Get local help",
        heroPills: [zipLabel(zip), "Emergency help", "Estimates", "Local-first path"],
        trustStrip: ["ZIP-aware copy", "Fast path for urgent jobs", "Clear local next step"],
        sections: [
          {
            eyebrow: "Why local pages work",
            title: "Specific beats generic when someone searches nearby",
            items: [
              {
                title: "Keep the area visible",
                detail: "The page should make local relevance obvious in the first screen.",
              },
              {
                title: "Split urgent and planned intent",
                detail: "Local search traffic includes both emergency buyers and estimate shoppers.",
              },
              {
                title: "Make the next step simple",
                detail: "People decide quickly whether a local page feels worth acting on.",
              },
            ],
          },
          {
            eyebrow: "Best use",
            title: "Built for high-intent local traffic",
            items: [
              {
                title: "Emergency visits",
                detail: "For people who searched because something is happening right now.",
              },
              {
                title: "Estimate visits",
                detail: "For people comparing a project or planning work nearby.",
              },
              {
                title: "Fast handoff",
                detail: "For keeping local intent alive without sending people into a generic national-feeling page.",
              },
            ],
          },
        ],
        faq: [
          {
            question: "Can I use this if I am not sure which path I need?",
            answer: "Yes. This page is designed to help local visitors choose the right lane quickly.",
          },
          {
            question: "Is this only for emergencies?",
            answer: "No. It supports urgent help and planned estimate traffic for the same area.",
          },
        ],
        relatedLinks: links,
      };
  }
}
