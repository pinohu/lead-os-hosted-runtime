"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import type { ExperienceProfile } from "@/lib/experience";
import type { IntakeSource } from "@/lib/intake";
import type { FunnelFamily } from "@/lib/runtime-schema";

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
  scoreBand: "low" | "medium" | "high";
  stage: string;
  nextStep: PublicNextStep;
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
  const plumbingLike = props.niche === "plumbing" || props.niche === "home-services";
  const providerAudience = props.profile.audience === "provider";
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

  const selectedGoal =
    props.profile.discoveryOptions.find((option) => option.id === selectedGoalId) ??
    props.profile.discoveryOptions[0];
  const requiresPhone = props.profile.mode === "booking-first";
  const contactRequirement = requiresPhone
    ? "Best phone number required for the fastest route"
    : providerAudience
      ? "Email required, phone recommended if you want dispatch follow-up"
      : "Email or phone is enough. Add both only if you want faster follow-up";

  function hasMinimumContact() {
    if (requiresPhone) {
      return Boolean(normalizePhone(phone));
    }
    return Boolean(email.trim() || normalizePhone(phone));
  }

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
      if (!hasMinimumContact()) {
        setError(
          providerAudience
            ? "Add your email or best phone number so we can continue your provider onboarding path."
            : plumbingLike
              ? requiresPhone
                ? "Add your best phone number so we can keep the fast plumbing path available."
                : "Add your email or phone so we can confirm the next plumbing step."
              : "Add your email or phone so we can send your tailored next step.",
        );
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
              trustPromise: props.profile.trustPromise,
              marketplaceAudience: props.profile.audience,
            },
            website: "",
            experimentId: props.profile.experimentId,
            variantId: props.profile.variantId,
            marketplaceAudience: props.profile.audience,
            returning: props.returning,
            contentEngaged:
              selectedGoal?.signals.contentEngaged ?? props.profile.mode === "webinar-first",
            wantsBooking:
              selectedGoal?.signals.wantsBooking ?? props.profile.mode === "booking-first",
            wantsCheckout:
              selectedGoal?.signals.wantsCheckout ?? props.family === "checkout",
            prefersChat:
              selectedGoal?.signals.prefersChat ?? props.profile.mode === "chat-first",
            preferredFamily: props.family,
          }),
        });

        const payload = (await response.json()) as IntakeResponse & { error?: string };
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
          <h2 id="capture-form-title">
            {plumbingLike
              ? "Confirm urgency, keep the path short, and get the right next step"
              : "Get the right next step without starting from scratch"}
          </h2>
          <p className="muted">
            {plumbingLike
              ? "We collect just enough to route the job fast, preserve context, and keep dispatch or estimate follow-up moving."
              : "We use one light commitment first, then tailor the next step around your actual intent."}
          </p>
        </div>
        <ol className="step-rail" aria-label="Form progress">
          {[1, 2, 3].map((item) => (
            <li
              key={item}
              className={item === step ? "current" : item < step ? "complete" : undefined}
            >
              <span>{item}</span>
              <strong>{item === 1 ? "Goal" : item === 2 ? "Contact" : "Confirm"}</strong>
            </li>
          ))}
        </ol>
      </div>

      <div className="sticky-summary" aria-live="polite">
        <span>Audience: {providerAudience ? "provider" : "client"}</span>
        <span>Mode: {props.profile.mode.replace("-", " ")}</span>
        <span>Outcome: {selectedGoal?.label ?? "Choose one"}</span>
        <span>Progress: step {step} of 3</span>
      </div>

      <div className="conversion-assurance" aria-label="Conversion reassurance">
        <span>Takes about 30 to 60 seconds</span>
        <span>{contactRequirement}</span>
        <span>{providerAudience ? "Network ops fallback stays available" : "Human fallback stays available"}</span>
      </div>

      {result ? (
        <div className="status-banner success" role="status">
          <h3>
            {providerAudience
              ? "Your provider onboarding path is ready"
              : plumbingLike
                ? "Your next plumbing step is ready"
                : "Your path is ready"}
          </h3>
          <p>{result.nextStep.message}</p>
          <p className="muted">
            Priority: {result.scoreBand} {result.hot ? "- Fast path activated" : "- Standard follow-up path activated"}
          </p>
          <div className="cta-row">
            <Link href={result.nextStep.destination} className="primary">
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
            <fieldset className="capture-step">
              <legend>{props.profile.discoveryPrompt}</legend>
              <div className="option-grid">
                {props.profile.discoveryOptions.map((option) => (
                  <label
                    key={option.id}
                    className={`choice-card${selectedGoalId === option.id ? " selected" : ""}`}
                  >
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
              <h3>
                {providerAudience
                  ? "Where should we send network and dispatch follow-up?"
                  : plumbingLike
                    ? "Where should we confirm the next plumbing step?"
                    : "Where should we send the tailored next step?"}
              </h3>
              <p className="muted">
                {providerAudience
                  ? "We ask for the minimum needed to map your service area, specialties, and response readiness without turning this into a long signup flow."
                  : plumbingLike
                    ? "We ask for the minimum needed to keep urgency, service type, and routing context intact."
                    : "We ask for the minimum we need to keep your path relevant."}
              </p>
              <p className="form-helper-callout">{contactRequirement}</p>
              <div className="form-grid form-grid-single">
                {props.profile.fieldOrder.map((field) => {
                  if (field === "firstName") {
                    return (
                      <label key={field}>
                        First name
                        <input
                          value={firstName}
                          onChange={(event) => setFirstName(event.target.value)}
                          autoComplete="given-name"
                          aria-describedby="contact-guidance"
                        />
                      </label>
                    );
                  }
                  if (field === "email") {
                    return (
                      <label key={field}>
                        Email {!requiresPhone ? "(recommended)" : "(optional)"}
                        <input
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          autoComplete="email"
                          inputMode="email"
                          aria-describedby="contact-guidance"
                        />
                      </label>
                    );
                  }
                  if (field === "company") {
                    return (
                      <label key={field}>
                        {providerAudience ? "Company or plumbing brand" : "Company"}
                        <input
                          value={company}
                          onChange={(event) => setCompany(event.target.value)}
                          autoComplete="organization"
                        />
                      </label>
                    );
                  }
                  return (
                    <label key={field}>
                      Phone {requiresPhone ? "(required for this path)" : "(recommended)"}
                      <input
                        type="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        autoComplete="tel"
                        inputMode="tel"
                        aria-describedby="contact-guidance"
                      />
                    </label>
                  );
                })}
              </div>
              <p id="contact-guidance" className="field-help">
                {providerAudience
                  ? "We use this only to continue onboarding, clarify coverage, and keep network ops follow-up relevant."
                  : plumbingLike
                    ? "We use this only to confirm the next plumbing step and keep the routing context intact."
                    : "We use this only to confirm the next step and avoid asking you to start over later."}
              </p>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="capture-step">
              <h3>
                {providerAudience
                  ? "Confirm your provider-network path"
                  : plumbingLike
                    ? "Confirm the fastest useful path"
                    : "Confirm your tailored path"}
              </h3>
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
              <label className="details-field">
                {providerAudience
                  ? "Optional onboarding details"
                  : plumbingLike
                    ? "Optional job details"
                    : "Optional context"}
                <span className="field-help">
                  {providerAudience
                    ? "Add service-area notes, licensing detail, or scheduling context only if it helps."
                    : plumbingLike
                      ? "Add access notes, issue detail, or timing context only if it helps."
                      : "Add extra context only if it makes the next step easier."}
                </span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} />
              </label>
              <p className="muted">{props.profile.returnOffer}</p>
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
                {isPending
                  ? providerAudience
                    ? "Preparing your provider path..."
                    : plumbingLike
                      ? "Routing your next plumbing step..."
                      : "Tailoring your next step..."
                  : providerAudience
                    ? "Join the network path"
                    : "Save and continue"}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
