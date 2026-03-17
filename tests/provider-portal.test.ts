import test from "node:test";
import assert from "node:assert/strict";
import { persistLead } from "../src/lib/intake.ts";
import { applyProviderDispatchRequestAction, recordProviderDispatchCompletion } from "../src/lib/provider-portal.ts";
import { decodeProviderPortalToken, issueProviderPortalToken } from "../src/lib/provider-portal-auth-core.ts";
import { getDispatchProviderById, updateOperationalRuntimeConfig } from "../src/lib/runtime-config.ts";
import { getBookingJobs, getExecutionTasks, getLeadRecord, getProviderDispatchRequests, resetRuntimeStore } from "../src/lib/runtime-store.ts";

test("provider portal token resolves for configured provider emails", async () => {
  await resetRuntimeStore();
  process.env.LEAD_OS_AUTH_SECRET = "provider-portal-test-secret";

  await updateOperationalRuntimeConfig({
    dispatch: {
      providers: [
        {
          id: "crew-dallas",
          label: "Dallas Emergency Crew",
          contactEmail: "dispatch@dallas.example.com",
          active: true,
          acceptingNewJobs: true,
          priorityWeight: 90,
          propertyTypes: ["residential"],
          issueTypes: ["burst-pipe"],
          states: ["texas"],
          counties: [],
          cities: ["dallas"],
          zipPrefixes: ["752"],
          acceptsEmergency: true,
          acceptsCommercial: false,
        },
      ],
    },
  });

  const token = await issueProviderPortalToken({
    type: "provider-session",
    providerId: "crew-dallas",
    email: "dispatch@dallas.example.com",
    exp: Date.now() + 60_000,
  }, process.env.LEAD_OS_AUTH_SECRET!);
  const session = await decodeProviderPortalToken(token, process.env.LEAD_OS_AUTH_SECRET!);
  assert.equal(session?.providerId, "crew-dallas");
  assert.equal(session?.email, "dispatch@dallas.example.com");
});

test("provider accepting a dispatch request updates lead, capacity, and booking state", async () => {
  await resetRuntimeStore();
  process.env.LEAD_OS_AUTH_SECRET = "provider-portal-test-secret";

  await updateOperationalRuntimeConfig({
    dispatch: {
      providers: [
        {
          id: "crew-dallas",
          label: "Dallas Emergency Crew",
          contactEmail: "dispatch@dallas.example.com",
          active: true,
          acceptingNewJobs: true,
          priorityWeight: 90,
          maxConcurrentJobs: 4,
          activeJobs: 1,
          propertyTypes: ["residential"],
          issueTypes: ["burst-pipe", "leak"],
          states: ["texas"],
          counties: [],
          cities: ["dallas"],
          zipPrefixes: ["752"],
          acceptsEmergency: true,
          acceptsCommercial: false,
        },
      ],
    },
  });

  const result = await persistLead({
    source: "contact_form",
    email: "claim@test.com",
    phone: "5551234567",
    firstName: "Claim",
    niche: "plumbing",
    service: "burst pipe",
    city: "Dallas",
    state: "Texas",
    zip: "75201",
    message: "Emergency burst pipe flooding now",
    wantsBooking: true,
  });

  const request = (await getProviderDispatchRequests({ leadKey: result.leadKey }))[0];
  assert.ok(request);

  await applyProviderDispatchRequestAction({
    requestId: request!.id,
    providerId: "crew-dallas",
    actorEmail: "dispatch@dallas.example.com",
    action: "accept",
    note: "Crew is on the way",
  });

  const updatedRequest = (await getProviderDispatchRequests({ leadKey: result.leadKey }))[0];
  const updatedLead = await getLeadRecord(result.leadKey);
  const updatedProvider = await getDispatchProviderById("crew-dallas");
  const bookingJobs = await getBookingJobs(result.leadKey);

  assert.equal(updatedRequest?.status, "accepted");
  assert.equal(updatedLead?.status, "PROVIDER-CLAIMED");
  assert.equal((updatedLead?.metadata.providerDispatch as { status?: string })?.status, "accepted");
  assert.equal(updatedProvider?.activeJobs, 2);
  assert.equal(bookingJobs[0]?.status, "handoff-ready");
});

