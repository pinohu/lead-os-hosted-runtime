import { headers } from "next/headers";
import Link from "next/link";
import { AdaptiveLeadCaptureForm } from "@/components/AdaptiveLeadCaptureForm";
import { ExperienceScaffold } from "@/components/ExperienceScaffold";
import { getNiche } from "@/lib/catalog";
import { buildOperatorConsoleSnapshot } from "@/lib/dashboard";
import { resolveExperienceProfile } from "@/lib/experience";
import { getAutomationHealth } from "@/lib/providers";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
import {
  getBookingJobs,
  getCanonicalEvents,
  getLeadRecords,
  getProviderExecutions,
  getWorkflowRuns,
} from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

type ProviderNetworkPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function asBoolean(value: string | string[] | undefined) {
  const normalized = asString(value)?.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export default async function ProviderNetworkPage({ searchParams }: ProviderNetworkPageProps) {
  const params = (await searchParams) ?? {};
  const niche = getNiche("plumbing");
  const headerStore = await headers();
  const [health, leads, events, bookingJobs, providerExecutions, workflowRuns, runtimeConfig] = await Promise.all([
    Promise.resolve(getAutomationHealth()),
    getLeadRecords(),
    getCanonicalEvents(),
    getBookingJobs(),
    getProviderExecutions(),
    getWorkflowRuns(),
    getOperationalRuntimeConfig(),
  ]);
  const consoleSnapshot = buildOperatorConsoleSnapshot(
    leads,
    events,
    bookingJobs,
    providerExecutions,
    workflowRuns,
    runtimeConfig.dispatch.providers,
    {},
  );
  const profile = resolveExperienceProfile({
    family: "qualification",
    niche,
    audience: "provider",
    supportEmail: tenantConfig.supportEmail,
    source: asString(params.source) ?? "manual",
    intent: "compare",
    returning: asBoolean(params.returning),
    milestone: asString(params.milestone),
    preferredMode: asString(params.mode) ?? "form-first",
    score: Number(asString(params.score) ?? 50),
    userAgent: headerStore.get("user-agent") ?? undefined,
    referrer: headerStore.get("referer") ?? undefined,
  });

  return (
    <ExperienceScaffold
      eyebrow="Marketplace supply path"
      title="Join the plumbing provider network with your real coverage, specialties, and capacity"
      summary="This is the supply-side entry point for plumbers and plumbing service providers. LeadOS uses it to build a dispatch-ready provider roster instead of treating providers like directory listings with no operational context."
      profile={profile}
      metrics={[
        {
          label: "Dispatch providers",
          value: `${runtimeConfig.dispatch.providers.filter((provider) => provider.active !== false).length}`,
          detail: "Active roster entries already mapped for capacity-aware routing.",
        },
        {
          label: "Emergency-ready",
          value: `${runtimeConfig.dispatch.providers.filter((provider) => provider.active !== false && provider.acceptsEmergency).length}`,
          detail: "Providers currently flagged as available for urgent plumbing demand.",
        },
        {
          label: "Top routing score",
          value: String(consoleSnapshot.plumbingDispatch.providerScores[0]?.routingScore ?? "n/a"),
          detail: health.liveMode ? "LeadOS is already scoring supply-side reliability from runtime outcomes." : "Supply-side scoring is running in dry-run mode.",
        },
      ]}
    >
      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Who this is for</p>
          <h2>Licensed plumbers and plumbing service teams who want better jobs</h2>
          <ul className="check-list">
            <li>Independent plumbers and multi-tech teams who want better-fit demand.</li>
            <li>Providers who can declare real service area, emergency hours, and issue-type fit.</li>
            <li>Teams that want dispatch-ready routing instead of generic lead-list resale.</li>
          </ul>
        </article>
        <article className="panel">
          <p className="eyebrow">Marketplace split</p>
          <h2>Need the homeowner demand path instead?</h2>
          <p className="muted">
            If you need plumbing service for a home, rental, or commercial property, use the consumer-facing path so LeadOS can route your job correctly.
          </p>
          <div className="cta-row">
            <Link href="/get-plumbing-help" className="secondary">
              Go to plumbing help
            </Link>
          </div>
        </article>
      </section>

      <AdaptiveLeadCaptureForm
        source="manual"
        family={profile.family}
        niche={niche.slug}
        service="provider-network"
        pagePath="/join-provider-network"
        returning={asBoolean(params.returning)}
        profile={profile}
      />
    </ExperienceScaffold>
  );
}
