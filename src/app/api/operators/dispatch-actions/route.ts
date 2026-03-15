import { NextResponse } from "next/server";
import { applyPlumbingDispatchAction } from "@/lib/dispatch-ops";
import { requireOperatorApiSession } from "@/lib/operator-auth";
import type { PlumbingOperatorActionType } from "@/lib/runtime-schema";

const VALID_ACTIONS = new Set<PlumbingOperatorActionType>([
  "dispatch-now",
  "assign-backup-provider",
  "retry-booking",
  "mark-booked",
  "mark-completed",
  "mark-lost",
]);

export async function POST(request: Request) {
  const auth = await requireOperatorApiSession(request, { allowedRoles: ["admin", "operator"] });
  if (auth.response) {
    return auth.response;
  }

  let body: {
    leadKey?: string;
    actionType?: PlumbingOperatorActionType;
    note?: string;
    revenueValue?: number;
    marginValue?: number;
    complaintStatus?: "none" | "minor" | "major";
    reviewStatus?: "not-requested" | "requested" | "positive" | "mixed" | "negative";
    reviewRating?: number;
    refundIssued?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const leadKey = typeof body.leadKey === "string" ? body.leadKey.trim() : "";
  const actionType = typeof body.actionType === "string" ? body.actionType : undefined;
  const note = typeof body.note === "string" ? body.note.trim() : undefined;
  const revenueValue = typeof body.revenueValue === "number" && Number.isFinite(body.revenueValue)
    ? body.revenueValue
    : undefined;
  const marginValue = typeof body.marginValue === "number" && Number.isFinite(body.marginValue)
    ? body.marginValue
    : undefined;
  const complaintStatus = body.complaintStatus === "none" || body.complaintStatus === "minor" || body.complaintStatus === "major"
    ? body.complaintStatus
    : undefined;
  const reviewStatus = body.reviewStatus === "not-requested" || body.reviewStatus === "requested" || body.reviewStatus === "positive" || body.reviewStatus === "mixed" || body.reviewStatus === "negative"
    ? body.reviewStatus
    : undefined;
  const reviewRating = typeof body.reviewRating === "number" && Number.isFinite(body.reviewRating)
    ? Math.max(0, Math.min(5, body.reviewRating))
    : undefined;
  const refundIssued = typeof body.refundIssued === "boolean" ? body.refundIssued : undefined;

  if (!leadKey) {
    return NextResponse.json({ success: false, error: "leadKey is required" }, { status: 400 });
  }
  if (!actionType || !VALID_ACTIONS.has(actionType)) {
    return NextResponse.json({ success: false, error: "Invalid actionType" }, { status: 400 });
  }

  try {
    const result = await applyPlumbingDispatchAction({
      leadKey,
      actionType,
      actorEmail: auth.session.email,
      note,
      revenueValue,
      marginValue,
      complaintStatus,
      reviewStatus,
      reviewRating,
      refundIssued,
    });
    return NextResponse.json({
      success: true,
      leadKey,
      stage: result.lead.stage,
      outcome: result.outcome,
      action: result.action,
      addedLeadMilestones: result.addedLeadMilestones,
      addedCustomerMilestones: result.addedCustomerMilestones,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to apply dispatch action";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
