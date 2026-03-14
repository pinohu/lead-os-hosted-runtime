import Link from "next/link";
import { THREE_VISIT_FRAMEWORK } from "@/lib/automation";
import { buildDashboardSnapshot } from "@/lib/dashboard";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { getAutomationHealth } from "@/lib/providers";
import { getCanonicalEvents, getLeadRecords } from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

export default async function DashboardPage() {
  const session = await requireOperatorPageSession("/dashboard");
  const snapshot = buildDashboardSnapshot(await getLeadRecords(), await getCanonicalEvents());
  const health = getAutomationHealth();

  return (
    <main className="experience-page">
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
            <a href="/auth/sign-out" className="secondary">
              Sign out
            </a>
          </div>
        </div>
        <aside className="hero-rail">
          <p className="eyebrow">Operator session</p>
          <h2>{session.email}</h2>
          <p className="muted">
            Live mode: {health.liveMode ? "enabled" : "dry run"} | Total leads: {snapshot.totals.leads} | Hot leads: {snapshot.totals.hotLeads}
          </p>
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
