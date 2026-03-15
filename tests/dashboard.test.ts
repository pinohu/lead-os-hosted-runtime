import test from "node:test";
import assert from "node:assert/strict";
import { buildDashboardSnapshot, buildDashboardSnapshotWithOptions, buildOperatorConsoleSnapshot } from "../src/lib/dashboard.ts";
import { recommendDispatchProviders } from "../src/lib/dispatch-routing.ts";
import type {
  BookingJobRecord,
  ProviderExecutionRecord,
  StoredLeadRecord,
  WorkflowRunRecord,
} from "../src/lib/runtime-store.ts";
import type { CanonicalEvent } from "../src/lib/trace.ts";

test("dashboard snapshot summarizes milestone progress and recent events", () => {
  const leads: StoredLeadRecord[] = [
    {
      leadKey: "email:one@example.com",
      trace: {
        visitorId: "visitor-1",
        sessionId: "session-1",
        leadKey: "email:one@example.com",
        tenant: "tenant",
        source: "manual",
        service: "lead-capture",
        niche: "general",
        blueprintId: "lead-magnet-default",
        stepId: "lead-magnet-1",
      },
      firstName: "One",
      lastName: "Lead",
      email: "one@example.com",
      phone: "+15555550111",
      service: "lead-capture",
      niche: "general",
      source: "manual",
      score: 45,
      family: "lead-magnet",
      blueprintId: "lead-magnet-default",
      destination: "/funnel/lead-magnet",
      ctaLabel: "Continue",
      stage: "captured",
      hot: false,
      createdAt: new Date("2026-03-14T00:00:00Z").toISOString(),
      updatedAt: new Date("2026-03-14T00:00:00Z").toISOString(),
      status: "LEAD-CAPTURED",
      sentNurtureStages: [],
      milestones: {
        visitCount: 1,
        leadMilestones: ["lead-m1-captured"],
        customerMilestones: [],
      },
      metadata: {},
    },
    {
      leadKey: "email:two@example.com",
      trace: {
        visitorId: "visitor-2",
        sessionId: "session-2",
        leadKey: "email:two@example.com",
        tenant: "tenant",
        source: "manual",
        service: "lead-capture",
        niche: "general",
        blueprintId: "qualification-default",
        stepId: "qualification-1",
      },
      firstName: "Two",
      lastName: "Lead",
      email: "two@example.com",
      phone: "+15555550222",
      service: "lead-capture",
      niche: "general",
      source: "manual",
      score: 91,
      family: "qualification",
      blueprintId: "qualification-default",
      destination: "/assess/general",
      ctaLabel: "Start Assessment",
      stage: "active",
      hot: true,
      createdAt: new Date("2026-03-13T00:00:00Z").toISOString(),
      updatedAt: new Date("2026-03-14T02:00:00Z").toISOString(),
      status: "LEAD-CONVERTED",
      sentNurtureStages: [],
      milestones: {
        visitCount: 3,
        leadMilestones: ["lead-m1-captured", "lead-m2-return-engaged", "lead-m3-booked-or-offered"],
        customerMilestones: ["customer-m1-onboarded", "customer-m2-activated", "customer-m3-value-realized"],
      },
      metadata: {},
    },
  ];

  const events: CanonicalEvent[] = [
    {
      id: "event-1",
      eventType: "lead_milestone_reached",
      visitorId: "visitor-2",
      sessionId: "session-2",
      leadKey: "email:two@example.com",
      tenant: "tenant",
      source: "manual",
      service: "lead-capture",
      niche: "general",
      blueprintId: "qualification-default",
      stepId: "qualification-1",
      channel: "internal",
      status: "MILESTONE",
      timestamp: new Date("2026-03-14T02:00:00Z").toISOString(),
      metadata: {
        milestoneId: "lead-m3-booked-or-offered",
        visitCount: 3,
        stage: "active",
      },
    },
  ];

  const snapshot = buildDashboardSnapshot(leads, events);

  assert.equal(snapshot.milestones.lead.captured, 2);
  assert.equal(snapshot.milestones.lead.returnEngaged, 1);
  assert.equal(snapshot.milestones.customer.valueRealized, 1);
  assert.equal(snapshot.totals.hotLeads, 1);
  assert.equal(snapshot.conversionRates.leadM1ToM2, 50);
  assert.equal(snapshot.topSources[0]?.label, "manual");
  assert.equal(snapshot.leadTimeline[0]?.leadKey, "email:two@example.com");
  assert.equal(snapshot.recentMilestoneEvents[0]?.milestoneId, "lead-m3-booked-or-offered");
  assert.equal(snapshot.experimentPerformance[0]?.experimentId, "default");
  assert.equal(snapshot.experimentPerformance[0]?.entries, 2);
});

