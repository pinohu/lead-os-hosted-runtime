import Link from "next/link";
import { notFound } from "next/navigation";
import { DispatchActionPanel } from "@/components/DispatchActionPanel";
import { summarizeMilestoneProgress } from "@/lib/automation";
import { recommendDispatchProviders } from "@/lib/dispatch-routing";
import { getDispatchSlaSnapshot } from "@/lib/dispatch-sla";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import {
  buildLeadDisplayName,
  buildLeadSubline,
  formatLeadKeyForDisplay,
  formatOptionalDateTime,
  formatMilestoneIdForDisplay,
  formatPortalLabel,
} from "@/lib/operator-ui";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
import {
  type BookingJobRecord,
  type DocumentJobRecord,
  getOperatorActions,
  getBookingJobs,
  getCanonicalEvents,
  getDocumentJobs,
  getLeadRecord,
  getProviderDispatchRequests,
  getProviderExecutions,
  type ProviderExecutionRecord,
  type WorkflowRunRecord,
  getWorkflowRuns,
} from "@/lib/runtime-store";
import type { CanonicalEvent } from "@/lib/trace";
import type { PlumbingJobOutcome, PlumbingLeadContext } from "@/lib/runtime-schema";

export const dynamic = "force-dynamic";

type LeadDetailPageProps = {
  params: Promise<{ leadKey: string }>;
};

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const session = await requireOperatorPageSession("/dashboard");
  const { leadKey } = await params;
  const decodedLeadKey = decodeURIComponent(leadKey);
  const lead = await getLeadRecord(decodedLeadKey);

  if (!lead) {
    notFound();
  }

  const [events, workflows, providerExecutions, bookingJobs, documentJobs, operatorActions, runtimeConfig, providerDispatchRequests] = await Promise.all([
    getCanonicalEvents(),
    getWorkflowRuns(decodedLeadKey),
    getProviderExecutions(decodedLeadKey),
    getBookingJobs(decodedLeadKey),
    getDocumentJobs(decodedLeadKey),
    getOperatorActions(decodedLeadKey),
    getOperationalRuntimeConfig(),
    getProviderDispatchRequests({ leadKey: decodedLeadKey }),
  ]);
  const filteredEvents = (events as CanonicalEvent[])
    .filter((event) => event.leadKey === decodedLeadKey)
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
  const workflowItems = workflows as WorkflowRunRecord[];
  const providerItems = providerExecutions as ProviderExecutionRecord[];
  const bookingItems = bookingJobs as BookingJobRecord[];
  const documentItems = documentJobs as DocumentJobRecord[];
  const progress = summarizeMilestoneProgress(lead);
  const plumbing = lead.metadata.plumbing && typeof lead.metadata.plumbing === "object"
    ? lead.metadata.plumbing as PlumbingLeadContext
    : null;
  const plumbingOutcome = lead.metadata.plumbingOutcome && typeof lead.metadata.plumbingOutcome === "object"
    ? lead.metadata.plumbingOutcome as PlumbingJobOutcome
    : null;
  const operatingModel = typeof lead.metadata.operatingModel === "string"
    ? lead.metadata.operatingModel
    : "generic-growth";
  const plumbingSla = plumbing
    ? getDispatchSlaSnapshot({
        updatedAt: lead.updatedAt,
        stage: lead.stage,
        plumbing,
        outcome: plumbingOutcome,
      })
    : null;
  const recommendedProviders = plumbing
    ? recommendDispatchProviders(plumbing, runtimeConfig.dispatch.providers)
    : [];
  const displayLeadKey = formatLeadKeyForDisplay(decodedLeadKey);
  const displayLeadName = buildLeadDisplayName(lead);
  const displayLeadSubline = buildLeadSubline(lead);
  const leadMilestones = lead.milestones.leadMilestones.map((milestoneId) => formatMilestoneIdForDisplay(milestoneId));
  const customerMilestones = lead.milestones.customerMilestones.map((milestoneId) =>
    formatMilestoneIdForDisplay(milestoneId),
  );

  return (
    <main className="experience-page">
      <section className="experience-hero">
        <div className="hero-copy">
          <p className="eyebrow">Lead detail</p>
          <h1 className="portal-identifier" title={decodedLeadKey}>
            {displayLeadName}
          </h1>
          {displayLeadSubline ? <p className="muted portal-breakable">{displayLeadSubline}</p> : null}
          <p className="lede">
            {lead.firstName} is currently in the <strong>{lead.family}</strong> family at the{" "}
            <strong>{lead.stage}</strong> stage.
          </p>
          <div className="cta-row">
            <Link href="/dashboard" className="secondary">
              Back to dashboard
            </Link>
            <a href={lead.destination} className="primary">
              Open current destination
            </a>
          </div>
        </div>
        <aside className="hero-rail">
          <p className="eyebrow">Milestone state</p>
          <ul className="journey-rail">
            <li>
              <strong>Visits</strong>
              <span>{progress.visitCount}</span>
            </li>
            <li>
              <strong>Next lead milestone</strong>
              <span>{progress.nextLeadMilestone?.label ?? "Complete"}</span>
            </li>
            <li>
              <strong>Next customer milestone</strong>
              <span>{progress.nextCustomerMilestone?.label ?? "Not started"}</span>
            </li>
          </ul>
        </aside>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Identity and routing</p>
          <h2>Lead profile</h2>
          <dl className="portal-data-list">
            <div><dt>Email</dt><dd>{lead.email ?? "Not captured"}</dd></div>
            <div><dt>Phone</dt><dd>{lead.phone ?? "Not captured"}</dd></div>
            <div><dt>Company</dt><dd>{lead.company ?? "Not captured"}</dd></div>
            <div><dt>Source</dt><dd>{formatPortalLabel(lead.source)}</dd></div>
            <div><dt>Niche</dt><dd>{formatPortalLabel(lead.niche)}</dd></div>
            <div><dt>Score</dt><dd>{lead.score}</dd></div>
            <div><dt>CTA</dt><dd>{lead.ctaLabel}</dd></div>
          </dl>
        </article>

        <article className="panel">
          <p className="eyebrow">Trace and milestones</p>
          <h2>Runtime context</h2>
          <dl className="portal-data-list">
            <div><dt>Visitor</dt><dd>{lead.trace.visitorId}</dd></div>
            <div><dt>Session</dt><dd>{lead.trace.sessionId}</dd></div>
            <div><dt>Blueprint</dt><dd>{lead.trace.blueprintId}</dd></div>
            <div><dt>Step</dt><dd>{lead.trace.stepId}</dd></div>
            <div><dt>Lead milestones</dt><dd>{leadMilestones.join(", ") || "None"}</dd></div>
            <div><dt>Customer milestones</dt><dd>{customerMilestones.join(", ") || "None"}</dd></div>
          </dl>
        </article>
      </section>

      {plumbing ? (
        <section className="grid two">
          <article className="panel">
            <p className="eyebrow">PlumbingOS context</p>
            <h2>Dispatch classification</h2>
            <ul className="check-list">
              <li>Operating model: {formatPortalLabel(operatingModel)}</li>
              <li>Urgency band: {formatPortalLabel(plumbing.urgencyBand)}</li>
              <li>Issue type: {formatPortalLabel(plumbing.issueType)}</li>
              <li>Dispatch mode: {formatPortalLabel(plumbing.dispatchMode)}</li>
              <li>Property type: {formatPortalLabel(plumbing.propertyType)}</li>
              <li className="portal-breakable">
                Location: {[plumbing.geo.city, plumbing.geo.county, plumbing.geo.state].filter(Boolean).join(", ") || "Not captured"}
              </li>
            </ul>
          </article>

          <article className="panel">
            <p className="eyebrow">Operator guidance</p>
            <h2>Why this lead was routed this way</h2>
            <ul className="check-list">
              {plumbing.routingReasons.length === 0 ? (
                <li>No routing reasons were recorded.</li>
              ) : (
                plumbing.routingReasons.map((reason) => (
                  <li key={reason} className="portal-breakable">{reason}</li>
                ))
              )}
            </ul>
          </article>
        </section>
      ) : null}

      {plumbingSla ? (
        <section className="panel">
          <p className="eyebrow">Dispatch SLA</p>
          <h2>Response and escalation timing</h2>
          <ul className="check-list">
            <li>Response due at: {plumbingSla.dueAt}</li>
            <li>Escalation target: {plumbingSla.escalationAt}</li>
            <li>Overdue: {plumbingSla.overdue ? `yes, by ${plumbingSla.minutesPastDue} minutes` : "no"}</li>
            <li>Automatic backup escalation: {plumbingSla.escalationReady ? "ready" : "not ready"}</li>
          </ul>
        </section>
      ) : null}

      {plumbing ? (
        <section className="panel">
          <p className="eyebrow">Provider assignment</p>
          <h2>Best roster matches for this job</h2>
          {recommendedProviders.length === 0 ? (
            <p className="muted">
              No configured dispatch provider currently matches this lead's coverage and capacity profile.
            </p>
          ) : (
            <div className="stack-grid">
              {recommendedProviders.map((provider) => (
                <article key={provider.providerId} className="stack-card">
                  <p className="eyebrow">{provider.providerLabel}</p>
                  <h3>{provider.score}</h3>
                  <p className="muted portal-breakable">{provider.reason}</p>
                  <p className="muted">
                    Available capacity: {provider.availableCapacity == null ? "unknown" : provider.availableCapacity}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {providerDispatchRequests.length > 0 ? (
        <section className="panel">
          <p className="eyebrow">Provider dispatch requests</p>
          <h2>Which providers were asked to claim this job</h2>
          <div className="stack-grid">
            {providerDispatchRequests.map((request) => (
              <article key={request.id} className="stack-card">
                <p className="eyebrow">{request.providerLabel}</p>
                <h3>{formatPortalLabel(request.status)}</h3>
                <p className="muted">
                  {formatPortalLabel(request.urgencyBand ?? "dispatch")} | {formatPortalLabel(request.issueType ?? "general-plumbing")}
                </p>
                <p className="muted">{formatOptionalDateTime(request.createdAt)}</p>
                {request.respondedAt ? <p className="muted">Responded: {formatOptionalDateTime(request.respondedAt)}</p> : null}
                {request.note ? <p className="muted portal-breakable">{request.note}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {plumbing ? (
        <section className="grid two">
          <article className="panel">
            <p className="eyebrow">Actionable controls</p>
            <h2>Resolve dispatch from this page</h2>
            {session.role !== "analyst" ? (
              <DispatchActionPanel leadKey={decodedLeadKey} />
            ) : (
              <p className="muted">Analyst role can audit dispatch history here but cannot apply dispatch actions.</p>
            )}
          </article>

          <article className="panel">
            <p className="eyebrow">Closed-loop outcome</p>
            <h2>Latest plumbing result</h2>
            {plumbingOutcome ? (
              <ul className="check-list">
                <li>Status: {formatPortalLabel(plumbingOutcome.status)}</li>
                <li className="portal-breakable">Actor: {plumbingOutcome.actorEmail}</li>
                <li>Recorded: {formatOptionalDateTime(plumbingOutcome.recordedAt)}</li>
                <li>Provider: {plumbingOutcome.provider ? formatPortalLabel(plumbingOutcome.provider) : "Not captured"}</li>
                <li>Revenue: {typeof plumbingOutcome.revenueValue === "number" ? plumbingOutcome.revenueValue : "Not captured"}</li>
                <li className="portal-breakable">Note: {plumbingOutcome.note ?? "No note recorded"}</li>
              </ul>
            ) : (
              <p className="muted">No closed-loop plumbing outcome has been recorded yet.</p>
            )}
          </article>
        </section>
      ) : null}

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Workflow activity</p>
          <h2>Automation runs</h2>
          {workflowItems.length === 0 ? (
            <p className="muted">No workflow runs recorded for this lead yet.</p>
          ) : (
            <div className="stack-grid">
              {workflowItems.map((workflow) => (
                <article key={workflow.id} className="stack-card">
                  <p className="eyebrow">{formatPortalLabel(workflow.provider)}</p>
                  <h3>{formatPortalLabel(workflow.eventName)}</h3>
                  <p className="muted portal-breakable">{workflow.detail}</p>
                  <p className="muted">{formatOptionalDateTime(workflow.createdAt)}</p>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <p className="eyebrow">Provider executions</p>
          <h2>Channel and service activity</h2>
          {providerItems.length === 0 ? (
            <p className="muted">No provider executions recorded for this lead yet.</p>
          ) : (
            <div className="stack-grid">
              {providerItems.map((execution) => (
                <article key={execution.id} className="stack-card">
                  <p className="eyebrow">{formatPortalLabel(execution.provider)}</p>
                  <h3>{formatPortalLabel(execution.kind)}</h3>
                  <p className="muted portal-breakable">{execution.detail}</p>
                  <p className="muted">{formatOptionalDateTime(execution.createdAt)}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Booking jobs</p>
          <h2>Scheduling state</h2>
          {bookingItems.length === 0 ? (
            <p className="muted">No booking jobs recorded yet.</p>
          ) : (
            <div className="stack-grid">
              {bookingItems.map((job) => (
                <article key={job.id} className="stack-card">
                  <p className="eyebrow">{formatPortalLabel(job.provider)}</p>
                  <h3>{formatPortalLabel(job.status)}</h3>
                  <p className="muted portal-breakable">{job.detail}</p>
                  <p className="muted">{formatOptionalDateTime(job.updatedAt)}</p>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <p className="eyebrow">Document jobs</p>
          <h2>Proposal and onboarding docs</h2>
          {documentItems.length === 0 ? (
            <p className="muted">No document jobs recorded yet.</p>
          ) : (
            <div className="stack-grid">
              {documentItems.map((job) => (
                <article key={job.id} className="stack-card">
                  <p className="eyebrow">{formatPortalLabel(job.provider)}</p>
                  <h3>{formatPortalLabel(job.status)}</h3>
                  <p className="muted portal-breakable">{job.detail}</p>
                  <p className="muted">{formatOptionalDateTime(job.updatedAt)}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="panel">
        <p className="eyebrow">Event timeline</p>
        <h2>Canonical history</h2>
        {filteredEvents.length === 0 ? (
          <p className="muted">No events recorded for this lead yet.</p>
        ) : (
          <div className="stack-grid">
            {filteredEvents.map((event) => (
              <article key={event.id} className="stack-card">
                <p className="eyebrow">{formatPortalLabel(event.channel)}</p>
                <h3>{formatPortalLabel(event.eventType)}</h3>
                <p className="muted">{event.timestamp}</p>
                <p className="muted">Status: {formatPortalLabel(event.status)}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <p className="eyebrow">Operator audit trail</p>
        <h2>Manual dispatch actions</h2>
        {operatorActions.length === 0 ? (
          <p className="muted">No operator dispatch actions have been recorded for this lead yet.</p>
        ) : (
          <div className="stack-grid">
            {operatorActions.map((action) => (
              <article key={action.id} className="stack-card">
                <p className="eyebrow">{formatPortalLabel(action.actionType)}</p>
                <h3 className="portal-identifier" title={action.actorEmail}>
                  {action.actorEmail}
                </h3>
                <p className="muted portal-breakable">{action.detail}</p>
                <p className="muted">{formatOptionalDateTime(action.createdAt)}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
