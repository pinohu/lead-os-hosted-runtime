import { getDispatchSlaSnapshot } from "./dispatch-sla.ts";
import { getAutomationHealth } from "./providers.ts";
import {
  buildLeadDisplayName,
  buildLeadSubline,
  formatLeadKeyForDisplay,
  formatMilestoneIdForDisplay,
  formatOptionalDateTime,
  formatPortalLabel,
} from "./operator-ui.ts";
import type {
  BookingJobRecord,
  DocumentJobRecord,
  ExecutionTaskRecord,
  OperatorActionRecord,
  ProviderDispatchRequestRecord,
  ProviderExecutionRecord,
  StoredLeadRecord,
  WorkflowRunRecord,
} from "./runtime-store.ts";
import type { CanonicalEvent } from "./trace.ts";
import type { PlumbingJobOutcome, PlumbingLeadContext } from "./runtime-schema.ts";

export type JourneyItemSeverity = "info" | "success" | "warning" | "danger";

export interface LeadJourneyTimelineItem {
  id: string;
  timestamp: string;
  category: string;
  title: string;
  summary: string;
  detail?: string;
  status: string;
  severity: JourneyItemSeverity;
}

export interface OperatorIssueInsight {
  id: string;
  source: string;
  title: string;
  reason: string;
  resolution: string;
  severity: Exclude<JourneyItemSeverity, "info">;
  timestamp?: string;
  leadKey?: string;
}

export interface LeadJourneySnapshot {
  leadKey: string;
  displayName: string;
  displaySubline: string;
  firstSeenAt: string;
  lastSeenAt: string;
  lastSuccessAt?: string;
  timeline: LeadJourneyTimelineItem[];
  issues: OperatorIssueInsight[];
  stats: {
    touchpoints: number;
    activeFailures: number;
    providerRequests: number;
    completedSteps: number;
  };
}

export interface SystemOverviewSnapshot {
  activeAlerts: OperatorIssueInsight[];
  queuePulse: Array<{
    label: string;
    value: number;
    detail: string;
    tone: "neutral" | "warning" | "danger" | "success";
  }>;
  rolloutPulse: Array<{
    label: string;
    value: number;
    detail: string;
    tone: "neutral" | "warning" | "danger" | "success";
  }>;
  providerPulse: Array<{
    label: string;
    value: number;
    detail: string;
    tone: "neutral" | "warning" | "danger" | "success";
  }>;
  watchlist: string[];
}

function asPlumbingContext(lead: StoredLeadRecord) {
  const plumbing = lead.metadata.plumbing;
  return plumbing && typeof plumbing === "object" ? plumbing as PlumbingLeadContext : null;
}

function asPlumbingOutcome(lead: StoredLeadRecord) {
  const outcome = lead.metadata.plumbingOutcome;
  return outcome && typeof outcome === "object" ? outcome as PlumbingJobOutcome : null;
}

function severityFromOutcome(ok: boolean) {
  return ok ? "success" as const : "danger" as const;
}

function inferExecutionReason(task: ExecutionTaskRecord) {
  const lastError = task.lastError?.trim();
  if (lastError) {
    return lastError;
  }
  switch (task.kind) {
    case "booking":
      return "The booking execution queue could not complete the scheduling step.";
    case "document":
      return "The document generation queue could not finish proposal or onboarding work.";
    case "workflow":
    default:
      return "The workflow execution queue could not finish the downstream automation step.";
  }
}

function inferExecutionResolution(task: ExecutionTaskRecord) {
  switch (task.kind) {
    case "booking":
      return "Open the booking queue, verify provider availability and booking credentials, then retry or route the lead to manual handoff.";
    case "document":
      return "Check template IDs and document provider health, then retry document generation or switch to manual delivery.";
    case "workflow":
    default:
      return "Inspect the workflow run history, confirm the provider endpoint and credentials, then rerun the task from the execution queue.";
  }
}

function inferWorkflowResolution(run: WorkflowRunRecord) {
  if (run.provider.toLowerCase() === "n8n") {
    return "Check the n8n workflow status, webhook target, and authentication, then replay the event if the workflow is healthy again.";
  }
  return "Inspect the workflow provider configuration, confirm the event payload is valid, then retry or route manually.";
}

