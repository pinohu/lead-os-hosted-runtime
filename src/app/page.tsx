import { headers } from "next/headers";
import { AdaptiveLeadCaptureForm } from "@/components/AdaptiveLeadCaptureForm";
import { ExperienceScaffold } from "@/components/ExperienceScaffold";
import { EXPERIENCE_HEURISTICS, resolveExperienceProfile } from "@/lib/experience";
import { getNiche } from "@/lib/catalog";
import { buildDashboardSnapshot } from "@/lib/dashboard";
import { buildDefaultFunnelGraphs } from "@/lib/funnel-library";
import { getAutomationHealth } from "@/lib/providers";
import type { FunnelFamily } from "@/lib/runtime-schema";
import { getCanonicalEvents, getLeadRecords } from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function asBoolean(value: string | string[] | undefined) {
  const normalized = asString(value)?.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function asIntent(value: string | string[] | undefined): "discover" | "compare" | "solve-now" | undefined {
  const normalized = asString(value);
  return normalized === "discover" || normalized === "compare" || normalized === "solve-now"
    ? normalized
    : undefined;
}

function asFamily(value: string | string[] | undefined): FunnelFamily | undefined {
  const normalized = asString(value);
  const valid: FunnelFamily[] = [
    "lead-magnet",
    "qualification",
    "chat",
    "webinar",
    "authority",
    "checkout",
    "retention",
    "rescue",
    "referral",
    "continuity",
  ];
  return normalized && valid.includes(normalized as FunnelFamily) ? (normalized as FunnelFamily) : undefined;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = (await searchParams) ?? {};
  const niche = getNiche(asString(params.niche) ?? tenantConfig.defaultNiche);
  const headerStore = await headers();
  const graphs = buildDefaultFunnelGraphs(tenantConfig.tenantId);
  const health = getAutomationHealth();
  const snapshot = buildDashboardSnapshot(await getLeadRecords(), await getCanonicalEvents());
  const plumbingLike = niche.slug === "plumbing" || niche.slug === "home-services";
  const footprintItems = plumbingLike
    ? niche.geographyModel.map((field) => ({
        id: field,
        title: field,
        detail: "Used for routing, dispatch, and SEO structure",
      }))
    : Object.values(graphs).slice(0, 5).map((graph) => ({
        id: graph.id,
        title: graph.name,
        detail: `${graph.nodes.length} canonical nodes, ${graph.goal} goal`,
      }));
  const profile = resolveExperienceProfile({
    family: asFamily(params.family),
    niche,
    supportEmail: tenantConfig.supportEmail,
    source: asString(params.source),
    intent: asIntent(params.intent) ?? (plumbingLike ? "solve-now" : undefined),
    returning: asBoolean(params.returning),
    milestone: asString(params.milestone),
    preferredMode: asString(params.mode),
    score: Number(asString(params.score) ?? 0) || undefined,
    userAgent: headerStore.get("user-agent") ?? undefined,
    referrer: headerStore.get("referer") ?? undefined,
  });

  return (
    <ExperienceScaffold
      eyebrow={plumbingLike ? "LeadOS Plumbing Dispatch" : "LeadOS Adaptive Runtime"}
      title={plumbingLike
        ? "Book urgent plumbing demand without dead-end forms"
        : `${tenantConfig.brandName} turns first visits into milestone-two and milestone-three momentum`}
      summary={plumbingLike
        ? `${profile.heroSummary} LeadOS is optimized for urgent and high-intent plumbing traffic: capture, route, book, recover, and follow up without losing the job to slower competitors.`
        : `${profile.heroSummary} The runtime already knows how to capture, score, route, follow up, and recover the next step across ${Object.keys(graphs).length} funnel families.`}
      profile={profile}
      metrics={[
        {
          label: plumbingLike ? "Hot leads" : "Lead M2 progression",
          value: plumbingLike ? `${snapshot.totals.hotLeads}` : `${snapshot.milestones.lead.returnEngaged}`,
          detail: plumbingLike
            ? "Urgent or booking-intent leads currently recognized by the runtime."
            : "Returning leads already tracked in the live runtime.",
        },
        {
          label: plumbingLike ? "Booked or offered" : "Lead M3 progression",
          value: `${snapshot.milestones.lead.bookedOrOffered}`,
          detail: plumbingLike
            ? "Jobs that already reached booking, estimate, or proposal momentum."
            : "Qualified next-step completions captured so far.",
        },
        {
          label: plumbingLike ? "Channel readiness" : "Automation mode",
          value: health.liveMode ? "Live" : "Dry run",
          detail: plumbingLike
            ? "Dispatch channels, documents, and workflows connected to the runtime."
            : "Channels and workflows already connected to the runtime.",
        },
      ]}
    >
      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">{plumbingLike ? "Dispatch model" : "Usability heuristics"}</p>
          <h2>{plumbingLike ? "The flagship wedge is plumbing, not generic lead gen" : "Every surface now aims to remove confusion before it appears"}</h2>
          <ul className="check-list">
            {(plumbingLike
              ? niche.serviceCategories.map((item) => `Service category: ${item}`)
              : EXPERIENCE_HEURISTICS
            ).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="panel">
          <p className="eyebrow">{plumbingLike ? "Geography and response" : "Operational footprint"}</p>
          <h2>{plumbingLike ? "Built for service radius, urgency, and next-step certainty" : "Adaptive journeys, not static landing pages"}</h2>
          <ul className="check-list">
            {footprintItems.map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong>: {item.detail}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <AdaptiveLeadCaptureForm
        source="manual"
        family={profile.family}
        niche={niche.slug}
        service={tenantConfig.defaultService}
        pagePath="/"
        returning={asBoolean(params.returning)}
        profile={profile}
      />
    </ExperienceScaffold>
  );
}
