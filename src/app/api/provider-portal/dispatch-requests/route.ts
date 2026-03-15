import { NextResponse } from "next/server";
import { applyProviderDispatchRequestAction, getProviderPortalSnapshot } from "@/lib/provider-portal";
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
    action?: "accept" | "decline";
    note?: string;
  };
  if (!body.requestId || (body.action !== "accept" && body.action !== "decline")) {
    return NextResponse.json({ success: false, error: "A request id and valid action are required." }, { status: 400 });
  }

  const result = await applyProviderDispatchRequestAction({
    requestId: body.requestId,
    providerId: auth.session.providerId,
    actorEmail: auth.session.email,
    action: body.action,
    note: body.note,
  });

  return NextResponse.json({
    success: true,
    request: result.request,
    unchanged: result.unchanged,
  });
}
