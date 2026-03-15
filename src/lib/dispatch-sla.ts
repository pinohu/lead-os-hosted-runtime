import type { LeadStage, PlumbingJobOutcome, PlumbingLeadContext } from "./runtime-schema.ts";

type DispatchSlaSnapshot = {
  responseTargetMinutes: number;
  escalationTargetMinutes: number;
  dueAt: string;
  escalationAt: string;
  overdue: boolean;
  escalationReady: boolean;
  minutesPastDue: number;
};

const RESOLVED_STAGES = new Set<LeadStage>(["booked", "converted", "active", "churned"]);
const RESOLVED_OUTCOMES = new Set(["booked", "completed", "lost", "backup-provider-requested"]);

export function getDispatchSlaPolicy(plumbing: PlumbingLeadContext) {
  switch (plumbing.urgencyBand) {
    case "emergency-now":
      return { responseTargetMinutes: 2, escalationTargetMinutes: 5 };
    case "same-day":
      return { responseTargetMinutes: 15, escalationTargetMinutes: 30 };
    case "commercial":
      return { responseTargetMinutes: 20, escalationTargetMinutes: 45 };
    case "estimate":
      return { responseTargetMinutes: 60, escalationTargetMinutes: 180 };
    case "maintenance":
    default:
      return { responseTargetMinutes: 120, escalationTargetMinutes: 360 };
  }
}

export function getDispatchSlaSnapshot(input: {
  updatedAt: string;
  stage: LeadStage;
  plumbing: PlumbingLeadContext;
  outcome?: PlumbingJobOutcome | null;
  now?: string;
}): DispatchSlaSnapshot {
  const policy = getDispatchSlaPolicy(input.plumbing);
  const now = new Date(input.now ?? new Date().toISOString());
  const updatedAt = new Date(input.updatedAt);
  const dueAt = new Date(updatedAt.getTime() + policy.responseTargetMinutes * 60_000);
  const escalationAt = new Date(updatedAt.getTime() + policy.escalationTargetMinutes * 60_000);
  const overdue = now.getTime() > dueAt.getTime();
  const outcomeStatus = input.outcome?.status;
  const escalationReady =
    now.getTime() > escalationAt.getTime() &&
    !RESOLVED_STAGES.has(input.stage) &&
    !RESOLVED_OUTCOMES.has(outcomeStatus ?? "");

  return {
    responseTargetMinutes: policy.responseTargetMinutes,
    escalationTargetMinutes: policy.escalationTargetMinutes,
    dueAt: dueAt.toISOString(),
    escalationAt: escalationAt.toISOString(),
    overdue,
    escalationReady,
    minutesPastDue: overdue ? Math.max(0, Math.round((now.getTime() - dueAt.getTime()) / 60_000)) : 0,
  };
}
