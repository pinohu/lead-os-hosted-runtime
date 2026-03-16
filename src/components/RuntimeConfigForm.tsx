"use client";

import { useDeferredValue, useState, useTransition, type FormEvent } from "react";
import type { TrafftServiceOption } from "@/lib/provider-discovery";
import { OBSERVABILITY_RULE_IDS, OBSERVABILITY_RULE_OPTIONS } from "@/lib/observability-rules";
import type { OperationalRuntimeConfig } from "@/lib/runtime-config";

type ServiceMapRow = {
  id: string;
  label: string;
  serviceId: string;
};

type DispatchProviderRow = {
  id: string;
  label: string;
  contactEmail: string;
  phone: string;
  active: boolean;
  acceptingNewJobs: boolean;
  priorityWeight: string;
  maxConcurrentJobs: string;
  activeJobs: string;
  acceptsEmergency: boolean;
  acceptsCommercial: boolean;
  propertyTypes: string;
  issueTypes: string;
  states: string;
  counties: string;
  cities: string;
  zipPrefixes: string;
  emergencyCoverageWindow: string;
  payoutModel: "flat-fee" | "revenue-share";
  payoutFlatFee: string;
  payoutSharePercent: string;
  payoutNotes: string;
};

type ZipAcquisitionCostRow = {
  id: string;
  zipPrefix: string;
  acquisitionCost: string;
};

type NotificationRecipientRow = {
  id: string;
  label: string;
  email: string;
  phone: string;
  active: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  ruleIds: string;
};

type Props = {
  initialConfig: OperationalRuntimeConfig;
  trafftServices: TrafftServiceOption[];
};

const OBSERVABILITY_RULE_ID_SET = new Set<string>(OBSERVABILITY_RULE_IDS);

function createServiceMapRow(label = "", serviceId = ""): ServiceMapRow {
  return {
    id:
      globalThis.crypto?.randomUUID?.()
      ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label,
    serviceId,
  };
}

function createDispatchProviderRow(
  row: Partial<DispatchProviderRow> = {},
): DispatchProviderRow {
  return {
    id:
      row.id
      ?? globalThis.crypto?.randomUUID?.()
      ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label: row.label ?? "",
    contactEmail: row.contactEmail ?? "",
    phone: row.phone ?? "",
    active: row.active ?? true,
    acceptingNewJobs: row.acceptingNewJobs ?? true,
    priorityWeight: row.priorityWeight ?? "50",
    maxConcurrentJobs: row.maxConcurrentJobs ?? "",
    activeJobs: row.activeJobs ?? "",
    acceptsEmergency: row.acceptsEmergency ?? true,
    acceptsCommercial: row.acceptsCommercial ?? false,
    propertyTypes: row.propertyTypes ?? "",
    issueTypes: row.issueTypes ?? "",
    states: row.states ?? "",
    counties: row.counties ?? "",
    cities: row.cities ?? "",
    zipPrefixes: row.zipPrefixes ?? "",
    emergencyCoverageWindow: row.emergencyCoverageWindow ?? "",
    payoutModel: row.payoutModel ?? "flat-fee",
    payoutFlatFee: row.payoutFlatFee ?? "",
    payoutSharePercent: row.payoutSharePercent ?? "",
    payoutNotes: row.payoutNotes ?? "",
  };
}

function createZipAcquisitionCostRow(
  row: Partial<ZipAcquisitionCostRow> = {},
): ZipAcquisitionCostRow {
  return {
    id:
      row.id
      ?? globalThis.crypto?.randomUUID?.()
      ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    zipPrefix: row.zipPrefix ?? "",
    acquisitionCost: row.acquisitionCost ?? "",
  };
}

function createNotificationRecipientRow(
  row: Partial<NotificationRecipientRow> = {},
): NotificationRecipientRow {
  return {
    id:
      row.id
      ?? globalThis.crypto?.randomUUID?.()
      ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label: row.label ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    active: row.active ?? true,
    emailEnabled: row.emailEnabled ?? Boolean(row.email),
    smsEnabled: row.smsEnabled ?? false,
    whatsappEnabled: row.whatsappEnabled ?? false,
    ruleIds: row.ruleIds ?? "",
  };
}

function buildServiceMapRows(serviceMap: Record<string, string>) {
  return Object.entries(serviceMap).map(([label, serviceId]) => createServiceMapRow(label, serviceId));
}

