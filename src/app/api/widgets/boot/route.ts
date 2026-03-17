import { NextResponse } from "next/server";
import { buildCorsHeaders } from "@/lib/cors";
import { resolveWidgetBoot } from "@/lib/embed-deployment";
import { buildDefaultFunnelGraphs } from "@/lib/funnel-library";
import { getAutomationHealth } from "@/lib/providers";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
import { getVerticalOperatingModel, universalOperatingPriorities } from "@/lib/service-operating-models";
import { tenantConfig } from "@/lib/tenant";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request.headers.get("origin")),
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const funnels = buildDefaultFunnelGraphs(tenantConfig.tenantId);
  const health = getAutomationHealth();
  const runtimeConfig = await getOperationalRuntimeConfig();
  const resolved = resolveWidgetBoot({
    niche: url.searchParams.get("niche") ?? undefined,
    service: url.searchParams.get("service") ?? undefined,
    entrypoint: url.searchParams.get("entrypoint") ?? undefined,
    audience: url.searchParams.get("audience") ?? undefined,
    mode: url.searchParams.get("mode") ?? undefined,
    family: url.searchParams.get("family") ?? undefined,
    zip: url.searchParams.get("zip") ?? undefined,
    city: url.searchParams.get("city") ?? undefined,
    pageType: url.searchParams.get("pageType") ?? undefined,
    launcherLabel: url.searchParams.get("launcherLabel") ?? undefined,
  }, tenantConfig, runtimeConfig.experiments.promotions);
  const operatingModel = getVerticalOperatingModel(url.searchParams.get("niche") ?? resolved.niche);
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
        service: resolved.service,
        niche: resolved.niche,
        family: resolved.entrypointPreset.family,
        mode: resolved.entrypointPreset.mode,
        entrypoint: resolved.entrypointPreset.id,
        audience: resolved.audience,
      },
      embed: {
        scriptUrl: `${tenantConfig.siteUrl}/embed/lead-os-embed.js`,
        launcherLabel: resolved.launcherLabel,
        drawerTitle: resolved.resolvedProfile.heroTitle,
        drawerSummary: resolved.resolvedProfile.heroSummary,
        accessibility: {
          role: "dialog",
          closeLabel: "Close LeadOS panel",
        },
      },
      channels: health.channels,
      enabledFunnels: tenantConfig.enabledFunnels,
      experience: resolved.experience,
      resolvedEntrypoint: resolved.entrypointPreset,
      widgetPreset: resolved.widgetPreset,
      deploymentPattern: resolved.deploymentPattern,
      operatingModel,
      operatingPriorities: universalOperatingPriorities,
      location: {
        zip: resolved.zip ?? null,
        city: resolved.city ?? null,
        pageType: resolved.pageType,
      },
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
