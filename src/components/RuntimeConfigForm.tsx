"use client";

import { useDeferredValue, useState, useTransition, type FormEvent } from "react";
import type { TrafftServiceOption } from "@/lib/provider-discovery";
import type { OperationalRuntimeConfig } from "@/lib/runtime-config";

type ServiceMapRow = {
  id: string;
  label: string;
  serviceId: string;
};

type Props = {
  initialConfig: OperationalRuntimeConfig;
  trafftServices: TrafftServiceOption[];
};

function createServiceMapRow(label = "", serviceId = ""): ServiceMapRow {
  return {
    id:
      globalThis.crypto?.randomUUID?.()
      ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label,
    serviceId,
  };
}

function buildServiceMapRows(serviceMap: Record<string, string>) {
  return Object.entries(serviceMap).map(([label, serviceId]) => createServiceMapRow(label, serviceId));
}

function normalizeServiceLabel(value: string) {
  return value.trim().toLowerCase();
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
  const [trafftPublicBookingUrl, setTrafftPublicBookingUrl] = useState(initialConfig.trafft.publicBookingUrl ?? "");
  const [trafftDefaultServiceId, setTrafftDefaultServiceId] = useState(initialConfig.trafft.defaultServiceId ?? "");
  const [trafftServiceMapRows, setTrafftServiceMapRows] = useState<ServiceMapRow[]>(() => buildServiceMapRows(initialConfig.trafft.serviceMap));
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

    startTransition(async () => {
      const response = await fetch("/api/runtime-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trafft: {
            publicBookingUrl: trafftPublicBookingUrl,
            defaultServiceId: trafftDefaultServiceId,
            serviceMap: parsedServiceMap,
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
