import { NextResponse } from "next/server";
import { buildCorsHeaders } from "@/lib/cors";
import { getNiche } from "@/lib/catalog";
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
  const funnels = buildDefaultFunnelGraphs(tenantConfig.tenantId);
  const health = getAutomationHealth();
  const experience = buildExperienceManifest(getNiche(tenantConfig.defaultNiche));
  return NextResponse.json({
    success: true,
    widget: {
      tenantId: tenantConfig.tenantId,
      brandName: tenantConfig.brandName,
      accent: tenantConfig.accent,
      runtimeBaseUrl: tenantConfig.siteUrl,
      routes: {
        intake: "/api/intake",
        decision: "/api/decision",
        manifest: "/api/embed/manifest",
      },
      defaults: {
        service: tenantConfig.defaultService,
        niche: tenantConfig.defaultNiche,
      },
      channels: tenantConfig.channels,
      enabledFunnels: tenantConfig.enabledFunnels,
      experience,
      primaryFunnels: Object.values(funnels).map((graph) => ({
        id: graph.id,
        family: graph.family,
        goal: graph.goal,
      })),
      health: {
        liveMode: health.liveMode,
        channels: health.channels,
      },
    },
  }, {
    headers: buildCorsHeaders(request.headers.get("origin")),
  });
}
