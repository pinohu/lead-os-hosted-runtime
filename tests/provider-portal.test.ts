import test from "node:test";
import assert from "node:assert/strict";
import { persistLead } from "../src/lib/intake.ts";
import { applyProviderDispatchRequestAction } from "../src/lib/provider-portal.ts";
import { decodeProviderPortalToken, issueProviderPortalToken } from "../src/lib/provider-portal-auth-core.ts";
import { getDispatchProviderById, updateOperationalRuntimeConfig } from "../src/lib/runtime-config.ts";
import { getBookingJobs, getLeadRecord, getProviderDispatchRequests, resetRuntimeStore } from "../src/lib/runtime-store.ts";

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
