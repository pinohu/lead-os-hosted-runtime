import type { ReactNode } from "react";
import Link from "next/link";
import {
  buildManifestCatalog,
  generateBulkZipDeploymentPackage,
  generateDeploymentPackage,
} from "@/lib/embed-deployment";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
import { tenantConfig } from "@/lib/tenant";
import { generateWordPressPluginPackage } from "@/lib/wordpress-plugin";

type DeploymentBlueprintPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function DeploymentCodePreview({
  eyebrow,
  title,
  code,
  children,
}: {
  eyebrow: string;
  title: string;
  code: string;
  children: ReactNode;
}) {
  return (
    <article className="panel deployment-preview-panel">
      <div className="deployment-preview-grid">
        <div className="deployment-preview-code">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <div className="code-card">
            <pre><code>{code}</code></pre>
          </div>
        </div>
        <div className="deployment-preview-visual">
          <p className="eyebrow">Preview</p>
          {children}
        </div>
      </div>
    </article>
  );
}

export default async function DeploymentBlueprintPage({ searchParams }: DeploymentBlueprintPageProps) {
  const params = (await searchParams) ?? {};
  const zip = asString(params.zip) ?? "19103";
  const city = asString(params.city) ?? "Philadelphia";
  const recipe = asString(params.recipe) ?? "provider-homepage-emergency-widget";
  const bulkZipInput = asString(params.zips) ?? "19103,19104,19107";
  const runtimeConfig = await getOperationalRuntimeConfig();
  const promotions = runtimeConfig.experiments.promotions;
  const catalog = buildManifestCatalog(tenantConfig, promotions);
  const activeDeployment = generateDeploymentPackage({
    recipe,
    zip,
    city,
    niche: "plumbing",
  }, tenantConfig, promotions);
  const wordpressPlugin = generateWordPressPluginPackage(activeDeployment, tenantConfig);
  const bulkDeployment = generateBulkZipDeploymentPackage({
    recipe,
    niche: "plumbing",
    city,
    zips: bulkZipInput.split(","),
    limit: 12,
  }, tenantConfig, promotions);

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
        <div className="cta-row">
          <Link href="/dashboard/deployments" className="secondary">
            Open rollout registry
          </Link>
          <Link href="/showroom/plumbing" className="secondary">
            Open public showroom
          </Link>
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

      <section className="deployment-preview-stack">
        <DeploymentCodePreview
          eyebrow="Hosted URL"
          title="Direct handoff link"
          code={activeDeployment.bundle.hostedUrl}
        >
          <div className="deployment-visual-card">
            <strong>Hosted landing page</strong>
            <p className="muted">
              Best for ads, SEO, SMS, QR codes, directory links, and dedicated conversion handoffs.
            </p>
            <div className="deployment-preview-actions">
              <a href={activeDeployment.bundle.hostedUrl} className="secondary">
                Open live page
              </a>
              <span className="portal-chip">{activeDeployment.entrypointPreset.label}</span>
            </div>
            <iframe
              src={activeDeployment.bundle.hostedUrl}
              title={`${activeDeployment.entrypointPreset.label} preview`}
              className="deployment-frame"
              loading="lazy"
            />
          </div>
        </DeploymentCodePreview>

        <DeploymentCodePreview
          eyebrow="Widget install"
          title="Preset-aware JavaScript embed"
          code={activeDeployment.bundle.widgetScript}
        >
          <div className="deployment-visual-card">
            <strong>Embedded widget behavior</strong>
            <p className="muted">
              This preview shows how the launcher will present itself on a client website before the drawer opens.
            </p>
            <div className="deployment-widget-preview">
              <div className="deployment-widget-shell">
                <p className="eyebrow">Client site preview</p>
                <h3>{activeDeployment.entrypointPreset.label}</h3>
                <p className="muted">{activeDeployment.widgetPreset.summary}</p>
                <div className="deployment-preview-actions">
                  <span className="portal-chip">{activeDeployment.widgetPreset.label}</span>
                  <span className="portal-chip">{activeDeployment.bundle.launcherLabel}</span>
                </div>
              </div>
              <button type="button" className="primary" disabled>
                {activeDeployment.bundle.launcherLabel}
              </button>
            </div>
          </div>
        </DeploymentCodePreview>

        <DeploymentCodePreview
          eyebrow="WordPress HTML block"
          title="Paste into Gutenberg or a custom HTML widget"
          code={activeDeployment.wordpressEmbedBlock}
        >
          <div className="deployment-visual-card">
            <strong>WordPress block result</strong>
            <p className="muted">
              Use this when the client site needs a paste-ready deployment inside a page builder or custom HTML block.
            </p>
            <div className="deployment-widget-shell">
              <p className="eyebrow">Placement</p>
              <h3>{activeDeployment.deploymentPattern?.label ?? activeDeployment.entrypointPreset.label}</h3>
              <ul className="check-list">
                <li>Paste into a Gutenberg custom HTML block.</li>
                <li>The script boots the matching LeadOS widget and launcher label automatically.</li>
                <li>Best for teams that want widget deployment without plugin installation.</li>
              </ul>
            </div>
          </div>
        </DeploymentCodePreview>

        <DeploymentCodePreview
          eyebrow="WordPress plugin file"
          title="Install a generated plugin instead of pasting snippets manually"
          code={wordpressPlugin.phpSource}
        >
          <div className="deployment-visual-card">
            <strong>Plugin package preview</strong>
            <p className="muted">
              This option is best when you want a reusable installable WordPress deployment instead of page-by-page snippet pasting.
            </p>
            <div className="portal-data-list">
              <div>
                <dt>Plugin file</dt>
                <dd>{wordpressPlugin.fileName}</dd>
              </div>
              <div>
                <dt>Shortcode</dt>
                <dd>{wordpressPlugin.shortcode}</dd>
              </div>
              <div>
                <dt>Download</dt>
                <dd className="portal-breakable">{wordpressPlugin.downloadPath}</dd>
              </div>
            </div>
          </div>
        </DeploymentCodePreview>

        <DeploymentCodePreview
          eyebrow="Iframe fallback"
          title="Full hosted-page embed"
          code={activeDeployment.bundle.iframeEmbed}
        >
          <div className="deployment-visual-card">
            <strong>Iframe embed result</strong>
            <p className="muted">
              Best when a client wants the full hosted LeadOS experience embedded instead of a widget launcher.
            </p>
            <iframe
              src={activeDeployment.bundle.hostedUrl}
              title={`${activeDeployment.entrypointPreset.label} iframe preview`}
              className="deployment-frame"
              loading="lazy"
            />
          </div>
        </DeploymentCodePreview>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">APIs</p>
          <h2>Use these endpoints in plugins and agency tooling</h2>
          <ul className="check-list">
            <li><strong>Generator endpoint</strong>: <span className="portal-breakable">{activeDeployment.generatorEndpoint}</span></li>
            <li><strong>Widget boot</strong>: <span className="portal-breakable">{activeDeployment.bundle.bootEndpoint}</span></li>
            <li><strong>Embed manifest</strong>: <span className="portal-breakable">{activeDeployment.bundle.manifestEndpoint}</span></li>
            <li><strong>WordPress plugin</strong>: <span className="portal-breakable">{wordpressPlugin.downloadPath}</span></li>
            <li><strong>WordPress shortcode</strong>: <span className="portal-breakable">{wordpressPlugin.shortcode}</span></li>
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
        <DeploymentCodePreview
          eyebrow="Bulk ZIP rollout"
          title="Generate many localized deployments at once"
          code={`${tenantConfig.siteUrl}/api/embed/generate-bulk?recipe=${recipe}&city=${encodeURIComponent(city)}&zips=${encodeURIComponent(bulkZipInput)}&limit=12

${tenantConfig.siteUrl}/api/embed/generate-bulk?recipe=${recipe}&city=${encodeURIComponent(city)}&zips=${encodeURIComponent(bulkZipInput)}&limit=12&format=csv`}
        >
          <div className="deployment-visual-card">
            <strong>Bulk rollout result</strong>
            <p className="muted">
              Use this when rolling out emergency or estimate widgets across many ZIP-level pages at once.
            </p>
            <div className="deployment-preview-actions">
              <span className="portal-chip">{bulkDeployment.count} generated packages</span>
              <span className="portal-chip">{city}</span>
            </div>
          </div>
        </DeploymentCodePreview>
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
