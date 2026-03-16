import { NextResponse } from "next/server";
import { requireOperatorApiSession } from "@/lib/operator-auth";
import { recordObservabilityAlertAcknowledgement } from "@/lib/runtime-store";

export async function POST(request: Request) {
  const auth = await requireOperatorApiSession(request, { allowedRoles: ["admin", "operator"] });
  if (auth.response) {
    return auth.response;
  }

  const body = await request.json().catch(() => ({})) as {
    ruleId?: string;
    title?: string;
    note?: string;
    snoozeMinutes?: number;
  };
  const ruleId = typeof body.ruleId === "string" ? body.ruleId.trim() : "";
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : ruleId;
  if (!ruleId) {
    return NextResponse.json({ success: false, error: "Rule ID is required." }, { status: 400 });
  }

  const snoozeMinutes = typeof body.snoozeMinutes === "number" && Number.isFinite(body.snoozeMinutes)
    ? Math.max(0, Math.min(1440, body.snoozeMinutes))
    : 60;
  const acknowledgement = await recordObservabilityAlertAcknowledgement({
    ruleId,
    title,
    acknowledgedBy: auth.session?.email ?? "unknown-operator",
    note: typeof body.note === "string" && body.note.trim() ? body.note.trim() : undefined,
    snoozedUntil: snoozeMinutes > 0 ? new Date(Date.now() + snoozeMinutes * 60_000).toISOString() : undefined,
  });

  return NextResponse.json({
    success: true,
    acknowledgement,
  });
}
