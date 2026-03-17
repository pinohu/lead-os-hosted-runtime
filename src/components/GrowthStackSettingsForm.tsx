"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { OperationalRuntimeConfig } from "@/lib/runtime-config";

type Props = {
  initialConfig: OperationalRuntimeConfig;
};

export function GrowthStackSettingsForm({ initialConfig }: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [suiteDashPortalUrl, setSuiteDashPortalUrl] = useState(initialConfig.suiteDash.portalUrl ?? "");
  const [suiteDashDefaultCompanyId, setSuiteDashDefaultCompanyId] = useState(initialConfig.suiteDash.defaultCompanyId ?? "");
  const [suiteDashMembershipPlanId, setSuiteDashMembershipPlanId] = useState(initialConfig.suiteDash.defaultMembershipPlanId ?? "");
  const [suiteDashInvoicePrefix, setSuiteDashInvoicePrefix] = useState(initialConfig.suiteDash.invoicePrefix ?? "");
  const [primarySmsProvider, setPrimarySmsProvider] = useState(initialConfig.messaging.primarySmsProvider);
  const [fallbackSmsProvider, setFallbackSmsProvider] = useState(initialConfig.messaging.fallbackSmsProvider ?? "");
  const [callScalerWebhookUrl, setCallScalerWebhookUrl] = useState(initialConfig.callScaler.webhookUrl ?? "");
  const [callScalerWebhookSecret, setCallScalerWebhookSecret] = useState(initialConfig.callScaler.webhookSecret ?? "");
  const [callScalerScriptUrl, setCallScalerScriptUrl] = useState(initialConfig.callScaler.scriptUrl ?? "");
  const [callScalerDefaultTrackingNumber, setCallScalerDefaultTrackingNumber] = useState(initialConfig.callScaler.defaultTrackingNumber ?? "");
  const [callScalerDynamicNumberPool, setCallScalerDynamicNumberPool] = useState(initialConfig.callScaler.dynamicNumberPool.join(", "));
  const [salespanelEnabled, setSalespanelEnabled] = useState(initialConfig.salespanel.enabled);
  const [salespanelWebhookUrl, setSalespanelWebhookUrl] = useState(initialConfig.salespanel.webhookUrl ?? "");
  const [salespanelScriptUrl, setSalespanelScriptUrl] = useState(initialConfig.salespanel.scriptUrl ?? "");
  const [salespanelSiteId, setSalespanelSiteId] = useState(initialConfig.salespanel.siteId ?? "");
  const [salespanelTrackAnonymous, setSalespanelTrackAnonymous] = useState(initialConfig.salespanel.trackAnonymous);
  const [plerdyEnabled, setPlerdyEnabled] = useState(initialConfig.plerdy.enabled);
  const [plerdyWebhookUrl, setPlerdyWebhookUrl] = useState(initialConfig.plerdy.eventWebhookUrl ?? "");
  const [plerdyScriptUrl, setPlerdyScriptUrl] = useState(initialConfig.plerdy.scriptUrl ?? "");
  const [plerdyProjectId, setPlerdyProjectId] = useState(initialConfig.plerdy.projectId ?? "");
  const [plerdyHeatmapsEnabled, setPlerdyHeatmapsEnabled] = useState(initialConfig.plerdy.heatmapsEnabled);
  const [plerdyPopupsEnabled, setPlerdyPopupsEnabled] = useState(initialConfig.plerdy.popupsEnabled);
  const [partneroWebhookUrl, setPartneroWebhookUrl] = useState(initialConfig.partnero.webhookUrl ?? "");
  const [partneroProgramId, setPartneroProgramId] = useState(initialConfig.partnero.programId ?? "");
  const [partneroAutoEnrollStage, setPartneroAutoEnrollStage] = useState(initialConfig.partnero.autoEnrollStage);
  const [thoughtlyWebhookUrl, setThoughtlyWebhookUrl] = useState(initialConfig.thoughtly.webhookUrl ?? "");
  const [thoughtlyDefaultAgentId, setThoughtlyDefaultAgentId] = useState(initialConfig.thoughtly.defaultAgentId ?? "");
  const [thoughtlyAfterHoursEnabled, setThoughtlyAfterHoursEnabled] = useState(initialConfig.thoughtly.afterHoursEnabled);
  const [thoughtlyCallbackWindowMinutes, setThoughtlyCallbackWindowMinutes] = useState(String(initialConfig.thoughtly.callbackWindowMinutes));
  const [thoughtlyMissedCallSmsEnabled, setThoughtlyMissedCallSmsEnabled] = useState(initialConfig.thoughtly.missedCallSmsEnabled);

  function normalizeList(value: string) {
    return [...new Set(value.split(",").map((entry) => entry.trim()).filter(Boolean))];
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    const parsedCallbackWindow = Number(thoughtlyCallbackWindowMinutes || "0");
    if (!Number.isFinite(parsedCallbackWindow) || parsedCallbackWindow < 0) {
      setError("Thoughtly callback window must be a non-negative number of minutes.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/runtime-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suiteDash: {
            portalUrl: suiteDashPortalUrl,
            defaultCompanyId: suiteDashDefaultCompanyId,
            defaultMembershipPlanId: suiteDashMembershipPlanId,
            invoicePrefix: suiteDashInvoicePrefix,
          },
          messaging: {
            primarySmsProvider,
            fallbackSmsProvider: fallbackSmsProvider || undefined,
          },
          callScaler: {
            webhookUrl: callScalerWebhookUrl,
            webhookSecret: callScalerWebhookSecret,
            scriptUrl: callScalerScriptUrl,
            defaultTrackingNumber: callScalerDefaultTrackingNumber,
            dynamicNumberPool: normalizeList(callScalerDynamicNumberPool),
          },
          salespanel: {
            enabled: salespanelEnabled,
            webhookUrl: salespanelWebhookUrl,
            scriptUrl: salespanelScriptUrl,
            siteId: salespanelSiteId,
            trackAnonymous: salespanelTrackAnonymous,
          },
          plerdy: {
            enabled: plerdyEnabled,
            eventWebhookUrl: plerdyWebhookUrl,
            scriptUrl: plerdyScriptUrl,
            projectId: plerdyProjectId,
            heatmapsEnabled: plerdyHeatmapsEnabled,
            popupsEnabled: plerdyPopupsEnabled,
          },
          partnero: {
            webhookUrl: partneroWebhookUrl,
            programId: partneroProgramId,
            autoEnrollStage: partneroAutoEnrollStage,
          },
          thoughtly: {
            webhookUrl: thoughtlyWebhookUrl,
            defaultAgentId: thoughtlyDefaultAgentId,
            afterHoursEnabled: thoughtlyAfterHoursEnabled,
            callbackWindowMinutes: parsedCallbackWindow,
            missedCallSmsEnabled: thoughtlyMissedCallSmsEnabled,
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        setError(payload.error ?? "Growth stack settings could not be saved.");
        return;
      }

      setStatus("Growth stack settings saved.");
    });
  }

  return (
    <form className="stack-grid" onSubmit={handleSubmit}>
      {error ? <div className="status-banner error">{error}</div> : null}
      {status ? <div className="status-banner success">{status}</div> : null}

      <div className="panel">
        <p className="eyebrow">CRM and billing spine</p>
        <div className="form-grid">
          <label>
            SuiteDash portal URL
            <input value={suiteDashPortalUrl} onChange={(event) => setSuiteDashPortalUrl(event.target.value)} />
          </label>
          <label>
            Default company ID
            <input value={suiteDashDefaultCompanyId} onChange={(event) => setSuiteDashDefaultCompanyId(event.target.value)} />
          </label>
          <label>
            Membership plan ID
            <input value={suiteDashMembershipPlanId} onChange={(event) => setSuiteDashMembershipPlanId(event.target.value)} />
          </label>
          <label>
            Invoice prefix
            <input value={suiteDashInvoicePrefix} onChange={(event) => setSuiteDashInvoicePrefix(event.target.value)} />
          </label>
        </div>
      </div>

      <div className="panel">
        <p className="eyebrow">Messaging preference</p>
        <div className="form-grid">
          <label>
            Primary SMS provider
            <select value={primarySmsProvider} onChange={(event) => setPrimarySmsProvider(event.target.value as "easy-text-marketing" | "sms-it")}>
              <option value="easy-text-marketing">Easy Text Marketing</option>
              <option value="sms-it">SMS-IT</option>
            </select>
          </label>
          <label>
            Fallback SMS provider
            <select value={fallbackSmsProvider} onChange={(event) => setFallbackSmsProvider(event.target.value)}>
              <option value="">None</option>
              <option value="easy-text-marketing">Easy Text Marketing</option>
              <option value="sms-it">SMS-IT</option>
            </select>
          </label>
        </div>
      </div>

      <div className="panel">
        <p className="eyebrow">Call attribution</p>
        <div className="form-grid">
          <label className="span-two">
            CallScaler webhook URL
            <input value={callScalerWebhookUrl} onChange={(event) => setCallScalerWebhookUrl(event.target.value)} />
          </label>
          <label>
            Webhook secret
            <input value={callScalerWebhookSecret} onChange={(event) => setCallScalerWebhookSecret(event.target.value)} />
          </label>
          <label>
            Script URL
            <input value={callScalerScriptUrl} onChange={(event) => setCallScalerScriptUrl(event.target.value)} />
          </label>
          <label>
            Default tracking number
            <input value={callScalerDefaultTrackingNumber} onChange={(event) => setCallScalerDefaultTrackingNumber(event.target.value)} />
          </label>
          <label className="span-two">
            Dynamic number pool
            <input
              value={callScalerDynamicNumberPool}
              onChange={(event) => setCallScalerDynamicNumberPool(event.target.value)}
              placeholder="(555) 010-0101, (555) 010-0102"
            />
          </label>
        </div>
      </div>

      <div className="panel">
        <p className="eyebrow">Behavior scoring</p>
        <div className="form-grid">
          <label className="checkbox-row">
            <input type="checkbox" checked={salespanelEnabled} onChange={(event) => setSalespanelEnabled(event.target.checked)} />
            Enable Salespanel
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={salespanelTrackAnonymous} onChange={(event) => setSalespanelTrackAnonymous(event.target.checked)} />
            Track anonymous visitors
          </label>
          <label className="span-two">
            Salespanel webhook URL
            <input value={salespanelWebhookUrl} onChange={(event) => setSalespanelWebhookUrl(event.target.value)} />
          </label>
          <label>
            Script URL
            <input value={salespanelScriptUrl} onChange={(event) => setSalespanelScriptUrl(event.target.value)} />
          </label>
          <label>
            Site ID
            <input value={salespanelSiteId} onChange={(event) => setSalespanelSiteId(event.target.value)} />
          </label>
        </div>
      </div>

      <div className="panel">
        <p className="eyebrow">CRO instrumentation</p>
        <div className="form-grid">
          <label className="checkbox-row">
            <input type="checkbox" checked={plerdyEnabled} onChange={(event) => setPlerdyEnabled(event.target.checked)} />
            Enable Plerdy
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={plerdyHeatmapsEnabled} onChange={(event) => setPlerdyHeatmapsEnabled(event.target.checked)} />
            Heatmaps enabled
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={plerdyPopupsEnabled} onChange={(event) => setPlerdyPopupsEnabled(event.target.checked)} />
            Popups enabled
          </label>
          <label className="span-two">
            Plerdy event webhook URL
            <input value={plerdyWebhookUrl} onChange={(event) => setPlerdyWebhookUrl(event.target.value)} />
          </label>
          <label>
            Script URL
            <input value={plerdyScriptUrl} onChange={(event) => setPlerdyScriptUrl(event.target.value)} />
          </label>
          <label>
            Project ID
            <input value={plerdyProjectId} onChange={(event) => setPlerdyProjectId(event.target.value)} />
          </label>
        </div>
      </div>

      <div className="panel">
        <p className="eyebrow">Compounding growth</p>
        <div className="form-grid">
          <label className="span-two">
            Partnero webhook URL
            <input value={partneroWebhookUrl} onChange={(event) => setPartneroWebhookUrl(event.target.value)} />
          </label>
          <label>
            Program ID
            <input value={partneroProgramId} onChange={(event) => setPartneroProgramId(event.target.value)} />
          </label>
          <label>
            Auto-enroll stage
            <select value={partneroAutoEnrollStage} onChange={(event) => setPartneroAutoEnrollStage(event.target.value as "paid" | "value-realized" | "referral-ready")}>
              <option value="paid">Paid</option>
              <option value="value-realized">Value realized</option>
              <option value="referral-ready">Referral ready</option>
            </select>
          </label>
        </div>
      </div>

      <div className="panel">
        <p className="eyebrow">Voice recovery</p>
        <div className="form-grid">
          <label className="span-two">
            Thoughtly webhook URL
            <input value={thoughtlyWebhookUrl} onChange={(event) => setThoughtlyWebhookUrl(event.target.value)} />
          </label>
          <label>
            Default agent ID
            <input value={thoughtlyDefaultAgentId} onChange={(event) => setThoughtlyDefaultAgentId(event.target.value)} />
          </label>
          <label>
            Callback window minutes
            <input
              value={thoughtlyCallbackWindowMinutes}
              onChange={(event) => setThoughtlyCallbackWindowMinutes(event.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={thoughtlyAfterHoursEnabled} onChange={(event) => setThoughtlyAfterHoursEnabled(event.target.checked)} />
            After-hours enabled
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={thoughtlyMissedCallSmsEnabled} onChange={(event) => setThoughtlyMissedCallSmsEnabled(event.target.checked)} />
            Missed-call SMS enabled
          </label>
        </div>
      </div>

      <div className="cta-row">
        <button type="submit" className="primary" disabled={isPending}>
          {isPending ? "Saving..." : "Save growth stack settings"}
        </button>
      </div>
    </form>
  );
}