function buildDispatchProviderRows(providers: OperationalRuntimeConfig["dispatch"]["providers"]) {
  return providers.map((provider) => createDispatchProviderRow({
    id: provider.id,
    label: provider.label,
    contactEmail: provider.contactEmail ?? "",
    phone: provider.phone ?? "",
    active: provider.active,
    acceptingNewJobs: provider.acceptingNewJobs,
    priorityWeight: String(provider.priorityWeight),
    maxConcurrentJobs: provider.maxConcurrentJobs == null ? "" : String(provider.maxConcurrentJobs),
    activeJobs: provider.activeJobs == null ? "" : String(provider.activeJobs),
    acceptsEmergency: provider.acceptsEmergency,
    acceptsCommercial: provider.acceptsCommercial,
    propertyTypes: provider.propertyTypes.join(", "),
    issueTypes: provider.issueTypes.join(", "),
    states: provider.states.join(", "),
    counties: provider.counties.join(", "),
    cities: provider.cities.join(", "),
    zipPrefixes: provider.zipPrefixes.join(", "),
    emergencyCoverageWindow: provider.emergencyCoverageWindow ?? "",
    payoutModel: provider.payoutModel ?? "flat-fee",
    payoutFlatFee: provider.payoutFlatFee == null ? "" : String(provider.payoutFlatFee),
    payoutSharePercent: provider.payoutSharePercent == null ? "" : String(provider.payoutSharePercent),
    payoutNotes: provider.payoutNotes ?? "",
  }));
}

function buildZipAcquisitionCostRows(costs: Record<string, number>) {
  return Object.entries(costs).map(([zipPrefix, acquisitionCost]) =>
    createZipAcquisitionCostRow({
      zipPrefix,
      acquisitionCost: String(acquisitionCost),
    })
  );
}

function buildNotificationRecipientRows(
  recipients: OperationalRuntimeConfig["observability"]["notifications"]["recipients"],
) {
  return recipients.map((recipient) => createNotificationRecipientRow({
    id: recipient.id,
    label: recipient.label,
    email: recipient.email ?? "",
    phone: recipient.phone ?? "",
    active: recipient.active,
    emailEnabled: recipient.channels.includes("email"),
    smsEnabled: recipient.channels.includes("sms"),
    whatsappEnabled: recipient.channels.includes("whatsapp"),
    ruleIds: recipient.ruleIds.join(", "),
  }));
}

function normalizeServiceLabel(value: string) {
  return value.trim().toLowerCase();
}

function normalizeList(value: string) {
  return [...new Set(value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean))];
}

function formatTrafftServiceMeta(service: TrafftServiceOption) {
  return [
    `ID ${service.id}`,
    service.slug ? `slug ${service.slug}` : null,
    service.durationLabel ?? null,
    service.priceLabel ?? null,
    service.capacityLabel ?? null,
    service.source === "admin" ? "Admin API" : "Public API",
  ].filter(Boolean).join(" · ");
}

