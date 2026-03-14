import { Pool, type QueryResultRow } from "pg";
import { embeddedSecrets } from "./embedded-secrets.ts";
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

export interface WorkflowRegistryRecord {
  slug: string;
  provider: string;
  workflowName: string;
  manifestHash: string;
  manifestVersion: string;
  status: string;
  active: boolean;
  workflowId?: string;
  detail?: string;
  instances?: Array<{
    id: string;
    active: boolean;
  }>;
  lastProvisionedAt: string;
  updatedAt: string;
}

export interface RuntimeConfigRecord {
  key: string;
  value: Record<string, unknown>;
  updatedAt: string;
  updatedBy?: string;
}

const leadStore = new Map<string, StoredLeadRecord>();
const eventStore: CanonicalEvent[] = [];
const providerExecutionStore: ProviderExecutionRecord[] = [];
const workflowRunStore: WorkflowRunRecord[] = [];
const bookingJobStore = new Map<string, BookingJobRecord>();
const documentJobStore = new Map<string, DocumentJobRecord>();
const workflowRegistryStore = new Map<string, WorkflowRegistryRecord>();
const runtimeConfigStore = new Map<string, RuntimeConfigRecord>();

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;
let aitableCache: { fetchedAt: number; entries: AitableRuntimeEntry[] } | null = null;

type RuntimePersistenceMode = "memory" | "postgres" | "aitable";

type AitableRuntimeKind =
  | "lead"
  | "event"
  | "provider-execution"
  | "workflow-run"
  | "booking-job"
  | "document-job"
  | "workflow-registry"
  | "runtime-config";

type AitableRuntimeEntry = {
  kind: AitableRuntimeKind;
  key: string;
  payload:
    | StoredLeadRecord
    | CanonicalEvent
    | ProviderExecutionRecord
    | WorkflowRunRecord
    | BookingJobRecord
    | DocumentJobRecord
    | WorkflowRegistryRecord
    | RuntimeConfigRecord;
};

function getDatabaseUrl() {
  return process.env.LEAD_OS_DATABASE_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
}

function getAitableApiToken() {
  return process.env.AITABLE_API_TOKEN ?? embeddedSecrets.aitable.apiToken;
}

function getAitableDatasheetId() {
  return process.env.AITABLE_DATASHEET_ID ?? embeddedSecrets.aitable.datasheetId;
}

function canUseAitablePersistence() {
  return process.env.LEAD_OS_USE_AITABLE_PERSISTENCE !== "false" &&
    Boolean(getAitableApiToken() && getAitableDatasheetId());
}

function buildAitableRecordsUrl(pageNum = 1, pageSize = 1000) {
  return `https://aitable.ai/fusion/v1/datasheets/${getAitableDatasheetId()}/records?fieldKey=name&pageNum=${pageNum}&pageSize=${pageSize}`;
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
    try {
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

        CREATE TABLE IF NOT EXISTS lead_os_workflow_registry (
          slug TEXT PRIMARY KEY,
          provider TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          payload JSONB NOT NULL
        );

        CREATE TABLE IF NOT EXISTS lead_os_runtime_config (
          key TEXT PRIMARY KEY,
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
    } catch (error) {
      schemaReady = null;
      throw error;
    }
  })();

  return schemaReady;
}

function isMissingRelationError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "42P01",
  );
}

async function queryPostgres<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  const activePool = getPool();
  if (!activePool) {
    throw new Error("Postgres pool is not available");
  }

  await ensureSchema();

  try {
    return await activePool.query<T>(text, values);
  } catch (error) {
    if (!isMissingRelationError(error)) {
      throw error;
    }

    schemaReady = null;
    await ensureSchema();
    return activePool.query<T>(text, values);
  }
}

