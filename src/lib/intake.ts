import { buildImmediateFollowupPlan } from "./automation.ts";
import { decideNextStep } from "./orchestrator.ts";
import { classifyPlumbingLead, isPlumbingLead } from "./plumbing-os.ts";
import {
  createBookingAction,
  emitWorkflowAction,
  generateDocumentAction,
  logEventsToLedger,
  type ProviderResult,
  sendAlertAction,
  sendEmailAction,
  sendSmsAction,
  sendWhatsAppAction,
  syncLeadToCrm,
} from "./providers.ts";
import type { LeadStage, PlumbingLeadContext } from "./runtime-schema.ts";
import type { CustomerMilestoneId, LeadMilestoneId } from "./runtime-schema.ts";
import {
  appendEvents,
  getBookingJobs,
  getDocumentJobs,
  getLeadRecord,
  markNurtureStageSent,
  recordProviderExecution,
  recordWorkflowRun,
  type StoredLeadRecord,
  upsertBookingJob,
  upsertDocumentJob,
  upsertLeadRecord,
} from "./runtime-store.ts";
import {
  buildLeadKey,
  createCanonicalEvent,
  ensureTraceContext,
} from "./trace.ts";
import { tenantConfig } from "./tenant.ts";
import type { FunnelFamily } from "./runtime-schema.ts";

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
  state?: string;
  county?: string;
  city?: string;
  zip?: string;
  propertyType?: string;
  urgencyHint?: string;
  issueType?: string;
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
  preferredFamily?: FunnelFamily;
  dryRun?: boolean;
}

export interface IntakeResult {
  success: boolean;
  leadKey: string;
  existing: boolean;
  record: StoredLeadRecord;
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
  jobs: {
    booking: Awaited<ReturnType<typeof getBookingJobs>>[number] | null;
    documents: Awaited<ReturnType<typeof getDocumentJobs>>;
  };
}

