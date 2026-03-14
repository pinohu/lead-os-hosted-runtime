"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import type { ExperienceProfile } from "@/lib/experience";
import type { IntakeSource } from "@/lib/intake";
import type { FunnelFamily } from "@/lib/runtime-schema";

type IntakeDecision = {
  destination: string;
  ctaLabel: string;
  reason: string;
  family: FunnelFamily;
};

type IntakeResponse = {
  success: boolean;
  leadKey: string;
  decision: IntakeDecision;
  hot: boolean;
  score: number;
};

type AdaptiveLeadCaptureFormProps = {
  source: IntakeSource;
  family: FunnelFamily;
  niche: string;
  service: string;
  pagePath: string;
  returning?: boolean;
  profile: ExperienceProfile;
};

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

export function AdaptiveLeadCaptureForm(props: AdaptiveLeadCaptureFormProps) {
  const [step, setStep] = useState(1);
  const [selectedGoalId, setSelectedGoalId] = useState(props.profile.discoveryOptions[0]?.id ?? "");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<IntakeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const statusId = useId();

  const selectedGoal = props.profile.discoveryOptions.find((option) => option.id === selectedGoalId) ?? props.profile.discoveryOptions[0];
  const requiresPhone = props.profile.mode === "booking-first";

  function goToNextStep() {
    if (step === 1 && !selectedGoalId) {
      setError("Choose the outcome you want first so we can tailor the path.");
      return;
    }

    if (step === 2) {
      if (!firstName.trim()) {
        setError("Add your first name so we can personalize the next step.");
        return;
      }
      if (!email.trim()) {
        setError("Add your email so we can send your tailored next step.");
        return;
      }
      if (requiresPhone && !normalizePhone(phone)) {
        setError("Add your best phone number so we can keep the fast path available.");
        return;
      }
    }

    setError(null);
    setStep((current) => Math.min(current + 1, 3));
  }

  function goBack() {
    setError(null);
    setStep((current) => Math.max(current - 1, 1));
  }

  async function handleSubmit() {
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
            email,
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
              variantId: props.profile.variantId,
              pagePath: props.pagePath,
              trustPromise: props.profile.trustPromise,
            },
            returning: props.returning,
            contentEngaged: selectedGoal?.signals.contentEngaged ?? props.profile.mode === "webinar-first",
            wantsBooking: selectedGoal?.signals.wantsBooking ?? props.profile.mode === "booking-first",
            wantsCheckout: selectedGoal?.signals.wantsCheckout ?? props.family === "checkout",
            prefersChat: selectedGoal?.signals.prefersChat ?? props.profile.mode === "chat-first",
            preferredFamily: props.family,
          }),
        });

        const payload = await response.json();
        if (!response.ok || !payload.success) {
          setError(payload.error ?? "We could not save your progress. Please try again.");
          return;
        }

        setResult(payload);
      } catch {
        setError("We could not connect to the runtime just now. Please try again.");
      }
    });
  }

  return (
    <section className="capture-shell panel" id="capture-form" aria-labelledby="capture-form-title">
      <div className="capture-header">
        <div>
          <p className="eyebrow">Adaptive capture path</p>
          <h2 id="capture-form-title">Get the right next step without starting from scratch</h2>
          <p className="muted">
            We use one light commitment first, then tailor the milestone-two follow-up and the
            milestone-three offer around your actual intent.
          </p>
        </div>
        <ol className="step-rail" aria-label="Form progress">
          {[1, 2, 3].map((item) => (
            <li key={item} className={item === step ? "current" : item < step ? "complete" : undefined}>
              <span>{item}</span>
              <strong>{item === 1 ? "Goal" : item === 2 ? "Contact" : "Confirm"}</strong>
            </li>
          ))}
        </ol>
      </div>

      <div className="sticky-summary" aria-live="polite">
        <span>Mode: {props.profile.mode.replace("-", " ")}</span>
        <span>Outcome: {selectedGoal?.label ?? "Choose one"}</span>
        <span>Progress: step {step} of 3</span>
      </div>

      {result ? (
        <div className="status-banner success" role="status">
          <h3>Your path is ready</h3>
          <p>{result.decision.reason}</p>
          <p className="muted">
            Score: {result.score} {result.hot ? "• Hot path activated" : "• Standard nurture path activated"}
          </p>
          <div className="cta-row">
            <Link href={result.decision.destination} className="primary">
              {result.decision.ctaLabel}
            </Link>
            <a href={props.profile.secondaryActionHref} className="secondary">
              {props.profile.secondaryActionLabel}
            </a>
          </div>
        </div>
      ) : (
        <>
          {step === 1 ? (
            <fieldset className="capture-step">
              <legend>{props.profile.discoveryPrompt}</legend>
              <div className="option-grid">
                {props.profile.discoveryOptions.map((option) => (
                  <label key={option.id} className={`choice-card${selectedGoalId === option.id ? " selected" : ""}`}>
                    <input
                      type="radio"
                      name="goal"
                      value={option.id}
                      checked={selectedGoalId === option.id}
                      onChange={() => setSelectedGoalId(option.id)}
                    />
                    <span className="choice-title">{option.label}</span>
                    <span className="muted">{option.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {step === 2 ? (
            <div className="capture-step">
              <h3>Where should we send the tailored next step?</h3>
              <p className="muted">
                We ask for the minimum we need to keep your path relevant. If you are on a fast
                booking path, we keep phone available too.
              </p>
              <div className="form-grid">
                <label>
                  First name
                  <input value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    inputMode="email"
                  />
                </label>
                <label>
                  Company
                  <input value={company} onChange={(event) => setCompany(event.target.value)} autoComplete="organization" />
                </label>
                <label>
                  Phone {requiresPhone ? "(recommended for this path)" : "(optional)"}
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </label>
                <label className="span-two">
                  Context we should know before tailoring the next step
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} />
                </label>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="capture-step">
              <h3>Confirm your tailored path</h3>
              <div className="review-grid">
                <article className="review-card">
                  <p className="eyebrow">Chosen outcome</p>
                  <h4>{selectedGoal?.label}</h4>
                  <p className="muted">{selectedGoal?.description}</p>
                </article>
                <article className="review-card">
                  <p className="eyebrow">What happens next</p>
                  <h4>{props.profile.primaryActionLabel}</h4>
                  <p className="muted">{props.profile.progressSteps[1]?.detail}</p>
                </article>
              </div>
              <p className="muted">
                {props.profile.returnOffer}
              </p>
            </div>
          ) : null}

          {error ? (
            <div id={statusId} className="status-banner error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="cta-row">
            {step > 1 ? (
              <button type="button" className="secondary" onClick={goBack}>
                Back
              </button>
            ) : null}
            {step < 3 ? (
              <button type="button" className="primary" onClick={goToNextStep}>
                Continue
              </button>
            ) : (
              <button type="button" className="primary" onClick={handleSubmit} disabled={isPending}>
                {isPending ? "Tailoring your next step..." : "Save and continue"}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
