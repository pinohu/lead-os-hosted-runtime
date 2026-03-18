import test from "node:test";
import assert from "node:assert/strict";
import { buildGrowthOpsSnapshot } from "../src/lib/growth-ops.ts";
import { createCanonicalEvent } from "../src/lib/trace.ts";
import type { ProviderExecutionRecord } from "../src/lib/runtime-store.ts";
import { getOperationalRuntimeConfig, updateOperationalRuntimeConfig } from "../src/lib/runtime-config.ts";
import { resetRuntimeStore } from "../src/lib/runtime-store.ts";

test("growth ops snapshot exposes blockers and tool activity", async () => {
  await resetRuntimeStore();
  await updateOperationalRuntimeConfig({
    callScaler: {
      dynamicNumberPool: ["(555) 010-0101"],
    },
    salespanel: {
      enabled: true,
    },
    plerdy: {
      enabled: true,
    },
    thoughtly: {
      afterHoursEnabled: true,
    },
  });

  const config = await getOperationalRuntimeConfig();
  const events = [
    createCanonicalEvent({
      visitorId: "visitor_1",
      sessionId: "session_1",
      leadKey: "email:test@example.com",
      tenant: "lead-os",
      source: "public_funnel",
      service: "emergency-plumbing",
      niche: "plumbing",
      blueprintId: "public-start",
      stepId: "hero",
      family: "qualification",
    }, "page_view", "web", "RECORDED"),
    createCanonicalEvent({
      visitorId: "visitor_2",
      sessionId: "session_2",
      leadKey: "email:test@example.com",
      tenant: "lead-os",
      source: "public_funnel",
      service: "emergency-plumbing",
      niche: "plumbing",
      blueprintId: "public-start",
      stepId: "hero",
      family: "qualification",
    }, "form_started", "web", "RECORDED"),
  ];
  const executions: ProviderExecutionRecord[] = [
    {
      id: "exec_1",
      provider: "Salespanel",
      kind: "attribution",
      ok: true,
      mode: "live",
      detail: "Behavior event sent",
      createdAt: new Date().toISOString(),
    },
  ];

  const snapshot = buildGrowthOpsSnapshot(config, events, executions);

  assert.ok(snapshot.blockers.some((entry) => entry.includes("Call tracking numbers exist")));
  assert.ok(snapshot.blockers.some((entry) => entry.includes("Forms are starting")));
  assert.equal(snapshot.toolPulse.find((entry) => entry.label === "Salespanel")?.totalExecutions, 1);
  assert.equal(snapshot.pulse.find((entry) => entry.label === "Form starts")?.value, 1);
  assert.equal(snapshot.metrics.pageViews, 1);
  assert.equal(snapshot.metrics.formStarts, 1);
});
