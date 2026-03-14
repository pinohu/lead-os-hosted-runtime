import { THREE_VISIT_FRAMEWORK } from "@/lib/automation";
import { buildDashboardSnapshot } from "@/lib/dashboard";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { getCanonicalEvents, getLeadRecords } from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

export default async function DashboardPage() {
  const session = await requireOperatorPageSession("/dashboard");
  const snapshot = buildDashboardSnapshot(getLeadRecords(), getCanonicalEvents());

  return (
    <main>
      <section className="panel">
        <p className="eyebrow">Operator Dashboard</p>
        <h1>{tenantConfig.brandName} Milestone Command Center</h1>
        <p className="muted">
          LeadOS now optimizes for the third meaningful interaction. This dashboard tracks how many
          people reach milestone two and milestone three across both lead and customer journeys.
        </p>
        <div className="cta-row">
          <span className="muted">Signed in as {session.email}</span>
          <a href="/auth/sign-out" className="secondary">
            Sign out
          </a>
        </div>
      </section>

      <div className="grid two">
        <section className="panel">
          <h2>Lead Milestones</h2>
          {THREE_VISIT_FRAMEWORK.lead.map((milestone) => (
            <div key={milestone.id} style={{ marginBottom: "1rem" }}>
              <p className="eyebrow">M{milestone.ordinal}</p>
              <h3>{milestone.label}</h3>
              <p className="muted">{milestone.description}</p>
            </div>
          ))}
          <p className="muted">Captured: {snapshot.milestones.lead.captured}</p>
          <p className="muted">Return engaged: {snapshot.milestones.lead.returnEngaged}</p>
          <p className="muted">Booked or offered: {snapshot.milestones.lead.bookedOrOffered}</p>
        </section>

        <section className="panel">
          <h2>Customer Milestones</h2>
          {THREE_VISIT_FRAMEWORK.customer.map((milestone) => (
            <div key={milestone.id} style={{ marginBottom: "1rem" }}>
              <p className="eyebrow">M{milestone.ordinal}</p>
              <h3>{milestone.label}</h3>
              <p className="muted">{milestone.description}</p>
            </div>
          ))}
          <p className="muted">Onboarded: {snapshot.milestones.customer.onboarded}</p>
          <p className="muted">Activated: {snapshot.milestones.customer.activated}</p>
          <p className="muted">Value realized: {snapshot.milestones.customer.valueRealized}</p>
        </section>
      </div>

      <div className="grid two">
        <section className="panel">
          <h2>Recent Leads</h2>
          {snapshot.leadTimeline.length === 0 ? (
            <p className="muted">No leads have been captured in this runtime yet.</p>
          ) : (
            snapshot.leadTimeline.map((lead) => (
              <article key={lead.leadKey} className="panel">
                <p className="eyebrow">{lead.family}</p>
                <h3>{lead.leadKey}</h3>
                <p className="muted">Stage: {lead.stage}</p>
                <p className="muted">Visits: {lead.visitCount}</p>
                <p className="muted">Next lead milestone: {lead.nextLeadMilestone ?? "Complete"}</p>
                <p className="muted">Next customer milestone: {lead.nextCustomerMilestone ?? "Not applicable"}</p>
              </article>
            ))
          )}
        </section>

        <section className="panel">
          <h2>Recent Milestone Events</h2>
          {snapshot.recentMilestoneEvents.length === 0 ? (
            <p className="muted">Milestone events will appear here as the runtime captures activity.</p>
          ) : (
            snapshot.recentMilestoneEvents.map((event) => (
              <article key={event.id} className="panel">
                <p className="eyebrow">{event.type}</p>
                <h3>{event.milestoneId}</h3>
                <p className="muted">{event.leadKey}</p>
                <p className="muted">Visit count: {event.visitCount}</p>
                <p className="muted">Stage: {event.stage}</p>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
