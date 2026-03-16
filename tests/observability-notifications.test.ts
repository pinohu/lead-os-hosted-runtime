import test from "node:test";
import assert from "node:assert/strict";
import { dispatchObservabilityNotifications } from "../src/lib/observability-notifications.ts";
import type { ObservabilityRuleResult } from "../src/lib/operator-observability.ts";
import type { OperationalRuntimeConfig } from "../src/lib/runtime-config.ts";

function createConfig(): OperationalRuntimeConfig {
  return {
    observability: {
      notifications: {
        defaultChannel: "email",
        cooldownMinutes: 30,
        recipients: [
          {
            id: "ops-email",
            label: "Ops Email",
            active: true,
            email: "ops@example.com",
            channels: ["email"],
            ruleIds: ["execution-failures"],
          },
          {
            id: "dispatch-sms",
            label: "Dispatch SMS",
            active: true,
            phone: "+15555550123",
            channels: ["sms", "whatsapp"],
            ruleIds: ["provider-response-latency"],
          },
        ],
      },
    },
    trafft: {
      serviceMap: {},
    },
    dispatch: {
      providers: [],
    },
    marketplace: {
      zipLeadAcquisitionCosts: {},
    },
    documentero: {},
    crove: {},
  };
}

function createRule(overrides: Partial<ObservabilityRuleResult> = {}): ObservabilityRuleResult {
  return {
    id: "execution-failures",
    title: "Execution failure threshold",
    severity: "danger",
    thresholdLabel: "Trigger when any execution task fails",
    currentLabel: "2 failed execution tasks",
    triggered: true,
    notificationChannel: "email",
    resolution: "Inspect the execution queue.",
    href: "/dashboard/execution?status=failed",
    ...overrides,
  };
}

test("dispatchObservabilityNotifications routes alerts to matching recipients and channels", async () => {
  const config = createConfig();
  const outcomes: Array<{ channel: string; to: string }> = [];
  const records: Array<{ ruleId: string; recipientId: string; status: string }> = [];

  const result = await dispatchObservabilityNotifications(
    [
      createRule(),
      createRule({
        id: "provider-response-latency",
        title: "Provider response latency threshold",
        notificationChannel: "sms",
        currentLabel: "4 provider responses pending",
        href: "/dashboard?focus=provider-requests",
      }),
    ],
    config,
    {
      senders: {
        email: async (payload) => {
          outcomes.push({ channel: "email", to: payload.to });
          return { ok: true, provider: "Emailit", mode: "live", detail: "Email sent" };
        },
        sms: async (payload) => {
          outcomes.push({ channel: "sms", to: payload.phone });
          return { ok: true, provider: "Easy Text Marketing", mode: "live", detail: "SMS sent" };
        },
        whatsapp: async (payload) => {
          outcomes.push({ channel: "whatsapp", to: payload.phone });
          return { ok: true, provider: "WbizTool", mode: "live", detail: "WhatsApp sent" };
        },
      },
      getDeliveries: async () => [],
      recordDelivery: async (record) => {
        records.push({
          ruleId: record.ruleId,
          recipientId: record.recipientId,
          status: record.status,
        });
        return {
          id: record.id ?? "delivery-id",
          createdAt: record.createdAt ?? new Date().toISOString(),
          ...record,
        };
      },
      now: () => new Date("2026-03-15T13:00:00Z"),
    },
  );

  assert.deepEqual(outcomes, [
    { channel: "email", to: "ops@example.com" },
    { channel: "sms", to: "+15555550123" },
  ]);
  assert.equal(result.length, 2);
  assert.equal(result.every((entry) => entry.status === "sent"), true);
  assert.deepEqual(records.map((entry) => entry.recipientId), ["ops-email", "dispatch-sms"]);
});

test("dispatchObservabilityNotifications suppresses alerts during cooldown windows", async () => {
  const config = createConfig();
  let sent = 0;

  const result = await dispatchObservabilityNotifications(
    [createRule()],
    config,
    {
      senders: {
        email: async () => {
          sent += 1;
          return { ok: true, provider: "Emailit", mode: "live", detail: "Email sent" };
        },
        sms: async () => ({ ok: true, provider: "Easy Text Marketing", mode: "live", detail: "SMS sent" }),
        whatsapp: async () => ({ ok: true, provider: "WbizTool", mode: "live", detail: "WhatsApp sent" }),
      },
      getDeliveries: async () => [{
        id: "existing",
        ruleId: "execution-failures",
        title: "Execution failure threshold",
        recipientId: "ops-email",
        recipientLabel: "Ops Email",
        channel: "email",
        status: "sent",
        detail: "Email sent",
        createdAt: "2026-03-15T12:50:00Z",
      }],
      recordDelivery: async (record) => ({
        id: record.id ?? "suppressed",
        createdAt: record.createdAt ?? new Date().toISOString(),
        ...record,
      }),
      now: () => new Date("2026-03-15T13:00:00Z"),
    },
  );

  assert.equal(sent, 0);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.status, "suppressed");
  assert.match(result[0]?.detail ?? "", /cooldown/i);
});
