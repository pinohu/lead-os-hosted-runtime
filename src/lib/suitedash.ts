import { embeddedSecrets } from "./embedded-secrets.ts";

const SD_API = "https://app.suitedash.com/secure-api";

function stripQuotes(val: string): string {
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    return val.slice(1, -1);
  }
  return val;
}

function getHeaders(): Record<string, string> {
  const publicId = stripQuotes(process.env.SUITEDASH_PUBLIC_ID ?? embeddedSecrets.suitedash.publicId);
  const secretKey = stripQuotes(process.env.SUITEDASH_SECRET_KEY ?? embeddedSecrets.suitedash.secretKey);

  if (!publicId || !secretKey) {
    throw new Error("Missing SuiteDash credentials");
  }

  return {
    "X-Public-ID": publicId,
    "X-Secret-Key": secretKey,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export interface SuiteDashContactPayload {
  first_name: string;
  last_name: string;
  email: string;
  role?: string;
  company_name?: string;
  phone?: string;
  tags?: string[];
  notes?: string[];
  send_welcome_email?: boolean;
}

export async function createContact(payload: SuiteDashContactPayload) {
  const res = await fetch(`${SD_API}/contact`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok && !String(data?.message ?? "").toLowerCase().includes("already exists")) {
    throw new Error(String(data?.message ?? "Failed to create contact"));
  }

  return {
    success: true,
    message: String(data?.message ?? (res.ok ? "Contact created" : "Contact already exists")),
    data: data?.data,
  };
}
