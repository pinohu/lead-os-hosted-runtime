import type { FunnelFamily } from "./runtime-schema.ts";
import type { StoredLeadRecord } from "./runtime-store.ts";

export interface AutomationRecipe {
  family: FunnelFamily;
  summary: string;
  trigger: string;
  actions: string[];
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
      "Start day 2, 5, 10, 14, 21, 30 nurture cadence",
      "Escalate hot leads to booking",
    ],
  },
  qualification: {
    family: "qualification",
    summary: "Score the lead and branch to booking or nurture immediately.",
    trigger: "Assessment or application completed",
    actions: [
      "Calculate readiness score",
      "Assign owner for hot leads",
      "Send consult invite or educational follow-up",
    ],
  },
  chat: {
    family: "chat",
    summary: "Capture transcript, classify objections, and route to the best next step.",
    trigger: "Chat identity captured",
    actions: [
      "Summarize conversation",
      "Classify objection and persona",
      "Route to assessment, webinar, booking, or direct offer",
    ],
  },
  webinar: {
    family: "webinar",
    summary: "Confirm, remind, branch attended vs missed, then replay and offer recovery.",
    trigger: "Webinar registration",
    actions: [
      "Send confirmation and reminders",
      "Track attendance",
      "Send replay or pitch follow-up",
    ],
  },
  authority: {
    family: "authority",
    summary: "Warm skeptical visitors with proof, then route to consult or offer.",
    trigger: "Content or documentary engagement",
    actions: [
      "Score content engagement",
      "Classify objection",
      "Route to consult, webinar, or offer",
    ],
  },
  checkout: {
    family: "checkout",
    summary: "Push toward purchase, then recover abandonments on 1h, 24h, and 48h intervals.",
    trigger: "Checkout started",
    actions: [
      "Track checkout start and completion",
      "Trigger onboarding on success",
      "Run abandonment recovery sequence on failure",
    ],
  },
  retention: {
    family: "retention",
    summary: "Welcome new customers, activate them quickly, and invite referral or continuity.",
    trigger: "Conversion completed",
    actions: [
      "Send welcome and portal invite",
      "Drive checklist and kickoff",
      "Detect activation and invite referrals",
    ],
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
  },
  referral: {
    family: "referral",
    summary: "Invite, remind, reward, and attribute referred leads back to their source.",
    trigger: "Happy customer or referral campaign start",
    actions: [
      "Send referral invite",
      "Track milestones",
      "Write attribution back to lead record",
    ],
  },
  continuity: {
    family: "continuity",
    summary: "Onboard, activate, monitor renewal risk, and expand into continuity revenue.",
    trigger: "Membership or subscription start",
    actions: [
      "Welcome and activate the member",
      "Monitor renewal and churn risk",
      "Promote continuity and retention offers",
    ],
  },
};

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
