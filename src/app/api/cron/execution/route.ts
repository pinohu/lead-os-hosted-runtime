import { NextResponse } from "next/server";
import { processExecutionTasks } from "@/lib/execution-queue";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 25);
  const result = await processExecutionTasks(limit);
  return NextResponse.json({
    success: true,
    count: result.count,
    results: result.results,
  });
}