test("provider completion records closed-loop economics and releases capacity", async () => {
  await resetRuntimeStore();
  process.env.LEAD_OS_AUTH_SECRET = "provider-portal-test-secret";

  await updateOperationalRuntimeConfig({
    dispatch: {
      providers: [
        {
          id: "crew-dallas",
          label: "Dallas Emergency Crew",
          contactEmail: "dispatch@dallas.example.com",
          active: true,
          acceptingNewJobs: true,
          priorityWeight: 90,
          maxConcurrentJobs: 2,
          activeJobs: 1,
          propertyTypes: ["residential"],
          issueTypes: ["burst-pipe", "leak"],
          states: ["texas"],
          counties: [],
          cities: ["dallas"],
          zipPrefixes: ["752"],
          acceptsEmergency: true,
          acceptsCommercial: false,
        },
      ],
    },
  });

  const result = await persistLead({
    source: "contact_form",
    email: "complete@test.com",
    phone: "5551234567",
    firstName: "Complete",
    niche: "plumbing",
    service: "burst pipe",
    city: "Dallas",
    state: "Texas",
    zip: "75201",
    message: "Emergency burst pipe flooding now",
    wantsBooking: true,
  });

  const request = (await getProviderDispatchRequests({ leadKey: result.leadKey }))[0];
  assert.ok(request);

  await applyProviderDispatchRequestAction({
    requestId: request!.id,
    providerId: "crew-dallas",
    actorEmail: "dispatch@dallas.example.com",
    action: "accept",
    note: "Crew is on the way",
  });

  await recordProviderDispatchCompletion({
    requestId: request!.id,
    providerId: "crew-dallas",
    actorEmail: "dispatch@dallas.example.com",
    note: "Completed same day with positive review.",
    invoiceNumber: "INV-2044",
    invoiceStatus: "collected",
    paymentStatus: "paid",
    paymentMethod: "card",
    paymentAmount: 1200,
    paidAt: new Date("2026-03-17T12:30:00Z").toISOString(),
    revenueValue: 1200,
    marginValue: 480,
    complaintStatus: "none",
    reviewStatus: "positive",
    reviewRating: 5,
    refundIssued: false,
  });

  const updatedLead = await getLeadRecord(result.leadKey);
  const updatedProvider = await getDispatchProviderById("crew-dallas");
  const bookingJobs = await getBookingJobs(result.leadKey);

  assert.equal(updatedLead?.stage, "active");
  assert.equal(updatedLead?.status, "PAYMENT-COLLECTED");
  assert.equal((updatedLead?.metadata.plumbingOutcome as { status?: string })?.status, "completed");
  assert.equal((updatedLead?.metadata.plumbingOutcome as { paymentStatus?: string })?.paymentStatus, "paid");
  assert.equal((updatedLead?.metadata.plumbingOutcome as { marginValue?: number })?.marginValue, 480);
  assert.equal((updatedLead?.metadata.plumbingOutcome as { reviewStatus?: string })?.reviewStatus, "positive");
  assert.equal(updatedProvider?.activeJobs, 1);
  assert.equal(updatedProvider?.acceptingNewJobs, true);
  assert.equal(bookingJobs[0]?.status, "completed");
});

test("provider completion without collected payment does not mark value realized and can queue commerce follow-up", async () => {
  await resetRuntimeStore();
  process.env.LEAD_OS_AUTH_SECRET = "provider-portal-test-secret";

  await updateOperationalRuntimeConfig({
    dispatch: {
      providers: [
        {
          id: "crew-dallas",
          label: "Dallas Emergency Crew",
          contactEmail: "dispatch@dallas.example.com",
          active: true,
          acceptingNewJobs: true,
          priorityWeight: 90,
          maxConcurrentJobs: 2,
          activeJobs: 1,
          propertyTypes: ["residential"],
          issueTypes: ["burst-pipe", "leak"],
          states: ["texas"],
          counties: [],
          cities: ["dallas"],
          zipPrefixes: ["752"],
          acceptsEmergency: true,
          acceptsCommercial: false,
        },
      ],
    },
  });

  const result = await persistLead({
    source: "contact_form",
    email: "awaiting-payment@test.com",
    phone: "5551234567",
    firstName: "Awaiting",
    niche: "plumbing",
    service: "burst pipe",
    city: "Dallas",
    state: "Texas",
    zip: "75201",
    message: "Emergency burst pipe flooding now",
    wantsBooking: true,
  });

  const request = (await getProviderDispatchRequests({ leadKey: result.leadKey }))[0];
  assert.ok(request);

  await applyProviderDispatchRequestAction({
    requestId: request!.id,
    providerId: "crew-dallas",
    actorEmail: "dispatch@dallas.example.com",
    action: "accept",
  });

  await recordProviderDispatchCompletion({
    requestId: request!.id,
    providerId: "crew-dallas",
    actorEmail: "dispatch@dallas.example.com",
    note: "Completed, payment link requested.",
    invoiceNumber: "INV-2045",
    invoiceStatus: "sent",
    paymentStatus: "pending",
    paymentMethod: "digital-link",
    revenueValue: 900,
    marginValue: 300,
  });

  const updatedLead = await getLeadRecord(result.leadKey);
  const executionTasks = await getExecutionTasks({ leadKey: result.leadKey });

  assert.equal(updatedLead?.stage, "converted");
  assert.equal(updatedLead?.status, "JOB-COMPLETED-AWAITING-PAYMENT");
  assert.deepEqual(updatedLead?.milestones.customerMilestones, [
    "customer-m1-onboarded",
    "customer-m2-activated",
  ]);
  assert.ok(executionTasks.some((task) => task.kind === "commerce"));
});
