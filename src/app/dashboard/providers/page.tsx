import Link from "next/link";
import { getConfigStatusSummary } from "@/lib/config-status";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { getAutomationHealth } from "@/lib/providers";
import { getRuntimePersistenceMode } from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

export default async function ProviderHealthPage() {
  await requireOperatorPageSession("/dashboard/providers");
  const health = getAutomationHealth();
  const persistenceMode = getRuntimePersistenceMode();
  const configSummary = getConfigStatusSummary();
  const providerEntries = Object.entries(health.providers)
    .sort(([left], [right]) => left.localeCompare(right));

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
          </ul>
        </aside>
      </section>

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
            <h2>
              {status.status === "configured"
                ? "Configured"
                : status.status === "dry-run"
                ? "Configured / dry-run"
                : "Missing"}
            </h2>
            <p className="muted">{status.live ? "Live" : "Prepared"}</p>
            <p className="muted">{status.owner}</p>
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
