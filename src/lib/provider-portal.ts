import type { PlumbingJobOutcome } from "./runtime-schema.ts";
import { createCanonicalEvent } from "./trace.ts";
import { getDispatchProviderById, updateDispatchProviderSelfServe } from "./runtime-config.ts";
import {
  appendEvents,
  getBookingJobs,
  getLeadRecord,
  getProviderDispatchRequestById,
  getProviderDispatchRequests,
  recordProviderExecution,
  upsertBookingJob,
  upsertLeadRecord,
  upsertProviderDispatchRequest,
} from "./runtime-store.ts";

export type ProviderDispatchAction = "accept" | "decline";

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
