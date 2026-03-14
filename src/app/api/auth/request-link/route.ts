import { NextResponse } from "next/server";
import { isAllowedOperatorEmail, sanitizeNextPath, sendOperatorMagicLink } from "@/lib/operator-auth";

function redirectWithError(request: Request, message: string, nextPath: string) {
  const url = new URL("/auth/sign-in", request.url);
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

  const result = await sendOperatorMagicLink(email, new URL(request.url).origin, nextPath);
  if (!result.ok) {
    return redirectWithError(request, "delivery-failed", nextPath);
  }

  const url = new URL("/auth/check-email", request.url);
  url.searchParams.set("email", email);
  return NextResponse.redirect(url);
}
