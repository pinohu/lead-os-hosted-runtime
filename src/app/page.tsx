import { HostedHero } from "@/components/HostedHero";
import { tenantConfig } from "@/lib/tenant";

export default function HomePage() {
  return (
    <main>
      <HostedHero />
      <div className="grid two">
        <section className="panel">
          <h2>What this runtime does</h2>
          <p className="muted">
            This hosted app is designed to sit behind a lead subdomain and accept traffic from
            WordPress sites, external forms, embeddable widgets, and niche-specific landing
            experiences.
          </p>
          <ul>
            <li>Centralizes lead intake for all external sites</li>
            <li>Returns next-step decisions for chat, forms, and assessments</li>
            <li>Hosts fallback funnel pages on the subdomain itself</li>
            <li>Provides a widget boot manifest for external embeds</li>
          </ul>
        </section>
        <section className="panel">
          <h2>Tenant defaults</h2>
          <p className="muted">Brand: {tenantConfig.brandName}</p>
          <p className="muted">Default service: {tenantConfig.defaultService}</p>
          <p className="muted">Default niche: {tenantConfig.defaultNiche}</p>
          <p className="muted">Support: {tenantConfig.supportEmail}</p>
        </section>
      </div>
    </main>
  );
}
