import Link from "next/link";
import type { ReactNode } from "react";
import type { ExperienceProfile } from "@/lib/experience";

type ExperienceMetric = {
  label: string;
  value: string;
  detail?: string;
};

type ExperienceScaffoldProps = {
  eyebrow: string;
  title: string;
  summary: string;
  profile: ExperienceProfile;
  metrics: ExperienceMetric[];
  children: ReactNode;
  primaryActionHref?: string;
  primaryActionLabel?: string;
  secondaryActionHref?: string;
  secondaryActionLabel?: string;
};

export function ExperienceScaffold({
  eyebrow,
  title,
  summary,
  profile,
  metrics,
  children,
  primaryActionHref,
  primaryActionLabel,
  secondaryActionHref,
  secondaryActionLabel,
}: ExperienceScaffoldProps) {
  return (
    <main className="experience-page">
      <section className="experience-hero">
        <div className="hero-copy">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="lede">{summary}</p>
          <p className="muted hero-support">{profile.trustPromise}</p>
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
          <div className="signal-chip-row">
            <span className="signal-chip">{profile.audience === "provider" ? "provider path" : "client path"}</span>
            <span className="signal-chip">{profile.mode.replace("-", " ")}</span>
            <span className="signal-chip">{profile.device}</span>
            <span className="signal-chip">{profile.family}</span>
          </div>
          <h2>{profile.heroTitle}</h2>
          <p className="muted">{profile.heroSummary}</p>
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
