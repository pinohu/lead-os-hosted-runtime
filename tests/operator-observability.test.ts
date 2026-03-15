import test from "node:test";
import assert from "node:assert/strict";
import { buildLeadJourneySnapshot, buildSystemOverviewSnapshot } from "../src/lib/operator-observability.ts";
import type {
  BookingJobRecord,
  DocumentJobRecord,
  ExecutionTaskRecord,
  OperatorActionRecord,
  ProviderDispatchRequestRecord,
  ProviderExecutionRecord,
  StoredLeadRecord,
  WorkflowRunRecord,
} from "../src/lib/runtime-store.ts";
import type { CanonicalEvent } from "../src/lib/trace.ts";

function createLead(): StoredLeadRecord {
  return {
    leadKey: "email:journey@example.com",
    trace: {
      visitorId: "visitor-journey",
      sessionId: "session-journey",
      leadKey: "email:journey@example.com",
      tenant: "tenant",
      source: "search",
      service: "emergency-plumbing",
      niche: "plumbing",
      blueprintId: "qualification-default",
      stepId: "qualification-1",
    },
    firstName: "Journey",
    lastName: "Lead",
    email: "journey@example.com",
    phone: "+15555550111",
    service: "emergency-plumbing",
    niche: "plumbing",
    source: "search",
    score: 91,
    family: "qualification",
    blueprintId: "qualification-default",
    destination: "/plumbing/emergency",
    ctaLabel: "Book the fastest route",
    stage: "qualified",
    hot: true,
    createdAt: new Date("2026-03-15T12:00:00Z").toISOString(),
    updatedAt: new Date("2026-03-15T12:20:00Z").toISOString(),
    status: "LEAD-QUALIFIED",
    sentNurtureStages: [],
    milestones: {
      visitCount: 2,
      leadMilestones: ["lead-m1-captured", "lead-m2-return-engaged"],
      customerMilestones: [],
    },
    metadata: {
      operatingModel: "plumbing-dispatch",
      plumbing: {
        urgencyBand: "emergency-now",
        issueType: "burst-pipe",
        dispatchMode: "dispatch-now",
        propertyType: "residential",
        geo: {
          city: "Dallas",
          state: "Texas",
          zip: "75201",
        },
        routingReasons: ["Emergency keywords detected"],
      },
    },
  };
}

