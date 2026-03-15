import type { FunnelFamily, MarketplaceAudience } from "./runtime-schema.ts";
import type { ExperienceMode } from "./experience.ts";

export const EXPERIENCE_ASSIGNMENT_COOKIE = "leados_assignment_id";
export const EXPERIENCE_ASSIGNMENT_HEADER = "x-leados-assignment-id";

type ExperimentVariant = {
  id: string;
  weight: number;
  mode: ExperienceMode;
  holdout?: boolean;
};

export type ExperienceExperimentAssignment = {
  experimentId: string;
  variantId: string;
  mode: ExperienceMode;
  holdout: boolean;
  randomized: boolean;
};

function hashToBucket(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash % 100);
}

function pickVariant(bucket: number, variants: ExperimentVariant[]) {
  let cursor = 0;
  for (const variant of variants) {
    cursor += variant.weight;
    if (bucket < cursor) {
      return variant;
    }
  }
  return variants[variants.length - 1]!;
}

export function resolveExperienceExperiment(input: {
  assignmentKey?: string;
  nicheSlug: string;
  family: FunnelFamily;
  audience: MarketplaceAudience;
  device: "mobile" | "desktop";
  baseMode: ExperienceMode;
}) : ExperienceExperimentAssignment {
  const defaultAssignment: ExperienceExperimentAssignment = {
    experimentId: `${input.nicheSlug}:${input.family}:${input.device}`,
    variantId: `${input.nicheSlug}:${input.family}:${input.baseMode}:${input.device}`,
    mode: input.baseMode,
    holdout: false,
    randomized: false,
  };

  if (!input.assignmentKey) {
    return defaultAssignment;
  }

  if (input.nicheSlug === "plumbing" && input.audience === "client" && input.family === "qualification") {
    const variants: ExperimentVariant[] = input.device === "mobile"
      ? [
          { id: "dispatch-proof", weight: 40, mode: "booking-first" },
          { id: "rapid-triage", weight: 40, mode: "chat-first" },
          { id: "holdout-light-form", weight: 20, mode: "form-first", holdout: true },
        ]
      : [
          { id: "dispatch-proof", weight: 50, mode: "booking-first" },
          { id: "comparison-assist", weight: 30, mode: "form-first" },
          { id: "holdout-light-form", weight: 20, mode: "form-first", holdout: true },
        ];
    const experimentId = `plumbing-client-entry-v1:${input.device}`;
    const variant = pickVariant(hashToBucket(`${experimentId}:${input.assignmentKey}`), variants);
    return {
      experimentId,
      variantId: variant.id,
      mode: variant.mode,
      holdout: variant.holdout === true,
      randomized: true,
    };
  }

  if (input.nicheSlug === "plumbing" && input.audience === "provider" && input.family === "qualification") {
    const variants: ExperimentVariant[] = [
      { id: "coverage-proof", weight: 55, mode: "form-first" },
      { id: "ops-guided", weight: 25, mode: "chat-first" },
      { id: "holdout-basic-form", weight: 20, mode: "form-first", holdout: true },
    ];
    const experimentId = `plumbing-provider-entry-v1:${input.device}`;
    const variant = pickVariant(hashToBucket(`${experimentId}:${input.assignmentKey}`), variants);
    return {
      experimentId,
      variantId: variant.id,
      mode: variant.mode,
      holdout: variant.holdout === true,
      randomized: true,
    };
  }

  return defaultAssignment;
}
