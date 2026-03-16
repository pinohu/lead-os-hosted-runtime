import Link from "next/link";
import type { ReactNode } from "react";
import type { ExperienceProfile } from "@/lib/experience";

type ExperienceMetric = {
  label: string;
  value: string;
  detail?: string;
};

type ExperienceScaffoldProps = {
  className?: string;
  eyebrow: string;
  title: string;
  summary: string;
  profile: ExperienceProfile;
  metrics: ExperienceMetric[];
  heroSignals?: string[];
  audienceLabel?: string;
  commitmentNote?: string;
  children: ReactNode;
  primaryActionHref?: string;
  primaryActionLabel?: string;
  secondaryActionHref?: string;
  secondaryActionLabel?: string;
  railEyebrow?: string;
  railTitle?: string;
  railSummary?: string;
};

export function ExperienceScaffold({
  className,
  eyebrow,
  title,
  summary,
  profile,
  metrics,
  heroSignals = [],
  audienceLabel,
  commitmentNote,
  children,
  primaryActionHref,
  primaryActionLabel,
  secondaryActionHref,
  secondaryActionLabel,
  railEyebrow,
  railTitle,
  railSummary,
}: ExperienceScaffoldProps) {
  return (
    <main className={`experience-page${className ? ` ${className}` : ""}`}>
      <section className="experience-hero">
        <div className="hero-copy">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="lede">{summary}</p>
          {audienceLabel ? <p className="hero-audience">{audienceLabel}</p> : null}
          <p className="muted hero-support">{profile.trustPromise}</p>
          {heroSignals.length > 0 ? (
            <div className="hero-highlight-row" aria-label="Why this path converts">
              {heroSignals.map((signal) => (
                <span key={signal} className="hero-highlight">
                  {signal}
                </span>
              ))}
            </div>
          ) : null}
          <div className="cta-row">
            <Link href={primaryActionHref ?? "#capture-form"} className="primary">
              {primaryActionLabel ?? profile.primaryActionLabel}
            </Link>
            <a href={secondaryActionHref ?? profile.secondaryActionHref} className="secondary">
              {secondaryActionLabel ?? profile.secondaryActionLabel}
            </a>
          </div>
        </div>

        <aside className="hero-rail" aria-label="Experience summary">
          <p className="eyebrow">{railEyebrow ?? "What this page is designed to do"}</p>
          <h2>{railTitle ?? profile.heroTitle}</h2>
          <p className="muted">{railSummary ?? profile.heroSummary}</p>
          {commitmentNote ? <p className="trust-copy">{commitmentNote}</p> : null}
          <p className="trust-copy">{profile.progressLabel}</p>
          <ul className="journey-rail">
            {profile.progressSteps.map((step) => (
              <li key={step.label}>
                <strong>{step.label}</strong>
                <span>{step.detail}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="proof-ribbon" aria-label="Trust signals">
        {profile.proofSignals.map((signal) => (
          <article key={signal} className="proof-card">
            <h2>{signal}</h2>
          </article>
        ))}
      </section>

      <section className="metric-grid" aria-label="Snapshot">
        {metrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <p className="eyebrow">{metric.label}</p>
            <h2>{metric.value}</h2>
            {metric.detail ? <p className="muted">{metric.detail}</p> : null}
          </article>
        ))}
      </section>

      <section className="insight-grid">
        <article className="panel">
          <p className="eyebrow">What makes this usable</p>
          <h2>Built to reduce friction before it appears</h2>
          <ul className="check-list">
            {profile.supportingSignals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </article>
        <article className="panel">
          <p className="eyebrow">Anxiety reduction</p>
          <h2>Clear next steps, easy exits, human fallback</h2>
          <p className="muted">{profile.anxietyReducer}</p>
          <div className="objection-stack">
            {profile.objectionBlocks.map((objection) => (
              <p key={objection}>{objection}</p>
            ))}
          </div>
        </article>
      </section>

      <div className="experience-main">{children}</div>

      <div className="mobile-action-bar" role="complementary" aria-label="Sticky next action">
        <Link href={primaryActionHref ?? "#capture-form"} className="primary">
          {primaryActionLabel ?? profile.primaryActionLabel}
        </Link>
        <p>{profile.returnOffer}</p>
      </div>
    </main>
  );
}
