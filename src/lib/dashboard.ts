import { summarizeMilestoneProgress } from "./automation.ts";
import { recommendDispatchProviders } from "./dispatch-routing.ts";
import { getDispatchSlaSnapshot } from "./dispatch-sla.ts";
import { isSystemCanonicalEvent, isSystemLeadRecord } from "./operator-view.ts";
import { buildLeadDisplayName, buildLeadSubline } from "./operator-ui.ts";
import type { CanonicalEvent } from "./trace.ts";
import type { OperationalRuntimeConfig } from "./runtime-config.ts";
import type {
  BookingJobRecord,
  ExecutionTaskRecord,
  ProviderDispatchRequestRecord,
  ProviderExecutionRecord,
  StoredLeadRecord,
  WorkflowRunRecord,
} from "./runtime-store.ts";
import type { PlumbingJobOutcome, PlumbingLeadContext, PlumbingUrgencyBand } from "./runtime-schema.ts";

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

function asPlumbingContext(lead: StoredLeadRecord) {
  const plumbing = lead.metadata.plumbing;
  return plumbing && typeof plumbing === "object" ? plumbing as PlumbingLeadContext : null;
}

function asPlumbingOutcome(lead: StoredLeadRecord) {
  const outcome = lead.metadata.plumbingOutcome;
  return outcome && typeof outcome === "object" ? outcome as PlumbingJobOutcome : null;
}

function buildDispatchAction(
  lead: StoredLeadRecord,
  plumbing: PlumbingLeadContext | null,
  sla?: { overdue: boolean; escalationReady: boolean },
) {
  if (!plumbing) {
    return lead.hot ? "Manual fast-path review" : "Standard review";
  }
  if (sla?.escalationReady) {
    return "Escalate to backup provider now";
  }
  if (sla?.overdue) {
    return "Response overdue - intervene now";
  }
  if (["booked", "converted", "active"].includes(lead.stage)) {
    return "Monitor completion";
  }
  switch (plumbing.dispatchMode) {
    case "dispatch-now":
      return "Call or assign emergency provider now";
    case "same-day-booking":
      return "Confirm same-day slot";
    case "commercial-intake":
      return "Route to commercial desk";
    case "triage":
      return "Open triage conversation";
    case "estimate-path":
    default:
      return "Book estimate or quote callback";
  }
}

function buildDispatchReadiness(lead: StoredLeadRecord, plumbing: PlumbingLeadContext | null) {
  let score = lead.hot ? 55 : 25;
  if (lead.phone) score += 10;
  if (plumbing?.urgencyBand === "emergency-now") score += 20;
  if (plumbing?.urgencyBand === "same-day") score += 12;
  if (plumbing?.propertyType === "commercial") score += 8;
  if (["booked", "converted", "active"].includes(lead.stage)) score -= 30;
  return Math.max(0, Math.min(100, score));
}

function buildQueueByUrgency(
  items: Array<{
    urgencyBand: PlumbingUrgencyBand;
  }>,
  urgencyBand: PlumbingUrgencyBand,
) {
  return items.filter((item) => item.urgencyBand === urgencyBand);
}

function formatPlumbingGeoCell(plumbing: PlumbingLeadContext | null) {
  if (!plumbing) {
    return "unlocated";
  }

  const cityState = [plumbing.geo.city, plumbing.geo.state].filter(Boolean).join(", ");
  if (cityState) {
    return cityState.toLowerCase();
  }

  const countyState = [plumbing.geo.county, plumbing.geo.state].filter(Boolean).join(", ");
  if (countyState) {
    return countyState.toLowerCase();
  }

  if (plumbing.geo.zip) {
    return `zip ${plumbing.geo.zip}`.toLowerCase();
  }

  return "unlocated";
}

function matchesZipCell(cell: string, zipPrefixes: string[]) {
  if (!cell.startsWith("zip ")) {
    return zipPrefixes.length === 0;
  }
  const zip = cell.slice(4);
  if (zipPrefixes.length === 0) {
    return true;
  }
  return zipPrefixes.some((prefix) => zip.startsWith(prefix));
}

