import {
  createBookingAction,
  emitWorkflowAction,
  generateDocumentAction,
  sendAlertAction,
  sendConfiguredSmsAction,
  sendConfiguredSmsFallbackAction,
  startReferralAction,
  startCommerceAction,
  sendEmailAction,
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

function isOperationalSuccess(result: ProviderResult) {
  return result.ok && result.mode === "live";
}

function buildTaskFailureDetail(result: ProviderResult) {
  return result.mode === "prepared"
    ? `Provider is configured but not fully executable: ${result.detail}`
    : result.detail;
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
    status: isOperationalSuccess(result) ? "completed" : "failed",
    lastError: isOperationalSuccess(result) ? undefined : buildTaskFailureDetail(result),
    payload: {
      ...(task.payload ?? {}),
      result,
    },
  });

  return {
    taskId: task.id,
    kind: task.kind,
    ok: isOperationalSuccess(result),
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
    status: isOperationalSuccess(result) ? "completed" : "failed",
    lastError: isOperationalSuccess(result) ? undefined : buildTaskFailureDetail(result),
    payload: {
      ...(task.payload ?? {}),
      result,
    },
  });

  return {
    taskId: task.id,
    kind: task.kind,
    ok: isOperationalSuccess(result),
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

  if (isOperationalSuccess(result) && documentType === "proposal" && trace) {
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
    status: isOperationalSuccess(result) ? "completed" : "failed",
    lastError: isOperationalSuccess(result) ? undefined : buildTaskFailureDetail(result),
    payload: {
      ...(task.payload ?? {}),
      result,
    },
  });

  return {
    taskId: task.id,
    kind: task.kind,
    ok: isOperationalSuccess(result),
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
      createCanonicalEvent(trace, "followup_email_sent", "email", isOperationalSuccess(result) ? "SENT" : "FAILED"),
    ]);
  }
  if (isOperationalSuccess(result) && emailPayload.nurtureStageId) {
    await markNurtureStageSent(task.leadKey, emailPayload.nurtureStageId);
  }

  await finalizeExecutionTask(task.id, {
    status: isOperationalSuccess(result) ? "completed" : "failed",
    lastError: isOperationalSuccess(result) ? undefined : buildTaskFailureDetail(result),
    payload: { ...(task.payload ?? {}), result },
  });
  return { taskId: task.id, kind: task.kind, ok: isOperationalSuccess(result), detail: result.detail };
}

async function processSmsTask(task: ExecutionTaskRecord) {
  const smsPayload =
    task.payload?.smsPayload && typeof task.payload.smsPayload === "object"
      ? task.payload.smsPayload as { phone?: string; body?: string; trace?: TraceContext }
      : {};
  const trace = smsPayload.trace;
  const result = await safelyRunProviderAction("SMS", () => sendConfiguredSmsAction({
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
      createCanonicalEvent(trace, "followup_sms_sent", "sms", isOperationalSuccess(result) ? "SENT" : "FAILED"),
    ]);
  }

  await finalizeExecutionTask(task.id, {
    status: isOperationalSuccess(result) ? "completed" : "failed",
    lastError: isOperationalSuccess(result) ? undefined : buildTaskFailureDetail(result),
    payload: { ...(task.payload ?? {}), result },
  });
  return { taskId: task.id, kind: task.kind, ok: isOperationalSuccess(result), detail: result.detail };
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

  if (!isOperationalSuccess(result) && whatsappPayload.phone && whatsappPayload.body) {
    const smsFallback = await safelyRunProviderAction("SMS Fallback", () => sendConfiguredSmsFallbackAction({
      phone: String(whatsappPayload.phone ?? ""),
      body: String(whatsappPayload.body ?? ""),
    }), task.payload ?? undefined);

    if (isOperationalSuccess(smsFallback)) {
      await recordProviderExecution({
        leadKey: task.leadKey,
        provider: smsFallback.provider,
        kind: "sms",
        ok: true,
        mode: smsFallback.mode,
        detail: `WhatsApp primary failed; SMS fallback sent. Primary error: ${result.detail}`,
        payload: {
          primaryProvider: result.provider,
          primaryError: result.detail,
          fallback: smsFallback.payload,
        },
      });
      if (trace) {
        await appendEvents([
          createCanonicalEvent(trace, "followup_sms_sent", "sms", "SENT"),
        ]);
      }

      await finalizeExecutionTask(task.id, {
        status: "completed",
        lastError: undefined,
        payload: {
          ...(task.payload ?? {}),
          result: {
            ...smsFallback,
            detail: `WhatsApp primary failed; SMS fallback sent. Primary error: ${result.detail}`,
          },
        },
      });
      return {
        taskId: task.id,
        kind: task.kind,
        ok: true,
        detail: `WhatsApp primary failed; SMS fallback sent. Primary error: ${result.detail}`,
      };
    }
  }

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
      createCanonicalEvent(trace, "followup_whatsapp_sent", "whatsapp", isOperationalSuccess(result) ? "SENT" : "FAILED"),
    ]);
  }

  await finalizeExecutionTask(task.id, {
    status: isOperationalSuccess(result) ? "completed" : "failed",
    lastError: isOperationalSuccess(result) ? undefined : buildTaskFailureDetail(result),
    payload: { ...(task.payload ?? {}), result },
  });
  return { taskId: task.id, kind: task.kind, ok: isOperationalSuccess(result), detail: result.detail };
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
    status: isOperationalSuccess(result) ? "completed" : "failed",
    lastError: isOperationalSuccess(result) ? undefined : buildTaskFailureDetail(result),
    payload: { ...(task.payload ?? {}), result },
  });
  return { taskId: task.id, kind: task.kind, ok: isOperationalSuccess(result), detail: result.detail };
}

