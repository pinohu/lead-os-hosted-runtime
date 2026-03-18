import { buildGrowthStackHealth } from "./growth-integrations.ts";
import { formatPortalLabel } from "./operator-ui.ts";
import type { CanonicalEvent } from "./trace.ts";
import type { ProviderExecutionRecord } from "./runtime-store.ts";
import type { OperationalRuntimeConfig } from "./runtime-config.ts";

type EventType =
  | "page_view"
  | "cta_clicked"
  | "form_started"
  | "form_step_completed"
  | "form_abandoned"
  | "lead_captured"
  | "call_started"
  | "call_answered"
  | "call_completed"
  | "checkout_started"
  | "payment_received"
  | "referral_invite_sent";

function countEvents(events: CanonicalEvent[], eventType: EventType) {
  return events.filter((event) => event.eventType === eventType);
}

function latestTimestamp(items: Array<{ timestamp?: string; createdAt?: string }>) {
  const timestamps = items
    .map((item) => item.timestamp ?? item.createdAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime());
  return timestamps[0];
}

function summarizeToolActivity(
  label: string,
  readiness: string,
  executions: ProviderExecutionRecord[],
) {
  const recent = executions.slice(0, 5);
  const successCount = recent.filter((entry) => entry.ok).length;
  const failureCount = recent.length - successCount;
  const latest = recent[0];

  return {
    label,
    readiness,
    totalExecutions: executions.length,
    successCount,
    failureCount,
    lastSeenAt: latest?.createdAt,
    lastDetail: latest?.detail ?? "No recorded activity yet.",
    tone:
      executions.length === 0
        ? "neutral"
        : failureCount > 0 && successCount === 0
          ? "danger"
          : failureCount > 0
            ? "warning"
            : "success",
  } as const;
}