function buildZipCellLiquiditySnapshot(
  plumbingLeads: Array<{ lead: StoredLeadRecord; plumbing: PlumbingLeadContext; outcome: PlumbingJobOutcome | null }>,
  dispatchProviders: OperationalRuntimeConfig["dispatch"]["providers"],
) {
  const candidateCells = new Set<string>();
  for (const item of plumbingLeads) {
    candidateCells.add(formatPlumbingGeoCell(item.plumbing));
  }
  for (const provider of dispatchProviders) {
    for (const zipPrefix of provider.zipPrefixes) {
      candidateCells.add(`zip ${zipPrefix}`);
    }
  }

  const cells = [...candidateCells]
    .filter((cell) => cell !== "unlocated")
    .map((cell) => {
      const leadItems = plumbingLeads.filter((item) => formatPlumbingGeoCell(item.plumbing) === cell);
      const matchingProviders = dispatchProviders.filter((provider) => matchesZipCell(cell, provider.zipPrefixes));
      const activeProviders = matchingProviders.filter((provider) => provider.active);
      const acceptingProviders = activeProviders.filter((provider) => provider.acceptingNewJobs !== false);
      const knownOpenCapacity = acceptingProviders.reduce((sum, provider) => {
        if (typeof provider.maxConcurrentJobs !== "number") {
          return sum;
        }
        return sum + Math.max(0, provider.maxConcurrentJobs - (provider.activeJobs ?? 0));
      }, 0);
      const urgentLeadCount = leadItems.filter((item) => item.plumbing.urgencyBand === "emergency-now").length;
      const sameDayLeadCount = leadItems.filter((item) => item.plumbing.urgencyBand === "same-day").length;
      const completedRevenue = leadItems.reduce((sum, item) => (
        item.outcome?.status === "completed" && typeof item.outcome.revenueValue === "number"
          ? sum + item.outcome.revenueValue
          : sum
      ), 0);
      const demandPressure = urgentLeadCount * 2 + sameDayLeadCount + leadItems.length;
      const supplyPressure = acceptingProviders.length * 20 + knownOpenCapacity * 8;
      const liquidityScore = Math.max(0, Math.min(100, Math.round((supplyPressure / Math.max(demandPressure, 1)) * 20)));
      const recommendedAction =
        acceptingProviders.length === 0
          ? "Recruit or reactivate providers in this ZIP cell"
          : knownOpenCapacity < urgentLeadCount
            ? "Add backup emergency coverage before scaling local demand"
            : leadItems.length === 0 && acceptingProviders.length > 0
              ? "Route more local traffic into this ready ZIP cell"
              : liquidityScore < 45
                ? "Increase supply before increasing acquisition"
                : "Healthy balance between demand and provider capacity";

      return {
        label: cell,
        leadCount: leadItems.length,
        urgentLeadCount,
        sameDayLeadCount,
        completedRevenue,
        providersCovering: matchingProviders.length,
        acceptingProviders: acceptingProviders.length,
        openCapacity: knownOpenCapacity,
        liquidityScore,
        recommendedAction,
      };
    })
    .sort((left, right) => {
      if (left.liquidityScore !== right.liquidityScore) {
        return left.liquidityScore - right.liquidityScore;
      }
      return right.leadCount - left.leadCount;
    });

  return {
    topCells: cells.slice(0, 8),
    constrainedCells: cells.filter((cell) => cell.liquidityScore < 45).slice(0, 5),
    expansionCells: cells.filter((cell) => cell.liquidityScore >= 70 && cell.acceptingProviders > 0).slice(0, 5),
  };
}

