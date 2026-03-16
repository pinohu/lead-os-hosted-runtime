import Link from "next/link";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { operatorManualPlaybook, operatorManualSections } from "@/lib/operator-manual";
import { tenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function OperatorManualPage() {
  await requireOperatorPageSession("/dashboard/manual");

  return (
    <main className="experience-page">
      <section className="experience-hero">
        <div className="hero-copy">
          <p className="eyebrow">Operator manual</p>
          <h1>{tenantConfig.brandName} launch and operations guide</h1>
          <p className="lede">
            This in-app manual maps every important route to its real purpose so operators, implementers,
            and deployment teams know exactly where to go without hunting through the portal.
          </p>
          <div className="cta-row">
            <Link href="/dashboard" className="primary">
              Open dispatch desk
            </Link>
            <Link href="/dashboard/overview" className="secondary">
              System overview
            </Link>
            <Link href="/deployments/plumbing" className="secondary">
              Deployment blueprint
            </Link>
          </div>
        </div>
        <aside className="hero-rail">
          <p className="eyebrow">Best operating rhythm</p>
          <ul className="journey-rail">
            {operatorManualPlaybook.map((line) => (
              <li key={line}>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="grid two">
        {operatorManualSections.map((section) => (
          <article key={section.id} className="panel">
            <p className="eyebrow">{section.eyebrow}</p>
            <h2>{section.title}</h2>
            <p className="muted">{section.summary}</p>
            <div className="stack-grid">
              {section.links.map((item) => (
                <article key={`${section.id}:${item.href}`} className="stack-card">
                  <div className="portal-status-row">
                    <span className="portal-chip">{item.audience}</span>
                    <span className="portal-chip portal-breakable">{item.href}</span>
                  </div>
                  <h3>{item.label}</h3>
                  <p className="muted portal-breakable">{item.purpose}</p>
                  <div className="cta-row">
                    <Link href={item.href} className="secondary">
                      Open route
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
