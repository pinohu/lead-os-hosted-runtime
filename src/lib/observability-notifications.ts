import type { ObservabilityRuleResult } from "./operator-observability.ts";
import { sendEmailAction, sendSmsAction, sendWhatsAppAction } from "./providers.ts";
import type { OperationalRuntimeConfig } from "./runtime-config.ts";
import {
  getObservabilityAlertDeliveries,
  recordObservabilityAlertDelivery,
  type ObservabilityAlertChannel,
  type ObservabilityAlertDeliveryRecord,
} from "./runtime-store.ts";
import { tenantConfig } from "./tenant.ts";
import { ensureTraceContext } from "./trace.ts";

type NotificationRecipient = OperationalRuntimeConfig["observability"]["notifications"]["recipients"][number];

type SenderDependencies = {
  email: typeof sendEmailAction;
  sms: typeof sendSmsAction;
  whatsapp: typeof sendWhatsAppAction;
};

type DeliveryDependencies = {
  senders: SenderDependencies;
  getDeliveries: typeof getObservabilityAlertDeliveries;
  recordDelivery: typeof recordObservabilityAlertDelivery;
  now: () => Date;
};

export interface ObservabilityNotificationOutcome {
  ruleId: string;
  recipientId: string;
  recipientLabel: string;
  channel: ObservabilityAlertChannel;
  status: ObservabilityAlertDeliveryRecord["status"];
  detail: string;
  href: string;
}

function uniqueChannels(channels: ObservabilityAlertChannel[]) {
  return [...new Set(channels)];
}

function buildFallbackRecipient(config: OperationalRuntimeConfig) {
  const supportEmail = tenantConfig.supportEmail.trim().toLowerCase();
  if (!supportEmail || supportEmail.endsWith("@example.com")) {
    return null;
  }

  return {
    id: "default-support-email",
    label: `${tenantConfig.brandName} support`,
    active: true,
    email: supportEmail,
    phone: undefined,
    channels: ["email"] as ObservabilityAlertChannel[],
    ruleIds: [] as string[],
  } satisfies NotificationRecipient;
}

export function getObservabilityNotificationRecipients(config: OperationalRuntimeConfig) {
  const configured = config.observability.notifications.recipients.filter((recipient) => recipient.active);
  if (configured.length > 0) {
    return configured;
  }

  const fallback = buildFallbackRecipient(config);
  return fallback ? [fallback] : [];
}

function ruleMatchesRecipient(rule: ObservabilityRuleResult, recipient: NotificationRecipient) {
  return recipient.ruleIds.length === 0 || recipient.ruleIds.includes(rule.id);
}

function buildRuleUrl(href: string) {
  return href.startsWith("http://") || href.startsWith("https://")
    ? href
    : `${tenantConfig.siteUrl}${href}`;
}

function buildPreferredChannels(
  rule: ObservabilityRuleResult,
  config: OperationalRuntimeConfig,
  recipient: NotificationRecipient,
) {
  const candidates: ObservabilityAlertChannel[] = [];
  if (rule.notificationChannel !== "dashboard") {
    candidates.push(rule.notificationChannel);
  }
  candidates.push(config.observability.notifications.defaultChannel);
  candidates.push(...recipient.channels);

  return uniqueChannels(candidates).filter((channel) => {
    if (!recipient.channels.includes(channel)) {
      return false;
    }
    if (channel === "email") {
      return Boolean(recipient.email);
    }
    return Boolean(recipient.phone);
  });
}

function buildNotificationBody(rule: ObservabilityRuleResult) {
  const ruleUrl = buildRuleUrl(rule.href);
  return {
    subject: `[${tenantConfig.brandName}] ${rule.title}`,
    emailHtml: [
      `<p><strong>${rule.title}</strong></p>`,
      `<p><strong>Threshold:</strong> ${rule.thresholdLabel}</p>`,
      `<p><strong>Current state:</strong> ${rule.currentLabel}</p>`,
      `<p><strong>Recommended action:</strong> ${rule.resolution}</p>`,
      `<p><a href="${ruleUrl}">Open drill-through</a></p>`,
    ].join(""),
    messageText: [
      `${tenantConfig.brandName} alert: ${rule.title}`,
      `Current state: ${rule.currentLabel}`,
      `Action: ${rule.resolution}`,
      `Open: ${ruleUrl}`,
    ].join(" | "),
    href: ruleUrl,
  };
}

function buildTrace(rule: ObservabilityRuleResult) {
  return ensureTraceContext({
    tenant: tenantConfig.tenantId,
    source: "internal",
    service: "observability",
    niche: "plumbing",
    leadKey: `ops-alert:${rule.id}`,
    blueprintId: "observability-alert",
    stepId: rule.id,
  });
}

async function isCoolingDown(
  rule: ObservabilityRuleResult,
  recipient: NotificationRecipient,
  channel: ObservabilityAlertChannel,
  cooldownMinutes: number,
  getDeliveries: DeliveryDependencies["getDeliveries"],
  now: Date,
) {
  if (cooldownMinutes <= 0) {
    return false;
  }

  const recent = await getDeliveries({
    ruleId: rule.id,
    recipientId: recipient.id,
    channel,
    status: "sent",
  });
  const latest = recent[0];
  if (!latest) {
    return false;
  }

  const elapsedMs = now.getTime() - new Date(latest.createdAt).getTime();
  return elapsedMs < cooldownMinutes * 60_000;
}

