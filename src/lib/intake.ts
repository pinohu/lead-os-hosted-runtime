import { buildImmediateFollowupPlan } from "./automation.ts";
import { decideNextStep } from "./orchestrator.ts";
import {
  emitWorkflowAction,
  logEventsToLedger,
  sendAlertAction,
  sendEmailAction,
  sendSmsAction,
  sendWhatsAppAction,
  syncLeadToCrm,
} from "./providers.ts";
import type { LeadStage } from "./runtime-schema.ts";
import {
  appendEvents,
  getLeadRecord,
  markNurtureStageSent,
  upsertLeadRecord,
} from "./runtime-store.ts";
import {
  buildLeadKey,
  createCanonicalEvent,
  ensureTraceContext,
} from "./trace.ts";
import { tenantConfig } from "./tenant.ts";

export type IntakeSource =
  | "contact_form"
  | "assessment"
  | "roi_calculator"
  | "exit_intent"
  | "chat"
  | "webinar"
  | "checkout"
  | "manual";

export interface HostedLeadPayload {
  source: IntakeSource;
  visitorId?: string;
  sessionId?: string;
  leadKey?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  service?: string;
  niche?: string;
  blueprintId?: string;
  stepId?: string;
  experimentId?: string;
  variantId?: string;
  message?: string;
  page?: string;
  metadata?: Record<string, unknown>;
  score?: number;
  returning?: boolean;
  askingForQuote?: boolean;
  wantsBooking?: boolean;
  wantsCheckout?: boolean;
  prefersChat?: boolean;
  contentEngaged?: boolean;
  dryRun?: boolean;
}

export interface IntakeResult {
  success: boolean;
  leadKey: string;
  existing: boolean;
  decision: ReturnType<typeof decideNextStep>;
  trace: ReturnType<typeof ensureTraceContext>;
  score: number;
  stage: LeadStage;
  hot: boolean;
  crm: Awaited<ReturnType<typeof syncLeadToCrm>>;
  logging: Awaited<ReturnType<typeof logEventsToLedger>>;
  alerts: Awaited<ReturnType<typeof sendAlertAction>> | null;
  workflow: Awaited<ReturnType<typeof emitWorkflowAction>>;
  workflowTriggers: Array<Awaited<ReturnType<typeof emitWorkflowAction>>>;
  followup: {
    email: Awaited<ReturnType<typeof sendEmailAction>> | null;
    whatsapp: Awaited<ReturnType<typeof sendWhatsAppAction>> | null;
    sms: Awaited<ReturnType<typeof sendSmsAction>> | null;
  };
}

const VALID_SOURCES: IntakeSource[] = [
  "contact_form",
  "assessment",
  "roi_calculator",
  "exit_intent",
  "chat",
  "webinar",
  "checkout",
  "manual",
];

const intakeReplayStore = new Map<string, number>();
const INTAKE_REPLAY_WINDOW_MS = 5 * 60 * 1000;

function normalizeName(value?: string) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function deriveFirstName(email?: string) {
  return email?.split("@")[0]?.replace(/[^a-zA-Z0-9]+/g, " ").trim() || "Lead";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string) {
  return phone.replace(/[^0-9]/g, "").length >= 10;
}

function computeLeadScore(payload: HostedLeadPayload) {
  const explicit = typeof payload.score === "number" ? payload.score : 0;
  const sourceBoost =
    payload.source === "assessment" ? 25
    : payload.source === "webinar" ? 20
    : payload.source === "chat" ? 18
    : payload.source === "checkout" ? 35
    : 10;
  const phoneBoost = payload.phone ? 15 : 0;
  const bookingBoost = payload.askingForQuote || payload.wantsBooking ? 25 : 0;
  const contentBoost = payload.contentEngaged ? 10 : 0;
  return Math.max(0, Math.min(100, explicit + sourceBoost + phoneBoost + bookingBoost + contentBoost));
}

function resolveLeadStage(payload: HostedLeadPayload): LeadStage {
  if (payload.wantsCheckout) return "offered";
  if (payload.wantsBooking || payload.askingForQuote) return "qualified";
  if (payload.source === "checkout") return "offered";
  if (payload.source === "assessment") return "qualified";
  return "captured";
}

function buildReplayKey(payload: HostedLeadPayload, normalizedEmail?: string, normalizedPhone?: string) {
  return [
    payload.source,
    payload.sessionId ?? "",
    normalizedEmail ?? "",
    normalizedPhone ?? "",
    payload.service ?? payload.niche ?? "",
  ].join("|");
}