test("dashboard snapshot hides system verification traffic by default and can include it when requested", () => {
  const visibleLead: StoredLeadRecord = {
    leadKey: "email:real@example.com",
    trace: {
      visitorId: "visitor-1",
      sessionId: "session-1",
      leadKey: "email:real@example.com",
      tenant: "tenant",
      source: "manual",
      service: "lead-capture",
      niche: "general",
      blueprintId: "qualification-default",
      stepId: "qualification-1",
    },
    firstName: "Real",
    lastName: "Lead",
    email: "real@example.com",
    service: "lead-capture",
    niche: "general",
    source: "manual",
    score: 77,
    family: "qualification",
    blueprintId: "qualification-default",
    destination: "/assess/general",
    ctaLabel: "Continue",
    stage: "captured",
    hot: true,
    createdAt: new Date("2026-03-14T04:00:00Z").toISOString(),
    updatedAt: new Date("2026-03-14T04:00:00Z").toISOString(),
    status: "LEAD-CAPTURED",
    sentNurtureStages: [],
    milestones: {
      visitCount: 1,
      leadMilestones: ["lead-m1-captured"],
      customerMilestones: [],
    },
    metadata: {},
  };

  const systemLead: StoredLeadRecord = {
    ...visibleLead,
    leadKey: "email:trafft-webhook-check@lead-os.dev",
    trace: {
      ...visibleLead.trace,
      leadKey: "email:trafft-webhook-check@lead-os.dev",
      visitorId: "visitor-smoke",
      sessionId: "session-smoke",
      source: "smoke",
      tenant: "smoke",
    },
    email: "trafft-webhook-check@lead-os.dev",
    source: "smoke",
    updatedAt: new Date("2026-03-14T05:00:00Z").toISOString(),
  };

  const leads = [visibleLead, systemLead];
  const events: CanonicalEvent[] = [
    {
      id: "event-visible",
      eventType: "lead_milestone_reached",
      visitorId: "visitor-1",
      sessionId: "session-1",
      leadKey: "email:real@example.com",
      tenant: "tenant",
      source: "manual",
      service: "lead-capture",
      niche: "general",
      blueprintId: "qualification-default",
      stepId: "qualification-1",
      channel: "internal",
      status: "MILESTONE",
      timestamp: new Date("2026-03-14T04:00:00Z").toISOString(),
      metadata: { milestoneId: "lead-m1-captured", visitCount: 1, stage: "captured" },
    },
    {
      id: "event-system",
      eventType: "lead_milestone_reached",
      visitorId: "visitor-smoke",
      sessionId: "session-smoke",
      leadKey: "email:trafft-webhook-check@lead-os.dev",
      tenant: "smoke",
      source: "smoke",
      service: "smoke",
      niche: "general",
      blueprintId: "qualification-default",
      stepId: "qualification-1",
      channel: "internal",
      status: "MILESTONE",
      timestamp: new Date("2026-03-14T05:00:00Z").toISOString(),
      metadata: { milestoneId: "lead-m1-captured", visitCount: 1, stage: "captured" },
    },
  ];

  const hiddenSnapshot = buildDashboardSnapshot(leads, events);
  assert.equal(hiddenSnapshot.totals.leads, 1);
  assert.equal(hiddenSnapshot.systemTraffic.hiddenLeads, 1);
  assert.equal(hiddenSnapshot.systemTraffic.hiddenEvents, 1);
  assert.equal(hiddenSnapshot.leadTimeline[0]?.leadKey, "email:real@example.com");

  const fullSnapshot = buildDashboardSnapshotWithOptions(leads, events, { includeSystemTraffic: true });
  assert.equal(fullSnapshot.totals.leads, 2);
  assert.equal(fullSnapshot.systemTraffic.included, true);
  assert.equal(fullSnapshot.systemTraffic.hiddenLeads, 0);
});

