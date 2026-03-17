import { headers } from "next/headers";
import Link from "next/link";
import { getNiche } from "@/lib/catalog";
import { getEndUserFunnel, type EndUserFunnelDefinition } from "@/lib/end-user-funnels";
import { EXPERIENCE_ASSIGNMENT_HEADER } from "@/lib/experiments";
import { resolveExperienceProfile } from "@/lib/experience";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
import { tenantConfig } from "@/lib/tenant";
import { PublicLeadCaptureForm } from "@/components/PublicLeadCaptureForm";

type PublicEndUserFunnelPageProps = {
  funnel: EndUserFunnelDefinition;
  searchParams?: Record<string, string | string[] | undefined>;
};

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function PublicEndUserFunnelPage({
  funnel,
  searchParams = {},
}: PublicEndUserFunnelPageProps) {
  const niche = getNiche("plumbing");
  const headerStore = await headers();
  const runtimeConfig = await getOperationalRuntimeConfig();

  const profile = resolveExperienceProfile({
    family: funnel.family,
    niche,
    audience: funnel.audience,
    supportEmail: tenantConfig.supportEmail,
    source: asString(searchParams.source) ?? "public-live",
    intent: funnel.intent,
    preferredMode: asString(searchParams.mode) ?? funnel.preferredMode,
    assignmentKey: headerStore.get(EXPERIENCE_ASSIGNMENT_HEADER) ?? undefined,
    userAgent: headerStore.get("user-agent") ?? undefined,
    referrer: headerStore.get("referer") ?? undefined,
    experimentPromotions: runtimeConfig.experiments.promotions,
    score: funnel.audience === "provider" ? 60 : 82,
  });

  return (
    <main className={`public-funnel public-funnel--${funnel.kind}`}>
      <section className="public-funnel__hero">
        <div className="public-funnel__copy">
          <p className="eyebrow">{funnel.eyebrow}</p>
          <h1>{funnel.title}</h1>
          <p className="public-funnel__lede">{funnel.summary}</p>
          <div className="public-funnel__pill-row" aria-label="Highlights">
            {funnel.heroPills.map((pill) => (
              <span key={pill} className="public-funnel__pill">
                {pill}
              </span>
            ))}
          </div>
          <div className="cta-row">
            <a href={funnel.primaryHref} className="primary">
              {funnel.primaryLabel}
            </a>
            <Link href={funnel.secondaryHref} className="secondary">
              {funnel.secondaryLabel}
            </Link>
          </div>
        </div>
        <aside className="public-funnel__aside">
          <p className="eyebrow">Why people choose this path</p>
          <ul className="public-funnel__trust-list">
            {funnel.trustStrip.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </section>

      {funnel.sections.map((section) => (
        <section key={section.title} className="public-funnel__section">
          <article className="panel public-funnel__section-lead">
            <p className="eyebrow">{section.eyebrow}</p>
            <h2>{section.title}</h2>
          </article>
          <div className="public-funnel__card-grid">
            {section.items.map((item) => (
              <article key={item.title} className="public-funnel__card">
                <h3>{item.title}</h3>
                <p className="muted">{item.detail}</p>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="public-funnel__section">
        <article className="panel public-funnel__section-lead">
          <p className="eyebrow">Other paths</p>
          <h2>Need a different route?</h2>
        </article>
        <div className="public-funnel__link-grid">
          {funnel.relatedLinks.map((link) => (
            <Link key={link.href} href={link.href} className="public-funnel__link-card">
              <strong>{link.label}</strong>
              <span>{link.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="public-funnel__section">
        <article className="panel public-funnel__section-lead">
          <p className="eyebrow">Common questions</p>
          <h2>Before you start</h2>
        </article>
        <div className="public-funnel__faq-grid">
          {funnel.faq.map((item) => (
            <article key={item.question} className="public-funnel__faq-card">
              <h3>{item.question}</h3>
              <p className="muted">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <PublicLeadCaptureForm
        source="manual"
        family={profile.family}
        niche={niche.slug}
        service={funnel.service}
        pagePath={funnel.route}
        profile={profile}
        audience={funnel.audience}
        variant={funnel.audience === "provider" ? "provider" : "customer"}
        stickyLabel={funnel.primaryLabel}
      />

      <div className="public-mobile-bar">
        <a href="#capture-form" className="primary">
          {funnel.stickyLabel}
        </a>
      </div>
    </main>
  );
}

export { getEndUserFunnel };
