import { NextResponse } from "next/server";
import { processDispatchEscalations } from "@/lib/dispatch-automation";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDispatchEscalations();
  return NextResponse.json({
    success: true,
    escalated: result.escalated,
    count: result.count,
  });
}
