import { NextResponse } from "next/server";
import {
  applyOperatorSession,
  createSessionToken,
  sanitizeNextPath,
  verifyMagicLinkToken,
} from "@/lib/operator-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const requestedNext = sanitizeNextPath(url.searchParams.get("next"));

  if (!token) {
    return NextResponse.redirect(new URL("/auth/sign-in?error=invalid-link", request.url));
  }

  const payload = await verifyMagicLinkToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/auth/sign-in?error=invalid-link", request.url));
  }

  const sessionToken = await createSessionToken(payload.email);
  const response = NextResponse.redirect(new URL(payload.next ?? requestedNext, request.url));
  applyOperatorSession(response, sessionToken);
  return response;
}
