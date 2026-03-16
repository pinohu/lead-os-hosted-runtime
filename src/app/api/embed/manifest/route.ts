import { NextResponse } from "next/server";
import { buildCorsHeaders } from "@/lib/cors";
import { buildManifestCatalog } from "@/lib/embed-deployment";
import { getRecipeForFamily } from "@/lib/automation";
import { buildDefaultFunnelGraphs } from "@/lib/funnel-library";
import { getAutomationHealth } from "@/lib/providers";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
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
  const runtimeConfig = await getOperationalRuntimeConfig();
  const catalog = buildManifestCatalog(tenantConfig, runtimeConfig.experiments.promotions);
  return NextResponse.json({
    success: true,
    tenant: tenantConfig,
    niches: catalog.niches,
    widgets: {
      chat: true,
      form: true,
      assessment: true,
      calculator: true,
    },
    experience: catalog.experienceCatalog,
    experienceCatalog: catalog.experienceCatalog,
    entrypointPresets: catalog.entrypointPresets,
    widgetPresets: catalog.widgetPresets,
    deploymentPatterns: catalog.deploymentPatterns,
    themePresets: catalog.themePresets,
    supportedIntegrations: catalog.supportedIntegrations,
    localSeoPresets: catalog.localSeoPresets,
    bulkDeploymentSupport: {
      endpoint: "/api/embed/generate-bulk",
      summary: "Generate many ZIP-aware deployment payloads in one request for local SEO and metro rollouts.",
    },
    wordpressPluginSupport: {
      endpoint: "/api/embed/wordpress-plugin",
      summary: "Generate a ready-to-install WordPress plugin file for a preset-aware deployment recipe.",
    },
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
