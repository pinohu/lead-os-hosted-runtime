import Link from "next/link";
import { DispatchActionPanel } from "@/components/DispatchActionPanel";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { isSystemBookingJob, isSystemDocumentJob, isSystemWorkflowRun } from "@/lib/operator-view";
import { getAutomationHealth } from "@/lib/providers";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
import {
  getBookingJobs,
  getCanonicalEvents,
  getDocumentJobs,
  getLeadRecords,
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

function formatLabel(value: string) {
  return value.replace(/-/g, " ");
}

function formatPercent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await requireOperatorPageSession("/dashboard");
  const params = (await searchParams) ?? {};
  const includeSystemTraffic = asString(params.include) === "system";
  const dashboardError = asString(params.error);
  const [leads, events, bookingJobs, documentJobs, workflowRuns, providerExecutions, runtimeConfig] = await Promise.all([
    getLeadRecords(),
    getCanonicalEvents(),
    getBookingJobs(),
    getDocumentJobs(),
    getWorkflowRuns(),
    getProviderExecutions(),
    getOperationalRuntimeConfig(),
  ]);

  const snapshot = buildOperatorConsoleSnapshot(
    leads,
    events,
    bookingJobs,
    providerExecutions,
    workflowRuns,
    runtimeConfig.dispatch.providers,
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
            <Link href="/dashboard/providers" className="primary">
              Provider readiness
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
          <h2>{session.email}</h2>
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
                  <p className="eyebrow">{formatLabel(item.urgencyBand)}</p>
                  <h3>{item.leadKey}</h3>
                  <p className="muted">
                    Issue: {formatLabel(item.issueType)} | Mode: {formatLabel(item.dispatchMode)}
                  </p>
                  <p className="muted">
                    Readiness: {item.readinessScore} | Stage: {item.stage}
                  </p>
                  <p className="muted">
                    SLA: {item.overdue ? `overdue by ${item.minutesPastDue}m` : `due ${item.dueAt}`}
                    {item.escalationReady ? " | backup escalation ready" : ""}
                  </p>
                  {item.recommendedProviders.length > 0 ? (
                    <p className="muted">
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
                    <li key={job.id}>
                      <Link href={`/dashboard/leads/${encodeURIComponent(job.leadKey)}`}>
                        {job.leadKey}
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
                    <li key={run.id}>
                      {run.leadKey ? (
                        <Link href={`/dashboard/leads/${encodeURIComponent(run.leadKey)}`}>
                          {run.leadKey}
                        </Link>
                      ) : (
                        <span>Unknown lead</span>
                      )}{" "}
                      - {run.eventName}
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
                    <li key={job.id}>
                      <Link href={`/dashboard/leads/${encodeURIComponent(job.leadKey)}`}>
                        {job.leadKey}
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
                  {cell.label}: {cell.revenue}
                </li>
              ))}
            </ul>
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
                      {formatLabel(entry.label)}: {entry.count}
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
                      {formatLabel(entry.label)}: {entry.count}
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
                      {formatLabel(entry.label)}: {entry.count}
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
                  <h3>{lead.leadKey}</h3>
                  <p className="muted">
                    Stage: {lead.stage} | Visits: {lead.visitCount} | Score: {lead.score}
                  </p>
                  <p className="muted">Next lead milestone: {lead.nextLeadMilestone ?? "Complete"}</p>
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
                  <h3>{event.milestoneId}</h3>
                  <p className="muted">{event.leadKey}</p>
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
