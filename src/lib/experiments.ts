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

export type ExperienceExperimentPromotion = {
  experimentId: string;
  variantId: string;
  promotedAt: string;
  promotedBy?: string;
  reason?: string;
};

export type ExperienceExperimentAssignment = {
  experimentId: string;
  variantId: string;
  mode: ExperienceMode;
  holdout: boolean;
  randomized: boolean;
  promoted: boolean;
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

export function getExperienceExperimentDefinition(input: {
  nicheSlug: string;
  family: FunnelFamily;
  audience: MarketplaceAudience;
  device: "mobile" | "desktop";
}): { experimentId: string; variants: ExperimentVariant[] } | null {
  if (input.nicheSlug === "plumbing" && input.audience === "client" && input.family === "qualification") {
    return {
      experimentId: `plumbing-client-entry-v1:${input.device}`,
      variants: input.device === "mobile"
        ? [
            { id: "dispatch-proof", weight: 40, mode: "booking-first" },
            { id: "rapid-triage", weight: 40, mode: "chat-first" },
            { id: "holdout-light-form", weight: 20, mode: "form-first", holdout: true },
          ]
        : [
            { id: "dispatch-proof", weight: 50, mode: "booking-first" },
            { id: "comparison-assist", weight: 30, mode: "form-first" },
            { id: "holdout-light-form", weight: 20, mode: "form-first", holdout: true },
          ],
    };
  }

  if (input.nicheSlug === "plumbing" && input.audience === "provider" && input.family === "qualification") {
    return {
      experimentId: `plumbing-provider-entry-v1:${input.device}`,
      variants: [
        { id: "coverage-proof", weight: 55, mode: "form-first" },
        { id: "ops-guided", weight: 25, mode: "chat-first" },
        { id: "holdout-basic-form", weight: 20, mode: "form-first", holdout: true },
      ],
    };
  }

  return null;
}

export function isKnownExperimentVariant(experimentId: string, variantId: string) {
  const definitions = [
    getExperienceExperimentDefinition({
      nicheSlug: "plumbing",
      family: "qualification",
      audience: "client",
      device: "desktop",
    }),
    getExperienceExperimentDefinition({
      nicheSlug: "plumbing",
      family: "qualification",
      audience: "client",
      device: "mobile",
    }),
    getExperienceExperimentDefinition({
      nicheSlug: "plumbing",
      family: "qualification",
      audience: "provider",
      device: "desktop",
    }),
    getExperienceExperimentDefinition({
      nicheSlug: "plumbing",
      family: "qualification",
      audience: "provider",
      device: "mobile",
    }),
  ].filter((entry): entry is NonNullable<ReturnType<typeof getExperienceExperimentDefinition>> => Boolean(entry));

  const definition = definitions.find((entry) => entry.experimentId === experimentId);
  if (!definition) {
    return false;
  }
  return definition.variants.some((variant) => variant.id === variantId && variant.holdout !== true);
}

export function resolveExperienceExperiment(input: {
  assignmentKey?: string;
  nicheSlug: string;
  family: FunnelFamily;
  audience: MarketplaceAudience;
  device: "mobile" | "desktop";
  baseMode: ExperienceMode;
  promotions?: ExperienceExperimentPromotion[];
}) : ExperienceExperimentAssignment {
  const definition = getExperienceExperimentDefinition(input);
  const defaultAssignment: ExperienceExperimentAssignment = {
    experimentId: definition?.experimentId ?? `${input.nicheSlug}:${input.family}:${input.device}`,
    variantId: `${input.nicheSlug}:${input.family}:${input.baseMode}:${input.device}`,
    mode: input.baseMode,
    holdout: false,
    randomized: false,
    promoted: false,
  };

  const promoted = definition
    ? input.promotions?.find((promotion) => promotion.experimentId === definition.experimentId)
    : undefined;
  if (definition && promoted) {
    const promotedVariant = definition.variants.find((variant) => variant.id === promoted.variantId);
    if (promotedVariant) {
      return {
        experimentId: definition.experimentId,
        variantId: promotedVariant.id,
        mode: promotedVariant.mode,
        holdout: promotedVariant.holdout === true,
        randomized: false,
        promoted: true,
      };
    }
  }

  if (!definition || !input.assignmentKey) {
    return defaultAssignment;
  }

  const variant = pickVariant(hashToBucket(`${definition.experimentId}:${input.assignmentKey}`), definition.variants);
  return {
    experimentId: definition.experimentId,
    variantId: variant.id,
    mode: variant.mode,
    holdout: variant.holdout === true,
    randomized: true,
    promoted: false,
  };
}
