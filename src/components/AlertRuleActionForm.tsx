"use client";

import { useState, useTransition, type FormEvent } from "react";

type Props = {
  ruleId: string;
  title: string;
  initiallyAcknowledged: boolean;
};

export function AlertRuleActionForm({ ruleId, title, initiallyAcknowledged }: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [minutes, setMinutes] = useState("60");
  const [acknowledged, setAcknowledged] = useState(initiallyAcknowledged);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/alerts/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleId,
          title,
          note,
          snoozeMinutes: Number(minutes || "0"),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success !== true) {
        setError(payload.error ?? "Unable to acknowledge this alert.");
        return;
      }
      setAcknowledged(true);
      setStatus(`Acknowledged for ${payload.acknowledgement?.snoozedUntil ? `${minutes} minute(s)` : "this rule window"}.`);
    });
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <label>
        Note
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Who owns this and what is the next step?"
        />
      </label>
      <label>
        Snooze minutes
        <input
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
          inputMode="numeric"
          placeholder="60"
        />
      </label>
      <button type="submit" className="secondary" disabled={isPending}>
        {isPending ? "Saving..." : acknowledged ? "Update acknowledgement" : "Acknowledge alert"}
      </button>
      {status ? <p className="form-status success">{status}</p> : null}
      {error ? <p className="form-status error">{error}</p> : null}
    </form>
  );
}
