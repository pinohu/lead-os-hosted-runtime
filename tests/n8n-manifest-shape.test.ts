import test from "node:test";
import assert from "node:assert/strict";
import { N8N_STARTER_WORKFLOWS } from "../src/lib/n8n-starter-pack.ts";

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
