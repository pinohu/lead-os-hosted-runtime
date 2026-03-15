"use client";

import { useState, useTransition, type FormEvent } from "react";

type Props = {
  deploymentId: string;
  currentStatus: "planned" | "generated" | "live" | "paused" | "retired";
  currentNotes?: string;
};

export function DeploymentStatusForm({ deploymentId, currentStatus, currentNotes }: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/deployments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: deploymentId,
          status,
          notes,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.success !== true) {
        setError(body.error ?? "Could not update deployment.");
        return;
      }
      setMessage("Updated");
    });
  }

  return (
    <form className="stack-grid" onSubmit={handleSubmit}>
      <div className="portal-form-grid">
        <label>
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as Props["currentStatus"])}>
            <option value="planned">Planned</option>
            <option value="generated">Generated</option>
            <option value="live">Live</option>
            <option value="paused">Paused</option>
            <option value="retired">Retired</option>
          </select>
        </label>
      </div>
      <label>
        <span>Notes</span>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
      </label>
      {error ? <p className="portal-error">{error}</p> : null}
      {message ? <p className="portal-success">{message}</p> : null}
      <div className="cta-row">
        <button className="secondary" type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Update deployment"}
        </button>
      </div>
    </form>
  );
}
