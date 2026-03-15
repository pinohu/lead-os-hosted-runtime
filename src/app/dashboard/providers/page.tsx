import Link from "next/link";
import { buildOperatorConsoleSnapshot } from "@/lib/dashboard";
import { getConfigStatusSummary } from "@/lib/config-status";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { getAutomationHealth } from "@/lib/providers";
import {
  getBookingJobs,
  getCanonicalEvents,
  getLeadRecords,
  getProviderExecutions,
  getRuntimePersistenceMode,
  getWorkflowRuns,
} from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function ProviderHealthPage() {
  await requireOperatorPageSession("/dashboard/providers");
  const [health, leads, events, bookingJobs, providerExecutions, workflowRuns] = await Promise.all([
    Promise.resolve(getAutomationHealth()),
    getLeadRecords(),
    getCanonicalEvents(),
    getBookingJobs(),
    getProviderExecutions(),
    getWorkflowRuns(),
  ]);
  const persistenceMode = getRuntimePersistenceMode();
  const configSummary = getConfigStatusSummary();
  const providerEntries = Object.entries(health.providers)
    .sort(([left], [right]) => left.localeCompare(right));
  const consoleSnapshot = buildOperatorConsoleSnapshot(
    leads,
    events,
    bookingJobs,
    providerExecutions,
    workflowRuns,
    {},
  );
  const providerScores = consoleSnapshot.plumbingDispatch.providerScores.slice(0, 8);

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
          <div className="stack-grid">
            {providerScores.map((provider) => (
              <article key={provider.provider} className="stack-card">
                <p className="eyebrow">{provider.provider}</p>
                <h3>{provider.reliabilityScore}</h3>
                <p className="muted">
                  Success rate: {formatPercent(provider.successRate)} | Booking fill: {formatPercent(provider.bookingFillRate)}
                </p>
                <p className="muted">
                  Completion: {formatPercent(provider.completionRate)} | Completed jobs: {provider.completedOutcomes}
                </p>
                <p className="muted">
                  Attempts: {provider.attempts} | Workflow failures: {provider.workflowFailures}
                </p>
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
            <p className="eyebrow">{provider}</p>
            <h2>{status.capability.replace(/-/g, " ")}</h2>
            <p className="muted">
              {status.status === "configured"
                ? "Legacy status: configured"
                : status.status === "dry-run"
                  ? "Legacy status: configured / dry-run"
                  : "Legacy status: missing"}
            </p>
            <p className="muted">{status.live ? "Execution ready" : "Not executing yet"}</p>
            <p className="muted">{status.owner}</p>
            <p className="muted">{status.responsibility}</p>
            {(() => {
              const config = configSummary.providers.find((entry) => entry.key === provider);
              if (!config) return null;
              return (
                <>
                  <p className="muted">Credential source: {config.source}</p>
                  {config.notes ? <p className="muted">{config.notes}</p> : null}
                </>
              );
            })()}
          </article>
        ))}
      </section>
    </main>
  );
}
