import test from "node:test";
import assert from "node:assert/strict";
import { nicheCatalog } from "../src/lib/catalog.ts";
import { resolveExperienceProfile } from "../src/lib/experience.ts";

test("returning visitors get lighter form-first momentum by default", () => {
  const profile = resolveExperienceProfile({
    niche: nicheCatalog.general,
    returning: true,
    supportEmail: "support@yourdeputy.com",
  });

  assert.equal(profile.mode, "form-first");
  assert.match(profile.progressLabel, /visit two/i);
});

test("high-intent qualification paths bias toward booking-first", () => {
  const profile = resolveExperienceProfile({
    family: "qualification",
    niche: nicheCatalog["home-services"],
    intent: "solve-now",
    score: 92,
    supportEmail: "support@yourdeputy.com",
  });

  assert.equal(profile.mode, "booking-first");
  assert.equal(profile.primaryActionHref, "/assess/home-services?mode=booking-first");
});

test("mobile discover traffic can bias toward chat-first guidance", () => {
  const profile = resolveExperienceProfile({
    niche: nicheCatalog.coaching,
    source: "messenger",
    intent: "discover",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X)",
    supportEmail: "support@yourdeputy.com",
  });

  assert.equal(profile.mode, "chat-first");
  assert.equal(profile.device, "mobile");
});

test("provider audience gets a supplier-side onboarding profile for plumbing", () => {
  const profile = resolveExperienceProfile({
    niche: nicheCatalog.plumbing,
    audience: "provider",
    supportEmail: "support@yourdeputy.com",
  });

  assert.equal(profile.audience, "provider");
  assert.equal(profile.family, "qualification");
  assert.equal(profile.mode, "form-first");
  assert.match(profile.heroTitle, /provider|network/i);
  assert.match(profile.primaryActionHref, /audience=provider/);
});

test("plumbing client qualification can resolve into randomized holdout-aware variants", () => {
  const profile = resolveExperienceProfile({
    family: "qualification",
    niche: nicheCatalog.plumbing,
    assignmentKey: "visitor-123",
    supportEmail: "support@yourdeputy.com",
  });

  assert.match(profile.experimentId, /plumbing-client-entry-v1/);
  assert.equal(profile.randomizedExperiment, true);
  assert.ok(["dispatch-proof", "comparison-assist", "holdout-light-form", "rapid-triage"].includes(profile.variantId));
});

test("plumbing provider onboarding can resolve into randomized provider variants", () => {
  const profile = resolveExperienceProfile({
    family: "qualification",
    niche: nicheCatalog.plumbing,
    audience: "provider",
    assignmentKey: "provider-visitor-123",
    supportEmail: "support@yourdeputy.com",
  });

  assert.match(profile.experimentId, /plumbing-provider-entry-v1/);
  assert.equal(profile.randomizedExperiment, true);
  assert.ok(["coverage-proof", "ops-guided", "holdout-basic-form"].includes(profile.variantId));
});

test("promoted experiment winners override randomized assignment for live resolution", () => {
  const profile = resolveExperienceProfile({
    family: "qualification",
    niche: nicheCatalog.plumbing,
    assignmentKey: "visitor-123",
    supportEmail: "support@yourdeputy.com",
    experimentPromotions: [
      {
        experimentId: "plumbing-client-entry-v1:desktop",
        variantId: "dispatch-proof",
        promotedAt: "2026-03-15T12:00:00Z",
        promotedBy: "admin@example.com",
      },
    ],
  });

  assert.equal(profile.variantId, "dispatch-proof");
  assert.equal(profile.promotedExperiment, true);
  assert.equal(profile.randomizedExperiment, false);
  assert.equal(profile.mode, "booking-first");
});
