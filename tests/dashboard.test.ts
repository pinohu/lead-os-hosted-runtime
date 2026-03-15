import test from "node:test";
import assert from "node:assert/strict";
import { buildDashboardSnapshot, buildDashboardSnapshotWithOptions } from "../src/lib/dashboard.ts";
import type { StoredLeadRecord } from "../src/lib/runtime-store.ts";
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
