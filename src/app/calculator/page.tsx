import { getNiche } from "@/lib/catalog";

export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ niche?: string }>;
}) {
  const params = await searchParams;
  const niche = getNiche(params.niche);

  return (
    <main>
      <section className="panel">
        <p className="eyebrow">Hosted ROI Path</p>
        <h1>{niche.label} ROI Calculator</h1>
        <p className="muted">
          Use this hosted path when the external site wants to hand off value framing and
          qualification without rebuilding calculator logic on the source website.
        </p>
        <p className="muted">
          Recommended optimization bias: <strong>{niche.calculatorBias}</strong>
        </p>
      </section>
    </main>
  );
}
