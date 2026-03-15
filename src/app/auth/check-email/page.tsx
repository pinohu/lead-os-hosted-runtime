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
  const deliveryFailed = delivery === "failed";

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">{deliveryFailed ? "Delivery fallback" : "Check Your Inbox"}</p>
        <h1>{deliveryFailed ? "Continue securely in this browser" : "Magic link sent"}</h1>
        <p className="lede">
          {deliveryFailed
            ? email
              ? `We could not deliver the email to ${email}, but you can continue securely from this browser because you already requested access from an approved operator address.`
              : "We could not deliver the email, but you can continue securely from this browser because you already requested access from an approved operator address."
            : email
              ? `We sent a secure sign-in link to ${email}.`
              : "We sent a secure sign-in link to your operator email."}
        </p>
      </section>

      <section className="panel auth-panel">
        {deliveryFailed ? (
          <>
            <div className="status-banner error" role="alert">
              Email delivery is currently unavailable. This fallback only works in the same browser
              that requested the magic link and expires in 15 minutes.
            </div>
            <form action="/auth/browser-verify" method="post" className="auth-form">
              <input type="hidden" name="next" value={nextPath} />
              <button type="submit" className="primary">
                Continue to dashboard
              </button>
            </form>
          </>
        ) : (
          <p className="muted">
            The link expires in 15 minutes. If you do not see it, check spam and then request a new
            one from the sign-in page.
          </p>
        )}
        <a href="/auth/sign-in" className="secondary">
          Back to sign-in
        </a>
      </section>
    </main>
  );
}
