export type OperatorTokenPayload = {
  type: "magic" | "session";
  email: string;
  exp: number;
  next?: string;
};

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isRealEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function sanitizeNextPath(value?: string | null) {
  if (!value) return "/dashboard";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export function defaultOperatorEmails(candidates: Array<string | undefined | null>) {
  return [
    ...new Set(
      candidates
        .map((value) => value?.trim() ?? "")
        .filter(Boolean)
        .filter((value) => !value.endsWith("@example.com"))
        .map(normalizeEmail),
    ),
  ];
}

export function getAllowedOperatorEmails(
  configured: string | undefined,
  fallbackCandidates: Array<string | undefined | null>,
) {
  const normalizedConfigured = (configured ?? "")
    .split(/[,\n;]/g)
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeEmail)
    .filter(isRealEmail);

  return normalizedConfigured.length > 0
    ? [...new Set(normalizedConfigured)]
    : defaultOperatorEmails(fallbackCandidates);
}

export function isAllowedOperatorEmail(email: string, allowedEmails: string[]) {
  return allowedEmails.includes(normalizeEmail(email));
}

async function signValue(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Buffer.from(signature).toString("base64url");
}

export async function issueOperatorToken(payload: OperatorTokenPayload, secret: string) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = await signValue(body, secret);
  return `${body}.${signature}`;
}

export async function decodeOperatorToken(
  token: string,
  expectedType: OperatorTokenPayload["type"],
  secret: string,
  allowedEmails: string[],
) {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expectedSignature = await signValue(body, secret);
  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OperatorTokenPayload;
    if (payload.type !== expectedType) return null;
    if (payload.exp < Date.now()) return null;
    if (!isAllowedOperatorEmail(payload.email, allowedEmails)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createMagicLinkUrl(
  email: string,
  origin: string,
  secret: string,
  allowedEmails: string[],
  nextPath?: string,
) {
  const token = await issueOperatorToken(
    {
      type: "magic",
      email: normalizeEmail(email),
      exp: Date.now() + 15 * 60 * 1000,
      next: sanitizeNextPath(nextPath),
    },
    secret,
  );
  const url = new URL("/auth/verify", origin);
  url.searchParams.set("token", token);
  url.searchParams.set("next", sanitizeNextPath(nextPath));
  return { url: url.toString(), token };
}
