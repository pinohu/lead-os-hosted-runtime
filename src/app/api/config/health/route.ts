import { NextResponse } from "next/server";
import { getConfigStatusSummary } from "@/lib/config-status";
import { requireOperatorApiSession } from "@/lib/operator-auth";

export async function GET(request: Request) {
  const auth = await requireOperatorApiSession(request, { allowedRoles: ["admin"] });
  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json({
    success: true,
    configuration: getConfigStatusSummary(),
  });
}
