import test from "node:test";
import assert from "node:assert/strict";
import { resetRuntimeStore } from "../src/lib/runtime-store.ts";
import {
  getOperatorMagicLinkThrottle,
  markOperatorMagicLinkRequested,
} from "../src/lib/operator-auth-throttle.ts";

test("operator magic-link throttle suppresses immediate repeat sends", async () => {
  await resetRuntimeStore();

  const initial = await getOperatorMagicLinkThrottle("polycarpohu@gmail.com");
  assert.equal(initial.throttled, false);

  await markOperatorMagicLinkRequested("polycarpohu@gmail.com");

  const repeated = await getOperatorMagicLinkThrottle("polycarpohu@gmail.com");
  assert.equal(repeated.throttled, true);
  assert.ok(repeated.retryAfterSeconds >= 1);
});
