import { NextResponse } from "next/server";
import {
  applyOperatorSession,
  buildOperatorDestinationUrl,
  buildOperatorAbsoluteUrl,
  clearOperatorBrowserFallback,
  createSessionToken,
  OPERATOR_BROWSER_FALLBACK_COOKIE,
  sanitizeNextPath,
  verifyMagicLinkToken,
} from "@/lib/operator-auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const nextPath = sanitizeNextPath(String(formData.get("next") ?? "/dashboard"));
  const publicOriginOptions = {
    requestUrl: request.url,
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
  };

  const cookieHeader = request.headers.get("cookie") ?? "";
  const fallbackToken = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${OPERATOR_BROWSER_FALLBACK_COOKIE}=`))
    ?.slice(OPERATOR_BROWSER_FALLBACK_COOKIE.length + 1);

  if (!fallbackToken) {
    return NextResponse.redirect(buildOperatorAbsoluteUrl(`/auth/sign-in?error=delivery-failed&next=${encodeURIComponent(nextPath)}`, publicOriginOptions));
  }

  const payload = await verifyMagicLinkToken(fallbackToken);
  if (!payload) {
    const response = NextResponse.redirect(buildOperatorAbsoluteUrl(`/auth/sign-in?error=invalid-link&next=${encodeURIComponent(nextPath)}`, publicOriginOptions));
    clearOperatorBrowserFallback(response);
    return response;
  }

  const sessionToken = await createSessionToken(payload.email);
  const response = NextResponse.redirect(buildOperatorDestinationUrl(
    payload.next ?? nextPath,
    publicOriginOptions,
    { auth: "browser-fallback" },
  ));
  applyOperatorSession(response, sessionToken);
  clearOperatorBrowserFallback(response);
  return response;
}
