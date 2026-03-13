import Link from "next/link";
import { tenantConfig } from "@/lib/tenant";

export function HostedHero() {
  return (
    <section className="hero">
      <p className="eyebrow">Hosted Lead Subdomain</p>
      <h1>{tenantConfig.brandName} for WordPress and external websites</h1>
      <p className="lede">
        Deploy this runtime on a lead-focused subdomain and let outside websites hand off chat,
        forms, assessments, and qualification into a centralized intelligence layer.
      </p>
      <div className="cta-row">
        <Link href="/assess/general" className="primary">
          Start Hosted Assessment
        </Link>
        <Link href="/calculator" className="secondary">
          View ROI Flow
        </Link>
      </div>
    </section>
  );
}