function inferBookingResolution(job: BookingJobRecord) {
  const detail = `${job.status} ${job.detail}`.toLowerCase();
  if (detail.includes("availability")) {
    return "Verify the provider's service mapping and available slots, then retry booking or hand the lead to dispatch for manual slot recovery.";
  }
  if (detail.includes("handoff")) {
    return "Move this lead to a human dispatcher or provider callback so the job can still be scheduled outside the automated path.";
  }
  return "Review the booking payload and provider adapter status, then retry the booking or assign a backup provider.";
}

function inferDocumentResolution(job: DocumentJobRecord) {
  return `Check the ${job.provider} template configuration and payload fields, then retry the document job or send the document manually.`;
}

function inferProviderRequestResolution(request: ProviderDispatchRequestRecord) {
  if (request.status === "declined") {
    return "Assign a backup provider or widen coverage in this ZIP cell before promoting more demand here.";
  }
  if (request.status === "expired") {
    return "Lower provider response latency by using live notifications or route the job to a backup provider immediately.";
  }
  return "Follow up with the provider or escalate the job to manual dispatch if the response window is closing.";
}

function inferProviderExecutionResolution(execution: ProviderExecutionRecord) {
  return `Verify ${execution.provider} credentials, channel readiness, and payload shape, then replay the provider action or switch to a fallback channel.`;
}

function buildEventTimelineItems(events: CanonicalEvent[]) {
  return events.map<LeadJourneyTimelineItem>((event) => ({
    id: `event:${event.id}`,
    timestamp: event.timestamp,
    category: "canonical event",
    title: formatPortalLabel(event.eventType),
    summary: `Status: ${formatPortalLabel(event.status)} via ${formatPortalLabel(event.channel)}`,
    detail: event.eventType.includes("milestone")
      ? `Milestone: ${formatMilestoneIdForDisplay(String(event.metadata.milestoneId ?? ""))}`
      : undefined,
    status: event.status,
    severity: event.status.toLowerCase().includes("fail") ? "danger" : "info",
  }));
}

function buildWorkflowTimelineItems(workflows: WorkflowRunRecord[]) {
  return workflows.map<LeadJourneyTimelineItem>((workflow) => ({
    id: `workflow:${workflow.id}`,
    timestamp: workflow.createdAt,
    category: "workflow",
    title: formatPortalLabel(workflow.eventName),
    summary: workflow.detail,
    detail: `Provider: ${formatPortalLabel(workflow.provider)} | Mode: ${formatPortalLabel(workflow.mode)}`,
    status: workflow.ok ? "completed" : "failed",
    severity: severityFromOutcome(workflow.ok),
  }));
}

function buildProviderTimelineItems(executions: ProviderExecutionRecord[]) {
  return executions.map<LeadJourneyTimelineItem>((execution) => ({
    id: `provider:${execution.id}`,
    timestamp: execution.createdAt,
    category: "provider execution",
    title: `${formatPortalLabel(execution.provider)} ${formatPortalLabel(execution.kind)}`,
    summary: execution.detail,
    detail: `Mode: ${formatPortalLabel(execution.mode)}`,
    status: execution.ok ? "completed" : "failed",
    severity: severityFromOutcome(execution.ok),
  }));
}

function buildBookingTimelineItems(jobs: BookingJobRecord[]) {
  return jobs.map<LeadJourneyTimelineItem>((job) => ({
    id: `booking:${job.id}`,
    timestamp: job.updatedAt,
    category: "booking",
    title: `${formatPortalLabel(job.provider)} booking`,
    summary: job.detail,
    status: job.status,
    severity: ["booked", "availability-found", "ready", "handoff-ready", "rescheduled", "status-changed"].includes(job.status)
      ? "success"
      : job.status.includes("retry")
        ? "warning"
        : "danger",
  }));
}

function buildDocumentTimelineItems(jobs: DocumentJobRecord[]) {
  return jobs.map<LeadJourneyTimelineItem>((job) => ({
    id: `document:${job.id}`,
    timestamp: job.updatedAt,
    category: "document",
    title: `${formatPortalLabel(job.provider)} document`,
    summary: job.detail,
    status: job.status,
    severity: job.status === "failed" ? "danger" : "success",
  }));
}

function buildExecutionTimelineItems(tasks: ExecutionTaskRecord[]) {
  return tasks.map<LeadJourneyTimelineItem>((task) => ({
    id: `execution:${task.id}`,
    timestamp: task.updatedAt,
    category: "execution queue",
    title: `${formatPortalLabel(task.kind)} task`,
    summary: task.lastError ? `Last error: ${task.lastError}` : `Attempts: ${task.attempts}`,
    detail: `Provider: ${formatPortalLabel(task.provider)} | Dedupe key: ${task.dedupeKey}`,
    status: task.status,
    severity: task.status === "failed" ? "danger" : task.status === "processing" ? "warning" : task.status === "completed" ? "success" : "info",
  }));
}

