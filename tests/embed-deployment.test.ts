import test from "node:test";
import assert from "node:assert/strict";
import {
  buildManifestCatalog,
  generateBulkZipDeploymentPackage,
  generateDeploymentPackage,
  resolveWidgetBoot,
} from "../src/lib/embed-deployment.ts";
import { tenantConfig } from "../src/lib/tenant.ts";

test("resolveWidgetBoot returns a ZIP-aware local emergency deployment when ZIP is provided", () => {
  const resolved = resolveWidgetBoot(
    {
      niche: "plumbing",
      zip: "19103",
      pageType: "zip-seo-page",
    },
    tenantConfig,
  );

  assert.equal(resolved.entrypointPreset.kind, "local");
  assert.equal(resolved.widgetPreset.id, "sticky-mobile-dispatch-bar");
  assert.equal(resolved.pageType, "zip-seo-page");
  assert.equal(resolved.zip, "19103");
});

test("resolveWidgetBoot returns a provider onboarding preset for supply-side requests", () => {
  const resolved = resolveWidgetBoot(
    {
      audience: "provider",
      service: "provider-network",
      entrypoint: "plumbing-provider",
    },
    tenantConfig,
  );

  assert.equal(resolved.audience, "provider");
  assert.equal(resolved.entrypointPreset.kind, "provider");
  assert.equal(resolved.widgetPreset.id, "provider-join-drawer");
});

test("buildManifestCatalog exposes deployment presets and patterns for integrations", () => {
  const catalog = buildManifestCatalog(tenantConfig);

  assert.ok(catalog.entrypointPresets.length >= 6);
  assert.ok(catalog.widgetPresets.some((preset) => preset.id === "urgent-drawer"));
  assert.ok(catalog.deploymentPatterns.some((pattern) => pattern.id === "zip-seo-page-urgent-widget"));
  assert.ok(catalog.supportedIntegrations.some((integration) => integration.id === "js-widget"));
});

test("generateDeploymentPackage returns preset-aware snippets for ZIP deployment recipes", () => {
  const generated = generateDeploymentPackage(
    {
      recipe: "zip-seo-page-urgent-widget",
      niche: "plumbing",
      zip: "19103",
      city: "Philadelphia",
    },
    tenantConfig,
  );

  assert.equal(generated.entrypointPreset.kind, "local");
  assert.equal(generated.widgetPreset.id, "sticky-mobile-dispatch-bar");
  assert.match(generated.bundle.bootEndpoint, /zip=19103/);
  assert.match(generated.bundle.widgetScript, /zip: "19103"/);
  assert.match(generated.bundle.widgetScript, /city: "Philadelphia"/);
  assert.match(generated.wordpressEmbedBlock, /lead-os-embed\.js/);
  assert.match(generated.generatorEndpoint, /recipe=zip-seo-page-urgent-widget/);
});

test("generateBulkZipDeploymentPackage returns many localized deployment packages", () => {
  const generated = generateBulkZipDeploymentPackage(
    {
      recipe: "zip-seo-page-urgent-widget",
      niche: "plumbing",
      city: "Philadelphia",
      zips: ["19103", "19104", "19107"],
      limit: 10,
    },
    tenantConfig,
  );

  assert.equal(generated.count, 3);
  assert.equal(generated.deployments[0]?.entrypointPreset.kind, "local");
  assert.match(generated.deployments[1]?.bundle.bootEndpoint ?? "", /zip=19104/);
  assert.match(generated.deployments[2]?.bundle.widgetScript ?? "", /city: "Philadelphia"/);
});
