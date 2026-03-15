import { NextResponse } from "next/server";
import { buildOperatorAbsoluteUrl, clearOperatorSession } from "@/lib/operator-auth";

export async function GET(request: Request) {
  const response = NextResponse.redirect(buildOperatorAbsoluteUrl("/auth/sign-in", {
    requestUrl: request.url,
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
  }));
  clearOperatorSession(response);
  return response;
}
