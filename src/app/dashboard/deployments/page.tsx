import Link from "next/link";
import { DeploymentRegistryManager } from "@/components/DeploymentRegistryManager";
import { DeploymentStatusForm } from "@/components/DeploymentStatusForm";
import { getDeploymentRegistrySnapshot } from "@/lib/deployment-registry";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { tenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function DeploymentRegistryPage() {
  await requireOperatorPageSession("/dashboard/deployments");
  const snapshot = await getDeploymentRegistrySnapshot();

  return (
    <main className="experience-page">
      <section className="experience-hero">
        <div className="hero-copy">
          <p className="eyebrow">Deployment registry</p>
          <h1>{tenantConfig.brandName} rollout control plane</h1>
          <p className="lede">
            Track where each embed, hosted link, iframe, and WordPress deployment is installed so rollout work becomes a managed operating system instead of a folder of snippets.
          </p>
          <div className="cta-row">
            <Link href="/dashboard" className="secondary">
              Back to dashboard
            </Link>
            <Link href="/deployments/plumbing" className="secondary">
              Open deployment generator
            </Link>
          </div>
        </div>
        <aside className="hero-rail">
          <p className="eyebrow">Registry summary</p>
          <ul className="journey-rail">
            <li><strong>Total deployments</strong><span>{snapshot.summary.total}</span></li>
            <li><strong>Live</strong><span>{snapshot.summary.live}</span></li>
            <li><strong>Generated</strong><span>{snapshot.summary.generated}</span></li>
            <li><strong>Planned</strong><span>{snapshot.summary.planned}</span></li>
            <li><strong>ZIP scoped</strong><span>{snapshot.summary.zipScoped}</span></li>
            <li><strong>Provider scoped</strong><span>{snapshot.summary.providerScoped}</span></li>
          </ul>
        </aside>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <p className="eyebrow">Widget installs</p>
          <h2>{snapshot.summary.widget}</h2>
          <p className="muted">JS widget deployments being managed through the registry.</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">WordPress plugins</p>
          <h2>{snapshot.summary.wordpressPlugin}</h2>
          <p className="muted">Installable plugin-based deployments generated for provider and ZIP pages.</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Paused</p>
          <h2>{snapshot.summary.paused}</h2>
          <p className="muted">Deployments temporarily held back without being retired from the portfolio.</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Retired</p>
          <h2>{snapshot.summary.retired}</h2>
          <p className="muted">Legacy deployments kept in history for auditability and migration planning.</p>
        </article>
      </section>

      <section className="grid two">
        <DeploymentRegistryManager defaultRecipe="provider-homepage-emergency-widget" defaultCity="Philadelphia" />
        <article className="panel">
          <p className="eyebrow">Top domains</p>
          <h2>Where rollout is concentrated</h2>
          {snapshot.summary.topDomains.length === 0 ? (
            <p className="muted">No domains have been attached to registry records yet.</p>
          ) : (
            <ul className="check-list">
              {snapshot.summary.topDomains.map((entry) => (
                <li key={entry.domain}>{entry.domain}: {entry.count}</li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="stack-grid">
        {snapshot.records.length === 0 ? (
          <article className="panel">
            <p className="muted">No deployments have been registered yet. Generate one from the deployment blueprint, then register it here.</p>
          </article>
        ) : (
          snapshot.records.map((record) => (
            <article key={record.id} className="panel">
              <div className="portal-status-row">
                <span className="portal-chip">{record.status}</span>
                <span className="portal-chip">{record.installType}</span>
                <span className="portal-chip">{record.pageType}</span>
                <span className="portal-chip">{record.audience}</span>
              </div>
              <h2>{record.domain ?? record.pageUrl ?? record.id}</h2>
              <p className="muted portal-breakable">Hosted URL: {record.hostedUrl}</p>
              <p className="muted portal-breakable">Boot endpoint: {record.bootEndpoint}</p>
              {record.pageUrl ? <p className="muted portal-breakable">Page URL: {record.pageUrl}</p> : null}
              <p className="muted">
                Recipe: {record.recipe ?? "custom"} | Entrypoint: {record.entrypoint} | ZIP: {record.zip ?? "n/a"} | City: {record.city ?? "n/a"}
              </p>
              <p className="muted">
                Provider: {record.providerLabel ?? record.providerId ?? "Unassigned"} | Updated by: {record.updatedBy ?? "Unknown"}
              </p>
              {record.tags.length > 0 ? (
                <div className="portal-status-row">
                  {record.tags.map((tag) => (
                    <span key={tag} className="portal-chip">{tag}</span>
                  ))}
                </div>
              ) : null}
              {record.notes ? <p className="muted portal-breakable">{record.notes}</p> : null}
              <DeploymentStatusForm deploymentId={record.id} currentStatus={record.status} currentNotes={record.notes} />
            </article>
          ))
        )}
      </section>
    </main>
  );
}
