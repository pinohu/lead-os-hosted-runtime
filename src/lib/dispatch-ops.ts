import type {
  CustomerMilestoneId,
  LeadMilestoneId,
  PlumbingJobOutcome,
  PlumbingLeadContext,
  PlumbingOperatorActionType,
} from "./runtime-schema.ts";
import { createCanonicalEvent } from "./trace.ts";
import {
  appendEvents,
  getBookingJobs,
  getLeadRecord,
  recordOperatorAction,
  upsertBookingJob,
  upsertLeadRecord,
  type StoredLeadRecord,
} from "./runtime-store.ts";

type ApplyPlumbingDispatchActionInput = {
  leadKey: string;
  actionType: PlumbingOperatorActionType;
  actorEmail: string;
  note?: string;
  revenueValue?: number;
  marginValue?: number;
  complaintStatus?: "none" | "minor" | "major";
  reviewStatus?: "not-requested" | "requested" | "positive" | "mixed" | "negative";
  reviewRating?: number;
  refundIssued?: boolean;
};

type ActionMutation = {
  stage: StoredLeadRecord["stage"];
  status: string;
  hot: boolean;
  detail: string;
  outcome: PlumbingJobOutcome;
  bookingStatus?: string;
  leadMilestones?: LeadMilestoneId[];
  customerMilestones?: CustomerMilestoneId[];
};

function asPlumbingContext(lead: StoredLeadRecord) {
  const value = lead.metadata.plumbing;
  return value && typeof value === "object" ? value as PlumbingLeadContext : null;
}

function ensureLeadMilestone(record: StoredLeadRecord, milestoneId: LeadMilestoneId) {
  if (record.milestones.leadMilestones.includes(milestoneId)) {
    return false;
  }
  record.milestones.leadMilestones = [...record.milestones.leadMilestones, milestoneId];
  return true;
}

function ensureCustomerMilestone(record: StoredLeadRecord, milestoneId: CustomerMilestoneId) {
  if (record.milestones.customerMilestones.includes(milestoneId)) {
    return false;
  }
  record.milestones.customerMilestones = [...record.milestones.customerMilestones, milestoneId];
  return true;
}

