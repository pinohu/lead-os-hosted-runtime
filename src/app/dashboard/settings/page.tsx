import Link from "next/link";
import { GrowthStackVerificationPanel } from "@/components/GrowthStackVerificationPanel";
import { GrowthStackSettingsForm } from "@/components/GrowthStackSettingsForm";
import { RuntimeConfigForm } from "@/components/RuntimeConfigForm";
import { buildGrowthStackHealth } from "@/lib/growth-integrations";
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
import { formatCurrency } from "@/lib/operator-ui";
import { tenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function RuntimeSettingsPage() {
  const session = await requireOperatorPageSession("/dashboard/settings", { allowedRoles: ["admin"] });
  const config = await getOperationalRuntimeConfig();
  const [templateCatalog, trafftTenant, trafftServices] = await Promise.all([
    discoverDocumenteroTemplates(),
    discoverTrafftTenant(),
    discoverTrafftServices(config.trafft.publicBookingUrl),
  ]);
  const summary = buildRuntimeConfigSummary(config);
  const growthHealth = buildGrowthStackHealth(config);

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
          <p className="muted">Role: {session.role}</p>
          <div className="cta-row">
            <Link href="/dashboard" className="secondary">
              Back to dashboard
            </Link>
            <Link href="/dashboard/growth" className="secondary">
              Growth ops
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
              <strong>Alert recipients</strong>
              <span>{summary.observability.activeRecipients}</span>
            </li>
            <li>
              <strong>Trafft mappings</strong>
              <span>{summary.trafft.mappedServices}</span>
            </li>
            <li>
              <strong>Alert cooldown</strong>
              <span>{summary.observability.cooldownMinutes}m</span>
            </li>
            <li>
              <strong>Dispatch providers</strong>
              <span>{summary.dispatch.providerCount}</span>
            </li>
            <li>
              <strong>Emergency ready</strong>
              <span>{summary.dispatch.emergencyReadyProviders}</span>
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
              <strong>ZIP CAC overrides</strong>
              <span>{summary.marketplace.zipCostOverrides}</span>
            </li>
            <li>
              <strong>Crove fallback</strong>
              <span>{summary.crove.hasWebhookUrl ? "Webhook ready" : "Needs webhook"}</span>
            </li>
            <li>
              <strong>Call tracking</strong>
              <span>{summary.callScaler.hasWebhookUrl ? "Webhook ready" : "Needs webhook"}</span>
            </li>
            <li>
              <strong>Behavior scoring</strong>
              <span>{summary.salespanel.enabled ? "Enabled" : "Disabled"}</span>
            </li>
            <li>
              <strong>CRO layer</strong>
              <span>{summary.plerdy.enabled ? "Enabled" : "Disabled"}</span>
            </li>
          </ul>
        </aside>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Observability paging</p>
          <h2>Alert delivery routing</h2>
          <ul className="check-list">
            <li>Default alert channel: {summary.observability.defaultChannel}</li>
            <li>Cooldown minutes: {summary.observability.cooldownMinutes}</li>
            <li>Active recipients: {summary.observability.activeRecipients}</li>
            <li>Email recipients: {summary.observability.emailRecipients}</li>
            <li>SMS recipients: {summary.observability.smsRecipients}</li>
            <li>WhatsApp recipients: {summary.observability.whatsappRecipients}</li>
          </ul>
        </article>

        <article className="panel">
          <p className="eyebrow">Dispatch discovery</p>
          <h2>Capacity-aware plumbing roster</h2>
          <ul className="check-list">
            <li>Configured providers: {summary.dispatch.providerCount}</li>
            <li>Active providers: {summary.dispatch.activeProviders}</li>
            <li>Emergency-ready providers: {summary.dispatch.emergencyReadyProviders}</li>
            <li>Payout-configured providers: {summary.dispatch.payoutConfiguredProviders}</li>
            <li>Default lead acquisition cost: {formatCurrency(summary.marketplace.defaultLeadAcquisitionCost)}</li>
            <li>Use the dispatch roster below to model metro coverage, issue fit, and live capacity before routing jobs.</li>
          </ul>
        </article>

        <article className="panel">
          <p className="eyebrow">Marketplace finance</p>
          <h2>Acquisition and payout policy</h2>
          <ul className="check-list">
            <li>Default lead acquisition cost: {formatCurrency(summary.marketplace.defaultLeadAcquisitionCost)}</li>
            <li>ZIP acquisition overrides: {summary.marketplace.zipCostOverrides}</li>
            <li>Payout-configured providers: {summary.dispatch.payoutConfiguredProviders}</li>
            <li>Use ZIP overrides where paid acquisition cost materially differs by market cell.</li>
            <li>Use flat-fee payouts for stable simple jobs and revenue-share where average ticket size varies heavily.</li>
          </ul>
        </article>

        <article className="panel">
          <p className="eyebrow">Growth stack</p>
          <h2>Attribution, CRO, and referral control</h2>
          <ul className="check-list">
            <li>SuiteDash portal URL: {summary.suiteDash.hasPortalUrl ? "Configured" : "Missing"}</li>
            <li>Primary SMS provider: {summary.messaging.primarySmsProvider}</li>
            <li>Fallback SMS provider: {summary.messaging.fallbackSmsProvider}</li>
            <li>CallScaler dynamic numbers: {summary.callScaler.trackingNumbers}</li>
            <li>Salespanel tracking: {summary.salespanel.enabled ? "Enabled" : "Disabled"}</li>
            <li>Plerdy CRO: {summary.plerdy.enabled ? "Enabled" : "Disabled"}</li>
            <li>Partnero auto-enroll stage: {summary.partnero.autoEnrollStage}</li>
            <li>Thoughtly callback window: {summary.thoughtly.callbackWindowMinutes}m</li>
          </ul>
        </article>

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

      <section className="stack-grid">
        <article className="panel">
          <p className="eyebrow">Growth stack settings</p>
          <h2>Configure attribution, CRO, referral, and voice recovery</h2>
          <p className="muted">
            These non-secret settings let LeadOS activate CallScaler, Salespanel, Plerdy, Partnero,
            Thoughtly, and CRM billing preferences without another deploy.
          </p>
        </article>
        <GrowthStackSettingsForm initialConfig={config} />
      </section>

      <GrowthStackVerificationPanel initialHealth={growthHealth} />

      <RuntimeConfigForm initialConfig={config} trafftServices={trafftServices} />
    </main>
  );
}
