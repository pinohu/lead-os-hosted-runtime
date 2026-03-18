import Link from "next/link";
import { buildGrowthOpsSnapshot } from "@/lib/growth-ops";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { formatOptionalDateTime } from "@/lib/operator-ui";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
import { getCanonicalEvents, getProviderExecutions } from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function GrowthDashboardPage() {
  await requireOperatorPageSession("/dashboard/growth");
  const [runtimeConfig, events, providerExecutions] = await Promise.all([
    getOperationalRuntimeConfig(),
    getCanonicalEvents(),
    getProviderExecutions(),
  ]);
  const snapshot = buildGrowthOpsSnapshot(runtimeConfig, events, providerExecutions);

  return (
    <main className="experience-page">
      <section className="experience-hero">
        <div className="hero-copy">
          <p className="eyebrow">Growth operations</p>
          <h1>{tenantConfig.brandName} attribution and conversion control</h1>
          <p className="lede">
            See whether the growth stack is merely configured or actually producing signal across
            calls, forms, behavioral scoring, CRO, checkout starts, and referral loops.
          </p>
          <div className="cta-row">
            <Link href="/dashboard/overview" className="primary">
              Back to overview
            </Link>
            <Link href="/dashboard/settings" className="secondary">
              Growth settings
            </Link>
            <Link href="/dashboard/alerts" className="secondary">
              Alert operations
            </Link>
          </div>
        </div>
        <aside className="hero-rail">
          <p className="eyebrow">Readiness</p>
          <ul className="journey-rail">
            <li>
              <strong>CallScaler</strong>
              <span>{snapshot.health.callScaler.webhookReady ? "ready" : "missing webhook"}</span>
            </li>
            <li>
              <strong>Salespanel</strong>
              <span>{snapshot.health.salespanel.enabled ? "enabled" : "disabled"}</span>
            </li>
            <li>
              <strong>Plerdy</strong>
              <span>{snapshot.health.plerdy.enabled ? "enabled" : "disabled"}</span>
            </li>
            <li>
              <strong>Partnero</strong>
              <span>{snapshot.health.partnero.webhookReady ? "ready" : "missing webhook"}</span>
            </li>
            <li>
              <strong>Thoughtly</strong>
              <span>{snapshot.health.thoughtly.webhookReady ? "ready" : "missing webhook"}</span>
            </li>
          </ul>
        </aside>
      </section>

      <section className="metric-grid">
        {snapshot.pulse.map((item) => (
          <article key={item.label} className="metric-card">
            <p className="eyebrow">{item.label}</p>
            <h2>{item.value}</h2>
            <p className="muted">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Growth blockers</p>
          <h2>Leaks worth fixing before scaling traffic</h2>
          {snapshot.blockers.length === 0 ? (
            <p className="muted">No obvious growth-stack blockers are being flagged from current runtime activity.</p>
          ) : (
            <ul className="check-list">
              {snapshot.blockers.map((item) => (
                <li key={item} className="portal-breakable">{item}</li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel">
          <p className="eyebrow">Funnel flow</p>
          <h2>Where visitor signal is accumulating</h2>
          <div className="stack-grid">
            {snapshot.funnelBreakdown.map((section) => (
              <article key={section.label} className="stack-card">
                <p className="eyebrow">{section.label}</p>
                <ul className="check-list">
                  {section.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <p className="eyebrow">Tool activity</p>
        <h2>What each connected system is actually doing</h2>
        <div className="stack-grid growth-verification-grid">
          {snapshot.toolPulse.map((tool) => (
            <article key={tool.label} className={`stack-card growth-verification-card tone-${tool.tone}`}>
              <div className="portal-status-row">
                <span className="portal-chip">{tool.label}</span>
                <span className="portal-chip">{tool.readiness}</span>
              </div>
              <h3>{tool.totalExecutions}</h3>
              <p className="muted">Recorded executions</p>
              <p className="muted">Success {tool.successCount} | Failures {tool.failureCount}</p>
              <p className="portal-breakable"><strong>Latest:</strong> {tool.lastDetail}</p>
              <p className="muted">{tool.lastSeenAt ? formatOptionalDateTime(tool.lastSeenAt) : "No activity yet."}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Recent activity</p>
        <h2>Latest growth-stack execution trail</h2>
        {snapshot.recentActivity.length === 0 ? (
          <p className="muted">No recent growth activity has been recorded yet.</p>
        ) : (
          <div className="stack-grid">
            {snapshot.recentActivity.map((item) => (
              <article key={`${item.provider}-${item.createdAt}-${item.detail}`} className={`stack-card tone-${item.tone}`}>
                <div className="portal-status-row">
                  <span className="portal-chip">{item.provider}</span>
                  <span className="portal-chip">{item.kind}</span>
                  <span className="portal-chip">{formatOptionalDateTime(item.createdAt)}</span>
                </div>
                <p className="portal-breakable">{item.detail}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