function buildPlumbingDispatchSnapshot(
  leads: StoredLeadRecord[],
  bookingJobs: BookingJobRecord[],
  executionTasks: ExecutionTaskRecord[],
  providerDispatchRequests: ProviderDispatchRequestRecord[],
  providerExecutions: ProviderExecutionRecord[],
  workflowRuns: WorkflowRunRecord[],
  dispatchProviders: OperationalRuntimeConfig["dispatch"]["providers"] = [],
) {
  const plumbingLeads = leads
    .map((lead) => ({ lead, plumbing: asPlumbingContext(lead), outcome: asPlumbingOutcome(lead) }))
    .filter((item) => item.plumbing);

  const queueItems = plumbingLeads
    .map(({ lead, plumbing, outcome }) => {
      const sla = getDispatchSlaSnapshot({
        updatedAt: lead.updatedAt,
        stage: lead.stage,
        plumbing: plumbing!,
        outcome,
      });
      const recommendedProviders = recommendDispatchProviders(plumbing!, dispatchProviders);
      return {
        leadKey: lead.leadKey,
        stage: lead.stage,
        hot: lead.hot,
        score: lead.score,
        updatedAt: lead.updatedAt,
        urgencyBand: plumbing!.urgencyBand,
        issueType: plumbing!.issueType,
        dispatchMode: plumbing!.dispatchMode,
        propertyType: plumbing!.propertyType,
        readinessScore: buildDispatchReadiness(lead, plumbing),
        operatorAction: buildDispatchAction(lead, plumbing, sla),
        routingReasons: plumbing!.routingReasons,
        outcomeStatus: outcome?.status ?? null,
        dueAt: sla.dueAt,
        escalationAt: sla.escalationAt,
        overdue: sla.overdue,
        escalationReady: sla.escalationReady,
        minutesPastDue: sla.minutesPastDue,
        recommendedProviders,
      };
    })
    .sort((left, right) => {
      if (left.escalationReady !== right.escalationReady) {
        return left.escalationReady ? -1 : 1;
      }
      if (left.overdue !== right.overdue) {
        return left.overdue ? -1 : 1;
      }
      if (right.readinessScore !== left.readinessScore) {
        return right.readinessScore - left.readinessScore;
      }
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });

  const unresolved = queueItems.filter((item) => !["booked", "converted", "active"].includes(item.stage));
  const pendingExecutionTasks = executionTasks.filter((task) => task.status === "pending");
  const failedExecutionTasks = executionTasks.filter((task) => task.status === "failed");
  const pendingProviderRequests = providerDispatchRequests.filter((request) => request.status === "pending");
  const metroBreakdown = topBreakdown(plumbingLeads.map((item) => formatPlumbingGeoCell(item.plumbing)));
  const metroRevenueBreakdown = Object.entries(
    plumbingLeads.reduce<Record<string, number>>((acc, item) => {
      if (!item.outcome || item.outcome.status !== "completed" || typeof item.outcome.revenueValue !== "number") {
        return acc;
      }
      const cell = formatPlumbingGeoCell(item.plumbing);
      acc[cell] = (acc[cell] ?? 0) + item.outcome.revenueValue;
      return acc;
    }, {}),
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([label, revenue]) => ({ label, revenue }));

  const providerScores = Object.entries(
    providerExecutions.reduce<Record<string, {
      provider: string;
      attempts: number;
      ok: number;
      live: number;
    }>>((acc, execution) => {
      const entry = acc[execution.provider] ?? {
        provider: execution.provider,
        attempts: 0,
        ok: 0,
        live: 0,
      };
      entry.attempts += 1;
      entry.ok += execution.ok ? 1 : 0;
      entry.live += execution.mode === "live" ? 1 : 0;
      acc[execution.provider] = entry;
      return acc;
    }, {}),
  )
    .map(([, entry]) => {
      const providerBookingJobs = bookingJobs.filter((job) => job.provider === entry.provider);
      const bookedJobs = providerBookingJobs.filter((job) => ["booked", "availability-found", "handoff-ready"].includes(job.status)).length;
      const workflowFailures = workflowRuns.filter((run) => run.provider === entry.provider && !run.ok).length;
      const providerOutcomes = plumbingLeads
        .map((item) => item.outcome)
        .filter((outcome): outcome is PlumbingJobOutcome => Boolean(outcome) && outcome?.provider === entry.provider);
      const completedOutcomes = providerOutcomes.filter((outcome) => outcome.status === "completed").length;
      const bookedOutcomes = providerOutcomes.filter((outcome) => outcome.status === "booked").length;
      const completedRevenue = providerOutcomes.reduce((sum, outcome) => (
        outcome.status === "completed" && typeof outcome.revenueValue === "number"
          ? sum + outcome.revenueValue
          : sum
      ), 0);
      const averageCompletedRevenue = completedOutcomes > 0
        ? Number((completedRevenue / completedOutcomes).toFixed(2))
        : 0;
      const reliabilityScore = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ratio(entry.ok, entry.attempts) * 0.55 +
            ratio(entry.live, entry.attempts) * 0.2 +
            ratio(bookedJobs, Math.max(providerBookingJobs.length, 1)) * 0.15 +
            ratio(bookedOutcomes + completedOutcomes, Math.max(providerOutcomes.length, 1)) * 0.1 -
            workflowFailures * 4,
          ),
        ),
      );

      return {
        provider: entry.provider,
        attempts: entry.attempts,
        reliabilityScore,
        successRate: ratio(entry.ok, entry.attempts),
        bookingFillRate: ratio(bookedJobs, Math.max(providerBookingJobs.length, 1)),
        completionRate: ratio(completedOutcomes, Math.max(providerOutcomes.length, 1)),
        workflowFailures,
        bookingJobs: providerBookingJobs.length,
        bookedOutcomes,
        completedOutcomes,
        completedRevenue,
        averageCompletedRevenue,
      };
    });

  const maxCompletedRevenue = Math.max(
    1,
    ...providerScores.map((provider) => provider.completedRevenue),
  );

  const rankedProviderScores = providerScores
    .map((provider) => {
      const revenueScore = provider.completedRevenue <= 0
        ? 0
        : Math.round((provider.completedRevenue / maxCompletedRevenue) * 100);
      const routingScore = Math.max(
        0,
        Math.min(
          100,
          Math.round(provider.reliabilityScore * 0.72 + revenueScore * 0.28),
        ),
      );

      return {
        ...provider,
        revenueScore,
        routingScore,
      };
    })
    .sort((left, right) => right.routingScore - left.routingScore);
  const zipCellLiquidity = buildZipCellLiquiditySnapshot(
    plumbingLeads as Array<{ lead: StoredLeadRecord; plumbing: PlumbingLeadContext; outcome: PlumbingJobOutcome | null }>,
    dispatchProviders,
  );

  return {
    totalPlumbingLeads: plumbingLeads.length,
    unresolvedCount: unresolved.length,
    emergencyQueue: buildQueueByUrgency(unresolved, "emergency-now").slice(0, 5),
    sameDayQueue: buildQueueByUrgency(unresolved, "same-day").slice(0, 5),
    estimateQueue: buildQueueByUrgency(unresolved, "estimate").slice(0, 5),
    commercialQueue: buildQueueByUrgency(unresolved, "commercial").slice(0, 5),
    maintenanceQueue: buildQueueByUrgency(unresolved, "maintenance").slice(0, 5),
    urgencyBreakdown: topBreakdown(queueItems.map((item) => item.urgencyBand)),
    issueBreakdown: topBreakdown(queueItems.map((item) => item.issueType)),
    dispatchModeBreakdown: topBreakdown(queueItems.map((item) => item.dispatchMode)),
    metroBreakdown,
    metroRevenueBreakdown,
    zipCellLiquidity,
    topQueue: unresolved.slice(0, 8),
    providerScores: rankedProviderScores,
    configuredDispatchProviders: dispatchProviders.length,
    providerRequestQueue: {
      pendingCount: pendingProviderRequests.length,
      acceptedCount: providerDispatchRequests.filter((request) => request.status === "accepted").length,
      declinedCount: providerDispatchRequests.filter((request) => request.status === "declined").length,
      topPending: pendingProviderRequests.slice(0, 6),
    },
    executionQueue: {
      pendingCount: pendingExecutionTasks.length,
      failedCount: failedExecutionTasks.length,
      pendingByKind: topBreakdown(pendingExecutionTasks.map((task) => task.kind)),
      topPending: pendingExecutionTasks.slice(0, 6),
    },
  };
}