function isRecentReplay(key: string) {
  const now = Date.now();
  const existing = intakeReplayStore.get(key);
  if (existing && now - existing < INTAKE_REPLAY_WINDOW_MS) return true;
  intakeReplayStore.set(key, now);
  return false;
}

export function validateLeadPayload(payload: HostedLeadPayload) {
  if (!VALID_SOURCES.includes(payload.source)) {
    throw new Error("Lead source is required and must be supported.");
  }
  if (!payload.email && !payload.phone) {
    throw new Error("Email or phone is required.");
  }
  if (payload.email && !isValidEmail(payload.email)) {
    throw new Error("Invalid email address.");
  }
  if (payload.phone && !isValidPhone(payload.phone)) {
    throw new Error("Invalid phone number.");
  }
}

export async function processLeadIntake(payload: HostedLeadPayload): Promise<IntakeResult> {
  validateLeadPayload(payload);

  const normalizedEmail = payload.email?.trim().toLowerCase();
  const normalizedPhone = payload.phone?.trim();
  const leadKey = payload.leadKey ?? buildLeadKey(normalizedEmail, normalizedPhone);
  const firstName = normalizeName(payload.firstName) || deriveFirstName(normalizedEmail);
  const lastName = normalizeName(payload.lastName);
  const existingRecord = getLeadRecord(leadKey);
  const existing = Boolean(existingRecord);
  const replayed = isRecentReplay(buildReplayKey(payload, normalizedEmail, normalizedPhone));
  const decision = decideNextStep({
    source: payload.source,
    service: payload.service,
    niche: payload.niche,
    hasEmail: Boolean(normalizedEmail),
    hasPhone: Boolean(normalizedPhone),
    returning: payload.returning,
    askingForQuote: payload.askingForQuote,
    wantsBooking: payload.wantsBooking,
    wantsCheckout: payload.wantsCheckout,
    prefersChat: payload.prefersChat,
    contentEngaged: payload.contentEngaged,
    score: payload.score,
  });
  const score = computeLeadScore(payload);
  const hot = score >= 80 || Boolean(payload.wantsBooking || payload.askingForQuote);
  const stage = resolveLeadStage(payload);
  const trace = ensureTraceContext({
    visitorId: payload.visitorId,
    sessionId: payload.sessionId,
    leadKey,
    tenant: tenantConfig.tenantId,
    source: payload.source,
    service: payload.service ?? tenantConfig.defaultService,
    niche: decision.traceDefaults.niche,
    blueprintId: payload.blueprintId ?? decision.traceDefaults.blueprintId,
    stepId: payload.stepId ?? decision.traceDefaults.stepId,
    experimentId: payload.experimentId,
    variantId: payload.variantId,
    email: normalizedEmail,
    phone: normalizedPhone,
    family: decision.family,
  });

  const now = new Date().toISOString();
  upsertLeadRecord({
    leadKey,
    trace,
    firstName,
    lastName,
    email: normalizedEmail,
    phone: normalizedPhone,
    company: payload.company,
    service: trace.service,
    niche: trace.niche,
    source: payload.source,
    score,
    family: decision.family,
    blueprintId: trace.blueprintId,
    destination: decision.destination,
    ctaLabel: decision.ctaLabel,
    stage,
    hot,
    createdAt: existingRecord?.createdAt ?? now,
    updatedAt: now,
    status: replayed ? "LEAD-DEDUPED" : "LEAD-CAPTURED",
    sentNurtureStages: existingRecord?.sentNurtureStages ?? [],
    metadata: payload.metadata ?? {},
  });

  const events = [
    createCanonicalEvent(trace, "lead_validated", "internal", "VALIDATED", {
      email: normalizedEmail,
      fullName: `${firstName} ${lastName}`.trim(),
      company: payload.company,
      brandName: tenantConfig.brandName,
    }),
    createCanonicalEvent(trace, replayed ? "lead_deduped" : "lead_captured", "web", replayed ? "DEDUPED" : "CAPTURED", {
      email: normalizedEmail,
      fullName: `${firstName} ${lastName}`.trim(),
      company: payload.company,
      score,
    }),
    createCanonicalEvent(trace, "lead_scored", "internal", "SCORED", { score, hot }),
    createCanonicalEvent(trace, "lead_qualified", "internal", "QUALIFIED", { stage }),
    createCanonicalEvent(trace, "lead_routed", "internal", "ROUTED", {
      family: decision.family,
      destination: decision.destination,
      ctaLabel: decision.ctaLabel,
    }),
  ];
  appendEvents(events);

  const crm = await syncLeadToCrm({
    leadKey,
    firstName,
    lastName,
    email: normalizedEmail,
    phone: normalizedPhone,
    company: payload.company,
    service: trace.service,
    niche: trace.niche,
    score,
    stage,
  });
  const logging = await logEventsToLedger(events);
  const workflow = await emitWorkflowAction("lead.captured", {
    leadKey,
    trace,
    score,
    stage,
    family: decision.family,
  });
  const workflowTriggers = (await Promise.all([
    hot
      ? emitWorkflowAction("lead.hot", {
          leadKey,
          trace,
          score,
          stage,
          family: decision.family,
        })
      : Promise.resolve(null),
    (payload.source === "checkout" || payload.wantsCheckout || decision.family === "checkout")
      ? emitWorkflowAction("checkout_started", {
          leadKey,
          trace,
          score,
          stage,
          family: decision.family,
          checkoutUrl: `${tenantConfig.siteUrl}${decision.destination}`,
        })
      : Promise.resolve(null),
    (payload.source === "chat" || payload.prefersChat || decision.family === "chat")
      ? emitWorkflowAction("lead.qualify.ai", {
          leadKey,
          trace,
          score,
          stage,
          family: decision.family,
          promptContext: {
            source: payload.source,
            message: payload.message,
            service: trace.service,
            niche: trace.niche,
          },
        })
      : Promise.resolve(null),
    (payload.metadata?.activationMilestone === true)
      ? emitWorkflowAction("customer_activated", {
          leadKey,
          trace,
          score,
          stage,
          family: decision.family,
          metadata: payload.metadata,
        })
      : Promise.resolve(null),
  ])).filter(Boolean) as Array<Awaited<ReturnType<typeof emitWorkflowAction>>>;

  const immediatePlan = buildImmediateFollowupPlan({
    hot,
    email: normalizedEmail,
    phone: normalizedPhone,
    family: decision.family,
  });

  const [emailResult, whatsappResult, smsResult, alertResult] = await Promise.all([
    immediatePlan.sendEmail && normalizedEmail
      ? sendEmailAction({
          to: normalizedEmail,
          subject: `${tenantConfig.brandName}: your next step`,
          html: `<p>Hi ${firstName},</p><p>We received your ${payload.source.replace(/_/g, " ")} submission and mapped your next best step to the <strong>${decision.family}</strong> funnel.</p><p><a href="${tenantConfig.siteUrl}${decision.destination}">${decision.ctaLabel}</a></p>`,
          trace,
        })
      : Promise.resolve(null),
    immediatePlan.sendWhatsApp && normalizedPhone
      ? sendWhatsAppAction({
          phone: normalizedPhone,
          body: `Hi ${firstName}, ${tenantConfig.brandName} received your request. Next step: ${tenantConfig.siteUrl}${decision.destination}`,
        })
      : Promise.resolve(null),
    immediatePlan.sendSms && normalizedPhone
      ? sendSmsAction({
          phone: normalizedPhone,
          body: `${tenantConfig.brandName}: continue here ${tenantConfig.siteUrl}${decision.destination}`,
        })
      : Promise.resolve(null),
    immediatePlan.alertOps
      ? sendAlertAction({
          title: "Hot Lead Captured",
          body: `${firstName} ${lastName}`.trim() || leadKey,
          trace,
        })
      : Promise.resolve(null),
  ]);

  if (emailResult) {
    appendEvents([createCanonicalEvent(trace, "followup_email_sent", "email", emailResult.ok ? "SENT" : "FAILED")]);
    markNurtureStageSent(leadKey, "day-0");
  }
  if (whatsappResult) {
    appendEvents([createCanonicalEvent(trace, "followup_whatsapp_sent", "whatsapp", whatsappResult.ok ? "SENT" : "FAILED")]);
  }
  if (smsResult) {
    appendEvents([createCanonicalEvent(trace, "followup_sms_sent", "sms", smsResult.ok ? "SENT" : "FAILED")]);
  }

  return {
    success: true,
    leadKey,
    existing: existing || replayed,
    decision,
    trace,
    score,
    stage,
    hot,
    crm,
    logging,
    alerts: alertResult,
    workflow,
    workflowTriggers,
    followup: {
      email: emailResult,
      whatsapp: whatsappResult,
      sms: smsResult,
    },
  };
}

export async function persistLead(payload: HostedLeadPayload) {
  return processLeadIntake(payload);
}
