import test from "node:test";
import assert from "node:assert/strict";
import {
  getWorkflowRegistryRecord,
  getWorkflowRegistryRecords,
  resetRuntimeStore,
  upsertWorkflowRegistry,
} from "../src/lib/runtime-store.ts";

test("workflow registry stores and returns the latest manifest metadata", async () => {
  await resetRuntimeStore();

  await upsertWorkflowRegistry({
    slug: "lead-intake-fanout",
    provider: "n8n",
    workflowName: "LeadOS Lead Intake Fan-Out",
    workflowId: "wf_123",
    active: true,
    manifestHash: "abc123",
    manifestVersion: "version-1",
    status: "created",
    detail: "Provisioned successfully",
    instances: [{ id: "wf_123", active: true }],
  });

  const single = await getWorkflowRegistryRecord("lead-intake-fanout");
  const all = await getWorkflowRegistryRecords();

  assert.equal(single?.workflowId, "wf_123");
  assert.equal(single?.manifestVersion, "version-1");
  assert.equal(single?.active, true);
  assert.equal(all.length, 1);
  assert.equal(all[0]?.slug, "lead-intake-fanout");
});
