import type { CanonicalEventType, FunnelFamily } from "./runtime-schema.ts";

export interface TraceContext {
  visitorId: string;
  sessionId: string;
  leadKey: string;
  tenant: string;
  source: string;
  service: string;
  niche: string;
  blueprintId: string;
  stepId: string;
  experimentId?: string;
  variantId?: string;
}

export interface CanonicalEvent {
  id: string;
  eventType: CanonicalEventType;
  visitorId: string;
  sessionId: string;
  leadKey: string;
  tenant: string;
  source: string;
  service: string;
  niche: string;
  blueprintId: string;
  stepId: string;
  experimentId?: string;
  variantId?: string;
  channel: string;
  status: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

function fallbackId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function generateId(prefix: string) {
  const value = globalThis.crypto?.randomUUID?.() ?? fallbackId(prefix);
  return value.startsWith(prefix) ? value : `${prefix}-${value}`;
}

export function buildLeadKey(email?: string, phone?: string) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail) return `email:${normalizedEmail}`;
  const normalizedPhone = phone?.replace(/[^0-9+]/g, "");
  if (normalizedPhone) return `phone:${normalizedPhone}`;
  return "anonymous:unknown";
}

export function ensureTraceContext(input: {
  visitorId?: string;
  sessionId?: string;
  leadKey?: string;
  tenant: string;
  source: string;
  service?: string;
  niche?: string;
  blueprintId?: string;
  stepId?: string;
  experimentId?: string;
  variantId?: string;
  family?: FunnelFamily;
  email?: string;
  phone?: string;
}): TraceContext {
  return {
    visitorId: input.visitorId ?? generateId("visitor"),
    sessionId: input.sessionId ?? generateId("session"),
    leadKey: input.leadKey ?? buildLeadKey(input.email, input.phone),
    tenant: input.tenant,
    source: input.source,
    service: input.service ?? "lead-capture",
    niche: input.niche ?? "general",
    blueprintId: input.blueprintId ?? `${input.family ?? "lead-magnet"}-default`,
    stepId: input.stepId ?? `${input.family ?? "lead-magnet"}-entry`,
    experimentId: input.experimentId,
    variantId: input.variantId,
  };
}

export function createCanonicalEvent(
  trace: TraceContext,
  eventType: CanonicalEventType,
  channel: string,
  status: string,
  metadata: Record<string, unknown> = {},
): CanonicalEvent {
  return {
    id: generateId("event"),
    eventType,
    visitorId: trace.visitorId,
    sessionId: trace.sessionId,
    leadKey: trace.leadKey,
    tenant: trace.tenant,
    source: trace.source,
    service: trace.service,
    niche: trace.niche,
    blueprintId: trace.blueprintId,
    stepId: trace.stepId,
    experimentId: trace.experimentId,
    variantId: trace.variantId,
    channel,
    status,
    timestamp: new Date().toISOString(),
    metadata,
  };
}
