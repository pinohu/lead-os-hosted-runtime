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
  const profile = resolveExperienceProfile({
    family: asFamily(params.family),
    niche,
    supportEmail: tenantConfig.supportEmail,
    source: asString(params.source),
    intent: asIntent(params.intent),
    returning: asBoolean(params.returning),
    milestone: asString(params.milestone),
    preferredMode: asString(params.mode),
    score: Number(asString(params.score) ?? 0) || undefined,
    userAgent: headerStore.get("user-agent") ?? undefined,
    referrer: headerStore.get("referer") ?? undefined,
  });

  return (
    <ExperienceScaffold
      eyebrow="LeadOS Adaptive Runtime"
      title={`${tenantConfig.brandName} turns first visits into milestone-two and milestone-three momentum`}
      summary={`${profile.heroSummary} The runtime already knows how to capture, score, route, follow up, and recover the next step across ${Object.keys(graphs).length} funnel families.`}
      profile={profile}
      metrics={[
        {
          label: "Lead M2 progression",
          value: `${snapshot.milestones.lead.returnEngaged}`,
          detail: "Returning leads already tracked in the live runtime.",
        },
        {
          label: "Lead M3 progression",
          value: `${snapshot.milestones.lead.bookedOrOffered}`,
          detail: "Qualified next-step completions captured so far.",
        },
        {
          label: "Automation mode",
          value: health.liveMode ? "Live" : "Dry run",
          detail: "Channels and workflows already connected to the runtime.",
        },
      ]}
    >
      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Usability heuristics</p>
          <h2>Every surface now aims to remove confusion before it appears</h2>
          <ul className="check-list">
            {EXPERIENCE_HEURISTICS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="panel">
          <p className="eyebrow">Operational footprint</p>
          <h2>Adaptive journeys, not static landing pages</h2>
          <ul className="check-list">
            {Object.values(graphs).slice(0, 5).map((graph) => (
              <li key={graph.id}>
                <strong>{graph.name}</strong>: {graph.nodes.length} canonical nodes, {graph.goal} goal
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
