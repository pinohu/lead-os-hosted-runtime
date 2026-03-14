import {
  CUSTOMER_MILESTONES,
  LEAD_MILESTONES,
} from "./runtime-schema.ts";
import type {
  CustomerMilestoneId,
  FunnelFamily,
  LeadMilestoneId,
} from "./runtime-schema.ts";
import type { StoredLeadRecord } from "./runtime-store.ts";

export interface AutomationRecipe {
  family: FunnelFamily;
  summary: string;
  trigger: string;
  actions: string[];
  milestoneStrategy: {
    lead: LeadMilestoneId[];
    customer: CustomerMilestoneId[];
  };
}

export interface NurtureStage {
  id: string;
  day: number;
  label: string;
  channels: Array<"email" | "whatsapp" | "sms">;
}

export const NURTURE_SEQUENCE: NurtureStage[] = [
  { id: "day-0", day: 0, label: "Immediate Value Delivery", channels: ["email"] },
  { id: "day-2", day: 2, label: "Quick Win", channels: ["email"] },
  { id: "day-5", day: 5, label: "Proof and Positioning", channels: ["email", "whatsapp"] },
  { id: "day-10", day: 10, label: "Authority Follow-Up", channels: ["email"] },
  { id: "day-14", day: 14, label: "Consultation Offer", channels: ["email", "sms"] },
  { id: "day-21", day: 21, label: "Reactivation", channels: ["email"] },
  { id: "day-30", day: 30, label: "Long-Term Nurture", channels: ["email"] },
];

export const AUTOMATION_RECIPES: Record<FunnelFamily, AutomationRecipe> = {
  "lead-magnet": {
    family: "lead-magnet",
    summary: "Deliver the promised asset immediately, then nurture into consultation or offer.",
    trigger: "Opt-in submitted",
    actions: [
      "Send immediate value delivery",
      "Engineer a second return action before the direct ask",
      "Start day 2, 5, 10, 14, 21, 30 nurture cadence",
      "Escalate hot leads to booking once the third milestone is in reach",
    ],
    milestoneStrategy: {
      lead: ["lead-m1-captured", "lead-m2-return-engaged", "lead-m3-booked-or-offered"],
      customer: [],
    },
  },
  qualification: {
    family: "qualification",
    summary: "Score the lead and branch to booking or nurture immediately.",
    trigger: "Assessment or application completed",
    actions: [
      "Calculate readiness score",
      "Create a second trust event with personalized follow-up",
      "Assign owner for hot leads",
      "Send consult invite or educational follow-up tied to milestone three",
    ],
    milestoneStrategy: {
      lead: ["lead-m1-captured", "lead-m2-return-engaged", "lead-m3-booked-or-offered"],
      customer: [],
    },
  },
  chat: {
    family: "chat",
    summary: "Capture transcript, classify objections, and route to the best next step.",
    trigger: "Chat identity captured",
    actions: [
      "Summarize conversation",
      "Classify objection and persona",
      "Route to assessment, webinar, booking, or direct offer based on the next milestone",
    ],
    milestoneStrategy: {
      lead: ["lead-m1-captured", "lead-m2-return-engaged", "lead-m3-booked-or-offered"],
      customer: [],
    },
  },
  webinar: {
    family: "webinar",
    summary: "Confirm, remind, branch attended vs missed, then replay and offer recovery.",
    trigger: "Webinar registration",
    actions: [
      "Send confirmation and reminders",
      "Track attendance as the second trust event",
      "Send replay or pitch follow-up to push milestone three",
    ],
    milestoneStrategy: {
      lead: ["lead-m1-captured", "lead-m2-return-engaged", "lead-m3-booked-or-offered"],
      customer: [],
    },
  },
  authority: {
    family: "authority",
    summary: "Warm skeptical visitors with proof, then route to consult or offer.",
    trigger: "Content or documentary engagement",
    actions: [
      "Score content engagement and repeat consumption",
      "Classify objection",
      "Route to consult, webinar, or offer when the third milestone is primed",
    ],
    milestoneStrategy: {
      lead: ["lead-m1-captured", "lead-m2-return-engaged", "lead-m3-booked-or-offered"],
      customer: [],
    },
  },
  checkout: {
    family: "checkout",
    summary: "Push toward purchase, then recover abandonments on 1h, 24h, and 48h intervals.",
    trigger: "Checkout started",
    actions: [
      "Track checkout start as the high-intent third milestone signal",
      "Trigger onboarding on success",
      "Run abandonment recovery sequence on failure",
    ],
    milestoneStrategy: {
      lead: ["lead-m1-captured", "lead-m2-return-engaged", "lead-m3-booked-or-offered"],
      customer: ["customer-m1-onboarded"],
    },
  },
  retention: {
    family: "retention",
    summary: "Welcome new customers, activate them quickly, and invite referral or continuity.",
    trigger: "Conversion completed",
    actions: [
      "Send welcome and portal invite",
      "Drive checklist and kickoff toward activation milestone two",
      "Detect value realization and invite referrals after milestone three",
    ],
    milestoneStrategy: {
      lead: [],
      customer: ["customer-m1-onboarded", "customer-m2-activated", "customer-m3-value-realized"],
    },
  },
  rescue: {
    family: "rescue",
    summary: "React immediately to refund, churn, cart, and no-show risk.",
    trigger: "Refund request or rescue trigger",
    actions: [
      "Classify objection",
      "Send save-path response",
      "Alert owner and branch to retain or churn",
    ],
    milestoneStrategy: {
      lead: [],
      customer: ["customer-m1-onboarded", "customer-m2-activated", "customer-m3-value-realized"],
    },
  },
  referral: {
    family: "referral",
    summary: "Invite, remind, reward, and attribute referred leads back to their source.",
    trigger: "Happy customer or referral campaign start",
    actions: [
      "Send referral invite",
      "Track milestone completion before asking for shares",
      "Write attribution back to lead record",
    ],
    milestoneStrategy: {
      lead: [],
      customer: ["customer-m2-activated", "customer-m3-value-realized"],
    },
  },
  continuity: {
    family: "continuity",
    summary: "Onboard, activate, monitor renewal risk, and expand into continuity revenue.",
    trigger: "Membership or subscription start",
    actions: [
      "Welcome and activate the member",
      "Monitor renewal and churn risk across milestones two and three",
      "Promote continuity and retention offers after value is realized",
    ],
    milestoneStrategy: {
      lead: [],
      customer: ["customer-m1-onboarded", "customer-m2-activated", "customer-m3-value-realized"],
    },
  },
};

