import Link from "next/link";
import { PlumbingEntryPage } from "@/components/PlumbingEntryPage";
import { getMarketplaceEntrypointLinks, getPlumbingEntrypoint } from "@/lib/plumbing-entrypoints";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = (await searchParams) ?? {};
  const customerPaths = getMarketplaceEntrypointLinks().slice(0, 3);

  return (
    <>
      <PlumbingEntryPage entry={getPlumbingEntrypoint("marketplace-home")} searchParams={params} />
      <section className="homepage-story-band">
        <article className="panel homepage-story-card homepage-story-card--wide">
          <p className="eyebrow">Why this homepage works</p>
          <h2>A five-star service homepage should feel like a calm guide, not a giant form</h2>
          <p className="muted">
            The first job of the homepage is not to explain software. It is to help the visitor recognize their situation quickly and move into the right path with confidence.
          </p>
        </article>
        <article className="homepage-story-card">
          <p className="eyebrow">For urgent demand</p>
          <h3>Fast recognition</h3>
          <p className="muted">Active leaks and other urgent issues need a clear "help now" route without extra thinking.</p>
        </article>
        <article className="homepage-story-card">
          <p className="eyebrow">For planned work</p>
          <h3>Calmer quote path</h3>
          <p className="muted">Estimate shoppers should not feel pushed through emergency-style friction or language.</p>
        </article>
        <article className="homepage-story-card">
          <p className="eyebrow">For providers</p>
          <h3>Separate recruiting lane</h3>
          <p className="muted">Serious plumbers should see an opportunity page, not a customer-help page with a signup link tucked inside it.</p>
        </article>
      </section>

      <section className="grid two entry-hub-section">
        <article className="panel">
          <p className="eyebrow">Start with the right customer path</p>
          <h2>Homeowner and tenant journeys should not all feel the same</h2>
          <div className="entry-link-grid">
            {customerPaths.map((link) => (
              <Link key={link.href} href={link.href} className="entry-link-card">
                <strong>{link.label}</strong>
                <span>{link.description}</span>
              </Link>
            ))}
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">Marketplace scale</p>
          <h2>Built for thousands of providers and customers across ZIP cells</h2>
          <ul className="check-list">
            <li>ZIP-aware local pages can act as search-intent entry points without collapsing into a generic national directory.</li>
            <li>Supply and demand enter through separate funnels, then meet through routing, booking, and dispatch logic.</li>
            <li>The public landing system can grow into a real marketplace surface instead of a single plumbing form.</li>
          </ul>
          <div className="cta-row">
            <Link href="/deployments/plumbing" className="secondary">
              Open deployment blueprint
            </Link>
            <Link href="/showroom/plumbing" className="secondary">
              Open public showroom
            </Link>
          </div>
        </article>
      </section>

      <section className="homepage-mosaic">
        <article className="panel homepage-mosaic__lead">
          <p className="eyebrow">Real public assets</p>
          <h2>Each path should feel like its own landing experience, not a reused shell</h2>
          <p className="muted">
            Emergency, estimate, commercial, local, and provider funnels now each have their own conversion support, emotional pacing, and proof structure.
          </p>
        </article>
        <article className="homepage-mosaic__card">
          <p className="eyebrow">Emergency</p>
          <h3>Urgency and reassurance</h3>
          <p className="muted">Short path, clear fallback, and stronger mobile action behavior.</p>
        </article>
        <article className="homepage-mosaic__card">
          <p className="eyebrow">Estimate</p>
          <h3>Comparison-friendly</h3>
          <p className="muted">Project-type context, quote expectations, and lighter pressure.</p>
        </article>
        <article className="homepage-mosaic__card">
          <p className="eyebrow">Commercial</p>
          <h3>Operationally credible</h3>
          <p className="muted">Property-aware intake and service-desk language for serious buyers.</p>
        </article>
        <article className="homepage-mosaic__card">
          <p className="eyebrow">Provider</p>
          <h3>Selective recruiting</h3>
          <p className="muted">Territory, readiness, and opportunity quality instead of generic signup copy.</p>
        </article>
      </section>
    </>
  );
}
