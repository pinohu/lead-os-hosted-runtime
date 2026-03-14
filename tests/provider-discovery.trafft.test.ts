import test from "node:test";
import assert from "node:assert/strict";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function getHeaderValue(headers: HeadersInit | undefined, key: string) {
  if (!headers) {
    return undefined;
  }

  if (headers instanceof Headers) {
    return headers.get(key) ?? undefined;
  }

  if (Array.isArray(headers)) {
    const match = headers.find(([headerKey]) => headerKey.toLowerCase() === key.toLowerCase());
    return match?.[1];
  }

  const match = Object.entries(headers).find(([headerKey]) => headerKey.toLowerCase() === key.toLowerCase());
  return match?.[1];
}

test("discoverTrafftServices normalizes admin service catalog responses", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    TRAFFT_API_URL: process.env.TRAFFT_API_URL,
    TRAFFT_BEARER_TOKEN: process.env.TRAFFT_BEARER_TOKEN,
    TRAFFT_CLIENT_ID: process.env.TRAFFT_CLIENT_ID,
    TRAFFT_CLIENT_SECRET: process.env.TRAFFT_CLIENT_SECRET,
    TRAFFT_PUBLIC_BOOKING_URL: process.env.TRAFFT_PUBLIC_BOOKING_URL,
  };

  let authorizationHeader = "";

  process.env.TRAFFT_API_URL = "https://tenant.admin.example.com";
  process.env.TRAFFT_BEARER_TOKEN = "secret-token";
  process.env.TRAFFT_CLIENT_ID = "";
  process.env.TRAFFT_CLIENT_SECRET = "";
  process.env.TRAFFT_PUBLIC_BOOKING_URL = "";

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    authorizationHeader = getHeaderValue(init?.headers, "Authorization") ?? authorizationHeader;

    if (url === "https://tenant.admin.example.com/api/v1/services?limit=200") {
      return jsonResponse({
        data: [
          {
            id: 17,
            name: "Strategy Call",
            slug: "strategy-call",
            duration: 1800,
            minEmployeePrice: 25,
            maxEmployeePrice: 25,
            minCapacity: 1,
            maxCapacity: 1,
          },
        ],
      });
    }

    return jsonResponse({ message: `Unhandled URL ${url}` }, 404);
  };

  try {
    const modulePath = new URL(`../src/lib/provider-discovery.ts?admin-${Date.now()}`, import.meta.url).href;
    const { discoverTrafftServices } = await import(modulePath);
    const services = await discoverTrafftServices();

    assert.equal(authorizationHeader, "Bearer secret-token");
    assert.deepEqual(services, [
      {
        id: "17",
        label: "Strategy Call",
        slug: "strategy-call",
        durationMinutes: 30,
        durationLabel: "30m",
        priceLabel: "Price 25",
        capacityLabel: "Capacity 1",
        source: "admin",
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;

    for (const [key, value] of Object.entries(originalEnv)) {
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});

test("discoverTrafftServices falls back to the public booking origin when admin discovery fails", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    TRAFFT_API_URL: process.env.TRAFFT_API_URL,
    TRAFFT_BEARER_TOKEN: process.env.TRAFFT_BEARER_TOKEN,
    TRAFFT_CLIENT_ID: process.env.TRAFFT_CLIENT_ID,
    TRAFFT_CLIENT_SECRET: process.env.TRAFFT_CLIENT_SECRET,
    TRAFFT_PUBLIC_BOOKING_URL: process.env.TRAFFT_PUBLIC_BOOKING_URL,
  };

  process.env.TRAFFT_API_URL = "https://tenant.admin.example.com";
  process.env.TRAFFT_BEARER_TOKEN = "";
  process.env.TRAFFT_CLIENT_ID = "";
  process.env.TRAFFT_CLIENT_SECRET = "";
  process.env.TRAFFT_PUBLIC_BOOKING_URL = "";

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url.startsWith("https://tenant.admin.example.com/api/v1/services")) {
      return jsonResponse({ message: "Not found" }, 404);
    }

    if (url === "https://tenant.example.com/api/v1/public/services?limit=200") {
      return jsonResponse({
        data: {
          services: [
            {
              serviceId: "srv_public",
              title: "Public Booking Session",
              slug: "public-booking-session",
              duration: 3600,
              price: 50,
              capacity: 5,
            },
          ],
        },
      });
    }

    return jsonResponse({ message: `Unhandled URL ${url}` }, 404);
  };

  try {
    const modulePath = new URL(`../src/lib/provider-discovery.ts?public-${Date.now()}`, import.meta.url).href;
    const { discoverTrafftServices } = await import(modulePath);
    const services = await discoverTrafftServices("https://tenant.example.com/book/demo");

    assert.deepEqual(services, [
      {
        id: "srv_public",
        label: "Public Booking Session",
        slug: "public-booking-session",
        durationMinutes: 60,
        durationLabel: "1h",
        priceLabel: "Price 50",
        capacityLabel: "Capacity 5",
        source: "public",
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;

    for (const [key, value] of Object.entries(originalEnv)) {
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});
