import { notFound } from "next/navigation";
import { getNiche, nicheCatalog } from "@/lib/catalog";

export function generateStaticParams() {
  return Object.keys(nicheCatalog).map((slug) => ({ slug }));
}

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const niche = getNiche(slug);

  if (!niche) notFound();

  return (
    <main>
      <section className="panel">
        <p className="eyebrow">Hosted Assessment</p>
        <h1>{niche.assessmentTitle}</h1>
        <p className="muted">{niche.summary}</p>
        <ol>
          <li>Capture the visitor identity from the external site or widget.</li>
          <li>Ask a focused set of niche-specific qualification questions.</li>
          <li>Return the next best action back into the hosted runtime.</li>
        </ol>
      </section>
    </main>
  );
}
