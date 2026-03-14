import { embeddedSecrets } from "./embedded-secrets.ts";

type TemplateOption = {
  label: string;
  value: string;
};

export type TrafftServiceOption = {
  id: string;
  label: string;
  slug?: string;
  durationMinutes?: number;
  durationLabel?: string;
  priceLabel?: string;
  capacityLabel?: string;
  source: "admin" | "public";
};

type JsonResponse = {
  ok: boolean;
  status: number;
  json: unknown;
};

function getEnvValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function getStringValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
}

function getNumberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function getDocumenteroApiKey() {
  return getEnvValue("DOCUMENTERO_API_KEY") ?? embeddedSecrets.documentero.apiKey;
}

function getTrafftApiUrl() {
  return (getEnvValue("TRAFFT_API_URL", "TRAFFT_BASE_URL") ?? embeddedSecrets.trafft.apiUrl)?.replace(/\/+$/, "");
}

function getTrafftBookingUrl(explicitPublicBookingUrl?: string) {
  return explicitPublicBookingUrl
    ?? getEnvValue("TRAFFT_BOOKING_URL", "TRAFFT_PUBLIC_BOOKING_URL", "TRAFFT_EVENT_LINK");
}

function getTrafftBearerToken() {
  return getEnvValue("TRAFFT_BEARER_TOKEN", "TRAFFT_API_TOKEN", "TRAFFT_ACCESS_TOKEN");
}

function getTrafftClientId() {
  return getEnvValue("TRAFFT_CLIENT_ID") ?? embeddedSecrets.trafft.clientId;
}

function getTrafftClientSecret() {
  return getEnvValue("TRAFFT_CLIENT_SECRET") ?? embeddedSecrets.trafft.clientSecret;
}

function getTrafftAuthEndpoints() {
  const apiUrl = getTrafftApiUrl();
  if (!apiUrl) {
    return [] as string[];
  }

  return [
    `${apiUrl}/api/v1/auth/token`,
    `${apiUrl}/auth/token`,
  ];
}

function buildTrafftPublicOrigin(explicitPublicBookingUrl?: string) {
  const bookingUrl = getTrafftBookingUrl(explicitPublicBookingUrl);
  if (bookingUrl) {
    try {
      return new URL(bookingUrl).origin.replace(/\/+$/, "");
    } catch {
      // Ignore invalid URLs and fall back to the admin hostname transform.
    }
  }

  const apiUrl = getTrafftApiUrl();
  if (!apiUrl) {
    return undefined;
  }

  try {
    const parsed = new URL(apiUrl);
    parsed.hostname = parsed.hostname.replace(".admin.", ".");
    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.origin.replace(/\/+$/, "");
  } catch {
    return undefined;
  }
}

