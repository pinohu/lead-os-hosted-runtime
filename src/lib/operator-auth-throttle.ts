import { getRuntimeConfig, upsertRuntimeConfig } from "./runtime-store.ts";
import { normalizeEmail } from "./operator-auth-core.ts";

type OperatorMagicLinkThrottleRecord = {
  attempts: Record<string, { lastRequestedAt: string; detail?: string }>;
};

const OPERATOR_MAGIC_LINK_THROTTLE_KEY = "runtime.operator-auth.magic-link-throttle";
const OPERATOR_MAGIC_LINK_COOLDOWN_MS = 5000;

async function getThrottleRecord() {
  const throttleRecord = await getRuntimeConfig(OPERATOR_MAGIC_LINK_THROTTLE_KEY);
  return throttleRecord?.value && typeof throttleRecord.value === "object"
    ? throttleRecord.value as OperatorMagicLinkThrottleRecord
    : { attempts: {} } satisfies OperatorMagicLinkThrottleRecord;
}

export async function getOperatorMagicLinkThrottle(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const throttleValue = await getThrottleRecord();
  const lastAttempt = throttleValue.attempts?.[normalizedEmail];
  if (!lastAttempt) {
    return {
      throttled: false,
      retryAfterSeconds: 0,
      record: throttleValue,
      normalizedEmail,
    };
  }

  const delta = Date.now() - new Date(lastAttempt.lastRequestedAt).getTime();
  const throttled = Number.isFinite(delta) && delta >= 0 && delta < OPERATOR_MAGIC_LINK_COOLDOWN_MS;
  return {
    throttled,
    retryAfterSeconds: throttled ? Math.ceil((OPERATOR_MAGIC_LINK_COOLDOWN_MS - delta) / 1000) : 0,
    record: throttleValue,
    normalizedEmail,
  };
}

export async function markOperatorMagicLinkRequested(
  email: string,
  detail?: string,
  record?: OperatorMagicLinkThrottleRecord,
) {
  const normalizedEmail = normalizeEmail(email);
  const throttleValue = record ?? await getThrottleRecord();
  await upsertRuntimeConfig({
    key: OPERATOR_MAGIC_LINK_THROTTLE_KEY,
    value: {
      attempts: {
        ...(throttleValue.attempts ?? {}),
        [normalizedEmail]: {
          lastRequestedAt: new Date().toISOString(),
          detail,
        },
      },
    },
  });
}
