import {
  createBookingAction,
  emitWorkflowAction,
  generateDocumentAction,
  sendAlertAction,
  sendEmailAction,
  sendSmsAction,
  sendWhatsAppAction,
  type ProviderResult,
} from "./providers.ts";
import {
  appendEvents,
  finalizeExecutionTask,
  getExecutionTasks,
  markExecutionTaskProcessing,
  markNurtureStageSent,
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

async function processEmailTask(task: ExecutionTaskRecord) {
  const emailPayload =
    task.payload?.emailPayload && typeof task.payload.emailPayload === "object"
      ? task.payload.emailPayload as { to?: string; subject?: string; html?: string; trace?: TraceContext; nurtureStageId?: string }
      : {};
  const trace = emailPayload.trace;
  const result = await safelyRunProviderAction("Emailit", () => sendEmailAction({
    to: String(emailPayload.to ?? ""),
    subject: String(emailPayload.subject ?? ""),
    html: String(emailPayload.html ?? ""),
    trace: trace as TraceContext,
  }), task.payload ?? undefined);

  await recordProviderExecution({
    leadKey: task.leadKey,
    provider: result.provider,
    kind: "email",
    ok: result.ok,
    mode: result.mode,
    detail: result.detail,
    payload: result.payload,
  });
  if (trace) {
    await appendEvents([
      createCanonicalEvent(trace, "followup_email_sent", "email", result.ok ? "SENT" : "FAILED"),
    ]);
  }
  if (result.ok && emailPayload.nurtureStageId) {
    await markNurtureStageSent(task.leadKey, emailPayload.nurtureStageId);
  }

  await finalizeExecutionTask(task.id, {
    status: result.ok ? "completed" : "failed",
    lastError: result.ok ? undefined : result.detail,
    payload: { ...(task.payload ?? {}), result },
  });
  return { taskId: task.id, kind: task.kind, ok: result.ok, detail: result.detail };
}

async function processSmsTask(task: ExecutionTaskRecord) {
  const smsPayload =
    task.payload?.smsPayload && typeof task.payload.smsPayload === "object"
      ? task.payload.smsPayload as { phone?: string; body?: string; trace?: TraceContext }
      : {};
  const trace = smsPayload.trace;
  const result = await safelyRunProviderAction("Easy Text Marketing", () => sendSmsAction({
    phone: String(smsPayload.phone ?? ""),
    body: String(smsPayload.body ?? ""),
  }), task.payload ?? undefined);

  await recordProviderExecution({
    leadKey: task.leadKey,
    provider: result.provider,
    kind: "sms",
    ok: result.ok,
    mode: result.mode,
    detail: result.detail,
    payload: result.payload,
  });
  if (trace) {
    await appendEvents([
      createCanonicalEvent(trace, "followup_sms_sent", "sms", result.ok ? "SENT" : "FAILED"),
    ]);
  }

  await finalizeExecutionTask(task.id, {
    status: result.ok ? "completed" : "failed",
    lastError: result.ok ? undefined : result.detail,
    payload: { ...(task.payload ?? {}), result },
  });
  return { taskId: task.id, kind: task.kind, ok: result.ok, detail: result.detail };
}

async function processWhatsAppTask(task: ExecutionTaskRecord) {
  const whatsappPayload =
    task.payload?.whatsappPayload && typeof task.payload.whatsappPayload === "object"
      ? task.payload.whatsappPayload as { phone?: string; body?: string; trace?: TraceContext }
      : {};
  const trace = whatsappPayload.trace;
  const result = await safelyRunProviderAction("WbizTool", () => sendWhatsAppAction({
    phone: String(whatsappPayload.phone ?? ""),
    body: String(whatsappPayload.body ?? ""),
  }), task.payload ?? undefined);

  await recordProviderExecution({
    leadKey: task.leadKey,
    provider: result.provider,
    kind: "whatsapp",
    ok: result.ok,
    mode: result.mode,
    detail: result.detail,
    payload: result.payload,
  });
  if (trace) {
    await appendEvents([
      createCanonicalEvent(trace, "followup_whatsapp_sent", "whatsapp", result.ok ? "SENT" : "FAILED"),
    ]);
  }

  await finalizeExecutionTask(task.id, {
    status: result.ok ? "completed" : "failed",
    lastError: result.ok ? undefined : result.detail,
    payload: { ...(task.payload ?? {}), result },
  });
  return { taskId: task.id, kind: task.kind, ok: result.ok, detail: result.detail };
}

async function processAlertTask(task: ExecutionTaskRecord) {
  const alertPayload =
    task.payload?.alertPayload && typeof task.payload.alertPayload === "object"
      ? task.payload.alertPayload as { title?: string; body?: string; trace?: TraceContext }
      : {};
  const result = await safelyRunProviderAction("Ops Alert", () => sendAlertAction({
    title: String(alertPayload.title ?? ""),
    body: String(alertPayload.body ?? ""),
    trace: alertPayload.trace as TraceContext,
  }), task.payload ?? undefined);

  await recordProviderExecution({
    leadKey: task.leadKey,
    provider: result.provider,
    kind: "alert",
    ok: result.ok,
    mode: result.mode,
    detail: result.detail,
    payload: result.payload,
  });

  await finalizeExecutionTask(task.id, {
    status: result.ok ? "completed" : "failed",
    lastError: result.ok ? undefined : result.detail,
    payload: { ...(task.payload ?? {}), result },
  });
  return { taskId: task.id, kind: task.kind, ok: result.ok, detail: result.detail };
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
      continue;
    }
    if (task.kind === "email") {
      results.push(await processEmailTask(task));
      continue;
    }
    if (task.kind === "sms") {
      results.push(await processSmsTask(task));
      continue;
    }
    if (task.kind === "whatsapp") {
      results.push(await processWhatsAppTask(task));
      continue;
    }
    if (task.kind === "alert") {
      results.push(await processAlertTask(task));
    }
  }

  return {
    count: results.length,
    results,
  };
}