function runtimeMode(): RuntimePersistenceMode {
  if (getPool()) {
    return "postgres";
  }
  if (canUseAitablePersistence()) {
    return "aitable";
  }
  return "memory";
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

function invalidateAitableCache() {
  aitableCache = null;
}

function buildAitableEntry(kind: AitableRuntimeKind, key: string, payload: AitableRuntimeEntry["payload"]) {
  const anyPayload = payload as unknown as Record<string, unknown>;
  const leadKey = typeof anyPayload.leadKey === "string" ? anyPayload.leadKey : "";
  return {
    fields: {
      Title: `runtime:${kind}:${key}`,
      Scenario: kind,
      Company: leadKey || key,
      "Contact Email": typeof anyPayload.email === "string" ? anyPayload.email : "",
      "Contact Name": typeof anyPayload.firstName === "string"
        ? `${anyPayload.firstName}${typeof anyPayload.lastName === "string" && anyPayload.lastName ? ` ${anyPayload.lastName}` : ""}`.trim()
        : "",
      Status: typeof anyPayload.status === "string" ? anyPayload.status : "RUNTIME",
      Touchpoint: kind,
      "AI Generated": JSON.stringify({ kind, key, payload }),
    },
  };
}

async function appendAitableRuntimeEntry(kind: AitableRuntimeKind, key: string, payload: AitableRuntimeEntry["payload"]) {
  const token = getAitableApiToken();
  if (!token || !getAitableDatasheetId()) {
    return;
  }

  await fetch(buildAitableRecordsUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      records: [buildAitableEntry(kind, key, payload)],
      fieldKey: "name",
    }),
  });
  invalidateAitableCache();
}

function parseAitableRuntimeEntry(raw: unknown) {
  const record = raw && typeof raw === "object" ? raw as { fields?: Record<string, unknown> } : undefined;
  const fields = record?.fields;
  const encoded = typeof fields?.["AI Generated"] === "string" ? fields["AI Generated"] : undefined;
  if (!encoded) {
    return null;
  }

  try {
    const parsed = JSON.parse(encoded) as Partial<AitableRuntimeEntry>;
    if (
      parsed &&
      typeof parsed.kind === "string" &&
      typeof parsed.key === "string" &&
      parsed.payload &&
      typeof parsed.payload === "object"
    ) {
      return parsed as AitableRuntimeEntry;
    }
  } catch {
    return null;
  }

  return null;
}

async function getAitableRuntimeEntries() {
  if (aitableCache && Date.now() - aitableCache.fetchedAt < 5000) {
    return aitableCache.entries;
  }

  const token = getAitableApiToken();
  const datasheetId = getAitableDatasheetId();
  if (!token || !datasheetId) {
    return [] as AitableRuntimeEntry[];
  }

  const entries: AitableRuntimeEntry[] = [];
  let pageNum = 1;
  const pageSize = 200;
  while (true) {
    const response = await fetch(buildAitableRecordsUrl(pageNum, pageSize), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      break;
    }

    const json = await response.json() as {
      data?: {
        total?: number;
        records?: unknown[];
      };
    };
    const records = Array.isArray(json.data?.records) ? json.data.records : [];
    for (const record of records) {
      const parsed = parseAitableRuntimeEntry(record);
      if (parsed) {
        entries.push(parsed);
      }
    }

    if (records.length < pageSize) {
      break;
    }
    pageNum += 1;
  }

  aitableCache = {
    fetchedAt: Date.now(),
    entries,
  };

  return entries;
}

