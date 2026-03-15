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

function isPrivateHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized === "localhost" || normalized === "0.0.0.0" || normalized.endsWith(".local")) {
    return true;
  }
  if (/^127\.\d+\.\d+\.\d+$/.test(normalized)) {
    return true;
  }
  if (/^10\.\d+\.\d+\.\d+$/.test(normalized)) {
    return true;
  }
  if (/^192\.168\.\d+\.\d+$/.test(normalized)) {
    return true;
  }

  const private172Match = normalized.match(/^172\.(\d+)\.\d+\.\d+$/);
  if (private172Match) {
    const secondOctet = Number(private172Match[1]);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  return false;
}

export function resolvePublicOrigin(candidates: Array<string | undefined | null>, fallback: string) {
  for (const candidate of candidates) {
    if (!candidate) continue;

    try {
      const parsed = new URL(candidate);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        continue;
      }
      if (isPrivateHostname(parsed.hostname)) {
        continue;
      }
      return parsed.origin;
    } catch {
      continue;
    }
  }

  return fallback;
}

export function getAllowedOperatorEmails(configured: string | undefined) {
  const normalizedConfigured = (configured ?? "")
    .split(/[,\n;]/g)
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeEmail)
    .filter(isRealEmail);

  return [...new Set(normalizedConfigured)];
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
