import test from "node:test";
import assert from "node:assert/strict";
import { getVerticalOperatingModel, listVerticalOperatingModels, universalOperatingPriorities } from "../src/lib/service-operating-models.ts";

test("cross-vertical operating models include mold remediation and HVAC", () => {
  const slugs = listVerticalOperatingModels().map((model) => model.slug);
  assert.ok(slugs.includes("mold-remediation"));
  assert.ok(slugs.includes("hvac"));
  assert.ok(slugs.includes("cleaning"));
  assert.ok(slugs.includes("restoration"));
});

test("operating priorities preserve the universal 10-priority stack", () => {
  assert.equal(universalOperatingPriorities.length, 10);
  assert.equal(universalOperatingPriorities[0]?.title, "Call-to-cash system");
  assert.equal(universalOperatingPriorities[9]?.title, "Standard operating workflows");
});

test("mold remediation model carries project and documentation emphasis", () => {
  const model = getVerticalOperatingModel("mold-remediation");
  assert.equal(model.slug, "mold-remediation");
  assert.ok(model.jobFlow.includes("Assessment"));
  assert.ok(model.jobFlow.includes("Remediation"));
  assert.ok(model.documentationNeeds.some((item) => item.includes("Moisture logs")));
});
