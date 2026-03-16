import Link from "next/link";
import { DispatchActionPanel } from "@/components/DispatchActionPanel";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { isSystemBookingJob, isSystemDocumentJob, isSystemWorkflowRun } from "@/lib/operator-view";
import { formatCurrency, formatLeadKeyForDisplay, formatMilestoneIdForDisplay, formatPortalLabel, formatReviewRating } from "@/lib/operator-ui";
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
import { buildOperatorConsoleSnapshot } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatPercent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await requireOperatorPageSession("/dashboard");
  const params = (await searchParams) ?? {};
  const includeSystemTraffic = asString(params.include) === "system";
  const dashboardError = asString(params.error);
  const focus = asString(params.focus);
  const [leads, events, bookingJobs, documentJobs, executionTasks, workflowRuns, providerDispatchRequests, providerExecutions, runtimeConfig] = await Promise.all([
    getLeadRecords(),
    getCanonicalEvents(),
    getBookingJobs(),
    getDocumentJobs(),
    getExecutionTasks(),
    getWorkflowRuns(),
    getProviderDispatchRequests(),
    getProviderExecutions(),
    getOperationalRuntimeConfig(),
  ]);

  const snapshot = buildOperatorConsoleSnapshot(
    leads,
    events,
    bookingJobs,
    executionTasks,
    providerDispatchRequests,
    providerExecutions,
    workflowRuns,
    runtimeConfig.dispatch.providers,
    runtimeConfig.marketplace,
    { includeSystemTraffic },
  );
  const health = getAutomationHealth();

  const visibleBookingJobs = includeSystemTraffic
    ? bookingJobs
    : bookingJobs.filter((job) => !isSystemBookingJob(job));
  const visibleDocumentJobs = includeSystemTraffic
    ? documentJobs
    : documentJobs.filter((job) => !isSystemDocumentJob(job));
  const visibleWorkflowRuns = includeSystemTraffic
    ? workflowRuns
    : workflowRuns.filter((run) => !isSystemWorkflowRun(run));

  const bookingFailures = visibleBookingJobs
    .filter((job) => !["booked", "availability-found", "ready", "handoff-ready"].includes(job.status))
    .slice(0, 6);
  const documentFailures = visibleDocumentJobs.filter((job) => job.status === "failed").slice(0, 6);
  const workflowFailures = visibleWorkflowRuns.filter((run) => !run.ok).slice(0, 6);
  const dispatch = snapshot.plumbingDispatch;

  return (
    <main className="experience-page">
      {snapshot.systemTraffic.hiddenLeads > 0 || snapshot.systemTraffic.hiddenEvents > 0 ? (
        <section className="panel">
          <p className="eyebrow">Visibility</p>
          <h2>
            {includeSystemTraffic ? "Showing system verification activity" : "System verification activity is hidden by default"}
          </h2>
          <p className="muted">
            {includeSystemTraffic
              ? `This view includes ${snapshot.systemTraffic.hiddenLeads} internal verification leads and ${snapshot.systemTraffic.hiddenEvents} internal events alongside live dispatch traffic.`
              : `LeadOS is hiding ${snapshot.systemTraffic.hiddenLeads} internal verification leads and ${snapshot.systemTraffic.hiddenEvents} internal events so operators see real plumbing demand first.`}
          </p>
          <div className="cta-row">
            {includeSystemTraffic ? (
              <Link href="/dashboard" className="secondary">
                Hide system activity
              </Link>
            ) : (
              <Link href="/dashboard?include=system" className="secondary">
                Show system activity
              </Link>
            )}
          </div>
        </section>
      ) : null}

      {dashboardError === "forbidden" ? (
        <section className="panel">
          <p className="eyebrow">Permissions</p>
          <h2>That page needs a higher-trust operator role</h2>
          <p className="muted">
            Your current role is <strong>{session.role}</strong>. Ask an admin operator if you need
            access to runtime settings, provisioning, or other admin-only controls.
          </p>
        </section>
      ) : null}

      {focus ? (
        <section className="panel">
          <p className="eyebrow">Focused view</p>
          <h2>Jumped here from an observability alert</h2>
          <p className="muted">
            This dashboard opened with focus on <strong>{formatPortalLabel(focus)}</strong>. Use the sections below to resolve that condition quickly.
          </p>
        </section>
      ) : null}

      <section className="experience-hero">
        <div className="hero-copy">
          <p className="eyebrow">Dispatch command center</p>
          <h1>{tenantConfig.brandName} PlumbingOS</h1>
          <p className="lede">
            Run urgent plumbing demand like a dispatch desk, not a form pipeline. This console
            keeps emergency work first, surfaces unfulfilled demand, and highlights which providers
            can actually convert jobs into completed revenue.
          </p>
          <div className="cta-row">
            <Link href="/dashboard/overview" className="primary">
              System overview
            </Link>
            <Link href="/dashboard/providers" className="primary">
              Provider readiness
            </Link>
            <Link href="/dashboard/deployments" className="secondary">
              Deployment registry
            </Link>
            <Link href="/dashboard/settings" className="secondary">
              Runtime settings
            </Link>
            <Link href="/dashboard/bookings" className="secondary">
              Booking jobs
            </Link>
            <Link href="/dashboard/workflows" className="secondary">
              Workflow runs
            </Link>
            <Link href="/dashboard/execution" className="secondary">
              Execution queue
            </Link>
            <Link href="/dashboard/documents" className="secondary">
              Document jobs
            </Link>
            <a href="/auth/sign-out" className="secondary">
              Sign out
            </a>
          </div>
        </div>
        <aside className="hero-rail">
          <p className="eyebrow">Operator session</p>
          <h2 className="portal-identifier" title={session.email}>{session.email}</h2>
          <ul className="journey-rail">
            <li>
              <strong>Live mode</strong>
              <span>{health.liveMode ? "enabled" : "dry run"}</span>
            </li>
            <li>
              <strong>Role</strong>
              <span>{session.role}</span>
            </li>
            <li>
              <strong>Visible leads</strong>
              <span>{snapshot.totals.leads}</span>
            </li>
            <li>
              <strong>Plumbing leads</strong>
              <span>{dispatch.totalPlumbingLeads}</span>
            </li>
            <li>
              <strong>Unresolved plumbing leads</strong>
              <span>{dispatch.unresolvedCount}</span>
            </li>
            <li>
              <strong>Hot leads</strong>
              <span>{snapshot.totals.hotLeads}</span>
            </li>
          </ul>
        </aside>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <p className="eyebrow">Emergency queue</p>
          <h2>{dispatch.emergencyQueue.length}</h2>
          <p className="muted">Urgent demand that should be called or assigned immediately.</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Same-day queue</p>
          <h2>{dispatch.sameDayQueue.length}</h2>
          <p className="muted">High-intent jobs needing same-day scheduling attention.</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Estimate queue</p>
          <h2>{dispatch.estimateQueue.length}</h2>
          <p className="muted">Quote-driven leads that need a scheduled estimate path.</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Commercial queue</p>
          <h2>{dispatch.commercialQueue.length}</h2>
          <p className="muted">Commercial jobs that should bypass consumer-style routing.</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Escalation ready</p>
          <h2>{dispatch.topQueue.filter((item) => item.escalationReady).length}</h2>
          <p className="muted">Plumbing leads that have crossed the backup-routing threshold.</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Dispatch roster</p>
          <h2>{dispatch.configuredDispatchProviders}</h2>
          <p className="muted">Configured providers available for capacity-aware assignment.</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Queued execution</p>
          <h2>{dispatch.executionQueue.pendingCount}</h2>
          <p className="muted">Workflow, booking, and document tasks waiting for the executor.</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Provider responses waiting</p>
          <h2>{dispatch.providerRequestQueue.pendingCount}</h2>
          <p className="muted">Pending provider claim decisions that still need a fast yes or no.</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Default CAC</p>
          <h2>{formatCurrency(runtimeConfig.marketplace.defaultLeadAcquisitionCost)}</h2>
          <p className="muted">Fallback acquisition cost used when a ZIP cell has no explicit override.</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Contribution margin</p>
          <h2>{formatCurrency(dispatch.finance.contributionMargin)}</h2>
          <p className="muted">Revenue left after acquisition cost, provider payout, and refund penalties.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="panel" id="dispatch-first">
          <p className="eyebrow">Marketplace finance</p>
          <h2>Profitability guardrails for plumbing growth</h2>
          <ul className="check-list">
            <li>Completed revenue: {formatCurrency(dispatch.finance.completedRevenue)}</li>
            <li>Completed margin: {formatCurrency(dispatch.finance.completedMargin)}</li>
            <li>Acquisition cost: {formatCurrency(dispatch.finance.acquisitionCost)}</li>
            <li>Provider payout: {formatCurrency(dispatch.finance.providerPayout)}</li>
            <li>Contribution margin: {formatCurrency(dispatch.finance.contributionMargin)}</li>
            <li>Contribution rate: {formatPercent(dispatch.finance.contributionMarginRate)}</li>
            <li>Profitable providers: {dispatch.finance.profitableProviders}</li>
            <li>Unprofitable providers: {dispatch.finance.unprofitableProviders}</li>
            <li>Constrained ZIP cells: {dispatch.finance.constrainedCells}</li>
            <li>Loss-making ZIP cells: {dispatch.finance.unprofitableCells}</li>
          </ul>
        </article>

        <article className="panel" id="provider-requests">
          <p className="eyebrow">Recommended moves</p>
          <h2>Where operators should intervene next</h2>
          {dispatch.finance.recommendations.length === 0 ? (
            <p className="muted">No urgent finance interventions are being flagged right now.</p>
          ) : (
            <ul className="check-list">
              {dispatch.finance.recommendations.map((recommendation) => (
                <li key={recommendation}>{recommendation}</li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Dispatch first</p>
          <h2>Plumbing demand waiting for action</h2>
          {dispatch.topQueue.length === 0 ? (
            <p className="muted">No unresolved plumbing leads are waiting right now.</p>
          ) : (
            <div className="stack-grid">
              {dispatch.topQueue.map((item) => (
                <article key={item.leadKey} className="stack-card">
                  <p className="eyebrow">{formatPortalLabel(item.urgencyBand)}</p>
                  <h3 className="portal-identifier" title={item.leadKey}>{formatLeadKeyForDisplay(item.leadKey)}</h3>
                  <div className="portal-status-row">
                    <span className="portal-chip">Issue: {formatPortalLabel(item.issueType)}</span>
                    <span className="portal-chip">Mode: {formatPortalLabel(item.dispatchMode)}</span>
                    <span className="portal-chip">Stage: {item.stage}</span>
                  </div>
                  <p className="muted">Readiness score: {item.readinessScore}</p>
                  <p className="muted portal-breakable">
                    SLA: {item.overdue ? `overdue by ${item.minutesPastDue}m` : `due ${item.dueAt}`}
                    {item.escalationReady ? " | backup escalation ready" : ""}
                  </p>
                  {item.recommendedProviders.length > 0 ? (
                    <p className="muted portal-breakable">
                      Best match: {item.recommendedProviders[0].providerLabel} ({item.recommendedProviders[0].reason})
                    </p>
                  ) : (
                    <p className="muted">No dispatch provider currently matches this job profile.</p>
                  )}
                  <p className="muted">Next move: {item.operatorAction}</p>
                  {session.role !== "analyst" ? (
                    <DispatchActionPanel
                      leadKey={item.leadKey}
                      compact
                      visibleActions={
                        item.dispatchMode === "dispatch-now"
                          ? ["dispatch-now", "assign-backup-provider", "mark-booked"]
                          : item.dispatchMode === "estimate-path"
                            ? ["retry-booking", "mark-booked", "mark-lost"]
                            : ["dispatch-now", "retry-booking", "mark-booked"]
                      }
                    />
                  ) : (
                    <p className="muted">Analyst role can review dispatch state but cannot mutate it.</p>
                  )}
                  <div className="cta-row">
                    <Link href={`/dashboard/leads/${encodeURIComponent(item.leadKey)}`} className="secondary">
                      Open lead detail
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <p className="eyebrow">Failure recovery</p>
          <h2>Operational friction that can block revenue</h2>
          <div className="stack-grid">
            <article className="stack-card">
              <p className="eyebrow">Booking failures</p>
              {bookingFailures.length === 0 ? (
                <p className="muted">No unresolved booking failures.</p>
              ) : (
                <ul className="check-list">
                  {bookingFailures.map((job) => (
                    <li key={job.id} className="portal-breakable">
                      <Link className="portal-inline-link" href={`/dashboard/leads/${encodeURIComponent(job.leadKey)}`}>
                        {formatLeadKeyForDisplay(job.leadKey)}
                      </Link>{" "}
                      - {job.status}
                    </li>
                  ))}
                </ul>
              )}
            </article>
            <article className="stack-card">
              <p className="eyebrow">Workflow failures</p>
              {workflowFailures.length === 0 ? (
                <p className="muted">No failed workflow runs waiting.</p>
              ) : (
                <ul className="check-list">
                  {workflowFailures.map((run) => (
                    <li key={run.id} className="portal-breakable">
                      {run.leadKey ? (
                        <Link className="portal-inline-link" href={`/dashboard/leads/${encodeURIComponent(run.leadKey)}`}>
                          {formatLeadKeyForDisplay(run.leadKey)}
                        </Link>
                      ) : (
                        <span>Unknown lead</span>
                      )}{" "}
                      - {formatPortalLabel(run.eventName)}
                    </li>
                  ))}
                </ul>
              )}
            </article>
            <article className="stack-card">
              <p className="eyebrow">Execution queue</p>
              {dispatch.executionQueue.pendingCount === 0 ? (
                <p className="muted">No queued execution work is waiting.</p>
              ) : (
                <ul className="check-list">
                  {dispatch.executionQueue.pendingByKind.map((entry) => (
                    <li key={entry.label}>
                      {formatPortalLabel(entry.label)}: {entry.count}
                    </li>
                  ))}
                </ul>
              )}
            </article>
            <article className="stack-card">
              <p className="eyebrow">Provider responses</p>
              {dispatch.providerRequestQueue.pendingCount === 0 ? (
                <p className="muted">No provider claim requests are waiting.</p>
              ) : (
                <ul className="check-list">
                  {dispatch.providerRequestQueue.topPending.map((request) => (
                    <li key={request.id} className="portal-breakable">
                      <Link className="portal-inline-link" href={`/dashboard/leads/${encodeURIComponent(request.leadKey)}`}>
                        {formatLeadKeyForDisplay(request.leadKey)}
                      </Link>{" "}
                      - {request.providerLabel}
                    </li>
                  ))}
                </ul>
              )}
            </article>
            <article className="stack-card">
              <p className="eyebrow">Document failures</p>
              {documentFailures.length === 0 ? (
                <p className="muted">No failed document jobs waiting.</p>
              ) : (
                <ul className="check-list">
                  {documentFailures.map((job) => (
                    <li key={job.id} className="portal-breakable">
                      <Link className="portal-inline-link" href={`/dashboard/leads/${encodeURIComponent(job.leadKey)}`}>
                        {formatLeadKeyForDisplay(job.leadKey)}
                      </Link>{" "}
                      - {job.status}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Geo-cell demand</p>
          <h2>Where plumbing momentum is clustering</h2>
          {dispatch.metroBreakdown.length === 0 ? (
            <p className="muted">LeadOS needs more location capture before it can show dispatch cells.</p>
          ) : (
            <ul className="check-list">
              {dispatch.metroBreakdown.map((cell) => (
                <li key={cell.label}>
                  {cell.label}: {cell.count} plumbing leads
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel">
          <p className="eyebrow">Revenue cells</p>
          <h2>Where completed plumbing value is concentrating</h2>
          {dispatch.metroRevenueBreakdown.length === 0 ? (
            <p className="muted">No completed plumbing revenue has been mapped to a geo cell yet.</p>
          ) : (
            <ul className="check-list">
              {dispatch.metroRevenueBreakdown.map((cell) => (
                <li key={cell.label}>
                  {cell.label}: {formatCurrency(cell.revenue)}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">ZIP-cell liquidity</p>
          <h2>Where supply is too thin for current demand</h2>
          {dispatch.zipCellLiquidity.constrainedCells.length === 0 ? (
            <p className="muted">No constrained ZIP cells are showing up yet.</p>
          ) : (
            <div className="stack-grid">
              {dispatch.zipCellLiquidity.constrainedCells.map((cell) => (
                <article key={cell.label} className="stack-card">
                  <p className="eyebrow">{cell.label}</p>
                  <h3>{cell.liquidityScore}</h3>
                  <p className="muted">
                    Leads: {cell.leadCount} | Urgent: {cell.urgentLeadCount} | Open capacity: {cell.openCapacity}
                  </p>
                  <p className="muted">
                    Accepting providers: {cell.acceptingProviders} | Revenue: {formatCurrency(cell.completedRevenue)}
                  </p>
                  <p className="muted">
                    Margin: {formatCurrency(cell.completedMargin)} | Margin rate: {formatPercent(cell.marginRate)}
                  </p>
                  <p className="muted">
                    CAC: {formatCurrency(cell.acquisitionCost)} | Payout: {formatCurrency(cell.providerPayout)} | Contribution: {formatCurrency(cell.contributionMargin)}
                  </p>
                  <p className="muted">Major complaints: {cell.negativeComplaints} | Refunds: {cell.refunds}</p>
                  <p className="muted portal-breakable">{cell.recommendedAction}</p>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <p className="eyebrow">Expansion cells</p>
          <h2>Where supply looks ready for more local demand</h2>
          {dispatch.zipCellLiquidity.expansionCells.length === 0 ? (
            <p className="muted">No expansion-ready ZIP cells are visible yet.</p>
          ) : (
            <div className="stack-grid">
              {dispatch.zipCellLiquidity.expansionCells.map((cell) => (
                <article key={cell.label} className="stack-card">
                  <p className="eyebrow">{cell.label}</p>
                  <h3>{cell.liquidityScore}</h3>
                  <p className="muted">
                    Leads: {cell.leadCount} | Urgent: {cell.urgentLeadCount} | Open capacity: {cell.openCapacity}
                  </p>
                  <p className="muted">
                    Accepting providers: {cell.acceptingProviders} | Revenue: {formatCurrency(cell.completedRevenue)}
                  </p>
                  <p className="muted">
                    Margin: {formatCurrency(cell.completedMargin)} | Margin rate: {formatPercent(cell.marginRate)}
                  </p>
                  <p className="muted">
                    CAC: {formatCurrency(cell.acquisitionCost)} | Payout: {formatCurrency(cell.providerPayout)} | Contribution: {formatCurrency(cell.contributionMargin)}
                  </p>
                  <p className="muted">Major complaints: {cell.negativeComplaints} | Refunds: {cell.refunds}</p>
                  <p className="muted portal-breakable">{cell.recommendedAction}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Queue mix</p>
          <h2>Where dispatch pressure is building</h2>
          <div className="stack-grid">
            <article className="stack-card">
              <h3>Urgency mix</h3>
              <ul className="check-list">
                {dispatch.urgencyBreakdown.length === 0 ? (
                  <li>No plumbing traffic yet</li>
                ) : (
                  dispatch.urgencyBreakdown.map((entry) => (
                    <li key={entry.label}>
                      {formatPortalLabel(entry.label)}: {entry.count}
                    </li>
                  ))
                )}
              </ul>
            </article>
            <article className="stack-card">
              <h3>Issue mix</h3>
              <ul className="check-list">
                {dispatch.issueBreakdown.length === 0 ? (
                  <li>No issue classifications yet</li>
                ) : (
                  dispatch.issueBreakdown.map((entry) => (
                    <li key={entry.label}>
                      {formatPortalLabel(entry.label)}: {entry.count}
                    </li>
                  ))
                )}
              </ul>
            </article>
            <article className="stack-card">
              <h3>Dispatch mode mix</h3>
              <ul className="check-list">
                {dispatch.dispatchModeBreakdown.length === 0 ? (
                  <li>No dispatch modes recorded yet</li>
                ) : (
                  dispatch.dispatchModeBreakdown.map((entry) => (
                    <li key={entry.label}>
                      {formatPortalLabel(entry.label)}: {entry.count}
                    </li>
                  ))
                )}
              </ul>
            </article>
            <article className="stack-card">
              <h3>Fast links</h3>
              <ul className="check-list">
                <li><Link href="/dashboard/bookings">Open booking queue</Link></li>
                <li><Link href="/dashboard/providers">Review provider readiness</Link></li>
                <li><Link href="/dashboard/settings">Adjust runtime mappings</Link></li>
                <li><Link href="/dashboard/workflows">Inspect workflow history</Link></li>
              </ul>
            </article>
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Provider scorecards</p>
          <h2>Who looks safe to route traffic to</h2>
          {dispatch.providerScores.length === 0 ? (
            <p className="muted">No provider execution history is available yet.</p>
          ) : (
            <div className="stack-grid">
              {dispatch.providerScores.slice(0, 6).map((provider) => (
                <article key={provider.provider} className="stack-card">
                  <p className="eyebrow">{provider.provider}</p>
                  <h3>{provider.routingScore}</h3>
                  <div className="portal-status-row">
                    <span className="portal-chip">Reliability {provider.reliabilityScore}</span>
                    <span className="portal-chip">Revenue {provider.revenueScore}</span>
                    <span className="portal-chip">Economics {provider.economicQualityScore}</span>
                  </div>
                  <div className="portal-meta">
                    <p className="muted">
                      Success rate: {formatPercent(provider.successRate)} | Booking fill: {formatPercent(provider.bookingFillRate)}
                    </p>
                    <p className="muted">
                      Completion: {formatPercent(provider.completionRate)} | Completed jobs: {provider.completedOutcomes}
                    </p>
                    <p className="muted portal-breakable">
                      Completed revenue: {formatCurrency(provider.completedRevenue)} | Avg completed value: {formatCurrency(provider.averageCompletedRevenue)}
                    </p>
                    <p className="muted portal-breakable">
                      Margin: {formatCurrency(provider.completedMargin)} | Avg margin: {formatCurrency(provider.averageCompletedMargin)} | Margin rate: {formatPercent(provider.marginRate)}
                    </p>
                    <p className="muted portal-breakable">
                      Acquisition cost: {formatCurrency(provider.acquisitionCost)} | Provider payout: {formatCurrency(provider.providerPayout)}
                    </p>
                    <p className="muted portal-breakable">
                      Contribution margin: {formatCurrency(provider.contributionMargin)} | Contribution rate: {formatPercent(provider.contributionMarginRate)}
                    </p>
                    <p className="muted">
                      Reviews: +{provider.positiveReviews} / ±{provider.mixedReviews} / -{provider.negativeReviews} | Avg rating: {formatReviewRating(provider.averageReviewRating)}
                    </p>
                    <p className="muted">
                      Complaints: major {provider.negativeComplaints}, minor {provider.minorComplaints} | Refunds: {provider.refunds}
                    </p>
                    <p className="muted">
                      Attempts: {provider.attempts} | Workflow failures: {provider.workflowFailures}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Recent lead drill-down</p>
          <h2>Who moved last and what comes next</h2>
          {snapshot.leadTimeline.length === 0 ? (
            <p className="muted">No leads have been captured in this runtime yet.</p>
          ) : (
            <div className="stack-grid">
              {snapshot.leadTimeline.map((lead) => (
                <article key={lead.leadKey} className="stack-card">
                  <p className="eyebrow">{lead.family}</p>
                  <h3 className="portal-identifier" title={lead.leadKey}>{lead.displayName}</h3>
                  {lead.displaySubline ? (
                    <p className="muted portal-breakable">{lead.displaySubline}</p>
                  ) : null}
                  <div className="portal-summary">
                    <p className="muted">
                      Stage: {lead.stage} | Visits: {lead.visitCount} | Score: {lead.score}
                    </p>
                    <p className="muted">Next lead milestone: {lead.nextLeadMilestone ?? "Complete"}</p>
                  </div>
                  <div className="cta-row">
                    <Link href={`/dashboard/leads/${encodeURIComponent(lead.leadKey)}`} className="secondary">
                      Open lead detail
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <p className="eyebrow">Milestone signals</p>
          <h2>Trust and conversion movement</h2>
          {snapshot.recentMilestoneEvents.length === 0 ? (
            <p className="muted">Milestone events will appear here as the runtime captures activity.</p>
          ) : (
            <div className="stack-grid">
              {snapshot.recentMilestoneEvents.map((event) => (
                <article key={event.id} className="stack-card">
                  <p className="eyebrow">{event.type}</p>
                  <h3 className="portal-identifier" title={event.milestoneId}>{formatMilestoneIdForDisplay(event.milestoneId)}</h3>
                  <p className="muted portal-breakable" title={event.leadKey}>{event.displayName}</p>
                  {event.displaySubline ? <p className="muted portal-breakable">{event.displaySubline}</p> : null}
                  <p className="muted">
                    Visit count: {event.visitCount} | Stage: {event.stage}
                  </p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
