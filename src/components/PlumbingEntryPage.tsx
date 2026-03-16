import { headers } from "next/headers";
import Link from "next/link";
import { AdaptiveLeadCaptureForm } from "@/components/AdaptiveLeadCaptureForm";
import { ExperienceScaffold } from "@/components/ExperienceScaffold";
import {
  buildPlumbingIntegrationBundle,
  type PlumbingEntrypointDefinition,
} from "@/lib/plumbing-entrypoints";
import { getNiche } from "@/lib/catalog";
import { EXPERIENCE_ASSIGNMENT_HEADER } from "@/lib/experiments";
import { resolveExperienceProfile } from "@/lib/experience";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
import { tenantConfig } from "@/lib/tenant";

type PlumbingEntryPageProps = {
  entry: PlumbingEntrypointDefinition;
  searchParams?: Record<string, string | string[] | undefined>;
};

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function asBoolean(value: string | string[] | undefined) {
  const normalized = asString(value)?.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function buildPublicMetrics(entry: PlumbingEntrypointDefinition) {
  if (entry.audience === "provider") {
    return [
      {
        label: "Job quality",
        value: "Better-fit work",
        detail: "Service area, specialty, and readiness matter before jobs are routed.",
      },
      {
        label: "Setup style",
        value: "Short and practical",
        detail: "The first step focuses on coverage, emergency availability, and the kinds of jobs you want.",
      },
      {
        label: "Best outcome",
        value: "More relevant leads",
        detail: "Good provider pages should feel selective, operational, and worth completing.",
      },
    ];
  }

  if (entry.kind === "emergency") {
    return [
      {
        label: "Speed",
        value: "Fast path",
        detail: "Urgent visitors should be able to act quickly without a long quote form.",
      },
      {
        label: "Contact",
        value: "Phone-first",
        detail: "The page keeps the best contact path obvious when timing matters most.",
      },
      {
        label: "Fallback",
        value: "Human help",
        detail: "If the issue is unusual, a dispatch-style fallback stays visible.",
      },
    ];
  }

  if (entry.kind === "estimate") {
    return [
      {
        label: "Pressure",
        value: "Lower-pressure flow",
        detail: "Planned jobs should feel calm, useful, and easy to continue.",
      },
      {
        label: "Detail level",
        value: "Only what is needed",
        detail: "The page asks for enough context to move forward, not everything at once.",
      },
      {
        label: "Best outcome",
        value: "Better estimate requests",
        detail: "Comparison-minded visitors get a cleaner route to the next step.",
      },
    ];
  }

  if (entry.kind === "commercial") {
    return [
      {
        label: "Language",
        value: "Commercial-safe",
        detail: "Property and facilities teams should not feel like they landed on a homeowner emergency page.",
      },
      {
        label: "Intake",
        value: "Structured request",
        detail: "The flow leaves room for site, building, and coordination context.",
      },
      {
        label: "Best outcome",
        value: "Qualified service requests",
        detail: "Commercial buyers should know what happens next and what kind of request they are making.",
      },
    ];
  }

  if (entry.kind === "local") {
    return [
      {
        label: "Local feel",
        value: "ZIP-specific",
        detail: "Local visitors should see their area reflected before they commit.",
      },
      {
        label: "Intent fit",
        value: "Urgent or planned",
        detail: "Search traffic can split into emergency, estimate, or commercial help without friction.",
      },
      {
        label: "Best outcome",
        value: "Less bounce",
        detail: "Local relevance and a clear next step keep geo pages from feeling generic.",
      },
    ];
  }

  return [
    {
      label: "Clarity",
      value: "Right path first",
      detail: "Visitors should know where to go without guessing whether this is urgent, planned, or commercial.",
    },
    {
      label: "Effort",
      value: "Short first step",
      detail: "The page should reduce decision effort before it asks for much information.",
    },
    {
      label: "Best outcome",
      value: "Clear next step",
      detail: "People convert better when the next action feels obvious, local, and credible.",
    },
  ];
}

export async function PlumbingEntryPage({ entry, searchParams = {} }: PlumbingEntryPageProps) {
  const niche = getNiche("plumbing");
  const headerStore = await headers();
  const runtimeConfig = await getOperationalRuntimeConfig();

  const profile = resolveExperienceProfile({
    family: entry.family,
    niche,
    audience: entry.audience,
    supportEmail: tenantConfig.supportEmail,
    source: asString(searchParams.source) ?? "manual",
    intent: entry.intent,
    returning: asBoolean(searchParams.returning),
    milestone: asString(searchParams.milestone),
    preferredMode: asString(searchParams.mode) ?? entry.preferredMode,
    score: Number(asString(searchParams.score) ?? (entry.audience === "provider" ? 55 : 80)),
    assignmentKey: headerStore.get(EXPERIENCE_ASSIGNMENT_HEADER) ?? undefined,
    userAgent: headerStore.get("user-agent") ?? undefined,
    referrer: headerStore.get("referer") ?? undefined,
    experimentPromotions: runtimeConfig.experiments.promotions,
  });

  const integrations = buildPlumbingIntegrationBundle(entry, tenantConfig.siteUrl);
  const showBlueprint = asBoolean(searchParams.blueprint) || asString(searchParams.view) === "blueprint";
  const metrics = buildPublicMetrics(entry);

  const splitLink =
    entry.audience === "provider"
      ? {
          href: "/get-plumbing-help",
          label: "Need plumbing help instead?",
          description:
            "Use the customer-side path for homeowners, tenants, and commercial buyers who need service.",
          cta: "Go to plumbing help",
        }
      : {
          href: "/join-provider-network",
          label: "Need the provider side instead?",
          description:
            "Use the provider path if you are a plumber or service company interested in joining the network.",
          cta: "Go to provider onboarding",
        };

  return (
    <ExperienceScaffold
      eyebrow={entry.eyebrow}
      title={entry.title}
      summary={entry.summary}
      profile={profile}
      metrics={metrics}
      heroSignals={entry.heroHighlights}
      audienceLabel={entry.audienceLabel}
      commitmentNote={entry.commitmentNote}
    >
      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">{entry.chipsLabel}</p>
          <h2>{entry.audience === "provider" ? "What serious providers should recognize quickly" : "What people usually need help with here"}</h2>
          <p className="muted">{entry.commitmentNote}</p>
          <div className="signal-pill-grid" aria-label={entry.chipsLabel}>
            {entry.chips.map((chip) => (
              <span key={chip} className="signal-pill">
                {chip}
              </span>
            ))}
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">Need something else?</p>
          <h2>{splitLink.label}</h2>
          <p className="muted">{splitLink.description}</p>
          <div className="cta-row">
            <Link href={splitLink.href} className="secondary">
              {splitLink.cta}
            </Link>
          </div>
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Why people choose this path</p>
          <h2>{entry.audience === "provider" ? "Built for the way plumbing teams actually work" : "Built to feel clear and easy to act on"}</h2>
          <div className="value-card-grid">
            {entry.valueCards.map((card) => (
              <article key={card.title} className="value-card">
                <h3>{card.title}</h3>
                <p className="muted">{card.detail}</p>
              </article>
            ))}
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">{entry.pathLabel}</p>
          <h2>What happens after you start</h2>
          <ol className="step-list">
            {entry.pathSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">{entry.trustLabel}</p>
          <h2>{entry.audience === "provider" ? "Why this feels worth your time" : "Why people feel comfortable moving forward"}</h2>
          <ul className="check-list">
            {entry.trustSignals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </article>
        <article className="panel">
          <p className="eyebrow">Questions we hear a lot</p>
          <h2>{entry.audience === "provider" ? "Answers before you decide to apply" : "Answers before you decide to reach out"}</h2>
          <div className="faq-stack">
            {entry.faq.map((item) => (
              <article key={item.question} className="faq-card">
                <h3>{item.question}</h3>
                <p className="muted">{item.answer}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">{entry.proofLabel}</p>
          <h2>{entry.audience === "provider" ? "Looking for the customer side instead?" : "Looking for a different kind of plumbing help?"}</h2>
          <div className="entry-link-grid">
            {entry.relatedLinks.map((link) => (
              <Link key={link.href} href={link.href} className="entry-link-card">
                <strong>{link.label}</strong>
                <span>{link.description}</span>
              </Link>
            ))}
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">What to expect</p>
          <h2>{entry.audience === "provider" ? "What this path is designed to make easier" : "What this page is designed to make easier"}</h2>
          <ul className="check-list">
            {entry.proofSignals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </article>
      </section>

      <AdaptiveLeadCaptureForm
        source="manual"
        family={profile.family}
        niche={niche.slug}
        service={entry.service}
        pagePath={entry.route}
        returning={asBoolean(searchParams.returning)}
        profile={profile}
      />

      {showBlueprint ? (
        <section className="grid two">
          <article className="panel">
            <p className="eyebrow">Hosted deployment</p>
            <h2>Direct link for this entry point</h2>
            <p className="muted">
              Use this URL for buttons, ads, email, SMS, QR flows, directory listings, or a dedicated subdomain handoff.
            </p>
            <div className="code-card">
              <pre><code>{integrations.hostedUrl}</code></pre>
            </div>
          </article>
          <article className="panel">
            <p className="eyebrow">Embed deployment</p>
            <h2>Widget install code for client websites</h2>
            <p className="muted">
              This script launches the matching LeadOS widget for this exact entry path and service intent.
            </p>
            <div className="code-card">
              <pre><code>{integrations.widgetScript}</code></pre>
            </div>
          </article>
          <article className="panel">
            <p className="eyebrow">Iframe handoff</p>
            <h2>Embedded hosted-page fallback</h2>
            <p className="muted">
              Use this when a client wants the full hosted page embedded instead of the drawer widget.
            </p>
            <div className="code-card">
              <pre><code>{integrations.iframeEmbed}</code></pre>
            </div>
          </article>
          <article className="panel">
            <p className="eyebrow">Integration endpoints</p>
            <h2>Boot and manifest endpoints</h2>
            <ul className="check-list">
              <li><strong>Widget boot</strong>: <span className="portal-breakable">{integrations.bootEndpoint}</span></li>
              <li><strong>Embed manifest</strong>: <span className="portal-breakable">{integrations.manifestEndpoint}</span></li>
              <li><strong>Launcher label</strong>: {integrations.launcherLabel}</li>
              <li><strong>Deployment blueprint</strong>: <Link href="/deployments/plumbing" className="link-inline">Open generator page</Link></li>
            </ul>
          </article>
        </section>
      ) : null}
    </ExperienceScaffold>
  );
}
