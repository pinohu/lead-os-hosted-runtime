import test from "node:test";
import assert from "node:assert/strict";
import { buildLeadDisplayName, buildLeadSubline, formatOptionalDateTime } from "../src/lib/operator-ui.ts";

test("buildLeadDisplayName prefers name, then company, then contact fields", () => {
  assert.equal(
    buildLeadDisplayName({
      leadKey: "email:test@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      company: "Analytical Engines",
      email: "ada@example.com",
      phone: "+15555550123",
    }),
    "Ada Lovelace",
  );

  assert.equal(
    buildLeadDisplayName({
      leadKey: "email:test@example.com",
      firstName: "",
      lastName: "",
      company: "Analytical Engines",
      email: "ada@example.com",
      phone: "+15555550123",
    }),
    "Analytical Engines",
  );
});

test("buildLeadSubline joins only available identity fields", () => {
  assert.equal(
    buildLeadSubline({
      company: "Analytical Engines",
      email: "ada@example.com",
      phone: "",
    }),
    "Analytical Engines | ada@example.com",
  );
});

test("formatOptionalDateTime is resilient to empty and invalid values", () => {
  assert.equal(formatOptionalDateTime(""), "Not recorded");
  assert.equal(formatOptionalDateTime("not-a-date"), "not-a-date");
});
