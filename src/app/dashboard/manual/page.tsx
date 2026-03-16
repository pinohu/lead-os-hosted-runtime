import Link from "next/link";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { operatorManualPlaybook, operatorManualSections, operatorSops } from "@/lib/operator-manual";
import { tenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function OperatorManualPage() {
  await requireOperatorPageSession("/dashboard/manual");

  return (
    <main className="experience-page manual-page">
      <section className="experience-hero manual-hero">
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

      <section className="manual-anchor-grid" aria-label="Manual shortcuts">
        <Link href="#manual-entrypoints" className="entry-link-card">
          <strong>Entry points</strong>
          <span>Customer, provider, and deployment-facing routes.</span>
        </Link>
        <Link href="#manual-operations" className="entry-link-card">
          <strong>Operator surfaces</strong>
          <span>Dashboards, alerts, providers, experiments, and settings.</span>
        </Link>
        <Link href="#manual-sops" className="entry-link-card">
          <strong>SOP center</strong>
          <span>Daily ops, incidents, rollout, onboarding, and promotion playbooks.</span>
        </Link>
      </section>

      <section id="manual-entrypoints" className="manual-section-grid">
        {operatorManualSections.map((section) => (
          <article key={section.id} className="panel manual-section-card" id={`section-${section.id}`}>
            <p className="eyebrow">{section.eyebrow}</p>
            <h2>{section.title}</h2>
            <p className="muted">{section.summary}</p>
            <div className="manual-link-grid">
              {section.links.map((item) => (
                <article key={`${section.id}:${item.href}`} className="stack-card manual-link-card">
                  <div className="portal-status-row">
                    <span className="portal-chip">{item.audience}</span>
                  </div>
                  <h3>{item.label}</h3>
                  <p className="manual-link-path">{item.href}</p>
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

      <section id="manual-sops" className="manual-section-grid">
        {operatorSops.map((sop) => (
          <article key={sop.id} className="panel manual-section-card">
            <p className="eyebrow">{sop.eyebrow}</p>
            <h2>{sop.title}</h2>
            <div className="portal-status-row">
              <span className="portal-chip">{sop.owner}</span>
              <span className="portal-chip">{sop.frequency}</span>
            </div>
            <p className="muted">{sop.summary}</p>

            <div className="manual-sop-grid">
              <article className="stack-card manual-sop-panel">
                <p className="eyebrow">Steps</p>
                <ol className="check-list">
                  {sop.steps.map((step) => (
                    <li key={step} className="portal-breakable">{step}</li>
                  ))}
                </ol>
              </article>

              <article className="stack-card manual-sop-panel">
                <p className="eyebrow">Key surfaces</p>
                <div className="manual-surface-list">
                  {sop.surfaces.map((item) => (
                    <article key={`${sop.id}:${item.href}`} className="manual-surface-row">
                      <div className="manual-surface-head">
                        <h3>{item.label}</h3>
                        <span className="portal-chip">{item.audience}</span>
                      </div>
                      <p className="manual-link-path">{item.href}</p>
                      <p className="muted portal-breakable">{item.purpose}</p>
                      <div className="cta-row">
                        <Link href={item.href} className="secondary">
                          Open surface
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </article>

              <article className="stack-card manual-sop-panel">
                <p className="eyebrow">Success checks</p>
                <ul className="check-list">
                  {sop.successChecks.map((line) => (
                    <li key={line} className="portal-breakable">{line}</li>
                  ))}
                </ul>
              </article>
            </div>
          </article>
        ))}
      </section>

      <section id="manual-operations" className="panel manual-footer-panel">
        <p className="eyebrow">How to use this page</p>
        <h2>Start with the operating rhythm, then use the SOPs as your playbook</h2>
        <div className="manual-anchor-grid">
          <Link href="/dashboard/overview" className="entry-link-card">
            <strong>Start in overview</strong>
            <span>Get the bird's-eye picture before touching queues.</span>
          </Link>
          <Link href="/dashboard" className="entry-link-card">
            <strong>Work from dispatch desk</strong>
            <span>Handle urgent demand and escalation-ready leads first.</span>
          </Link>
          <Link href="/dashboard/alerts" className="entry-link-card">
            <strong>Own alert response</strong>
            <span>Use alert operations when the system itself is degraded.</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
