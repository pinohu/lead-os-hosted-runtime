import test from "node:test";
import assert from "node:assert/strict";

type FetchCall = {
  url: string;
  method: string;
  body?: unknown;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

test("createBookingAction submits a live Trafft public booking when an available slot exists", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    LEAD_OS_ENABLE_LIVE_SENDS: process.env.LEAD_OS_ENABLE_LIVE_SENDS,
    LEAD_OS_ALLOW_EMBEDDED_SECRETS: process.env.LEAD_OS_ALLOW_EMBEDDED_SECRETS,
    TRAFFT_API_URL: process.env.TRAFFT_API_URL,
    TRAFFT_PUBLIC_BOOKING_URL: process.env.TRAFFT_PUBLIC_BOOKING_URL,
    TRAFFT_DEFAULT_SERVICE_ID: process.env.TRAFFT_DEFAULT_SERVICE_ID,
    TRAFFT_CLIENT_ID: process.env.TRAFFT_CLIENT_ID,
    TRAFFT_CLIENT_SECRET: process.env.TRAFFT_CLIENT_SECRET,
    TRAFFT_BEARER_TOKEN: process.env.TRAFFT_BEARER_TOKEN,
  };

  const calls: FetchCall[] = [];

  process.env.LEAD_OS_ENABLE_LIVE_SENDS = "true";
  process.env.LEAD_OS_ALLOW_EMBEDDED_SECRETS = "false";
  process.env.TRAFFT_API_URL = "https://yourdeputy.admin.wlbookings.com";
  process.env.TRAFFT_PUBLIC_BOOKING_URL = "https://yourdeputy.wlbookings.com/book/demo";
  process.env.TRAFFT_DEFAULT_SERVICE_ID = "service_123";
  process.env.TRAFFT_CLIENT_ID = "";
  process.env.TRAFFT_CLIENT_SECRET = "";
  process.env.TRAFFT_BEARER_TOKEN = "";

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    let parsedBody: unknown;
    if (typeof init?.body === "string" && init.body.length > 0) {
      try {
        parsedBody = JSON.parse(init.body);
      } catch {
        parsedBody = init.body;
      }
    }

    calls.push({ url, method, body: parsedBody });

    if (url.endsWith("/api/v1/common/tenant-data")) {
      return jsonResponse({
        tenantId: "tenant_123",
        tenantName: "YourDeputy",
      });
    }

    if (url.includes("/api/v1/public/booking/steps/date-time")) {
      return jsonResponse({
        "2026-03-20": {
          "10:00": {
            start: "10:00",
            end: "10:30",
            bookingStart: "2026-03-20 10:00",
          },
        },
      });
    }

    if (url.endsWith("/api/v1/public/booking")) {
      return jsonResponse({
        appointmentId: "appt_123",
        status: "confirmed",
      });
    }

    return jsonResponse({ message: `Unhandled URL ${url}` }, 404);
  };

  try {
    const modulePath = new URL(`../src/lib/providers.ts?trafft-public-${Date.now()}`, import.meta.url).href;
    const { createBookingAction } = await import(modulePath);
    const result = await createBookingAction({
      firstName: "Jane",
      lastName: "Lead",
      email: "jane@example.com",
      phone: "+1 555 555 1234",
      service: "Strategy Call",
      desiredDate: "2026-03-20",
      desiredTime: "10:00",
    });

    assert.equal(result.ok, true);
    assert.equal(result.provider, "Trafft");
    assert.equal(result.mode, "live");
    assert.match(result.detail, /submitted/i);
    const availabilityCall = calls.find((call) => /\/api\/v1\/public\/booking\/steps\/date-time/.test(call.url));
    const submitCall = calls.find((call) => /\/api\/v1\/public\/booking$/.test(call.url));

    assert.ok(availabilityCall);
    assert.ok(submitCall);
    assert.equal((submitCall?.body as Record<string, unknown>)?.selectedDate, "2026-03-20");
    assert.equal((submitCall?.body as Record<string, unknown>)?.selectedTime, "10:00");
    assert.equal(((submitCall?.body as Record<string, unknown>)?.customer as Record<string, unknown>)?.email, "jane@example.com");
    assert.equal(((submitCall?.body as Record<string, unknown>)?.customer as Record<string, unknown>)?.phoneCountryCode, "US");
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
