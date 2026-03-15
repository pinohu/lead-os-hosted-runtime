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
