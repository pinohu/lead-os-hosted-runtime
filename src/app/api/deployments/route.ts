import { NextResponse } from "next/server";
import { registerDeployment, getDeploymentRegistrySnapshot } from "@/lib/deployment-registry";
import { requireOperatorApiSession } from "@/lib/operator-auth";
import type { DeploymentInstallType, DeploymentStatus } from "@/lib/runtime-store";

function asStatus(value: string | null): DeploymentStatus | undefined {
  if (value === "planned" || value === "generated" || value === "live" || value === "paused" || value === "retired") {
    return value;
  }
  return undefined;
}

function asInstallType(value: unknown): DeploymentInstallType | undefined {
  return value === "widget" || value === "iframe" || value === "wordpress-plugin" || value === "hosted-link"
    ? value
    : undefined;
}

export async function GET(request: Request) {
  const auth = await requireOperatorApiSession(request);
  if (auth.response) {
    return auth.response;
  }

  const url = new URL(request.url);
  const snapshot = await getDeploymentRegistrySnapshot({
    status: asStatus(url.searchParams.get("status")),
    pageType: url.searchParams.get("pageType") ?? undefined,
    audience: url.searchParams.get("audience") ?? undefined,
  });

  return NextResponse.json({
    success: true,
    ...snapshot,
  });
}

export async function POST(request: Request) {
  const auth = await requireOperatorApiSession(request, { allowedRoles: ["admin", "operator"] });
  if (auth.response) {
    return auth.response;
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const record = await registerDeployment({
    id: typeof body.id === "string" ? body.id : undefined,
    recipe: typeof body.recipe === "string" ? body.recipe : undefined,
    niche: typeof body.niche === "string" ? body.niche : undefined,
    service: typeof body.service === "string" ? body.service : undefined,
    entrypoint: typeof body.entrypoint === "string" ? body.entrypoint : undefined,
    audience: typeof body.audience === "string" ? body.audience : undefined,
    mode: typeof body.mode === "string" ? body.mode : undefined,
    family: typeof body.family === "string" ? body.family : undefined,
    zip: typeof body.zip === "string" ? body.zip : undefined,
    city: typeof body.city === "string" ? body.city : undefined,
    pageType: typeof body.pageType === "string" ? body.pageType : undefined,
    launcherLabel: typeof body.launcherLabel === "string" ? body.launcherLabel : undefined,
    installType: asInstallType(body.installType),
    status: asStatus(typeof body.status === "string" ? body.status : null),
    domain: typeof body.domain === "string" ? body.domain : undefined,
    pageUrl: typeof body.pageUrl === "string" ? body.pageUrl : undefined,
    providerId: typeof body.providerId === "string" ? body.providerId : undefined,
    providerLabel: typeof body.providerLabel === "string" ? body.providerLabel : undefined,
    notes: typeof body.notes === "string" ? body.notes : undefined,
    tags: Array.isArray(body.tags) ? body.tags.filter((value): value is string => typeof value === "string") : undefined,
    updatedBy: auth.session?.email,
  });

  return NextResponse.json({
    success: true,
    record,
  });
}
