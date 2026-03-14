import { summarizeMilestoneProgress } from "./automation.ts";
import type { CanonicalEvent } from "./trace.ts";
import type { StoredLeadRecord } from "./runtime-store.ts";

function countBy<T extends string>(values: T[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

export function buildDashboardSnapshot(leads: StoredLeadRecord[], events: CanonicalEvent[]) {
  const leadMilestoneCounts = {
    captured: leads.filter((lead) => lead.milestones.leadMilestones.includes("lead-m1-captured")).length,
    returnEngaged: leads.filter((lead) => lead.milestones.leadMilestones.includes("lead-m2-return-engaged")).length,
    bookedOrOffered: leads.filter((lead) => lead.milestones.leadMilestones.includes("lead-m3-booked-or-offered")).length,
  };

  const customerMilestoneCounts = {
    onboarded: leads.filter((lead) => lead.milestones.customerMilestones.includes("customer-m1-onboarded")).length,
    activated: leads.filter((lead) => lead.milestones.customerMilestones.includes("customer-m2-activated")).length,
    valueRealized: leads.filter((lead) => lead.milestones.customerMilestones.includes("customer-m3-value-realized")).length,
  };

  const topFamilies = Object.entries(countBy(leads.map((lead) => lead.family)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([family, count]) => ({ family, count }));

  const recentMilestoneEvents = events
    .filter((event) => event.eventType === "lead_milestone_reached" || event.eventType === "customer_milestone_reached")
    .slice(-10)
    .reverse()
    .map((event) => ({
      id: event.id,
      timestamp: event.timestamp,
      leadKey: event.leadKey,
      type: event.eventType,
      milestoneId: String(event.metadata.milestoneId ?? ""),
      visitCount: Number(event.metadata.visitCount ?? 0),
      stage: String(event.metadata.stage ?? ""),
    }));

  const leadTimeline = leads
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10)
    .map((lead) => {
      const progress = summarizeMilestoneProgress(lead);
      return {
        leadKey: lead.leadKey,
        family: lead.family,
        score: lead.score,
        stage: lead.stage,
        hot: lead.hot,
        visitCount: progress.visitCount,
        nextLeadMilestone: progress.nextLeadMilestone?.label ?? null,
        nextCustomerMilestone: progress.nextCustomerMilestone?.label ?? null,
        updatedAt: lead.updatedAt,
      };
    });

  return {
    totals: {
      leads: leads.length,
      events: events.length,
    },
    milestones: {
      lead: leadMilestoneCounts,
      customer: customerMilestoneCounts,
    },
    topFamilies,
    recentMilestoneEvents,
    leadTimeline,
  };
}
