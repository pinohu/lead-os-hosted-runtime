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
  href?: string;
}

export interface ObservabilityRuleResult {
  id: string;
  title: string;
  severity: Exclude<JourneyItemSeverity, "info">;
  thresholdLabel: string;
  currentLabel: string;
  triggered: boolean;
  notificationChannel: "dashboard" | "email" | "sms";
  resolution: string;
  href: string;
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
  rules: ObservabilityRuleResult[];
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

function queueHref(path: string, params: Record<string, string | undefined> = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
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
      href: queueHref("/dashboard/execution", { status: "failed", query: task.provider }),
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
      href: queueHref("/dashboard/workflows", { result: "failed", query: run.provider }),
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
      href: queueHref("/dashboard/leads/" + encodeURIComponent(execution.leadKey ?? ""), {}),
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
      href: queueHref("/dashboard/bookings", { status: "failed", query: job.provider }),
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
      href: queueHref("/dashboard/documents", { status: "failed", query: job.provider }),
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
      href: queueHref("/dashboard", { focus: "provider-requests" }),
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
      href: queueHref("/dashboard/deployments", { health: "generated-stale" }),
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
      href: queueHref("/dashboard/deployments", { health: "live-missing-url" }),
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
      href: queueHref("/dashboard/deployments", { health: "stale" }),
    });
  }

  return enriched.slice(0, 10);
}

