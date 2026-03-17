import type { CustomerMilestoneId, LeadMilestoneId, PlumbingJobOutcome } from "./runtime-schema.ts";
import { createCanonicalEvent } from "./trace.ts";
import { getDispatchProviderById, getOperationalRuntimeConfig, updateDispatchProviderSelfServe } from "./runtime-config.ts";
import {
  appendEvents,
  enqueueExecutionTask,
  getBookingJobs,
  getLeadRecord,
  getProviderDispatchRequestById,
  getProviderDispatchRequests,
  recordProviderExecution,
  upsertBookingJob,
  upsertLeadRecord,
  upsertProviderDispatchRequest,
  type StoredLeadRecord,
} from "./runtime-store.ts";

export type ProviderDispatchAction = "accept" | "decline";

function ensureLeadMilestone(lead: StoredLeadRecord, milestoneId: LeadMilestoneId) {
  if (lead.milestones.leadMilestones.includes(milestoneId)) {
    return false;
  }
  lead.milestones.leadMilestones = [...lead.milestones.leadMilestones, milestoneId];
  return true;
}

function ensureCustomerMilestone(lead: StoredLeadRecord, milestoneId: CustomerMilestoneId) {
  if (lead.milestones.customerMilestones.includes(milestoneId)) {
    return false;
  }
  lead.milestones.customerMilestones = [...lead.milestones.customerMilestones, milestoneId];
  return true;
}

export async function getProviderPortalSnapshot(providerId: string) {
  const [provider, requests] = await Promise.all([
    getDispatchProviderById(providerId),
    getProviderDispatchRequests({ providerId }),
  ]);

  return {
    provider: provider ?? null,
    requests,
    summary: {
      pending: requests.filter((request) => request.status === "pending").length,
      accepted: requests.filter((request) => request.status === "accepted").length,
      declined: requests.filter((request) => request.status === "declined").length,
      completed: requests.filter((request) => Boolean(request.payload?.completionRecordedAt)).length,
    },
  };
}

export async function applyProviderDispatchRequestAction(input: {
  requestId: string;
  providerId: string;
  actorEmail: string;
  action: ProviderDispatchAction;
  note?: string;
}) {
  const request = await getProviderDispatchRequestById(input.requestId);
  if (!request || request.providerId !== input.providerId) {
    throw new Error("Dispatch request not found for this provider.");
  }
  if (request.status !== "pending") {
    return { request, unchanged: true };
  }

  const [lead, provider] = await Promise.all([
    getLeadRecord(request.leadKey),
    getDispatchProviderById(input.providerId),
  ]);
  if (!lead || !provider) {
    throw new Error("Lead or provider context is missing.");
  }

  const now = new Date().toISOString();
  const accepted = input.action === "accept";
  const outcome: PlumbingJobOutcome = {
    status: accepted ? "provider-claimed" : "provider-declined",
    actorEmail: input.actorEmail,
    recordedAt: now,
    note: input.note?.trim() || undefined,
    provider: provider.label,
  };

  const updatedRequest = await upsertProviderDispatchRequest({
    ...request,
    status: accepted ? "accepted" : "declined",
    respondedAt: now,
    updatedAt: now,
    note: input.note?.trim() || request.note,
    payload: {
      ...(request.payload ?? {}),
      responseAction: input.action,
      respondedBy: input.actorEmail,
      respondedAt: now,
      providerLabel: provider.label,
    },
  });

  lead.updatedAt = now;
  lead.status = accepted ? "PROVIDER-CLAIMED" : "PROVIDER-DECLINED";
  lead.hot = !accepted;
  lead.metadata.providerDispatch = {
    requestId: updatedRequest.id,
    providerId: provider.id,
    providerLabel: provider.label,
    status: updatedRequest.status,
    respondedAt: now,
    respondedBy: input.actorEmail,
    note: input.note?.trim() || undefined,
  };
  lead.metadata.plumbingOutcome = outcome;
  await upsertLeadRecord(lead);

  if (accepted) {
    const nextActiveJobs = typeof provider.activeJobs === "number" ? provider.activeJobs + 1 : 1;
    const saturated = typeof provider.maxConcurrentJobs === "number" && nextActiveJobs >= provider.maxConcurrentJobs;
    await updateDispatchProviderSelfServe(
      provider.id,
      {
        activeJobs: nextActiveJobs,
        acceptingNewJobs: saturated ? false : provider.acceptingNewJobs,
      },
      input.actorEmail,
    );

    const bookingJobs = await getBookingJobs(lead.leadKey);
    await upsertBookingJob({
      id: bookingJobs[0]?.id,
      leadKey: lead.leadKey,
      provider: provider.label,
      status: "handoff-ready",
      detail: `${provider.label} accepted the dispatch request.`,
      payload: {
        providerId: provider.id,
        requestId: updatedRequest.id,
        acceptedAt: now,
      },
    });
  }

  await recordProviderExecution({
    leadKey: lead.leadKey,
    provider: provider.label,
    kind: "provider-dispatch",
    ok: accepted,
    mode: "live",
    detail: accepted
      ? "Provider accepted the dispatch request."
      : "Provider declined the dispatch request.",
    payload: {
      requestId: updatedRequest.id,
      providerId: provider.id,
      actorEmail: input.actorEmail,
      note: input.note?.trim() || undefined,
    },
  });

  await appendEvents([
    createCanonicalEvent(lead.trace, "provider_dispatch_responded", "internal", "RECORDED", {
      requestId: updatedRequest.id,
      providerId: provider.id,
      providerLabel: provider.label,
      responseAction: input.action,
      actorEmail: input.actorEmail,
      note: input.note?.trim() || undefined,
    }),
    createCanonicalEvent(lead.trace, "plumbing_job_outcome_recorded", "internal", "RECORDED", {
      outcomeStatus: outcome.status,
      actorEmail: input.actorEmail,
      provider: provider.label,
      note: input.note?.trim() || undefined,
    }),
  ]);

  return {
    request: updatedRequest,
    lead,
    provider,
    outcome,
    unchanged: false,
  };
}

