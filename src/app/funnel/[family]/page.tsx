import { notFound } from "next/navigation";
import { getRecipeForFamily } from "@/lib/automation";
import { buildDefaultFunnelGraphs } from "@/lib/funnel-library";
import { tenantConfig } from "@/lib/tenant";

export default async function FunnelFamilyPage({
  params,
  searchParams,
}: {
  params: Promise<{ family: string }>;
  searchParams: Promise<{ niche?: string }>;
}) {
  const { family } = await params;
  const { niche } = await searchParams;
  const graphs = buildDefaultFunnelGraphs(tenantConfig.tenantId);
  const graph = graphs[family as keyof typeof graphs];

  if (!graph) notFound();

  const recipe = getRecipeForFamily(graph.family);

  return (
    <main>
      <section className="panel">
        <p className="eyebrow">LeadOS Funnel Family</p>
        <h1>{graph.name}</h1>
        <p className="muted">
          Niche: {niche ?? tenantConfig.defaultNiche} | Goal: {graph.goal}
        </p>
        <p>{recipe.summary}</p>
      </section>
      <div className="grid two">
        <section className="panel">
          <h2>Canonical Nodes</h2>
          <ol>
            {graph.nodes.map((node) => (
              <li key={node.id}>
                <strong>{node.name}</strong> - {node.type} - {node.channel}
              </li>
            ))}
          </ol>
        </section>
        <section className="panel">
          <h2>Automation Recipe</h2>
          <p className="muted">Trigger: {recipe.trigger}</p>
          <ul>
            {recipe.actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
