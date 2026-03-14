import { timingSafeEqual } from "node:crypto";
import {
  appendEvents,
  getBookingJobs,
  getLeadRecord,
  recordProviderExecution,
  upsertBookingJob,
  upsertLeadRecord,
  type StoredLeadRecord,
} from "./runtime-store.ts";
import type { CanonicalEventType, LeadStage } from "./runtime-schema.ts";
import { buildLeadKey, createCanonicalEvent, ensureTraceContext } from "./trace.ts";
import { tenantConfig } from "./tenant.ts";

export type TrafftWebhookEvent =
  | "appointment-booked"
  | "appointment-rescheduled"
  | "appointment-canceled"
  | "appointment-status-changed"
  | "customer-created";

const TRAFFT_WEBHOOK_EVENT_META: Record<TrafftWebhookEvent, {
  canonicalEventType: CanonicalEventType;
  bookingStatus?: string;
  label: string;
}> = {
  "appointment-booked": {
    canonicalEventType: "booking_completed",
    bookingStatus: "booked",
    label: "Appointment Booked",
  },
  "appointment-rescheduled": {
    canonicalEventType: "booking_rescheduled",
    bookingStatus: "rescheduled",
    label: "Appointment Rescheduled",
  },
  "appointment-canceled": {
    canonicalEventType: "booking_canceled",
    bookingStatus: "canceled",
    label: "Appointment Canceled",
  },
  "appointment-status-changed": {
    canonicalEventType: "booking_status_changed",
    bookingStatus: "status-changed",
    label: "Appointment Status Changed",
  },
  "customer-created": {
    canonicalEventType: "customer_created",
    label: "Customer Created",
  },
};

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function getNestedRecord(record: Record<string, unknown> | undefined, key: string) {
  return asRecord(record?.[key]);
}

function getStringValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function getTrafftWebhookVerificationToken() {
  return process.env.TRAFFT_WEBHOOK_VERIFICATION_TOKEN?.trim() ?? "";
}

function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getTrafftContactDetails(payload: Record<string, unknown>) {
  const customer = getNestedRecord(payload, "customer");
  const appointment = getNestedRecord(payload, "appointment");
  return {
    firstName: getStringValue(
      customer?.firstName,
      customer?.first_name,
      appointment?.firstName,
      appointment?.first_name,
      payload.firstName,
      payload.first_name,
    ),
    lastName: getStringValue(
      customer?.lastName,
      customer?.last_name,
      appointment?.lastName,
      appointment?.last_name,
      payload.lastName,
      payload.last_name,
    ),
    email: getStringValue(customer?.email, appointment?.email, payload.email),
    phone: getStringValue(
      customer?.phone,
      customer?.phoneNumber,
      customer?.rawPhoneNumber,
      appointment?.phone,
      payload.phone,
    ),
    company: getStringValue(customer?.company, appointment?.company, payload.company),
  };
}

function getTrafftAppointmentDetails(payload: Record<string, unknown>) {
  const appointment = getNestedRecord(payload, "appointment");
  const service = getNestedRecord(payload, "service");
  return {
    appointmentId: getStringValue(
      appointment?.id,
      appointment?.appointmentId,
      payload.appointmentId,
      payload.id,
    ),
    status: getStringValue(appointment?.status, payload.status),
    serviceName: getStringValue(
      service?.name,
      appointment?.serviceName,
      payload.serviceName,
      payload.service,
    ),
    startAt: getStringValue(
      appointment?.bookingStart,
      appointment?.startsAt,
      appointment?.startAt,
      payload.bookingStart,
      payload.startsAt,
      payload.startAt,
    ),
  };
}

function ensureLeadMilestone(record: StoredLeadRecord, milestoneId: "lead-m1-captured" | "lead-m3-booked-or-offered") {
  if (!record.milestones.leadMilestones.includes(milestoneId)) {
    record.milestones.leadMilestones = [...record.milestones.leadMilestones, milestoneId];
  }
}

function resolveStageForWebhook(currentStage: LeadStage | undefined, event: TrafftWebhookEvent, status?: string): LeadStage {
  if (event === "appointment-booked" || event === "appointment-rescheduled") {
    return "booked";
  }
  if (event === "appointment-status-changed") {
    const normalizedStatus = (status ?? "").toLowerCase();
    if (normalizedStatus.includes("cancel")) {
      return currentStage === "booked" ? "qualified" : currentStage ?? "qualified";
    }
    if (normalizedStatus.includes("confirm") || normalizedStatus.includes("book")) {
      return "booked";
    }
  }
  if (event === "appointment-canceled") {
    return currentStage === "booked" ? "qualified" : currentStage ?? "qualified";
  }
  return currentStage ?? "captured";
}

