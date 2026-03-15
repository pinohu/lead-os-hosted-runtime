import { NextResponse } from "next/server";
import { buildCorsHeaders } from "@/lib/cors";
import { generateDeploymentPackage } from "@/lib/embed-deployment";
import { tenantConfig } from "@/lib/tenant";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request.headers.get("origin")),
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const deployment = generateDeploymentPackage({
    recipe: url.searchParams.get("recipe") ?? undefined,
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
  }, tenantConfig);

  return NextResponse.json({
    success: true,
    deployment,
  }, {
    headers: buildCorsHeaders(request.headers.get("origin")),
  });
}