export function buildDashboardSnapshot(leads: StoredLeadRecord[], events: CanonicalEvent[]) {
  return buildDashboardSnapshotWithOptions(leads, events, {});
}

export function buildDashboardSnapshotWithOptions(
  leads: StoredLeadRecord[],
  events: CanonicalEvent[],
  options: { includeSystemTraffic?: boolean },
) {
  const visibleLeads = options.includeSystemTraffic
    ? leads
    : leads.filter((lead) => !isSystemLeadRecord(lead));
  const visibleEvents = options.includeSystemTraffic
    ? events
    : events.filter((event) => !isSystemCanonicalEvent(event));
  const leadLookup = new Map(visibleLeads.map((lead) => [lead.leadKey, lead]));

  const leadMilestoneCounts = {
    captured: visibleLeads.filter((lead) => lead.milestones.leadMilestones.includes("lead-m1-captured")).length,
    returnEngaged: visibleLeads.filter((lead) => lead.milestones.leadMilestones.includes("lead-m2-return-engaged")).length,
    bookedOrOffered: visibleLeads.filter((lead) => lead.milestones.leadMilestones.includes("lead-m3-booked-or-offered")).length,
  };

  const customerMilestoneCounts = {
    onboarded: visibleLeads.filter((lead) => lead.milestones.customerMilestones.includes("customer-m1-onboarded")).length,
    activated: visibleLeads.filter((lead) => lead.milestones.customerMilestones.includes("customer-m2-activated")).length,
    valueRealized: visibleLeads.filter((lead) => lead.milestones.customerMilestones.includes("customer-m3-value-realized")).length,
  };

  const topFamilies = Object.entries(countBy(visibleLeads.map((lead) => lead.family)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([family, count]) => ({ family, count }));

  const recentMilestoneEvents = visibleEvents
    .filter((event) => event.eventType === "lead_milestone_reached" || event.eventType === "customer_milestone_reached")
    .slice(-10)
    .reverse()
    .map((event) => {
      const lead = leadLookup.get(event.leadKey);
      return {
        id: event.id,
        timestamp: event.timestamp,
        leadKey: event.leadKey,
        displayName: lead ? buildLeadDisplayName(lead) : event.leadKey,
        displaySubline: lead ? buildLeadSubline(lead) : "",
        type: event.eventType,
        milestoneId: String(event.metadata.milestoneId ?? ""),
        visitCount: Number(event.metadata.visitCount ?? 0),
        stage: String(event.metadata.stage ?? ""),
      };
    });

  const leadTimeline = visibleLeads
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10)
    .map((lead) => {
      const progress = summarizeMilestoneProgress(lead);
      return {
        leadKey: lead.leadKey,
        displayName: buildLeadDisplayName(lead),
        displaySubline: buildLeadSubline(lead),
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
    visibleLeads.reduce<Record<string, {
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
      leads: visibleLeads.length,
      events: visibleEvents.length,
      hotLeads: visibleLeads.filter((lead) => lead.hot).length,
    },
    allTotals: {
      leads: leads.length,
      events: events.length,
      hotLeads: leads.filter((lead) => lead.hot).length,
    },
    systemTraffic: {
      included: options.includeSystemTraffic === true,
      hiddenLeads: Math.max(0, leads.length - visibleLeads.length),
      hiddenEvents: Math.max(0, events.length - visibleEvents.length),
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
    topSources: topBreakdown(visibleLeads.map((lead) => lead.source)),
    topNiches: topBreakdown(visibleLeads.map((lead) => lead.niche)),
    recentMilestoneEvents,
    leadTimeline,
    experimentPerformance,
  };
}

export function buildOperatorConsoleSnapshot(
  leads: StoredLeadRecord[],
  events: CanonicalEvent[],
  bookingJobs: BookingJobRecord[],
  executionTasks: ExecutionTaskRecord[],
  providerDispatchRequests: ProviderDispatchRequestRecord[],
  providerExecutions: ProviderExecutionRecord[],
  workflowRuns: WorkflowRunRecord[],
  dispatchProviders: OperationalRuntimeConfig["dispatch"]["providers"] = [],
  options: { includeSystemTraffic?: boolean },
) {
  const base = buildDashboardSnapshotWithOptions(leads, events, options);
  const visibleLeads = options.includeSystemTraffic
    ? leads
    : leads.filter((lead) => !isSystemLeadRecord(lead));

  return {
    ...base,
    plumbingDispatch: buildPlumbingDispatchSnapshot(
      visibleLeads,
      bookingJobs,
      executionTasks,
      providerDispatchRequests,
      providerExecutions,
      workflowRuns,
      dispatchProviders,
    ),
  };
}
