import { NextResponse } from "next/server";
import {
  applyProviderPortalSession,
  clearProviderPortalSession,
  verifyProviderPortalToken,
} from "@/lib/provider-portal-auth";
import { tenantConfig } from "@/lib/tenant";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const destination = new URL("/provider-portal", tenantConfig.siteUrl);

  if (!token) {
    destination.searchParams.set("error", "missing-token");
    return NextResponse.redirect(destination);
  }

  const session = await verifyProviderPortalToken(token);
  if (!session) {
    destination.searchParams.set("error", "invalid-link");
    const response = NextResponse.redirect(destination);
    clearProviderPortalSession(response);
    return response;
  }

  const response = NextResponse.redirect(destination);
  applyProviderPortalSession(response, token);
  return response;
}
