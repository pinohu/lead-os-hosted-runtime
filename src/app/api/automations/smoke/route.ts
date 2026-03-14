import { NextResponse } from "next/server";
import { runSmokeTest } from "@/lib/providers";

export async function POST(request: Request) {
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
