import Link from "next/link";
import { notFound } from "next/navigation";
import { summarizeMilestoneProgress } from "@/lib/automation";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { getCanonicalEvents, getLeadRecord } from "@/lib/runtime-store";

type LeadDetailPageProps = {
  params: Promise<{ leadKey: string }>;
};

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  await requireOperatorPageSession("/dashboard");
  const { leadKey } = await params;
  const decodedLeadKey = decodeURIComponent(leadKey);
  const lead = getLeadRecord(decodedLeadKey);

  if (!lead) {
    notFound();
  }

  const events = getCanonicalEvents()
    .filter((event) => event.leadKey === decodedLeadKey)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const progress = summarizeMilestoneProgress(lead);

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

      <section className="panel">
        <p className="eyebrow">Event timeline</p>
        <h2>Canonical history</h2>
        {events.length === 0 ? (
          <p className="muted">No events recorded for this lead yet.</p>
        ) : (
          <div className="stack-grid">
            {events.map((event) => (
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
    </main>
  );
}
