import test from "node:test";
import assert from "node:assert/strict";
import { persistLead, validateLeadPayload } from "../src/lib/intake.ts";

test("validateLeadPayload requires a source and identity", () => {
  assert.throws(() => validateLeadPayload({} as never), /Lead source is required/);
  assert.throws(() => validateLeadPayload({ source: "chat" } as never), /Email or phone is required/);
});

test("persistLead stores normalized email-based identities", () => {
  const result = persistLead({
    source: "chat",
    email: "Lead@Test.com",
    firstName: "Lead",
  });

  assert.equal(result.success, true);
  assert.equal(result.leadKey, "email:lead@test.com");
});
