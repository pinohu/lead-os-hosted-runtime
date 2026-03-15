import { NextResponse } from "next/server";
import {
  applyOperatorBrowserFallback,
  applyOperatorSession,
  buildOperatorAbsoluteUrl,
  buildOperatorDestinationUrl,
  createBrowserFallbackToken,
  createSessionToken,
  getOperatorPublicOrigin,
  isAllowedOperatorEmail,
  sanitizeNextPath,
  sendOperatorMagicLink,
} from "@/lib/operator-auth";

function redirectWithError(request: Request, message: string, nextPath: string) {
  const url = new URL(buildOperatorAbsoluteUrl("/auth/sign-in", {
    requestUrl: request.url,
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
  }));
  url.searchParams.set("error", message);
  url.searchParams.set("next", nextPath);
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nextPath = sanitizeNextPath(String(formData.get("next") ?? "/dashboard"));

  if (!email || !isAllowedOperatorEmail(email)) {
    return redirectWithError(request, "unauthorized", nextPath);
  }

  const result = await sendOperatorMagicLink(email, getOperatorPublicOrigin({
    requestUrl: request.url,
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
  }), nextPath);
  if (!result.ok) {
    const origin = getOperatorPublicOrigin({
      requestUrl: request.url,
      host: request.headers.get("host"),
      forwardedHost: request.headers.get("x-forwarded-host"),
      forwardedProto: request.headers.get("x-forwarded-proto"),
    });
    const response = NextResponse.redirect(buildOperatorDestinationUrl(nextPath, {
      requestUrl: request.url,
      host: request.headers.get("host"),
      forwardedHost: request.headers.get("x-forwarded-host"),
      forwardedProto: request.headers.get("x-forwarded-proto"),
    }, { auth: "browser-fallback" }));
    applyOperatorBrowserFallback(response, await createBrowserFallbackToken(email, origin, nextPath));
    applyOperatorSession(response, await createSessionToken(email));
    return response;
  }

  const url = new URL(buildOperatorAbsoluteUrl("/auth/check-email", {
    requestUrl: request.url,
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
  }));
  url.searchParams.set("email", email);
  return NextResponse.redirect(url);
}