function buildActionMutation(
  actionType: PlumbingOperatorActionType,
  actorEmail: string,
  note: string | undefined,
  provider: string | undefined,
  revenueValue: number | undefined,
  marginValue: number | undefined,
  complaintStatus: "none" | "minor" | "major" | undefined,
  reviewStatus: "not-requested" | "requested" | "positive" | "mixed" | "negative" | undefined,
  reviewRating: number | undefined,
  refundIssued: boolean | undefined,
): ActionMutation {
  const recordedAt = new Date().toISOString();
  const derivedMarginBand =
    typeof marginValue !== "number"
      ? undefined
      : marginValue < 0
        ? "negative"
        : marginValue < 150
          ? "thin"
          : marginValue < 500
            ? "healthy"
            : "exceptional";
  const normalizedComplaintStatus = complaintStatus ?? "none";
  const normalizedReviewStatus = reviewStatus ?? "not-requested";
  const normalizedRefundIssued = refundIssued ?? false;

  switch (actionType) {
    case "dispatch-now":
      return {
        stage: "qualified",
        status: "OPERATOR-DISPATCHED",
        hot: true,
        detail: "Operator escalated this lead into live dispatch.",
        outcome: {
          status: "dispatch-requested",
          actorEmail,
          recordedAt,
          note,
          provider,
          revenueValue,
          marginValue,
          marginBand: derivedMarginBand,
          complaintStatus: normalizedComplaintStatus,
          reviewStatus: normalizedReviewStatus,
          reviewRating,
          refundIssued: normalizedRefundIssued,
        },
      };
    case "assign-backup-provider":
      return {
        stage: "qualified",
        status: "BACKUP-PROVIDER-REQUESTED",
        hot: true,
        detail: "Operator requested backup provider routing.",
        outcome: {
          status: "backup-provider-requested",
          actorEmail,
          recordedAt,
          note,
          provider,
          revenueValue,
          marginValue,
          marginBand: derivedMarginBand,
          complaintStatus: normalizedComplaintStatus,
          reviewStatus: normalizedReviewStatus,
          reviewRating,
          refundIssued: normalizedRefundIssued,
        },
      };
    case "retry-booking":
      return {
        stage: "qualified",
        status: "BOOKING-RETRY-REQUESTED",
        hot: true,
        detail: "Operator requested a new booking attempt.",
        bookingStatus: "retry-requested",
        outcome: {
          status: "booking-retry-requested",
          actorEmail,
          recordedAt,
          note,
          provider,
          revenueValue,
          marginValue,
          marginBand: derivedMarginBand,
          complaintStatus: normalizedComplaintStatus,
          reviewStatus: normalizedReviewStatus,
          reviewRating,
          refundIssued: normalizedRefundIssued,
        },
      };
    case "mark-booked":
      return {
        stage: "booked",
        status: "LEAD-BOOKED",
        hot: false,
        detail: "Operator confirmed this plumbing lead as booked.",
        bookingStatus: "booked",
        leadMilestones: ["lead-m2-return-engaged", "lead-m3-booked-or-offered"],
        outcome: {
          status: "booked",
          actorEmail,
          recordedAt,
          note,
          provider,
          revenueValue,
          marginValue,
          marginBand: derivedMarginBand,
          complaintStatus: normalizedComplaintStatus,
          reviewStatus: normalizedReviewStatus,
          reviewRating,
          refundIssued: normalizedRefundIssued,
        },
      };
    case "mark-completed":
      return {
        stage: "active",
        status: "JOB-COMPLETED",
        hot: false,
        detail: "Operator recorded this plumbing job as completed.",
        leadMilestones: ["lead-m2-return-engaged", "lead-m3-booked-or-offered"],
        customerMilestones: ["customer-m1-onboarded", "customer-m2-activated", "customer-m3-value-realized"],
        outcome: {
          status: "completed",
          actorEmail,
          recordedAt,
          note,
          provider,
          revenueValue,
          marginValue,
          marginBand: derivedMarginBand,
          complaintStatus: normalizedComplaintStatus,
          reviewStatus: normalizedReviewStatus,
          reviewRating,
          refundIssued: normalizedRefundIssued,
        },
      };
    case "mark-lost":
    default:
      return {
        stage: "churned",
        status: "LEAD-LOST",
        hot: false,
        detail: "Operator marked this plumbing lead as lost.",
        outcome: {
          status: "lost",
          actorEmail,
          recordedAt,
          note,
          provider,
          revenueValue,
          marginValue,
          marginBand: derivedMarginBand,
          complaintStatus: normalizedComplaintStatus,
          reviewStatus: normalizedReviewStatus,
          reviewRating,
          refundIssued: normalizedRefundIssued,
        },
      };
  }
}

