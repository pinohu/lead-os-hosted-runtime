"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { OperationalRuntimeConfig } from "@/lib/runtime-config";

type Props = {
  initialConfig: OperationalRuntimeConfig;
};

function formatJson(value: Record<string, string>) {
  return JSON.stringify(value, null, 2);
}

export function RuntimeConfigForm({ initialConfig }: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [trafftPublicBookingUrl, setTrafftPublicBookingUrl] = useState(initialConfig.trafft.publicBookingUrl ?? "");
  const [trafftDefaultServiceId, setTrafftDefaultServiceId] = useState(initialConfig.trafft.defaultServiceId ?? "");
  const [trafftServiceMap, setTrafftServiceMap] = useState(formatJson(initialConfig.trafft.serviceMap));
  const [documenteroDefaultFormat, setDocumenteroDefaultFormat] = useState(initialConfig.documentero.defaultFormat ?? "pdf");
  const [documenteroProposalTemplateId, setDocumenteroProposalTemplateId] = useState(initialConfig.documentero.proposalTemplateId ?? "");
  const [documenteroAgreementTemplateId, setDocumenteroAgreementTemplateId] = useState(initialConfig.documentero.agreementTemplateId ?? "");
  const [documenteroOnboardingTemplateId, setDocumenteroOnboardingTemplateId] = useState(initialConfig.documentero.onboardingTemplateId ?? "");
  const [croveWebhookUrl, setCroveWebhookUrl] = useState(initialConfig.crove.webhookUrl ?? "");
  const [croveProposalTemplateId, setCroveProposalTemplateId] = useState(initialConfig.crove.proposalTemplateId ?? "");
  const [croveAgreementTemplateId, setCroveAgreementTemplateId] = useState(initialConfig.crove.agreementTemplateId ?? "");
  const [croveOnboardingTemplateId, setCroveOnboardingTemplateId] = useState(initialConfig.crove.onboardingTemplateId ?? "");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    let parsedServiceMap: Record<string, string> = {};
    try {
      parsedServiceMap = JSON.parse(trafftServiceMap || "{}") as Record<string, string>;
    } catch {
      setError("Trafft service map must be valid JSON.");
      return;
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
          <label className="span-two">
            Service map JSON
            <textarea
              rows={8}
              value={trafftServiceMap}
              onChange={(event) => setTrafftServiceMap(event.target.value)}
            />
            <span className="muted form-help">Example: {`{"legal strategy call":"srv_123","coaching intensive":"srv_456"}`}</span>
          </label>
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
