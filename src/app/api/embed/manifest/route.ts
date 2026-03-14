import { NextResponse } from "next/server";
import { nicheCatalog } from "@/lib/catalog";
import { buildCorsHeaders } from "@/lib/cors";
import { getRecipeForFamily } from "@/lib/automation";
import { buildExperienceManifest } from "@/lib/experience";
import { buildDefaultFunnelGraphs } from "@/lib/funnel-library";
import { getAutomationHealth } from "@/lib/providers";
import { tenantConfig } from "@/lib/tenant";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request.headers.get("origin")),
  });
}

export async function GET(request: Request) {
  const graphs = buildDefaultFunnelGraphs(tenantConfig.tenantId);
  const health = getAutomationHealth();
  return NextResponse.json({
    success: true,
    tenant: tenantConfig,
    niches: Object.values(nicheCatalog),
    widgets: {
      chat: true,
      form: true,
      assessment: true,
      calculator: true,
    },
    experience: Object.values(nicheCatalog).map((niche) => ({
      niche: niche.slug,
      manifest: buildExperienceManifest(niche),
    })),
    funnels: Object.values(graphs).map((graph) => ({
      id: graph.id,
      family: graph.family,
      goal: graph.goal,
      entryPoints: graph.entryPoints,
      nodeCount: graph.nodes.length,
      recipe: getRecipeForFamily(graph.family),
    })),
    health,
  }, {
    headers: buildCorsHeaders(request.headers.get("origin")),
  });
}
