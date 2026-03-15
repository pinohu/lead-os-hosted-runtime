import type {
  BookingJobRecord,
  DocumentJobRecord,
  StoredLeadRecord,
  WorkflowRunRecord,
} from "./runtime-store.ts";
import type { CanonicalEvent } from "./trace.ts";

const SYSTEM_LEAD_KEY_PATTERNS = [
  /@lead-os\.dev$/i,
  /^email:smoke@example\.com$/i,
  /webhook-check/i,
  /env-only-check/i,
  /postgres-live-check/i,
];

const SYSTEM_EVENT_PATTERNS = [
  /^lead\.smoke$/i,
  /^visitor-smoke$/i,
  /^session-smoke$/i,
  /^smoke$/i,
];

function matchesAnyPattern(value: string | undefined | null, patterns: RegExp[]) {
  if (!value) {
    return false;
  }

  return patterns.some((pattern) => pattern.test(value));
}

export function isSystemLeadKey(leadKey: string | undefined | null) {
  return matchesAnyPattern(leadKey, SYSTEM_LEAD_KEY_PATTERNS);
}

export function isSystemLeadRecord(lead: StoredLeadRecord) {
  return (
    isSystemLeadKey(lead.leadKey) ||
    isSystemLeadKey(lead.email ? `email:${lead.email}` : undefined) ||
    matchesAnyPattern(lead.trace.visitorId, SYSTEM_EVENT_PATTERNS) ||
    matchesAnyPattern(lead.trace.sessionId, SYSTEM_EVENT_PATTERNS) ||
    matchesAnyPattern(lead.trace.tenant, SYSTEM_EVENT_PATTERNS) ||
    matchesAnyPattern(lead.trace.source, SYSTEM_EVENT_PATTERNS) ||
    matchesAnyPattern(lead.source, SYSTEM_EVENT_PATTERNS) ||
    lead.metadata.synthetic === true ||
    lead.metadata.systemTraffic === true ||
    lead.metadata.smoke === true
  );
}

export function isSystemCanonicalEvent(event: CanonicalEvent) {
  return (
    isSystemLeadKey(event.leadKey) ||
    matchesAnyPattern(event.visitorId, SYSTEM_EVENT_PATTERNS) ||
    matchesAnyPattern(event.sessionId, SYSTEM_EVENT_PATTERNS) ||
    matchesAnyPattern(event.tenant, SYSTEM_EVENT_PATTERNS) ||
    matchesAnyPattern(event.source, SYSTEM_EVENT_PATTERNS) ||
    matchesAnyPattern(event.service, SYSTEM_EVENT_PATTERNS)
  );
}

export function isSystemWorkflowRun(run: WorkflowRunRecord) {
  return (
    isSystemLeadKey(run.leadKey) ||
    matchesAnyPattern(run.eventName, SYSTEM_EVENT_PATTERNS) ||
    matchesAnyPattern(run.detail, SYSTEM_LEAD_KEY_PATTERNS)
  );
}

export function isSystemBookingJob(job: BookingJobRecord) {
  return isSystemLeadKey(job.leadKey) || matchesAnyPattern(job.detail, SYSTEM_LEAD_KEY_PATTERNS);
}

export function isSystemDocumentJob(job: DocumentJobRecord) {
  return isSystemLeadKey(job.leadKey) || matchesAnyPattern(job.detail, SYSTEM_LEAD_KEY_PATTERNS);
}

export function splitSystemTraffic<T>(items: T[], predicate: (item: T) => boolean) {
  const visible: T[] = [];
  const system: T[] = [];

  for (const item of items) {
    if (predicate(item)) {
      system.push(item);
    } else {
      visible.push(item);
    }
  }

  return { visible, system };
}
