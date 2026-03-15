import { NextResponse } from "next/server";
import { clearProviderPortalSession } from "@/lib/provider-portal-auth";
import { tenantConfig } from "@/lib/tenant";

export async function GET() {
  const response = NextResponse.redirect(new URL("/join-provider-network", tenantConfig.siteUrl));
  clearProviderPortalSession(response);
  return response;
}
