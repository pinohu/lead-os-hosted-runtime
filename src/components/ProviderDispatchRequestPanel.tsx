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
  const [revenueValues, setRevenueValues] = useState<Record<string, string>>({});
  const [marginValues, setMarginValues] = useState<Record<string, string>>({});
  const [invoiceNumbers, setInvoiceNumbers] = useState<Record<string, string>>({});
  const [invoiceStatuses, setInvoiceStatuses] = useState<Record<string, "not-issued" | "issued" | "sent" | "collected">>({});
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, "not-requested" | "pending" | "paid" | "failed">>({});
  const [paymentMethods, setPaymentMethods] = useState<Record<string, "cash" | "card" | "ach" | "financing" | "check" | "digital-link" | "other">>({});
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [paidAtValues, setPaidAtValues] = useState<Record<string, string>>({});
  const [reviewRatings, setReviewRatings] = useState<Record<string, string>>({});
  const [complaintStatuses, setComplaintStatuses] = useState<Record<string, "none" | "minor" | "major">>({});
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, "not-requested" | "requested" | "positive" | "mixed" | "negative">>({});
  const [refundIssued, setRefundIssued] = useState<Record<string, boolean>>({});

  function runAction(requestId: string, action: "accept" | "decline" | "complete") {
    setError("");
    setStatus("");

    if (action === "complete" && !(revenueValues[requestId] ?? "").trim()) {
      setError("Add completed revenue before reporting the job as complete.");
      return;
    }

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
          invoiceNumber: invoiceNumbers[requestId]?.trim() ? invoiceNumbers[requestId] : undefined,
          invoiceStatus: invoiceStatuses[requestId] ?? "issued",
          paymentStatus: paymentStatuses[requestId] ?? "pending",
          paymentMethod: paymentMethods[requestId],
          paymentAmount: paymentAmounts[requestId]?.trim() ? Number(paymentAmounts[requestId]) : undefined,
          paidAt: paidAtValues[requestId]?.trim() ? paidAtValues[requestId] : undefined,
          revenueValue: revenueValues[requestId]?.trim() ? Number(revenueValues[requestId]) : undefined,
          marginValue: marginValues[requestId]?.trim() ? Number(marginValues[requestId]) : undefined,
          complaintStatus: complaintStatuses[requestId] ?? "none",
          reviewStatus: reviewStatuses[requestId] ?? "not-requested",
          reviewRating: reviewRatings[requestId]?.trim() ? Number(reviewRatings[requestId]) : undefined,
          refundIssued: refundIssued[requestId] ?? false,
        }),
      });

      const json = await response.json().catch(() => null) as { success?: boolean; error?: string } | null;
      if (!response.ok || !json?.success) {
        setError(json?.error ?? "Dispatch request could not be updated.");
        return;
      }

      setStatus(
        action === "accept"
          ? "Dispatch request accepted."
          : action === "decline"
            ? "Dispatch request declined."
            : "Completed job outcome recorded.",
      );
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
            const accepted = request.status === "accepted";
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
                ) : accepted ? (
                  <div className="stack-grid">
                    <div className="portal-data-list compact">
                      <div>
                        <dt>Invoice #</dt>
                        <dd>
                          <input
                            value={invoiceNumbers[request.id] ?? ""}
                            onChange={(event) => setInvoiceNumbers((current) => ({ ...current, [request.id]: event.target.value }))}
                            placeholder="INV-10024"
                            disabled={isPending}
                          />
                        </dd>
                      </div>
                      <div>
                        <dt>Invoice status</dt>
                        <dd>
                          <select
                            value={invoiceStatuses[request.id] ?? "issued"}
                            onChange={(event) => setInvoiceStatuses((current) => ({ ...current, [request.id]: event.target.value as "not-issued" | "issued" | "sent" | "collected" }))}
                            disabled={isPending}
                          >
                            <option value="not-issued">Not issued</option>
                            <option value="issued">Issued</option>
                            <option value="sent">Sent</option>
                            <option value="collected">Collected</option>
                          </select>
                        </dd>
                      </div>
                      <div>
                        <dt>Payment status</dt>
                        <dd>
                          <select
                            value={paymentStatuses[request.id] ?? "pending"}
                            onChange={(event) => setPaymentStatuses((current) => ({ ...current, [request.id]: event.target.value as "not-requested" | "pending" | "paid" | "failed" }))}
                            disabled={isPending}
                          >
                            <option value="not-requested">Not requested</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="failed">Failed</option>
                          </select>
                        </dd>
                      </div>
                      <div>
                        <dt>Payment method</dt>
                        <dd>
                          <select
                            value={paymentMethods[request.id] ?? "card"}
                            onChange={(event) => setPaymentMethods((current) => ({ ...current, [request.id]: event.target.value as "cash" | "card" | "ach" | "financing" | "check" | "digital-link" | "other" }))}
                            disabled={isPending}
                          >
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="ach">ACH</option>
                            <option value="financing">Financing</option>
                            <option value="check">Check</option>
                            <option value="digital-link">Digital link</option>
                            <option value="other">Other</option>
                          </select>
                        </dd>
                      </div>
                      <div>
                        <dt>Payment amount</dt>
                        <dd>
                          <input
                            value={paymentAmounts[request.id] ?? ""}
                            onChange={(event) => setPaymentAmounts((current) => ({ ...current, [request.id]: event.target.value }))}
                            inputMode="decimal"
                            placeholder="Collected amount"
                            disabled={isPending}
                          />
                        </dd>
                      </div>
                      <div>
                        <dt>Paid at</dt>
                        <dd>
                          <input
                            type="datetime-local"
                            value={paidAtValues[request.id] ?? ""}
                            onChange={(event) => setPaidAtValues((current) => ({ ...current, [request.id]: event.target.value }))}
                            disabled={isPending}
                          />
                        </dd>
                      </div>
                      <div>
                        <dt>Revenue</dt>
                        <dd>
                          <input
                            value={revenueValues[request.id] ?? ""}
                            onChange={(event) => setRevenueValues((current) => ({ ...current, [request.id]: event.target.value }))}
                            inputMode="decimal"
                            placeholder="Completed invoice value"
                            disabled={isPending}
                          />
                        </dd>
                      </div>
                      <div>
                        <dt>Margin</dt>
                        <dd>
                          <input
                            value={marginValues[request.id] ?? ""}
                            onChange={(event) => setMarginValues((current) => ({ ...current, [request.id]: event.target.value }))}
                            inputMode="decimal"
                            placeholder="Estimated gross margin"
                            disabled={isPending}
                          />
                        </dd>
                      </div>
                      <div>
                        <dt>Complaint level</dt>
                        <dd>
                          <select
                            value={complaintStatuses[request.id] ?? "none"}
                            onChange={(event) => setComplaintStatuses((current) => ({ ...current, [request.id]: event.target.value as "none" | "minor" | "major" }))}
                            disabled={isPending}
                          >
                            <option value="none">None</option>
                            <option value="minor">Minor</option>
                            <option value="major">Major</option>
                          </select>
                        </dd>
                      </div>
                      <div>
                        <dt>Review outcome</dt>
                        <dd>
                          <select
                            value={reviewStatuses[request.id] ?? "not-requested"}
                            onChange={(event) => setReviewStatuses((current) => ({ ...current, [request.id]: event.target.value as "not-requested" | "requested" | "positive" | "mixed" | "negative" }))}
                            disabled={isPending}
                          >
                            <option value="not-requested">Not requested</option>
                            <option value="requested">Requested</option>
                            <option value="positive">Positive</option>
                            <option value="mixed">Mixed</option>
                            <option value="negative">Negative</option>
                          </select>
                        </dd>
                      </div>
                      <div>
                        <dt>Review rating</dt>
                        <dd>
                          <input
                            value={reviewRatings[request.id] ?? ""}
                            onChange={(event) => setReviewRatings((current) => ({ ...current, [request.id]: event.target.value }))}
                            inputMode="decimal"
                            placeholder="0-5"
                            disabled={isPending}
                          />
                        </dd>
                      </div>
                      <div>
                        <dt>Refund issued</dt>
                        <dd>
                          <label className="portal-chip">
                            <input
                              type="checkbox"
                              checked={refundIssued[request.id] ?? false}
                              onChange={(event) => setRefundIssued((current) => ({ ...current, [request.id]: event.target.checked }))}
                              disabled={isPending}
                            />
                            <span>Yes</span>
                          </label>
                        </dd>
                      </div>
                    </div>
                    <div className="cta-row">
                      <button type="button" className="primary" disabled={isPending} onClick={() => runAction(request.id, "complete")}>
                        Report completed job
                      </button>
                    </div>
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
