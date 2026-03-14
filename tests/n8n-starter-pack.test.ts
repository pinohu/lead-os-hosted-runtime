import test from "node:test";
import assert from "node:assert/strict";
import { getN8nStarterWorkflow, N8N_STARTER_WORKFLOWS } from "../src/lib/n8n-starter-pack.ts";

test("n8n starter pack includes milestone workflows", () => {
  assert.ok(N8N_STARTER_WORKFLOWS.length >= 7);
  assert.ok(getN8nStarterWorkflow("milestone-second-touch"));
  assert.ok(getN8nStarterWorkflow("milestone-third-touch-conversion"));
});
