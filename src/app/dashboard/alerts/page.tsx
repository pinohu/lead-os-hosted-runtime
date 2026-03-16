import Link from "next/link";
import { AlertRuleActionForm } from "@/components/AlertRuleActionForm";
import { getDeploymentRegistrySnapshot } from "@/lib/deployment-registry";
import { buildOperatorConsoleSnapshot } from "@/lib/dashboard";
import { buildSystemOverviewSnapshot } from "@/lib/operator-observability";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { formatOptionalDateTime } from "@/lib/operator-ui";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
import {
  getBookingJobs,
  getCanonicalEvents,
  getDocumentJobs,
  getExecutionTasks,
  getLeadRecords,
  getObservabilityAlertAcknowledgements,
  getObservabilityAlertDeliveries,
  getProviderDispatchRequests,
  getProviderExecutions,
  getWorkflowRuns,
} from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function AlertsDashboardPage() {
  await requireOperatorPageSession("/dashboard/alerts");
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
    deliveries,
    acknowledgements,
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
    getObservabilityAlertDeliveries(),
    getObservabilityAlertAcknowledgements(),
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

  const activeAcknowledgements = new Map(
    acknowledgements
      .filter((entry) => !entry.snoozedUntil || new Date(entry.snoozedUntil).getTime() > Date.now())
      .map((entry) => [entry.ruleId, entry]),
  );
  const recentDeliveries = deliveries.slice(0, 40);
  const failedDeliveries = deliveries.filter((entry) => entry.status === "failed");
  const suppressedDeliveries = deliveries.filter((entry) => entry.status === "suppressed");

  return (
    <main className="experience-page">
      <section className="experience-hero">
        <div className="hero-copy">
          <p className="eyebrow">Alert operations</p>
          <h1>{tenantConfig.brandName} paging and acknowledgement health</h1>
          <p className="lede">
            Review triggered rules, delivery outcomes, and operator acknowledgements so paging stays
            trustworthy under failure instead of becoming another blind spot.
          </p>
          <div className="cta-row">
            <Link href="/dashboard/overview" className="secondary">Back to overview</Link>
            <Link href="/dashboard/execution?status=failed" className="secondary">Execution failures</Link>
          </div>
        </div>
        <aside className="hero-rail">
          <p className="eyebrow">Paging state</p>
          <ul className="journey-rail">
            <li><strong>Triggered rules</strong><span>{overview.rules.filter((rule) => rule.triggered).length}</span></li>
            <li><strong>Failed deliveries</strong><span>{failedDeliveries.length}</span></li>
            <li><strong>Suppressed</strong><span>{suppressedDeliveries.length}</span></li>
            <li><strong>Acknowledged rules</strong><span>{activeAcknowledgements.size}</span></li>
          </ul>
        </aside>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Triggered rules</p>
          <h2>Own and snooze the alerts that already have an operator</h2>
          <div className="stack-grid">
            {overview.rules.filter((rule) => rule.triggered).map((rule) => {
              const acknowledgement = activeAcknowledgements.get(rule.id);
              return (
                <article key={rule.id} className={`portal-issue-card severity-${rule.severity}`}>
                  <div className="portal-status-row">
                    <span className="portal-chip">{rule.notificationChannel}</span>
                    <span className="portal-chip">{rule.severity}</span>
                    {acknowledgement ? <span className="portal-chip">acknowledged</span> : null}
                  </div>
                  <h3>{rule.title}</h3>
                  <p className="muted portal-breakable"><strong>Threshold:</strong> {rule.thresholdLabel}</p>
                  <p className="muted portal-breakable"><strong>Current:</strong> {rule.currentLabel}</p>
                  <p className="muted portal-breakable"><strong>Resolution:</strong> {rule.resolution}</p>
                  {acknowledgement ? (
                    <p className="muted portal-breakable">
                      <strong>Owner:</strong> {acknowledgement.acknowledgedBy}
                      {acknowledgement.snoozedUntil ? ` until ${formatOptionalDateTime(acknowledgement.snoozedUntil)}` : ""}
                    </p>
                  ) : null}
                  <AlertRuleActionForm
                    ruleId={rule.id}
                    title={rule.title}
                    initiallyAcknowledged={Boolean(acknowledgement)}
                  />
                  <div className="cta-row">
                    <Link href={rule.href} className="secondary">Open drill-through</Link>
                  </div>
                </article>
              );
            })}
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Delivery health</p>
          <h2>Recent paging attempts</h2>
          {recentDeliveries.length === 0 ? (
            <p className="muted">No alert deliveries have been recorded yet.</p>
          ) : (
            <div className="stack-grid">
              {recentDeliveries.map((delivery) => (
                <article key={delivery.id} className={`stack-card tone-${delivery.status === "failed" ? "danger" : delivery.status === "suppressed" ? "warning" : "success"}`}>
                  <div className="portal-status-row">
                    <span className="portal-chip">{delivery.channel}</span>
                    <span className="portal-chip">{delivery.status}</span>
                    <span className="portal-chip">{formatOptionalDateTime(delivery.createdAt)}</span>
                  </div>
                  <h3>{delivery.title}</h3>
                  <p className="muted portal-breakable"><strong>Recipient:</strong> {delivery.recipientLabel}</p>
                  <p className="muted portal-breakable"><strong>Detail:</strong> {delivery.detail}</p>
                  {delivery.href ? (
                    <div className="cta-row">
                      <Link href={delivery.href} className="secondary">Open source queue</Link>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
