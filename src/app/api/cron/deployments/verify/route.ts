import { NextResponse } from "next/server";
import { verifyDeploymentRegistry } from "@/lib/deployment-registry";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const verified = await verifyDeploymentRegistry();
  return NextResponse.json({
    success: true,
    count: verified.length,
    verified,
  });
}
