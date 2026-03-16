import test from "node:test";
import assert from "node:assert/strict";

function restoreEnv(originalEnv: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (typeof value === "undefined") {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

test("syncLeadToCrm retries with a lean fallback payload when the first SuiteDash contact request fails", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    LEAD_OS_ENABLE_LIVE_SENDS: process.env.LEAD_OS_ENABLE_LIVE_SENDS,
    SUITEDASH_PUBLIC_ID: process.env.SUITEDASH_PUBLIC_ID,
    SUITEDASH_SECRET_KEY: process.env.SUITEDASH_SECRET_KEY,
  };

  process.env.LEAD_OS_ENABLE_LIVE_SENDS = "true";
  process.env.SUITEDASH_PUBLIC_ID = "public-id";
  process.env.SUITEDASH_SECRET_KEY = "secret-key";

  const fetchBodies: Array<Record<string, unknown>> = [];
  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    fetchBodies.push(body);

    if (fetchBodies.length === 1) {
      return new Response(JSON.stringify({ message: "Failed to create contact" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Contact created", data: { id: "contact_123" } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const modulePath = new URL(`../src/lib/providers.ts?crm-fallback-${Date.now()}`, import.meta.url).href;
    const { syncLeadToCrm } = await import(modulePath);
    const result = await syncLeadToCrm({
      firstName: "Polycarp",
      lastName: "Ohu",
      email: "polycarpohu@gmail.com",
      phone: "+15555550123",
      company: "LeadOS",
      service: "emergency-plumbing",
      niche: "plumbing",
      stage: "captured",
      leadKey: "lead-123",
    });

    assert.equal(result.ok, true);
    assert.match(result.detail, /fallback payload/i);
    assert.equal(fetchBodies.length, 2);
    assert.ok("company_name" in fetchBodies[0]);
    assert.ok(!("company_name" in fetchBodies[1]));
    assert.deepEqual(fetchBodies[1], {
      first_name: "Polycarp",
      last_name: "Ohu",
      email: "polycarpohu@gmail.com",
      phone: "+15555550123",
      send_welcome_email: false,
    });
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv(originalEnv);
  }
});

test("emitWorkflowAction retries the default webhook when a mapped n8n webhook fails", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    LEAD_OS_ENABLE_LIVE_SENDS: process.env.LEAD_OS_ENABLE_LIVE_SENDS,
    N8N_BASE_URL: process.env.N8N_BASE_URL,
    N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
  };

  process.env.LEAD_OS_ENABLE_LIVE_SENDS = "true";
  process.env.N8N_BASE_URL = "https://n8n.example.com/api/v1";
  process.env.N8N_WEBHOOK_URL = "https://n8n.example.com/webhook/leados-default";

  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);

    if (url.includes("lead-milestone-3")) {
      return new Response(JSON.stringify({ message: "upstream failure" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const modulePath = new URL(`../src/lib/providers.ts?workflow-fallback-${Date.now()}`, import.meta.url).href;
    const { emitWorkflowAction } = await import(modulePath);
    const result = await emitWorkflowAction("lead.milestone.3", {
      trace: { source: "assessment" },
      metadata: { family: "qualification" },
    });

    assert.equal(result.ok, true);
    assert.match(result.detail, /fallback webhook/i);
    assert.equal(calls.length, 2);
    assert.match(calls[0] ?? "", /lead-milestone-3/);
    assert.equal(calls[1], "https://n8n.example.com/webhook/leados-default");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv(originalEnv);
  }
});
