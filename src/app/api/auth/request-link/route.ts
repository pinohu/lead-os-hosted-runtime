import { NextResponse } from "next/server";
import {
  applyOperatorBrowserFallback,
  buildOperatorAbsoluteUrl,
  createBrowserFallbackToken,
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
    const url = new URL(buildOperatorAbsoluteUrl("/auth/check-email", {
      requestUrl: request.url,
      host: request.headers.get("host"),
      forwardedHost: request.headers.get("x-forwarded-host"),
      forwardedProto: request.headers.get("x-forwarded-proto"),
    }));
    url.searchParams.set("email", email);
    url.searchParams.set("delivery", "failed");
    url.searchParams.set("next", nextPath);
    const response = NextResponse.redirect(url);
    applyOperatorBrowserFallback(response, await createBrowserFallbackToken(email, origin, nextPath));
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
