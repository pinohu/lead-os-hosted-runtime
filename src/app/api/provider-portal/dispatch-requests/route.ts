import { NextResponse } from "next/server";
import { applyProviderDispatchRequestAction, getProviderPortalSnapshot, recordProviderDispatchCompletion } from "@/lib/provider-portal";
import { requireProviderPortalApiSession } from "@/lib/provider-portal-auth";

export async function GET(request: Request) {
  const auth = await requireProviderPortalApiSession(request);
  if (auth.response || !auth.session) {
    return auth.response!;
  }

  const snapshot = await getProviderPortalSnapshot(auth.session.providerId);
  return NextResponse.json({
    success: true,
    requests: snapshot.requests,
    summary: snapshot.summary,
  });
}

export async function POST(request: Request) {
  const auth = await requireProviderPortalApiSession(request);
  if (auth.response || !auth.session) {
    return auth.response!;
  }

  const body = await request.json().catch(() => ({})) as {
    requestId?: string;
    action?: "accept" | "decline" | "complete";
    note?: string;
    invoiceNumber?: string;
    invoiceStatus?: "not-issued" | "issued" | "sent" | "collected";
    paymentStatus?: "not-requested" | "pending" | "paid" | "failed";
    paymentMethod?: "cash" | "card" | "ach" | "financing" | "check" | "digital-link" | "other";
    paymentAmount?: number;
    paidAt?: string;
    revenueValue?: number;
    marginValue?: number;
    complaintStatus?: "none" | "minor" | "major";
    reviewStatus?: "not-requested" | "requested" | "positive" | "mixed" | "negative";
    reviewRating?: number;
    refundIssued?: boolean;
  };
  if (!body.requestId || (body.action !== "accept" && body.action !== "decline" && body.action !== "complete")) {
    return NextResponse.json({ success: false, error: "A request id and valid action are required." }, { status: 400 });
  }

  const result = body.action === "complete"
    ? await recordProviderDispatchCompletion({
        requestId: body.requestId,
        providerId: auth.session.providerId,
        actorEmail: auth.session.email,
        note: body.note,
        invoiceNumber: typeof body.invoiceNumber === "string" && body.invoiceNumber.trim() ? body.invoiceNumber.trim() : undefined,
        invoiceStatus: body.invoiceStatus,
        paymentStatus: body.paymentStatus,
        paymentMethod: body.paymentMethod,
        paymentAmount: typeof body.paymentAmount === "number" && Number.isFinite(body.paymentAmount) ? body.paymentAmount : undefined,
        paidAt: typeof body.paidAt === "string" && body.paidAt.trim() ? new Date(body.paidAt).toISOString() : undefined,
        revenueValue: typeof body.revenueValue === "number" && Number.isFinite(body.revenueValue) ? body.revenueValue : undefined,
        marginValue: typeof body.marginValue === "number" && Number.isFinite(body.marginValue) ? body.marginValue : undefined,
        complaintStatus: body.complaintStatus,
        reviewStatus: body.reviewStatus,
        reviewRating: typeof body.reviewRating === "number" && Number.isFinite(body.reviewRating) ? Math.max(0, Math.min(5, body.reviewRating)) : undefined,
        refundIssued: typeof body.refundIssued === "boolean" ? body.refundIssued : undefined,
      })
    : await applyProviderDispatchRequestAction({
        requestId: body.requestId,
        providerId: auth.session.providerId,
        actorEmail: auth.session.email,
        action: body.action,
        note: body.note,
      });

  return NextResponse.json({
    success: true,
    request: result.request,
    unchanged: "unchanged" in result ? result.unchanged : false,
  });
}
