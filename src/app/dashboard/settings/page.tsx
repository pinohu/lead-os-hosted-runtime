import Link from "next/link";
import { RuntimeConfigForm } from "@/components/RuntimeConfigForm";
import {
  discoverDocumenteroTemplates,
  discoverTrafftServices,
  discoverTrafftTenant,
} from "@/lib/provider-discovery";
import {
  buildRuntimeConfigSummary,
  getOperationalRuntimeConfig,
} from "@/lib/runtime-config";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { tenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function RuntimeSettingsPage() {
  await requireOperatorPageSession("/dashboard/settings");
  const config = await getOperationalRuntimeConfig();
  const [templateCatalog, trafftTenant, trafftServices] = await Promise.all([
    discoverDocumenteroTemplates(),
    discoverTrafftTenant(),
    discoverTrafftServices(config.trafft.publicBookingUrl),
  ]);
  const summary = buildRuntimeConfigSummary(config);

  return (
    <main className="experience-page">
      <section className="experience-hero">
        <div className="hero-copy">
          <p className="eyebrow">Runtime settings</p>
          <h1>{tenantConfig.brandName} executable provider mappings</h1>
          <p className="lede">
            This is the operator-facing layer for non-secret provider configuration. Template IDs,
            service IDs, and fallback URLs live here so the runtime can become more executable
            without another code deploy.
          </p>
          <div className="cta-row">
            <Link href="/dashboard" className="secondary">
              Back to dashboard
            </Link>
            <Link href="/dashboard/providers" className="secondary">
              Provider health
            </Link>
          </div>
        </div>
        <aside className="hero-rail">
          <p className="eyebrow">Coverage summary</p>
          <ul className="journey-rail">
            <li>
              <strong>Trafft mappings</strong>
              <span>{summary.trafft.mappedServices}</span>
            </li>
            <li>
              <strong>Doc templates</strong>
              <span>
                {Number(summary.documentero.hasProposalTemplate) +
                  Number(summary.documentero.hasAgreementTemplate) +
                  Number(summary.documentero.hasOnboardingTemplate)}
              </span>
            </li>
            <li>
              <strong>Crove fallback</strong>
              <span>{summary.crove.hasWebhookUrl ? "Webhook ready" : "Needs webhook"}</span>
            </li>
          </ul>
        </aside>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Documentero discovery</p>
          <h2>Available templates detected from the account API</h2>
          {templateCatalog.length === 0 ? (
            <p className="muted">No account templates were discovered yet. If you only see the sample template in Documentero, create your real proposal/agreement/onboarding templates there first.</p>
          ) : (
            <ul className="check-list">
              {templateCatalog.map((template) => (
                <li key={template.value}>
                  {template.label}: {template.value}
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel">
          <p className="eyebrow">Trafft discovery</p>
          <h2>Booking tenant visibility</h2>
          {trafftTenant ? (
            <ul className="check-list">
              <li>Tenant name: {trafftTenant.tenantName ?? "Unknown"}</li>
              <li>Tenant id: {trafftTenant.tenantId ?? "Unknown"}</li>
              <li>Detected services: {trafftServices.length}</li>
              <li>Note: service IDs still need to be mapped before LeadOS can auto-resolve public slot lookups consistently.</li>
            </ul>
          ) : (
            <div className="stack-grid">
              <p className="muted">Trafft tenant data could not be read from the runtime right now.</p>
              <p className="muted">
                {trafftServices.length > 0
                  ? `LeadOS still detected ${trafftServices.length} service${trafftServices.length === 1 ? "" : "s"} from the connected booking origin, so you can continue mapping them below.`
                  : "If the tenant lookup is locked down, add or verify the Trafft API URL, public booking URL, and auth credentials first."}
              </p>
            </div>
          )}
        </article>
      </section>

      <RuntimeConfigForm initialConfig={config} trafftServices={trafftServices} />
    </main>
  );
}
