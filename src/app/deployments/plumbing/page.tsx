import Link from "next/link";
import {
  buildManifestCatalog,
  generateBulkZipDeploymentPackage,
  generateDeploymentPackage,
} from "@/lib/embed-deployment";
import { tenantConfig } from "@/lib/tenant";

type DeploymentBlueprintPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DeploymentBlueprintPage({ searchParams }: DeploymentBlueprintPageProps) {
  const params = (await searchParams) ?? {};
  const zip = asString(params.zip) ?? "19103";
  const city = asString(params.city) ?? "Philadelphia";
  const recipe = asString(params.recipe) ?? "provider-homepage-emergency-widget";
  const bulkZipInput = asString(params.zips) ?? "19103,19104,19107";
  const catalog = buildManifestCatalog(tenantConfig);
  const activeDeployment = generateDeploymentPackage({
    recipe,
    zip,
    city,
    niche: "plumbing",
  }, tenantConfig);
  const bulkDeployment = generateBulkZipDeploymentPackage({
    recipe,
    niche: "plumbing",
    city,
    zips: bulkZipInput.split(","),
    limit: 12,
  }, tenantConfig);

  return (
    <main className="page-shell">
      <section className="hero panel">
        <p className="eyebrow">Deployment blueprint</p>
        <h1>Plumbing marketplace deployment generator</h1>
        <p className="hero-copy">
          Use this page to generate preset-aware hosted URLs, widget snippets, iframe fallbacks, and WordPress-ready
          embed blocks for provider sites, ZIP pages, estimate pages, commercial pages, and provider recruitment.
        </p>
        <div className="signal-pill-grid" aria-label="Generator context">
          <span className="signal-pill">Recipe: {activeDeployment.deploymentPattern?.label ?? activeDeployment.entrypointPreset.label}</span>
          <span className="signal-pill">ZIP: {zip}</span>
          <span className="signal-pill">City: {city}</span>
          <span className="signal-pill">Widget: {activeDeployment.widgetPreset.label}</span>
        </div>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Deployment recipes</p>
          <h2>Choose the page pattern you are generating for</h2>
          <div className="entry-link-grid">
            {catalog.deploymentPatterns.map((pattern) => {
              const href = `/deployments/plumbing?recipe=${pattern.id}&zip=${zip}&city=${encodeURIComponent(city)}`;
              return (
                <Link key={pattern.id} href={href} className="entry-link-card">
                  <strong>{pattern.label}</strong>
                  <span>{pattern.summary}</span>
                </Link>
              );
            })}
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">What this recipe is best for</p>
          <h2>{activeDeployment.deploymentPattern?.label ?? activeDeployment.entrypointPreset.label}</h2>
          <p className="muted">
            {activeDeployment.deploymentPattern?.useCase ?? activeDeployment.entrypointPreset.summary}
          </p>
          <ul className="check-list">
            {(activeDeployment.deploymentPattern?.placement ?? activeDeployment.widgetPreset.placementGuidance).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Hosted URL</p>
          <h2>Direct handoff link</h2>
          <div className="code-card">
            <pre><code>{activeDeployment.bundle.hostedUrl}</code></pre>
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">Widget install</p>
          <h2>Preset-aware JavaScript embed</h2>
          <div className="code-card">
            <pre><code>{activeDeployment.bundle.widgetScript}</code></pre>
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">WordPress HTML block</p>
          <h2>Paste into Gutenberg or a custom HTML widget</h2>
          <div className="code-card">
            <pre><code>{activeDeployment.wordpressEmbedBlock}</code></pre>
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">Iframe fallback</p>
          <h2>Full hosted-page embed</h2>
          <div className="code-card">
            <pre><code>{activeDeployment.bundle.iframeEmbed}</code></pre>
          </div>
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">APIs</p>
          <h2>Use these endpoints in plugins and agency tooling</h2>
          <ul className="check-list">
            <li><strong>Generator endpoint</strong>: <span className="portal-breakable">{activeDeployment.generatorEndpoint}</span></li>
            <li><strong>Widget boot</strong>: <span className="portal-breakable">{activeDeployment.bundle.bootEndpoint}</span></li>
            <li><strong>Embed manifest</strong>: <span className="portal-breakable">{activeDeployment.bundle.manifestEndpoint}</span></li>
          </ul>
        </article>
        <article className="panel">
          <p className="eyebrow">Success metrics</p>
          <h2>What this deployment should be judged by</h2>
          <ul className="check-list">
            {(activeDeployment.deploymentPattern?.successMetrics ?? ["Conversion rate", "Qualified lead rate", "Booking start rate"]).map((metric) => (
              <li key={metric}>{metric}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Bulk ZIP rollout</p>
          <h2>Generate many localized deployments at once</h2>
          <p className="muted">
            Use the bulk generator endpoint when rolling out emergency or estimate widgets across many ZIP-level pages.
          </p>
          <div className="code-card">
            <pre><code>{`${tenantConfig.siteUrl}/api/embed/generate-bulk?recipe=${recipe}&city=${encodeURIComponent(city)}&zips=${encodeURIComponent(bulkZipInput)}&limit=12`}</code></pre>
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">Preview of generated ZIP packages</p>
          <h2>First {bulkDeployment.count} localized deployments</h2>
          <div className="entry-link-grid">
            {bulkDeployment.deployments.map((deployment) => (
              <article key={deployment.bundle.hostedUrl} className="entry-link-card">
                <strong>{deployment.bundle.hostedUrl}</strong>
                <span>{deployment.widgetPreset.label}</span>
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
