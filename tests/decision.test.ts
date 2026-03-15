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

test("decision engine honors preferred family overrides from AI routing", () => {
  const decision = decideNextStep({
    source: "content",
    niche: "coaching",
    hasEmail: true,
    contentEngaged: true,
    preferredFamily: "chat",
  });

  assert.equal(decision.family, "chat");
  assert.match(decision.destination, /\/calculator\?niche=coaching&mode=chat$/);
});

test("decision engine classifies urgent plumbing demand into dispatch routing", () => {
  const decision = decideNextStep({
    source: "contact_form",
    niche: "plumbing",
    service: "burst pipe",
    message: "Emergency burst pipe flooding the kitchen right now",
    hasEmail: true,
    hasPhone: true,
    wantsBooking: true,
  });

  assert.equal(decision.operatingModel, "plumbing-dispatch");
  assert.equal(decision.family, "qualification");
  assert.equal(decision.plumbing?.urgencyBand, "emergency-now");
  assert.equal(decision.plumbing?.dispatchMode, "dispatch-now");
  assert.match(decision.ctaLabel, /dispatch/i);
});

test("decision engine classifies plumbing estimate demand without emergency routing", () => {
  const decision = decideNextStep({
    source: "contact_form",
    niche: "plumbing",
    service: "water heater replacement estimate",
    message: "Need a quote for a new water heater next week",
    hasEmail: true,
  });

  assert.equal(decision.operatingModel, "plumbing-dispatch");
  assert.equal(decision.family, "qualification");
  assert.equal(decision.plumbing?.urgencyBand, "estimate");
  assert.equal(decision.plumbing?.dispatchMode, "estimate-path");
  assert.match(decision.ctaLabel, /estimate/i);
});