test("dashboard snapshot includes closed-loop economics in experiment reporting", () => {
  const leads: StoredLeadRecord[] = [
    {
      leadKey: "email:experiment@example.com",
      trace: {
        visitorId: "visitor-exp",
        sessionId: "session-exp",
        leadKey: "email:experiment@example.com",
        tenant: "tenant",
        source: "search",
        service: "emergency-plumbing",
        niche: "plumbing",
        blueprintId: "qualification-default",
        stepId: "qualification-1",
        experimentId: "plumbing-client-entry-v1:desktop",
        variantId: "dispatch-proof",
      },
      firstName: "Experiment",
      lastName: "Lead",
      email: "experiment@example.com",
      phone: "+15555550555",
      service: "emergency-plumbing",
      niche: "plumbing",
      source: "search",
      score: 92,
      family: "qualification",
      blueprintId: "qualification-default",
      destination: "/funnel/qualification",
      ctaLabel: "Start Dispatch",
      stage: "active",
      hot: true,
      createdAt: new Date("2026-03-15T03:00:00Z").toISOString(),
      updatedAt: new Date("2026-03-15T03:30:00Z").toISOString(),
      status: "JOB-COMPLETED",
      sentNurtureStages: [],
      milestones: {
        visitCount: 3,
        leadMilestones: ["lead-m1-captured", "lead-m2-return-engaged", "lead-m3-booked-or-offered"],
        customerMilestones: ["customer-m1-onboarded", "customer-m2-activated", "customer-m3-value-realized"],
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
        plumbingOutcome: {
          status: "completed",
          actorEmail: "operator@example.com",
          recordedAt: new Date("2026-03-15T03:30:00Z").toISOString(),
          provider: "Dallas Emergency Crew",
          revenueValue: 1800,
          marginValue: 700,
          complaintStatus: "none",
          reviewStatus: "positive",
          reviewRating: 5,
          refundIssued: false,
        },
      },
    },
  ];

  const snapshot = buildDashboardSnapshot(leads, []);
  assert.equal(snapshot.experimentPerformance[0]?.experimentId, "plumbing-client-entry-v1:desktop");
  assert.equal(snapshot.experimentPerformance[0]?.completedRevenue, 1800);
  assert.equal(snapshot.experimentPerformance[0]?.completedMargin, 700);
  assert.equal(snapshot.experimentPerformance[0]?.marginRate, 38.9);
  assert.equal(snapshot.experimentPerformance[0]?.positiveReviews, 1);
  assert.equal(snapshot.experimentPerformance[0]?.majorComplaints, 0);
});

