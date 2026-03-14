import test from "node:test";
import assert from "node:assert/strict";
import { decideNextStep } from "../src/lib/orchestrator.ts";

test("decision engine routes quote intent into qualification", () => {
  const decision = decideNextStep({
    source: "contact_form",
    niche: "legal",
    hasEmail: true,
    hasPhone: true,
    askingForQuote: true,
  });

  assert.equal(decision.family, "qualification");
  assert.match(decision.destination, /\/assess\/legal$/);
  assert.equal(decision.recipe.family, "qualification");
});

test("decision engine routes content engagement into webinar authority path", () => {
  const decision = decideNextStep({
    source: "content",
    niche: "coaching",
    hasEmail: true,
    contentEngaged: true,
  });

  assert.equal(decision.family, "webinar");
  assert.match(decision.destination, /\/funnel\/webinar\?niche=coaching$/);
});