async function processCommerceTask(task: ExecutionTaskRecord) {
  const commercePayload =
    task.payload?.commercePayload && typeof task.payload.commercePayload === "object"
      ? task.payload.commercePayload as Record<string, unknown>
      : {};
  const trace =
    task.payload?.trace && typeof task.payload.trace === "object"
      ? task.payload.trace as TraceContext
      : undefined;
  const result = await safelyRunProviderAction("ThriveCart", () => startCommerceAction(commercePayload), commercePayload);

  await recordProviderExecution({
    leadKey: task.leadKey,
    provider: result.provider,
    kind: "commerce",
    ok: isOperationalSuccess(result),
    mode: result.mode,
    detail: result.detail,
    payload: result.payload,
  });

  if (trace && isOperationalSuccess(result)) {
    await appendEvents([
      createCanonicalEvent(trace, "checkout_started", "checkout", "STARTED", {
        checkoutUrl: typeof result.payload?.checkoutUrl === "string" ? result.payload.checkoutUrl : undefined,
        provider: result.provider,
      }),
    ]);
  }

  await finalizeExecutionTask(task.id, {
    status: isOperationalSuccess(result) ? "completed" : "failed",
    lastError: isOperationalSuccess(result) ? undefined : buildTaskFailureDetail(result),
    payload: { ...(task.payload ?? {}), result },
  });
  return { taskId: task.id, kind: task.kind, ok: isOperationalSuccess(result), detail: result.detail };
}

async function processReferralTask(task: ExecutionTaskRecord) {
  const referralPayload =
    task.payload?.referralPayload && typeof task.payload.referralPayload === "object"
      ? task.payload.referralPayload as Record<string, unknown>
      : {};
  const trace =
    task.payload?.trace && typeof task.payload.trace === "object"
      ? task.payload.trace as TraceContext
      : undefined;
  const result = await safelyRunProviderAction("Partnero", () => startReferralAction(referralPayload), referralPayload);

  await recordProviderExecution({
    leadKey: task.leadKey,
    provider: result.provider,
    kind: "referral",
    ok: isOperationalSuccess(result),
    mode: result.mode,
    detail: result.detail,
    payload: result.payload,
  });

  if (trace && isOperationalSuccess(result)) {
    await appendEvents([
      createCanonicalEvent(trace, "referral_invite_sent", "internal", "SENT", {
        provider: result.provider,
      }),
    ]);
  }

  await finalizeExecutionTask(task.id, {
    status: isOperationalSuccess(result) ? "completed" : "failed",
    lastError: isOperationalSuccess(result) ? undefined : buildTaskFailureDetail(result),
    payload: { ...(task.payload ?? {}), result },
  });
  return { taskId: task.id, kind: task.kind, ok: isOperationalSuccess(result), detail: result.detail };
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
      continue;
    }
    if (task.kind === "commerce") {
      results.push(await processCommerceTask(task));
      continue;
    }
    if (task.kind === "referral") {
      results.push(await processReferralTask(task));
    }
  }

  return {
    count: results.length,
    results,
  };
}
