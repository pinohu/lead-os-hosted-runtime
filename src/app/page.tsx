import Link from "next/link";
import { PlumbingEntryPage } from "@/components/PlumbingEntryPage";
import { getMarketplaceEntrypointLinks, getPlumbingEntrypoint } from "@/lib/plumbing-entrypoints";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = (await searchParams) ?? {};

  return (
    <>
      <PlumbingEntryPage entry={getPlumbingEntrypoint("marketplace-home")} searchParams={params} />
      <section className="grid two entry-hub-section">
        <article className="panel">
          <p className="eyebrow">Start with the right customer path</p>
          <h2>Homeowner and tenant journeys should not all feel the same</h2>
          <div className="entry-link-grid">
            {getMarketplaceEntrypointLinks().slice(0, 3).map((link) => (
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
          </div>
        </article>
      </section>
    </>
  );
}
