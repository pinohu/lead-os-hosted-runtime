"use client";

import { useFormStatus } from "react-dom";

type OperatorSignInFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  defaultEmail?: string;
  nextPath: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="primary" aria-busy={pending} disabled={pending}>
      {pending ? "Continuing securely..." : "Send magic link"}
    </button>
  );
}

export function OperatorSignInForm({ action, defaultEmail, nextPath }: OperatorSignInFormProps) {
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="next" value={nextPath} />
      <label htmlFor="email">Operator email</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={defaultEmail}
        placeholder="you@yourdomain.com"
      />
      <p className="muted form-help">
        Approved operators receive a magic link. If email delivery is unavailable, LeadOS will
        continue securely in this same browser.
      </p>
      <SubmitButton />
    </form>
  );
}
