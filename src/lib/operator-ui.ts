import {
  CUSTOMER_MILESTONES,
  LEAD_MILESTONES,
  type CustomerMilestoneId,
  type LeadMilestoneId,
} from "./runtime-schema.ts";
import type { StoredLeadRecord } from "./runtime-store.ts";

const milestoneLabelMap = new Map<string, string>([
  ...LEAD_MILESTONES.map(
    (milestone): [string, string] => [milestone.id, milestone.label],
  ),
  ...CUSTOMER_MILESTONES.map(
    (milestone): [string, string] => [milestone.id, milestone.label],
  ),
]);

export function formatPortalLabel(value: string) {
  return value.replace(/[_-]/g, " ");
}

export function formatLeadKeyForDisplay(leadKey: string) {
  if (leadKey.startsWith("email:")) {
    return leadKey.slice("email:".length);
  }
  if (leadKey.startsWith("phone:")) {
    return leadKey.slice("phone:".length);
  }
  return leadKey;
}

export function buildLeadDisplayName(
  lead: Pick<StoredLeadRecord, "leadKey" | "firstName" | "lastName" | "company" | "email" | "phone">,
) {
  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim();
  if (fullName) {
    return fullName;
  }
  if (lead.company?.trim()) {
    return lead.company.trim();
  }
  if (lead.email?.trim()) {
    return lead.email.trim();
  }
  if (lead.phone?.trim()) {
    return lead.phone.trim();
  }
  return formatLeadKeyForDisplay(lead.leadKey);
}

export function buildLeadSubline(
  lead: Pick<StoredLeadRecord, "company" | "email" | "phone">,
) {
  return [lead.company, lead.email, lead.phone]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => value.trim())
    .join(" | ");
}

export function formatOptionalDateTime(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatMilestoneIdForDisplay(
  milestoneId: LeadMilestoneId | CustomerMilestoneId | string,
) {
  return milestoneLabelMap.get(milestoneId) ?? formatPortalLabel(milestoneId);
}

export function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Not captured";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatReviewRating(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Not captured";
  }
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)} / 5`;
}
