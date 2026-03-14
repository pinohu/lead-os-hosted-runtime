import { getNiche } from "@/lib/catalog";

export default async function OfferPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const niche = getNiche(slug);

  return (
    <main>
      <section className="panel">
        <p className="eyebrow">Hosted Offer</p>
        <h1>{niche.label} Offer Path</h1>
        <p className="muted">{niche.summary}</p>
        <ul>
          <li>Primary checkout engine: ThriveCart</li>
          <li>Recovery path: cart recovery, coupon rescue, and upsell ladder</li>
          <li>Post-purchase handoff: onboarding, portal invite, and continuity logic</li>
        </ul>
      </section>
    </main>
  );
}
