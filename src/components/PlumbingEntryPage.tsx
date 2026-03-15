import { headers } from "next/headers";
import Link from "next/link";
import { AdaptiveLeadCaptureForm } from "@/components/AdaptiveLeadCaptureForm";
import { ExperienceScaffold } from "@/components/ExperienceScaffold";
import {
  buildPlumbingIntegrationBundle,
  type PlumbingEntrypointDefinition,
} from "@/lib/plumbing-entrypoints";
import { getNiche } from "@/lib/catalog";
import { buildDashboardSnapshot, buildOperatorConsoleSnapshot } from "@/lib/dashboard";
import { resolveExperienceProfile } from "@/lib/experience";
import { getAutomationHealth } from "@/lib/providers";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
import {
  getBookingJobs,
  getCanonicalEvents,
  getExecutionTasks,
  getLeadRecords,
  getProviderExecutions,
  getWorkflowRuns,
} from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

type PlumbingEntryPageProps = {
  entry: PlumbingEntrypointDefinition;
  searchParams?: Record<string, string | string[] | undefined>;
};

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function asBoolean(value: string | string[] | undefined) {
  const normalized = asString(value)?.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export async function PlumbingEntryPage({ entry, searchParams = {} }: PlumbingEntryPageProps) {
  const niche = getNiche("plumbing");
  const headerStore = await headers();
  const [health, leads, events, bookingJobs, executionTasks, providerExecutions, workflowRuns, runtimeConfig] =
    await Promise.all([
      Promise.resolve(getAutomationHealth()),
      getLeadRecords(),
      getCanonicalEvents(),
      getBookingJobs(),
      getExecutionTasks(),
      getProviderExecutions(),
      getWorkflowRuns(),
      getOperationalRuntimeConfig(),
    ]);
  const snapshot = buildDashboardSnapshot(leads, events);
  const consoleSnapshot = buildOperatorConsoleSnapshot(
    leads,
    events,
    bookingJobs,
    executionTasks,
    providerExecutions,
    workflowRuns,
    runtimeConfig.dispatch.providers,
    {},
  );

  const profile = resolveExperienceProfile({
    family: entry.family,
    niche,
    audience: entry.audience,
    supportEmail: tenantConfig.supportEmail,
    source: asString(searchParams.source) ?? "manual",
    intent: entry.intent,
    returning: asBoolean(searchParams.returning),
    milestone: asString(searchParams.milestone),
    preferredMode: asString(searchParams.mode) ?? entry.preferredMode,
    score: Number(asString(searchParams.score) ?? (entry.audience === "provider" ? 55 : 80)),
    userAgent: headerStore.get("user-agent") ?? undefined,
    referrer: headerStore.get("referer") ?? undefined,
  });

  const activeProviders = runtimeConfig.dispatch.providers.filter((provider) => provider.active !== false);
  const emergencyProviders = activeProviders.filter((provider) => provider.acceptsEmergency);
  const providerScore = consoleSnapshot.plumbingDispatch.providerScores[0];
  const integrations = buildPlumbingIntegrationBundle(entry, tenantConfig.siteUrl);

  const metrics =
    entry.audience === "provider"
      ? [
          {
            label: "Active provider roster",
            value: `${activeProviders.length}`,
            detail: "Providers currently mapped for routing across service areas and specialties.",
          },
          {
            label: "Emergency-ready providers",
            value: `${emergencyProviders.length}`,
            detail: "Roster entries currently marked as ready for urgent plumbing demand.",
          },
          {
            label: "Top routing confidence",
            value: providerScore ? String(providerScore.routingScore) : "n/a",
            detail: "Outcome-aware ranking snapshot for the strongest current provider fit.",
          },
        ]
      : [
          {
            label: "Hot plumbing leads",
            value: `${snapshot.totals.hotLeads}`,
            detail: "Urgent or booking-intent plumbing demand currently recognized by the runtime.",
          },
          {
            label: "Booked or offered",
            value: `${snapshot.milestones.lead.bookedOrOffered}`,
            detail: "Jobs already moved into booking, estimate, or proposal momentum.",
          },
          {
            label: "Dispatch channels",
            value: health.liveMode ? "Live" : "Dry run",
            detail: "Booking, follow-up, and workflow channels connected behind this entry path.",
          },
        ];

  const splitLink =
    entry.audience === "provider"
      ? {
          href: "/get-plumbing-help",
          label: "Need plumbing help instead?",
          description:
            "Use the demand-side marketplace path for homeowners, tenants, and commercial buyers who need service.",
          cta: "Go to plumbing help",
        }
      : {
          href: "/join-provider-network",
          label: "Need the provider side instead?",
          description:
            "Use the supply-side marketplace path for plumbers and service companies who want to join the network.",
          cta: "Go to provider onboarding",
        };

  return (
    <ExperienceScaffold
      eyebrow={entry.eyebrow}
      title={entry.title}
      summary={entry.summary}
      profile={profile}
      metrics={metrics}
    >
      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">{entry.chipsLabel}</p>
          <h2>Entry-point signals that should be obvious immediately</h2>
          <div className="signal-pill-grid" aria-label={entry.chipsLabel}>
            {entry.chips.map((chip) => (
              <span key={chip} className="signal-pill">
                {chip}
              </span>
            ))}
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">Marketplace split</p>
          <h2>{splitLink.label}</h2>
          <p className="muted">{splitLink.description}</p>
          <div className="cta-row">
            <Link href={splitLink.href} className="secondary">
              {splitLink.cta}
            </Link>
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">{entry.pathLabel}</p>
          <h2>What the next step should feel like</h2>
          <ol className="step-list">
            {entry.pathSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>
        <article className="panel">
          <p className="eyebrow">{entry.trustLabel}</p>
          <h2>Trust architecture near the ask</h2>
          <ul className="check-list">
            {entry.trustSignals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">{entry.proofLabel}</p>
          <h2>Related entry points inside the same marketplace</h2>
          <div className="entry-link-grid">
            {entry.relatedLinks.map((link) => (
              <Link key={link.href} href={link.href} className="entry-link-card">
                <strong>{link.label}</strong>
                <span>{link.description}</span>
              </Link>
            ))}
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">Local and operational context</p>
          <h2>Built for ZIP-aware routing and large marketplace operations</h2>
          <ul className="check-list">
            <li>ZIP, city, county, service radius, and emergency coverage stay part of the routing model.</li>
            <li>Demand and supply enter through different funnels, then meet through dispatch logic rather than directory browsing.</li>
            <li>Every path keeps one dominant action, one safe fallback, and a clear explanation of what happens next.</li>
          </ul>
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Hosted deployment</p>
          <h2>Direct link for this entry point</h2>
          <p className="muted">
            Use this URL for buttons, ads, email, SMS, QR flows, directory listings, or a dedicated subdomain handoff.
          </p>
          <div className="code-card">
            <pre><code>{integrations.hostedUrl}</code></pre>
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">Embed deployment</p>
          <h2>Widget install code for client websites</h2>
          <p className="muted">
            This script launches the matching LeadOS widget for this exact entry path and service intent.
          </p>
          <div className="code-card">
            <pre><code>{integrations.widgetScript}</code></pre>
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">Iframe handoff</p>
          <h2>Embedded hosted-page fallback</h2>
          <p className="muted">
            Use this when a client wants the full hosted page embedded instead of the drawer widget.
          </p>
          <div className="code-card">
            <pre><code>{integrations.iframeEmbed}</code></pre>
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">Integration endpoints</p>
          <h2>Boot and manifest endpoints</h2>
          <ul className="check-list">
            <li><strong>Widget boot</strong>: <span className="portal-breakable">{integrations.bootEndpoint}</span></li>
            <li><strong>Embed manifest</strong>: <span className="portal-breakable">{integrations.manifestEndpoint}</span></li>
            <li><strong>Launcher label</strong>: {integrations.launcherLabel}</li>
            <li><strong>Deployment blueprint</strong>: <Link href="/deployments/plumbing" className="link-inline">Open generator page</Link></li>
          </ul>
        </article>
      </section>

      <AdaptiveLeadCaptureForm
        source="manual"
        family={profile.family}
        niche={niche.slug}
        service={entry.service}
        pagePath={entry.route}
        returning={asBoolean(searchParams.returning)}
        profile={profile}
      />
    </ExperienceScaffold>
  );
}
