import { NextResponse } from "next/server";
import { buildCorsHeaders } from "@/lib/cors";
import { tenantConfig } from "@/lib/tenant";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request.headers.get("origin")),
  });
}

export async function GET(request: Request) {
  return NextResponse.json({
    success: true,
    widget: {
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
    },
  }, {
    headers: buildCorsHeaders(request.headers.get("origin")),
  });
}
