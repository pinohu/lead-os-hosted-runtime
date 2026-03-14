import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AdaptiveLeadCaptureForm } from "@/components/AdaptiveLeadCaptureForm";
import { ExperienceScaffold } from "@/components/ExperienceScaffold";
import { getRecipeForFamily } from "@/lib/automation";
import { getNiche } from "@/lib/catalog";
import { resolveExperienceProfile } from "@/lib/experience";
import { buildDefaultFunnelGraphs } from "@/lib/funnel-library";
import type { FunnelFamily } from "@/lib/runtime-schema";
import { tenantConfig } from "@/lib/tenant";

type FunnelFamilyPageProps = {
  params: Promise<{ family: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function asBoolean(value: string | string[] | undefined) {
  const normalized = asString(value)?.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function asIntent(value: string | string[] | undefined): "discover" | "compare" | "solve-now" | undefined {
  const normalized = asString(value);
  return normalized === "discover" || normalized === "compare" || normalized === "solve-now"
    ? normalized
    : undefined;
}

export default async function FunnelFamilyPage({ params, searchParams }: FunnelFamilyPageProps) {
  const { family } = await params;
  const query = await searchParams;
  const graphs = buildDefaultFunnelGraphs(tenantConfig.tenantId);
  const graph = graphs[family as keyof typeof graphs];

  if (!graph) notFound();

  const niche = getNiche(asString(query.niche) ?? tenantConfig.defaultNiche);
  const headerStore = await headers();
  const recipe = getRecipeForFamily(graph.family);
  const profile = resolveExperienceProfile({
    family: graph.family,
    niche,
    supportEmail: tenantConfig.supportEmail,
    source: asString(query.source),
    intent: asIntent(query.intent),
    returning: asBoolean(query.returning),
    milestone: asString(query.milestone),
    preferredMode: asString(query.mode),
    score: Number(asString(query.score) ?? 0) || undefined,
    userAgent: headerStore.get("user-agent") ?? undefined,
    referrer: headerStore.get("referer") ?? undefined,
  });

  return (
    <ExperienceScaffold
      eyebrow="Canonical funnel family"
      title={`${graph.name} for ${niche.label}`}
      summary={`${recipe.summary} This surface now adapts the ask, proof order, and fallback path around returning status, device, and intent instead of showing one generic page.`}
      profile={profile}
      metrics={[
        { label: "Goal", value: graph.goal, detail: "Primary outcome this family optimizes for." },
        { label: "Nodes", value: `${graph.nodes.length}`, detail: "Reusable canonical nodes in this graph." },
        { label: "Recipe actions", value: `${recipe.actions.length}`, detail: "Default automation steps already attached." },
      ]}
    >
      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Canonical nodes</p>
          <h2>Every step has one job</h2>
          <div className="stack-grid">
            {graph.nodes.map((node) => (
              <article key={node.id} className="stack-card">
                <p className="eyebrow">{node.channel}</p>
                <h3>{node.name}</h3>
                <p className="muted">
                  {node.type} • {node.purpose}
                </p>
              </article>
            ))}
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">Automation recipe</p>
          <h2>How the runtime engineers visits two and three</h2>
          <p className="muted">Trigger: {recipe.trigger}</p>
          <ul className="check-list">
            {recipe.actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </article>
      </section>

      <AdaptiveLeadCaptureForm
        source={
          graph.family === "qualification" ? "assessment"
          : graph.family === "chat" ? "chat"
          : graph.family === "webinar" ? "webinar"
          : graph.family === "checkout" ? "checkout"
          : "manual"
        }
        family={graph.family as FunnelFamily}
        niche={niche.slug}
        service={tenantConfig.defaultService}
        pagePath={`/funnel/${graph.family}`}
        returning={asBoolean(query.returning)}
        profile={profile}
      />
    </ExperienceScaffold>
  );
}
