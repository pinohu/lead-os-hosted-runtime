import { HostedHero } from "@/components/HostedHero";
import { buildDefaultFunnelGraphs } from "@/lib/funnel-library";
import { getAutomationHealth } from "@/lib/providers";
import { tenantConfig } from "@/lib/tenant";

export default function HomePage() {
  const graphs = buildDefaultFunnelGraphs(tenantConfig.tenantId);
  const health = getAutomationHealth();
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
    </main>
  );
}
