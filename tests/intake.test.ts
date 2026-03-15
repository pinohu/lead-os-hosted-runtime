import test from "node:test";
import assert from "node:assert/strict";
import { getDefaultFunnelGraph } from "../src/lib/funnel-library.ts";
import { buildPublicIntakeResponse, persistLead, validateLeadPayload } from "../src/lib/intake.ts";
import { claimIntakeReplayKey, getBookingJobs, getDocumentJobs, resetRuntimeStore } from "../src/lib/runtime-store.ts";
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

test("persistLead creates a persisted booking job for high-intent leads", async () => {
  await resetRuntimeStore();
  const result = await persistLead({
    source: "assessment",
    email: "bookme@test.com",
    firstName: "Book",
    wantsBooking: true,
    dryRun: true,
  });

  assert.ok(result.jobs.booking);
  assert.equal(result.jobs.booking?.status, "prepared");

  const storedJobs = await getBookingJobs(result.leadKey);
  assert.equal(storedJobs.length, 1);
  assert.equal(storedJobs[0]?.leadKey, result.leadKey);
});

test("persistLead creates persisted document jobs for proposal-stage leads", async () => {
  await resetRuntimeStore();
  const result = await persistLead({
    source: "assessment",
    email: "proposal@test.com",
    firstName: "Proposal",
    askingForQuote: true,
    metadata: {
      documentType: "proposal",
    },
    dryRun: true,
  });

  assert.ok(result.jobs.documents.length >= 1);
  assert.equal(result.jobs.documents[0]?.status, "prepared");

  const storedDocs = await getDocumentJobs(result.leadKey);
  assert.ok(storedDocs.some((job) => job.payload?.documentType === "proposal"));
});

test("buildPublicIntakeResponse strips provider internals from the public payload", async () => {
  await resetRuntimeStore();
  const result = await persistLead({
    source: "assessment",
    email: "public@test.com",
    firstName: "Public",
    wantsBooking: true,
    dryRun: true,
  });

  const publicResponse = buildPublicIntakeResponse(result);

  assert.deepEqual(Object.keys(publicResponse).sort(), [
    "existing",
    "hot",
    "leadKey",
    "nextStep",
    "operatingModel",
    "plumbing",
    "scoreBand",
    "stage",
    "success",
  ]);
  assert.equal("crm" in publicResponse, false);
  assert.equal("jobs" in publicResponse, false);
  assert.equal(publicResponse.nextStep.family, result.decision.family);
});

test("persistLead classifies urgent plumbing requests into dispatch-safe public metadata", async () => {
  await resetRuntimeStore();
  const result = await persistLead({
    source: "contact_form",
    email: "plumbing@test.com",
    phone: "5551234567",
    firstName: "Pipe",
    niche: "plumbing",
    service: "burst pipe",
    message: "Emergency burst pipe flooding the basement right now",
    wantsBooking: true,
    dryRun: true,
  });

  assert.equal(result.decision.operatingModel, "plumbing-dispatch");
  assert.equal(result.decision.plumbing?.urgencyBand, "emergency-now");
  assert.equal(result.decision.plumbing?.dispatchMode, "dispatch-now");
  assert.equal((result.record.metadata.plumbing as { urgencyBand?: string })?.urgencyBand, "emergency-now");

  const publicResponse = buildPublicIntakeResponse(result);
  assert.equal(publicResponse.plumbing?.urgencyBand, "emergency-now");
  assert.equal(publicResponse.plumbing?.dispatchMode, "dispatch-now");
  assert.match(publicResponse.nextStep.message, /urgent plumbing demand/i);
});

test("recent replays do not create duplicate booking jobs or refire side effects", async () => {
  await resetRuntimeStore();
  const first = await persistLead({
    source: "assessment",
    email: "replay@test.com",
    firstName: "Replay",
    wantsBooking: true,
    dryRun: true,
  });
  const second = await persistLead({
    source: "assessment",
    email: "replay@test.com",
    firstName: "Replay",
    wantsBooking: true,
    dryRun: true,
  });

  const storedJobs = await getBookingJobs(first.leadKey);
  assert.equal(storedJobs.length, 1);
  assert.equal(second.existing, true);
  assert.equal(second.workflow.detail, "Replay suppressed before workflow emission.");
  assert.equal(second.jobs.booking?.id, first.jobs.booking?.id);
});

test("claimIntakeReplayKey persists replay state across repeated checks", async () => {
  await resetRuntimeStore();
  const first = await claimIntakeReplayKey("assessment|session|lead@test.com||plumbing", 5 * 60 * 1000, {
    source: "assessment",
  });
  const second = await claimIntakeReplayKey("assessment|session|lead@test.com||plumbing", 5 * 60 * 1000, {
    source: "assessment",
  });

  assert.equal(first.replayed, false);
  assert.equal(second.replayed, true);
  assert.equal(second.record.attempts, 2);
});