export interface PublicIntakeResponse {
  success: boolean;
  leadKey: string;
  existing: boolean;
  hot: boolean;
  scoreBand: "low" | "medium" | "high";
  stage: LeadStage;
  operatingModel?: "generic-growth" | "plumbing-dispatch";
  plumbing?: {
    urgencyBand: PlumbingLeadContext["urgencyBand"];
    issueType: PlumbingLeadContext["issueType"];
    dispatchMode: PlumbingLeadContext["dispatchMode"];
    propertyType: PlumbingLeadContext["propertyType"];
  };
  nextStep: {
    family: FunnelFamily;
    destination: string;
    ctaLabel: string;
    message: string;
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
  const plumbingBoost = isPlumbingLead(payload)
    ? (() => {
        const plumbing = classifyPlumbingLead({
          niche: payload.niche,
          service: payload.service,
          message: payload.message,
          askingForQuote: payload.askingForQuote,
          wantsBooking: payload.wantsBooking,
          prefersChat: payload.prefersChat,
          metadata: buildPlumbingMetadata(payload),
        });
        return plumbing.urgencyBand === "emergency-now" ? 25
          : plumbing.urgencyBand === "same-day" ? 18
          : plumbing.urgencyBand === "commercial" ? 16
          : plumbing.urgencyBand === "estimate" ? 8
          : 4;
      })()
    : 0;
  return Math.max(0, Math.min(100, explicit + sourceBoost + phoneBoost + bookingBoost + contentBoost + plumbingBoost));
}

function buildPlumbingMetadata(payload: HostedLeadPayload) {
  return {
    ...(payload.metadata ?? {}),
    state: payload.state ?? payload.metadata?.state,
    county: payload.county ?? payload.metadata?.county,
    city: payload.city ?? payload.metadata?.city,
    zip: payload.zip ?? payload.metadata?.zip,
    propertyType: payload.propertyType ?? payload.metadata?.propertyType,
    urgencyHint: payload.urgencyHint ?? payload.metadata?.urgencyHint,
    issueType: payload.issueType ?? payload.metadata?.issueType,
  };
}

function resolveLeadStage(payload: HostedLeadPayload): LeadStage {
  const metadata = payload.metadata ?? {};
  if (metadata.referralReady === true) return "referral-ready";
  if (metadata.activationMilestone === true) return "active";
  if (metadata.onboardingStarted === true) return "onboarding";
  if (metadata.checkoutCompleted === true || metadata.conversionCompleted === true) return "converted";
  if (payload.wantsCheckout) return "offered";
  if (payload.wantsBooking || payload.askingForQuote) return "qualified";
  if (payload.source === "checkout") return "offered";
  if (payload.source === "assessment") return "qualified";
  return "captured";
}

function resolveVisitCount(payload: HostedLeadPayload, existingRecord?: { milestones?: { visitCount: number } }) {
  const priorCount = existingRecord?.milestones?.visitCount ?? 0;
  if (priorCount > 0) {
    return payload.returning ? priorCount + 1 : priorCount;
  }
  return payload.returning ? 2 : 1;
}

function resolveLeadMilestones(stage: LeadStage, visitCount: number): LeadMilestoneId[] {
  const milestones: LeadMilestoneId[] = [];
  if (stage !== "anonymous" && stage !== "engaged") {
    milestones.push("lead-m1-captured");
  }
  if (visitCount >= 2) {
    milestones.push("lead-m2-return-engaged");
  }
  if (["qualified", "booked", "offered", "converted", "onboarding", "active", "referral-ready"].includes(stage)) {
    milestones.push("lead-m3-booked-or-offered");
  }
  return milestones;
}

function resolveCustomerMilestones(
  stage: LeadStage,
  metadata?: Record<string, unknown>,
): CustomerMilestoneId[] {
  const milestones: CustomerMilestoneId[] = [];
  if (["converted", "onboarding", "active", "retention-risk", "referral-ready"].includes(stage)) {
    milestones.push("customer-m1-onboarded");
  }
  if (metadata?.activationMilestone === true || ["active", "retention-risk", "referral-ready"].includes(stage)) {
    milestones.push("customer-m2-activated");
  }
  if (metadata?.valueRealized === true || metadata?.referralReady === true || stage === "referral-ready") {
    milestones.push("customer-m3-value-realized");
  }
  return milestones;
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

function normalizeDocumentTypes(stage: LeadStage, metadata: Record<string, unknown> | undefined) {
  const requested = new Set<string>();
  const explicitType = typeof metadata?.documentType === "string" ? metadata.documentType.trim() : "";
  if (explicitType) {
    requested.add(explicitType);
  }
  if (stage === "qualified" || stage === "booked" || stage === "offered") {
    requested.add("proposal");
  }
  if (stage === "converted" || metadata?.checkoutCompleted === true || metadata?.conversionCompleted === true) {
    requested.add("agreement");
  }
  if (stage === "onboarding" || metadata?.onboardingStarted === true) {
    requested.add("onboarding-pack");
  }
  return [...requested];
}

function failedProviderResult(
  provider: string,
  detail: string,
  payload?: Record<string, unknown>,
): ProviderResult {
  return {
    ok: false,
    provider,
    mode: "live",
    detail,
    payload,
  };
}

async function safelyRunProviderAction(
  provider: string,
  action: () => Promise<ProviderResult>,
  payload?: Record<string, unknown>,
) {
  try {
    return await action();
  } catch (error) {
    return failedProviderResult(
      provider,
      error instanceof Error ? error.message : `${provider} action failed`,
      payload,
    );
  }
}

function resolveBookingJobStatus(result: Awaited<ReturnType<typeof createBookingAction>>) {
  if (result.mode === "dry-run") {
    return "prepared";
  }
  if (!result.ok) {
    return result.mode === "live" ? "unavailable" : "failed";
  }

  const detail = result.detail.toLowerCase();
  if (detail.includes("submitted")) {
    return "booked";
  }
  if (detail.includes("handoff ready")) {
    return "handoff-ready";
  }
  if (detail.includes("availability")) {
    return "availability-found";
  }
  if (detail.includes("handoff") || detail.includes("destination")) {
    return "handoff-ready";
  }
  return result.mode === "prepared" ? "prepared" : "ready";
}

function resolveDocumentJobStatus(result: Awaited<ReturnType<typeof generateDocumentAction>>) {
  if (result.mode === "dry-run") {
    return "prepared";
  }
  if (!result.ok) {
    return "failed";
  }
  return result.mode === "live" ? "generated" : "prepared";
}

function isRecentReplay(key: string) {
  const now = Date.now();
  const existing = intakeReplayStore.get(key);
  if (existing && now - existing < INTAKE_REPLAY_WINDOW_MS) return true;
  intakeReplayStore.set(key, now);
  return false;
}

function resolveScoreBand(score: number): PublicIntakeResponse["scoreBand"] {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function buildPublicNextStep(result: IntakeResult): PublicIntakeResponse["nextStep"] {
  const plumbingMessage = result.decision.plumbing
    ? result.decision.plumbing.dispatchMode === "dispatch-now"
      ? "We classified this as urgent plumbing demand and moved it into the fastest dispatch-ready path."
      : result.decision.plumbing.dispatchMode === "same-day-booking"
      ? "We classified this as same-day plumbing demand and prepared the fastest booking path."
      : result.decision.plumbing.dispatchMode === "commercial-intake"
      ? "We classified this as commercial plumbing demand and prepared a higher-context intake path."
      : result.decision.plumbing.dispatchMode === "triage"
      ? "We classified this as a plumbing request that benefits from guided triage before booking."
      : "We prepared the clearest estimate path for this plumbing request."
    : null;
  const familyCopy: Record<FunnelFamily, string> = {
    "lead-magnet": "We captured your request and prepared the fastest relevant next step.",
    qualification: plumbingMessage ?? (result.hot
      ? "We are moving you into the fastest qualification and booking path."
      : "We captured your details and prepared the best next qualification step."),
    chat: "We prepared the fastest conversation path for your request.",
    webinar: "We prepared the next step so you can keep moving without repeating yourself.",
    authority: "We prepared the clearest next step to help you evaluate the offer.",
    checkout: "We prepared the fastest path back into checkout.",
    retention: "We prepared the next step to keep the relationship moving forward.",
    rescue: "We prepared the quickest rescue path so this lead does not stall.",
    referral: "We prepared the next step to activate referral momentum.",
    continuity: "We prepared the next continuity step so momentum keeps compounding.",
  };

  return {
    family: result.decision.family,
    destination: result.decision.destination,
    ctaLabel: result.decision.ctaLabel,
    message: familyCopy[result.decision.family] ?? "We prepared your next step.",
  };
}

export function buildPublicIntakeResponse(result: IntakeResult): PublicIntakeResponse {
  return {
    success: result.success,
    leadKey: result.leadKey,
    existing: result.existing,
    hot: result.hot,
    scoreBand: resolveScoreBand(result.score),
    stage: result.stage,
    operatingModel: result.decision.operatingModel,
    plumbing: result.decision.plumbing
      ? {
          urgencyBand: result.decision.plumbing.urgencyBand,
          issueType: result.decision.plumbing.issueType,
          dispatchMode: result.decision.plumbing.dispatchMode,
          propertyType: result.decision.plumbing.propertyType,
        }
      : undefined,
    nextStep: buildPublicNextStep(result),
  };
}

function skippedProviderResult(detail: string): ProviderResult {
  return {
    ok: true,
    provider: "LeadOS",
    mode: "prepared",
    detail,
  };
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
  const existingRecord = await getLeadRecord(leadKey);
  const existing = Boolean(existingRecord);
  const replayed = isRecentReplay(buildReplayKey(payload, normalizedEmail, normalizedPhone));
  const plumbingMetadata = buildPlumbingMetadata(payload);
  const decision = decideNextStep({
    source: payload.source,
    service: payload.service,
    niche: payload.niche,
    message: payload.message,
    metadata: plumbingMetadata,
    preferredFamily: payload.preferredFamily,
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
  const visitCount = resolveVisitCount(payload, existingRecord);
  const leadMilestones = resolveLeadMilestones(stage, visitCount);
  const customerMilestones = resolveCustomerMilestones(stage, payload.metadata);
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
  const record = await upsertLeadRecord({
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
    milestones: {
      visitCount,
      leadMilestones,
      customerMilestones,
    },
    metadata: {
      ...(payload.metadata ?? {}),
      ...plumbingMetadata,
      plumbing: decision.plumbing ?? null,
      operatingModel: decision.operatingModel,
    },
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
      operatingModel: decision.operatingModel,
    }),
    ...(decision.plumbing
      ? [
          createCanonicalEvent(trace, "plumbing_urgency_classified", "internal", "CLASSIFIED", {
            urgencyBand: decision.plumbing.urgencyBand,
            issueType: decision.plumbing.issueType,
            dispatchMode: decision.plumbing.dispatchMode,
            propertyType: decision.plumbing.propertyType,
            confidence: decision.plumbing.confidence,
          }),
          createCanonicalEvent(trace, "dispatch_path_selected", "internal", "DISPATCH_PATH", {
            urgencyBand: decision.plumbing.urgencyBand,
            dispatchMode: decision.plumbing.dispatchMode,
            routingReasons: decision.plumbing.routingReasons,
          }),
        ]
      : []),
    ...leadMilestones.map((milestoneId) =>
      createCanonicalEvent(trace, "lead_milestone_reached", "internal", "MILESTONE", {
        milestoneId,
        visitCount,
        stage,
      })
    ),
    ...customerMilestones.map((milestoneId) =>
      createCanonicalEvent(trace, "customer_milestone_reached", "internal", "MILESTONE", {
        milestoneId,
        visitCount,
        stage,
      })
    ),
  ];
  await appendEvents(events);

  if (replayed) {
    const [bookingJobs, documentJobs] = await Promise.all([
      getBookingJobs(leadKey),
      getDocumentJobs(leadKey),
    ]);

    return {
      success: true,
      leadKey,
      existing: true,
      record,
      decision,
      trace,
      score,
      stage,
      hot,
      crm: skippedProviderResult("Replay suppressed before CRM sync."),
      logging: skippedProviderResult("Replay suppressed before ledger sync."),
      alerts: null,
      workflow: skippedProviderResult("Replay suppressed before workflow emission."),
      workflowTriggers: [],
      followup: {
        email: null,
        whatsapp: null,
        sms: null,
      },
      jobs: {
        booking: bookingJobs[0] ?? null,
        documents: documentJobs,
      },
    };
  }

  const crmPayload = {
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
    dryRun: payload.dryRun,
  };
  const crm = await safelyRunProviderAction("SuiteDash", () => syncLeadToCrm(crmPayload), crmPayload);
  const logging = await safelyRunProviderAction("AITable", () => logEventsToLedger(events), {
    leadKey,
    eventCount: events.length,
  });
  const workflowPayload = {
    leadKey,
    trace,
    score,
    stage,
    family: decision.family,
  };
  const workflow = await safelyRunProviderAction("n8n", () => emitWorkflowAction("lead.captured", workflowPayload), workflowPayload);

  const workflowTriggerSpecs: Array<{ eventName: string; payload: Record<string, unknown> } | null> = [
    hot
      ? {
          eventName: "lead.hot",
          payload: {
            leadKey,
            trace,
            score,
            stage,
            family: decision.family,
          },
        }
      : null,
    (payload.source === "checkout" || payload.wantsCheckout || decision.family === "checkout")
      ? {
          eventName: "checkout_started",
          payload: {
            leadKey,
            trace,
            score,
            stage,
            family: decision.family,
            checkoutUrl: `${tenantConfig.siteUrl}${decision.destination}`,
          },
        }
      : null,
    (payload.source === "chat" || payload.prefersChat || decision.family === "chat")
      ? {
          eventName: "lead.qualify.ai",
          payload: {
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
          },
        }
      : null,
    (payload.metadata?.activationMilestone === true)
      ? {
          eventName: "customer_activated",
          payload: {
            leadKey,
            trace,
            score,
            stage,
            family: decision.family,
            metadata: payload.metadata,
          },
        }
      : null,
    leadMilestones.includes("lead-m2-return-engaged")
      ? {
          eventName: "lead.milestone.2",
          payload: {
            leadKey,
            trace,
            score,
            stage,
            family: decision.family,
            visitCount,
            milestones: leadMilestones,
          },
        }
      : null,
    leadMilestones.includes("lead-m3-booked-or-offered")
      ? {
          eventName: "lead.milestone.3",
          payload: {
            leadKey,
            trace,
            score,
            stage,
            family: decision.family,
            visitCount,
            milestones: leadMilestones,
          },
        }
      : null,
    customerMilestones.includes("customer-m2-activated")
      ? {
          eventName: "customer.milestone.2",
          payload: {
            leadKey,
            trace,
            score,
            stage,
            family: decision.family,
            visitCount,
            milestones: customerMilestones,
          },
        }
      : null,
    customerMilestones.includes("customer-m3-value-realized")
      ? {
          eventName: "customer.milestone.3",
          payload: {
            leadKey,
            trace,
            score,
            stage,
            family: decision.family,
            visitCount,
            milestones: customerMilestones,
          },
        }
      : null,
  ];
  const workflowTriggers = await Promise.all(
    workflowTriggerSpecs
      .filter((value): value is { eventName: string; payload: Record<string, unknown> } => Boolean(value))
      .map(async ({ eventName, payload: triggerPayload }) => ({
        eventName,
        result: await safelyRunProviderAction("n8n", () => emitWorkflowAction(eventName, triggerPayload), triggerPayload),
      })),
  );

  const immediatePlan = buildImmediateFollowupPlan({
    hot,
    email: normalizedEmail,
    phone: normalizedPhone,
    family: decision.family,
  });

  const [emailResult, whatsappResult, smsResult, alertResult] = await Promise.all([
    !payload.dryRun && immediatePlan.sendEmail && normalizedEmail
      ? safelyRunProviderAction(
          "Emailit",
          () => sendEmailAction({
            to: normalizedEmail,
            subject: `${tenantConfig.brandName}: your next step`,
            html: `<p>Hi ${firstName},</p><p>We received your ${payload.source.replace(/_/g, " ")} submission and mapped your next best step to the <strong>${decision.family}</strong> funnel.</p><p><a href="${tenantConfig.siteUrl}${decision.destination}">${decision.ctaLabel}</a></p>`,
            trace,
          }),
          {
            to: normalizedEmail,
            leadKey,
          },
        )
      : Promise.resolve(null),
    !payload.dryRun && immediatePlan.sendWhatsApp && normalizedPhone
      ? safelyRunProviderAction(
          "WbizTool",
          () => sendWhatsAppAction({
            phone: normalizedPhone,
            body: `Hi ${firstName}, ${tenantConfig.brandName} received your request. Next step: ${tenantConfig.siteUrl}${decision.destination}`,
          }),
          {
            to: normalizedPhone,
            leadKey,
          },
        )
      : Promise.resolve(null),
    !payload.dryRun && immediatePlan.sendSms && normalizedPhone
      ? safelyRunProviderAction(
          "Easy Text Marketing",
          () => sendSmsAction({
            phone: normalizedPhone,
            body: `${tenantConfig.brandName}: continue here ${tenantConfig.siteUrl}${decision.destination}`,
          }),
          {
            to: normalizedPhone,
            leadKey,
          },
        )
      : Promise.resolve(null),
    !payload.dryRun && immediatePlan.alertOps
      ? safelyRunProviderAction(
          "Ops Alert",
          () => sendAlertAction({
            title: "Hot Lead Captured",
            body: `${firstName} ${lastName}`.trim() || leadKey,
            trace,
          }),
          {
            leadKey,
          },
        )
      : Promise.resolve(null),
  ]);

  if (emailResult) {
    await appendEvents([createCanonicalEvent(trace, "followup_email_sent", "email", emailResult.ok ? "SENT" : "FAILED")]);
    await markNurtureStageSent(leadKey, "day-0");
  }
  if (whatsappResult) {
    await appendEvents([createCanonicalEvent(trace, "followup_whatsapp_sent", "whatsapp", whatsappResult.ok ? "SENT" : "FAILED")]);
  }
  if (smsResult) {
    await appendEvents([createCanonicalEvent(trace, "followup_sms_sent", "sms", smsResult.ok ? "SENT" : "FAILED")]);
  }

  const shouldCreateBookingJob =
    payload.wantsBooking ||
    payload.askingForQuote ||
    decision.family === "qualification" ||
    stage === "qualified" ||
    stage === "booked";
  const bookingPayload = {
    dryRun: payload.dryRun,
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
    family: decision.family,
    stage,
    score,
    metadata: payload.metadata ?? {},
  };
  const bookingActionResult = shouldCreateBookingJob
    ? await safelyRunProviderAction("Trafft", () => createBookingAction(bookingPayload), bookingPayload)
    : null;
  const bookingJob = bookingActionResult
    ? await upsertBookingJob({
        leadKey,
        provider: bookingActionResult.provider,
        status: resolveBookingJobStatus(bookingActionResult),
        detail: bookingActionResult.detail,
        payload: {
          family: decision.family,
          stage,
          score,
          ...bookingActionResult.payload,
        },
      })
    : null;

  const documentTypes = normalizeDocumentTypes(stage, payload.metadata);
  const documentJobs = await Promise.all(
    documentTypes.map(async (documentType) => {
      const documentPayload = {
        dryRun: payload.dryRun,
        leadKey,
        trace,
        firstName,
        lastName,
        email: normalizedEmail,
        phone: normalizedPhone,
        company: payload.company,
        service: trace.service,
        niche: trace.niche,
        family: decision.family,
        stage,
        score,
        documentType,
        metadata: payload.metadata ?? {},
      };
      const result = await safelyRunProviderAction("Documentero", () => generateDocumentAction(documentPayload), documentPayload);

      const job = await upsertDocumentJob({
        leadKey,
        provider: result.provider,
        status: resolveDocumentJobStatus(result),
        detail: result.detail,
        payload: {
          documentType,
          family: decision.family,
          stage,
          score,
          ...result.payload,
        },
      });

      if (result.ok && result.mode === "live" && documentType === "proposal") {
        await appendEvents([
          createCanonicalEvent(trace, "proposal_sent", "internal", "SENT", {
            provider: result.provider,
            documentType,
          }),
        ]);
      }

      return { job, result };
    }),
  );

  await Promise.all([
    recordProviderExecution({
      leadKey,
      provider: crm.provider,
      kind: "crm",
      ok: crm.ok,
      mode: crm.mode,
      detail: crm.detail,
      payload: crm.payload,
    }),
    recordProviderExecution({
      leadKey,
      provider: logging.provider,
      kind: "ledger",
      ok: logging.ok,
      mode: logging.mode,
      detail: logging.detail,
      payload: logging.payload,
    }),
    recordWorkflowRun({
      leadKey,
      eventName: "lead.captured",
      provider: workflow.provider,
      ok: workflow.ok,
      mode: workflow.mode,
      detail: workflow.detail,
      payload: workflow.payload,
    }),
    ...workflowTriggers.map(({ eventName, result }) =>
      recordWorkflowRun({
        leadKey,
        eventName,
        provider: result.provider,
        ok: result.ok,
        mode: result.mode,
        detail: result.detail,
        payload: result.payload,
      })
    ),
    ...(alertResult ? [
      recordProviderExecution({
        leadKey,
        provider: alertResult.provider,
        kind: "alert",
        ok: alertResult.ok,
        mode: alertResult.mode,
        detail: alertResult.detail,
        payload: alertResult.payload,
      }),
    ] : []),
    ...(emailResult ? [
      recordProviderExecution({
        leadKey,
        provider: emailResult.provider,
        kind: "email",
        ok: emailResult.ok,
        mode: emailResult.mode,
        detail: emailResult.detail,
        payload: emailResult.payload,
      }),
    ] : []),
    ...(whatsappResult ? [
      recordProviderExecution({
        leadKey,
        provider: whatsappResult.provider,
        kind: "whatsapp",
        ok: whatsappResult.ok,
        mode: whatsappResult.mode,
        detail: whatsappResult.detail,
        payload: whatsappResult.payload,
      }),
    ] : []),
    ...(smsResult ? [
      recordProviderExecution({
        leadKey,
        provider: smsResult.provider,
        kind: "sms",
        ok: smsResult.ok,
        mode: smsResult.mode,
        detail: smsResult.detail,
        payload: smsResult.payload,
      }),
    ] : []),
    ...(bookingActionResult ? [
      recordProviderExecution({
        leadKey,
        provider: bookingActionResult.provider,
        kind: "booking",
        ok: bookingActionResult.ok,
        mode: bookingActionResult.mode,
        detail: bookingActionResult.detail,
        payload: bookingActionResult.payload,
      }),
    ] : []),
    ...documentJobs.map(({ result }) =>
      recordProviderExecution({
        leadKey,
        provider: result.provider,
        kind: "documents",
        ok: result.ok,
        mode: result.mode,
        detail: result.detail,
        payload: result.payload,
      })
    ),
  ]);

  return {
    success: true,
    leadKey,
    existing: existing || replayed,
    record,
    decision,
    trace,
    score,
    stage,
    hot,
    crm,
    logging,
    alerts: alertResult,
    workflow,
    workflowTriggers: workflowTriggers.map(({ result }) => result),
    followup: {
      email: emailResult,
      whatsapp: whatsappResult,
      sms: smsResult,
    },
    jobs: {
      booking: bookingJob,
      documents: documentJobs.map(({ job }) => job),
    },
  };
}

export async function persistLead(payload: HostedLeadPayload) {
  return processLeadIntake(payload);
}
