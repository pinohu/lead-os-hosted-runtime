import { summarizeMilestoneProgress } from "./automation.ts";
import type { CanonicalEvent } from "./trace.ts";
import type { StoredLeadRecord } from "./runtime-store.ts";

function countBy<T extends string>(values: T[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function topBreakdown(values: string[]) {
  return Object.entries(countBy(values))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));
}

function ratio(value: number, total: number) {
  if (total <= 0) return 0;
  return Number(((value / total) * 100).toFixed(1));
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

  const experimentPerformance = Object.entries(
    leads.reduce<Record<string, {
      experimentId: string;
      entries: number;
      hot: number;
      m2: number;
      m3: number;
      converted: number;
      variants: Record<string, number>;
    }>>((acc, lead) => {
      const experimentId = lead.trace.experimentId ?? "default";
      const variantId = lead.trace.variantId ?? "default";
      const entry = acc[experimentId] ?? {
        experimentId,
        entries: 0,
        hot: 0,
        m2: 0,
        m3: 0,
        converted: 0,
        variants: {},
      };
      entry.entries += 1;
      entry.hot += lead.hot ? 1 : 0;
      entry.m2 += lead.milestones.leadMilestones.includes("lead-m2-return-engaged") ? 1 : 0;
      entry.m3 += lead.milestones.leadMilestones.includes("lead-m3-booked-or-offered") ? 1 : 0;
      entry.converted += ["converted", "onboarding", "active", "retention-risk", "referral-ready"].includes(lead.stage) ? 1 : 0;
      entry.variants[variantId] = (entry.variants[variantId] ?? 0) + 1;
      acc[experimentId] = entry;
      return acc;
    }, {}),
  )
    .map(([, experiment]) => ({
      experimentId: experiment.experimentId,
      entries: experiment.entries,
      hotRate: ratio(experiment.hot, experiment.entries),
      m1ToM2: ratio(experiment.m2, experiment.entries),
      m1ToM3: ratio(experiment.m3, experiment.entries),
      conversionRate: ratio(experiment.converted, experiment.entries),
      topVariants: Object.entries(experiment.variants)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([variantId, count]) => ({ variantId, count })),
    }))
    .sort((a, b) => b.entries - a.entries);

  return {
    totals: {
      leads: leads.length,
      events: events.length,
      hotLeads: leads.filter((lead) => lead.hot).length,
    },
    milestones: {
      lead: leadMilestoneCounts,
      customer: customerMilestoneCounts,
    },
    conversionRates: {
      leadM1ToM2: ratio(leadMilestoneCounts.returnEngaged, leadMilestoneCounts.captured),
      leadM2ToM3: ratio(leadMilestoneCounts.bookedOrOffered, leadMilestoneCounts.returnEngaged),
      customerM1ToM2: ratio(customerMilestoneCounts.activated, customerMilestoneCounts.onboarded),
      customerM2ToM3: ratio(customerMilestoneCounts.valueRealized, customerMilestoneCounts.activated),
    },
    topFamilies,
    topSources: topBreakdown(leads.map((lead) => lead.source)),
    topNiches: topBreakdown(leads.map((lead) => lead.niche)),
    recentMilestoneEvents,
    leadTimeline,
    experimentPerformance,
  };
}
