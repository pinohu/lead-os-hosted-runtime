import { NextResponse } from "next/server";
import { buildCorsHeaders } from "@/lib/cors";
import { generateBulkZipDeploymentPackage } from "@/lib/embed-deployment";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
import { tenantConfig } from "@/lib/tenant";

function splitCsv(value?: string | null) {
  if (!value) return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function escapeCsvCell(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }
  return value;
}

function toCsv(deployment: ReturnType<typeof generateBulkZipDeploymentPackage>) {
  const header = [
    "hostedUrl",
    "entrypoint",
    "widgetPreset",
    "pageType",
    "audience",
    "bootEndpoint",
    "manifestEndpoint",
  ];
  const rows = deployment.deployments.map((item) => [
    item.bundle.hostedUrl,
    item.entrypointPreset.id,
    item.widgetPreset.id,
    item.pageType,
    item.audience,
    item.bundle.bootEndpoint,
    item.bundle.manifestEndpoint,
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(","))
    .join("\n");
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request.headers.get("origin")),
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";
  const runtimeConfig = await getOperationalRuntimeConfig();
  const deployment = generateBulkZipDeploymentPackage({
    recipe: url.searchParams.get("recipe") ?? undefined,
    niche: url.searchParams.get("niche") ?? undefined,
    service: url.searchParams.get("service") ?? undefined,
    entrypoint: url.searchParams.get("entrypoint") ?? undefined,
    audience: url.searchParams.get("audience") ?? undefined,
    mode: url.searchParams.get("mode") ?? undefined,
    family: url.searchParams.get("family") ?? undefined,
    city: url.searchParams.get("city") ?? undefined,
    pageType: url.searchParams.get("pageType") ?? undefined,
    launcherLabel: url.searchParams.get("launcherLabel") ?? undefined,
    zips: splitCsv(url.searchParams.get("zips")),
    limit: Number(url.searchParams.get("limit") ?? 25),
  }, tenantConfig, runtimeConfig.experiments.promotions);

  if (format === "csv") {
    return new NextResponse(toCsv(deployment), {
      status: 200,
      headers: {
        ...buildCorsHeaders(request.headers.get("origin")),
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  }

  return NextResponse.json({
    success: true,
    deployment,
  }, {
    headers: buildCorsHeaders(request.headers.get("origin")),
  });
}