function buildObservabilityRules(input: {
  unresolvedCount: number;
  pendingProviderResponses: number;
  failedExecutionTasks: number;
  constrainedCells: number;
  unprofitableProviders: number;
  generatedOlderThanSevenDays: number;
  liveWithoutPageUrl: number;
  staleDeployments: number;
  degradedProviders: number;
  missingProviders: number;
}) {
  const rules: ObservabilityRuleResult[] = [
    {
      id: "dispatch-backlog",
      title: "Dispatch backlog threshold",
      severity: "warning",
      thresholdLabel: "Trigger when unresolved plumbing leads reach 5",
      currentLabel: `${input.unresolvedCount} unresolved plumbing leads`,
      triggered: input.unresolvedCount >= 5,
      notificationChannel: "dashboard",
      resolution: "Rebalance operator coverage, auto-escalation, or provider capacity before more urgent leads stack up.",
      href: queueHref("/dashboard", { focus: "dispatch-first" }),
    },
    {
      id: "provider-response-latency",
      title: "Provider response latency threshold",
      severity: "warning",
      thresholdLabel: "Trigger when pending provider responses reach 3",
      currentLabel: `${input.pendingProviderResponses} provider responses pending`,
      triggered: input.pendingProviderResponses >= 3,
      notificationChannel: "sms",
      resolution: "Escalate to backup providers or shorten provider response windows before urgent jobs expire.",
      href: queueHref("/dashboard", { focus: "provider-requests" }),
    },
    {
      id: "execution-failures",
      title: "Execution failure threshold",
      severity: "danger",
      thresholdLabel: "Trigger when any execution task fails",
      currentLabel: `${input.failedExecutionTasks} failed execution tasks`,
      triggered: input.failedExecutionTasks >= 1,
      notificationChannel: "email",
      resolution: "Inspect failed booking, document, or workflow tasks and rerun them before they silently leak demand.",
      href: queueHref("/dashboard/execution", { status: "failed" }),
    },
    {
      id: "zip-cell-liquidity",
      title: "ZIP-cell liquidity threshold",
      severity: "warning",
      thresholdLabel: "Trigger when constrained ZIP cells reach 2",
      currentLabel: `${input.constrainedCells} constrained ZIP cells`,
      triggered: input.constrainedCells >= 2,
      notificationChannel: "dashboard",
      resolution: "Recruit supply or narrow acquisition in cells where demand is outrunning coverage.",
      href: queueHref("/dashboard/providers", { focus: "zip-liquidity" }),
    },
    {
      id: "provider-profitability",
      title: "Provider profitability threshold",
      severity: "warning",
      thresholdLabel: "Trigger when any provider turns loss-making",
      currentLabel: `${input.unprofitableProviders} loss-making providers`,
      triggered: input.unprofitableProviders >= 1,
      notificationChannel: "email",
      resolution: "Review payout terms, routing mix, and refund exposure before continuing to scale that provider.",
      href: queueHref("/dashboard/providers", { focus: "profitability" }),
    },
    {
      id: "generated-rollout-stall",
      title: "Rollout stall threshold",
      severity: "warning",
      thresholdLabel: "Trigger when generated-but-unverified deployments reach 3",
      currentLabel: `${input.generatedOlderThanSevenDays} stale generated deployments`,
      triggered: input.generatedOlderThanSevenDays >= 3,
      notificationChannel: "dashboard",
      resolution: "Promote, verify, or retire generated rollout assets so the registry reflects real field progress.",
      href: queueHref("/dashboard/deployments", { health: "generated-stale" }),
    },
    {
      id: "live-missing-url",
      title: "Live verification threshold",
      severity: "danger",
      thresholdLabel: "Trigger when any live deployment lacks a public URL",
      currentLabel: `${input.liveWithoutPageUrl} live deployments missing URL`,
      triggered: input.liveWithoutPageUrl >= 1,
      notificationChannel: "email",
      resolution: "Attach the verified public URL so live installs can be audited for drift and outage recovery.",
      href: queueHref("/dashboard/deployments", { health: "live-missing-url" }),
    },
    {
      id: "stale-rollout",
      title: "Stale rollout threshold",
      severity: "warning",
      thresholdLabel: "Trigger when untouched deployments reach 5",
      currentLabel: `${input.staleDeployments} stale deployments`,
      triggered: input.staleDeployments >= 5,
      notificationChannel: "dashboard",
      resolution: "Review rollout ownership and confirm which installs are still strategically active.",
      href: queueHref("/dashboard/deployments", { health: "stale" }),
    },
    {
      id: "provider-capability-health",
      title: "Provider capability health threshold",
      severity: "warning",
      thresholdLabel: "Trigger when any provider is degraded or missing",
      currentLabel: `${input.degradedProviders} degraded / ${input.missingProviders} missing providers`,
      triggered: input.degradedProviders + input.missingProviders >= 1,
      notificationChannel: "dashboard",
      resolution: "Repair degraded adapters and finish missing provider configuration before those channels silently underperform.",
      href: queueHref("/dashboard/providers", { focus: "capability" }),
    },
  ];

  return rules;
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
  const rules = buildObservabilityRules({
    unresolvedCount: input.consoleSnapshot.plumbingDispatch.unresolvedCount,
    pendingProviderResponses: input.consoleSnapshot.plumbingDispatch.providerRequestQueue.pendingCount,
    failedExecutionTasks: input.consoleSnapshot.plumbingDispatch.executionQueue.failedCount,
    constrainedCells: input.consoleSnapshot.plumbingDispatch.finance.constrainedCells,
    unprofitableProviders: input.consoleSnapshot.plumbingDispatch.finance.unprofitableProviders,
    generatedOlderThanSevenDays: input.deploymentSummary.generatedOlderThanSevenDays,
    liveWithoutPageUrl: input.deploymentSummary.liveWithoutPageUrl,
    staleDeployments: input.deploymentSummary.staleDeployments,
    degradedProviders,
    missingProviders,
  });
  const activeAlerts = buildSystemIssueInsights({
    leads: input.leads,
    workflowRuns: input.workflowRuns,
    providerExecutions: input.providerExecutions,
    bookingJobs: input.bookingJobs,
    documentJobs: input.documentJobs,
    executionTasks: input.executionTasks,
    providerRequests: input.providerRequests,
    deploymentSummary: input.deploymentSummary,
  }).concat(rules.filter((rule) => rule.triggered).map((rule) => ({
    id: `rule:${rule.id}`,
    source: "notification rule",
    title: rule.title,
    reason: `${rule.currentLabel}. ${rule.thresholdLabel}.`,
    resolution: rule.resolution,
    severity: rule.severity,
    href: rule.href,
  })));

  return {
    activeAlerts,
    rules,
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
