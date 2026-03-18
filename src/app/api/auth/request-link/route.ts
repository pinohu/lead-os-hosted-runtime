import { NextResponse } from "next/server";
import {
  buildOperatorAbsoluteUrl,
  getOperatorAuthConfigurationStatus,
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
  const authConfig = getOperatorAuthConfigurationStatus();

  if (!authConfig.ready) {
    return redirectWithError(request, "config", nextPath);
  }

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
    const url = new URL(buildOperatorAbsoluteUrl("/auth/check-email", {
      requestUrl: request.url,
      host: request.headers.get("host"),
      forwardedHost: request.headers.get("x-forwarded-host"),
      forwardedProto: request.headers.get("x-forwarded-proto"),
    }));
    url.searchParams.set("delivery", "failed");
    url.searchParams.set("email", email);
    url.searchParams.set("next", nextPath);
    url.searchParams.set("reason", result.detail);
    const retryAfterSeconds = typeof result.payload?.retryAfterSeconds === "number"
      ? result.payload.retryAfterSeconds
      : Array.isArray(result.payload?.attempts)
        ? result.payload.attempts
            .map((attempt) => (attempt && typeof attempt === "object" && "retryAfterSeconds" in attempt)
              ? Number((attempt as Record<string, unknown>).retryAfterSeconds)
              : NaN)
            .find((value) => Number.isFinite(value))
        : undefined;
    if (typeof retryAfterSeconds === "number" && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      url.searchParams.set("retryAfter", String(Math.ceil(retryAfterSeconds)));
    }
    return NextResponse.redirect(url);
  }

  const url = new URL(buildOperatorAbsoluteUrl("/auth/check-email", {
    requestUrl: request.url,
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
  }));
  url.searchParams.set("email", email);
  url.searchParams.set("next", nextPath);
  return NextResponse.redirect(url);
}
