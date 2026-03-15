import test from "node:test";
import assert from "node:assert/strict";
import {
  isSystemBookingJob,
  isSystemCanonicalEvent,
  isSystemLeadKey,
  isSystemLeadRecord,
  isSystemWorkflowRun,
} from "../src/lib/operator-view.ts";
import type { StoredLeadRecord, BookingJobRecord, WorkflowRunRecord } from "../src/lib/runtime-store.ts";
import type { CanonicalEvent } from "../src/lib/trace.ts";

test("operator view helpers detect synthetic verification traffic", () => {
  assert.equal(isSystemLeadKey("email:trafft-webhook-check@lead-os.dev"), true);
  assert.equal(isSystemLeadKey("email:real@example.com"), false);

  const lead: StoredLeadRecord = {
    leadKey: "email:env-only-check@lead-os.dev",
    trace: {
      visitorId: "visitor-smoke",
      sessionId: "session-smoke",
      leadKey: "email:env-only-check@lead-os.dev",
      tenant: "smoke",
      source: "smoke",
      service: "smoke",
      niche: "general",
      blueprintId: "qualification-default",
      stepId: "qualification-1",
    },
    firstName: "System",
    lastName: "Lead",
    email: "env-only-check@lead-os.dev",
    service: "lead-capture",
    niche: "general",
    source: "smoke",
    score: 10,
    family: "qualification",
    blueprintId: "qualification-default",
    destination: "/assess/general",
    ctaLabel: "Continue",
    stage: "captured",
    hot: false,
    createdAt: new Date("2026-03-14T00:00:00Z").toISOString(),
    updatedAt: new Date("2026-03-14T00:00:00Z").toISOString(),
    status: "LEAD-CAPTURED",
    sentNurtureStages: [],
    milestones: {
      visitCount: 1,
      leadMilestones: ["lead-m1-captured"],
      customerMilestones: [],
    },
    metadata: {},
  };

  const event: CanonicalEvent = {
    id: "event-smoke",
    eventType: "lead_milestone_reached",
    visitorId: "visitor-smoke",
    sessionId: "session-smoke",
    leadKey: lead.leadKey,
    tenant: "smoke",
    source: "smoke",
    service: "smoke",
    niche: "general",
    blueprintId: "qualification-default",
    stepId: "qualification-1",
    channel: "internal",
    status: "MILESTONE",
    timestamp: new Date("2026-03-14T00:00:00Z").toISOString(),
    metadata: {},
  };

  const bookingJob: BookingJobRecord = {
    id: "booking-1",
    leadKey: lead.leadKey,
    provider: "Trafft",
    status: "booked",
    detail: "Trafft webhook processed: Appointment Booked",
    createdAt: new Date("2026-03-14T00:00:00Z").toISOString(),
    updatedAt: new Date("2026-03-14T00:00:00Z").toISOString(),
  };

  const workflowRun: WorkflowRunRecord = {
    id: "workflow-1",
    leadKey: lead.leadKey,
    eventName: "lead.smoke",
    provider: "n8n",
    ok: true,
    mode: "live",
    detail: "Smoke workflow emitted",
    createdAt: new Date("2026-03-14T00:00:00Z").toISOString(),
  };

  assert.equal(isSystemLeadRecord(lead), true);
  assert.equal(isSystemCanonicalEvent(event), true);
  assert.equal(isSystemBookingJob(bookingJob), true);
  assert.equal(isSystemWorkflowRun(workflowRun), true);
});
