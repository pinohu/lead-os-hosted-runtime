import {
  createBookingAction,
  emitWorkflowAction,
  generateDocumentAction,
  type ProviderResult,
} from "./providers.ts";
import {
  appendEvents,
  finalizeExecutionTask,
  getExecutionTasks,
  markExecutionTaskProcessing,
  recordProviderExecution,
  recordWorkflowRun,
  upsertBookingJob,
  upsertDocumentJob,
  type ExecutionTaskRecord,
} from "./runtime-store.ts";
import { createCanonicalEvent, type TraceContext } from "./trace.ts";

function failedProviderResult(
  provider: string,
  detail: string,
  payload?: Record<string, unknown>,
): ProviderResult {
  return {
    ok: false,
    provider,
    mode: "live",
    detail,
    payload,
  };
}

async function safelyRunProviderAction(
  provider: string,
  action: () => Promise<ProviderResult>,
  payload?: Record<string, unknown>,
) {
  try {
    return await action();
  } catch (error) {
    return failedProviderResult(
      provider,
      error instanceof Error ? error.message : `${provider} action failed`,
      payload,
    );
  }
}

function resolveBookingJobStatus(result: Awaited<ReturnType<typeof createBookingAction>>) {
  if (result.mode === "dry-run") {
    return "prepared";
  }
  if (!result.ok) {
    return result.mode === "live" ? "unavailable" : "failed";
  }

  const detail = result.detail.toLowerCase();
  if (detail.includes("submitted")) return "booked";
  if (detail.includes("handoff ready")) return "handoff-ready";
  if (detail.includes("availability")) return "availability-found";
  if (detail.includes("handoff") || detail.includes("destination")) return "handoff-ready";
  return result.mode === "prepared" ? "prepared" : "ready";
}

function resolveDocumentJobStatus(result: Awaited<ReturnType<typeof generateDocumentAction>>) {
  if (result.mode === "dry-run") return "prepared";
  if (!result.ok) return "failed";
  return result.mode === "live" ? "generated" : "prepared";
}

async function processWorkflowTask(task: ExecutionTaskRecord) {
  const eventName = String(task.payload?.eventName ?? "lead.captured");
  const workflowPayload =
    task.payload?.workflowPayload && typeof task.payload.workflowPayload === "object"
      ? task.payload.workflowPayload as Record<string, unknown>
      : {};
  const result = await safelyRunProviderAction("n8n", () => emitWorkflowAction(eventName, workflowPayload), workflowPayload);

  await recordWorkflowRun({
    leadKey: task.leadKey,
    eventName,
    provider: result.provider,
    ok: result.ok,
    mode: result.mode,
    detail: result.detail,
    payload: result.payload,
  });

  await finalizeExecutionTask(task.id, {
    status: result.ok ? "completed" : "failed",
    lastError: result.ok ? undefined : result.detail,
    payload: {
      ...(task.payload ?? {}),
      result,
    },
  });

  return {
    taskId: task.id,
    kind: task.kind,
    ok: result.ok,
    detail: result.detail,
  };
}

async function processBookingTask(task: ExecutionTaskRecord) {
  const bookingPayload =
    task.payload?.bookingPayload && typeof task.payload.bookingPayload === "object"
      ? task.payload.bookingPayload as Record<string, unknown>
      : {};
  const bookingJobId = typeof task.payload?.bookingJobId === "string" ? task.payload.bookingJobId : undefined;
  const result = await safelyRunProviderAction("Trafft", () => createBookingAction(bookingPayload), bookingPayload);

  if (bookingJobId) {
    await upsertBookingJob({
      id: bookingJobId,
      leadKey: task.leadKey,
      provider: result.provider,
      status: resolveBookingJobStatus(result),
      detail: result.detail,
      payload: {
        ...(task.payload ?? {}),
        ...result.payload,
      },
    });
  }

  await recordProviderExecution({
    leadKey: task.leadKey,
    provider: result.provider,
    kind: "booking",
    ok: result.ok,
    mode: result.mode,
    detail: result.detail,
    payload: result.payload,
  });

  await finalizeExecutionTask(task.id, {
    status: result.ok ? "completed" : "failed",
    lastError: result.ok ? undefined : result.detail,
    payload: {
      ...(task.payload ?? {}),
      result,
    },
  });

  return {
    taskId: task.id,
    kind: task.kind,
    ok: result.ok,
    detail: result.detail,
  };
}

async function processDocumentTask(task: ExecutionTaskRecord) {
  const documentPayload =
    task.payload?.documentPayload && typeof task.payload.documentPayload === "object"
      ? task.payload.documentPayload as Record<string, unknown>
      : {};
  const documentJobId = typeof task.payload?.documentJobId === "string" ? task.payload.documentJobId : undefined;
  const documentType = typeof task.payload?.documentType === "string" ? task.payload.documentType : undefined;
  const trace =
    task.payload?.trace && typeof task.payload.trace === "object"
      ? task.payload.trace as TraceContext
      : undefined;
  const result = await safelyRunProviderAction("Documentero", () => generateDocumentAction(documentPayload), documentPayload);

  if (documentJobId) {
    await upsertDocumentJob({
      id: documentJobId,
      leadKey: task.leadKey,
      provider: result.provider,
      status: resolveDocumentJobStatus(result),
      detail: result.detail,
      payload: {
        ...(task.payload ?? {}),
        ...result.payload,
      },
    });
  }

  if (result.ok && result.mode === "live" && documentType === "proposal" && trace) {
    await appendEvents([
      createCanonicalEvent(trace, "proposal_sent", "internal", "SENT", {
        provider: result.provider,
        documentType,
      }),
    ]);
  }

  await recordProviderExecution({
    leadKey: task.leadKey,
    provider: result.provider,
    kind: "documents",
    ok: result.ok,
    mode: result.mode,
    detail: result.detail,
    payload: result.payload,
  });

  await finalizeExecutionTask(task.id, {
    status: result.ok ? "completed" : "failed",
    lastError: result.ok ? undefined : result.detail,
    payload: {
      ...(task.payload ?? {}),
      result,
    },
  });

  return {
    taskId: task.id,
    kind: task.kind,
    ok: result.ok,
    detail: result.detail,
  };
}

export async function processExecutionTasks(limit = 25) {
  const pending = await getExecutionTasks({ status: "pending" });
  const claimed = [];
  for (const candidate of pending.slice(0, limit)) {
    const task = await markExecutionTaskProcessing(candidate.id);
    if (task) {
      claimed.push(task);
    }
  }

  const results = [];
  for (const task of claimed) {
    if (task.kind === "workflow") {
      results.push(await processWorkflowTask(task));
      continue;
    }
    if (task.kind === "booking") {
      results.push(await processBookingTask(task));
      continue;
    }
    if (task.kind === "document") {
      results.push(await processDocumentTask(task));
    }
  }

  return {
    count: results.length,
    results,
  };
}