test("operator console snapshot exposes plumbing dispatch queues and provider scores", () => {
  const leads: StoredLeadRecord[] = [
    {
      leadKey: "email:burst@example.com",
      trace: {
        visitorId: "visitor-3",
        sessionId: "session-3",
        leadKey: "email:burst@example.com",
        tenant: "tenant",
        source: "search",
        service: "emergency-plumbing",
        niche: "plumbing",
        blueprintId: "qualification-default",
        stepId: "qualification-1",
      },
      firstName: "Burst",
      lastName: "Pipe",
      email: "burst@example.com",
      phone: "+15555550333",
      service: "emergency-plumbing",
      niche: "plumbing",
      source: "search",
      score: 98,
      family: "qualification",
      blueprintId: "qualification-default",
      destination: "/funnel/qualification",
      ctaLabel: "Start Dispatch",
      stage: "qualified",
      hot: true,
      createdAt: new Date("2026-03-15T01:00:00Z").toISOString(),
      updatedAt: new Date("2026-03-15T01:05:00Z").toISOString(),
      status: "LEAD-QUALIFIED",
      sentNurtureStages: [],
      milestones: {
        visitCount: 1,
        leadMilestones: ["lead-m1-captured"],
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
          routingReasons: ["Emergency keywords detected", "Phone present for dispatch"],
        },
      },
    },
    {
      leadKey: "email:completed@example.com",
      trace: {
        visitorId: "visitor-4",
        sessionId: "session-4",
        leadKey: "email:completed@example.com",
        tenant: "tenant",
        source: "search",
        service: "emergency-plumbing",
        niche: "plumbing",
        blueprintId: "qualification-default",
        stepId: "qualification-1",
      },
      firstName: "Finished",
      lastName: "Job",
      email: "completed@example.com",
      phone: "+15555550444",
      service: "emergency-plumbing",
      niche: "plumbing",
      source: "search",
      score: 88,
      family: "qualification",
      blueprintId: "qualification-default",
      destination: "/funnel/qualification",
      ctaLabel: "Start Dispatch",
      stage: "active",
      hot: false,
      createdAt: new Date("2026-03-15T00:30:00Z").toISOString(),
      updatedAt: new Date("2026-03-15T01:15:00Z").toISOString(),
      status: "LEAD-CONVERTED",
      sentNurtureStages: [],
      milestones: {
        visitCount: 3,
        leadMilestones: ["lead-m1-captured", "lead-m2-return-engaged", "lead-m3-booked-or-offered"],
        customerMilestones: ["customer-m1-onboarded", "customer-m2-activated"],
      },
      metadata: {
        operatingModel: "plumbing-dispatch",
        plumbing: {
          urgencyBand: "same-day",
          issueType: "leak",
          dispatchMode: "same-day-booking",
          propertyType: "residential",
          geo: {
            city: "Dallas",
            state: "Texas",
            zip: "75202",
          },
          routingReasons: ["Prior booking completed"],
        },
        plumbingOutcome: {
          status: "completed",
          actorEmail: "dispatch@example.org",
          recordedAt: new Date("2026-03-15T01:15:00Z").toISOString(),
          provider: "Trafft",
          revenueValue: 1450,
          marginValue: 620,
          complaintStatus: "none",
          reviewStatus: "positive",
          reviewRating: 4.9,
          refundIssued: false,
        },
      },
    },
  ];

  const bookingJobs: BookingJobRecord[] = [
    {
      id: "booking-1",
      leadKey: "email:burst@example.com",
      provider: "Trafft",
      status: "booked",
      detail: "Booked emergency slot",
      createdAt: new Date("2026-03-15T01:06:00Z").toISOString(),
      updatedAt: new Date("2026-03-15T01:06:00Z").toISOString(),
    },
  ];

  const providerExecutions: ProviderExecutionRecord[] = [
    {
      id: "provider-1",
      leadKey: "email:burst@example.com",
      provider: "Trafft",
      kind: "booking",
      ok: true,
      mode: "live",
      detail: "Emergency dispatch executed",
      createdAt: new Date("2026-03-15T01:06:00Z").toISOString(),
    },
  ];

  const workflowRuns: WorkflowRunRecord[] = [
    {
      id: "workflow-1",
      leadKey: "email:burst@example.com",
      eventName: "dispatch_path_selected",
      provider: "n8n",
      ok: true,
      mode: "live",
      detail: "Urgent dispatch workflow emitted",
      createdAt: new Date("2026-03-15T01:05:30Z").toISOString(),
    },
  ];

  const snapshot = buildOperatorConsoleSnapshot(leads, [], bookingJobs, [], [], providerExecutions, workflowRuns, [
    {
      id: "crew-dallas",
      label: "Dallas Emergency Crew",
      active: true,
      priorityWeight: 82,
      maxConcurrentJobs: 4,
      activeJobs: 1,
      acceptsEmergency: true,
      acceptsCommercial: false,
      propertyTypes: ["residential"],
      issueTypes: ["burst-pipe", "leak"],
      states: [],
      counties: [],
      cities: [],
      zipPrefixes: [],
      emergencyCoverageWindow: "24/7",
    },
  ], {});

  assert.equal(snapshot.plumbingDispatch.totalPlumbingLeads, 2);
  assert.equal(snapshot.plumbingDispatch.unresolvedCount, 1);
  assert.equal(snapshot.plumbingDispatch.emergencyQueue.length, 1);
  assert.equal(snapshot.plumbingDispatch.emergencyQueue[0]?.dispatchMode, "dispatch-now");
  assert.equal(snapshot.plumbingDispatch.emergencyQueue[0]?.operatorAction, "Escalate to backup provider now");
  assert.equal(snapshot.plumbingDispatch.emergencyQueue[0]?.recommendedProviders[0]?.providerLabel, "Dallas Emergency Crew");
  assert.equal(snapshot.plumbingDispatch.providerScores[0]?.provider, "Trafft");
  assert.equal(snapshot.plumbingDispatch.providerScores[0]?.bookingFillRate, 100);
  assert.equal(snapshot.plumbingDispatch.providerScores[0]?.completedRevenue, 1450);
  assert.equal(snapshot.plumbingDispatch.providerScores[0]?.completedMargin, 620);
  assert.equal(snapshot.plumbingDispatch.providerScores[0]?.marginRate, 42.8);
  assert.equal(snapshot.plumbingDispatch.providerScores[0]?.positiveReviews, 1);
  assert.equal(snapshot.plumbingDispatch.providerScores[0]?.negativeComplaints, 0);
  assert.equal(snapshot.plumbingDispatch.providerScores[0]?.economicQualityScore > 0, true);
  assert.equal(snapshot.plumbingDispatch.providerScores[0]?.routingScore > 0, true);
  assert.equal(snapshot.plumbingDispatch.providerScores[0]?.routingScore <= 100, true);
  assert.equal(snapshot.plumbingDispatch.metroBreakdown[0]?.label, "dallas, texas");
  assert.equal(snapshot.plumbingDispatch.metroRevenueBreakdown[0]?.label, "dallas, texas");
  assert.equal(snapshot.plumbingDispatch.metroRevenueBreakdown[0]?.revenue, 1450);
  assert.equal(snapshot.plumbingDispatch.zipCellLiquidity.topCells[0]?.label, "dallas, texas");
  assert.equal(snapshot.plumbingDispatch.zipCellLiquidity.topCells[0]?.completedMargin, 620);
  assert.equal(snapshot.plumbingDispatch.zipCellLiquidity.topCells[0]?.marginRate, 42.8);
  assert.match(snapshot.plumbingDispatch.zipCellLiquidity.topCells[0]?.recommendedAction ?? "", /supply|balance/i);
  assert.equal(snapshot.plumbingDispatch.providerRequestQueue.pendingCount, 0);
  assert.equal(snapshot.plumbingDispatch.executionQueue.pendingCount, 0);
});