async function requestJson(url: string, init: RequestInit = {}): Promise<JsonResponse> {
  const response = await fetch(url, {
    ...init,
    headers: init.headers,
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

async function getJson(url: string, headers: Record<string, string> = {}) {
  return requestJson(url, {
    headers,
  });
}

async function postJson(url: string, body: Record<string, string>, headers: Record<string, string> = {}) {
  return requestJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function postForm(url: string, body: Record<string, string>, headers: Record<string, string> = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    params.set(key, value);
  }

  return requestJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body: params.toString(),
  });
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function extractTrafftAccessToken(value: unknown) {
  const record = asRecord(value);
  const nestedData = asRecord(record?.data);
  return getStringValue(
    record?.access_token,
    record?.accessToken,
    record?.token,
    nestedData?.access_token,
    nestedData?.accessToken,
    nestedData?.token,
  );
}

function buildTrafftBasicAuthHeader(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

async function requestTrafftBearerToken() {
  const directToken = getTrafftBearerToken();
  if (directToken) {
    return directToken;
  }

  const clientId = getTrafftClientId();
  const clientSecret = getTrafftClientSecret();
  if (!clientId || !clientSecret) {
    return undefined;
  }

  for (const endpoint of getTrafftAuthEndpoints()) {
    const attempts = [
      async () => postJson(endpoint, {
        clientId,
        clientSecret,
        grantType: "client_credentials",
      }),
      async () => postJson(endpoint, {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
      async () => postForm(endpoint, {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
      async () => postForm(
        endpoint,
        {
          grant_type: "client_credentials",
        },
        {
          Authorization: buildTrafftBasicAuthHeader(clientId, clientSecret),
        },
      ),
    ];

    for (const attempt of attempts) {
      try {
        const response = await attempt();
        const token = extractTrafftAccessToken(response.json);
        if (response.ok && token) {
          return token;
        }
      } catch {
        continue;
      }
    }
  }

  return undefined;
}

async function getTrafftAuthHeaders(): Promise<Record<string, string>> {
  const token = await requestTrafftBearerToken();
  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

function collectResponseCollections(value: unknown, depth = 0, results: unknown[][] = []) {
  if (depth > 4 || value == null) {
    return results;
  }

  if (Array.isArray(value)) {
    results.push(value);
    for (const entry of value.slice(0, 4)) {
      collectResponseCollections(entry, depth + 1, results);
    }
    return results;
  }

  const record = asRecord(value);
  if (!record) {
    return results;
  }

  for (const key of ["data", "services", "items", "results", "rows", "collection", "payload", "response"]) {
    if (key in record) {
      collectResponseCollections(record[key], depth + 1, results);
    }
  }

  return results;
}

function formatCompactNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, "");
}

function formatDuration(minutes: number) {
  if (minutes >= 60 && minutes % 60 === 0) {
    return `${minutes / 60}h`;
  }
  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

function formatPriceLabel(minPrice?: number, maxPrice?: number) {
  if (typeof minPrice !== "number") {
    return undefined;
  }

  if (typeof maxPrice === "number" && maxPrice !== minPrice) {
    return `Price ${formatCompactNumber(minPrice)}-${formatCompactNumber(maxPrice)}`;
  }

  return `Price ${formatCompactNumber(minPrice)}`;
}

function formatCapacityLabel(minCapacity?: number, maxCapacity?: number) {
  if (typeof minCapacity !== "number") {
    return undefined;
  }

  if (typeof maxCapacity === "number" && maxCapacity !== minCapacity) {
    return `Capacity ${formatCompactNumber(minCapacity)}-${formatCompactNumber(maxCapacity)}`;
  }

  return `Capacity ${formatCompactNumber(minCapacity)}`;
}

function normalizeTrafftService(entry: unknown, source: "admin" | "public") {
  const record = asRecord(entry);
  if (!record) {
    return undefined;
  }

  const id = getStringValue(record.id, record.serviceId, record.uuid, record._id);
  const label = getStringValue(record.name, record.title, record.label);
  if (!id || !label) {
    return undefined;
  }

  const slug = getStringValue(record.slug, record.alias);
  const rawDuration = getNumberValue(record.duration ?? record.durationSeconds ?? record.durationInSeconds);
  const durationMinutes =
    typeof rawDuration === "number"
      ? Math.max(1, Math.round(rawDuration >= 240 ? rawDuration / 60 : rawDuration))
      : undefined;
  const minPrice = getNumberValue(record.minEmployeePrice ?? record.minPrice ?? record.price ?? record.amount);
  const maxPrice = getNumberValue(record.maxEmployeePrice ?? record.maxPrice);
  const minCapacity = getNumberValue(record.minCapacity ?? record.capacityMin ?? record.capacity);
  const maxCapacity = getNumberValue(record.maxCapacity ?? record.capacityMax ?? record.capacity);

  return {
    id,
    label,
    slug,
    durationMinutes,
    durationLabel: typeof durationMinutes === "number" ? formatDuration(durationMinutes) : undefined,
    priceLabel: formatPriceLabel(minPrice, maxPrice),
    capacityLabel: formatCapacityLabel(minCapacity, maxCapacity),
    source,
  } satisfies TrafftServiceOption;
}

function extractTrafftServices(body: unknown, source: "admin" | "public") {
  const discovered = new Map<string, TrafftServiceOption>();

  for (const collection of collectResponseCollections(body)) {
    for (const entry of collection) {
      const service = normalizeTrafftService(entry, source);
      if (!service) {
        continue;
      }

      const existing = discovered.get(service.id);
      if (!existing || (existing.source === "public" && service.source === "admin")) {
        discovered.set(service.id, service);
      }
    }
  }

  return [...discovered.values()].sort((left, right) => left.label.localeCompare(right.label));
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

  const headers = await getTrafftAuthHeaders();
  const attempts: Record<string, string>[] = Object.keys(headers).length > 0
    ? [headers, {}]
    : [{}];

  for (const attemptHeaders of attempts) {
    const response = await getJson(`${apiUrl}/api/v1/common/tenant-data`, attemptHeaders);
    if (!response.ok) {
      continue;
    }

    const data = asRecord(response.json);
    if (!data) {
      continue;
    }

    return {
      tenantId: typeof data.tenantId === "string" ? data.tenantId : undefined,
      tenantName: typeof data.tenantName === "string" ? data.tenantName : undefined,
    };
  }

  return null;
}

export async function discoverTrafftServices(explicitPublicBookingUrl?: string) {
  const apiUrl = getTrafftApiUrl();
  const publicOrigin = buildTrafftPublicOrigin(explicitPublicBookingUrl);
  const authHeaders = await getTrafftAuthHeaders();
  const candidates: Array<{ source: "admin" | "public"; url?: string; headers?: Record<string, string> }> = [
    { source: "admin", url: apiUrl ? `${apiUrl}/api/v1/services?limit=200` : undefined, headers: authHeaders },
    { source: "admin", url: apiUrl ? `${apiUrl}/api/v1/services` : undefined, headers: authHeaders },
    { source: "admin", url: apiUrl ? `${apiUrl}/api/v1/services?page=1&perPage=200` : undefined, headers: authHeaders },
    { source: "public", url: publicOrigin ? `${publicOrigin}/api/v1/public/services?limit=200` : undefined },
    { source: "public", url: publicOrigin ? `${publicOrigin}/api/v1/public/services` : undefined },
  ];

  for (const candidate of candidates) {
    if (!candidate.url) {
      continue;
    }

    try {
      const response = await getJson(candidate.url, candidate.headers);
      if (!response.ok) {
        continue;
      }

      const services = extractTrafftServices(response.json, candidate.source);
      if (services.length > 0) {
        return services;
      }
    } catch {
      continue;
    }
  }

  return [] as TrafftServiceOption[];
}
