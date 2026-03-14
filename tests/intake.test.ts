import test from "node:test";
import assert from "node:assert/strict";
import { getDefaultFunnelGraph } from "../src/lib/funnel-library.ts";
import { persistLead, validateLeadPayload } from "../src/lib/intake.ts";
import { resetRuntimeStore } from "../src/lib/runtime-store.ts";
import { tenantConfig } from "../src/lib/tenant.ts";

test("validateLeadPayload requires a source and identity", () => {
  assert.throws(() => validateLeadPayload({} as never), /Lead source is required/);
  assert.throws(() => validateLeadPayload({ source: "chat" } as never), /Email or phone is required/);
});

test("persistLead stores normalized email-based identities and returns graph-aware decisioning", async () => {
  await resetRuntimeStore();
  const result = await persistLead({
    source: "chat",
    email: "Lead@Test.com",
    firstName: "Lead",
    prefersChat: true,
  });

  assert.equal(result.success, true);
  assert.equal(result.leadKey, "email:lead@test.com");
  assert.equal(result.decision.family, "chat");
  assert.equal(result.trace.tenant, tenantConfig.tenantId);
  assert.equal(result.followup.email?.mode, "dry-run");
  assert.deepEqual(result.record.milestones.leadMilestones, ["lead-m1-captured"]);
  assert.equal(result.record.milestones.visitCount, 1);
});

test("persistLead honors a preferred funnel family when one is supplied", async () => {
  await resetRuntimeStore();
  const result = await persistLead({
    source: "manual",
    email: "preferred@test.com",
    firstName: "Preferred",
    preferredFamily: "webinar",
  });

  assert.equal(result.decision.family, "webinar");
  assert.match(result.decision.reason, /honoring the preferred funnel family/i);
});

test("default funnel graphs exist for canonical families", () => {
  const graph = getDefaultFunnelGraph(tenantConfig.tenantId, "webinar");
  assert.equal(graph.family, "webinar");
  assert.ok(graph.nodes.length >= 5);
  assert.ok(graph.edges.length >= 4);
});