function buildWebhookLeadRecord(
  leadKey: string,
  event: TrafftWebhookEvent,
  payload: Record<string, unknown>,
): StoredLeadRecord {
  const now = new Date().toISOString();
  const contact = getTrafftContactDetails(payload);
  const appointment = getTrafftAppointmentDetails(payload);
  const trace = ensureTraceContext({
    tenant: tenantConfig.tenantId,
    source: "trafft-webhook",
    service: appointment.serviceName ?? "Strategy Call",
    niche: "general",
    blueprintId: "qualification-default",
    stepId: `trafft-${event}`,
    family: "qualification",
    leadKey,
    email: contact.email,
    phone: contact.phone,
  });

  return {
    leadKey,
    trace,
    firstName: contact.firstName ?? "Lead",
    lastName: contact.lastName ?? "",
    email: contact.email,
    phone: contact.phone,
    company: contact.company,
    service: appointment.serviceName ?? "Strategy Call",
    niche: "general",
    source: "trafft-webhook",
    score: event === "appointment-booked" ? 80 : 45,
    family: "qualification",
    blueprintId: "qualification-default",
    destination: "/assess/general",
    ctaLabel: "Start Assessment",
    stage: resolveStageForWebhook(undefined, event, appointment.status),
    hot: event === "appointment-booked",
    createdAt: now,
    updatedAt: now,
    status: "TRAFFT-WEBHOOK",
    sentNurtureStages: [],
    milestones: {
      visitCount: 1,
      leadMilestones: ["lead-m1-captured"],
      customerMilestones: [],
    },
    metadata: {
      source: "trafft-webhook",
    },
  };
}

export function hasTrafftWebhookVerificationToken() {
  return Boolean(getTrafftWebhookVerificationToken());
}

export function isKnownTrafftWebhookEvent(value: string): value is TrafftWebhookEvent {
  return value in TRAFFT_WEBHOOK_EVENT_META;
}

export function verifyTrafftWebhookAuthorization(authorizationHeader: string | null) {
  const expectedToken = getTrafftWebhookVerificationToken();
  const providedToken = authorizationHeader?.trim() ?? "";
  if (!expectedToken || !providedToken) {
    return false;
  }
  return safeEquals(providedToken, expectedToken);
}

export function getTrafftWebhookEndpointMap(origin: string) {
  return {
    "Appointment Booked": `${origin}/api/webhooks/trafft/appointment-booked`,
    "Appointment has been rescheduled": `${origin}/api/webhooks/trafft/appointment-rescheduled`,
    "Appointment Canceled": `${origin}/api/webhooks/trafft/appointment-canceled`,
    "Appointment status has been changed": `${origin}/api/webhooks/trafft/appointment-status-changed`,
    "Customer Created": `${origin}/api/webhooks/trafft/customer-created`,
  };
}

export async function processTrafftWebhook(event: TrafftWebhookEvent, rawPayload: unknown) {
  const payload = asRecord(rawPayload) ?? {};
  const contact = getTrafftContactDetails(payload);
  const appointment = getTrafftAppointmentDetails(payload);
  const leadKey = buildLeadKey(contact.email, contact.phone);
  const existingRecord = leadKey !== "anonymous:unknown" ? await getLeadRecord(leadKey) : undefined;
  const record = existingRecord ?? (leadKey !== "anonymous:unknown" ? buildWebhookLeadRecord(leadKey, event, payload) : undefined);
  const nextStage = resolveStageForWebhook(record?.stage, event, appointment.status);

  if (record) {
    record.firstName = contact.firstName ?? record.firstName;
    record.lastName = contact.lastName ?? record.lastName;
    record.email = contact.email ?? record.email;
    record.phone = contact.phone ?? record.phone;
    record.company = contact.company ?? record.company;
    record.service = appointment.serviceName ?? record.service;
    record.stage = nextStage;
    record.updatedAt = new Date().toISOString();
    record.status = `TRAFFT-${event.toUpperCase()}`;
    record.milestones.visitCount = Math.max(1, record.milestones.visitCount);
    ensureLeadMilestone(record, "lead-m1-captured");
    if (nextStage === "booked") {
      ensureLeadMilestone(record, "lead-m3-booked-or-offered");
    }
    await upsertLeadRecord(record);
  }

  const trace = record?.trace ?? ensureTraceContext({
    tenant: tenantConfig.tenantId,
    source: "trafft-webhook",
    service: appointment.serviceName ?? "Strategy Call",
    niche: "general",
    blueprintId: "qualification-default",
    stepId: `trafft-${event}`,
    family: "qualification",
    leadKey,
    email: contact.email,
    phone: contact.phone,
  });

  const providerExecution = await recordProviderExecution({
    leadKey,
    provider: "Trafft",
    kind: `webhook:${event}`,
    ok: true,
    mode: "live",
    detail: `Trafft webhook accepted: ${TRAFFT_WEBHOOK_EVENT_META[event].label}`,
    payload,
  });

  let bookingJob = null;
  if (TRAFFT_WEBHOOK_EVENT_META[event].bookingStatus) {
    const latestBookingJob = (await getBookingJobs(leadKey))[0];
    bookingJob = await upsertBookingJob({
      id: latestBookingJob?.id,
      leadKey,
      provider: "Trafft",
      status: TRAFFT_WEBHOOK_EVENT_META[event].bookingStatus ?? "updated",
      detail: `Trafft webhook processed: ${TRAFFT_WEBHOOK_EVENT_META[event].label}`,
      payload: {
        ...payload,
        appointmentId: appointment.appointmentId,
        appointmentStatus: appointment.status,
        appointmentStart: appointment.startAt,
        serviceName: appointment.serviceName,
      },
    });
  }

  const canonicalEvent = createCanonicalEvent(
    trace,
    TRAFFT_WEBHOOK_EVENT_META[event].canonicalEventType,
    "internal",
    "received",
    {
      webhookEvent: event,
      appointmentId: appointment.appointmentId,
      appointmentStatus: appointment.status,
      appointmentStart: appointment.startAt,
      serviceName: appointment.serviceName,
      payload,
    },
  );
  await appendEvents([canonicalEvent]);

  return {
    success: true,
    event,
    leadKey,
    bookingJob,
    canonicalEvent,
    providerExecution,
  };
}
