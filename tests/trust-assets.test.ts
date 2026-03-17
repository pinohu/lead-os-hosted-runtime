import test from "node:test";
import assert from "node:assert/strict";
import { getTrustAssetModules } from "../src/lib/trust-assets.ts";

test("every major plumbing funnel has three trust assets", () => {
  for (const kind of ["emergency", "estimate", "commercial", "provider", "local"] as const) {
    const modules = getTrustAssetModules(kind);
    assert.equal(modules.length, 3);
    assert.ok(modules.every((module) => module.title.length > 0));
    assert.ok(modules.every((module) => module.href.startsWith("/")));
  }
});

test("emergency trust assets include a diagnostic entry", () => {
  const modules = getTrustAssetModules("emergency");
  assert.ok(modules.some((module) => module.category === "diagnostic"));
});

test("provider trust assets include a standards-oriented trust module", () => {
  const modules = getTrustAssetModules("provider");
  assert.ok(modules.some((module) => module.title.toLowerCase().includes("qualification")));
});
