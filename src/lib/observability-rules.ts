export const OBSERVABILITY_RULE_IDS = [
  "dispatch-backlog",
  "provider-response-latency",
  "execution-failures",
  "zip-cell-liquidity",
  "provider-profitability",
  "generated-rollout-stall",
  "live-missing-url",
  "stale-rollout",
  "provider-capability-health",
  "deployment-verification",
] as const;

export const OBSERVABILITY_RULE_OPTIONS = [
  { id: "dispatch-backlog", label: "Dispatch backlog" },
  { id: "provider-response-latency", label: "Provider response latency" },
  { id: "execution-failures", label: "Execution failures" },
  { id: "zip-cell-liquidity", label: "ZIP-cell liquidity" },
  { id: "provider-profitability", label: "Provider profitability" },
  { id: "generated-rollout-stall", label: "Generated rollout stall" },
  { id: "live-missing-url", label: "Live deployment missing URL" },
  { id: "stale-rollout", label: "Stale rollout" },
  { id: "provider-capability-health", label: "Provider capability health" },
  { id: "deployment-verification", label: "Deployment verification" },
] as const;
