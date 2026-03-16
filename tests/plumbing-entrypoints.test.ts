import test from "node:test";
import assert from "node:assert/strict";
import { formatZipLabel, getPlumbingEntrypoint } from "../src/lib/plumbing-entrypoints.ts";

test("formatZipLabel preserves ZIP specificity and defaults gracefully", () => {
  assert.equal(formatZipLabel("19103"), "19103");
  assert.equal(formatZipLabel(undefined), "your area");
});

test("emergency entry point is client-facing and booking-oriented", () => {
  const entry = getPlumbingEntrypoint("emergency");

  assert.equal(entry.audience, "client");
  assert.equal(entry.preferredMode, "booking-first");
  assert.equal(entry.service, "emergency-plumbing");
  assert.match(entry.title, /plumber fast/i);
  assert.ok(entry.heroHighlights.length >= 3);
  assert.ok(entry.faq.length >= 3);
});

test("provider entry point is supply-side and form-oriented", () => {
  const entry = getPlumbingEntrypoint("provider");

  assert.equal(entry.audience, "provider");
  assert.equal(entry.preferredMode, "form-first");
  assert.equal(entry.service, "provider-network");
  assert.ok(entry.chips.includes("Service area"));
});