test("buildLeadJourneySnapshot creates chronological timeline and operator issue explanations", () => {
  const lead = createLead();
  const events: CanonicalEvent[] = [
    {
      id: "event-1",
      eventType: "lead_milestone_reached",
      visitorId: lead.trace.visitorId,
      sessionId: lead.trace.sessionId,
      leadKey: lead.leadKey,
      tenant: lead.trace.tenant,
      source: lead.source,
      service: lead.service,
      niche: lead.niche,
      blueprintId: lead.blueprintId,
      stepId: lead.trace.stepId,
      channel: "web",
      status: "captured",
      timestamp: new Date("2026-03-15T12:00:00Z").toISOString(),
      metadata: { milestoneId: "lead-m1-captured" },
    },
  ];
  const workflows: WorkflowRunRecord[] = [
    {
      id: "workflow-1",
      leadKey: lead.leadKey,
      eventName: "dispatch_path_selected",
      provider: "n8n",
      ok: false,
      mode: "live",
      detail: "Workflow failed: 401",
      createdAt: new Date("2026-03-15T12:05:00Z").toISOString(),
    },
  ];
  const providerExecutions: ProviderExecutionRecord[] = [
    {
      id: "provider-1",
      leadKey: lead.leadKey,
      provider: "Trafft",
      kind: "booking",
      ok: true,
      mode: "live",
      detail: "Booking request accepted",
      createdAt: new Date("2026-03-15T12:06:00Z").toISOString(),
    },
  ];
  const bookingJobs: BookingJobRecord[] = [
    {
      id: "booking-1",
      leadKey: lead.leadKey,
      provider: "Trafft",
      status: "failed",
      detail: "Trafft availability lookup failed: 503",
      createdAt: new Date("2026-03-15T12:06:00Z").toISOString(),
      updatedAt: new Date("2026-03-15T12:07:00Z").toISOString(),
    },
  ];
  const documentJobs: DocumentJobRecord[] = [];
  const executionTasks: ExecutionTaskRecord[] = [
    {
      id: "task-1",
      leadKey: lead.leadKey,
      kind: "booking",
      provider: "Trafft",
      status: "failed",
      dedupeKey: "booking:booking-1",
      attempts: 2,
      lastError: "Provider timeout",
      createdAt: new Date("2026-03-15T12:05:30Z").toISOString(),
      updatedAt: new Date("2026-03-15T12:08:00Z").toISOString(),
    },
  ];
  const providerRequests: ProviderDispatchRequestRecord[] = [
    {
      id: "request-1",
      leadKey: lead.leadKey,
      providerId: "crew-dallas",
      providerLabel: "Dallas Crew",
      status: "declined",
      urgencyBand: "emergency-now",
      issueType: "burst-pipe",
      createdAt: new Date("2026-03-15T12:09:00Z").toISOString(),
      updatedAt: new Date("2026-03-15T12:10:00Z").toISOString(),
    },
  ];
  const operatorActions: OperatorActionRecord[] = [
    {
      id: "action-1",
      leadKey: lead.leadKey,
      actionType: "assign-backup-provider",
      actorEmail: "dispatch@example.com",
      detail: "Operator routed the job to a backup provider.",
      createdAt: new Date("2026-03-15T12:11:00Z").toISOString(),
    },
  ];

  const snapshot = buildLeadJourneySnapshot({
    lead,
    events,
    workflows,
    providerExecutions,
    bookingJobs,
    documentJobs,
    executionTasks,
    providerRequests,
    operatorActions,
  });

  assert.equal(snapshot.timeline[0]?.id, "event:event-1");
  assert.equal(snapshot.timeline.at(-1)?.id, "operator:action-1");
  assert.equal(snapshot.issues.length, 4);
  assert.match(snapshot.issues[0]?.resolution ?? "", /booking queue|workflow run history|backup provider/i);
});

test("buildSystemOverviewSnapshot combines queue, rollout, and provider alerts", () => {
  const lead = createLead();
  const snapshot = buildSystemOverviewSnapshot({
    consoleSnapshot: {
      totals: { leads: 12, hotLeads: 5 },
      conversionRates: {
        leadM1ToM2: 40,
        leadM2ToM3: 30,
        customerM1ToM2: 25,
        customerM2ToM3: 20,
      },
      plumbingDispatch: {
        unresolvedCount: 4,
        emergencyQueue: [{ id: 1 }],
        sameDayQueue: [{ id: 2 }],
        providerRequestQueue: { pendingCount: 3 },
        executionQueue: { pendingCount: 2, failedCount: 1 },
        configuredDispatchProviders: 6,
        providerScores: [{ provider: "Dallas Crew", routingScore: 82, contributionStatus: "healthy" }],
        finance: {
          contributionMargin: 1200,
          contributionMarginRate: 28,
          constrainedCells: 2,
          unprofitableProviders: 1,
          unprofitableCells: 1,
        },
      },
    },
    leads: [lead],
    workflowRuns: [],
    providerExecutions: [],
    bookingJobs: [],
    documentJobs: [],
    executionTasks: [],
    providerRequests: [],
    deploymentSummary: {
      total: 10,
      live: 4,
      generated: 3,
      planned: 3,
      generatedOlderThanSevenDays: 1,
      liveWithoutPageUrl: 1,
      staleDeployments: 2,
    },
  });

  assert.equal(snapshot.queuePulse[1]?.value, 4);
  assert.equal(snapshot.rolloutPulse[2]?.value, 1);
  assert.equal(snapshot.providerPulse[3]?.value, 1200);
  assert.equal(snapshot.activeAlerts.some((issue) => issue.source === "rollout registry"), true);
  assert.equal(snapshot.watchlist.length >= 4, true);
});
