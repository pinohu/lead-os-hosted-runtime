import test from "node:test";
import assert from "node:assert/strict";
import { getDeploymentRegistrySnapshot, registerDeployment, registerDeploymentBatch, verifyDeploymentRecord } from "../src/lib/deployment-registry.ts";

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

test("registerDeploymentBatch registers ZIP rollout cohorts and cohort summaries", async () => {
  const records = await registerDeploymentBatch({
    deployments: [
      {
        recipe: "zip-seo-page-urgent-widget",
        niche: "plumbing",
        city: "Austin",
        zip: "78701",
        domain: "www.austinplumbing.com",
        installType: "wordpress-plugin",
        status: "generated",
        updatedBy: "operator@example.com",
      },
      {
        recipe: "zip-seo-page-urgent-widget",
        niche: "plumbing",
        city: "Austin",
        zip: "78702",
        domain: "www.austinplumbing.com",
        installType: "wordpress-plugin",
        status: "generated",
        updatedBy: "operator@example.com",
      },
    ],
  });

  assert.equal(records.length, 2);

  const snapshot = await getDeploymentRegistrySnapshot();
  assert.equal(snapshot.summary.byCity.some((entry) => entry.city === "austin"), true);
  assert.equal(snapshot.summary.byRecipe.some((entry) => entry.recipe === "zip-seo-page-urgent-widget"), true);
  assert.equal(snapshot.summary.generatedOlderThanSevenDays >= 0, true);
  assert.equal(snapshot.summary.liveWithoutPageUrl >= 0, true);
  assert.equal(snapshot.summary.staleDeployments >= 0, true);
});

test("verifyDeploymentRecord writes live verification health back into the registry", async () => {
  const record = await registerDeployment({
    recipe: "provider-homepage-emergency-widget",
    niche: "plumbing",
    city: "Miami",
    domain: "www.miamiplumber.com",
    pageUrl: "https://www.miamiplumber.com/emergency",
    installType: "widget",
    status: "live",
    updatedBy: "operator@example.com",
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("/api/widgets/boot")) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    return new Response("<script src=\"/embed/lead-os-embed.js\"></script>", { status: 200 });
  }) as typeof globalThis.fetch;

  try {
    const verified = await verifyDeploymentRecord(record);
    assert.equal(verified.verification?.status, "healthy");

    const snapshot = await getDeploymentRegistrySnapshot();
    assert.equal(snapshot.summary.unhealthyVerifications >= 0, true);
    assert.equal(snapshot.summary.pendingVerification >= 0, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
