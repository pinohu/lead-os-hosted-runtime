import Link from "next/link";
import { getDeploymentRegistrySnapshot } from "@/lib/deployment-registry";
import { buildOperatorConsoleSnapshot } from "@/lib/dashboard";
import { buildSystemOverviewSnapshot } from "@/lib/operator-observability";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { formatCurrency, formatOptionalDateTime } from "@/lib/operator-ui";
import { getAutomationHealth } from "@/lib/providers";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
import {
  getBookingJobs,
  getCanonicalEvents,
  getDocumentJobs,
  getExecutionTasks,
  getLeadRecords,
  getProviderDispatchRequests,
  getProviderExecutions,
  getWorkflowRuns,
} from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function OverviewDashboardPage() {
  await requireOperatorPageSession("/dashboard/overview");
  const [
    leads,
    events,
    bookingJobs,
    documentJobs,
    executionTasks,
    workflowRuns,
    providerDispatchRequests,
    providerExecutions,
    runtimeConfig,
    deploymentSnapshot,
  ] = await Promise.all([
    getLeadRecords(),
    getCanonicalEvents(),
    getBookingJobs(),
    getDocumentJobs(),
    getExecutionTasks(),
    getWorkflowRuns(),
    getProviderDispatchRequests(),
    getProviderExecutions(),
    getOperationalRuntimeConfig(),
    getDeploymentRegistrySnapshot(),
  ]);
  const consoleSnapshot = buildOperatorConsoleSnapshot(
    leads,
    events,
    bookingJobs,
    executionTasks,
    providerDispatchRequests,
    providerExecutions,
    workflowRuns,
    runtimeConfig.dispatch.providers,
    runtimeConfig.marketplace,
    {},
  );
  const health = getAutomationHealth();
  const overview = buildSystemOverviewSnapshot({
    consoleSnapshot,
    leads,
    workflowRuns,
    providerExecutions,
    bookingJobs,
    documentJobs,
    executionTasks,
    providerRequests: providerDispatchRequests,
    deploymentSummary: deploymentSnapshot.summary,
  });

  return (
    <main className="experience-page">
      <section className="experience-hero">
        <div className="hero-copy">
          <p className="eyebrow">System overview</p>
          <h1>{tenantConfig.brandName} at a glance</h1>
          <p className="lede">
            A compact operational view of demand, routing, rollout health, and failures so you can
            understand what the system is doing without wading through every queue first.
          </p>
          <div className="cta-row">
            <Link href="/dashboard" className="primary">
              Open dispatch desk
            </Link>
            <Link href="/dashboard/providers" className="secondary">
              Provider health
            </Link>
            <Link href="/dashboard/deployments" className="secondary">
              Rollout registry
            </Link>
          </div>
        </div>
        <aside className="hero-rail">
          <p className="eyebrow">System state</p>
          <ul className="journey-rail">
            <li>
              <strong>Live mode</strong>
              <span>{health.liveMode ? "enabled" : "dry run"}</span>
            </li>
            <li>
              <strong>Visible leads</strong>
              <span>{consoleSnapshot.totals.leads}</span>
            </li>
            <li>
              <strong>Hot leads</strong>
              <span>{consoleSnapshot.totals.hotLeads}</span>
            </li>
            <li>
              <strong>Contribution margin</strong>
              <span>{formatCurrency(consoleSnapshot.plumbingDispatch.finance.contributionMargin)}</span>
            </li>
            <li>
              <strong>Open alerts</strong>
              <span>{overview.activeAlerts.length}</span>
            </li>
          </ul>
        </aside>
      </section>

      <section className="metric-grid">
        {overview.queuePulse.map((item) => (
          <article key={item.label} className={`metric-card tone-${item.tone}`}>
            <p className="eyebrow">{item.label}</p>
            <h2>{item.value}</h2>
            <p className="muted">{item.detail}</p>
          </article>
        ))}
        {overview.rolloutPulse.map((item) => (
          <article key={item.label} className={`metric-card tone-${item.tone}`}>
            <p className="eyebrow">{item.label}</p>
            <h2>{item.value}</h2>
            <p className="muted">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Attention needed</p>
          <h2>Failures with operator guidance</h2>
          {overview.activeAlerts.length === 0 ? (
            <p className="muted">No urgent cross-system issues are being flagged right now.</p>
          ) : (
            <div className="stack-grid">
              {overview.activeAlerts.map((issue) => (
                <article key={issue.id} className={`portal-issue-card severity-${issue.severity}`}>
                  <div className="portal-status-row">
                    <span className="portal-chip">{issue.source}</span>
                    <span className="portal-chip">{issue.severity}</span>
                    {issue.timestamp ? <span className="portal-chip">{formatOptionalDateTime(issue.timestamp)}</span> : null}
                  </div>
                  <h3>{issue.title}</h3>
                  <p className="muted portal-breakable"><strong>Reason:</strong> {issue.reason}</p>
                  <p className="muted portal-breakable"><strong>Resolution:</strong> {issue.resolution}</p>
                  {issue.href ? (
                    <div className="cta-row">
                      <Link href={issue.href} className="secondary">
                        Open relevant queue
                      </Link>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <p className="eyebrow">Provider and routing pulse</p>
          <h2>Is supply healthy enough for current demand?</h2>
          <div className="stack-grid">
            {overview.providerPulse.map((item) => (
              <article key={item.label} className={`stack-card tone-${item.tone}`}>
                <p className="eyebrow">{item.label}</p>
                <h3>{item.value}</h3>
                <p className="muted portal-breakable">{item.detail}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Proactive rules</p>
          <h2>Thresholds that should notify operators early</h2>
          <div className="stack-grid">
            {overview.rules.map((rule) => (
              <article key={rule.id} className={`stack-card tone-${rule.triggered ? rule.severity : "neutral"}`}>
                <div className="portal-status-row">
                  <span className="portal-chip">{rule.triggered ? "triggered" : "healthy"}</span>
                  <span className="portal-chip">{rule.notificationChannel}</span>
                </div>
                <h3>{rule.title}</h3>
                <p className="muted portal-breakable"><strong>Threshold:</strong> {rule.thresholdLabel}</p>
                <p className="muted portal-breakable"><strong>Current state:</strong> {rule.currentLabel}</p>
                <p className="muted portal-breakable"><strong>Action:</strong> {rule.resolution}</p>
                <div className="cta-row">
                  <Link href={rule.href} className="secondary">
                    Open drill-through
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Conversion and value watchlist</p>
          <h2>Key signals worth revisiting daily</h2>
          <ul className="check-list">
            {overview.watchlist.map((line) => (
              <li key={line} className="portal-breakable">{line}</li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <p className="eyebrow">Fast links</p>
          <h2>Jump straight into the right control surface</h2>
          <div className="stack-grid">
            <article className="stack-card">
              <p className="eyebrow">Dispatch</p>
              <p className="muted">Open the operator queue for live lead intervention and backup routing.</p>
              <div className="cta-row">
                <Link href="/dashboard" className="secondary">Dispatch desk</Link>
              </div>
            </article>
            <article className="stack-card">
              <p className="eyebrow">Lead journeys</p>
              <p className="muted">Inspect one lead end to end, including errors, reasons, and resolutions.</p>
              <div className="cta-row">
                <Link href="/dashboard" className="secondary">Open recent leads</Link>
              </div>
            </article>
            <article className="stack-card">
              <p className="eyebrow">Providers</p>
              <p className="muted">Review capacity, economics, and readiness by provider before scaling demand.</p>
              <div className="cta-row">
                <Link href="/dashboard/providers" className="secondary">Provider health</Link>
              </div>
            </article>
            <article className="stack-card">
              <p className="eyebrow">Execution</p>
              <p className="muted">Inspect durable booking, document, and workflow tasks when exact-once execution goes sideways.</p>
              <div className="cta-row">
                <Link href="/dashboard/execution?status=failed" className="secondary">Execution failures</Link>
              </div>
            </article>
            <article className="stack-card">
              <p className="eyebrow">Rollout</p>
              <p className="muted">See which installs are live, stale, or missing verification in the field.</p>
              <div className="cta-row">
                <Link href="/dashboard/deployments" className="secondary">Deployment registry</Link>
              </div>
            </article>
          </div>
        </article>
      </section>
    </main>
  );
}
