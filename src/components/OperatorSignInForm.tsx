"use client";

import { useFormStatus } from "react-dom";

type OperatorSignInFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  defaultEmail?: string;
  nextPath: string;
  disabled?: boolean;
};

function SubmitButton({ disabled = false }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  const blocked = pending || disabled;

  return (
    <button type="submit" className="primary" aria-busy={pending} disabled={blocked}>
      {pending ? "Sending secure link..." : disabled ? "Sign-in unavailable" : "Send magic link"}
    </button>
  );
}

export function OperatorSignInForm({
  action,
  defaultEmail,
  nextPath,
  disabled = false,
}: OperatorSignInFormProps) {
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
        disabled={disabled}
        defaultValue={defaultEmail}
        placeholder="you@yourdomain.com"
      />
      <p className="muted form-help">
        Approved operators receive a magic link and must verify access from that mailbox. If email
        delivery is unavailable, LeadOS will not bypass verification.
      </p>
      <SubmitButton disabled={disabled} />
    </form>
  );
}
