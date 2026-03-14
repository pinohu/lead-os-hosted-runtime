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
  });

  const summary = buildRuntimeConfigSummary(await getOperationalRuntimeConfig());
  assert.equal(summary.trafft.mappedServices, 1);
  assert.equal(summary.documentero.hasProposalTemplate, true);
  assert.equal(summary.crove.hasWebhookUrl, true);
});
