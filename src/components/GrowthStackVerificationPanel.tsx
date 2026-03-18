"use client";

import { useState, useTransition } from "react";
import type { GrowthSmokeResult } from "@/lib/growth-integrations";
import type { OperationalRuntimeConfig } from "@/lib/runtime-config";

type Props = {
  initialHealth: {
    suiteDash: {
      portalReady: boolean;
      membershipReady: boolean;
    };
    messaging: {
      primarySmsProvider: string;
      fallbackSmsProvider: string;
    };
    callScaler: {
      webhookReady: boolean;
      scriptReady: boolean;
      dynamicNumbers: number;
    };
    salespanel: {
      enabled: boolean;
      webhookReady: boolean;
      scriptReady: boolean;
    };
    plerdy: {
      enabled: boolean;
      webhookReady: boolean;
      scriptReady: boolean;
    };
    partnero: {
      webhookReady: boolean;
      programReady: boolean;
      autoEnrollStage: OperationalRuntimeConfig["partnero"]["autoEnrollStage"];
    };
    thoughtly: {
      webhookReady: boolean;
      agentReady: boolean;
      afterHoursEnabled: boolean;
      callbackWindowMinutes: number;
    };
  };
};

type SmokePayload = {
  success: boolean;
  growthSmoke?: {
    dryRun: boolean;
    providers: Record<string, GrowthSmokeResult>;
  };
  error?: string;
};

const LABELS: Record<string, string> = {
  suiteDash: "SuiteDash",
  messaging: "Messaging",
  callScaler: "CallScaler",
  salespanel: "Salespanel",
  plerdy: "Plerdy",
  partnero: "Partnero",
  thoughtly: "Thoughtly",
};

function readinessSummary(initialHealth: Props["initialHealth"]) {
  return {
    suiteDash: initialHealth.suiteDash.portalReady
      ? `Portal ${initialHealth.suiteDash.membershipReady ? "and membership" : "ready; membership plan missing"}`
      : "Portal URL missing",
    messaging: `Primary ${initialHealth.messaging.primarySmsProvider}; fallback ${initialHealth.messaging.fallbackSmsProvider}`,
    callScaler: initialHealth.callScaler.webhookReady
      ? `Webhook ready; ${initialHealth.callScaler.dynamicNumbers} dynamic numbers`
      : initialHealth.callScaler.scriptReady
        ? "Script ready; webhook missing"
        : "Activation missing",
    salespanel: initialHealth.salespanel.enabled
      ? initialHealth.salespanel.webhookReady
        ? "Enabled and webhook ready"
        : "Enabled; webhook missing"
      : "Disabled",
    plerdy: initialHealth.plerdy.enabled
      ? initialHealth.plerdy.webhookReady
        ? "Enabled and webhook ready"
        : "Enabled; webhook missing"
      : "Disabled",
    partnero: initialHealth.partnero.webhookReady
      ? `Webhook ready; auto-enroll ${initialHealth.partnero.autoEnrollStage}`
      : "Webhook missing",
    thoughtly: initialHealth.thoughtly.webhookReady
      ? `Webhook ready; callback ${initialHealth.thoughtly.callbackWindowMinutes}m`
      : "Webhook missing",
  };
}

export function GrowthStackVerificationPanel({ initialHealth }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [latestMode, setLatestMode] = useState<"dry-run" | "live">("dry-run");
  const [results, setResults] = useState<Record<string, GrowthSmokeResult>>({});
  const summaries = readinessSummary(initialHealth);

  function runVerification(dryRun: boolean) {
    setError("");
    setStatus("");

    startTransition(async () => {
      const response = await fetch("/api/automations/smoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });
      const payload = await response.json().catch(() => ({} as SmokePayload)) as SmokePayload;

      if (!response.ok || payload.success !== true || !payload.growthSmoke) {
        setError(payload.error ?? "Growth stack verification could not be completed.");
        return;
      }

      setLatestMode(dryRun ? "dry-run" : "live");
      setResults(payload.growthSmoke.providers);
      setStatus(
        dryRun
          ? "Dry-run verification completed. Review what is configured versus still waiting on activation."
          : "Live verification completed. Review each provider result before treating the growth stack as production-ready.",
      );
    });
  }

  return (
    <section className="stack-grid">
      <article className="panel">
        <p className="eyebrow">Activation verification</p>
        <h2>Prove the growth stack is actually ready</h2>
        <p className="muted">
          Use dry run to confirm coverage. Use live verification after webhooks, scripts, and IDs are
          in place so operators can see which tools are truly reachable.
        </p>
        <div className="cta-row">
          <button type="button" className="secondary" disabled={isPending} onClick={() => runVerification(true)}>
            {isPending && latestMode === "dry-run" ? "Running dry run..." : "Run dry run"}
          </button>
          <button type="button" className="secondary" disabled={isPending} onClick={() => runVerification(false)}>
            {isPending && latestMode === "live" ? "Running live smoke..." : "Run live smoke"}
          </button>
        </div>
        {status ? <p className="form-status success">{status}</p> : null}
        {error ? <p className="form-status error">{error}</p> : null}
      </article>

      <div className="stack-grid growth-verification-grid">
        {Object.entries(summaries).map(([key, summary]) => {
          const result = results[key];
          const tone = result ? (result.ok ? "success" : result.mode === "prepared" ? "warning" : "danger") : "neutral";
          return (
            <article key={key} className={`stack-card growth-verification-card tone-${tone}`}>
              <div className="portal-status-row">
                <span className="portal-chip">{LABELS[key] ?? key}</span>
                <span className="portal-chip">{result?.mode ?? "readiness"}</span>
                <span className="portal-chip">{result ? (result.ok ? "ok" : "attention") : "waiting"}</span>
              </div>
              <h3>{LABELS[key] ?? key}</h3>
              <p className="muted">{summary}</p>
              <p className="portal-breakable">
                {result?.detail ?? "No smoke result yet. Run dry run or live smoke to verify this layer."}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