export async function recordProviderDispatchCompletion(input: {
  requestId: string;
  providerId: string;
  actorEmail: string;
  note?: string;
  invoiceNumber?: string;
  invoiceStatus?: "not-issued" | "issued" | "sent" | "collected";
  paymentStatus?: "not-requested" | "pending" | "paid" | "failed";
  paymentMethod?: "cash" | "card" | "ach" | "financing" | "check" | "digital-link" | "other";
  paymentAmount?: number;
  paidAt?: string;
  revenueValue?: number;
  marginValue?: number;
  complaintStatus?: "none" | "minor" | "major";
  reviewStatus?: "not-requested" | "requested" | "positive" | "mixed" | "negative";
  reviewRating?: number;
  refundIssued?: boolean;
}) {
  const request = await getProviderDispatchRequestById(input.requestId);
  if (!request || request.providerId !== input.providerId) {
    throw new Error("Dispatch request not found for this provider.");
  }
  if (request.status !== "accepted") {
    throw new Error("Only accepted dispatch requests can be marked completed.");
  }

  const [lead, provider] = await Promise.all([
    getLeadRecord(request.leadKey),
    getDispatchProviderById(input.providerId),
  ]);
  if (!lead || !provider) {
    throw new Error("Lead or provider context is missing.");
  }

  const now = new Date().toISOString();
  const marginBand =
    typeof input.marginValue !== "number"
      ? undefined
      : input.marginValue < 0
        ? "negative"
        : input.marginValue < 150
          ? "thin"
          : input.marginValue < 500
            ? "healthy"
          : "exceptional";
  const paymentCollected =
    input.paymentStatus === "paid" ||
    Boolean(input.paidAt) ||
    (typeof input.paymentAmount === "number" && input.paymentAmount > 0);
  const outcome: PlumbingJobOutcome = {
    status: "completed",
    actorEmail: input.actorEmail,
    recordedAt: now,
    note: input.note?.trim() || undefined,
    provider: provider.label,
    invoiceNumber: input.invoiceNumber,
    invoiceStatus: input.invoiceStatus ?? (paymentCollected ? "collected" : "issued"),
    paymentStatus: input.paymentStatus ?? (paymentCollected ? "paid" : "pending"),
    paymentMethod: input.paymentMethod,
    paymentAmount: input.paymentAmount,
    paidAt: input.paidAt,
    revenueValue: input.revenueValue,
    marginValue: input.marginValue,
    marginBand,
    complaintStatus: input.complaintStatus ?? "none",
    reviewStatus: input.reviewStatus ?? "not-requested",
    reviewRating: input.reviewRating,
    refundIssued: input.refundIssued ?? false,
  };

  request.status = "accepted";
  request.updatedAt = now;
  request.payload = {
    ...(request.payload ?? {}),
    completionRecordedAt: now,
    completionRecordedBy: input.actorEmail,
    invoiceNumber: outcome.invoiceNumber,
    invoiceStatus: outcome.invoiceStatus,
    paymentStatus: outcome.paymentStatus,
    paymentMethod: outcome.paymentMethod,
    paymentAmount: outcome.paymentAmount,
    paidAt: outcome.paidAt,
    revenueValue: input.revenueValue,
    marginValue: input.marginValue,
    complaintStatus: outcome.complaintStatus,
    reviewStatus: outcome.reviewStatus,
    reviewRating: outcome.reviewRating,
    refundIssued: outcome.refundIssued,
  };
  const updatedRequest = await upsertProviderDispatchRequest(request);

  lead.stage = paymentCollected ? "active" : "converted";
  lead.status = paymentCollected ? "PAYMENT-COLLECTED" : "JOB-COMPLETED-AWAITING-PAYMENT";
  lead.hot = false;
  lead.updatedAt = now;
  lead.metadata.providerDispatch = {
    requestId: updatedRequest.id,
    providerId: provider.id,
    providerLabel: provider.label,
    status: updatedRequest.status,
    respondedAt: request.respondedAt ?? now,
    respondedBy: input.actorEmail,
    note: input.note?.trim() || undefined,
    completedAt: now,
  };
  lead.metadata.plumbingOutcome = outcome;
  ensureLeadMilestone(lead, "lead-m2-return-engaged");
  ensureLeadMilestone(lead, "lead-m3-booked-or-offered");
  ensureCustomerMilestone(lead, "customer-m1-onboarded");
  ensureCustomerMilestone(lead, "customer-m2-activated");
  if (paymentCollected) {
    ensureCustomerMilestone(lead, "customer-m3-value-realized");
  }
  await upsertLeadRecord(lead);

  const bookingJobs = await getBookingJobs(lead.leadKey);
  await upsertBookingJob({
    id: bookingJobs[0]?.id,
    leadKey: lead.leadKey,
    provider: provider.label,
    status: "completed",
    detail: input.note?.trim() || `${provider.label} reported the job as completed.`,
    payload: {
      providerId: provider.id,
      requestId: updatedRequest.id,
      completedAt: now,
      invoiceNumber: outcome.invoiceNumber,
      invoiceStatus: outcome.invoiceStatus,
      paymentStatus: outcome.paymentStatus,
      paymentMethod: outcome.paymentMethod,
      paymentAmount: outcome.paymentAmount,
      paidAt: outcome.paidAt,
      revenueValue: input.revenueValue,
      marginValue: input.marginValue,
      complaintStatus: outcome.complaintStatus,
      reviewStatus: outcome.reviewStatus,
      reviewRating: outcome.reviewRating,
      refundIssued: outcome.refundIssued,
    },
  });

  const nextActiveJobs = Math.max(0, (provider.activeJobs ?? 1) - 1);
  const acceptingNewJobs =
    typeof provider.maxConcurrentJobs === "number"
      ? nextActiveJobs < provider.maxConcurrentJobs
      : provider.acceptingNewJobs;
  await updateDispatchProviderSelfServe(
    provider.id,
    {
      activeJobs: nextActiveJobs,
      acceptingNewJobs,
    },
    input.actorEmail,
  );

  await recordProviderExecution({
    leadKey: lead.leadKey,
    provider: provider.label,
    kind: "provider-completion",
    ok: true,
    mode: "live",
    detail: "Provider reported a completed dispatch job.",
    payload: {
      requestId: updatedRequest.id,
      providerId: provider.id,
      actorEmail: input.actorEmail,
      invoiceNumber: outcome.invoiceNumber,
      invoiceStatus: outcome.invoiceStatus,
      paymentStatus: outcome.paymentStatus,
      paymentMethod: outcome.paymentMethod,
      paymentAmount: outcome.paymentAmount,
      paidAt: outcome.paidAt,
      revenueValue: input.revenueValue,
      marginValue: input.marginValue,
      complaintStatus: outcome.complaintStatus,
      reviewStatus: outcome.reviewStatus,
      reviewRating: outcome.reviewRating,
      refundIssued: outcome.refundIssued,
    },
  });

  await appendEvents([
    createCanonicalEvent(lead.trace, "plumbing_job_outcome_recorded", "internal", "RECORDED", {
      outcomeStatus: outcome.status,
      actorEmail: input.actorEmail,
      provider: provider.label,
      note: input.note?.trim() || undefined,
      invoiceNumber: outcome.invoiceNumber,
      invoiceStatus: outcome.invoiceStatus,
      paymentStatus: outcome.paymentStatus,
      paymentMethod: outcome.paymentMethod,
      paymentAmount: outcome.paymentAmount,
      paidAt: outcome.paidAt,
      revenueValue: input.revenueValue,
      marginValue: input.marginValue,
      marginBand,
      complaintStatus: outcome.complaintStatus,
      reviewStatus: outcome.reviewStatus,
      reviewRating: outcome.reviewRating,
      refundIssued: outcome.refundIssued,
    }),
    ...(paymentCollected
      ? [
          createCanonicalEvent(lead.trace, "payment_received", "checkout", "PAID", {
            paymentAmount: outcome.paymentAmount ?? outcome.revenueValue,
            paymentMethod: outcome.paymentMethod,
            paidAt: outcome.paidAt ?? now,
            invoiceNumber: outcome.invoiceNumber,
            provider: provider.label,
          }),
        ]
      : []),
  ]);

  if (!paymentCollected && outcome.paymentMethod === "digital-link") {
    await enqueueExecutionTask({
      leadKey: lead.leadKey,
      kind: "commerce",
      provider: "ThriveCart",
      dedupeKey: `commerce:${lead.leadKey}:${updatedRequest.id}`,
      payload: {
        trace: lead.trace,
        commercePayload: {
          leadKey: lead.leadKey,
          email: lead.email,
          phone: lead.phone,
          firstName: lead.firstName,
          lastName: lead.lastName,
          revenueValue: outcome.revenueValue,
          paymentAmount: outcome.paymentAmount ?? outcome.revenueValue,
          invoiceNumber: outcome.invoiceNumber,
          note: outcome.note,
        },
      },
    });
  }

  const runtimeConfig = await getOperationalRuntimeConfig();
  if (paymentCollected && runtimeConfig.partnero.autoEnrollStage === "paid") {
    await enqueueExecutionTask({
      leadKey: lead.leadKey,
      kind: "referral",
      provider: "Partnero",
      dedupeKey: `referral:${lead.leadKey}:paid`,
      payload: {
        trace: lead.trace,
        referralPayload: {
          leadKey: lead.leadKey,
          email: lead.email,
          phone: lead.phone,
          firstName: lead.firstName,
          lastName: lead.lastName,
          revenueValue: outcome.revenueValue,
          paymentAmount: outcome.paymentAmount ?? outcome.revenueValue,
          provider: provider.label,
          stage: "paid",
        },
      },
    });
  }
  if (paymentCollected && runtimeConfig.partnero.autoEnrollStage === "value-realized") {
    await enqueueExecutionTask({
      leadKey: lead.leadKey,
      kind: "referral",
      provider: "Partnero",
      dedupeKey: `referral:${lead.leadKey}:value-realized`,
      payload: {
        trace: lead.trace,
        referralPayload: {
          leadKey: lead.leadKey,
          email: lead.email,
          phone: lead.phone,
          firstName: lead.firstName,
          lastName: lead.lastName,
          revenueValue: outcome.revenueValue,
          paymentAmount: outcome.paymentAmount ?? outcome.revenueValue,
          provider: provider.label,
          stage: "value-realized",
        },
      },
    });
  }

  return {
    request: updatedRequest,
    lead,
    provider,
    outcome,
  };
}
