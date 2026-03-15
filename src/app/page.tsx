import Link from "next/link";
import { headers } from "next/headers";
import { AdaptiveLeadCaptureForm } from "@/components/AdaptiveLeadCaptureForm";
import { ExperienceScaffold } from "@/components/ExperienceScaffold";
import { EXPERIENCE_HEURISTICS, resolveExperienceProfile } from "@/lib/experience";
import { getNiche } from "@/lib/catalog";
import { buildDashboardSnapshot } from "@/lib/dashboard";
import { buildDefaultFunnelGraphs } from "@/lib/funnel-library";
import { getAutomationHealth } from "@/lib/providers";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
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

function asAudience(value: string | string[] | undefined): "client" | "provider" | undefined {
  const normalized = asString(value);
  return normalized === "provider" || normalized === "client" ? normalized : undefined;
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
  const audience = asAudience(params.audience) ?? "client";
  const providerAudience = audience === "provider";
  const requestedNiche = asString(params.niche);
  const rootNiche = requestedNiche === "general" ? "general" : requestedNiche ?? "plumbing";
  const niche = getNiche(rootNiche);
  const headerStore = await headers();
  const graphs = buildDefaultFunnelGraphs(tenantConfig.tenantId);
  const health = getAutomationHealth();
  const snapshot = buildDashboardSnapshot(await getLeadRecords(), await getCanonicalEvents());
  const runtimeConfig = await getOperationalRuntimeConfig();
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
    family: asFamily(params.family) ?? (plumbingLike ? "qualification" : undefined),
    niche,
    audience,
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
  const metrics = [
    {
      label: plumbingLike ? (providerAudience ? "Dispatch providers" : "Hot leads") : "Lead M2 progression",
      value: plumbingLike
        ? providerAudience
          ? `${runtimeConfig.dispatch.providers.filter((provider) => provider.active !== false).length}`
          : `${snapshot.totals.hotLeads}`
        : `${snapshot.milestones.lead.returnEngaged}`,
      detail: plumbingLike
        ? providerAudience
          ? "Roster entries currently available for capacity-aware plumbing assignment."
          : "Urgent or booking-intent leads currently recognized by the runtime."
        : "Returning leads already tracked in the live runtime.",
    },
    {
      label: plumbingLike ? (providerAudience ? "Emergency-ready" : "Booked or offered") : "Lead M3 progression",
      value: plumbingLike
        ? providerAudience
          ? `${runtimeConfig.dispatch.providers.filter((provider) => provider.active !== false && provider.acceptsEmergency).length}`
          : `${snapshot.milestones.lead.bookedOrOffered}`
        : `${snapshot.milestones.lead.bookedOrOffered}`,
      detail: plumbingLike
        ? providerAudience
          ? "Providers currently flagged as ready for urgent plumbing demand."
          : "Jobs that already reached booking, estimate, or proposal momentum."
        : "Qualified next-step completions captured so far.",
    },
    {
      label: plumbingLike ? "Channel readiness" : "Automation mode",
      value: health.liveMode ? "Live" : "Dry run",
      detail: plumbingLike
        ? "Dispatch channels, documents, and workflows connected to the runtime."
        : "Channels and workflows already connected to the runtime.",
    },
  ];

  return (
    <ExperienceScaffold
      eyebrow={plumbingLike ? "LeadOS Plumbing Dispatch" : "LeadOS Adaptive Runtime"}
      title={plumbingLike
        ? providerAudience
          ? "Join the dispatch-ready provider network without directory friction"
          : "Book urgent plumbing demand without dead-end forms"
        : `${tenantConfig.brandName} turns first visits into milestone-two and milestone-three momentum`}
      summary={plumbingLike
        ? providerAudience
          ? `${profile.heroSummary} LeadOS also serves the supply side of the marketplace, giving plumbers and service teams a clean path into coverage mapping, readiness review, and dispatch activation.`
          : `${profile.heroSummary} LeadOS is optimized for urgent and high-intent plumbing traffic: capture, route, book, recover, and follow up without losing the job to slower competitors.`
        : `${profile.heroSummary} The runtime already knows how to capture, score, route, follow up, and recover the next step across ${Object.keys(graphs).length} funnel families.`}
      profile={profile}
      metrics={metrics}
    >
      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Marketplace entry points</p>
          <h2>Two starting paths for the two-sided plumbing marketplace</h2>
          <div className="stack-grid">
            <article className="stack-card">
              <p className="eyebrow">Homeowners, tenants, clients</p>
              <h3>Get help with an urgent job or an estimate</h3>
              <p className="muted">
                Use the demand-side path for dispatch, same-day booking, estimates, and live human fallback.
              </p>
              <div className="cta-row">
                <Link href="/get-plumbing-help" className="secondary">
                  Homeowner entry point
                </Link>
              </div>
            </article>
            <article className="stack-card">
              <p className="eyebrow">Plumbers, plumbing providers</p>
              <h3>Join the provider network and declare your coverage</h3>
              <p className="muted">
                Use the supply-side path to map service area, specialties, emergency coverage, and live capacity.
              </p>
              <div className="cta-row">
                <Link href="/join-provider-network" className="secondary">
                  Provider entry point
                </Link>
              </div>
            </article>
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">{plumbingLike ? "Dispatch model" : "Usability heuristics"}</p>
          <h2>{plumbingLike ? (providerAudience ? "Supply-side onboarding is part of the product now" : "The flagship wedge is plumbing, not generic lead gen") : "Every surface now aims to remove confusion before it appears"}</h2>
          <ul className="check-list">
            {(plumbingLike
              ? providerAudience
                ? [
                    "Provider path asks for coverage, specialties, and response readiness before anything else.",
                    "Demand-side and supply-side journeys now have distinct entry points and funnel logic.",
                    "LeadOS can route homeowners and onboard providers without collapsing them into one generic form.",
                  ]
                : niche.serviceCategories.map((item) => `Service category: ${item}`)
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
        service={providerAudience ? "provider-network" : tenantConfig.defaultService}
        pagePath="/"
        returning={asBoolean(params.returning)}
        profile={profile}
      />
    </ExperienceScaffold>
  );
}
