import test from "node:test";
import assert from "node:assert/strict";
import {
  getN8nStarterManifestVersion,
  getN8nStarterWorkflowHash,
  N8N_STARTER_WORKFLOWS,
} from "../src/lib/n8n-starter-pack.ts";

test("n8n manifest can identify milestone workflows as default operational workflows", () => {
  const milestoneWorkflows = N8N_STARTER_WORKFLOWS.filter((workflow) =>
    workflow.slug === "milestone-second-touch" || workflow.slug === "milestone-third-touch-conversion"
  );

  assert.equal(milestoneWorkflows.length, 2);
  assert.deepEqual(
    milestoneWorkflows.map((workflow) => workflow.slug).sort(),
    ["milestone-second-touch", "milestone-third-touch-conversion"],
  );
});

test("n8n manifest versioning is deterministic for starter workflows", () => {
  const version = getN8nStarterManifestVersion();
  const intakeHash = getN8nStarterWorkflowHash("lead-intake-fanout");
  const thirdTouchHash = getN8nStarterWorkflowHash("milestone-third-touch-conversion");

  assert.match(version, /^[a-f0-9]{64}$/);
  assert.match(intakeHash ?? "", /^[a-f0-9]{64}$/);
  assert.match(thirdTouchHash ?? "", /^[a-f0-9]{64}$/);
  assert.notEqual(intakeHash, thirdTouchHash);
});
