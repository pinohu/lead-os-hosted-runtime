import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRuntimeConfigSummary,
  getOperationalRuntimeConfig,
  updateOperationalRuntimeConfig,
} from "../src/lib/runtime-config.ts";
import { resetRuntimeStore } from "../src/lib/runtime-store.ts";

test("runtime config persists normalized provider mappings", async () => {
  await resetRuntimeStore();

  await updateOperationalRuntimeConfig({
    trafft: {
      publicBookingUrl: " https://book.example.com/demo ",
      defaultServiceId: " srv_main ",
      serviceMap: {
        "Legal Strategy Call": " srv_legal ",
        "Coaching Intensive": "srv_coaching",
      },
    },
    documentero: {
      proposalTemplateId: " proposal-template ",
      agreementTemplateId: "agreement-template",
      onboardingTemplateId: " onboarding-template ",
      defaultFormat: " docx ",
    },
    dispatch: {
      providers: [
        {
          id: "crew-dallas",
          label: " Dallas Emergency Crew ",
          contactEmail: " Dispatch@Dallas.example.com ",
          phone: " 5551234567 ",
          active: true,
          acceptingNewJobs: true,
          priorityWeight: 88,
          maxConcurrentJobs: 4,
          activeJobs: 1,
          acceptsEmergency: true,
          acceptsCommercial: false,
          propertyTypes: ["Residential ", "commercial", "residential"],
          issueTypes: ["Burst-Pipe", " leak "],
          states: [" Texas "],
          counties: ["Dallas County"],
          cities: ["Dallas "],
          zipPrefixes: ["752", "752"],
          emergencyCoverageWindow: " 24/7 ",
          payoutModel: "revenue-share",
          payoutSharePercent: 35,
          payoutNotes: " emergency work ",
        },
      ],
    },
    marketplace: {
      defaultLeadAcquisitionCost: 42,
      zipLeadAcquisitionCosts: {
        "752": 31,
      },
    },
  }, "operator@example.com");

  const config = await getOperationalRuntimeConfig();
  assert.equal(config.trafft.publicBookingUrl, "https://book.example.com/demo");
  assert.equal(config.trafft.defaultServiceId, "srv_main");
  assert.deepEqual(config.trafft.serviceMap, {
    "legal strategy call": "srv_legal",
    "coaching intensive": "srv_coaching",
  });
  assert.equal(config.documentero.proposalTemplateId, "proposal-template");
  assert.equal(config.documentero.defaultFormat, "docx");
  assert.equal(config.dispatch.providers.length, 1);
  assert.deepEqual(config.dispatch.providers[0], {
    id: "crew-dallas",
    label: "Dallas Emergency Crew",
    contactEmail: "dispatch@dallas.example.com",
    phone: "5551234567",
    active: true,
    acceptingNewJobs: true,
    priorityWeight: 88,
    maxConcurrentJobs: 4,
    activeJobs: 1,
    acceptsEmergency: true,
    acceptsCommercial: false,
    propertyTypes: ["residential", "commercial"],
    issueTypes: ["burst-pipe", "leak"],
    states: ["texas"],
    counties: ["dallas county"],
    cities: ["dallas"],
    zipPrefixes: ["752"],
    emergencyCoverageWindow: "24/7",
    payoutModel: "revenue-share",
    payoutFlatFee: undefined,
    payoutSharePercent: 35,
    payoutNotes: "emergency work",
    lastSelfUpdatedAt: undefined,
  });
  assert.equal(config.marketplace.defaultLeadAcquisitionCost, 42);
  assert.deepEqual(config.marketplace.zipLeadAcquisitionCosts, { "752": 31 });
});

test("runtime config summary reports executable coverage", async () => {
  await resetRuntimeStore();
  await updateOperationalRuntimeConfig({
    trafft: {
      serviceMap: {
        consult: "srv_1",
      },
    },
    documentero: {
      proposalTemplateId: "proposal-template",
    },
    crove: {
      webhookUrl: "https://hooks.example.com/crove",
    },
    dispatch: {
      providers: [
        {
          id: "crew-a",
          label: "Crew A",
          contactEmail: "crew-a@example.com",
          active: true,
          acceptingNewJobs: true,
          priorityWeight: 70,
          acceptsEmergency: true,
          acceptsCommercial: false,
          propertyTypes: [],
          issueTypes: [],
          states: ["texas"],
          counties: [],
          cities: [],
          zipPrefixes: [],
          payoutModel: "flat-fee",
          payoutFlatFee: 120,
        },
        {
          id: "crew-b",
          label: "Crew B",
          active: false,
          acceptingNewJobs: true,
          priorityWeight: 40,
          acceptsEmergency: true,
          acceptsCommercial: true,
          propertyTypes: [],
          issueTypes: [],
          states: ["texas"],
          counties: [],
          cities: [],
          zipPrefixes: [],
          payoutModel: "revenue-share",
          payoutSharePercent: 30,
        },
      ],
    },
    marketplace: {
      defaultLeadAcquisitionCost: 33,
      zipLeadAcquisitionCosts: {
        "752": 28,
        "191": 44,
      },
    },
  });

  const summary = buildRuntimeConfigSummary(await getOperationalRuntimeConfig());
  assert.equal(summary.trafft.mappedServices, 1);
  assert.equal(summary.dispatch.providerCount, 2);
  assert.equal(summary.dispatch.activeProviders, 1);
  assert.equal(summary.dispatch.emergencyReadyProviders, 1);
  assert.equal(summary.dispatch.selfServeEnabledProviders, 1);
  assert.equal(summary.dispatch.payoutConfiguredProviders, 2);
  assert.equal(summary.marketplace.defaultLeadAcquisitionCost, 33);
  assert.equal(summary.marketplace.zipCostOverrides, 2);
  assert.equal(summary.documentero.hasProposalTemplate, true);
  assert.equal(summary.crove.hasWebhookUrl, true);
});

test("runtime config persists promoted experiment winners", async () => {
  await resetRuntimeStore();
  await updateOperationalRuntimeConfig({
    experiments: {
      promotions: [
        {
          experimentId: "plumbing-client-entry-v1:desktop",
          variantId: "dispatch-proof",
          promotedAt: "2026-03-15T12:00:00Z",
          promotedBy: "admin@example.com",
          reason: "Highest contribution margin with no complaints",
        },
      ],
    },
  });

  const config = await getOperationalRuntimeConfig();
  assert.equal(config.experiments.promotions.length, 1);
  assert.equal(config.experiments.promotions[0]?.experimentId, "plumbing-client-entry-v1:desktop");
  assert.equal(config.experiments.promotions[0]?.variantId, "dispatch-proof");

  const summary = buildRuntimeConfigSummary(config);
  assert.equal(summary.experiments.promotedVariants, 1);
});
