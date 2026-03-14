import { NextResponse } from "next/server";
import { requireOperatorApiSession } from "@/lib/operator-auth";
import { runSmokeTest } from "@/lib/providers";

export async function POST(request: Request) {
  const auth = await requireOperatorApiSession(request);
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

  return NextResponse.json({
    success: true,
    smoke: await runSmokeTest(dryRun),
  });
}