export async function applyPlumbingDispatchAction({
  leadKey,
  actionType,
  actorEmail,
  note,
  revenueValue,
  marginValue,
  complaintStatus,
  reviewStatus,
  reviewRating,
  refundIssued,
}: ApplyPlumbingDispatchActionInput) {
  const lead = await getLeadRecord(leadKey);
  if (!lead) {
    throw new Error("Lead not found");
  }

  const plumbing = asPlumbingContext(lead);
  if (!plumbing) {
    throw new Error("Lead is not classified for PlumbingOS dispatch");
  }

  const bookingJobs = await getBookingJobs(leadKey);
  const currentProvider = bookingJobs[0]?.provider;
  const mutation = buildActionMutation(
    actionType,
    actorEmail,
    note,
    currentProvider,
    revenueValue,
    marginValue,
    complaintStatus,
    reviewStatus,
    reviewRating,
    refundIssued,
  );
  const now = mutation.outcome.recordedAt;
  const addedLeadMilestones: LeadMilestoneId[] = [];
  const addedCustomerMilestones: CustomerMilestoneId[] = [];

  lead.stage = mutation.stage;
  lead.status = mutation.status;
  lead.hot = mutation.hot;
  lead.updatedAt = now;
  lead.metadata.plumbingOutcome = mutation.outcome;
  lead.metadata.operatorDispatch = {
    lastActionType: actionType,
    lastActionAt: now,
    lastActorEmail: actorEmail,
    note,
  };

  for (const milestoneId of mutation.leadMilestones ?? []) {
    if (ensureLeadMilestone(lead, milestoneId)) {
      addedLeadMilestones.push(milestoneId);
    }
  }
  for (const milestoneId of mutation.customerMilestones ?? []) {
    if (ensureCustomerMilestone(lead, milestoneId)) {
      addedCustomerMilestones.push(milestoneId);
    }
  }

  await upsertLeadRecord(lead);

  if (mutation.bookingStatus) {
    await upsertBookingJob({
      id: bookingJobs[0]?.id,
      leadKey,
      provider: currentProvider ?? "Trafft",
      status: mutation.bookingStatus,
      detail: note?.trim() || mutation.detail,
      payload: {
        actionType,
        actorEmail,
        outcomeStatus: mutation.outcome.status,
        revenueValue,
        marginValue,
        complaintStatus: mutation.outcome.complaintStatus,
        reviewStatus: mutation.outcome.reviewStatus,
        reviewRating,
        refundIssued: mutation.outcome.refundIssued,
      },
    });
  }

  const operatorAction = await recordOperatorAction({
    leadKey,
    actionType,
    actorEmail,
    detail: mutation.detail,
    payload: {
      note,
      provider: currentProvider,
      revenueValue,
      marginValue,
      complaintStatus: mutation.outcome.complaintStatus,
      reviewStatus: mutation.outcome.reviewStatus,
      reviewRating,
      refundIssued: mutation.outcome.refundIssued,
      outcomeStatus: mutation.outcome.status,
    },
  });

  const events = [
    createCanonicalEvent(lead.trace, "operator_dispatch_action", "internal", "RECORDED", {
      actionType,
      actorEmail,
      note,
      provider: currentProvider,
      revenueValue,
      marginValue,
      marginBand: mutation.outcome.marginBand,
      complaintStatus: mutation.outcome.complaintStatus,
      reviewStatus: mutation.outcome.reviewStatus,
      reviewRating,
      refundIssued: mutation.outcome.refundIssued,
    }),
    createCanonicalEvent(lead.trace, "plumbing_job_outcome_recorded", "internal", "RECORDED", {
      outcomeStatus: mutation.outcome.status,
      actorEmail,
      note,
      provider: currentProvider,
      revenueValue,
      marginValue,
      marginBand: mutation.outcome.marginBand,
      complaintStatus: mutation.outcome.complaintStatus,
      reviewStatus: mutation.outcome.reviewStatus,
      reviewRating,
      refundIssued: mutation.outcome.refundIssued,
    }),
    ...addedLeadMilestones.map((milestoneId) =>
      createCanonicalEvent(lead.trace, "lead_milestone_reached", "internal", "MILESTONE", {
        milestoneId,
        visitCount: lead.milestones.visitCount,
        stage: lead.stage,
      })
    ),
    ...addedCustomerMilestones.map((milestoneId) =>
      createCanonicalEvent(lead.trace, "customer_milestone_reached", "internal", "MILESTONE", {
        milestoneId,
        visitCount: lead.milestones.visitCount,
        stage: lead.stage,
      })
    ),
  ];
  await appendEvents(events);

  return {
    lead,
    action: operatorAction,
    outcome: mutation.outcome,
    addedLeadMilestones,
    addedCustomerMilestones,
  };
}
