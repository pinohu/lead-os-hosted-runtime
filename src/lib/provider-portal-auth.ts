import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getDispatchProviderByEmail } from "./runtime-config";
import { resolvePublicOrigin } from "./operator-auth-core";
import {
  decodeProviderPortalToken,
  issueProviderPortalToken,
  type ProviderPortalTokenPayload,
} from "./provider-portal-auth-core";
import { tenantConfig } from "./tenant";

const PROVIDER_SESSION_COOKIE = "leados_provider_session";

function getAuthSecret() {
  const secret = process.env.LEAD_OS_AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("LeadOS auth secret is required for provider portal access.");
  }
  return secret;
}

async function issueProviderToken(payload: ProviderPortalTokenPayload) {
  return issueProviderPortalToken(payload, getAuthSecret());
}

async function decodeProviderToken(token: string) {
  return decodeProviderPortalToken(token, getAuthSecret());
}

export async function createProviderPortalLink(providerEmail: string) {
  const provider = await getDispatchProviderByEmail(providerEmail);
  if (!provider?.contactEmail) {
    throw new Error("Provider email is not configured for self-serve access.");
  }
  const token = await issueProviderToken({
      type: "provider-session",
      providerId: provider.id,
      email: provider.contactEmail,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  const origin = resolvePublicOrigin(
    [process.env.NEXT_PUBLIC_SITE_URL, tenantConfig.siteUrl],
    tenantConfig.siteUrl,
  );
  const url = new URL("/provider-portal/auth/verify", origin);
  url.searchParams.set("token", token);
  return { token, url: url.toString(), provider };
}

export async function getProviderPortalSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PROVIDER_SESSION_COOKIE)?.value;
  if (!token) return null;
  return decodeProviderToken(token);
}

export function applyProviderPortalSession(response: NextResponse, token: string) {
  response.cookies.set({
    name: PROVIDER_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export function clearProviderPortalSession(response: NextResponse) {
  response.cookies.set({
    name: PROVIDER_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function verifyProviderPortalToken(token: string) {
  return decodeProviderToken(token);
}

export async function requireProviderPortalApiSession(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const token = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${PROVIDER_SESSION_COOKIE}=`))
    ?.slice(PROVIDER_SESSION_COOKIE.length + 1);
  const session = token ? await decodeProviderToken(token) : null;
  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session, response: null };
}

export async function requireProviderPortalPageSession() {
  const session = await getProviderPortalSession();
  if (!session) {
    redirect("/join-provider-network");
  }
  return session;
}
