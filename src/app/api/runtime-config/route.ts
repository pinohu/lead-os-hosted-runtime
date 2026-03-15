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
  const config = await updateOperationalRuntimeConfig(body, auth.session?.email);
  return NextResponse.json({
    success: true,
    config,
    summary: buildRuntimeConfigSummary(config),
  });
}
