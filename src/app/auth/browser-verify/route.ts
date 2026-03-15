import { NextResponse } from "next/server";
import {
  buildOperatorAbsoluteUrl,
  sanitizeNextPath,
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
  return NextResponse.redirect(
    buildOperatorAbsoluteUrl(`/auth/sign-in?error=delivery-failed&next=${encodeURIComponent(nextPath)}`, publicOriginOptions),
  );
}
