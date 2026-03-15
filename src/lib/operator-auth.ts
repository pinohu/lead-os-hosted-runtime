import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { embeddedSecrets } from "./embedded-secrets.ts";
import {
  createMagicLinkUrl,
  decodeOperatorToken,
  getAllowedOperatorEmails as resolveAllowedOperatorEmails,
  isAllowedOperatorEmail as isAllowedOperatorEmailInList,
  issueOperatorToken,
  normalizeEmail,
  resolvePublicOrigin,
  sanitizeNextPath,
} from "./operator-auth-core.ts";
import { sendEmailAction } from "./providers.ts";
import { tenantConfig } from "./tenant.ts";
import { ensureTraceContext } from "./trace.ts";

export const OPERATOR_SESSION_COOKIE = "leados_operator_session";
export const OPERATOR_BROWSER_FALLBACK_COOKIE = "leados_operator_browser_fallback";
export { sanitizeNextPath } from "./operator-auth-core.ts";

type PublicOriginOptions = {
  requestUrl?: string;
  host?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
};

function getAuthSecret() {
  return process.env.LEAD_OS_AUTH_SECRET ?? process.env.CRON_SECRET ?? embeddedSecrets.cron.secret;
}

export function getAllowedOperatorEmails() {
  return resolveAllowedOperatorEmails(process.env.LEAD_OS_OPERATOR_EMAILS, [
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
    tenantConfig.supportEmail,
    "polycarpohu@gmail.com",
  ]);
}

export function isAllowedOperatorEmail(email: string) {
  return isAllowedOperatorEmailInList(email, getAllowedOperatorEmails());
}

export function getOperatorPublicOrigin(options: PublicOriginOptions = {}) {
  const protocol = options.forwardedProto?.trim() || "https";
  const forwardedOrigin = options.forwardedHost?.trim()
    ? `${protocol}://${options.forwardedHost.trim()}`
    : undefined;
  const requestOrigin = options.requestUrl
    ? new URL(options.requestUrl).origin
    : undefined;
  const hostOrigin = options.host?.trim()
    ? `${protocol}://${options.host.trim()}`
    : undefined;

  return resolvePublicOrigin(
    [
      forwardedOrigin,
      requestOrigin,
      hostOrigin,
      process.env.NEXT_PUBLIC_SITE_URL,
      tenantConfig.siteUrl,
    ],
    tenantConfig.siteUrl,
  );
}

export function buildOperatorAbsoluteUrl(path: string, options: PublicOriginOptions = {}) {
  return new URL(path, getOperatorPublicOrigin(options)).toString();
}

export async function createMagicLink(email: string, origin: string, nextPath?: string) {
  const { url } = await createMagicLinkUrl(
    email,
    origin,
    getAuthSecret(),
    getAllowedOperatorEmails(),
    nextPath,
  );
  return url;
}

export async function createBrowserFallbackToken(email: string, origin: string, nextPath?: string) {
  const { token } = await createMagicLinkUrl(
    email,
    origin,
    getAuthSecret(),
    getAllowedOperatorEmails(),
    nextPath,
  );
  return token;
}

export async function sendOperatorMagicLink(email: string, origin: string, nextPath?: string) {
  const normalizedEmail = normalizeEmail(email);
  try {
    const magicLink = await createMagicLink(normalizedEmail, origin, nextPath);
    const trace = ensureTraceContext({
      tenant: tenantConfig.tenantId,
      source: "manual",
      service: "operator-auth",
      niche: "operations",
      blueprintId: "operator-auth",
      stepId: "magic-link",
      email: normalizedEmail,
    });

    return await sendEmailAction({
      to: normalizedEmail,
      subject: `${tenantConfig.brandName} operator sign-in link`,
      html: `
        <div style="font-family:Segoe UI,sans-serif;line-height:1.6;color:#0f172a">
          <h1 style="font-size:24px;margin-bottom:12px">${tenantConfig.brandName} operator access</h1>
          <p>Use the secure link below to sign in to the LeadOS operator dashboard.</p>
          <p><a href="${magicLink}" style="display:inline-block;background:#14b8a6;color:#07142b;padding:12px 18px;border-radius:12px;font-weight:700;text-decoration:none">Open operator dashboard</a></p>
          <p>This link expires in 15 minutes and only works for approved operator email addresses.</p>
        </div>
      `,
      trace,
    });
  } catch (error) {
    const detail = error instanceof Error && error.message
      ? `Magic link delivery failed: ${error.message}`
      : "Magic link delivery failed";

    return {
      ok: false,
      provider: "Emailit",
      mode: "live",
      detail,
    } as const;
  }
}

export async function createSessionToken(email: string) {
  return issueOperatorToken(
    {
      type: "session",
      email: normalizeEmail(email),
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    },
    getAuthSecret(),
  );
}

export async function verifyMagicLinkToken(token: string) {
  return decodeOperatorToken(token, "magic", getAuthSecret(), getAllowedOperatorEmails());
}

export async function verifySessionToken(token: string) {
  return decodeOperatorToken(token, "session", getAuthSecret(), getAllowedOperatorEmails());
}

export async function getOperatorSessionFromCookieHeader(cookieHeader?: string | null) {
  const rawCookie = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${OPERATOR_SESSION_COOKIE}=`))
    ?.slice(OPERATOR_SESSION_COOKIE.length + 1);

  if (!rawCookie) return null;
  return verifySessionToken(rawCookie);
}

export async function getOperatorSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(OPERATOR_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function applyOperatorSession(response: NextResponse, token: string) {
  response.cookies.set({
    name: OPERATOR_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export function applyOperatorBrowserFallback(response: NextResponse, token: string) {
  response.cookies.set({
    name: OPERATOR_BROWSER_FALLBACK_COOKIE,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });
}

export function clearOperatorBrowserFallback(response: NextResponse) {
  response.cookies.set({
    name: OPERATOR_BROWSER_FALLBACK_COOKIE,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function clearOperatorSession(response: NextResponse) {
  response.cookies.set({
    name: OPERATOR_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function requireOperatorApiSession(request: Request) {
  const session = await getOperatorSessionFromCookieHeader(request.headers.get("cookie"));
  if (!session) {
    return {
      session: null,
      response: NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          signInUrl: `/auth/sign-in?next=${encodeURIComponent("/dashboard")}`,
        },
        { status: 401 },
      ),
    };
  }

  return { session, response: null };
}

export async function requireOperatorPageSession(nextPath: string) {
  const session = await getOperatorSession();
  if (!session) {
    redirect(buildOperatorAbsoluteUrl(`/auth/sign-in?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`));
  }
  return session;
}
