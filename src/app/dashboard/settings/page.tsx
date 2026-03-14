import Link from "next/link";
import { RuntimeConfigForm } from "@/components/RuntimeConfigForm";
import {
  buildRuntimeConfigSummary,
  getOperationalRuntimeConfig,
} from "@/lib/runtime-config";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { tenantConfig } from "@/lib/tenant";

export default async function RuntimeSettingsPage() {
  await requireOperatorPageSession("/dashboard/settings");
  const config = await getOperationalRuntimeConfig();
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

      <RuntimeConfigForm initialConfig={config} />
    </main>
  );
}
