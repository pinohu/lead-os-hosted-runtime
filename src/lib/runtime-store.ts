import { Pool, type QueryResultRow } from "pg";
import { embeddedSecrets } from "./embedded-secrets.ts";
import type {
  CustomerMilestoneId,
  LeadMilestoneId,
  LeadStage,
  PlumbingOperatorActionType,
} from "./runtime-schema.ts";
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

export interface OperatorActionRecord {
  id: string;
  leadKey: string;
  actionType: PlumbingOperatorActionType;
  actorEmail: string;
  detail: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface IntakeAttemptRecord {
  replayKey: string;
  attempts: number;
  firstSeenAt: string;
  lastSeenAt: string;
  payload?: Record<string, unknown>;
}

export type ExecutionTaskKind = "workflow" | "booking" | "document";

export type ExecutionTaskStatus = "pending" | "processing" | "completed" | "failed";

export interface ExecutionTaskRecord {
  id: string;
  leadKey: string;
  kind: ExecutionTaskKind;
  provider: string;
  status: ExecutionTaskStatus;
  dedupeKey: string;
  attempts: number;
  payload?: Record<string, unknown>;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProviderDispatchRequestStatus = "pending" | "accepted" | "declined" | "expired";

export interface ProviderDispatchRequestRecord {
  id: string;
  leadKey: string;
  providerId: string;
  providerLabel: string;
  status: ProviderDispatchRequestStatus;
  issueType?: string;
  urgencyBand?: string;
  propertyType?: string;
  note?: string;
  payload?: Record<string, unknown>;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type DeploymentInstallType = "widget" | "iframe" | "wordpress-plugin" | "hosted-link";
export type DeploymentStatus = "planned" | "generated" | "live" | "paused" | "retired";

export interface DeploymentRegistryRecord {
  id: string;
  recipe?: string;
  entrypoint: string;
  niche: string;
  audience: string;
  pageType: string;
  installType: DeploymentInstallType;
  status: DeploymentStatus;
  domain?: string;
  pageUrl?: string;
  zip?: string;
  city?: string;
  providerId?: string;
  providerLabel?: string;
  hostedUrl: string;
  bootEndpoint: string;
  manifestEndpoint: string;
  generatorEndpoint?: string;
  pluginDownloadPath?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export type ObservabilityAlertDeliveryStatus = "sent" | "failed" | "suppressed";
export type ObservabilityAlertChannel = "email" | "sms" | "whatsapp";

export interface ObservabilityAlertDeliveryRecord {
  id: string;
  ruleId: string;
  title: string;
  recipientId: string;
  recipientLabel: string;
  channel: ObservabilityAlertChannel;
  status: ObservabilityAlertDeliveryStatus;
  detail: string;
  href?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

const leadStore = new Map<string, StoredLeadRecord>();
const eventStore: CanonicalEvent[] = [];
const providerExecutionStore: ProviderExecutionRecord[] = [];
const workflowRunStore: WorkflowRunRecord[] = [];
const bookingJobStore = new Map<string, BookingJobRecord>();
const documentJobStore = new Map<string, DocumentJobRecord>();
const workflowRegistryStore = new Map<string, WorkflowRegistryRecord>();
const runtimeConfigStore = new Map<string, RuntimeConfigRecord>();
const operatorActionStore = new Map<string, OperatorActionRecord>();
const intakeAttemptStore = new Map<string, IntakeAttemptRecord>();
const executionTaskStore = new Map<string, ExecutionTaskRecord>();
const providerDispatchRequestStore = new Map<string, ProviderDispatchRequestRecord>();
const deploymentRegistryStore = new Map<string, DeploymentRegistryRecord>();
const observabilityAlertDeliveryStore = new Map<string, ObservabilityAlertDeliveryRecord>();

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
  | "runtime-config"
  | "operator-action"
  | "intake-attempt"
  | "execution-task"
  | "provider-dispatch-request"
  | "deployment-registry"
  | "observability-alert-delivery";

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
    | RuntimeConfigRecord
    | OperatorActionRecord
    | IntakeAttemptRecord
    | ExecutionTaskRecord
    | ProviderDispatchRequestRecord
    | DeploymentRegistryRecord
    | ObservabilityAlertDeliveryRecord;
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