function buildProviderRequestTimelineItems(requests: ProviderDispatchRequestRecord[]) {
  return requests.map<LeadJourneyTimelineItem>((request) => ({
    id: `dispatch-request:${request.id}`,
    timestamp: request.respondedAt ?? request.updatedAt,
    category: "provider request",
    title: request.providerLabel,
    summary: `${formatPortalLabel(request.status)}${request.note ? `: ${request.note}` : ""}`,
    detail: [request.urgencyBand, request.issueType, request.propertyType]
      .filter(Boolean)
      .map((value) => formatPortalLabel(String(value)))
      .join(" | "),
    status: request.status,
    severity: request.status === "accepted" ? "success" : request.status === "pending" ? "warning" : "danger",
  }));
}

function buildOperatorActionTimelineItems(actions: OperatorActionRecord[]) {
  return actions.map<LeadJourneyTimelineItem>((action) => ({
    id: `operator:${action.id}`,
    timestamp: action.createdAt,
    category: "operator action",
    title: formatPortalLabel(action.actionType),
    summary: action.detail,
    detail: action.actorEmail,
    status: "recorded",
    severity: "info",
  }));
}

function isBookingHealthy(status: string) {
  return ["booked", "availability-found", "ready", "handoff-ready", "rescheduled", "status-changed"].includes(status);
}

function buildLeadIssueInsights(
  workflows: WorkflowRunRecord[],
  providerExecutions: ProviderExecutionRecord[],
  bookingJobs: BookingJobRecord[],
  documentJobs: DocumentJobRecord[],
  executionTasks: ExecutionTaskRecord[],
  providerRequests: ProviderDispatchRequestRecord[],
) {
  const issues: OperatorIssueInsight[] = [];

  for (const task of executionTasks.filter((entry) => entry.status === "failed")) {
    issues.push({
      id: `task:${task.id}`,
      source: "execution queue",
      title: `${formatPortalLabel(task.kind)} task failed`,
      reason: inferExecutionReason(task),
      resolution: inferExecutionResolution(task),
      severity: "danger",
      timestamp: task.updatedAt,
      leadKey: task.leadKey,
    });
  }

  for (const run of workflows.filter((entry) => !entry.ok)) {
    issues.push({
      id: `workflow:${run.id}`,
      source: formatPortalLabel(run.provider),
      title: `${formatPortalLabel(run.eventName)} failed`,
      reason: run.detail,
      resolution: inferWorkflowResolution(run),
      severity: "danger",
      timestamp: run.createdAt,
      leadKey: run.leadKey,
    });
  }

  for (const execution of providerExecutions.filter((entry) => !entry.ok)) {
    issues.push({
      id: `provider:${execution.id}`,
      source: formatPortalLabel(execution.provider),
      title: `${formatPortalLabel(execution.kind)} delivery failed`,
      reason: execution.detail,
      resolution: inferProviderExecutionResolution(execution),
      severity: execution.mode === "dry-run" ? "warning" : "danger",
      timestamp: execution.createdAt,
      leadKey: execution.leadKey,
    });
  }

  for (const job of bookingJobs.filter((entry) => !isBookingHealthy(entry.status))) {
    issues.push({
      id: `booking:${job.id}`,
      source: "booking",
      title: `${formatPortalLabel(job.status)} booking state`,
      reason: job.detail,
      resolution: inferBookingResolution(job),
      severity: job.status.includes("retry") ? "warning" : "danger",
      timestamp: job.updatedAt,
      leadKey: job.leadKey,
    });
  }

  for (const job of documentJobs.filter((entry) => entry.status === "failed")) {
    issues.push({
      id: `document:${job.id}`,
      source: "documents",
      title: `${formatPortalLabel(job.provider)} document failed`,
      reason: job.detail,
      resolution: inferDocumentResolution(job),
      severity: "danger",
      timestamp: job.updatedAt,
      leadKey: job.leadKey,
    });
  }

  for (const request of providerRequests.filter((entry) => entry.status === "declined" || entry.status === "expired")) {
    issues.push({
      id: `dispatch-request:${request.id}`,
      source: "provider dispatch",
      title: `${request.providerLabel} ${formatPortalLabel(request.status)} the request`,
      reason: request.note ?? `The provider request moved into ${formatPortalLabel(request.status)} before the job was secured.`,
      resolution: inferProviderRequestResolution(request),
      severity: "warning",
      timestamp: request.respondedAt ?? request.updatedAt,
      leadKey: request.leadKey,
    });
  }

  return issues.sort((left, right) => {
    const severityOrder = { danger: 0, warning: 1, success: 2 };
    if (severityOrder[left.severity] !== severityOrder[right.severity]) {
      return severityOrder[left.severity] - severityOrder[right.severity];
    }
    return new Date(right.timestamp ?? 0).getTime() - new Date(left.timestamp ?? 0).getTime();
  });
}

