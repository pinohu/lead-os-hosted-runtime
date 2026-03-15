import Link from "next/link";
import { buildOperatorConsoleSnapshot } from "@/lib/dashboard";
import { getConfigStatusSummary } from "@/lib/config-status";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { formatPortalLabel } from "@/lib/operator-ui";
import { createProviderPortalLink } from "@/lib/provider-portal-auth";
import { getAutomationHealth } from "@/lib/providers";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
import {
  getBookingJobs,
  getCanonicalEvents,
  getExecutionTasks,
  getLeadRecords,
  getProviderDispatchRequests,
  getProviderExecutions,
  getRuntimePersistenceMode,
  getWorkflowRuns,
} from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function ProviderHealthPage() {
  await requireOperatorPageSession("/dashboard/providers");
  const [health, leads, events, bookingJobs, executionTasks, providerDispatchRequests, providerExecutions, workflowRuns, runtimeConfig] = await Promise.all([
    Promise.resolve(getAutomationHealth()),
    getLeadRecords(),
    getCanonicalEvents(),
    getBookingJobs(),
    getExecutionTasks(),
    getProviderDispatchRequests(),
    getProviderExecutions(),
    getWorkflowRuns(),
    getOperationalRuntimeConfig(),
  ]);
  const persistenceMode = getRuntimePersistenceMode();
  const configSummary = getConfigStatusSummary();
  const providerEntries = Object.entries(health.providers)
    .sort(([left], [right]) => left.localeCompare(right));
  const consoleSnapshot = buildOperatorConsoleSnapshot(
    leads,
    events,
    bookingJobs,
    executionTasks,
    providerDispatchRequests,
    providerExecutions,
    workflowRuns,
    runtimeConfig.dispatch.providers,
    {},
  );
  const providerScores = consoleSnapshot.plumbingDispatch.providerScores.slice(0, 8);
  const providerPortalLinks = await Promise.all(
    runtimeConfig.dispatch.providers
      .filter((provider) => Boolean(provider.contactEmail))
      .map(async (provider) => ({
        providerId: provider.id,
        providerLabel: provider.label,
        link: (await createProviderPortalLink(provider.contactEmail!)).url,
        contactEmail: provider.contactEmail!,
      })),
  );

  function formatPercent(value: number) {
    return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
  }

  return (
    <main className="experience-page">
      <section className="experience-hero">
        <div className="hero-copy">
          <p className="eyebrow">Provider health</p>
          <h1>{tenantConfig.brandName} integration readiness</h1>
          <p className="lede">
            This view shows which providers are configured, which channels are live, and where the
            runtime can act without human cleanup.
          </p>
          <div className="cta-row">
            <Link href="/dashboard" className="secondary">
              Back to dashboard
            </Link>
            <Link href="/dashboard/settings" className="secondary">
              Runtime settings
            </Link>
          </div>
        </div>
        <aside className="hero-rail">
          <p className="eyebrow">Channel readiness</p>
          <p className="muted">Persistence: {persistenceMode}</p>
          <ul className="journey-rail">
            {Object.entries(health.channels).map(([channel, ready]) => (
              <li key={channel}>
                <strong>{channel}</strong>
                <span>{ready ? "Live" : "Unavailable"}</span>
              </li>
            ))}
            <li>
              <strong>Env-only ready</strong>
              <span>{configSummary.envOnlyReady ? "yes" : "no"}</span>
            </li>
            <li>
              <strong>Dispatch providers</strong>
              <span>{consoleSnapshot.plumbingDispatch.configuredDispatchProviders}</span>
            </li>
            <li>
              <strong>Embedded secrets</strong>
              <span>{configSummary.embeddedSecretsEnabled ? "enabled" : "disabled"}</span>
            </li>
          </ul>
        </aside>
      </section>

      {providerScores.length > 0 ? (
        <section className="panel">
          <p className="eyebrow">Routing confidence</p>
          <h2>Provider reliability for live plumbing demand</h2>
          <p className="muted">
            These scores are operator guidance, not guarantees. LeadOS weighs execution history,
            booking fill, completions, and completed revenue so dispatch teams can route with more
            confidence under pressure.
          </p>
          <div className="stack-grid">
            {providerScores.map((provider) => (
              <article key={provider.provider} className="stack-card">
                <p className="eyebrow">{formatPortalLabel(provider.provider)}</p>
                <h3>{provider.routingScore}</h3>
                <div className="portal-status-row">
                  <span className="portal-chip">Reliability {provider.reliabilityScore}</span>
                  <span className="portal-chip">Revenue {provider.revenueScore}</span>
                </div>
                <p className="muted">
                  Success rate: {formatPercent(provider.successRate)} | Booking fill: {formatPercent(provider.bookingFillRate)}
                </p>
                <p className="muted">
                  Completion: {formatPercent(provider.completionRate)} | Completed jobs: {provider.completedOutcomes}
                </p>
                <p className="muted">
                  Completed revenue: {provider.completedRevenue} | Avg completed value: {provider.averageCompletedRevenue || "n/a"}
                </p>
                <p className="muted">
                  Attempts: {provider.attempts} | Workflow failures: {provider.workflowFailures}
                </p>
              </article>
            ))}
          </div>
          {consoleSnapshot.plumbingDispatch.configuredDispatchProviders === 0 ? (
            <p className="muted">No dispatch roster is configured yet, so LeadOS cannot recommend coverage-aware backup providers.</p>
          ) : null}
        </section>
      ) : null}

      {providerPortalLinks.length > 0 ? (
        <section className="panel">
          <p className="eyebrow">Provider self-serve</p>
          <h2>Signed access links for dispatch providers</h2>
          <p className="muted">
            Share these links with the dispatch email on file so providers can update coverage, pause intake,
            and accept or decline live jobs without operator intervention.
          </p>
          <div className="stack-grid">
            {providerPortalLinks.map((entry) => (
              <article key={entry.providerId} className="stack-card">
                <p className="eyebrow">{entry.providerLabel}</p>
                <h3 className="portal-breakable">{entry.contactEmail}</h3>
                <p className="muted portal-breakable">{entry.link}</p>
                <a href={entry.link} className="secondary">Open provider portal link</a>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {consoleSnapshot.plumbingDispatch.zipCellLiquidity.topCells.length > 0 ? (
        <section className="panel">
          <p className="eyebrow">ZIP-cell liquidity</p>
          <h2>Where to recruit supply versus where to add demand</h2>
          <div className="stack-grid">
            {consoleSnapshot.plumbingDispatch.zipCellLiquidity.topCells.map((cell) => (
              <article key={cell.label} className="stack-card">
                <p className="eyebrow">{cell.label}</p>
                <h3>{cell.liquidityScore}</h3>
                <p className="muted">
                  Leads: {cell.leadCount} | Urgent: {cell.urgentLeadCount} | Accepting providers: {cell.acceptingProviders}
                </p>
                <p className="muted">
                  Open capacity: {cell.openCapacity} | Completed revenue: {cell.completedRevenue}
                </p>
                <p className="muted portal-breakable">{cell.recommendedAction}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {!configSummary.envOnlyReady ? (
        <section className="panel">
          <p className="eyebrow">Config hardening</p>
          <h2>Embedded fallback still in use</h2>
          <p className="muted">
            The runtime is still depending on embedded fallback credentials for some providers.
            Production will be fully hardened only after those values are moved into Railway env
            vars and the embedded fallbacks are removed.
          </p>
          <ul className="check-list">
            {configSummary.embeddedFallbacks.map((provider) => (
              <li key={provider}>{provider}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="stack-grid">
        {providerEntries.map(([provider, status]) => (
          <article key={provider} className="stack-card">
            <p className="eyebrow">{formatPortalLabel(provider)}</p>
            <h2>{formatPortalLabel(status.capability)}</h2>
            <div className="portal-status-row">
              <span className="portal-chip">{status.live ? "Executable" : "Not executing"}</span>
              <span className="portal-chip">Legacy {formatPortalLabel(status.status)}</span>
            </div>
            <p className="muted">
              {status.status === "configured"
                ? "Legacy status: configured"
                : status.status === "dry-run"
                  ? "Legacy status: configured / dry-run"
                  : "Legacy status: missing"}
            </p>
            <p className="muted">{status.live ? "Execution ready" : "Not executing yet"}</p>
            <p className="muted portal-breakable">{status.owner}</p>
            <p className="muted portal-breakable">{status.responsibility}</p>
            {(() => {
              const config = configSummary.providers.find((entry) => entry.key === provider);
              if (!config) return null;
              return (
                <>
                  <p className="muted">Credential source: {config.source}</p>
                  {config.notes ? <p className="muted portal-breakable">{config.notes}</p> : null}
                </>
              );
            })()}
          </article>
        ))}
      </section>
    </main>
  );
}
