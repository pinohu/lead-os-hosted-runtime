"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import type { PlumbingOperatorActionType } from "@/lib/runtime-schema";

type DispatchActionPanelProps = {
  leadKey: string;
  compact?: boolean;
  visibleActions?: PlumbingOperatorActionType[];
};

const DEFAULT_ACTIONS: PlumbingOperatorActionType[] = [
  "dispatch-now",
  "assign-backup-provider",
  "retry-booking",
  "mark-booked",
  "mark-completed",
  "mark-lost",
];

function labelForAction(action: PlumbingOperatorActionType) {
  switch (action) {
    case "dispatch-now":
      return "Dispatch now";
    case "assign-backup-provider":
      return "Assign backup";
    case "retry-booking":
      return "Retry booking";
    case "mark-booked":
      return "Mark booked";
    case "mark-completed":
      return "Mark completed";
    case "mark-lost":
    default:
      return "Mark lost";
  }
}

export function DispatchActionPanel({
  leadKey,
  compact = false,
  visibleActions = DEFAULT_ACTIONS,
}: DispatchActionPanelProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<PlumbingOperatorActionType | null>(null);
  const [note, setNote] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState<"not-issued" | "issued" | "sent" | "collected">("issued");
  const [paymentStatus, setPaymentStatus] = useState<"not-requested" | "pending" | "paid" | "failed">("pending");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "ach" | "financing" | "check" | "digital-link" | "other">("card");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [revenueValue, setRevenueValue] = useState("");
  const [marginValue, setMarginValue] = useState("");
  const [complaintStatus, setComplaintStatus] = useState<"none" | "minor" | "major">("none");
  const [reviewStatus, setReviewStatus] = useState<"not-requested" | "requested" | "positive" | "mixed" | "negative">("not-requested");
  const [reviewRating, setReviewRating] = useState("");
  const [refundIssued, setRefundIssued] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runAction(actionType: PlumbingOperatorActionType) {
    if (actionType === "mark-completed" && !revenueValue.trim()) {
      setMessage("Add completed revenue before marking a plumbing job completed.");
      return;
    }

    setPendingAction(actionType);
    setMessage(null);

    try {
      const response = await fetch("/api/operators/dispatch-actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadKey,
          actionType,
          note: note.trim() || undefined,
          invoiceNumber: invoiceNumber.trim() || undefined,
          invoiceStatus,
          paymentStatus,
          paymentMethod,
          paymentAmount: paymentAmount.trim() ? Number(paymentAmount) : undefined,
          paidAt: paidAt.trim() || undefined,
          revenueValue: revenueValue.trim() ? Number(revenueValue) : undefined,
          marginValue: marginValue.trim() ? Number(marginValue) : undefined,
          complaintStatus,
          reviewStatus,
          reviewRating: reviewRating.trim() ? Number(reviewRating) : undefined,
          refundIssued,
        }),
      });
      const json = await response.json() as { success?: boolean; error?: string; outcome?: { status?: string } };
      if (!response.ok || !json.success) {
        throw new Error(json.error || "Dispatch action failed");
      }

      setMessage(`Updated: ${json.outcome?.status ?? actionType}`);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Dispatch action failed");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="stack-card">
      <p className="eyebrow">Dispatch actions</p>
      <p className="muted">
        {compact
          ? "Use the safest next action for this lead. The page refreshes after each change."
          : "Add operator context, then apply the next dispatch move. Completed jobs should include revenue so provider scoring stays accurate."}
      </p>
      {!compact ? (
        <>
          <label htmlFor={`dispatch-note-${leadKey}`} className="sr-only">
            Operator note
          </label>
          <textarea
            id={`dispatch-note-${leadKey}`}
            className="dispatch-action-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add operator context for this dispatch move"
            rows={3}
          />
          <label htmlFor={`dispatch-invoice-${leadKey}`} className="sr-only">
            Invoice number
          </label>
          <input
            id={`dispatch-invoice-${leadKey}`}
            className="dispatch-action-revenue"
            value={invoiceNumber}
            onChange={(event) => setInvoiceNumber(event.target.value)}
            placeholder="Invoice number"
          />
          <div className="portal-data-list compact">
            <div>
              <dt>Invoice status</dt>
              <dd>
                <select value={invoiceStatus} onChange={(event) => setInvoiceStatus(event.target.value as "not-issued" | "issued" | "sent" | "collected")}>
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
                <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as "not-requested" | "pending" | "paid" | "failed")}>
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
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as "cash" | "card" | "ach" | "financing" | "check" | "digital-link" | "other")}>
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
                  className="dispatch-action-revenue"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="Collected amount"
                />
              </dd>
            </div>
            <div>
              <dt>Paid at</dt>
              <dd>
                <input
                  type="datetime-local"
                  value={paidAt}
                  onChange={(event) => setPaidAt(event.target.value)}
                />
              </dd>
            </div>
          </div>
          <input
            id={`dispatch-revenue-${leadKey}`}
            className="dispatch-action-revenue"
            value={revenueValue}
            onChange={(event) => setRevenueValue(event.target.value)}
            inputMode="decimal"
            placeholder="Revenue value when completing a job"
          />
          <label htmlFor={`dispatch-margin-${leadKey}`} className="sr-only">
            Margin value
          </label>
          <input
            id={`dispatch-margin-${leadKey}`}
            className="dispatch-action-revenue"
            value={marginValue}
            onChange={(event) => setMarginValue(event.target.value)}
            inputMode="decimal"
            placeholder="Margin value for quality-aware routing"
          />
          <div className="portal-data-list compact">
            <div>
              <dt>Complaint level</dt>
              <dd>
                <select value={complaintStatus} onChange={(event) => setComplaintStatus(event.target.value as "none" | "minor" | "major")}>
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
                  value={reviewStatus}
                  onChange={(event) =>
                    setReviewStatus(event.target.value as "not-requested" | "requested" | "positive" | "mixed" | "negative")}
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
                  className="dispatch-action-revenue"
                  value={reviewRating}
                  onChange={(event) => setReviewRating(event.target.value)}
                  inputMode="decimal"
                  placeholder="0-5"
                />
              </dd>
            </div>
            <div>
              <dt>Refund issued</dt>
              <dd>
                <label className="portal-chip">
                  <input
                    type="checkbox"
                    checked={refundIssued}
                    onChange={(event) => setRefundIssued(event.target.checked)}
                  />
                  <span>Yes</span>
                </label>
              </dd>
            </div>
          </div>
        </>
      ) : null}
      <div className="cta-row">
        {visibleActions.map((action) => (
          <button
            key={action}
            type="button"
            className={action === "mark-lost" ? "secondary" : "primary"}
            onClick={() => void runAction(action)}
            disabled={pendingAction !== null}
            aria-busy={pendingAction === action}
          >
            {pendingAction === action ? "Working..." : labelForAction(action)}
          </button>
        ))}
      </div>
      {message ? (
        <p
          className={message.startsWith("Updated:") ? "status-banner success" : "status-banner error"}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
