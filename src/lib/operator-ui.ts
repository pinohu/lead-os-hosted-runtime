import {
  CUSTOMER_MILESTONES,
  LEAD_MILESTONES,
  type CustomerMilestoneId,
  type LeadMilestoneId,
} from "./runtime-schema.ts";

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

export function formatMilestoneIdForDisplay(
  milestoneId: LeadMilestoneId | CustomerMilestoneId | string,
) {
  return milestoneLabelMap.get(milestoneId) ?? formatPortalLabel(milestoneId);
}
