import test from "node:test";
import assert from "node:assert/strict";
import { processDispatchEscalations } from "../src/lib/dispatch-automation.ts";
import { getDispatchSlaSnapshot } from "../src/lib/dispatch-sla.ts";
import type { PlumbingLeadContext } from "../src/lib/runtime-schema.ts";
import {
  getLeadRecord,
  getOperatorActions,
  getWorkflowRuns,
  resetRuntimeStore,
  upsertLeadRecord,
  type StoredLeadRecord,
} from "../src/lib/runtime-store.ts";

function buildOverdueLead(): StoredLeadRecord {
  return {
    leadKey: "email:overdue@example.com",
    trace: {
      visitorId: "visitor-overdue",
      sessionId: "session-overdue",
      leadKey: "email:overdue@example.com",
      tenant: "tenant",
      source: "search",
      service: "emergency-plumbing",
      niche: "plumbing",
      blueprintId: "qualification-default",
      stepId: "qualification-1",
    },
    firstName: "Overdue",
    lastName: "Lead",
    email: "overdue@example.com",
    phone: "+15555550999",
    service: "emergency-plumbing",
    niche: "plumbing",
    source: "search",
    score: 99,
    family: "qualification",
    blueprintId: "qualification-default",
    destination: "/funnel/qualification",
    ctaLabel: "Start Dispatch",
    stage: "qualified",
    hot: true,
    createdAt: new Date("2026-03-15T00:00:00Z").toISOString(),
    updatedAt: new Date("2026-03-15T00:00:00Z").toISOString(),
    status: "LEAD-QUALIFIED",
    sentNurtureStages: [],
    milestones: {
      visitCount: 1,
      leadMilestones: ["lead-m1-captured"],
      customerMilestones: [],
    },
    metadata: {
      operatingModel: "plumbing-dispatch",
      plumbing: {
        issueType: "burst-pipe",
        urgencyBand: "emergency-now",
        propertyType: "residential",
        dispatchMode: "dispatch-now",
        geo: {
          city: "Austin",
          state: "Texas",
        },
        confidence: 0.94,
        routingReasons: ["Emergency keywords detected"],
      },
    },
  };
}

test("dispatch SLA snapshot marks emergency plumbing leads as escalation-ready once overdue", () => {
  const lead = buildOverdueLead();
  const snapshot = getDispatchSlaSnapshot({
    updatedAt: lead.updatedAt,
    stage: lead.stage,
    plumbing: lead.metadata.plumbing as PlumbingLeadContext,
    now: new Date("2026-03-15T00:06:00Z").toISOString(),
  });

  assert.equal(snapshot.overdue, true);
  assert.equal(snapshot.escalationReady, true);
});

test("processDispatchEscalations auto-assigns backup routing once and records workflow history", async () => {
  await resetRuntimeStore();
  await upsertLeadRecord(buildOverdueLead());

  const result = await processDispatchEscalations("system@lead-os.local");
  assert.equal(result.count, 1);

  const storedLead = await getLeadRecord("email:overdue@example.com");
  assert.equal(
    (storedLead?.metadata.plumbingOutcome as { status?: string } | undefined)?.status,
    "backup-provider-requested",
  );

  const operatorActions = await getOperatorActions("email:overdue@example.com");
  assert.equal(operatorActions[0]?.actionType, "assign-backup-provider");

  const workflowRuns = await getWorkflowRuns("email:overdue@example.com");
  assert.ok(workflowRuns.some((run) => run.eventName === "plumbing.dispatch.escalated"));

  const secondPass = await processDispatchEscalations("system@lead-os.local");
  assert.equal(secondPass.count, 0);
});
