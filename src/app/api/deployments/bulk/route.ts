import { NextResponse } from "next/server";
import { registerDeploymentBatch } from "@/lib/deployment-registry";
import { requireOperatorApiSession } from "@/lib/operator-auth";
import type { DeploymentInstallType, DeploymentStatus } from "@/lib/runtime-store";

function asStatus(value: unknown): DeploymentStatus | undefined {
  return value === "planned" || value === "generated" || value === "live" || value === "paused" || value === "retired"
    ? value
    : undefined;
}

function asInstallType(value: unknown): DeploymentInstallType | undefined {
  return value === "widget" || value === "iframe" || value === "wordpress-plugin" || value === "hosted-link"
    ? value
    : undefined;
}

export async function POST(request: Request) {
  const auth = await requireOperatorApiSession(request, { allowedRoles: ["admin", "operator"] });
  if (auth.response) {
    return auth.response;
  }

  const body = await request.json().catch(() => ({})) as { deployments?: Array<Record<string, unknown>> };
  const deployments = Array.isArray(body.deployments) ? body.deployments : [];

  const records = await registerDeploymentBatch({
    deployments: deployments.map((item) => ({
      id: typeof item.id === "string" ? item.id : undefined,
      recipe: typeof item.recipe === "string" ? item.recipe : undefined,
      niche: typeof item.niche === "string" ? item.niche : undefined,
      service: typeof item.service === "string" ? item.service : undefined,
      entrypoint: typeof item.entrypoint === "string" ? item.entrypoint : undefined,
      audience: typeof item.audience === "string" ? item.audience : undefined,
      mode: typeof item.mode === "string" ? item.mode : undefined,
      family: typeof item.family === "string" ? item.family : undefined,
      zip: typeof item.zip === "string" ? item.zip : undefined,
      city: typeof item.city === "string" ? item.city : undefined,
      pageType: typeof item.pageType === "string" ? item.pageType : undefined,
      launcherLabel: typeof item.launcherLabel === "string" ? item.launcherLabel : undefined,
      installType: asInstallType(item.installType),
      status: asStatus(item.status),
      domain: typeof item.domain === "string" ? item.domain : undefined,
      pageUrl: typeof item.pageUrl === "string" ? item.pageUrl : undefined,
      providerId: typeof item.providerId === "string" ? item.providerId : undefined,
      providerLabel: typeof item.providerLabel === "string" ? item.providerLabel : undefined,
      notes: typeof item.notes === "string" ? item.notes : undefined,
      tags: Array.isArray(item.tags) ? item.tags.filter((value): value is string => typeof value === "string") : undefined,
      updatedBy: auth.session?.email,
    })),
  });

  return NextResponse.json({
    success: true,
    count: records.length,
    records,
  });
}
