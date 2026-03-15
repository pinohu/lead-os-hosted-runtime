import test from "node:test";
import assert from "node:assert/strict";
import { generateDeploymentPackage } from "../src/lib/embed-deployment.ts";
import { tenantConfig } from "../src/lib/tenant.ts";
import { generateWordPressPluginPackage } from "../src/lib/wordpress-plugin.ts";

test("generateWordPressPluginPackage returns an installable deployment plugin", () => {
  const deployment = generateDeploymentPackage(
    {
      recipe: "zip-seo-page-urgent-widget",
      niche: "plumbing",
      zip: "19103",
      city: "Philadelphia",
    },
    tenantConfig,
  );
  const pluginPackage = generateWordPressPluginPackage(deployment, tenantConfig);

  assert.match(pluginPackage.fileName, /\.php$/);
  assert.match(pluginPackage.phpSource, /Plugin Name:/);
  assert.match(pluginPackage.phpSource, /add_shortcode\('leados_embed'/);
  assert.match(pluginPackage.phpSource, /lead-os-embed\.js/);
  assert.match(pluginPackage.downloadPath, /zip=19103/);
  assert.match(pluginPackage.downloadPath, /city=Philadelphia/);
  assert.equal(pluginPackage.shortcode, "[leados_embed]");
});