export async function upsertLeadRecord(record: StoredLeadRecord) {
  leadStore.set(record.leadKey, record);

  const activePool = getPool();
  if (!activePool && runtimeMode() === "aitable") {
    await appendAitableRuntimeEntry("lead", record.leadKey, record);
    return record;
  }
  if (!activePool) {
    return record;
  }

  await ensureSchema();
  await queryPostgres(
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
  if (!getPool() && runtimeMode() === "aitable") {
    const records = await getLeadRecords();
    return records.find((record) => record.leadKey === leadKey);
  }
  if (!getPool()) {
    return leadStore.get(leadKey);
  }

  await ensureSchema();
  const result = await queryPostgres<{ payload: StoredLeadRecord }>(
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
  if (!getPool() && runtimeMode() === "aitable") {
    const records = getAitableRuntimeEntries();
    const latestByLead = new Map<string, StoredLeadRecord>();
    for (const entry of await records) {
      if (entry.kind !== "lead") continue;
      const record = entry.payload as StoredLeadRecord;
      const existing = latestByLead.get(record.leadKey);
      if (!existing || new Date(record.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        latestByLead.set(record.leadKey, record);
      }
    }
    const values = sortByUpdatedAt([...latestByLead.values()]);
    leadStore.clear();
    for (const value of values) {
      leadStore.set(value.leadKey, value);
    }
    return values;
  }
  if (!getPool()) {
    return sortByUpdatedAt([...leadStore.values()]);
  }

  await ensureSchema();
  const result = await queryPostgres<{ payload: StoredLeadRecord }>(
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
  if (!activePool && runtimeMode() === "aitable") {
    await Promise.all(events.map((event) => appendAitableRuntimeEntry("event", event.id, event)));
    return;
  }
  if (!activePool || events.length === 0) {
    return;
  }

  await ensureSchema();
  for (const event of events) {
    await queryPostgres(
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
  if (!getPool() && runtimeMode() === "aitable") {
    const entries = await getAitableRuntimeEntries();
    const events = entries
      .filter((entry) => entry.kind === "event")
      .map((entry) => entry.payload as CanonicalEvent)
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
    eventStore.length = 0;
    eventStore.push(...events);
    return events;
  }
  if (!getPool()) {
    return [...eventStore].slice().sort((left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
    );
  }

  await ensureSchema();
  const result = await queryPostgres<{ payload: CanonicalEvent }>(
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
    ...record,
    id: record.id ?? crypto.randomUUID(),
    createdAt: record.createdAt ?? new Date().toISOString(),
  };
  providerExecutionStore.unshift(normalizedRecord);

  const activePool = getPool();
  if (!activePool && runtimeMode() === "aitable") {
    await appendAitableRuntimeEntry("provider-execution", normalizedRecord.id, normalizedRecord);
    return normalizedRecord;
  }
  if (!activePool) {
    return normalizedRecord;
  }

  await ensureSchema();
  await queryPostgres(
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
  if (!getPool() && runtimeMode() === "aitable") {
    const entries = await getAitableRuntimeEntries();
    return sortByCreatedAt(
      entries
        .filter((entry) => entry.kind === "provider-execution")
        .map((entry) => entry.payload as ProviderExecutionRecord)
        .filter((record) => !leadKey || record.leadKey === leadKey),
    );
  }
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
  const result = await queryPostgres<{ payload: ProviderExecutionRecord }>(query.text, query.values);
  return result.rows.map((row) => row.payload);
}

export async function recordWorkflowRun(record: Omit<WorkflowRunRecord, "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
}) {
  const normalizedRecord: WorkflowRunRecord = {
    ...record,
    id: record.id ?? crypto.randomUUID(),
    createdAt: record.createdAt ?? new Date().toISOString(),
  };
  workflowRunStore.unshift(normalizedRecord);

  const activePool = getPool();
  if (!activePool && runtimeMode() === "aitable") {
    await appendAitableRuntimeEntry("workflow-run", normalizedRecord.id, normalizedRecord);
    return normalizedRecord;
  }
  if (!activePool) {
    return normalizedRecord;
  }

  await ensureSchema();
  await queryPostgres(
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
  if (!getPool() && runtimeMode() === "aitable") {
    const entries = await getAitableRuntimeEntries();
    return sortByCreatedAt(
      entries
        .filter((entry) => entry.kind === "workflow-run")
        .map((entry) => entry.payload as WorkflowRunRecord)
        .filter((record) => !leadKey || record.leadKey === leadKey),
    );
  }
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
  const result = await queryPostgres<{ payload: WorkflowRunRecord }>(query.text, query.values);
  return result.rows.map((row) => row.payload);
}

export async function upsertBookingJob(job: Omit<BookingJobRecord, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}) {
  const normalizedJob: BookingJobRecord = {
    ...job,
    id: job.id ?? crypto.randomUUID(),
    createdAt: job.createdAt ?? new Date().toISOString(),
    updatedAt: job.updatedAt ?? new Date().toISOString(),
  };
  bookingJobStore.set(normalizedJob.id, normalizedJob);

  const activePool = getPool();
  if (!activePool && runtimeMode() === "aitable") {
    await appendAitableRuntimeEntry("booking-job", normalizedJob.id, normalizedJob);
    return normalizedJob;
  }
  if (!activePool) {
    return normalizedJob;
  }

  await ensureSchema();
  await queryPostgres(
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
  if (!getPool() && runtimeMode() === "aitable") {
    const entries = await getAitableRuntimeEntries();
    const latestById = new Map<string, BookingJobRecord>();
    for (const entry of entries) {
      if (entry.kind !== "booking-job") continue;
      const record = entry.payload as BookingJobRecord;
      const existing = latestById.get(record.id);
      if (!existing || new Date(record.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        latestById.set(record.id, record);
      }
    }
    return sortByUpdatedAt(
      [...latestById.values()].filter((record) => !leadKey || record.leadKey === leadKey),
    );
  }
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
  const result = await queryPostgres<{ payload: BookingJobRecord }>(query.text, query.values);
  return result.rows.map((row) => row.payload);
}

export async function upsertDocumentJob(job: Omit<DocumentJobRecord, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}) {
  const normalizedJob: DocumentJobRecord = {
    ...job,
    id: job.id ?? crypto.randomUUID(),
    createdAt: job.createdAt ?? new Date().toISOString(),
    updatedAt: job.updatedAt ?? new Date().toISOString(),
  };
  documentJobStore.set(normalizedJob.id, normalizedJob);

  const activePool = getPool();
  if (!activePool && runtimeMode() === "aitable") {
    await appendAitableRuntimeEntry("document-job", normalizedJob.id, normalizedJob);
    return normalizedJob;
  }
  if (!activePool) {
    return normalizedJob;
  }

  await ensureSchema();
  await queryPostgres(
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
  if (!getPool() && runtimeMode() === "aitable") {
    const entries = await getAitableRuntimeEntries();
    const latestById = new Map<string, DocumentJobRecord>();
    for (const entry of entries) {
      if (entry.kind !== "document-job") continue;
      const record = entry.payload as DocumentJobRecord;
      const existing = latestById.get(record.id);
      if (!existing || new Date(record.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        latestById.set(record.id, record);
      }
    }
    return sortByUpdatedAt(
      [...latestById.values()].filter((record) => !leadKey || record.leadKey === leadKey),
    );
  }
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
  const result = await queryPostgres<{ payload: DocumentJobRecord }>(query.text, query.values);
  return result.rows.map((row) => row.payload);
}

export async function upsertRuntimeConfig(
  config: Omit<RuntimeConfigRecord, "updatedAt"> & { updatedAt?: string },
) {
  const normalizedConfig: RuntimeConfigRecord = {
    ...config,
    updatedAt: config.updatedAt ?? new Date().toISOString(),
  };
  runtimeConfigStore.set(normalizedConfig.key, normalizedConfig);

  const activePool = getPool();
  if (!activePool && runtimeMode() === "aitable") {
    await appendAitableRuntimeEntry("runtime-config", normalizedConfig.key, normalizedConfig);
    return normalizedConfig;
  }
  if (!activePool) {
    return normalizedConfig;
  }

  await ensureSchema();
  await queryPostgres(
    `
      INSERT INTO lead_os_runtime_config (key, updated_at, payload)
      VALUES ($1, $2::timestamptz, $3::jsonb)
      ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at
    `,
    [
      normalizedConfig.key,
      normalizedConfig.updatedAt,
      JSON.stringify(normalizedConfig),
    ],
  );
  return normalizedConfig;
}

export async function upsertWorkflowRegistry(
  record: Omit<WorkflowRegistryRecord, "updatedAt" | "lastProvisionedAt"> & {
    updatedAt?: string;
    lastProvisionedAt?: string;
  },
) {
  const normalizedRecord: WorkflowRegistryRecord = {
    ...record,
    updatedAt: record.updatedAt ?? new Date().toISOString(),
    lastProvisionedAt: record.lastProvisionedAt ?? record.updatedAt ?? new Date().toISOString(),
  };
  workflowRegistryStore.set(normalizedRecord.slug, normalizedRecord);

  const activePool = getPool();
  if (!activePool && runtimeMode() === "aitable") {
    await appendAitableRuntimeEntry("workflow-registry", normalizedRecord.slug, normalizedRecord);
    return normalizedRecord;
  }
  if (!activePool) {
    return normalizedRecord;
  }

  await ensureSchema();
  await queryPostgres(
    `
      INSERT INTO lead_os_workflow_registry (slug, provider, updated_at, payload)
      VALUES ($1, $2, $3::timestamptz, $4::jsonb)
      ON CONFLICT (slug) DO UPDATE SET
        provider = EXCLUDED.provider,
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at
    `,
    [
      normalizedRecord.slug,
      normalizedRecord.provider,
      normalizedRecord.updatedAt,
      JSON.stringify(normalizedRecord),
    ],
  );
  return normalizedRecord;
}

export async function getWorkflowRegistryRecord(slug: string) {
  if (!getPool() && runtimeMode() === "aitable") {
    const records = await getWorkflowRegistryRecords();
    return records.find((record) => record.slug === slug);
  }
  if (!getPool()) {
    return workflowRegistryStore.get(slug);
  }

  await ensureSchema();
  const result = await queryPostgres<{ payload: WorkflowRegistryRecord }>(
    "SELECT payload FROM lead_os_workflow_registry WHERE slug = $1 LIMIT 1",
    [slug],
  );
  const record = result.rows[0]?.payload;
  if (record) {
    workflowRegistryStore.set(record.slug, record);
  }
  return record;
}

export async function getWorkflowRegistryRecords() {
  if (!getPool() && runtimeMode() === "aitable") {
    const entries = await getAitableRuntimeEntries();
    const latestBySlug = new Map<string, WorkflowRegistryRecord>();
    for (const entry of entries) {
      if (entry.kind !== "workflow-registry") continue;
      const record = entry.payload as WorkflowRegistryRecord;
      const existing = latestBySlug.get(record.slug);
      if (!existing || new Date(record.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        latestBySlug.set(record.slug, record);
      }
    }
    const values = sortByUpdatedAt([...latestBySlug.values()]);
    workflowRegistryStore.clear();
    for (const value of values) {
      workflowRegistryStore.set(value.slug, value);
    }
    return values;
  }
  if (!getPool()) {
    return sortByUpdatedAt([...workflowRegistryStore.values()]);
  }

  await ensureSchema();
  const result = await queryPostgres<{ payload: WorkflowRegistryRecord }>(
    "SELECT payload FROM lead_os_workflow_registry ORDER BY updated_at DESC",
  );
  const records = result.rows.map((row) => row.payload);
  workflowRegistryStore.clear();
  for (const record of records) {
    workflowRegistryStore.set(record.slug, record);
  }
  return records;
}

export async function getRuntimeConfig(key: string) {
  if (!getPool() && runtimeMode() === "aitable") {
    const configs = await getRuntimeConfigs();
    return configs.find((entry) => entry.key === key);
  }
  if (!getPool()) {
    return runtimeConfigStore.get(key);
  }

  await ensureSchema();
  const result = await queryPostgres<{ payload: RuntimeConfigRecord }>(
    "SELECT payload FROM lead_os_runtime_config WHERE key = $1 LIMIT 1",
    [key],
  );
  const config = result.rows[0]?.payload;
  if (config) {
    runtimeConfigStore.set(config.key, config);
  }
  return config;
}

export async function getRuntimeConfigs() {
  if (!getPool() && runtimeMode() === "aitable") {
    const entries = await getAitableRuntimeEntries();
    const latestByKey = new Map<string, RuntimeConfigRecord>();
    for (const entry of entries) {
      if (entry.kind !== "runtime-config") continue;
      const record = entry.payload as RuntimeConfigRecord;
      const existing = latestByKey.get(record.key);
      if (!existing || new Date(record.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        latestByKey.set(record.key, record);
      }
    }
    const values = sortByUpdatedAt([...latestByKey.values()]);
    runtimeConfigStore.clear();
    for (const value of values) {
      runtimeConfigStore.set(value.key, value);
    }
    return values;
  }
  if (!getPool()) {
    return sortByUpdatedAt([...runtimeConfigStore.values()]);
  }

  await ensureSchema();
  const result = await queryPostgres<{ payload: RuntimeConfigRecord }>(
    "SELECT payload FROM lead_os_runtime_config ORDER BY updated_at DESC",
  );
  const configs = result.rows.map((row) => row.payload);
  runtimeConfigStore.clear();
  for (const config of configs) {
    runtimeConfigStore.set(config.key, config);
  }
  return configs;
}

export async function resetRuntimeStore() {
  leadStore.clear();
  eventStore.length = 0;
  providerExecutionStore.length = 0;
  workflowRunStore.length = 0;
  bookingJobStore.clear();
  documentJobStore.clear();
  workflowRegistryStore.clear();
  runtimeConfigStore.clear();
  invalidateAitableCache();

  const activePool = getPool();
  if (!activePool) {
    return;
  }

  if (process.env.LEAD_OS_ALLOW_RESET !== "true") {
    return;
  }

  await ensureSchema();
  await queryPostgres(`
    TRUNCATE TABLE
      lead_os_document_jobs,
      lead_os_booking_jobs,
      lead_os_workflow_registry,
      lead_os_runtime_config,
      lead_os_workflow_runs,
      lead_os_provider_executions,
      lead_os_events,
      lead_os_leads
  `);
}
