import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPublicGrowthBootConfig,
  processCallScalerWebhook,
  verifyCallScalerWebhookAuthorization,
} from "../src/lib/growth-integrations.ts";
import { getCanonicalEvents, resetRuntimeStore } from "../src/lib/runtime-store.ts";
import { getOperationalRuntimeConfig, updateOperationalRuntimeConfig } from "../src/lib/runtime-config.ts";

test("runtime config stores growth stack settings", async () => {
  await resetRuntimeStore();
  await updateOperationalRuntimeConfig({
    messaging: {
      primarySmsProvider: "sms-it",
      fallbackSmsProvider: "easy-text-marketing",
    },
    callScaler: {
      webhookUrl: "https://example.com/callscaler",
      scriptUrl: "https://cdn.example.com/callscaler.js",
      defaultTrackingNumber: "(555) 010-0001",
      dynamicNumberPool: ["(555) 010-0002"],
    },
    salespanel: {
      enabled: true,
      webhookUrl: "https://example.com/salespanel",
      siteId: "site_123",
      trackAnonymous: false,
    },
    plerdy: {
      enabled: true,
      eventWebhookUrl: "https://example.com/plerdy",
      projectId: "project_123",
      popupsEnabled: true,
    },
  });

  const config = await getOperationalRuntimeConfig();
  assert.equal(config.messaging.primarySmsProvider, "sms-it");
  assert.equal(config.messaging.fallbackSmsProvider, "easy-text-marketing");
  assert.equal(config.callScaler.dynamicNumberPool.length, 1);
  assert.equal(config.salespanel.enabled, true);
  assert.equal(config.salespanel.trackAnonymous, false);
  assert.equal(config.plerdy.popupsEnabled, true);
});

test("growth boot config exposes only public-safe settings", async () => {
  await resetRuntimeStore();
  await updateOperationalRuntimeConfig({
    callScaler: {
      scriptUrl: "https://cdn.example.com/callscaler.js",
      defaultTrackingNumber: "(555) 010-0001",
      dynamicNumberPool: ["(555) 010-0002"],
    },
    salespanel: {
      enabled: true,
      scriptUrl: "https://cdn.example.com/salespanel.js",
      siteId: "site_123",
    },
    plerdy: {
      enabled: true,
      scriptUrl: "https://cdn.example.com/plerdy.js",
      projectId: "project_123",
    },
  });

  const config = await getOperationalRuntimeConfig();
  const boot = buildPublicGrowthBootConfig(config, {
    audience: "client",
    pagePath: "/start/plumbing/emergency",
    service: "emergency-plumbing",
    family: "qualification",
  });

  assert.equal(boot.callScaler.enabled, true);
  assert.equal(boot.salespanel.enabled, true);
  assert.equal(boot.plerdy.enabled, true);
  assert.equal("webhookSecret" in boot.callScaler, false);
});

test("callscaler webhook verification and ingestion append call events", async () => {
  await resetRuntimeStore();
  const authorizedRequest = new Request("https://example.com/api/webhooks/callscaler", {
    method: "POST",
    headers: {
      authorization: "Bearer secret-123",
    },
  });

  assert.equal(verifyCallScalerWebhookAuthorization(authorizedRequest, "secret-123"), true);
  assert.equal(verifyCallScalerWebhookAuthorization(authorizedRequest, "different-secret"), false);

  const event = await processCallScalerWebhook({
    source: "callscaler",
    phone: "+15555550123",
    callStatus: "completed",
    callId: "call_123",
    trackingNumber: "(555) 010-0001",
  });
  const events = await getCanonicalEvents();

  assert.equal(event.eventType, "call_completed");
  assert.ok(events.some((entry) => entry.eventType === "call_completed"));
});
