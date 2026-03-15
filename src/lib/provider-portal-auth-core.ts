import { getDispatchProviderById } from "./runtime-config.ts";

export type ProviderPortalTokenPayload = {
  type: "provider-session";
  providerId: string;
  email: string;
  exp: number;
};

export function normalizeProviderEmail(value: string) {
  return value.trim().toLowerCase();
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

export async function issueProviderPortalToken(payload: ProviderPortalTokenPayload, secret: string) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = await signValue(body, secret);
  return `${body}.${signature}`;
}

export async function decodeProviderPortalToken(token: string, secret: string) {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expectedSignature = await signValue(body, secret);
  if (expectedSignature !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ProviderPortalTokenPayload;
    if (payload.type !== "provider-session" || payload.exp < Date.now()) {
      return null;
    }
    const provider = await getDispatchProviderById(payload.providerId);
    if (!provider || provider.contactEmail !== normalizeProviderEmail(payload.email)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
