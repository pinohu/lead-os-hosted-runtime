import { NextResponse } from "next/server";
import {
  applyOperatorSession,
  buildOperatorAbsoluteUrl,
  createSessionToken,
  getOperatorPublicOrigin,
  sanitizeNextPath,
  verifyMagicLinkToken,
} from "@/lib/operator-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const requestedNext = sanitizeNextPath(url.searchParams.get("next"));
  const publicOriginOptions = {
    requestUrl: request.url,
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
  };

  if (!token) {
    return NextResponse.redirect(buildOperatorAbsoluteUrl("/auth/sign-in?error=invalid-link", publicOriginOptions));
  }

  const payload = await verifyMagicLinkToken(token);
  if (!payload) {
    return NextResponse.redirect(buildOperatorAbsoluteUrl("/auth/sign-in?error=invalid-link", publicOriginOptions));
  }

  const sessionToken = await createSessionToken(payload.email);
  const response = NextResponse.redirect(new URL(
    payload.next ?? requestedNext,
    getOperatorPublicOrigin(publicOriginOptions),
  ));
  applyOperatorSession(response, sessionToken);
  return response;
}