        CREATE TABLE IF NOT EXISTS lead_os_operator_actions (
          id TEXT PRIMARY KEY,
          lead_key TEXT NOT NULL,
          action_type TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          payload JSONB NOT NULL
        );

        CREATE TABLE IF NOT EXISTS lead_os_intake_attempts (
          replay_key TEXT PRIMARY KEY,
          first_seen_at TIMESTAMPTZ NOT NULL,
          last_seen_at TIMESTAMPTZ NOT NULL,
          payload JSONB NOT NULL
        );

        CREATE TABLE IF NOT EXISTS lead_os_execution_tasks (
          id TEXT PRIMARY KEY,
          lead_key TEXT NOT NULL,
          kind TEXT NOT NULL,
          provider TEXT NOT NULL,
          status TEXT NOT NULL,
          dedupe_key TEXT NOT NULL UNIQUE,
          updated_at TIMESTAMPTZ NOT NULL,
          payload JSONB NOT NULL
        );

        CREATE TABLE IF NOT EXISTS lead_os_provider_dispatch_requests (
          id TEXT PRIMARY KEY,
          lead_key TEXT NOT NULL,
          provider_id TEXT NOT NULL,
          status TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          payload JSONB NOT NULL
        );

        CREATE TABLE IF NOT EXISTS lead_os_deployment_registry (
          id TEXT PRIMARY KEY,
          status TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          payload JSONB NOT NULL
        );

        CREATE TABLE IF NOT EXISTS lead_os_observability_alert_deliveries (
          id TEXT PRIMARY KEY,
          rule_id TEXT NOT NULL,
          recipient_id TEXT NOT NULL,
          channel TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          payload JSONB NOT NULL
        );

        CREATE INDEX IF NOT EXISTS lead_os_events_lead_idx
          ON lead_os_events (lead_key, timestamp DESC);
        CREATE INDEX IF NOT EXISTS lead_os_provider_exec_lead_idx
          ON lead_os_provider_executions (lead_key, created_at DESC);
        CREATE INDEX IF NOT EXISTS lead_os_workflow_runs_lead_idx
          ON lead_os_workflow_runs (lead_key, created_at DESC);
        CREATE INDEX IF NOT EXISTS lead_os_operator_actions_lead_idx
          ON lead_os_operator_actions (lead_key, created_at DESC);
        CREATE INDEX IF NOT EXISTS lead_os_intake_attempts_last_seen_idx
          ON lead_os_intake_attempts (last_seen_at DESC);
        CREATE INDEX IF NOT EXISTS lead_os_execution_tasks_status_idx
          ON lead_os_execution_tasks (status, updated_at ASC);
        CREATE INDEX IF NOT EXISTS lead_os_provider_dispatch_requests_provider_idx
          ON lead_os_provider_dispatch_requests (provider_id, updated_at DESC);

