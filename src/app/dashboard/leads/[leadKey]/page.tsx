import Link from "next/link";
import { notFound } from "next/navigation";
import { DispatchActionPanel } from "@/components/DispatchActionPanel";
import { summarizeMilestoneProgress } from "@/lib/automation";
import { recommendDispatchProviders } from "@/lib/dispatch-routing";
import { getDispatchSlaSnapshot } from "@/lib/dispatch-sla";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
import {
  type BookingJobRecord,
  type DocumentJobRecord,
  getOperatorActions,
  getBookingJobs,
  getCanonicalEvents,
  getDocumentJobs,
  getLeadRecord,
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

  const [events, workflows, providerExecutions, bookingJobs, documentJobs, operatorActions, runtimeConfig] = await Promise.all([
    getCanonicalEvents(),
    getWorkflowRuns(decodedLeadKey),
    getProviderExecutions(decodedLeadKey),
    getBookingJobs(decodedLeadKey),
    getDocumentJobs(decodedLeadKey),
    getOperatorActions(decodedLeadKey),
    getOperationalRuntimeConfig(),
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

  function formatLabel(value: string) {
    return value.replace(/-/g, " ");
  }

  return (
    <main className="experience-page">
      <section className="experience-hero">
        <div className="hero-copy">
          <p className="eyebrow">Lead detail</p>
          <h1>{decodedLeadKey}</h1>
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
          <ul className="check-list">
            <li>Email: {lead.email ?? "Not captured"}</li>
            <li>Phone: {lead.phone ?? "Not captured"}</li>
            <li>Company: {lead.company ?? "Not captured"}</li>
            <li>Source: {lead.source}</li>
            <li>Niche: {lead.niche}</li>
            <li>Score: {lead.score}</li>
            <li>CTA: {lead.ctaLabel}</li>
          </ul>
        </article>

        <article className="panel">
          <p className="eyebrow">Trace and milestones</p>
          <h2>Runtime context</h2>
          <ul className="check-list">
            <li>Visitor: {lead.trace.visitorId}</li>
            <li>Session: {lead.trace.sessionId}</li>
            <li>Blueprint: {lead.trace.blueprintId}</li>
            <li>Step: {lead.trace.stepId}</li>
            <li>Lead milestones: {lead.milestones.leadMilestones.join(", ") || "None"}</li>
            <li>Customer milestones: {lead.milestones.customerMilestones.join(", ") || "None"}</li>
          </ul>
        </article>
      </section>

      {plumbing ? (
        <section className="grid two">
          <article className="panel">
            <p className="eyebrow">PlumbingOS context</p>
            <h2>Dispatch classification</h2>
            <ul className="check-list">
              <li>Operating model: {formatLabel(operatingModel)}</li>
              <li>Urgency band: {formatLabel(plumbing.urgencyBand)}</li>
              <li>Issue type: {formatLabel(plumbing.issueType)}</li>
              <li>Dispatch mode: {formatLabel(plumbing.dispatchMode)}</li>
              <li>Property type: {formatLabel(plumbing.propertyType)}</li>
              <li>Location: {[plumbing.geo.city, plumbing.geo.county, plumbing.geo.state].filter(Boolean).join(", ") || "Not captured"}</li>
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
                  <li key={reason}>{reason}</li>
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
              No configured dispatch provider currently matches this lead’s coverage and capacity profile.
            </p>
          ) : (
            <div className="stack-grid">
              {recommendedProviders.map((provider) => (
                <article key={provider.providerId} className="stack-card">
                  <p className="eyebrow">{provider.providerLabel}</p>
                  <h3>{provider.score}</h3>
                  <p className="muted">{provider.reason}</p>
                  <p className="muted">
                    Available capacity: {provider.availableCapacity == null ? "unknown" : provider.availableCapacity}
                  </p>
                </article>
              ))}
            </div>
          )}
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
                <li>Status: {formatLabel(plumbingOutcome.status)}</li>
                <li>Actor: {plumbingOutcome.actorEmail}</li>
                <li>Recorded: {plumbingOutcome.recordedAt}</li>
                <li>Provider: {plumbingOutcome.provider ?? "Not captured"}</li>
                <li>Revenue: {typeof plumbingOutcome.revenueValue === "number" ? plumbingOutcome.revenueValue : "Not captured"}</li>
                <li>Note: {plumbingOutcome.note ?? "No note recorded"}</li>
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
                  <p className="eyebrow">{workflow.provider}</p>
                  <h3>{workflow.eventName}</h3>
                  <p className="muted">{workflow.detail}</p>
                  <p className="muted">{workflow.createdAt}</p>
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
                  <p className="eyebrow">{execution.provider}</p>
                  <h3>{execution.kind}</h3>
                  <p className="muted">{execution.detail}</p>
                  <p className="muted">{execution.createdAt}</p>
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
                  <p className="eyebrow">{job.provider}</p>
                  <h3>{job.status}</h3>
                  <p className="muted">{job.detail}</p>
                  <p className="muted">{job.updatedAt}</p>
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
                  <p className="eyebrow">{job.provider}</p>
                  <h3>{job.status}</h3>
                  <p className="muted">{job.detail}</p>
                  <p className="muted">{job.updatedAt}</p>
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
                <p className="eyebrow">{event.channel}</p>
                <h3>{event.eventType}</h3>
                <p className="muted">{event.timestamp}</p>
                <p className="muted">Status: {event.status}</p>
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
                <p className="eyebrow">{formatLabel(action.actionType)}</p>
                <h3>{action.actorEmail}</h3>
                <p className="muted">{action.detail}</p>
                <p className="muted">{action.createdAt}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