export function buildLeadJourneySnapshot(input: {
  lead: StoredLeadRecord;
  events: CanonicalEvent[];
  workflows: WorkflowRunRecord[];
  providerExecutions: ProviderExecutionRecord[];
  bookingJobs: BookingJobRecord[];
  documentJobs: DocumentJobRecord[];
  executionTasks: ExecutionTaskRecord[];
  providerRequests: ProviderDispatchRequestRecord[];
  operatorActions: OperatorActionRecord[];
}) {
  const timeline = [
    ...buildEventTimelineItems(input.events),
    ...buildWorkflowTimelineItems(input.workflows),
    ...buildProviderTimelineItems(input.providerExecutions),
    ...buildBookingTimelineItems(input.bookingJobs),
    ...buildDocumentTimelineItems(input.documentJobs),
    ...buildExecutionTimelineItems(input.executionTasks),
    ...buildProviderRequestTimelineItems(input.providerRequests),
    ...buildOperatorActionTimelineItems(input.operatorActions),
  ].sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());

  const issues = buildLeadIssueInsights(
    input.workflows,
    input.providerExecutions,
    input.bookingJobs,
    input.documentJobs,
    input.executionTasks,
    input.providerRequests,
  );
  const lastSuccessItem = [...timeline].reverse().find((item) => item.severity === "success");

  return {
    leadKey: input.lead.leadKey,
    displayName: buildLeadDisplayName(input.lead),
    displaySubline: buildLeadSubline(input.lead),
    firstSeenAt: formatOptionalDateTime(input.lead.createdAt),
    lastSeenAt: formatOptionalDateTime(input.lead.updatedAt),
    lastSuccessAt: lastSuccessItem ? formatOptionalDateTime(lastSuccessItem.timestamp) : undefined,
    timeline,
    issues,
    stats: {
      touchpoints: timeline.length,
      activeFailures: issues.length,
      providerRequests: input.providerRequests.length,
      completedSteps: timeline.filter((item) => item.severity === "success").length,
    },
  } satisfies LeadJourneySnapshot;
}

function buildSystemIssueInsights(input: {
  leads: StoredLeadRecord[];
  workflowRuns: WorkflowRunRecord[];
  providerExecutions: ProviderExecutionRecord[];
  bookingJobs: BookingJobRecord[];
  documentJobs: DocumentJobRecord[];
  executionTasks: ExecutionTaskRecord[];
  providerRequests: ProviderDispatchRequestRecord[];
  deploymentSummary: {
    generatedOlderThanSevenDays: number;
    liveWithoutPageUrl: number;
    staleDeployments: number;
  };
}) {
  const leadLookup = new Map(input.leads.map((lead) => [lead.leadKey, lead]));
  const leadIssues = buildLeadIssueInsights(
    input.workflowRuns,
    input.providerExecutions,
    input.bookingJobs,
    input.documentJobs,
    input.executionTasks,
    input.providerRequests,
  ).slice(0, 8);

  const enriched = leadIssues.map((issue) => {
    const lead = issue.leadKey ? leadLookup.get(issue.leadKey) : undefined;
    return {
      ...issue,
      title: lead ? `${buildLeadDisplayName(lead)}: ${issue.title}` : issue.title,
    };
  });

  if (input.deploymentSummary.generatedOlderThanSevenDays > 0) {
    enriched.push({
      id: "deployment:generated-stale",
      source: "rollout registry",
      title: "Generated deployments are stalling before go-live",
      reason: `${input.deploymentSummary.generatedOlderThanSevenDays} generated deployments have not advanced in at least seven days.`,
      resolution: "Review rollout ownership, confirm install targets, and either promote or retire stale generated assets.",
      severity: "warning",
    });
  }
  if (input.deploymentSummary.liveWithoutPageUrl > 0) {
    enriched.push({
      id: "deployment:missing-url",
      source: "rollout registry",
      title: "Some live deployments are missing a public page URL",
      reason: `${input.deploymentSummary.liveWithoutPageUrl} deployments are marked live but do not have a verified public URL attached.`,
      resolution: "Attach the actual live page URL so rollout health and drift checks can confirm what is serving in production.",
      severity: "danger",
    });
  }
  if (input.deploymentSummary.staleDeployments > 0) {
    enriched.push({
      id: "deployment:stale",
      source: "rollout registry",
      title: "Deployment portfolio contains stale installs",
      reason: `${input.deploymentSummary.staleDeployments} deployments have not been touched in at least 30 days.`,
      resolution: "Audit stale installs for drift, broken embeds, or pages that should be retired from the marketplace footprint.",
      severity: "warning",
    });
  }

  return enriched.slice(0, 10);
}

