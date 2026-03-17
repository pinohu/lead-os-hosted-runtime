import type { PlumbingEntrypointKind } from "./plumbing-entrypoints";

export type TrustAssetModule = {
  category: "diagnostic" | "decision" | "trust" | "interactive";
  title: string;
  promise: string;
  href: string;
  ctaLabel: string;
};

export function getTrustAssetModules(kind: PlumbingEntrypointKind): TrustAssetModule[] {
  switch (kind) {
    case "emergency":
      return [
        {
          category: "diagnostic",
          title: "Urgency check",
          promise: "Help visitors confirm whether they need the emergency lane or a calmer next step.",
          href: "/assess/plumbing?mode=booking-first",
          ctaLabel: "Start the urgency check",
        },
        {
          category: "trust",
          title: "What happens after you submit",
          promise: "Reduce uncertainty by making the response path and fallback path visible before commitment.",
          href: "/plumbing/emergency",
          ctaLabel: "Review the emergency path",
        },
        {
          category: "interactive",
          title: "Guided next-step tool",
          promise: "Give stressed visitors a lighter path to action when they need clarity before they call or submit.",
          href: "/resources/plumbing",
          ctaLabel: "Use the guided tool",
        },
      ];
    case "estimate":
      return [
        {
          category: "decision",
          title: "Project fit guide",
          promise: "Help estimate shoppers decide whether they are in a repair, replacement, or installation path.",
          href: "/calculator?niche=plumbing",
          ctaLabel: "Open the project guide",
        },
        {
          category: "diagnostic",
          title: "Planning assessment",
          promise: "Segment buyers who need a quote now from those who still need a bit more context.",
          href: "/assess/plumbing",
          ctaLabel: "Start the planning assessment",
        },
        {
          category: "trust",
          title: "Quote expectations",
          promise: "Explain what information helps, what can wait, and what the next step usually looks like.",
          href: "/resources/plumbing",
          ctaLabel: "Review quote expectations",
        },
      ];
    case "commercial":
      return [
        {
          category: "decision",
          title: "Service-path guide",
          promise: "Help teams choose between urgent service, structured intake, and longer-term coverage discussions.",
          href: "/plumbing/commercial",
          ctaLabel: "See the service paths",
        },
        {
          category: "diagnostic",
          title: "Commercial intake assessment",
          promise: "Capture enough context to route facilities and property requests more intelligently.",
          href: "/assess/plumbing?mode=form-first",
          ctaLabel: "Start the commercial assessment",
        },
        {
          category: "trust",
          title: "Process clarity pack",
          promise: "Make building context, coordination, and request expectations visible early.",
          href: "/resources/plumbing",
          ctaLabel: "Review the commercial process",
        },
      ];
    case "provider":
      return [
        {
          category: "decision",
          title: "Opportunity-fit review",
          promise: "Help providers decide whether the network fits their territory, issue mix, and response standards.",
          href: "/join-provider-network",
          ctaLabel: "Review provider fit",
        },
        {
          category: "diagnostic",
          title: "Readiness assessment",
          promise: "Guide better providers into the application path with service-area and readiness context already in mind.",
          href: "/assess/plumbing?mode=form-first",
          ctaLabel: "Start the readiness assessment",
        },
        {
          category: "trust",
          title: "Qualification standards",
          promise: "Show how service fit, responsiveness, and quality expectations shape the opportunity.",
          href: "/resources/plumbing",
          ctaLabel: "See the standards",
        },
      ];
    case "local":
      return [
        {
          category: "decision",
          title: "Local path chooser",
          promise: "Split urgent and planned local intent quickly so search visitors can act without confusion.",
          href: "/get-plumbing-help",
          ctaLabel: "Choose the right local path",
        },
        {
          category: "interactive",
          title: "Guided local tool",
          promise: "Offer a lighter decision path before the visitor commits to a longer form.",
          href: "/calculator?niche=plumbing",
          ctaLabel: "Use the local tool",
        },
        {
          category: "trust",
          title: "Local proof slot",
          promise: "Keep area relevance, process clarity, and local confidence visible before the first ask.",
          href: "/resources/plumbing",
          ctaLabel: "See the local page style",
        },
      ];
    default:
      return [
        {
          category: "decision",
          title: "Path chooser",
          promise: "Help visitors pick the right lane before deeper friction starts.",
          href: "/get-plumbing-help",
          ctaLabel: "Choose the right path",
        },
        {
          category: "interactive",
          title: "Guided tool",
          promise: "Offer a lower-pressure interactive step for visitors who need clarity before they commit.",
          href: "/calculator?niche=plumbing",
          ctaLabel: "Open the guided tool",
        },
        {
          category: "trust",
          title: "Public showroom",
          promise: "Review how the public assets are structured so trust and next-step clarity stay consistent across paths.",
          href: "/showroom/plumbing",
          ctaLabel: "Open the public showroom",
        },
      ];
  }
}
