import test from "node:test";
import assert from "node:assert/strict";
import { AUTOMATION_RECIPES, NURTURE_SEQUENCE, THREE_VISIT_FRAMEWORK, resolveNextNurtureStage } from "../src/lib/automation.ts";
import { resetRuntimeStore, upsertLeadRecord } from "../src/lib/runtime-store.ts";

test("automation recipes exist for every implemented family", () => {
  assert.equal(Object.keys(AUTOMATION_RECIPES).length, 10);
  assert.equal(NURTURE_SEQUENCE[0]?.day, 0);
  assert.equal(NURTURE_SEQUENCE.at(-1)?.day, 30);
  assert.equal(THREE_VISIT_FRAMEWORK.lead.length, 3);
  assert.equal(THREE_VISIT_FRAMEWORK.customer.length, 3);
});

test("nurture resolution picks the next unsent stage", () => {
  resetRuntimeStore();
  const now = new Date();
  const lead = upsertLeadRecord({
    leadKey: "email:test@example.com",
    trace: {
      visitorId: "visitor-1",
      sessionId: "session-1",
      leadKey: "email:test@example.com",
      tenant: "tenant",
      source: "manual",
      service: "lead-capture",
      niche: "general",
      blueprintId: "lead-magnet-default",
      stepId: "lead-magnet-1",
    },
    firstName: "Test",
    lastName: "Lead",
    email: "test@example.com",
    phone: "+15555550123",
    company: "Example Co",
    service: "lead-capture",
    niche: "general",
    source: "manual",
    score: 55,
    family: "lead-magnet",
    blueprintId: "lead-magnet-default",
    destination: "/funnel/lead-magnet",
    ctaLabel: "Continue",
    stage: "captured",
    hot: false,
    createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: now.toISOString(),
    status: "LEAD-CAPTURED",
    sentNurtureStages: ["day-0", "day-2"],
    milestones: {
      visitCount: 1,
      leadMilestones: ["lead-m1-captured"],
      customerMilestones: [],
    },
    metadata: {},
  });

  const stage = resolveNextNurtureStage(lead);

  assert.equal(stage?.id, "day-5");
});
