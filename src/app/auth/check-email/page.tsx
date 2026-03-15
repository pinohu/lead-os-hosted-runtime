type CheckEmailPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CheckEmailPage({ searchParams }: CheckEmailPageProps) {
  const params = (await searchParams) ?? {};
  const email = asString(params.email);
  const delivery = asString(params.delivery);
  const nextPath = asString(params.next) ?? "/dashboard";
  const reason = asString(params.reason);
  const deliveryFailed = delivery === "failed";

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">{deliveryFailed ? "Email delivery issue" : "Check Your Inbox"}</p>
        <h1>{deliveryFailed ? "Magic link delivery failed" : "Magic link sent"}</h1>
        <p className="lede">
          {deliveryFailed
            ? email
              ? `We could not deliver the sign-in email to ${email}. LeadOS no longer bypasses mailbox verification, so you will need email delivery restored before you can sign in again.`
              : "We could not deliver the sign-in email. LeadOS no longer bypasses mailbox verification, so email delivery must be restored before you can sign in again."
            : email
              ? `We sent a secure sign-in link to ${email}.`
              : "We sent a secure sign-in link to your operator email."}
        </p>
      </section>

      <section className="panel auth-panel">
        {deliveryFailed ? (
          <>
            <div className="status-banner error" role="alert">
              Email delivery is currently unavailable. Operator access now requires possession of the
              mailbox, so there is no same-browser fallback.
            </div>
            {reason ? (
              <p className="muted">Provider detail: {reason}</p>
            ) : null}
            <p className="muted">
              Restore delivery for the configured provider, then request a new sign-in link. If you
              already have an active session in another tab, that session will continue to work
              until it expires or you sign out.
            </p>
          </>
        ) : (
          <p className="muted">
            The link expires in 15 minutes. If you do not see it, check spam and then request a new
            one from the sign-in page.
          </p>
        )}
        <a href={`/auth/sign-in?next=${encodeURIComponent(nextPath)}`} className="secondary">
          Back to sign-in
        </a>
      </section>
    </main>
  );
}
