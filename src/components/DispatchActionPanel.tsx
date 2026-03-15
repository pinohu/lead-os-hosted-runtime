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
  const [revenueValue, setRevenueValue] = useState("");
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
          revenueValue: revenueValue.trim() ? Number(revenueValue) : undefined,
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
          <label htmlFor={`dispatch-revenue-${leadKey}`} className="sr-only">
            Revenue value
          </label>
          <input
            id={`dispatch-revenue-${leadKey}`}
            className="dispatch-action-revenue"
            value={revenueValue}
            onChange={(event) => setRevenueValue(event.target.value)}
            inputMode="decimal"
            placeholder="Revenue value when completing a job"
          />
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
