import { HostedHero } from "@/components/HostedHero";
import { buildDashboardSnapshot } from "@/lib/dashboard";
import { buildDefaultFunnelGraphs } from "@/lib/funnel-library";
import { getAutomationHealth } from "@/lib/providers";
import { getCanonicalEvents, getLeadRecords } from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

export default function HomePage() {
  const graphs = buildDefaultFunnelGraphs(tenantConfig.tenantId);
  const health = getAutomationHealth();
  const snapshot = buildDashboardSnapshot(getLeadRecords(), getCanonicalEvents());
  return (
    <main>
      <HostedHero />
      <div className="grid two">
        <section className="panel">
          <h2>What this runtime does</h2>
          <p className="muted">
            This hosted app is designed to sit behind a lead subdomain and run the full LeadOS
            operating model: graph execution, canonical events, funnel-family routing, and
            multi-channel automation handoff.
          </p>
          <ul>
            <li>Centralizes intake, dedupe, and trace metadata for all external sites</li>
            <li>Represents every funnel as canonical nodes and conditional edges</li>
            <li>Emits lifecycle events for scoring, routing, messaging, and conversion</li>
            <li>Provides automation health, smoke tests, and nurture cron endpoints</li>
          </ul>
        </section>
        <section className="panel">
          <h2>Tenant defaults</h2>
          <p className="muted">Brand: {tenantConfig.brandName}</p>
          <p className="muted">Default service: {tenantConfig.defaultService}</p>
          <p className="muted">Default niche: {tenantConfig.defaultNiche}</p>
          <p className="muted">Support: {tenantConfig.supportEmail}</p>
          <p className="muted">Funnels: {Object.keys(graphs).length}</p>
          <p className="muted">Live mode: {health.liveMode ? "enabled" : "dry-run"}</p>
        </section>
      </div>
      <section className="panel">
        <h2>Canonical Funnel Families</h2>
        <div className="grid two">
          {Object.values(graphs).map((graph) => (
            <article key={graph.id} className="panel">
              <p className="eyebrow">{graph.family}</p>
              <h3>{graph.name}</h3>
              <p className="muted">Goal: {graph.goal}</p>
              <p className="muted">Nodes: {graph.nodes.length}</p>
            </article>
          ))}
        </div>
      </section>
      <div className="grid two">
        <section className="panel">
          <h2>Milestone Snapshot</h2>
          <p className="muted">Lead M1 captured: {snapshot.milestones.lead.captured}</p>
          <p className="muted">Lead M2 return engaged: {snapshot.milestones.lead.returnEngaged}</p>
          <p className="muted">Lead M3 booked or offered: {snapshot.milestones.lead.bookedOrOffered}</p>
          <p className="muted">Customer M1 onboarded: {snapshot.milestones.customer.onboarded}</p>
          <p className="muted">Customer M2 activated: {snapshot.milestones.customer.activated}</p>
          <p className="muted">Customer M3 value realized: {snapshot.milestones.customer.valueRealized}</p>
        </section>
        <section className="panel">
          <h2>Operator Visibility</h2>
          <p className="muted">Recent leads tracked: {snapshot.leadTimeline.length}</p>
          <p className="muted">Recent milestone events: {snapshot.recentMilestoneEvents.length}</p>
          <p className="muted">Top funnel families: {snapshot.topFamilies.map((entry) => `${entry.family} (${entry.count})`).join(", ") || "No traffic yet"}</p>
          <p className="muted">Full dashboard: /dashboard</p>
        </section>
      </div>
    </main>
  );
}
