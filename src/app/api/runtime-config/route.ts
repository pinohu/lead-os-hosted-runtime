import { NextResponse } from "next/server";
import { requireOperatorApiSession } from "@/lib/operator-auth";
import {
  buildRuntimeConfigSummary,
  getOperationalRuntimeConfig,
  updateOperationalRuntimeConfig,
  type OperationalRuntimeConfig,
} from "@/lib/runtime-config";

export async function GET(request: Request) {
  const auth = await requireOperatorApiSession(request, { allowedRoles: ["admin"] });
  if (auth.response) {
    return auth.response;
  }

  const config = await getOperationalRuntimeConfig();
  return NextResponse.json({
    success: true,
    config,
    summary: buildRuntimeConfigSummary(config),
  });
}

export async function POST(request: Request) {
  const auth = await requireOperatorApiSession(request, { allowedRoles: ["admin"] });
  if (auth.response) {
    return auth.response;
  }

  const body = await request.json().catch(() => ({})) as Partial<OperationalRuntimeConfig>;
  let config;
  try {
    config = await updateOperationalRuntimeConfig(body, auth.session?.email);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unable to update runtime configuration",
    }, { status: 400 });
  }
  return NextResponse.json({
    success: true,
    config,
    summary: buildRuntimeConfigSummary(config),
  });
}
