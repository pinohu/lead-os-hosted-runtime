"use client";

import { useState, useTransition } from "react";

type ProviderDispatchRequest = {
  id: string;
  leadKey: string;
  providerLabel: string;
  status: "pending" | "accepted" | "declined" | "expired";
  issueType?: string;
  urgencyBand?: string;
  propertyType?: string;
  note?: string;
  respondedAt?: string;
  createdAt: string;
};

type Props = {
  requests: ProviderDispatchRequest[];
};

export function ProviderDispatchRequestPanel({ requests }: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  function runAction(requestId: string, action: "accept" | "decline") {
    setError("");
    setStatus("");

    startTransition(async () => {
      const response = await fetch("/api/provider-portal/dispatch-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          action,
          note: notes[requestId] ?? "",
        }),
      });

      const json = await response.json().catch(() => null) as { success?: boolean; error?: string } | null;
      if (!response.ok || !json?.success) {
        setError(json?.error ?? "Dispatch request could not be updated.");
        return;
      }

      setStatus(action === "accept" ? "Dispatch request accepted." : "Dispatch request declined.");
      window.location.reload();
    });
  }

  return (
    <section className="panel">
      <p className="eyebrow">Live dispatch requests</p>
      <h2>Respond to new jobs</h2>
      <p className="muted">
        Accept jobs you can claim right now or decline quickly so LeadOS can move to backup coverage without delay.
      </p>

      {error ? <p className="status-banner error">{error}</p> : null}
      {status ? <p className="status-banner success">{status}</p> : null}

      {requests.length === 0 ? (
        <p className="muted">No provider dispatch requests are waiting right now.</p>
      ) : (
        <div className="stack-grid">
          {requests.map((request) => {
            const pending = request.status === "pending";
            return (
              <article key={request.id} className="stack-card">
                <p className="eyebrow">{request.providerLabel}</p>
                <h3>{request.urgencyBand ?? "dispatch request"}</h3>
                <ul className="check-list">
                  <li>Lead: {request.leadKey}</li>
                  <li>Issue: {request.issueType ?? "general plumbing"}</li>
                  <li>Property: {request.propertyType ?? "unknown"}</li>
                  <li>Status: {request.status}</li>
                  <li>Requested: {new Date(request.createdAt).toLocaleString()}</li>
                  {request.respondedAt ? <li>Responded: {new Date(request.respondedAt).toLocaleString()}</li> : null}
                </ul>
                <label>
                  Dispatch note
                  <textarea
                    rows={3}
                    value={notes[request.id] ?? request.note ?? ""}
                    onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                    placeholder="On the way in 20 minutes, or unavailable because team is full."
                    disabled={!pending || isPending}
                  />
                </label>
                {pending ? (
                  <div className="cta-row">
                    <button type="button" className="primary" disabled={isPending} onClick={() => runAction(request.id, "accept")}>
                      Accept job
                    </button>
                    <button type="button" className="secondary" disabled={isPending} onClick={() => runAction(request.id, "decline")}>
                      Decline
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