export function buildSystemOverviewSnapshot(input: {
  consoleSnapshot: {
    totals: { leads: number; hotLeads: number };
    conversionRates: {
      leadM1ToM2: number;
      leadM2ToM3: number;
      customerM1ToM2: number;
      customerM2ToM3: number;
    };
    plumbingDispatch: {
      unresolvedCount: number;
      emergencyQueue: unknown[];
      sameDayQueue: unknown[];
      providerRequestQueue: { pendingCount: number };
      executionQueue: { pendingCount: number; failedCount: number };
      configuredDispatchProviders: number;
      providerScores: Array<{ provider: string; routingScore: number; contributionStatus: string }>;
      finance: {
        contributionMargin: number;
        contributionMarginRate: number;
        constrainedCells: number;
        unprofitableProviders: number;
        unprofitableCells: number;
      };
    };
  };
  leads: StoredLeadRecord[];
  workflowRuns: WorkflowRunRecord[];
  providerExecutions: ProviderExecutionRecord[];
  bookingJobs: BookingJobRecord[];
  documentJobs: DocumentJobRecord[];
  executionTasks: ExecutionTaskRecord[];
  providerRequests: ProviderDispatchRequestRecord[];
  deploymentSummary: {
    total: number;
    live: number;
    generated: number;
    planned: number;
    generatedOlderThanSevenDays: number;
    liveWithoutPageUrl: number;
    staleDeployments: number;
  };
}) {
  const health = getAutomationHealth();
  const providerEntries = Object.values(health.providers);
  const executableProviders = providerEntries.filter((provider) => provider.capability === "executable").length;
  const degradedProviders = providerEntries.filter((provider) => provider.capability === "degraded").length;
  const missingProviders = providerEntries.filter((provider) => provider.capability === "missing").length;
  const activeAlerts = buildSystemIssueInsights({
    leads: input.leads,
    workflowRuns: input.workflowRuns,
    providerExecutions: input.providerExecutions,
    bookingJobs: input.bookingJobs,
    documentJobs: input.documentJobs,
    executionTasks: input.executionTasks,
    providerRequests: input.providerRequests,
    deploymentSummary: input.deploymentSummary,
  });

  return {
    activeAlerts,
    queuePulse: [
      {
        label: "Visible leads",
        value: input.consoleSnapshot.totals.leads,
        detail: `${input.consoleSnapshot.totals.hotLeads} hot leads are in operator view right now.`,
        tone: "neutral",
      },
      {
        label: "Unresolved plumbing",
        value: input.consoleSnapshot.plumbingDispatch.unresolvedCount,
        detail: `${input.consoleSnapshot.plumbingDispatch.emergencyQueue.length} emergency and ${input.consoleSnapshot.plumbingDispatch.sameDayQueue.length} same-day leads need movement.`,
        tone: input.consoleSnapshot.plumbingDispatch.unresolvedCount > 0 ? "warning" : "success",
      },
      {
        label: "Provider responses waiting",
        value: input.consoleSnapshot.plumbingDispatch.providerRequestQueue.pendingCount,
        detail: "Pending provider claim decisions that can stall dispatch momentum.",
        tone: input.consoleSnapshot.plumbingDispatch.providerRequestQueue.pendingCount > 0 ? "warning" : "success",
      },
      {
        label: "Execution failures",
        value: input.consoleSnapshot.plumbingDispatch.executionQueue.failedCount,
        detail: `${input.consoleSnapshot.plumbingDispatch.executionQueue.pendingCount} additional tasks are still queued.`,
        tone: input.consoleSnapshot.plumbingDispatch.executionQueue.failedCount > 0 ? "danger" : "success",
      },
    ],
    rolloutPulse: [
      {
        label: "Live deployments",
        value: input.deploymentSummary.live,
        detail: `${input.deploymentSummary.generated} generated and ${input.deploymentSummary.planned} planned assets are still in rollout.`,
        tone: "neutral",
      },
      {
        label: "Generated > 7d",
        value: input.deploymentSummary.generatedOlderThanSevenDays,
        detail: "Generated installs that have not moved into verified rollout work.",
        tone: input.deploymentSummary.generatedOlderThanSevenDays > 0 ? "warning" : "success",
      },
      {
        label: "Live missing URL",
        value: input.deploymentSummary.liveWithoutPageUrl,
        detail: "Install records marked live without a verified public page URL.",
        tone: input.deploymentSummary.liveWithoutPageUrl > 0 ? "danger" : "success",
      },
      {
        label: "Stale deployments",
        value: input.deploymentSummary.staleDeployments,
        detail: "Deployments that have not been touched in 30+ days.",
        tone: input.deploymentSummary.staleDeployments > 0 ? "warning" : "success",
      },
    ],
    providerPulse: [
      {
        label: "Executable providers",
        value: executableProviders,
        detail: `${degradedProviders} degraded and ${missingProviders} missing provider adapters are still visible.`,
        tone: degradedProviders > 0 || missingProviders > 0 ? "warning" : "success",
      },
      {
        label: "Dispatch roster",
        value: input.consoleSnapshot.plumbingDispatch.configuredDispatchProviders,
        detail: "Providers available for capacity-aware plumbing assignment.",
        tone: input.consoleSnapshot.plumbingDispatch.configuredDispatchProviders > 0 ? "success" : "danger",
      },
      {
        label: "Constrained ZIP cells",
        value: input.consoleSnapshot.plumbingDispatch.finance.constrainedCells,
        detail: `${input.consoleSnapshot.plumbingDispatch.finance.unprofitableCells} cells are also losing money at current demand mix.`,
        tone: input.consoleSnapshot.plumbingDispatch.finance.constrainedCells > 0 ? "warning" : "success",
      },
      {
        label: "Contribution margin",
        value: Math.round(input.consoleSnapshot.plumbingDispatch.finance.contributionMargin),
        detail: `${input.consoleSnapshot.plumbingDispatch.finance.contributionMarginRate.toFixed(1)}% contribution rate with ${input.consoleSnapshot.plumbingDispatch.finance.unprofitableProviders} unprofitable providers.`,
        tone: input.consoleSnapshot.plumbingDispatch.finance.contributionMargin < 0 ? "danger" : "success",
      },
    ],
    watchlist: [
      `Lead M1 to M2 conversion is ${input.consoleSnapshot.conversionRates.leadM1ToM2.toFixed(1)}%.`,
      `Lead M2 to M3 conversion is ${input.consoleSnapshot.conversionRates.leadM2ToM3.toFixed(1)}%.`,
      `Customer activation is ${input.consoleSnapshot.conversionRates.customerM1ToM2.toFixed(1)}%.`,
      `Customer value realization is ${input.consoleSnapshot.conversionRates.customerM2ToM3.toFixed(1)}%.`,
      input.consoleSnapshot.plumbingDispatch.providerScores[0]
        ? `Top routing score is ${input.consoleSnapshot.plumbingDispatch.providerScores[0].routingScore} for ${input.consoleSnapshot.plumbingDispatch.providerScores[0].provider}.`
        : "No provider score history is available yet.",
    ],
  } satisfies SystemOverviewSnapshot;
}

export function buildLeadStageSummary(lead: StoredLeadRecord) {
  const plumbing = asPlumbingContext(lead);
  const outcome = asPlumbingOutcome(lead);
  const sla = plumbing
    ? getDispatchSlaSnapshot({
      updatedAt: lead.updatedAt,
      stage: lead.stage,
      plumbing,
      outcome,
    })
    : null;

  return {
    displayLeadName: buildLeadDisplayName(lead),
    displayLeadSubline: buildLeadSubline(lead),
    displayLeadKey: formatLeadKeyForDisplay(lead.leadKey),
    plumbing,
    outcome,
    sla,
  };
}
