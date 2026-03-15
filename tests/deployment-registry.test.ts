import test from "node:test";
import assert from "node:assert/strict";
import { getDeploymentRegistrySnapshot, registerDeployment } from "../src/lib/deployment-registry.ts";

test("registerDeployment persists rollout records and computes summaries", async () => {
  const first = await registerDeployment({
    recipe: "zip-seo-page-urgent-widget",
    niche: "plumbing",
    city: "Philadelphia",
    zip: "19103",
    domain: "www.example.com",
    pageUrl: "https://www.example.com/emergency-plumber",
    installType: "wordpress-plugin",
    status: "live",
    providerLabel: "Philadelphia Fast Response",
    tags: ["zip", "wordpress"],
    updatedBy: "operator@example.com",
  });

  const second = await registerDeployment({
    recipe: "provider-recruitment-widget",
    niche: "plumbing",
    city: "Philadelphia",
    domain: "partners.example.com",
    pageUrl: "https://partners.example.com/join",
    installType: "widget",
    status: "generated",
    tags: ["provider"],
    updatedBy: "operator@example.com",
  });

  assert.equal(first.status, "live");
  assert.equal(first.installType, "wordpress-plugin");
  assert.match(first.pluginDownloadPath ?? "", /api\/embed\/wordpress-plugin/);
  assert.equal(second.status, "generated");

  const snapshot = await getDeploymentRegistrySnapshot();
  assert.equal(snapshot.summary.total >= 2, true);
  assert.equal(snapshot.summary.live >= 1, true);
  assert.equal(snapshot.summary.wordpressPlugin >= 1, true);
  assert.equal(snapshot.summary.widget >= 1, true);
  assert.equal(snapshot.summary.zipScoped >= 1, true);
  assert.equal(snapshot.summary.providerScoped >= 1, true);
  assert.equal(snapshot.summary.topDomains.some((entry) => entry.domain === "www.example.com"), true);
});

test("registerDeployment can update rollout status without resupplying deployment fields", async () => {
  const created = await registerDeployment({
    recipe: "estimate-page-widget",
    niche: "plumbing",
    city: "Dallas",
    zip: "75201",
    domain: "www.dallasplumbing.com",
    installType: "widget",
    status: "generated",
    updatedBy: "operator@example.com",
  });

  const updated = await registerDeployment({
    id: created.id,
    status: "live",
    notes: "Promoted after QA pass",
    updatedBy: "operator@example.com",
  });

  assert.equal(updated.status, "live");
  assert.equal(updated.zip, "75201");
  assert.equal(updated.notes, "Promoted after QA pass");
  assert.match(updated.hostedUrl, /plumbing|local/);
});
