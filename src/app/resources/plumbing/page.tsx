import Link from "next/link";
import { getTrustAssetModules } from "@/lib/trust-assets";

const sections = [
  {
    kind: "emergency" as const,
    eyebrow: "Emergency trust assets",
    title: "Fast-decision tools for urgent plumbing demand",
    summary:
      "These assets help urgent visitors recognize the right path, understand what happens next, and keep moving even if they are stressed or unsure.",
  },
  {
    kind: "estimate" as const,
    eyebrow: "Estimate trust assets",
    title: "Decision support for planned plumbing work",
    summary:
      "These assets help estimate shoppers compare, understand the quote process, and progress without being forced into emergency-style urgency.",
  },
  {
    kind: "commercial" as const,
    eyebrow: "Commercial trust assets",
    title: "Structured assets for property and facilities buyers",
    summary:
      "These assets reduce friction for more complex requests by clarifying service paths, coordination expectations, and commercial operating context.",
  },
  {
    kind: "provider" as const,
    eyebrow: "Provider trust assets",
    title: "Recruiting and qualification support for better providers",
    summary:
      "These assets help serious plumbers decide whether the network fits their territory, issue mix, standards, and dispatch readiness.",
  },
];

export default function PlumbingResourcesPage() {
  return (
    <main className="experience-page">
      <section className="experience-hero">
        <div className="hero-copy">
          <p className="eyebrow">Public resource hub</p>
          <h1>Trust-building tools and guides for every plumbing funnel</h1>
          <p className="lede">
            These assets support the public funnels before, during, and after the main CTA. They are designed to keep momentum alive when a visitor needs more clarity before committing.
          </p>
          <div className="hero-highlight-row">
            <span className="hero-highlight">Diagnostic assets</span>
            <span className="hero-highlight">Decision tools</span>
            <span className="hero-highlight">Trust and process guides</span>
          </div>
          <div className="cta-row">
            <Link href="/get-plumbing-help" className="primary">
              Start with plumbing help
            </Link>
            <Link href="/showroom/plumbing" className="secondary">
              Open public showroom
            </Link>
          </div>
        </div>
        <aside className="hero-rail">
          <p className="eyebrow">How this hub helps</p>
          <ul className="journey-rail">
            <li>
              <strong>Reduce middle-funnel drop-off</strong>
              <span>Give unsure visitors a lighter next step instead of letting them bounce.</span>
            </li>
            <li>
              <strong>Support different buying modes</strong>
              <span>Urgent, planned, commercial, and provider traffic all need different kinds of reassurance.</span>
            </li>
            <li>
              <strong>Keep trust close to the ask</strong>
              <span>Every asset here is meant to make the next conversion step easier and more credible.</span>
            </li>
          </ul>
        </aside>
      </section>

      {sections.map((section) => {
        const modules = getTrustAssetModules(section.kind);
        return (
          <section key={section.kind} className="panel">
            <p className="eyebrow">{section.eyebrow}</p>
            <h2>{section.title}</h2>
            <p className="muted">{section.summary}</p>
            <div className="trust-assets__grid">
              {modules.map((module) => (
                <article key={`${section.kind}-${module.title}`} className="trust-assets__card">
                  <p className="eyebrow">{module.category}</p>
                  <h3>{module.title}</h3>
                  <p className="muted">{module.promise}</p>
                  <div className="cta-row">
                    <Link href={module.href} className="secondary">
                      {module.ctaLabel}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Trust checklist</p>
          <h2>What every public asset should communicate</h2>
          <ul className="check-list">
            <li>Clear promise in the first screen.</li>
            <li>Specific audience fit and situation recognition.</li>
            <li>Visible proof or process clarity near the next ask.</li>
            <li>Transparent next-step explanation.</li>
            <li>Safe fallback when the first path is not right.</li>
          </ul>
        </article>
        <article className="panel">
          <p className="eyebrow">Next public surfaces</p>
          <h2>Where these assets fit into the live system</h2>
          <div className="cta-row">
            <Link href="/plumbing/emergency" className="secondary">
              Emergency funnel
            </Link>
            <Link href="/plumbing/estimate" className="secondary">
              Estimate funnel
            </Link>
            <Link href="/plumbing/commercial" className="secondary">
              Commercial funnel
            </Link>
            <Link href="/join-provider-network" className="secondary">
              Provider funnel
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
