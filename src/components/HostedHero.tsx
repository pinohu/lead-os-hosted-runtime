import Link from "next/link";
import { buildDefaultFunnelGraphs } from "@/lib/funnel-library";
import { tenantConfig } from "@/lib/tenant";

export function HostedHero() {
  const funnelCount = Object.keys(buildDefaultFunnelGraphs(tenantConfig.tenantId)).length;
  return (
    <section className="hero">
      <p className="eyebrow">LeadOS Runtime</p>
      <h1>{tenantConfig.brandName} as a funnel operating system</h1>
      <p className="lede">
        Deploy this runtime on a lead-focused subdomain and let external sites hand off chat,
        forms, assessments, webinars, checkout flows, and retention journeys into a centralized
        graph-driven intelligence layer.
      </p>
      <div className="cta-row">
        <Link href="/assess/general" className="primary">
          Start Qualification Flow
        </Link>
        <Link href="/funnel/lead-magnet" className="secondary">
          View Default Funnel Graphs
        </Link>
      </div>
      <p className="muted">Enabled funnel families: {funnelCount}</p>
    </section>
  );
}
