import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import {
  createMagicLinkUrl,
  decodeOperatorToken,
  getAllowedOperatorEmails as resolveAllowedOperatorEmails,
  getAllowedOperatorRoles,
  isAllowedOperatorEmail as isAllowedOperatorEmailInList,
  issueOperatorToken,
  normalizeEmail,
  type OperatorRole,
  type OperatorTokenPayload,
  resolvePublicOrigin,
  sanitizeNextPath,
} from "./operator-auth-core.ts";
import { sendEmailAction } from "./providers.ts";
import { tenantConfig } from "./tenant.ts";
import { ensureTraceContext } from "./trace.ts";

export const OPERATOR_SESSION_COOKIE = "leados_operator_session";
export { sanitizeNextPath } from "./operator-auth-core.ts";

const OPERATOR_AUTH_CONFIG_ERROR =
  "LeadOS operator auth is not configured. Set LEAD_OS_AUTH_SECRET and LEAD_OS_OPERATOR_EMAILS.";

export class OperatorAuthConfigurationError extends Error {
  constructor(message = OPERATOR_AUTH_CONFIG_ERROR) {
    super(message);
    this.name = "OperatorAuthConfigurationError";
  }
}

export type OperatorSession = OperatorTokenPayload & {
  role: OperatorRole;
};

type PublicOriginOptions = {
  requestUrl?: string;
  host?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
};

export function getOperatorAuthConfigurationStatus() {
  const authSecretConfigured = Boolean(process.env.LEAD_OS_AUTH_SECRET?.trim());
  const operatorEmails = resolveAllowedOperatorEmails(process.env.LEAD_OS_OPERATOR_EMAILS);
  const operatorRoles = getAllowedOperatorRoles(process.env.LEAD_OS_OPERATOR_ROLES, operatorEmails);
  return {
    authSecretConfigured,
    operatorEmailsConfigured: operatorEmails.length > 0,
    ready: authSecretConfigured && operatorEmails.length > 0,
    operatorEmails,
    operatorRoles,
  };
}

function requireOperatorAuthConfiguration() {
  const config = getOperatorAuthConfigurationStatus();
  if (!config.ready) {
    throw new OperatorAuthConfigurationError();
  }
  return config;
}

function getAuthSecret() {
  return requireOperatorAuthConfiguration() && process.env.LEAD_OS_AUTH_SECRET!.trim();
}

export function getAllowedOperatorEmails() {
  return requireOperatorAuthConfiguration().operatorEmails;
}

export function getOperatorRole(email: string): OperatorRole | null {
  const normalizedEmail = normalizeEmail(email);
  return requireOperatorAuthConfiguration().operatorRoles[normalizedEmail] ?? null;
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

export function buildOperatorDestinationUrl(
  nextPath: string,
  options: PublicOriginOptions = {},
  params: Record<string, string | undefined> = {},
) {
  const url = new URL(sanitizeNextPath(nextPath), getOperatorPublicOrigin(options));
  for (const [key, value] of Object.entries(params)) {
    if (value && value.trim().length > 0) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
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
  const normalizedEmail = normalizeEmail(email);
  const role = getOperatorRole(normalizedEmail);
  if (!role) {
    throw new OperatorAuthConfigurationError("Operator role resolution failed.");
  }
  return issueOperatorToken(
    {
      type: "session",
      email: normalizedEmail,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      role,
    },
    getAuthSecret(),
  );
}

function hydrateOperatorSession(payload: OperatorTokenPayload | null): OperatorSession | null {
  if (!payload) {
    return null;
  }
  const role = getOperatorRole(payload.email);
  if (!role) {
    return null;
  }
  return {
    ...payload,
    role,
  };
}

export async function verifyMagicLinkToken(token: string) {
  return hydrateOperatorSession(
    await decodeOperatorToken(token, "magic", getAuthSecret(), getAllowedOperatorEmails()),
  );
}

export async function verifySessionToken(token: string) {
  return hydrateOperatorSession(
    await decodeOperatorToken(token, "session", getAuthSecret(), getAllowedOperatorEmails()),
  );
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

function canAccessRole(
  role: OperatorRole,
  allowedRoles?: OperatorRole[],
) {
  return !allowedRoles || allowedRoles.includes(role);
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

export async function requireOperatorApiSession(
  request: Request,
  options: {
    allowedRoles?: OperatorRole[];
    nextPath?: string;
  } = {},
) {
  requireOperatorAuthConfiguration();
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

  if (!canAccessRole(session.role, options.allowedRoles)) {
    return {
      session,
      response: NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          requiredRoles: options.allowedRoles,
        },
        { status: 403 },
      ),
    };
  }

  return { session, response: null };
}

export async function requireOperatorPageSession(
  nextPath: string,
  options: {
    allowedRoles?: OperatorRole[];
  } = {},
) {
  requireOperatorAuthConfiguration();
  const session = await getOperatorSession();
  if (!session) {
    redirect(buildOperatorAbsoluteUrl(`/auth/sign-in?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`));
  }
  if (!canAccessRole(session.role, options.allowedRoles)) {
    redirect(buildOperatorAbsoluteUrl(`/dashboard?error=forbidden&next=${encodeURIComponent(sanitizeNextPath(nextPath))}`));
  }
  return session;
}