        CREATE INDEX IF NOT EXISTS lead_os_deployment_registry_status_idx
          ON lead_os_deployment_registry (status, updated_at DESC);
        CREATE INDEX IF NOT EXISTS lead_os_observability_alert_deliveries_rule_idx
          ON lead_os_observability_alert_deliveries (rule_id, recipient_id, channel, created_at DESC);
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

export async function enqueueExecutionTask(
  task: Omit<ExecutionTaskRecord, "id" | "status" | "attempts" | "createdAt" | "updatedAt"> & {
    id?: string;
    status?: ExecutionTaskStatus;
    attempts?: number;
    createdAt?: string;
    updatedAt?: string;
  },
) {
  const normalizedTask: ExecutionTaskRecord = {
    ...task,
    id: task.id ?? crypto.randomUUID(),
    status: task.status ?? "pending",
    attempts: task.attempts ?? 0,
    createdAt: task.createdAt ?? new Date().toISOString(),
    updatedAt: task.updatedAt ?? new Date().toISOString(),
  };

  const existingWithSameDedupe = [...executionTaskStore.values()].find((record) => record.dedupeKey === normalizedTask.dedupeKey);
  if (existingWithSameDedupe) {
    return existingWithSameDedupe;
  }

  executionTaskStore.set(normalizedTask.id, normalizedTask);

  const activePool = getPool();
  if (!activePool && runtimeMode() === "aitable") {
    await appendAitableRuntimeEntry("execution-task", normalizedTask.id, normalizedTask);
    return normalizedTask;
  }
  if (!activePool) {
    return normalizedTask;
  }

  await ensureSchema();
  const existingResult = await queryPostgres<{ payload: ExecutionTaskRecord }>(
    "SELECT payload FROM lead_os_execution_tasks WHERE dedupe_key = $1 LIMIT 1",
    [normalizedTask.dedupeKey],
  );
  const existing = existingResult.rows[0]?.payload;
  if (existing) {
    executionTaskStore.set(existing.id, existing);
    return existing;
  }

  await queryPostgres(
    `
      INSERT INTO lead_os_execution_tasks (id, lead_key, kind, provider, status, dedupe_key, updated_at, payload)
      VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::jsonb)
      ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at
    `,
    [
      normalizedTask.id,
      normalizedTask.leadKey,
      normalizedTask.kind,
      normalizedTask.provider,
      normalizedTask.status,
      normalizedTask.dedupeKey,
      normalizedTask.updatedAt,
      JSON.stringify(normalizedTask),
    ],
  );
  return normalizedTask;
}

export async function getExecutionTasks(filters?: {
  leadKey?: string;
  status?: ExecutionTaskStatus;
  kind?: ExecutionTaskKind;
}) {
  const matches = (record: ExecutionTaskRecord) =>
    (!filters?.leadKey || record.leadKey === filters.leadKey) &&
    (!filters?.status || record.status === filters.status) &&
    (!filters?.kind || record.kind === filters.kind);

  if (!getPool() && runtimeMode() === "aitable") {
    const entries = await getAitableRuntimeEntries();
    const latestById = new Map<string, ExecutionTaskRecord>();
    for (const entry of entries) {
      if (entry.kind !== "execution-task") continue;
      const record = entry.payload as ExecutionTaskRecord;
      const existing = latestById.get(record.id);
      if (!existing || new Date(record.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        latestById.set(record.id, record);
      }
    }
    const values = sortByUpdatedAt([...latestById.values()].filter(matches));
    executionTaskStore.clear();
    for (const value of values) {
      executionTaskStore.set(value.id, value);
    }
    return values;
  }
  if (!getPool()) {
    return sortByUpdatedAt([...executionTaskStore.values()].filter(matches));
  }

  await ensureSchema();
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (filters?.leadKey) {
    values.push(filters.leadKey);
    clauses.push(`lead_key = $${values.length}`);
  }
  if (filters?.status) {
    values.push(filters.status);
    clauses.push(`status = $${values.length}`);
  }
  if (filters?.kind) {
    values.push(filters.kind);
    clauses.push(`kind = $${values.length}`);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await queryPostgres<{ payload: ExecutionTaskRecord }>(
    `SELECT payload FROM lead_os_execution_tasks ${where} ORDER BY updated_at ASC`,
    values,
  );
  const records = result.rows.map((row) => row.payload);
  for (const record of records) {
    executionTaskStore.set(record.id, record);
  }
  return records;
}

export async function markExecutionTaskProcessing(taskId: string) {
  const nowIso = new Date().toISOString();

  if (!getPool()) {
    const existing = executionTaskStore.get(taskId);
    if (!existing || existing.status !== "pending") {
      return undefined;
    }
    const updated: ExecutionTaskRecord = {
      ...existing,
      status: "processing",
      attempts: existing.attempts + 1,
      updatedAt: nowIso,
    };
    executionTaskStore.set(taskId, updated);
    if (runtimeMode() === "aitable") {
      await appendAitableRuntimeEntry("execution-task", updated.id, updated);
    }
    return updated;
  }

  await ensureSchema();
  const existingResult = await queryPostgres<{ payload: ExecutionTaskRecord }>(
    "SELECT payload FROM lead_os_execution_tasks WHERE id = $1 LIMIT 1",
    [taskId],
  );
  const existing = existingResult.rows[0]?.payload;
  if (!existing || existing.status !== "pending") {
    return undefined;
  }

  const updated: ExecutionTaskRecord = {
    ...existing,
    status: "processing",
    attempts: existing.attempts + 1,
    updatedAt: nowIso,
  };
  executionTaskStore.set(taskId, updated);
  await queryPostgres(
    `
      UPDATE lead_os_execution_tasks
      SET status = 'processing', updated_at = $2::timestamptz, payload = $3::jsonb
      WHERE id = $1 AND status = 'pending'
    `,
    [taskId, updated.updatedAt, JSON.stringify(updated)],
  );
  return updated;
}

export async function finalizeExecutionTask(
  taskId: string,
  outcome: { status: Extract<ExecutionTaskStatus, "completed" | "failed">; lastError?: string; payload?: Record<string, unknown> },
) {
  const existing = executionTaskStore.get(taskId) ?? (await getExecutionTasks()).find((task) => task.id === taskId);
  if (!existing) return undefined;
  const updated: ExecutionTaskRecord = {
    ...existing,
    status: outcome.status,
    lastError: outcome.lastError,
    payload: outcome.payload ?? existing.payload,
    updatedAt: new Date().toISOString(),
  };
  executionTaskStore.set(taskId, updated);

  const activePool = getPool();
  if (!activePool && runtimeMode() === "aitable") {
    await appendAitableRuntimeEntry("execution-task", updated.id, updated);
    return updated;
  }
  if (!activePool) {
    return updated;
  }

  await ensureSchema();
  await queryPostgres(
    `
      UPDATE lead_os_execution_tasks
      SET status = $2, updated_at = $3::timestamptz, payload = $4::jsonb
      WHERE id = $1
    `,
    [taskId, updated.status, updated.updatedAt, JSON.stringify(updated)],
  );
  return updated;
}

export async function upsertProviderDispatchRequest(
  request: Omit<ProviderDispatchRequestRecord, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
    createdAt?: string;
    updatedAt?: string;
  },
) {
  const normalizedRequest: ProviderDispatchRequestRecord = {
    ...request,
    id: request.id ?? crypto.randomUUID(),
    createdAt: request.createdAt ?? new Date().toISOString(),
    updatedAt: request.updatedAt ?? new Date().toISOString(),
  };
  providerDispatchRequestStore.set(normalizedRequest.id, normalizedRequest);

  const activePool = getPool();
  if (!activePool && runtimeMode() === "aitable") {
    await appendAitableRuntimeEntry("provider-dispatch-request", normalizedRequest.id, normalizedRequest);
    return normalizedRequest;
  }
  if (!activePool) {
    return normalizedRequest;
  }

  await ensureSchema();
  await queryPostgres(
    `
      INSERT INTO lead_os_provider_dispatch_requests (id, lead_key, provider_id, status, updated_at, payload)
      VALUES ($1, $2, $3, $4, $5::timestamptz, $6::jsonb)
      ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at, status = EXCLUDED.status
    `,
    [
      normalizedRequest.id,
      normalizedRequest.leadKey,
      normalizedRequest.providerId,
      normalizedRequest.status,
      normalizedRequest.updatedAt,
      JSON.stringify(normalizedRequest),
    ],
  );
  return normalizedRequest;
}

export async function getProviderDispatchRequests(filters?: {
  providerId?: string;
  leadKey?: string;
  status?: ProviderDispatchRequestStatus;
}) {
  const matches = (record: ProviderDispatchRequestRecord) =>
    (!filters?.providerId || record.providerId === filters.providerId) &&
    (!filters?.leadKey || record.leadKey === filters.leadKey) &&
    (!filters?.status || record.status === filters.status);

  if (!getPool() && runtimeMode() === "aitable") {
    const entries = await getAitableRuntimeEntries();
    const latestById = new Map<string, ProviderDispatchRequestRecord>();
    for (const entry of entries) {
      if (entry.kind !== "provider-dispatch-request") continue;
      const record = entry.payload as ProviderDispatchRequestRecord;
      const existing = latestById.get(record.id);
      if (!existing || new Date(record.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        latestById.set(record.id, record);
      }
    }
    const values = sortByUpdatedAt([...latestById.values()].filter(matches));
    providerDispatchRequestStore.clear();
    for (const value of values) {
      providerDispatchRequestStore.set(value.id, value);
    }
    return values;
  }
  if (!getPool()) {
    return sortByUpdatedAt([...providerDispatchRequestStore.values()].filter(matches));
  }

  await ensureSchema();
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (filters?.providerId) {
    values.push(filters.providerId);
    clauses.push(`provider_id = $${values.length}`);
  }
  if (filters?.leadKey) {
    values.push(filters.leadKey);
    clauses.push(`lead_key = $${values.length}`);
  }
  if (filters?.status) {
    values.push(filters.status);
    clauses.push(`status = $${values.length}`);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await queryPostgres<{ payload: ProviderDispatchRequestRecord }>(
    `SELECT payload FROM lead_os_provider_dispatch_requests ${where} ORDER BY updated_at DESC`,
    values,
  );
  const records = result.rows.map((row) => row.payload);
  for (const record of records) {
    providerDispatchRequestStore.set(record.id, record);
  }
  return records;
}

export async function getProviderDispatchRequestById(requestId: string) {
  const records = await getProviderDispatchRequests();
  return records.find((record) => record.id === requestId);
}

export async function upsertDeploymentRegistryRecord(
  record: Omit<DeploymentRegistryRecord, "createdAt" | "updatedAt"> & {
    createdAt?: string;
    updatedAt?: string;
  },
) {
  const existing = deploymentRegistryStore.get(record.id) ?? await getDeploymentRegistryRecordById(record.id);
  const normalizedRecord: DeploymentRegistryRecord = {
    ...record,
    createdAt: existing?.createdAt ?? record.createdAt ?? new Date().toISOString(),
    updatedAt: record.updatedAt ?? new Date().toISOString(),
  };
  deploymentRegistryStore.set(normalizedRecord.id, normalizedRecord);

  const activePool = getPool();
  if (!activePool && runtimeMode() === "aitable") {
    await appendAitableRuntimeEntry("deployment-registry", normalizedRecord.id, normalizedRecord);
    return normalizedRecord;
  }
  if (!activePool) {
    return normalizedRecord;
  }

  await ensureSchema();
  await queryPostgres(
    `
      INSERT INTO lead_os_deployment_registry (id, status, updated_at, payload)
      VALUES ($1, $2, $3::timestamptz, $4::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at,
        payload = EXCLUDED.payload
    `,
    [
      normalizedRecord.id,
      normalizedRecord.status,
      normalizedRecord.updatedAt,
      JSON.stringify(normalizedRecord),
    ],
  );
  return normalizedRecord;
}

export async function getDeploymentRegistryRecordById(id: string) {
  const records = await getDeploymentRegistryRecords({ id });
  return records[0];
}

export async function getDeploymentRegistryRecords(filters?: {
  id?: string;
  status?: DeploymentStatus;
  pageType?: string;
  audience?: string;
}) {
  const matches = (record: DeploymentRegistryRecord) =>
    (!filters?.id || record.id === filters.id) &&
    (!filters?.status || record.status === filters.status) &&
    (!filters?.pageType || record.pageType === filters.pageType) &&
    (!filters?.audience || record.audience === filters.audience);

  if (!getPool() && runtimeMode() === "aitable") {
    const entries = await getAitableRuntimeEntries();
    const latestById = new Map<string, DeploymentRegistryRecord>();
    for (const entry of entries) {
      if (entry.kind !== "deployment-registry") continue;
      const record = entry.payload as DeploymentRegistryRecord;
      const existing = latestById.get(record.id);
      if (!existing || new Date(record.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        latestById.set(record.id, record);
      }
    }
    const values = sortByUpdatedAt([...latestById.values()].filter(matches));
    deploymentRegistryStore.clear();
    for (const value of values) {
      deploymentRegistryStore.set(value.id, value);
    }
    return values;
  }
  if (!getPool()) {
    return sortByUpdatedAt([...deploymentRegistryStore.values()].filter(matches));
  }

  await ensureSchema();
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (filters?.id) {
    values.push(filters.id);
    clauses.push(`id = $${values.length}`);
  }
  if (filters?.status) {
    values.push(filters.status);
    clauses.push(`status = $${values.length}`);
  }
  if (filters?.pageType) {
    values.push(filters.pageType);
    clauses.push(`payload->>'pageType' = $${values.length}`);
  }
  if (filters?.audience) {
    values.push(filters.audience);
    clauses.push(`payload->>'audience' = $${values.length}`);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await queryPostgres<{ payload: DeploymentRegistryRecord }>(
    `SELECT payload FROM lead_os_deployment_registry ${where} ORDER BY updated_at DESC`,
    values,
  );
  const records = result.rows.map((row) => row.payload);
  deploymentRegistryStore.clear();
  for (const record of records) {
    deploymentRegistryStore.set(record.id, record);
  }
  return records;
}

export async function recordObservabilityAlertDelivery(
  record: Omit<ObservabilityAlertDeliveryRecord, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  },
) {
  const normalizedRecord: ObservabilityAlertDeliveryRecord = {
    ...record,
    id: record.id ?? crypto.randomUUID(),
    createdAt: record.createdAt ?? new Date().toISOString(),
  };
  observabilityAlertDeliveryStore.set(normalizedRecord.id, normalizedRecord);

  const activePool = getPool();
  if (!activePool && runtimeMode() === "aitable") {
    await appendAitableRuntimeEntry("observability-alert-delivery", normalizedRecord.id, normalizedRecord);
    return normalizedRecord;
  }
  if (!activePool) {
    return normalizedRecord;
  }

  await ensureSchema();
  await queryPostgres(
    `
      INSERT INTO lead_os_observability_alert_deliveries (id, rule_id, recipient_id, channel, status, created_at, payload)
      VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        rule_id = EXCLUDED.rule_id,
        recipient_id = EXCLUDED.recipient_id,
        channel = EXCLUDED.channel,
        status = EXCLUDED.status,
        created_at = EXCLUDED.created_at,
        payload = EXCLUDED.payload
    `,
    [
      normalizedRecord.id,
      normalizedRecord.ruleId,
      normalizedRecord.recipientId,
      normalizedRecord.channel,
      normalizedRecord.status,
      normalizedRecord.createdAt,
      JSON.stringify(normalizedRecord),
    ],
  );
  return normalizedRecord;
}

export async function getObservabilityAlertDeliveries(filters?: {
  ruleId?: string;
  recipientId?: string;
  channel?: ObservabilityAlertChannel;
  status?: ObservabilityAlertDeliveryStatus;
}) {
  const matches = (record: ObservabilityAlertDeliveryRecord) =>
    (!filters?.ruleId || record.ruleId === filters.ruleId) &&
    (!filters?.recipientId || record.recipientId === filters.recipientId) &&
    (!filters?.channel || record.channel === filters.channel) &&
    (!filters?.status || record.status === filters.status);

  if (!getPool() && runtimeMode() === "aitable") {
    const entries = await getAitableRuntimeEntries();
    const latestById = new Map<string, ObservabilityAlertDeliveryRecord>();
    for (const entry of entries) {
      if (entry.kind !== "observability-alert-delivery") continue;
      const record = entry.payload as ObservabilityAlertDeliveryRecord;
      const existing = latestById.get(record.id);
      if (!existing || new Date(record.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        latestById.set(record.id, record);
      }
    }
    const values = sortByCreatedAt([...latestById.values()].filter(matches));
    observabilityAlertDeliveryStore.clear();
    for (const value of values) {
      observabilityAlertDeliveryStore.set(value.id, value);
    }
    return values;
  }
  if (!getPool()) {
    return sortByCreatedAt([...observabilityAlertDeliveryStore.values()].filter(matches));
  }

  await ensureSchema();
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (filters?.ruleId) {
    values.push(filters.ruleId);
    clauses.push(`rule_id = $${values.length}`);
  }
  if (filters?.recipientId) {
    values.push(filters.recipientId);
    clauses.push(`recipient_id = $${values.length}`);
  }
  if (filters?.channel) {
    values.push(filters.channel);
    clauses.push(`channel = $${values.length}`);
  }
  if (filters?.status) {
    values.push(filters.status);
    clauses.push(`status = $${values.length}`);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await queryPostgres<{ payload: ObservabilityAlertDeliveryRecord }>(
    `SELECT payload FROM lead_os_observability_alert_deliveries ${where} ORDER BY created_at DESC`,
    values,
  );
  const records = result.rows.map((row) => row.payload);
  observabilityAlertDeliveryStore.clear();
  for (const record of records) {
    observabilityAlertDeliveryStore.set(record.id, record);
  }
  return records;
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

export async function recordOperatorAction(
  record: Omit<OperatorActionRecord, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  },
) {
  const normalizedRecord: OperatorActionRecord = {
    ...record,
    id: record.id ?? crypto.randomUUID(),
    createdAt: record.createdAt ?? new Date().toISOString(),
  };
  operatorActionStore.set(normalizedRecord.id, normalizedRecord);

  const activePool = getPool();
  if (!activePool && runtimeMode() === "aitable") {
    await appendAitableRuntimeEntry("operator-action", normalizedRecord.id, normalizedRecord);
    return normalizedRecord;
  }
  if (!activePool) {
    return normalizedRecord;
  }

  await ensureSchema();
  await queryPostgres(
    `
      INSERT INTO lead_os_operator_actions (id, lead_key, action_type, created_at, payload)
      VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb)
      ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, created_at = EXCLUDED.created_at
    `,
    [
      normalizedRecord.id,
      normalizedRecord.leadKey,
      normalizedRecord.actionType,
      normalizedRecord.createdAt,
      JSON.stringify(normalizedRecord),
    ],
  );
  return normalizedRecord;
}

export async function getOperatorActions(leadKey?: string) {
  if (!getPool() && runtimeMode() === "aitable") {
    const entries = await getAitableRuntimeEntries();
    return sortByCreatedAt(
      entries
        .filter((entry) => entry.kind === "operator-action")
        .map((entry) => entry.payload as OperatorActionRecord)
        .filter((record) => !leadKey || record.leadKey === leadKey),
    );
  }
  if (!getPool()) {
    return sortByCreatedAt(
      [...operatorActionStore.values()].filter((record) => !leadKey || record.leadKey === leadKey),
    );
  }

  await ensureSchema();
  const query = leadKey
    ? {
        text: "SELECT payload FROM lead_os_operator_actions WHERE lead_key = $1 ORDER BY created_at DESC",
        values: [leadKey],
      }
    : {
        text: "SELECT payload FROM lead_os_operator_actions ORDER BY created_at DESC",
        values: [] as unknown[],
      };
  const result = await queryPostgres<{ payload: OperatorActionRecord }>(query.text, query.values);
  return result.rows.map((row) => row.payload);
}

export async function claimIntakeReplayKey(
  replayKey: string,
  windowMs: number,
  payload?: Record<string, unknown>,
) {
  const nowIso = new Date().toISOString();

  if (!getPool()) {
    const existing = intakeAttemptStore.get(replayKey);
    const replayed = Boolean(
      existing &&
      Date.now() - new Date(existing.lastSeenAt).getTime() < windowMs,
    );
    const record: IntakeAttemptRecord = {
      replayKey,
      attempts: (existing?.attempts ?? 0) + 1,
      firstSeenAt: replayed ? existing!.firstSeenAt : nowIso,
      lastSeenAt: nowIso,
      payload,
    };
    intakeAttemptStore.set(replayKey, record);
    if (runtimeMode() === "aitable") {
      await appendAitableRuntimeEntry("intake-attempt", replayKey, record);
    }
    return {
      replayed,
      record,
    };
  }

  await ensureSchema();
  const existingResult = await queryPostgres<{ payload: IntakeAttemptRecord }>(
    "SELECT payload FROM lead_os_intake_attempts WHERE replay_key = $1 LIMIT 1",
    [replayKey],
  );
  const existing = existingResult.rows[0]?.payload;
  const replayed = Boolean(
    existing &&
    Date.now() - new Date(existing.lastSeenAt).getTime() < windowMs,
  );
  const record: IntakeAttemptRecord = {
    replayKey,
    attempts: (existing?.attempts ?? 0) + 1,
    firstSeenAt: replayed ? existing!.firstSeenAt : nowIso,
    lastSeenAt: nowIso,
    payload,
  };
  intakeAttemptStore.set(replayKey, record);
  await queryPostgres(
    `
      INSERT INTO lead_os_intake_attempts (replay_key, first_seen_at, last_seen_at, payload)
      VALUES ($1, $2::timestamptz, $3::timestamptz, $4::jsonb)
      ON CONFLICT (replay_key) DO UPDATE SET
        first_seen_at = EXCLUDED.first_seen_at,
        last_seen_at = EXCLUDED.last_seen_at,
        payload = EXCLUDED.payload
    `,
    [record.replayKey, record.firstSeenAt, record.lastSeenAt, JSON.stringify(record)],
  );
  return {
    replayed,
    record,
  };
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
  operatorActionStore.clear();
  intakeAttemptStore.clear();
  executionTaskStore.clear();
  providerDispatchRequestStore.clear();
  deploymentRegistryStore.clear();
  observabilityAlertDeliveryStore.clear();
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
      lead_os_operator_actions,
      lead_os_intake_attempts,
      lead_os_execution_tasks,
      lead_os_provider_dispatch_requests,
      lead_os_deployment_registry,
      lead_os_observability_alert_deliveries,
      lead_os_workflow_runs,
      lead_os_provider_executions,
      lead_os_events,
      lead_os_leads
  `);
}
