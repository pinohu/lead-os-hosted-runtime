"use client";

import { useState, useTransition, type FormEvent } from "react";

type Props = {
  experimentId: string;
  variantId: string;
  promoted: boolean;
};

export function ExperimentPromotionForm({ experimentId, variantId, promoted }: Props) {
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/experiments/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experimentId, variantId, reason }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success !== true) {
        setError(payload.error ?? "Unable to promote this variant.");
        return;
      }
      setStatus("Promoted. New live entrants will now resolve to this variant.");
    });
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <label>
        Promotion note
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Why this variant is now the default"
        />
      </label>
      <button type="submit" className="secondary" disabled={isPending}>
        {isPending ? "Promoting..." : promoted ? "Re-promote as live default" : "Promote as live default"}
      </button>
      {status ? <p className="form-status success">{status}</p> : null}
      {error ? <p className="form-status error">{error}</p> : null}
    </form>
  );
}
