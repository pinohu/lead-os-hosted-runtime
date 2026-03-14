import { NextResponse } from "next/server";
import { getRecipeForFamily } from "@/lib/automation";
import { buildDefaultFunnelGraphs } from "@/lib/funnel-library";
import { getAutomationHealth } from "@/lib/providers";
import { getCanonicalEvents, getLeadRecords } from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

export async function GET() {
  const graphs = buildDefaultFunnelGraphs(tenantConfig.tenantId);
  const health = getAutomationHealth();
  return NextResponse.json({
    success: true,
    tenantId: tenantConfig.tenantId,
    liveMode: health.liveMode,
    providers: health.providers,
    channels: health.channels,
    funnels: Object.values(graphs).map((graph) => ({
      id: graph.id,
      family: graph.family,
      recipe: getRecipeForFamily(graph.family),
      nodes: graph.nodes.length,
      edges: graph.edges.length,
    })),
    telemetry: {
      leads: getLeadRecords().length,
      events: getCanonicalEvents().length,
    },
  });
}
