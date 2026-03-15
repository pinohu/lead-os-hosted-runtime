import { applyPlumbingDispatchAction } from "./dispatch-ops.ts";
import { getDispatchSlaSnapshot } from "./dispatch-sla.ts";
import { emitWorkflowAction } from "./providers.ts";
import {
  getLeadRecords,
  recordProviderExecution,
  recordWorkflowRun,
} from "./runtime-store.ts";
import type { PlumbingJobOutcome, PlumbingLeadContext } from "./runtime-schema.ts";

function asPlumbingContext(value: Record<string, unknown>) {
  const plumbing = value.plumbing;
  return plumbing && typeof plumbing === "object" ? plumbing as PlumbingLeadContext : null;
}

function asPlumbingOutcome(value: Record<string, unknown>) {
  const outcome = value.plumbingOutcome;
  return outcome && typeof outcome === "object" ? outcome as PlumbingJobOutcome : null;
}

export async function processDispatchEscalations(actorEmail = "system@lead-os.local") {
  const escalated: Array<{
    leadKey: string;
    urgencyBand: PlumbingLeadContext["urgencyBand"];
    escalationAt: string;
    workflowOk: boolean;
  }> = [];

  for (const lead of await getLeadRecords()) {
    const plumbing = asPlumbingContext(lead.metadata);
    if (!plumbing) {
      continue;
    }

    const outcome = asPlumbingOutcome(lead.metadata);
    const sla = getDispatchSlaSnapshot({
      updatedAt: lead.updatedAt,
      stage: lead.stage,
      plumbing,
      outcome,
    });
    if (!sla.escalationReady) {
      continue;
    }

    await applyPlumbingDispatchAction({
      leadKey: lead.leadKey,
      actionType: "assign-backup-provider",
      actorEmail,
      note: `Automatic SLA escalation after ${sla.escalationTargetMinutes} minutes without resolution.`,
    });

    const workflowPayload = {
      leadKey: lead.leadKey,
      trace: lead.trace,
      family: lead.family,
      stage: lead.stage,
      plumbing,
      sla,
    };
    const workflowResult = await emitWorkflowAction("plumbing.dispatch.escalated", workflowPayload);

    await recordWorkflowRun({
      leadKey: lead.leadKey,
      provider: workflowResult.provider,
      eventName: "plumbing.dispatch.escalated",
      ok: workflowResult.ok,
      mode: workflowResult.mode,
      detail: workflowResult.detail,
      payload: workflowPayload,
    });
    await recordProviderExecution({
      leadKey: lead.leadKey,
      provider: workflowResult.provider,
      kind: "dispatch-escalation",
      ok: workflowResult.ok,
      mode: workflowResult.mode,
      detail: workflowResult.detail,
      payload: workflowPayload,
    });

    escalated.push({
      leadKey: lead.leadKey,
      urgencyBand: plumbing.urgencyBand,
      escalationAt: sla.escalationAt,
      workflowOk: workflowResult.ok,
    });
  }

  return {
    count: escalated.length,
    escalated,
  };
}