export function RuntimeConfigForm({ initialConfig, trafftServices }: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [observabilityDefaultChannel, setObservabilityDefaultChannel] = useState(initialConfig.observability.notifications.defaultChannel);
  const [observabilityCooldownMinutes, setObservabilityCooldownMinutes] = useState(String(initialConfig.observability.notifications.cooldownMinutes));
  const [notificationRecipientRows, setNotificationRecipientRows] = useState<NotificationRecipientRow[]>(() =>
    buildNotificationRecipientRows(initialConfig.observability.notifications.recipients)
  );
  const [trafftPublicBookingUrl, setTrafftPublicBookingUrl] = useState(initialConfig.trafft.publicBookingUrl ?? "");
  const [trafftDefaultServiceId, setTrafftDefaultServiceId] = useState(initialConfig.trafft.defaultServiceId ?? "");
  const [trafftServiceMapRows, setTrafftServiceMapRows] = useState<ServiceMapRow[]>(() => buildServiceMapRows(initialConfig.trafft.serviceMap));
  const [dispatchProviderRows, setDispatchProviderRows] = useState<DispatchProviderRow[]>(() => buildDispatchProviderRows(initialConfig.dispatch.providers));
  const [defaultLeadAcquisitionCost, setDefaultLeadAcquisitionCost] = useState(initialConfig.marketplace.defaultLeadAcquisitionCost == null ? "" : String(initialConfig.marketplace.defaultLeadAcquisitionCost));
  const [zipAcquisitionCostRows, setZipAcquisitionCostRows] = useState<ZipAcquisitionCostRow[]>(() => buildZipAcquisitionCostRows(initialConfig.marketplace.zipLeadAcquisitionCosts));
  const [trafftServiceSearch, setTrafftServiceSearch] = useState("");
  const [documenteroDefaultFormat, setDocumenteroDefaultFormat] = useState(initialConfig.documentero.defaultFormat ?? "pdf");
  const [documenteroProposalTemplateId, setDocumenteroProposalTemplateId] = useState(initialConfig.documentero.proposalTemplateId ?? "");
  const [documenteroAgreementTemplateId, setDocumenteroAgreementTemplateId] = useState(initialConfig.documentero.agreementTemplateId ?? "");
  const [documenteroOnboardingTemplateId, setDocumenteroOnboardingTemplateId] = useState(initialConfig.documentero.onboardingTemplateId ?? "");
  const [croveWebhookUrl, setCroveWebhookUrl] = useState(initialConfig.crove.webhookUrl ?? "");
  const [croveProposalTemplateId, setCroveProposalTemplateId] = useState(initialConfig.crove.proposalTemplateId ?? "");
  const [croveAgreementTemplateId, setCroveAgreementTemplateId] = useState(initialConfig.crove.agreementTemplateId ?? "");
  const [croveOnboardingTemplateId, setCroveOnboardingTemplateId] = useState(initialConfig.crove.onboardingTemplateId ?? "");
  const deferredTrafftServiceSearch = useDeferredValue(trafftServiceSearch);
  const filteredTrafftServices = trafftServices.filter((service) => {
    const query = deferredTrafftServiceSearch.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return [
      service.label,
      service.id,
      service.slug,
    ].some((value) => typeof value === "string" && value.toLowerCase().includes(query));
  });

  function updateServiceMapRow(rowId: string, patch: Partial<ServiceMapRow>) {
    setTrafftServiceMapRows((rows) => rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  }

  function removeServiceMapRow(rowId: string) {
    setTrafftServiceMapRows((rows) => rows.filter((row) => row.id !== rowId));
  }

  function addBlankServiceMapRow() {
    setTrafftServiceMapRows((rows) => [...rows, createServiceMapRow()]);
  }

  function updateDispatchProviderRow(rowId: string, patch: Partial<DispatchProviderRow>) {
    setDispatchProviderRows((rows) => rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  }

  function removeDispatchProviderRow(rowId: string) {
    setDispatchProviderRows((rows) => rows.filter((row) => row.id !== rowId));
  }

  function addDispatchProviderRow() {
    setDispatchProviderRows((rows) => [...rows, createDispatchProviderRow()]);
  }

  function updateZipAcquisitionCostRow(rowId: string, patch: Partial<ZipAcquisitionCostRow>) {
    setZipAcquisitionCostRows((rows) => rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  }

  function removeZipAcquisitionCostRow(rowId: string) {
    setZipAcquisitionCostRows((rows) => rows.filter((row) => row.id !== rowId));
  }

  function addZipAcquisitionCostRow() {
    setZipAcquisitionCostRows((rows) => [...rows, createZipAcquisitionCostRow()]);
  }

  function updateNotificationRecipientRow(rowId: string, patch: Partial<NotificationRecipientRow>) {
    setNotificationRecipientRows((rows) => rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  }

  function removeNotificationRecipientRow(rowId: string) {
    setNotificationRecipientRows((rows) => rows.filter((row) => row.id !== rowId));
  }

  function addNotificationRecipientRow() {
    setNotificationRecipientRows((rows) => [...rows, createNotificationRecipientRow()]);
  }

  function addSuggestedMapping(service: TrafftServiceOption) {
    const normalizedLabel = normalizeServiceLabel(service.label);
    setTrafftServiceMapRows((rows) => {
      const existing = rows.find((row) => normalizeServiceLabel(row.label) === normalizedLabel);
      if (existing) {
        return rows.map((row) =>
          row.id === existing.id
            ? { ...row, serviceId: service.id }
            : row,
        );
      }

      return [...rows, createServiceMapRow(service.label, service.id)];
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    const parsedServiceMap: Record<string, string> = {};
    const seenLabels = new Set<string>();
    const parsedNotificationRecipients: OperationalRuntimeConfig["observability"]["notifications"]["recipients"] = [];
    const parsedDispatchProviders: OperationalRuntimeConfig["dispatch"]["providers"] = [];
    const parsedZipAcquisitionCosts: Record<string, number> = {};
    const parsedCooldownMinutes = Number(observabilityCooldownMinutes || "0");

    if (!Number.isFinite(parsedCooldownMinutes) || parsedCooldownMinutes < 0) {
      setError("Observability cooldown must be a non-negative number of minutes.");
      return;
    }

    for (const row of notificationRecipientRows) {
      const label = row.label.trim();
      const email = row.email.trim().toLowerCase();
      const phone = row.phone.trim();
      const channels = [
        ...(row.emailEnabled ? ["email" as const] : []),
        ...(row.smsEnabled ? ["sms" as const] : []),
        ...(row.whatsappEnabled ? ["whatsapp" as const] : []),
      ];

      if (!label && !email && !phone && row.ruleIds.trim().length === 0) {
        continue;
      }

      if (!label) {
        setError("Each observability recipient needs a label.");
        return;
      }
      if (channels.includes("email") && !email) {
        setError(`Observability recipient "${label}" is missing an email address for email paging.`);
        return;
      }
      if ((channels.includes("sms") || channels.includes("whatsapp")) && !phone) {
        setError(`Observability recipient "${label}" needs a phone number for SMS or WhatsApp paging.`);
        return;
      }
      if (channels.length === 0) {
        setError(`Observability recipient "${label}" needs at least one notification channel.`);
        return;
      }
      const ruleIds = normalizeList(row.ruleIds);
      const unknownRuleIds = ruleIds.filter((ruleId) => !OBSERVABILITY_RULE_ID_SET.has(ruleId));
      if (unknownRuleIds.length > 0) {
        setError(`Observability recipient "${label}" includes unknown rules: ${unknownRuleIds.join(", ")}.`);
        return;
      }

      parsedNotificationRecipients.push({
        id: row.id,
        label,
        email: email || undefined,
        phone: phone || undefined,
        active: row.active,
        channels,
        ruleIds,
      });
    }

    for (const row of trafftServiceMapRows) {
      const label = row.label.trim();
      const serviceId = row.serviceId.trim();

      if (!label && !serviceId) {
        continue;
      }

      if (!label || !serviceId) {
        setError("Each Trafft mapping row needs both a LeadOS service label and a Trafft service ID.");
        return;
      }

      const normalizedLabel = normalizeServiceLabel(label);
      if (seenLabels.has(normalizedLabel)) {
        setError(`Duplicate Trafft mapping detected for "${label}".`);
        return;
      }

      seenLabels.add(normalizedLabel);
      parsedServiceMap[normalizedLabel] = serviceId;
    }

    for (const row of dispatchProviderRows) {
      const label = row.label.trim();
      if (!label) {
        if (
          !row.maxConcurrentJobs.trim() &&
          !row.activeJobs.trim() &&
          !row.states.trim() &&
          !row.cities.trim() &&
          !row.counties.trim() &&
          !row.zipPrefixes.trim()
        ) {
          continue;
        }
        setError("Each dispatch provider row needs a provider label.");
        return;
      }

      parsedDispatchProviders.push({
        id: row.id,
        label,
        contactEmail: row.contactEmail.trim() || undefined,
        phone: row.phone.trim() || undefined,
        active: row.active,
        acceptingNewJobs: row.acceptingNewJobs,
        priorityWeight: Number(row.priorityWeight || "50"),
        maxConcurrentJobs: row.maxConcurrentJobs.trim() ? Number(row.maxConcurrentJobs) : undefined,
        activeJobs: row.activeJobs.trim() ? Number(row.activeJobs) : undefined,
        acceptsEmergency: row.acceptsEmergency,
        acceptsCommercial: row.acceptsCommercial,
        propertyTypes: normalizeList(row.propertyTypes),
        issueTypes: normalizeList(row.issueTypes),
        states: normalizeList(row.states),
        counties: normalizeList(row.counties),
        cities: normalizeList(row.cities),
        zipPrefixes: normalizeList(row.zipPrefixes),
        emergencyCoverageWindow: row.emergencyCoverageWindow.trim() || undefined,
        payoutModel: row.payoutModel,
        payoutFlatFee: row.payoutFlatFee.trim() ? Number(row.payoutFlatFee) : undefined,
        payoutSharePercent: row.payoutSharePercent.trim() ? Number(row.payoutSharePercent) : undefined,
        payoutNotes: row.payoutNotes.trim() || undefined,
      });
    }

    for (const row of zipAcquisitionCostRows) {
      const zipPrefix = row.zipPrefix.trim().toLowerCase();
      if (!zipPrefix && !row.acquisitionCost.trim()) {
        continue;
      }
      if (!zipPrefix || !row.acquisitionCost.trim()) {
        setError("Each ZIP acquisition row needs both a ZIP prefix and an acquisition cost.");
        return;
      }
      const acquisitionCost = Number(row.acquisitionCost);
      if (!Number.isFinite(acquisitionCost) || acquisitionCost < 0) {
        setError(`Acquisition cost for "${zipPrefix}" must be a non-negative number.`);
        return;
      }
      parsedZipAcquisitionCosts[zipPrefix] = acquisitionCost;
    }

    startTransition(async () => {
      const response = await fetch("/api/runtime-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          observability: {
            notifications: {
              defaultChannel: observabilityDefaultChannel,
              cooldownMinutes: parsedCooldownMinutes,
              recipients: parsedNotificationRecipients,
            },
          },
          trafft: {
            publicBookingUrl: trafftPublicBookingUrl,
            defaultServiceId: trafftDefaultServiceId,
            serviceMap: parsedServiceMap,
          },
          dispatch: {
            providers: parsedDispatchProviders,
          },
          marketplace: {
            defaultLeadAcquisitionCost: defaultLeadAcquisitionCost.trim() ? Number(defaultLeadAcquisitionCost) : undefined,
            zipLeadAcquisitionCosts: parsedZipAcquisitionCosts,
          },
          documentero: {
            defaultFormat: documenteroDefaultFormat,
            proposalTemplateId: documenteroProposalTemplateId,
            agreementTemplateId: documenteroAgreementTemplateId,
            onboardingTemplateId: documenteroOnboardingTemplateId,
          },
          crove: {
            webhookUrl: croveWebhookUrl,
            proposalTemplateId: croveProposalTemplateId,
            agreementTemplateId: croveAgreementTemplateId,
            onboardingTemplateId: croveOnboardingTemplateId,
          },
        }),
      });

      if (!response.ok) {
        setError("Runtime settings could not be saved.");
        return;
      }

      setStatus("Runtime settings saved. New booking and document jobs will use these values immediately.");
    });
  }

  return (
    <form className="panel auth-form" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Operator runtime settings</p>
        <h2>Provider mappings that should be editable without code changes</h2>
        <p className="muted">
          These values are non-secret operational settings. Use them for template IDs, service IDs,
          and public handoff links. Sensitive credentials still belong in environment variables.
        </p>
      </div>

      {error ? <p className="status-banner error">{error}</p> : null}
      {status ? <p className="status-banner success">{status}</p> : null}

      <div className="panel">
        <p className="eyebrow">Observability paging</p>
        <div className="form-grid">
          <label>
            Default notification channel
            <select value={observabilityDefaultChannel} onChange={(event) =>
              setObservabilityDefaultChannel(event.target.value as "email" | "sms" | "whatsapp")
            }>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </label>
          <label>
            Cooldown minutes
            <input
              value={observabilityCooldownMinutes}
              onChange={(event) => setObservabilityCooldownMinutes(event.target.value)}
              inputMode="numeric"
              placeholder="30"
            />
          </label>
        </div>

        <div className="settings-section">
          <div className="settings-section__header">
            <div>
              <h3>Recipients and rule ownership</h3>
              <p className="muted">
                Route triggered observability rules to the operators who should be paged. Leave rule IDs empty
                to receive every triggered rule. Cooldowns are enforced per rule, recipient, and channel.
              </p>
            </div>
            <button type="button" className="secondary" onClick={addNotificationRecipientRow}>
              Add recipient
            </button>
          </div>

          {notificationRecipientRows.length > 0 ? (
            <div className="mapping-stack">
              {notificationRecipientRows.map((row) => (
                <div key={row.id} className="mapping-row">
                  <div className="form-grid">
                    <label>
                      Recipient label
                      <input
                        value={row.label}
                        onChange={(event) => updateNotificationRecipientRow(row.id, { label: event.target.value })}
                        placeholder="Primary dispatch lead"
                      />
                    </label>
                    <label>
                      Email
                      <input
                        value={row.email}
                        onChange={(event) => updateNotificationRecipientRow(row.id, { email: event.target.value })}
                        placeholder="ops@example.com"
                      />
                    </label>
                    <label>
                      Phone
                      <input
                        value={row.phone}
                        onChange={(event) => updateNotificationRecipientRow(row.id, { phone: event.target.value })}
                        placeholder="+15555550123"
                      />
                    </label>
                    <label className="span-two">
                      Rule IDs
                      <input
                        value={row.ruleIds}
                        onChange={(event) => updateNotificationRecipientRow(row.id, { ruleIds: event.target.value })}
                        placeholder="execution-failures, provider-response-latency"
                      />
                      <span className="muted form-help">
                        Available rules: {OBSERVABILITY_RULE_OPTIONS.map((rule) => rule.id).join(", ")}
                      </span>
                    </label>
                  </div>
                  <div className="mapping-row__actions">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={row.active}
                        onChange={(event) => updateNotificationRecipientRow(row.id, { active: event.target.checked })}
                      />
                      Active
                    </label>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={row.emailEnabled}
                        onChange={(event) => updateNotificationRecipientRow(row.id, { emailEnabled: event.target.checked })}
                      />
                      Email
                    </label>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={row.smsEnabled}
                        onChange={(event) => updateNotificationRecipientRow(row.id, { smsEnabled: event.target.checked })}
                      />
                      SMS
                    </label>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={row.whatsappEnabled}
                        onChange={(event) => updateNotificationRecipientRow(row.id, { whatsappEnabled: event.target.checked })}
                      />
                      WhatsApp
                    </label>
                    <button type="button" className="secondary" onClick={() => removeNotificationRecipientRow(row.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="stack-grid">
              <p className="muted">
                No paging recipients are configured yet. If you leave this empty, LeadOS will fall back to the
                configured support inbox for email-only paging when one exists.
              </p>
              <ul className="check-list">
                {OBSERVABILITY_RULE_OPTIONS.map((rule) => (
                  <li key={rule.id}>
                    <strong>{rule.label}</strong>: <span className="portal-breakable">{rule.id}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <p className="eyebrow">Trafft</p>
        <div className="form-grid">
          <label>
            Public booking URL
            <input value={trafftPublicBookingUrl} onChange={(event) => setTrafftPublicBookingUrl(event.target.value)} />
          </label>
          <label>
            Default service ID
            <input value={trafftDefaultServiceId} onChange={(event) => setTrafftDefaultServiceId(event.target.value)} />
          </label>
        </div>

        <div className="settings-section">
          <div className="settings-section__header">
            <div>
              <h3>Detected booking services</h3>
              <p className="muted">
                Use detected Trafft services to set the runtime default or create mapping rows without
                copying opaque IDs by hand.
              </p>
            </div>
            <span className="settings-count">
              {trafftServices.length} service{trafftServices.length === 1 ? "" : "s"}
            </span>
          </div>

          {trafftServices.length > 0 ? (
            <>
              <label className="settings-search">
                Filter detected services
                <input
                  value={trafftServiceSearch}
                  onChange={(event) => setTrafftServiceSearch(event.target.value)}
                  placeholder="Search by label, slug, or service id"
                />
              </label>

              <div className="catalog-grid">
                {filteredTrafftServices.length > 0 ? filteredTrafftServices.map((service) => (
                  <article key={service.id} className="catalog-card">
                    <div className="catalog-card__header">
                      <div>
                        <strong>{service.label}</strong>
                        <p className="muted">{formatTrafftServiceMeta(service)}</p>
                      </div>
                    </div>
                    <div className="catalog-card__actions">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setTrafftDefaultServiceId(service.id)}
                      >
                        Set as default
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => addSuggestedMapping(service)}
                      >
                        Add mapping row
                      </button>
                    </div>
                  </article>
                )) : (
                  <p className="muted">
                    No detected Trafft services matched that search. Clear the filter or keep using
                    manual IDs.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="muted">
              No Trafft services were detected from the current runtime settings yet. You can still
              enter a default service ID or create manual mapping rows below.
            </p>
          )}
        </div>

        <div className="settings-section">
          <div className="settings-section__header">
            <div>
              <h3>LeadOS service mappings</h3>
              <p className="muted">
                Map the labels LeadOS sends, like “legal strategy call” or “coaching intensive”, to
                the Trafft service IDs that should receive those booking requests.
              </p>
            </div>
            <button type="button" className="secondary" onClick={addBlankServiceMapRow}>
              Add mapping
            </button>
          </div>

          {trafftServiceMapRows.length > 0 ? (
            <div className="mapping-stack">
              {trafftServiceMapRows.map((row) => {
                const matchedService = trafftServices.find((service) => service.id === row.serviceId.trim());
                return (
                  <div key={row.id} className="mapping-row">
                    <label>
                      LeadOS service label
                      <input
                        value={row.label}
                        onChange={(event) => updateServiceMapRow(row.id, { label: event.target.value })}
                        placeholder="legal strategy call"
                      />
                    </label>
                    <label>
                      Trafft service ID
                      <input
                        value={row.serviceId}
                        onChange={(event) => updateServiceMapRow(row.id, { serviceId: event.target.value })}
                        placeholder="srv_123 or detected numeric id"
                      />
                      {matchedService ? (
                        <span className="muted form-help">{formatTrafftServiceMeta(matchedService)}</span>
                      ) : (
                        <span className="muted form-help">
                          Use the detected service cards above to prefill this field faster.
                        </span>
                      )}
                    </label>
                    <div className="mapping-row__actions">
                      <button type="button" className="secondary" onClick={() => removeServiceMapRow(row.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted">
              No service-specific mappings yet. LeadOS will fall back to the default service ID when
              a service label is not mapped.
            </p>
          )}
        </div>
      </div>

      <div className="panel">
        <p className="eyebrow">Marketplace finance</p>
        <div className="form-grid">
          <label>
            Default lead acquisition cost
            <input
              value={defaultLeadAcquisitionCost}
              onChange={(event) => setDefaultLeadAcquisitionCost(event.target.value)}
              inputMode="decimal"
              placeholder="Fallback CAC when a ZIP override is not present"
            />
          </label>
        </div>

        <div className="settings-section">
          <div className="settings-section__header">
            <div>
              <h3>ZIP-cell acquisition costs</h3>
              <p className="muted">
                Override default CAC by ZIP prefix so LeadOS can calculate contribution margin by cell instead of relying on gross revenue.
              </p>
            </div>
            <span className="settings-count">
              {zipAcquisitionCostRows.length} ZIP cost{zipAcquisitionCostRows.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mapping-stack">
            {zipAcquisitionCostRows.map((row) => (
              <div key={row.id} className="mapping-row">
                <div className="form-grid">
                  <label>
                    ZIP prefix
                    <input
                      value={row.zipPrefix}
                      onChange={(event) => updateZipAcquisitionCostRow(row.id, { zipPrefix: event.target.value })}
                      placeholder="191 or 75201"
                    />
                  </label>
                  <label>
                    Acquisition cost
                    <input
                      value={row.acquisitionCost}
                      onChange={(event) => updateZipAcquisitionCostRow(row.id, { acquisitionCost: event.target.value })}
                      inputMode="decimal"
                      placeholder="39"
                    />
                  </label>
                </div>
                <div className="mapping-row__actions">
                  <button type="button" className="secondary" onClick={() => removeZipAcquisitionCostRow(row.id)}>
                    Remove ZIP cost
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="catalog-card__actions">
            <button type="button" className="secondary" onClick={addZipAcquisitionCostRow}>
              Add ZIP acquisition cost
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="settings-section">
          <div className="settings-section__header">
            <div>
              <p className="eyebrow">Dispatch roster</p>
              <h3>Provider capacity and coverage</h3>
              <p className="muted">
                Configure which plumbing providers can receive dispatches, where they operate, and
                how much live capacity they still have.
              </p>
            </div>
            <button type="button" className="secondary" onClick={addDispatchProviderRow}>
              Add provider
            </button>
          </div>

          {dispatchProviderRows.length > 0 ? (
            <div className="mapping-stack">
              {dispatchProviderRows.map((row) => (
                <div key={row.id} className="mapping-row">
                    <label>
                      Provider label
                      <input
                        value={row.label}
                        onChange={(event) => updateDispatchProviderRow(row.id, { label: event.target.value })}
                        placeholder="Dallas Emergency Crew"
                      />
                    </label>
                    <label>
                      Contact email
                      <input
                        value={row.contactEmail}
                        onChange={(event) => updateDispatchProviderRow(row.id, { contactEmail: event.target.value })}
                        placeholder="dispatch@provider.com"
                      />
                    </label>
                    <label>
                      Contact phone
                      <input
                        value={row.phone}
                        onChange={(event) => updateDispatchProviderRow(row.id, { phone: event.target.value })}
                        placeholder="5551234567"
                      />
                    </label>
                    <label>
                      Priority weight
                    <input
                      value={row.priorityWeight}
                      onChange={(event) => updateDispatchProviderRow(row.id, { priorityWeight: event.target.value })}
                      inputMode="numeric"
                      placeholder="50"
                    />
                  </label>
                  <label>
                    Max concurrent jobs
                    <input
                      value={row.maxConcurrentJobs}
                      onChange={(event) => updateDispatchProviderRow(row.id, { maxConcurrentJobs: event.target.value })}
                      inputMode="numeric"
                      placeholder="4"
                    />
                  </label>
                  <label>
                    Active jobs
                    <input
                      value={row.activeJobs}
                      onChange={(event) => updateDispatchProviderRow(row.id, { activeJobs: event.target.value })}
                      inputMode="numeric"
                      placeholder="1"
                    />
                  </label>
                  <label>
                    States
                    <input
                      value={row.states}
                      onChange={(event) => updateDispatchProviderRow(row.id, { states: event.target.value })}
                      placeholder="texas, oklahoma"
                    />
                  </label>
                  <label>
                    Counties
                    <input
                      value={row.counties}
                      onChange={(event) => updateDispatchProviderRow(row.id, { counties: event.target.value })}
                      placeholder="dallas county, tarrant county"
                    />
                  </label>
                  <label>
                    Cities
                    <input
                      value={row.cities}
                      onChange={(event) => updateDispatchProviderRow(row.id, { cities: event.target.value })}
                      placeholder="dallas, fort worth"
                    />
                  </label>
                  <label>
                    ZIP prefixes
                    <input
                      value={row.zipPrefixes}
                      onChange={(event) => updateDispatchProviderRow(row.id, { zipPrefixes: event.target.value })}
                      placeholder="750, 752"
                    />
                  </label>
                  <label>
                    Property types
                    <input
                      value={row.propertyTypes}
                      onChange={(event) => updateDispatchProviderRow(row.id, { propertyTypes: event.target.value })}
                      placeholder="residential, commercial"
                    />
                  </label>
                  <label>
                    Issue types
                    <input
                      value={row.issueTypes}
                      onChange={(event) => updateDispatchProviderRow(row.id, { issueTypes: event.target.value })}
                      placeholder="burst-pipe, leak, drain-clog"
                    />
                  </label>
                  <label className="span-two">
                    Emergency coverage window
                    <input
                      value={row.emergencyCoverageWindow}
                      onChange={(event) => updateDispatchProviderRow(row.id, { emergencyCoverageWindow: event.target.value })}
                      placeholder="24/7 or Mon-Sun 6pm-6am"
                    />
                  </label>
                  <label>
                    Payout model
                    <select
                      value={row.payoutModel}
                      onChange={(event) => updateDispatchProviderRow(row.id, { payoutModel: event.target.value as "flat-fee" | "revenue-share" })}
                    >
                      <option value="flat-fee">Flat fee</option>
                      <option value="revenue-share">Revenue share</option>
                    </select>
                  </label>
                  <label>
                    Payout flat fee
                    <input
                      value={row.payoutFlatFee}
                      onChange={(event) => updateDispatchProviderRow(row.id, { payoutFlatFee: event.target.value })}
                      inputMode="decimal"
                      placeholder="120"
                    />
                  </label>
                  <label>
                    Payout share %
                    <input
                      value={row.payoutSharePercent}
                      onChange={(event) => updateDispatchProviderRow(row.id, { payoutSharePercent: event.target.value })}
                      inputMode="decimal"
                      placeholder="35"
                    />
                  </label>
                  <label className="span-two">
                    Payout notes
                    <input
                      value={row.payoutNotes}
                      onChange={(event) => updateDispatchProviderRow(row.id, { payoutNotes: event.target.value })}
                      placeholder="Flat fee for emergency calls, revenue share for completed installs"
                    />
                  </label>
                  <div className="mapping-row__actions">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={row.active}
                        onChange={(event) => updateDispatchProviderRow(row.id, { active: event.target.checked })}
                      />
                      Active
                    </label>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={row.acceptingNewJobs}
                        onChange={(event) => updateDispatchProviderRow(row.id, { acceptingNewJobs: event.target.checked })}
                      />
                      Accepting new jobs
                    </label>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={row.acceptsEmergency}
                        onChange={(event) => updateDispatchProviderRow(row.id, { acceptsEmergency: event.target.checked })}
                      />
                      Emergency ready
                    </label>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={row.acceptsCommercial}
                        onChange={(event) => updateDispatchProviderRow(row.id, { acceptsCommercial: event.target.checked })}
                      />
                      Commercial ready
                    </label>
                    <button type="button" className="secondary" onClick={() => removeDispatchProviderRow(row.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">
              No dispatch providers configured yet. Add providers here so LeadOS can recommend who
              should receive a plumbing job based on coverage and capacity.
            </p>
          )}
        </div>
      </div>

      <div className="panel">
        <p className="eyebrow">Documentero</p>
        <div className="form-grid">
          <label>
            Default format
            <input value={documenteroDefaultFormat} onChange={(event) => setDocumenteroDefaultFormat(event.target.value)} />
          </label>
          <label>
            Proposal template ID
            <input value={documenteroProposalTemplateId} onChange={(event) => setDocumenteroProposalTemplateId(event.target.value)} />
          </label>
          <label>
            Agreement template ID
            <input value={documenteroAgreementTemplateId} onChange={(event) => setDocumenteroAgreementTemplateId(event.target.value)} />
          </label>
          <label>
            Onboarding template ID
            <input value={documenteroOnboardingTemplateId} onChange={(event) => setDocumenteroOnboardingTemplateId(event.target.value)} />
          </label>
        </div>
      </div>

      <div className="panel">
        <p className="eyebrow">Crove fallback</p>
        <div className="form-grid">
          <label className="span-two">
            Crove webhook URL
            <input value={croveWebhookUrl} onChange={(event) => setCroveWebhookUrl(event.target.value)} />
          </label>
          <label>
            Proposal template ID
            <input value={croveProposalTemplateId} onChange={(event) => setCroveProposalTemplateId(event.target.value)} />
          </label>
          <label>
            Agreement template ID
            <input value={croveAgreementTemplateId} onChange={(event) => setCroveAgreementTemplateId(event.target.value)} />
          </label>
          <label>
            Onboarding template ID
            <input value={croveOnboardingTemplateId} onChange={(event) => setCroveOnboardingTemplateId(event.target.value)} />
          </label>
        </div>
      </div>

      <div className="cta-row">
        <button type="submit" className="primary" disabled={isPending}>
          {isPending ? "Saving..." : "Save runtime settings"}
        </button>
      </div>
    </form>
  );
}
