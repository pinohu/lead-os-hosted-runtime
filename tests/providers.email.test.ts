import test from "node:test";
import assert from "node:assert/strict";

test("sendEmailAction returns a graceful failure when delivery throws", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    LEAD_OS_ENABLE_LIVE_SENDS: process.env.LEAD_OS_ENABLE_LIVE_SENDS,
    LEAD_OS_ALLOW_EMBEDDED_SECRETS: process.env.LEAD_OS_ALLOW_EMBEDDED_SECRETS,
    EMAILIT_API_KEY: process.env.EMAILIT_API_KEY,
    NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  };

  process.env.LEAD_OS_ENABLE_LIVE_SENDS = "true";
  process.env.LEAD_OS_ALLOW_EMBEDDED_SECRETS = "false";
  process.env.EMAILIT_API_KEY = "emailit-live-key";
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL = "support@yourdeputy.com";

  globalThis.fetch = async () => {
    throw new Error("connect EHOSTUNREACH");
  };

  try {
    const modulePath = new URL(`../src/lib/providers.ts?email-${Date.now()}`, import.meta.url).href;
    const { sendEmailAction } = await import(modulePath);
    const result = await sendEmailAction({
      to: "polycarpohu@gmail.com",
      subject: "Operator sign-in",
      html: "<p>Test</p>",
      trace: {
        tenant: "default-tenant",
        source: "manual",
        service: "operator-auth",
        niche: "operations",
        blueprintId: "operator-auth",
        stepId: "magic-link",
      },
    });

    assert.equal(result.ok, false);
    assert.equal(result.provider, "Emailit");
    assert.match(result.detail, /email failed/i);
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

test("sendEmailAction uses the documented Emailit send endpoint and derives a verified-domain sender when support email is consumer-hosted", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    LEAD_OS_ENABLE_LIVE_SENDS: process.env.LEAD_OS_ENABLE_LIVE_SENDS,
    LEAD_OS_ALLOW_EMBEDDED_SECRETS: process.env.LEAD_OS_ALLOW_EMBEDDED_SECRETS,
    EMAILIT_API_KEY: process.env.EMAILIT_API_KEY,
    NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    LEAD_OS_FROM_EMAIL: process.env.LEAD_OS_FROM_EMAIL,
  };

  process.env.LEAD_OS_ENABLE_LIVE_SENDS = "true";
  process.env.LEAD_OS_ALLOW_EMBEDDED_SECRETS = "false";
  process.env.EMAILIT_API_KEY = "emailit-live-key";
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL = "polycarpohu@gmail.com";
  process.env.NEXT_PUBLIC_SITE_URL = "https://leados.yourdeputy.com";
  delete process.env.LEAD_OS_FROM_EMAIL;

  const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    fetchCalls.push({
      url: String(input),
      init,
    });

    return new Response(JSON.stringify({ id: "email_123" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const modulePath = new URL(`../src/lib/providers.ts?email-success-${Date.now()}`, import.meta.url).href;
    const { sendEmailAction } = await import(modulePath);
    const result = await sendEmailAction({
      to: "polycarpohu@gmail.com",
      subject: "Operator sign-in",
      html: "<p>Test</p>",
      trace: {
        leadKey: "email:polycarpohu@gmail.com",
        tenant: "default-tenant",
        source: "manual",
        service: "operator-auth",
        niche: "operations",
        blueprintId: "operator-auth",
        stepId: "magic-link",
      },
    });

    assert.equal(result.ok, true);
    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0]?.url, "https://api.emailit.com/v1/emails");

    const body = JSON.parse(String(fetchCalls[0]?.init?.body ?? "{}")) as Record<string, unknown>;
    assert.equal(body.reply_to, "polycarpohu@gmail.com");
    assert.equal(body.from, "Lead OS Hosted <hello@yourdeputy.com>");
    assert.equal(body.text, "Test");
    assert.ok("headers" in body);
    assert.ok(!("metadata" in body));
    assert.ok(!("meta" in body));
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

test("sendEmailAction retries with alternate sender shapes when the first Emailit payload is rejected", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    LEAD_OS_ENABLE_LIVE_SENDS: process.env.LEAD_OS_ENABLE_LIVE_SENDS,
    LEAD_OS_ALLOW_EMBEDDED_SECRETS: process.env.LEAD_OS_ALLOW_EMBEDDED_SECRETS,
    EMAILIT_API_KEY: process.env.EMAILIT_API_KEY,
    NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    LEAD_OS_FROM_EMAIL: process.env.LEAD_OS_FROM_EMAIL,
  };

  process.env.LEAD_OS_ENABLE_LIVE_SENDS = "true";
  process.env.LEAD_OS_ALLOW_EMBEDDED_SECRETS = "false";
  process.env.EMAILIT_API_KEY = "emailit-live-key";
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL = "polycarpohu@gmail.com";
  process.env.NEXT_PUBLIC_SITE_URL = "https://leados.yourdeputy.com";
  delete process.env.LEAD_OS_FROM_EMAIL;

  const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    fetchCalls.push({
      url: String(input),
      init,
    });

    if (fetchCalls.length === 1) {
      return new Response(JSON.stringify({ message: "Sender rejected" }), {
        status: 422,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ id: "email_456" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const modulePath = new URL(`../src/lib/providers.ts?email-fallback-${Date.now()}`, import.meta.url).href;
    const { sendEmailAction } = await import(modulePath);
    const result = await sendEmailAction({
      to: "polycarpohu@gmail.com",
      subject: "Operator sign-in",
      html: "<p>Test</p>",
      trace: {
        leadKey: "email:polycarpohu@gmail.com",
        tenant: "default-tenant",
        source: "manual",
        service: "operator-auth",
        niche: "operations",
        blueprintId: "operator-auth",
        stepId: "magic-link",
      },
    });

    assert.equal(result.ok, true);
    assert.equal(fetchCalls.length, 2);

    const firstBody = JSON.parse(String(fetchCalls[0]?.init?.body ?? "{}")) as Record<string, unknown>;
    const secondBody = JSON.parse(String(fetchCalls[1]?.init?.body ?? "{}")) as Record<string, unknown>;
    assert.equal(firstBody.from, "Lead OS Hosted <hello@yourdeputy.com>");
    assert.equal(secondBody.from, "Lead OS Hosted <hello@yourdeputy.com>");
    assert.ok("headers" in firstBody);
    assert.ok(!("headers" in secondBody));
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

test("sendEmailAction retries after a temporary Emailit rate limit", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    LEAD_OS_ENABLE_LIVE_SENDS: process.env.LEAD_OS_ENABLE_LIVE_SENDS,
    LEAD_OS_ALLOW_EMBEDDED_SECRETS: process.env.LEAD_OS_ALLOW_EMBEDDED_SECRETS,
    EMAILIT_API_KEY: process.env.EMAILIT_API_KEY,
    NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  };

  process.env.LEAD_OS_ENABLE_LIVE_SENDS = "true";
  process.env.LEAD_OS_ALLOW_EMBEDDED_SECRETS = "false";
  process.env.EMAILIT_API_KEY = "emailit-live-key";
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL = "support@yourdeputy.com";
  process.env.NEXT_PUBLIC_SITE_URL = "https://leados.yourdeputy.com";

  let callCount = 0;
  globalThis.fetch = async () => {
    callCount += 1;
    if (callCount === 1) {
      return new Response(JSON.stringify({
        error: "Rate limit exceeded",
        retry_after: 0,
      }), {
        status: 429,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ id: "email_789" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const modulePath = new URL(`../src/lib/providers.ts?email-rate-limit-${Date.now()}`, import.meta.url).href;
    const { sendEmailAction } = await import(modulePath);
    const result = await sendEmailAction({
      to: "polycarpohu@gmail.com",
      subject: "Operator sign-in",
      html: "<p>Test</p>",
      trace: {
        leadKey: "email:polycarpohu@gmail.com",
        tenant: "default-tenant",
        source: "manual",
        service: "operator-auth",
        niche: "operations",
        blueprintId: "operator-auth",
        stepId: "magic-link",
      },
    });

    assert.equal(result.ok, true);
    assert.equal(callCount, 2);
    assert.match(result.detail, /provider retry/i);
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
