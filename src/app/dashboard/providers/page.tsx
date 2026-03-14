import Link from "next/link";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { getAutomationHealth } from "@/lib/providers";
import { getRuntimePersistenceMode } from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

export default async function ProviderHealthPage() {
  await requireOperatorPageSession("/dashboard/providers");
  const health = getAutomationHealth();
  const persistenceMode = getRuntimePersistenceMode();
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
          </ul>
        </aside>
      </section>

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
          </article>
        ))}
      </section>
    </main>
  );
}