export const THREE_VISIT_FRAMEWORK = {
  principle:
    "LeadOS should optimize for the third meaningful interaction, not just the first conversion event.",
  lead: LEAD_MILESTONES,
  customer: CUSTOMER_MILESTONES,
} as const;

export function getRecipeForFamily(family: FunnelFamily) {
  return AUTOMATION_RECIPES[family];
}

export function buildImmediateFollowupPlan(lead: {
  hot: boolean;
  email?: string;
  phone?: string;
  family: FunnelFamily;
}) {
  return {
    sendEmail: Boolean(lead.email),
    sendWhatsApp: Boolean(lead.phone),
    sendSms: Boolean(lead.phone && (lead.hot || lead.family === "webinar" || lead.family === "qualification")),
    alertOps: lead.hot,
  };
}

export function resolveNextNurtureStage(lead: StoredLeadRecord, now = new Date()) {
  const ageMs = now.getTime() - new Date(lead.createdAt).getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  return NURTURE_SEQUENCE.find((stage) =>
    stage.day > 0 &&
    ageDays >= stage.day &&
    !lead.sentNurtureStages.includes(stage.id),
  );
}

export function summarizeMilestoneProgress(lead: StoredLeadRecord) {
  return {
    visitCount: lead.milestones.visitCount,
    leadCompleted: lead.milestones.leadMilestones,
    customerCompleted: lead.milestones.customerMilestones,
    nextLeadMilestone:
      LEAD_MILESTONES.find((milestone) => !lead.milestones.leadMilestones.includes(milestone.id)) ?? null,
    nextCustomerMilestone:
      CUSTOMER_MILESTONES.find((milestone) => !lead.milestones.customerMilestones.includes(milestone.id)) ?? null,
  };
}
