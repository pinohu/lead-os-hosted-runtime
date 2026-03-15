import test from "node:test";
import assert from "node:assert/strict";
import {
  createMagicLinkUrl,
  decodeOperatorToken,
  getAllowedOperatorEmails,
  resolvePublicOrigin,
  sanitizeNextPath,
} from "../src/lib/operator-auth-core.ts";

test("sanitizeNextPath only allows internal paths", () => {
  assert.equal(sanitizeNextPath("/dashboard"), "/dashboard");
  assert.equal(sanitizeNextPath("//evil.example.com"), "/dashboard");
  assert.equal(sanitizeNextPath("https://evil.example.com"), "/dashboard");
  assert.equal(sanitizeNextPath(undefined), "/dashboard");
});

test("resolvePublicOrigin rejects private bind addresses and prefers the public site", () => {
  const origin = resolvePublicOrigin(
    ["https://0.0.0.0:8080", "https://localhost:3000", "https://leados.yourdeputy.com"],
    "https://fallback.example.com",
  );

  assert.equal(origin, "https://leados.yourdeputy.com");
});

test("getAllowedOperatorEmails prefers configured operator emails", () => {
  const allowed = getAllowedOperatorEmails(" Ops@Example.org ; owner@example.org,invalid ");

  assert.deepEqual(allowed, ["ops@example.org", "owner@example.org"]);
});

test("getAllowedOperatorEmails does not invent fallback operators", () => {
  const allowed = getAllowedOperatorEmails("");
  assert.deepEqual(allowed, []);
});

test("magic-link tokens validate for approved emails and retain next path", async () => {
  const secret = "operator-secret";
  const allowedEmails = ["polycarpohu@gmail.com"];
  const { token, url } = await createMagicLinkUrl(
    "PolycarpOhu@gmail.com",
    "https://leados.yourdeputy.com",
    secret,
    allowedEmails,
    "/dashboard",
  );

  assert.match(url, /\/auth\/verify\?/);
  const payload = await decodeOperatorToken(token, "magic", secret, allowedEmails);

  assert.ok(payload);
  assert.equal(payload?.email, "polycarpohu@gmail.com");
  assert.equal(payload?.next, "/dashboard");
});

test("tokens fail validation when signed email is no longer approved", async () => {
  const secret = "operator-secret";
  const { token } = await createMagicLinkUrl(
    "polycarpohu@gmail.com",
    "https://leados.yourdeputy.com",
    secret,
    ["polycarpohu@gmail.com"],
    "/dashboard",
  );

  const payload = await decodeOperatorToken(token, "magic", secret, ["someoneelse@example.org"]);
  assert.equal(payload, null);
});
