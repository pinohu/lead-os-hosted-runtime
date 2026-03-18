import { NextResponse } from "next/server";
import { requireOperatorApiSession } from "@/lib/operator-auth";
import { runGrowthStackSmokeTest } from "@/lib/growth-integrations";
import { runSmokeTest } from "@/lib/providers";

export async function POST(request: Request) {
  const auth = await requireOperatorApiSession(request, { allowedRoles: ["admin"] });
  if (auth.response) {
    return auth.response;
  }

  let dryRun = true;
  try {
    const payload = await request.json();
    if (typeof payload?.dryRun === "boolean") dryRun = payload.dryRun;
  } catch {
    dryRun = true;
  }

  const [smoke, growthSmoke] = await Promise.all([
    runSmokeTest(dryRun),
    runGrowthStackSmokeTest(dryRun),
  ]);

  return NextResponse.json({
    success: true,
    smoke,
    growthSmoke,
  });
}