test("dispatch routing recommends providers by capacity and job fit", () => {
  const recommended = recommendDispatchProviders(
    {
      urgencyBand: "emergency-now",
      issueType: "burst-pipe",
      dispatchMode: "dispatch-now",
      propertyType: "residential",
      routingReasons: ["Emergency keywords detected"],
    },
    [
      {
        id: "crew-dallas",
        label: "Dallas Emergency Crew",
        active: true,
        priorityWeight: 90,
        maxConcurrentJobs: 4,
        activeJobs: 1,
        acceptsEmergency: true,
        acceptsCommercial: false,
        propertyTypes: ["residential"],
        issueTypes: ["burst-pipe", "leak"],
        states: ["texas"],
        counties: ["dallas county"],
        cities: ["dallas"],
        zipPrefixes: ["752"],
        emergencyCoverageWindow: "24/7",
      },
      {
        id: "crew-commercial",
        label: "Commercial Specialist",
        active: true,
        priorityWeight: 40,
        maxConcurrentJobs: 2,
        activeJobs: 2,
        acceptsEmergency: false,
        acceptsCommercial: true,
        propertyTypes: ["commercial"],
        issueTypes: ["commercial-service"],
        states: ["texas"],
        counties: [],
        cities: ["dallas"],
        zipPrefixes: [],
        emergencyCoverageWindow: undefined,
      },
    ],
  );

  assert.equal(recommended[0]?.providerId, "crew-dallas");
  assert.equal(recommended[0]?.availableCapacity, 3);
  assert.match(recommended[0]?.reason ?? "", /Emergency coverage/);
  assert.equal(recommended.some((provider) => provider.providerId === "crew-commercial"), false);
});
