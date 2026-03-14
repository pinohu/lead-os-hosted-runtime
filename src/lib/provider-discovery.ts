import { embeddedSecrets } from "./embedded-secrets.ts";

type TemplateOption = {
  label: string;
  value: string;
};

function getDocumenteroApiKey() {
  return process.env.DOCUMENTERO_API_KEY ?? embeddedSecrets.documentero.apiKey;
}

function getTrafftApiUrl() {
  return (process.env.TRAFFT_API_URL ?? process.env.TRAFFT_BASE_URL ?? embeddedSecrets.trafft.apiUrl)?.replace(/\/+$/, "");
}

async function getJson(url: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    headers,
    cache: "no-store",
  });
  const text = await response.text();
  try {
    return {
      ok: response.ok,
      status: response.status,
      json: JSON.parse(text) as unknown,
    };
  } catch {
    return {
      ok: response.ok,
      status: response.status,
      json: null as unknown,
    };
  }
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

export async function discoverDocumenteroTemplates() {
  const apiKey = getDocumenteroApiKey();
  if (!apiKey) {
    return [] as TemplateOption[];
  }

  const response = await getJson("https://app.documentero.com/api/templates", {
    Authorization: `apiKey ${apiKey}`,
  });
  if (!response.ok) {
    return [] as TemplateOption[];
  }

  const body = asRecord(response.json);
  const data = Array.isArray(body?.data) ? body.data : [];
  return data
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => ({
      label: typeof entry.label === "string" ? entry.label : "Unnamed template",
      value: typeof entry.value === "string" ? entry.value : "",
    }))
    .filter((entry) => entry.value.length > 0);
}

export async function discoverTrafftTenant() {
  const apiUrl = getTrafftApiUrl();
  if (!apiUrl) {
    return null;
  }

  const response = await getJson(`${apiUrl}/api/v1/common/tenant-data`);
  if (!response.ok) {
    return null;
  }

  const data = asRecord(response.json);
  if (!data) {
    return null;
  }

  return {
    tenantId: typeof data.tenantId === "string" ? data.tenantId : undefined,
    tenantName: typeof data.tenantName === "string" ? data.tenantName : undefined,
  };
}
