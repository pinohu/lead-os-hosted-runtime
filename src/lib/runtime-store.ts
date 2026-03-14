import type { CustomerMilestoneId, LeadMilestoneId, LeadStage } from "./runtime-schema.ts";
import type { CanonicalEvent, TraceContext } from "./trace.ts";

export interface LeadMilestoneState {
  visitCount: number;
  leadMilestones: LeadMilestoneId[];
  customerMilestones: CustomerMilestoneId[];
}

export interface StoredLeadRecord {
  leadKey: string;
  trace: TraceContext;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  service: string;
  niche: string;
  source: string;
  score: number;
  family: string;
  blueprintId: string;
  destination: string;
  ctaLabel: string;
  stage: LeadStage;
  hot: boolean;
  createdAt: string;
  updatedAt: string;
  status: string;
  sentNurtureStages: string[];
  milestones: LeadMilestoneState;
  metadata: Record<string, unknown>;
}

const leadStore = new Map<string, StoredLeadRecord>();
const eventStore: CanonicalEvent[] = [];

export function upsertLeadRecord(record: StoredLeadRecord) {
  leadStore.set(record.leadKey, record);
  return record;
}

export function getLeadRecord(leadKey: string) {
  return leadStore.get(leadKey);
}

export function getLeadRecords() {
  return [...leadStore.values()];
}

export function appendEvents(events: CanonicalEvent[]) {
  eventStore.push(...events);
}

export function getCanonicalEvents() {
  return [...eventStore];
}

export function markNurtureStageSent(leadKey: string, stageId: string) {
  const record = leadStore.get(leadKey);
  if (!record) return;
  if (!record.sentNurtureStages.includes(stageId)) {
    record.sentNurtureStages = [...record.sentNurtureStages, stageId];
    record.updatedAt = new Date().toISOString();
  }
}

export function resetRuntimeStore() {
  leadStore.clear();
  eventStore.length = 0;
}