async function sendChannelNotification(
  channel: ObservabilityAlertChannel,
  recipient: NotificationRecipient,
  rule: ObservabilityRuleResult,
  deps: DeliveryDependencies,
) {
  const body = buildNotificationBody(rule);
  if (channel === "email" && recipient.email) {
    const result = await deps.senders.email({
      to: recipient.email,
      subject: body.subject,
      html: body.emailHtml,
      trace: buildTrace(rule),
    });
    return {
      ok: result.ok,
      detail: result.detail,
      payload: { provider: result.provider, mode: result.mode, result: result.payload },
      href: body.href,
    };
  }
  if (channel === "sms" && recipient.phone) {
    const result = await deps.senders.sms({
      phone: recipient.phone,
      body: body.messageText,
    });
    return {
      ok: result.ok,
      detail: result.detail,
      payload: { provider: result.provider, mode: result.mode, result: result.payload },
      href: body.href,
    };
  }
  if (channel === "whatsapp" && recipient.phone) {
    const result = await deps.senders.whatsapp({
      phone: recipient.phone,
      body: body.messageText,
    });
    return {
      ok: result.ok,
      detail: result.detail,
      payload: { provider: result.provider, mode: result.mode, result: result.payload },
      href: body.href,
    };
  }

  return {
    ok: false,
    detail: `Recipient is missing a ${channel} destination.`,
    payload: undefined,
    href: body.href,
  };
}

export async function dispatchObservabilityNotifications(
  rules: ObservabilityRuleResult[],
  config: OperationalRuntimeConfig,
  overrides: Partial<DeliveryDependencies> = {},
) {
  const { senders: overrideSenders, ...restOverrides } = overrides;
  const deps: DeliveryDependencies = {
    ...restOverrides,
    senders: {
      email: overrideSenders?.email ?? sendEmailAction,
      sms: overrideSenders?.sms ?? sendSmsAction,
      whatsapp: overrideSenders?.whatsapp ?? sendWhatsAppAction,
    },
    getDeliveries: restOverrides.getDeliveries ?? getObservabilityAlertDeliveries,
    recordDelivery: restOverrides.recordDelivery ?? recordObservabilityAlertDelivery,
    now: restOverrides.now ?? (() => new Date()),
  };

  const recipients = getObservabilityNotificationRecipients(config);
  const cooldownMinutes = config.observability.notifications.cooldownMinutes;
  const outcomes: ObservabilityNotificationOutcome[] = [];

  for (const rule of rules.filter((entry) => entry.triggered)) {
    for (const recipient of recipients.filter((entry) => ruleMatchesRecipient(rule, entry))) {
      const preferredChannels = buildPreferredChannels(rule, config, recipient);
      if (preferredChannels.length === 0) {
        const href = buildRuleUrl(rule.href);
        await deps.recordDelivery({
          ruleId: rule.id,
          title: rule.title,
          recipientId: recipient.id,
          recipientLabel: recipient.label,
          channel: config.observability.notifications.defaultChannel,
          status: "suppressed",
          detail: "No usable channel is configured for this recipient.",
          href,
          payload: { configuredChannels: recipient.channels },
        });
        outcomes.push({
          ruleId: rule.id,
          recipientId: recipient.id,
          recipientLabel: recipient.label,
          channel: config.observability.notifications.defaultChannel,
          status: "suppressed",
          detail: "No usable channel is configured for this recipient.",
          href,
        });
        continue;
      }

      const channel = preferredChannels[0];
      const now = deps.now();
      if (await isCoolingDown(rule, recipient, channel, cooldownMinutes, deps.getDeliveries, now)) {
        const href = buildRuleUrl(rule.href);
        const detail = `Cooldown active for ${cooldownMinutes} minute${cooldownMinutes === 1 ? "" : "s"}.`;
        await deps.recordDelivery({
          ruleId: rule.id,
          title: rule.title,
          recipientId: recipient.id,
          recipientLabel: recipient.label,
          channel,
          status: "suppressed",
          detail,
          href,
          payload: { currentLabel: rule.currentLabel },
          createdAt: now.toISOString(),
        });
        outcomes.push({
          ruleId: rule.id,
          recipientId: recipient.id,
          recipientLabel: recipient.label,
          channel,
          status: "suppressed",
          detail,
          href,
        });
        continue;
      }

      const delivery = await sendChannelNotification(channel, recipient, rule, deps);
      const status = delivery.ok ? "sent" : "failed";
      await deps.recordDelivery({
        ruleId: rule.id,
        title: rule.title,
        recipientId: recipient.id,
        recipientLabel: recipient.label,
        channel,
        status,
        detail: delivery.detail,
        href: delivery.href,
        payload: {
          thresholdLabel: rule.thresholdLabel,
          currentLabel: rule.currentLabel,
          resolution: rule.resolution,
          providerResult: delivery.payload,
        },
        createdAt: now.toISOString(),
      });
      outcomes.push({
        ruleId: rule.id,
        recipientId: recipient.id,
        recipientLabel: recipient.label,
        channel,
        status,
        detail: delivery.detail,
        href: delivery.href,
      });
    }
  }

  return outcomes;
}
