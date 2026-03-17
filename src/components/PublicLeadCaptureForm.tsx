"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import type { CanonicalEventType, FunnelFamily, MarketplaceAudience } from "@/lib/runtime-schema";
import type { ExperienceProfile } from "@/lib/experience";
import type { IntakeSource } from "@/lib/intake";

type PublicNextStep = {
  family: FunnelFamily;
  destination: string;
  ctaLabel: string;
  message: string;
};

type IntakeResponse = {
  success: boolean;
  leadKey: string;
  existing: boolean;
  hot: boolean;
  stage: string;
  nextStep: PublicNextStep;
};

type PublicLeadCaptureFormProps = {
  source: IntakeSource;
  family: FunnelFamily;
  niche: string;
  service: string;
  pagePath: string;
  profile: ExperienceProfile;
  audience: MarketplaceAudience;
  variant: "customer" | "provider";
  stickyLabel: string;
};

type StoredCaptureDraft = {
  step: number;
  selectedGoalId: string;
  firstName: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
};

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function buildDraftStorageKey(pagePath: string, service: string, audience: string) {
  return `lead-os:public-capture:${audience}:${service}:${pagePath}`;
}

function createClientTraceKey(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function PublicLeadCaptureForm(props: PublicLeadCaptureFormProps) {
  const [step, setStep] = useState(1);
  const [selectedGoalId, setSelectedGoalId] = useState(props.profile.discoveryOptions[0]?.id ?? "");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IntakeResponse | null>(null);
  const [recoveredDraft, setRecoveredDraft] = useState(false);
  const [visitorId] = useState(() => createClientTraceKey("visitor"));
  const [sessionId] = useState(() => createClientTraceKey("session"));
  const [isPending, startTransition] = useTransition();
  const formStartedRef = useRef(false);
  const submissionCompletedRef = useRef(false);
  const statusId = useId();
  const storageKey = buildDraftStorageKey(props.pagePath, props.service, props.audience);

  const selectedGoal =
    props.profile.discoveryOptions.find((option) => option.id === selectedGoalId) ??
    props.profile.discoveryOptions[0];
  const requiresPhone = props.profile.mode === "booking-first";

  async function sendPublicEvent(
    eventType: CanonicalEventType,
    status: string,
    metadata: Record<string, unknown> = {},
  ) {
    try {
      await fetch("/api/public-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventType,
          visitorId,
          sessionId,
          source: props.source,
          service: props.service,
          niche: props.niche,
          pagePath: props.pagePath,
          blueprintId: props.pagePath,
          stepId: `public-step-${step}`,
          family: props.family,
          audience: props.audience,
          experimentId: props.profile.experimentId,
          variantId: props.profile.variantId,
          status,
          metadata,
        }),
      });
    } catch {
      // Keep the form moving.
    }
  }

  useEffect(() => {
    void sendPublicEvent("page_view", "VIEWED", {
      service: props.service,
      variant: props.variant,
    });
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<StoredCaptureDraft>;
      if (draft.selectedGoalId) setSelectedGoalId(draft.selectedGoalId);
      if (draft.firstName) setFirstName(draft.firstName);
      if (draft.email) setEmail(draft.email);
      if (draft.phone) setPhone(draft.phone);
      if (draft.company) setCompany(draft.company);
      if (draft.notes) setNotes(draft.notes);
      if (typeof draft.step === "number" && draft.step >= 1 && draft.step <= 3) {
        setStep(draft.step);
      }
      setRecoveredDraft(true);
    } catch {
      // Ignore malformed drafts.
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || result) return;
    const hasProgress = Boolean(
      selectedGoalId ||
        firstName.trim() ||
        email.trim() ||
        phone.trim() ||
        company.trim() ||
        notes.trim() ||
        step > 1,
    );
    if (!hasProgress) return;
    const draft: StoredCaptureDraft = {
      step,
      selectedGoalId,
      firstName,
      email,
      phone,
      company,
      notes,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [step, selectedGoalId, firstName, email, phone, company, notes, result, storageKey]);

  useEffect(() => {
    if (!selectedGoalId || formStartedRef.current) return;
    formStartedRef.current = true;
    void sendPublicEvent("form_started", "STARTED", {
      goalId: selectedGoalId,
      goalLabel: selectedGoal?.label,
    });
  }, [selectedGoalId, selectedGoal?.label]);

  useEffect(() => {
    if (!formStartedRef.current || submissionCompletedRef.current || typeof window === "undefined") {
      return;
    }
    const handleBeforeUnload = () => {
      const hasProgress = Boolean(
        selectedGoalId ||
          firstName.trim() ||
          email.trim() ||
          phone.trim() ||
          company.trim() ||
          notes.trim() ||
          step > 1,
      );
      if (!hasProgress) return;
      const body = JSON.stringify({
        eventType: "form_abandoned",
        visitorId,
        sessionId,
        source: props.source,
        service: props.service,
        niche: props.niche,
        pagePath: props.pagePath,
        blueprintId: props.pagePath,
        stepId: `public-step-${step}`,
        family: props.family,
        audience: props.audience,
        experimentId: props.profile.experimentId,
        variantId: props.profile.variantId,
        status: "ABANDONED",
        metadata: {
          step,
          goalId: selectedGoalId,
        },
      });
      navigator.sendBeacon?.("/api/public-events", new Blob([body], { type: "application/json" }));
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [
    step,
    selectedGoalId,
    firstName,
    email,
    phone,
    company,
    notes,
    props.source,
    props.service,
    props.niche,
    props.pagePath,
    props.family,
    props.audience,
    props.profile.experimentId,
    props.profile.variantId,
    sessionId,
    visitorId,
  ]);

  function validateStep() {
    if (step === 1 && !selectedGoalId) {
      setError("Choose the path that fits best first.");
      return false;
    }
    if (step === 2) {
      if (!firstName.trim()) {
        setError("Add your first name.");
        return false;
      }
      if (requiresPhone && !normalizePhone(phone)) {
        setError("Add your best phone number for the fastest response.");
        return false;
      }
      if (!requiresPhone && !(email.trim() || normalizePhone(phone))) {
        setError("Add your email or best phone number.");
        return false;
      }
    }
    return true;
  }

  function nextStep() {
    if (!validateStep()) return;
    setError(null);
    void sendPublicEvent("form_step_completed", "COMPLETED", {
      completedStep: step,
      goalId: selectedGoal?.id,
      goalLabel: selectedGoal?.label,
    });
    setStep((current) => Math.min(current + 1, 3));
  }

  function previousStep() {
    setError(null);
    setStep((current) => Math.max(current - 1, 1));
  }

  async function handleSubmit() {
    if (!validateStep()) return;
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/intake", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: props.source,
            firstName,
            email: email || undefined,
            phone: phone ? normalizePhone(phone) : undefined,
            company: company || undefined,
            service: props.service,
            niche: props.niche,
            page: props.pagePath,
            message: notes || undefined,
            metadata: {
              goalId: selectedGoal?.id,
              goalLabel: selectedGoal?.label,
              interactionMode: props.profile.mode,
              experimentId: props.profile.experimentId,
              variantId: props.profile.variantId,
              pagePath: props.pagePath,
              marketplaceAudience: props.audience,
            },
            website: "",
            experimentId: props.profile.experimentId,
            variantId: props.profile.variantId,
            marketplaceAudience: props.audience,
            wantsBooking:
              selectedGoal?.signals.wantsBooking ?? props.profile.mode === "booking-first",
            prefersChat:
              selectedGoal?.signals.prefersChat ?? props.profile.mode === "chat-first",
            contentEngaged:
              selectedGoal?.signals.contentEngaged ?? props.profile.mode === "webinar-first",
            preferredFamily: props.family,
          }),
        });

        const payload = (await response.json()) as IntakeResponse & { error?: string };
        if (!response.ok || !payload.success) {
          setError(payload.error ?? "We could not save your details just now.");
          return;
        }

        submissionCompletedRef.current = true;
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(storageKey);
        }
        void sendPublicEvent("cta_clicked", "CLICKED", {
          ctaRole: "form-submit",
          ctaLabel: props.stickyLabel,
          goalId: selectedGoal?.id,
          goalLabel: selectedGoal?.label,
        });
        setResult(payload);
      } catch {
        setError("We could not connect right now. Please try again.");
      }
    });
  }

  return (
    <section className="public-capture panel" id="capture-form">
      <div className="public-capture__header">
        <div>
          <p className="eyebrow">{props.variant === "provider" ? "Provider application" : "Get started"}</p>
          <h2>
            {props.variant === "provider"
              ? "A short first step for serious providers"
              : "A short first step to the right next move"}
          </h2>
          <p className="muted">
            {props.variant === "provider"
              ? "Share the basics and we will keep the next step focused on service area, fit, and readiness."
              : requiresPhone
                ? "Share the minimum we need to keep the fastest path open."
                : "Share the minimum we need to keep the next step relevant."}
          </p>
        </div>
        <div className="public-capture__progress" aria-label="Progress">
          {[1, 2, 3].map((item) => (
            <span key={item} className={item === step ? "is-current" : item < step ? "is-complete" : ""}>
              {item}
            </span>
          ))}
        </div>
      </div>

      {recoveredDraft ? (
        <div className="status-banner success" role="status">
          Your progress was saved. Pick up where you left off.
        </div>
      ) : null}

      {result ? (
        <div className="status-banner success" role="status">
          <h3>Your next step is ready</h3>
          <p>{result.nextStep.message}</p>
          <div className="cta-row">
            <Link
              href={result.nextStep.destination}
              className="primary"
              onClick={() => {
                void sendPublicEvent("cta_clicked", "CLICKED", {
                  ctaRole: "post-submit-primary",
                  ctaLabel: result.nextStep.ctaLabel,
                  destination: result.nextStep.destination,
                });
              }}
            >
              {result.nextStep.ctaLabel}
            </Link>
            <a href={props.profile.secondaryActionHref} className="secondary">
              {props.profile.secondaryActionLabel}
            </a>
          </div>
        </div>
      ) : (
        <>
          {step === 1 ? (
            <div className="public-choice-grid">
              {props.profile.discoveryOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`public-choice-card${selectedGoalId === option.id ? " is-selected" : ""}`}
                  onClick={() => setSelectedGoalId(option.id)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="public-form-grid">
              <label>
                First name
                <input value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" />
              </label>
              <label>
                Email {!requiresPhone ? "(recommended)" : "(optional)"}
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
              </label>
              <label>
                Phone {requiresPhone ? "(required)" : "(recommended)"}
                <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" />
              </label>
              {props.variant === "provider" ? (
                <label>
                  Company
                  <input value={company} onChange={(event) => setCompany(event.target.value)} autoComplete="organization" />
                </label>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="public-confirm-grid">
              <article className="review-card">
                <p className="eyebrow">Chosen path</p>
                <h3>{selectedGoal?.label}</h3>
                <p className="muted">{selectedGoal?.description}</p>
              </article>
              <label className="details-field">
                Optional details
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} />
              </label>
            </div>
          ) : null}

          {error ? (
            <div id={statusId} className="status-banner error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="cta-row">
            {step > 1 ? (
              <button type="button" className="secondary" onClick={previousStep}>
                Back
              </button>
            ) : null}
            {step < 3 ? (
              <button type="button" className="primary" onClick={nextStep}>
                Continue
              </button>
            ) : (
              <button type="button" className="primary" onClick={handleSubmit} disabled={isPending}>
                {isPending ? "Saving..." : props.stickyLabel}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
