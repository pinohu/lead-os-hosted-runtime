import test from "node:test";
import assert from "node:assert/strict";
import {
  resetRuntimeStore,
  getLeadRecord,
  getBookingJobs,
  getCanonicalEvents,
  upsertBookingJob,
} from "../src/lib/runtime-store.ts";
import {
  processTrafftWebhook,
  verifyTrafftWebhookAuthorization,
} from "../src/lib/trafft-webhooks.ts";

test("verifyTrafftWebhookAuthorization matches the configured token", () => {
  const originalToken = process.env.TRAFFT_WEBHOOK_VERIFICATION_TOKEN;
  process.env.TRAFFT_WEBHOOK_VERIFICATION_TOKEN = "verify-me";

  try {
    assert.equal(verifyTrafftWebhookAuthorization("verify-me"), true);
    assert.equal(verifyTrafftWebhookAuthorization("wrong-token"), false);
    assert.equal(verifyTrafftWebhookAuthorization(null), false);
  } finally {
    if (typeof originalToken === "undefined") {
      delete process.env.TRAFFT_WEBHOOK_VERIFICATION_TOKEN;
    } else {
      process.env.TRAFFT_WEBHOOK_VERIFICATION_TOKEN = originalToken;
    }
  }
});

test("processTrafftWebhook records booked appointments into the runtime", async () => {
  await resetRuntimeStore();

  const result = await processTrafftWebhook("appointment-booked", {
    appointment: {
      id: "appt_1",
      status: "confirmed",
      serviceName: "Strategy Call",
      bookingStart: "2026-03-20T10:00:00Z",
    },
    customer: {
      firstName: "Webhook",
      lastName: "Lead",
      email: "webhook@test.com",
      phone: "+1 555 555 3333",
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.leadKey, "email:webhook@test.com");
  assert.equal(result.bookingJob?.status, "booked");

  const lead = await getLeadRecord("email:webhook@test.com");
  assert.equal(lead?.stage, "booked");
  assert.ok(lead?.milestones.leadMilestones.includes("lead-m3-booked-or-offered"));

  const bookingJobs = await getBookingJobs("email:webhook@test.com");
  assert.equal(bookingJobs[0]?.status, "booked");

  const events = await getCanonicalEvents();
  assert.equal(events[0]?.eventType, "booking_completed");
});

test("upsertBookingJob generates an id when undefined is passed explicitly", async () => {
  await resetRuntimeStore();

  const job = await upsertBookingJob({
    id: undefined,
    leadKey: "email:undefined-id@test.com",
    provider: "Trafft",
    status: "booked",
    detail: "Generated from regression test",
  });

  assert.match(job.id, /[0-9a-f-]{36}/i);

  const bookingJobs = await getBookingJobs("email:undefined-id@test.com");
  assert.equal(bookingJobs[0]?.id, job.id);
  assert.equal(bookingJobs[0]?.status, "booked");
});