export function buildGrowthOpsSnapshot(
  runtimeConfig: OperationalRuntimeConfig,
  events: CanonicalEvent[],
  providerExecutions: ProviderExecutionRecord[],
) {
  const health = buildGrowthStackHealth(runtimeConfig);
  const publicSignal = {
    pageViews: countEvents(events, "page_view"),
    ctaClicks: countEvents(events, "cta_clicked"),
    formStarts: countEvents(events, "form_started"),
    formSteps: countEvents(events, "form_step_completed"),
    formAbandons: countEvents(events, "form_abandoned"),
    leadsCaptured: countEvents(events, "lead_captured"),
  };
  const callSignal = {
    started: countEvents(events, "call_started"),
    answered: countEvents(events, "call_answered"),
    completed: countEvents(events, "call_completed"),
  };
  const valueSignal = {
    checkouts: countEvents(events, "checkout_started"),
    payments: countEvents(events, "payment_received"),
    referrals: countEvents(events, "referral_invite_sent"),
  };

  const executionGroups = {
    suiteDash: providerExecutions.filter((entry) => entry.provider === "SuiteDash" && entry.kind === "verification"),
    callScaler: providerExecutions.filter((entry) => entry.provider === "CallScaler" || entry.provider === "callscaler"),
    salespanel: providerExecutions.filter((entry) => entry.provider === "Salespanel"),
    plerdy: providerExecutions.filter((entry) => entry.provider === "Plerdy"),
    partnero: providerExecutions.filter((entry) => entry.provider === "Partnero"),
    thoughtly: providerExecutions.filter((entry) => entry.provider === "Thoughtly"),
  };

  const toolPulse = [
    summarizeToolActivity(
      "SuiteDash",
      health.suiteDash.portalReady ? "Portal configured" : "Portal URL missing",
      executionGroups.suiteDash,
    ),
    summarizeToolActivity(
      "CallScaler",
      health.callScaler.webhookReady ? "Webhook ready" : health.callScaler.scriptReady ? "Script ready" : "Activation missing",
      executionGroups.callScaler,
    ),
    summarizeToolActivity(
      "Salespanel",
      health.salespanel.enabled ? (health.salespanel.webhookReady ? "Enabled and wired" : "Enabled, webhook missing") : "Disabled",
      executionGroups.salespanel,
    ),
    summarizeToolActivity(
      "Plerdy",
      health.plerdy.enabled ? (health.plerdy.webhookReady ? "Enabled and wired" : "Enabled, webhook missing") : "Disabled",
      executionGroups.plerdy,
    ),
    summarizeToolActivity(
      "Partnero",
      health.partnero.webhookReady ? "Referral webhook ready" : "Webhook missing",
      executionGroups.partnero,
    ),
    summarizeToolActivity(
      "Thoughtly",
      health.thoughtly.webhookReady ? "Voice recovery ready" : "Webhook missing",
      executionGroups.thoughtly,
    ),
  ];

  const blockers = [
    !health.callScaler.webhookReady && health.callScaler.dynamicNumbers > 0
      ? "Call tracking numbers exist, but CallScaler webhook activation is still missing."
      : null,
    health.salespanel.enabled && !health.salespanel.webhookReady
      ? "Salespanel is enabled without a webhook, so behavioral scoring cannot be verified server-side."
      : null,
    health.plerdy.enabled && !health.plerdy.webhookReady
      ? "Plerdy is enabled without an event webhook, so CRO instrumentation cannot be confirmed from the runtime."
      : null,
    health.partnero.webhookReady && executionGroups.partnero.length === 0
      ? "Partnero is configured, but no referral enrollment activity has been recorded yet."
      : null,
    health.thoughtly.afterHoursEnabled && executionGroups.thoughtly.length === 0
      ? "Thoughtly after-hours recovery is enabled, but no voice recovery activity has been recorded yet."
      : null,
    publicSignal.pageViews.length > 0 && publicSignal.ctaClicks.length === 0
      ? "Public funnels are receiving page views, but no CTA clicks have been recorded yet."
      : null,
    publicSignal.formStarts.length > 0 && publicSignal.leadsCaptured.length === 0
      ? "Forms are starting, but no captured leads have been recorded yet."
      : null,
  ].filter((entry): entry is string => Boolean(entry));

  const pulse = [
    {
      label: "Page views",
      value: publicSignal.pageViews.length,
      detail: latestTimestamp(publicSignal.pageViews) ? `Last seen ${latestTimestamp(publicSignal.pageViews)}` : "No page views recorded yet.",
    },
    {
      label: "CTA clicks",
      value: publicSignal.ctaClicks.length,
      detail: latestTimestamp(publicSignal.ctaClicks) ? `Last seen ${latestTimestamp(publicSignal.ctaClicks)}` : "No CTA clicks recorded yet.",
    },
    {
      label: "Form starts",
      value: publicSignal.formStarts.length,
      detail: latestTimestamp(publicSignal.formStarts) ? `Last seen ${latestTimestamp(publicSignal.formStarts)}` : "No form starts recorded yet.",
    },
    {
      label: "Calls completed",
      value: callSignal.completed.length,
      detail: latestTimestamp(callSignal.completed) ? `Last seen ${latestTimestamp(callSignal.completed)}` : "No completed calls recorded yet.",
    },
    {
      label: "Checkouts started",
      value: valueSignal.checkouts.length,
      detail: latestTimestamp(valueSignal.checkouts) ? `Last seen ${latestTimestamp(valueSignal.checkouts)}` : "No checkout starts recorded yet.",
    },
    {
      label: "Referrals sent",
      value: valueSignal.referrals.length,
      detail: latestTimestamp(valueSignal.referrals) ? `Last seen ${latestTimestamp(valueSignal.referrals)}` : "No referral invites recorded yet.",
    },
  ];

  const funnelBreakdown = [
    {
      label: "Top-of-funnel",
      steps: [
        `Page views: ${publicSignal.pageViews.length}`,
        `CTA clicks: ${publicSignal.ctaClicks.length}`,
      ],
    },
    {
      label: "Form engagement",
      steps: [
        `Starts: ${publicSignal.formStarts.length}`,
        `Completed steps: ${publicSignal.formSteps.length}`,
        `Abandons: ${publicSignal.formAbandons.length}`,
      ],
    },
    {
      label: "Value path",
      steps: [
        `Leads captured: ${publicSignal.leadsCaptured.length}`,
        `Checkouts started: ${valueSignal.checkouts.length}`,
        `Payments received: ${valueSignal.payments.length}`,
      ],
    },
  ];

  const recentActivity = providerExecutions
    .filter((entry) =>
      ["Salespanel", "Plerdy", "CallScaler", "Partnero", "Thoughtly", "SuiteDash"].includes(entry.provider))
    .slice(0, 12)
    .map((entry) => ({
      provider: entry.provider,
      kind: formatPortalLabel(entry.kind),
      detail: entry.detail,
      createdAt: entry.createdAt,
      tone: entry.ok ? "success" : entry.mode === "prepared" ? "warning" : "danger",
    }));

  return {
    health,
    metrics: {
      pageViews: publicSignal.pageViews.length,
      ctaClicks: publicSignal.ctaClicks.length,
      formStarts: publicSignal.formStarts.length,
      formSteps: publicSignal.formSteps.length,
      formAbandons: publicSignal.formAbandons.length,
      leadsCaptured: publicSignal.leadsCaptured.length,
      callsStarted: callSignal.started.length,
      callsAnswered: callSignal.answered.length,
      callsCompleted: callSignal.completed.length,
      checkoutsStarted: valueSignal.checkouts.length,
      paymentsReceived: valueSignal.payments.length,
      referralsSent: valueSignal.referrals.length,
    },
    pulse,
    funnelBreakdown,
    toolPulse,
    blockers,
    recentActivity,
  };
}
