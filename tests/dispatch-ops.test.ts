import test from "node:test";
import assert from "node:assert/strict";
import { applyPlumbingDispatchAction } from "../src/lib/dispatch-ops.ts";
import {
  getBookingJobs,
  getCanonicalEvents,
  getLeadRecord,
  getOperatorActions,
  resetRuntimeStore,
  upsertLeadRecord,
  type StoredLeadRecord,
} from "../src/lib/runtime-store.ts";

function buildPlumbingLead(): StoredLeadRecord {
  return {
    leadKey: "email:dispatch@example.com",
    trace: {
      visitorId: "visitor-dispatch",
      sessionId: "session-dispatch",
      leadKey: "email:dispatch@example.com",
      tenant: "tenant",
      source: "search",
      service: "emergency-plumbing",
      niche: "plumbing",
      blueprintId: "qualification-default",
      stepId: "qualification-1",
    },
    firstName: "Dispatch",
    lastName: "Lead",
    email: "dispatch@example.com",
    phone: "+15555550123",
    service: "emergency-plumbing",
    niche: "plumbing",
    source: "search",
    score: 97,
    family: "qualification",
    blueprintId: "qualification-default",
    destination: "/funnel/qualification",
    ctaLabel: "Start Dispatch",
    stage: "qualified",
    hot: true,
    createdAt: new Date("2026-03-15T10:00:00Z").toISOString(),
    updatedAt: new Date("2026-03-15T10:00:00Z").toISOString(),
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
          city: "Dallas",
          state: "Texas",
        },
        confidence: 92,
        routingReasons: ["Emergency keywords detected"],
      },
    },
  };
}

test("dispatch action records booked outcomes, milestones, and audit history", async () => {
  await resetRuntimeStore();
  await upsertLeadRecord(buildPlumbingLead());

  const result = await applyPlumbingDispatchAction({
    leadKey: "email:dispatch@example.com",
    actionType: "mark-booked",
    actorEmail: "operator@example.com",
    note: "Customer confirmed a 2pm arrival window.",
  });

  assert.equal(result.lead.stage, "booked");
  assert.equal(result.outcome.status, "booked");

  const storedLead = await getLeadRecord("email:dispatch@example.com");
  assert.equal(storedLead?.stage, "booked");
  assert.deepEqual(storedLead?.milestones.leadMilestones, [
    "lead-m1-captured",
    "lead-m2-return-engaged",
    "lead-m3-booked-or-offered",
  ]);
  assert.equal(
    (storedLead?.metadata.plumbingOutcome as { status?: string } | undefined)?.status,
    "booked",
  );

  const bookingJobs = await getBookingJobs("email:dispatch@example.com");
  assert.equal(bookingJobs[0]?.status, "booked");

  const operatorActions = await getOperatorActions("email:dispatch@example.com");
  assert.equal(operatorActions[0]?.actionType, "mark-booked");
  assert.equal(operatorActions[0]?.actorEmail, "operator@example.com");

  const events = await getCanonicalEvents();
  assert.ok(events.some((event) => event.eventType === "operator_dispatch_action"));
  assert.ok(events.some((event) => event.eventType === "plumbing_job_outcome_recorded"));
});

test("dispatch completion records customer value milestones and revenue", async () => {
  await resetRuntimeStore();
  await upsertLeadRecord(buildPlumbingLead());

  await applyPlumbingDispatchAction({
    leadKey: "email:dispatch@example.com",
    actionType: "mark-completed",
    actorEmail: "operator@example.com",
    revenueValue: 850,
    marginValue: 320,
    complaintStatus: "minor",
    reviewStatus: "positive",
    reviewRating: 4.8,
    refundIssued: false,
    note: "Emergency job completed and invoiced.",
  });

  const storedLead = await getLeadRecord("email:dispatch@example.com");
  assert.equal(storedLead?.stage, "active");
  assert.deepEqual(storedLead?.milestones.customerMilestones, [
    "customer-m1-onboarded",
    "customer-m2-activated",
    "customer-m3-value-realized",
  ]);
  assert.equal(
    (storedLead?.metadata.plumbingOutcome as { revenueValue?: number } | undefined)?.revenueValue,
    850,
  );
  assert.equal(
    (storedLead?.metadata.plumbingOutcome as { marginValue?: number } | undefined)?.marginValue,
    320,
  );
  assert.equal(
    (storedLead?.metadata.plumbingOutcome as { reviewStatus?: string } | undefined)?.reviewStatus,
    "positive",
  );
  assert.equal(
    (storedLead?.metadata.plumbingOutcome as { complaintStatus?: string } | undefined)?.complaintStatus,
    "minor",
  );
});
