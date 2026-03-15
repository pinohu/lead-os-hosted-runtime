import Link from "next/link";
import { THREE_VISIT_FRAMEWORK } from "@/lib/automation";
import { buildDashboardSnapshotWithOptions } from "@/lib/dashboard";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { getAutomationHealth } from "@/lib/providers";
import { getBookingJobs, getCanonicalEvents, getDocumentJobs, getLeadRecords, getWorkflowRuns } from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";
import { isSystemBookingJob, isSystemDocumentJob, isSystemWorkflowRun } from "@/lib/operator-view";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await requireOperatorPageSession("/dashboard");
  const params = (await searchParams) ?? {};
  const includeSystemTraffic = asString(params.include) === "system";
  const [leads, events, bookingJobs, documentJobs, workflowRuns] = await Promise.all([
    getLeadRecords(),
    getCanonicalEvents(),
    getBookingJobs(),
    getDocumentJobs(),
    getWorkflowRuns(),
  ]);
  const snapshot = buildDashboardSnapshotWithOptions(leads, events, { includeSystemTraffic });
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
  const hotLeadQueue = snapshot.leadTimeline.filter((lead) => lead.hot).slice(0, 5);
  const bookingFailures = visibleBookingJobs
    .filter((job) => !["booked", "availability-found", "ready", "handoff-ready"].includes(job.status))
    .slice(0, 5);
  const documentFailures = visibleDocumentJobs
    .filter((job) => job.status === "failed")
    .slice(0, 5);
  const workflowFailures = visibleWorkflowRuns
    .filter((run) => !run.ok)
    .slice(0, 5);

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
              ? `This view includes ${snapshot.systemTraffic.hiddenLeads} internal verification leads and ${snapshot.systemTraffic.hiddenEvents} internal events alongside human traffic.`
              : `LeadOS is hiding ${snapshot.systemTraffic.hiddenLeads} internal verification leads and ${snapshot.systemTraffic.hiddenEvents} internal events so the default dashboard reflects human traffic first.`}
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

      <section className="experience-hero">
        <div className="hero-copy">
          <p className="eyebrow">Operator command center</p>
          <h1>{tenantConfig.brandName} milestone dashboard</h1>
          <p className="lede">
            LeadOS is optimizing for milestone two and milestone three, not just the first capture
            event. This console shows what is moving, what is leaking, and where the next operator
            intervention belongs.
          </p>
          <div className="cta-row">
            <Link href="/dashboard/providers" className="primary">
              Provider health
            </Link>
            <Link href="/dashboard/settings" className="secondary">
              Runtime settings
            </Link>
            <Link href="/dashboard/bookings" className="secondary">
              Booking jobs
            </Link>
            <Link href="/dashboard/documents" className="secondary">
              Document jobs
            </Link>
            <Link href="/dashboard/workflows" className="secondary">
              Workflow runs
            </Link>
            <Link href="/dashboard/experiments" className="secondary">
              Experiments
            </Link>
            <a href="/auth/sign-out" className="secondary">
              Sign out
            </a>
          </div>
        </div>
        <aside className="hero-rail">
          <p className="eyebrow">Operator session</p>
          <h2>{session.email}</h2>
          <p className="muted">
            Live mode: {health.liveMode ? "enabled" : "dry run"} | Visible leads: {snapshot.totals.leads} | Hot leads: {snapshot.totals.hotLeads}
          </p>
          {snapshot.systemTraffic.hiddenLeads > 0 && !includeSystemTraffic ? (
            <p className="muted">
              Hidden system leads: {snapshot.systemTraffic.hiddenLeads}
            </p>
          ) : null}
          <ul className="journey-rail">
            {THREE_VISIT_FRAMEWORK.lead.map((milestone) => (
              <li key={milestone.id}>
                <strong>M{milestone.ordinal}: {milestone.label}</strong>
                <span>{milestone.description}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Immediate intervention</p>
          <h2>Hot leads and unresolved execution problems</h2>
          <div className="stack-grid">
            <article className="stack-card">
              <p className="eyebrow">Hot lead queue</p>
              {hotLeadQueue.length === 0 ? (
                <p className="muted">No hot leads are waiting right now.</p>
              ) : (
                <ul className="check-list">
                  {hotLeadQueue.map((lead) => (
                    <li key={lead.leadKey}>
                      <Link href={`/dashboard/leads/${encodeURIComponent(lead.leadKey)}`}>
                        {lead.leadKey}
                      </Link>{" "}
                      — {lead.stage}, {lead.nextLeadMilestone ?? "Complete"}
                    </li>
                  ))}
                </ul>
              )}
            </article>
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
                      — {job.status}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Recovery queue</p>
          <h2>Documents and workflows needing attention</h2>
          <div className="stack-grid">
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
                      — {job.status}
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
                      — {run.eventName}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>
        </article>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <p className="eyebrow">Lead M1 to M2</p>
          <h2>{snapshot.conversionRates.leadM1ToM2}%</h2>
          <p className="muted">Returning-engaged rate from captured leads.</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Lead M2 to M3</p>
          <h2>{snapshot.conversionRates.leadM2ToM3}%</h2>
          <p className="muted">Booked or offered rate from returning leads.</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Customer M1 to M2</p>
          <h2>{snapshot.conversionRates.customerM1ToM2}%</h2>
          <p className="muted">Activation rate from onboarded customers.</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Customer M2 to M3</p>
          <h2>{snapshot.conversionRates.customerM2ToM3}%</h2>
          <p className="muted">Value-realized rate from activated customers.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Execution queues</p>
          <h2>What operators can act on right now</h2>
          <div className="stack-grid">
            <article className="stack-card">
              <p className="eyebrow">Bookings</p>
              <h3>{visibleBookingJobs.length}</h3>
              <p className="muted">Scheduling jobs recorded in the runtime.</p>
              <Link href="/dashboard/bookings" className="secondary">
                Open booking queue
              </Link>
            </article>
            <article className="stack-card">
              <p className="eyebrow">Documents</p>
              <h3>{visibleDocumentJobs.length}</h3>
              <p className="muted">Proposal, agreement, and onboarding document jobs.</p>
              <Link href="/dashboard/documents" className="secondary">
                Open document queue
              </Link>
            </article>
            <article className="stack-card">
              <p className="eyebrow">Workflow runs</p>
              <h3>{visibleWorkflowRuns.length}</h3>
              <p className="muted">n8n and internal workflow emissions logged by LeadOS.</p>
              <Link href="/dashboard/workflows" className="secondary">
                Open workflow history
              </Link>
            </article>
            <article className="stack-card">
              <p className="eyebrow">Experiments</p>
              <h3>{snapshot.experimentPerformance.length}</h3>
              <p className="muted">Active experiment buckets currently represented in lead traffic.</p>
              <Link href="/dashboard/experiments" className="secondary">
                Open experiment view
              </Link>
            </article>
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Operator focus</p>
          <h2>Fast links for intervention</h2>
          <ul className="check-list">
            <li><Link href="/dashboard/providers">Provider health and channel readiness</Link></li>
            <li><Link href="/dashboard/settings">Runtime settings for provider mappings and template IDs</Link></li>
            <li><Link href="/dashboard/bookings">Scheduling requests and availability lookups</Link></li>
            <li><Link href="/dashboard/documents">Proposal, agreement, and onboarding document jobs</Link></li>
            <li><Link href="/dashboard/workflows">Workflow emissions and execution outcomes</Link></li>
            <li><Link href="/dashboard/experiments">Variant and milestone performance by experiment</Link></li>
          </ul>
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Segment view</p>
          <h2>Where momentum is coming from</h2>
          <div className="stack-grid">
            <article className="stack-card">
              <h3>Top sources</h3>
              <ul className="check-list">
                {snapshot.topSources.length === 0 ? (
                  <li>No traffic yet</li>
                ) : (
                  snapshot.topSources.map((entry) => (
                    <li key={entry.label}>
                      {entry.label}: {entry.count}
                    </li>
                  ))
                )}
              </ul>
            </article>
            <article className="stack-card">
              <h3>Top niches</h3>
              <ul className="check-list">
                {snapshot.topNiches.length === 0 ? (
                  <li>No traffic yet</li>
                ) : (
                  snapshot.topNiches.map((entry) => (
                    <li key={entry.label}>
                      {entry.label}: {entry.count}
                    </li>
                  ))
                )}
              </ul>
            </article>
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Funnel mix</p>
          <h2>Families attracting the most movement</h2>
          <ul className="check-list">
            {snapshot.topFamilies.length === 0 ? (
              <li>No funnel traffic yet</li>
            ) : (
              snapshot.topFamilies.map((entry) => (
                <li key={entry.family}>
                  {entry.family}: {entry.count}
                </li>
              ))
            )}
          </ul>
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Recent leads</p>
          <h2>Lead detail drill-down</h2>
          {snapshot.leadTimeline.length === 0 ? (
            <p className="muted">No leads have been captured in this runtime yet.</p>
          ) : (
            <div className="stack-grid">
              {snapshot.leadTimeline.map((lead) => (
                <article key={lead.leadKey} className="stack-card">
                  <p className="eyebrow">{lead.family}</p>
                  <h3>{lead.leadKey}</h3>
                  <p className="muted">Stage: {lead.stage} | Visits: {lead.visitCount}</p>
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
          <p className="eyebrow">Recent milestone events</p>
          <h2>Latest trust and conversion signals</h2>
          {snapshot.recentMilestoneEvents.length === 0 ? (
            <p className="muted">Milestone events will appear here as the runtime captures activity.</p>
          ) : (
            <div className="stack-grid">
              {snapshot.recentMilestoneEvents.map((event) => (
                <article key={event.id} className="stack-card">
                  <p className="eyebrow">{event.type}</p>
                  <h3>{event.milestoneId}</h3>
                  <p className="muted">{event.leadKey}</p>
                  <p className="muted">Visit count: {event.visitCount} | Stage: {event.stage}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
