import { Pool } from "pg";
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

export interface ProviderExecutionRecord {
  id: string;
  leadKey?: string;
  provider: string;
  kind: string;
  ok: boolean;
  mode: "live" | "dry-run" | "prepared";
  detail: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface WorkflowRunRecord {
  id: string;
  leadKey?: string;
  eventName: string;
  provider: string;
  ok: boolean;
  mode: "live" | "dry-run" | "prepared";
  detail: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface BookingJobRecord {
  id: string;
  leadKey: string;
  provider: string;
  status: string;
  detail: string;
  payload?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentJobRecord {
  id: string;
  leadKey: string;
  provider: string;
  status: string;
  detail: string;
  payload?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const leadStore = new Map<string, StoredLeadRecord>();
const eventStore: CanonicalEvent[] = [];
const providerExecutionStore: ProviderExecutionRecord[] = [];
const workflowRunStore: WorkflowRunRecord[] = [];
const bookingJobStore = new Map<string, BookingJobRecord>();
const documentJobStore = new Map<string, DocumentJobRecord>();

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function getDatabaseUrl() {
  return process.env.LEAD_OS_DATABASE_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
}

function getPool() {
  if (pool) return pool;

  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    return null;
  }

  pool = new Pool({
    connectionString,
    ssl: connectionString.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
    max: 4,
  });

  return pool;
}

async function ensureSchema() {
  const activePool = getPool();
  if (!activePool) return;
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await activePool.query(`
      CREATE TABLE IF NOT EXISTS lead_os_leads (
        lead_key TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        payload JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS lead_os_events (
        id TEXT PRIMARY KEY,
        lead_key TEXT,
        event_type TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        payload JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS lead_os_provider_executions (
        id TEXT PRIMARY KEY,
        lead_key TEXT,
        provider TEXT NOT NULL,
        kind TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        payload JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS lead_os_workflow_runs (
        id TEXT PRIMARY KEY,
        lead_key TEXT,
        event_name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        payload JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS lead_os_booking_jobs (
        id TEXT PRIMARY KEY,
        lead_key TEXT NOT NULL,
        provider TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        payload JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS lead_os_document_jobs (
        id TEXT PRIMARY KEY,
        lead_key TEXT NOT NULL,
        provider TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        payload JSONB NOT NULL
      );

      CREATE INDEX IF NOT EXISTS lead_os_events_lead_idx
        ON lead_os_events (lead_key, timestamp DESC);
      CREATE INDEX IF NOT EXISTS lead_os_provider_exec_lead_idx
        ON lead_os_provider_executions (lead_key, created_at DESC);
      CREATE INDEX IF NOT EXISTS lead_os_workflow_runs_lead_idx
        ON lead_os_workflow_runs (lead_key, created_at DESC);
    `);
  })();

  return schemaReady;
}

function runtimeMode() {
  return getPool() ? "postgres" : "memory";
}

function sortByUpdatedAt<T extends { updatedAt: string }>(records: T[]) {
  return records.slice().sort((left, right) =>
    new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
}

function sortByCreatedAt<T extends { createdAt: string }>(records: T[]) {
  return records.slice().sort((left, right) =>
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

export function getRuntimePersistenceMode() {
  return runtimeMode();
}

export async function upsertLeadRecord(record: StoredLeadRecord) {
  leadStore.set(record.leadKey, record);

  const activePool = getPool();
  if (!activePool) {
    return record;
  }

  await ensureSchema();
  await activePool.query(
    `
      INSERT INTO lead_os_leads (lead_key, created_at, updated_at, payload)
      VALUES ($1, $2::timestamptz, $3::timestamptz, $4::jsonb)
      ON CONFLICT (lead_key)
      DO UPDATE SET
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at,
        payload = EXCLUDED.payload
    `,
    [record.leadKey, record.createdAt, record.updatedAt, JSON.stringify(record)],
  );

  return record;
}

export async function getLeadRecord(leadKey: string) {
  if (!getPool()) {
    return leadStore.get(leadKey);
  }

  await ensureSchema();
  const result = await getPool()!.query<{ payload: StoredLeadRecord }>(
    "SELECT payload FROM lead_os_leads WHERE lead_key = $1 LIMIT 1",
    [leadKey],
  );
  const record = result.rows[0]?.payload;
  if (record) {
    leadStore.set(record.leadKey, record);
  }
  return record;
}

export async function getLeadRecords() {
  if (!getPool()) {
    return sortByUpdatedAt([...leadStore.values()]);
  }

  await ensureSchema();
  const result = await getPool()!.query<{ payload: StoredLeadRecord }>(
    "SELECT payload FROM lead_os_leads ORDER BY updated_at DESC",
  );
  const records = result.rows.map((row) => row.payload);
  leadStore.clear();
  for (const record of records) {
    leadStore.set(record.leadKey, record);
  }
  return records;
}

export async function appendEvents(events: CanonicalEvent[]) {
  eventStore.push(...events);

  const activePool = getPool();
  if (!activePool || events.length === 0) {
    return;
  }

  await ensureSchema();
  for (const event of events) {
    await activePool.query(
      `
        INSERT INTO lead_os_events (id, lead_key, event_type, timestamp, payload)
        VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb)
        ON CONFLICT (id) DO NOTHING
      `,
      [event.id, event.leadKey, event.eventType, event.timestamp, JSON.stringify(event)],
    );
  }
}

export async function getCanonicalEvents() {
  if (!getPool()) {
    return [...eventStore].slice().sort((left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
    );
  }

  await ensureSchema();
  const result = await getPool()!.query<{ payload: CanonicalEvent }>(
    "SELECT payload FROM lead_os_events ORDER BY timestamp DESC",
  );
  const events = result.rows.map((row) => row.payload);
  eventStore.length = 0;
  eventStore.push(...events);
  return events;
}

export async function markNurtureStageSent(leadKey: string, stageId: string) {
  const record = await getLeadRecord(leadKey);
  if (!record) return;
  if (record.sentNurtureStages.includes(stageId)) return;

  record.sentNurtureStages = [...record.sentNurtureStages, stageId];
  record.updatedAt = new Date().toISOString();
  await upsertLeadRecord(record);
}

export async function recordProviderExecution(record: Omit<ProviderExecutionRecord, "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
}) {
  const normalizedRecord: ProviderExecutionRecord = {
    id: record.id ?? crypto.randomUUID(),
    createdAt: record.createdAt ?? new Date().toISOString(),
    ...record,
  };
  providerExecutionStore.unshift(normalizedRecord);

  const activePool = getPool();
  if (!activePool) {
    return normalizedRecord;
  }

  await ensureSchema();
  await activePool.query(
    `
      INSERT INTO lead_os_provider_executions (id, lead_key, provider, kind, created_at, payload)
      VALUES ($1, $2, $3, $4, $5::timestamptz, $6::jsonb)
      ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, created_at = EXCLUDED.created_at
    `,
    [
      normalizedRecord.id,
      normalizedRecord.leadKey,
      normalizedRecord.provider,
      normalizedRecord.kind,
      normalizedRecord.createdAt,
      JSON.stringify(normalizedRecord),
    ],
  );
  return normalizedRecord;
}

export async function getProviderExecutions(leadKey?: string) {
  if (!getPool()) {
    return sortByCreatedAt(
      providerExecutionStore
        .filter((record) => !leadKey || record.leadKey === leadKey)
        .map((record) => ({ ...record })),
    );
  }

  await ensureSchema();
  const query = leadKey
    ? {
        text: "SELECT payload FROM lead_os_provider_executions WHERE lead_key = $1 ORDER BY created_at DESC",
        values: [leadKey],
      }
    : {
        text: "SELECT payload FROM lead_os_provider_executions ORDER BY created_at DESC",
        values: [] as unknown[],
      };
  const result = await getPool()!.query<{ payload: ProviderExecutionRecord }>(query.text, query.values);
  return result.rows.map((row) => row.payload);
}

export async function recordWorkflowRun(record: Omit<WorkflowRunRecord, "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
}) {
  const normalizedRecord: WorkflowRunRecord = {
    id: record.id ?? crypto.randomUUID(),
    createdAt: record.createdAt ?? new Date().toISOString(),
    ...record,
  };
  workflowRunStore.unshift(normalizedRecord);

  const activePool = getPool();
  if (!activePool) {
    return normalizedRecord;
  }

  await ensureSchema();
  await activePool.query(
    `
      INSERT INTO lead_os_workflow_runs (id, lead_key, event_name, created_at, payload)
      VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb)
      ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, created_at = EXCLUDED.created_at
    `,
    [
      normalizedRecord.id,
      normalizedRecord.leadKey,
      normalizedRecord.eventName,
      normalizedRecord.createdAt,
      JSON.stringify(normalizedRecord),
    ],
  );
  return normalizedRecord;
}

export async function getWorkflowRuns(leadKey?: string) {
  if (!getPool()) {
    return sortByCreatedAt(
      workflowRunStore
        .filter((record) => !leadKey || record.leadKey === leadKey)
        .map((record) => ({ ...record })),
    );
  }

  await ensureSchema();
  const query = leadKey
    ? {
        text: "SELECT payload FROM lead_os_workflow_runs WHERE lead_key = $1 ORDER BY created_at DESC",
        values: [leadKey],
      }
    : {
        text: "SELECT payload FROM lead_os_workflow_runs ORDER BY created_at DESC",
        values: [] as unknown[],
      };
  const result = await getPool()!.query<{ payload: WorkflowRunRecord }>(query.text, query.values);
  return result.rows.map((row) => row.payload);
}

export async function upsertBookingJob(job: Omit<BookingJobRecord, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}) {
  const normalizedJob: BookingJobRecord = {
    id: job.id ?? crypto.randomUUID(),
    createdAt: job.createdAt ?? new Date().toISOString(),
    updatedAt: job.updatedAt ?? new Date().toISOString(),
    ...job,
  };
  bookingJobStore.set(normalizedJob.id, normalizedJob);

  const activePool = getPool();
  if (!activePool) {
    return normalizedJob;
  }

  await ensureSchema();
  await activePool.query(
    `
      INSERT INTO lead_os_booking_jobs (id, lead_key, provider, updated_at, payload)
      VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb)
      ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at
    `,
    [
      normalizedJob.id,
      normalizedJob.leadKey,
      normalizedJob.provider,
      normalizedJob.updatedAt,
      JSON.stringify(normalizedJob),
    ],
  );
  return normalizedJob;
}

export async function getBookingJobs(leadKey?: string) {
  if (!getPool()) {
    return sortByUpdatedAt(
      [...bookingJobStore.values()].filter((record) => !leadKey || record.leadKey === leadKey),
    );
  }

  await ensureSchema();
  const query = leadKey
    ? {
        text: "SELECT payload FROM lead_os_booking_jobs WHERE lead_key = $1 ORDER BY updated_at DESC",
        values: [leadKey],
      }
    : {
        text: "SELECT payload FROM lead_os_booking_jobs ORDER BY updated_at DESC",
        values: [] as unknown[],
      };
  const result = await getPool()!.query<{ payload: BookingJobRecord }>(query.text, query.values);
  return result.rows.map((row) => row.payload);
}

export async function upsertDocumentJob(job: Omit<DocumentJobRecord, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}) {
  const normalizedJob: DocumentJobRecord = {
    id: job.id ?? crypto.randomUUID(),
    createdAt: job.createdAt ?? new Date().toISOString(),
    updatedAt: job.updatedAt ?? new Date().toISOString(),
    ...job,
  };
  documentJobStore.set(normalizedJob.id, normalizedJob);

  const activePool = getPool();
  if (!activePool) {
    return normalizedJob;
  }

  await ensureSchema();
  await activePool.query(
    `
      INSERT INTO lead_os_document_jobs (id, lead_key, provider, updated_at, payload)
      VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb)
      ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at
    `,
    [
      normalizedJob.id,
      normalizedJob.leadKey,
      normalizedJob.provider,
      normalizedJob.updatedAt,
      JSON.stringify(normalizedJob),
    ],
  );
  return normalizedJob;
}

export async function getDocumentJobs(leadKey?: string) {
  if (!getPool()) {
    return sortByUpdatedAt(
      [...documentJobStore.values()].filter((record) => !leadKey || record.leadKey === leadKey),
    );
  }

  await ensureSchema();
  const query = leadKey
    ? {
        text: "SELECT payload FROM lead_os_document_jobs WHERE lead_key = $1 ORDER BY updated_at DESC",
        values: [leadKey],
      }
    : {
        text: "SELECT payload FROM lead_os_document_jobs ORDER BY updated_at DESC",
        values: [] as unknown[],
      };
  const result = await getPool()!.query<{ payload: DocumentJobRecord }>(query.text, query.values);
  return result.rows.map((row) => row.payload);
}

export async function resetRuntimeStore() {
  leadStore.clear();
  eventStore.length = 0;
  providerExecutionStore.length = 0;
  workflowRunStore.length = 0;
  bookingJobStore.clear();
  documentJobStore.clear();

  const activePool = getPool();
  if (!activePool) {
    return;
  }

  if (process.env.LEAD_OS_ALLOW_RESET !== "true") {
    return;
  }

  await ensureSchema();
  await activePool.query(`
    TRUNCATE TABLE
      lead_os_document_jobs,
      lead_os_booking_jobs,
      lead_os_workflow_runs,
      lead_os_provider_executions,
      lead_os_events,
      lead_os_leads
  `);
}
