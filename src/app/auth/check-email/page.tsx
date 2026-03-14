type CheckEmailPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CheckEmailPage({ searchParams }: CheckEmailPageProps) {
  const params = (await searchParams) ?? {};
  const email = asString(params.email);

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Check Your Inbox</p>
        <h1>Magic link sent</h1>
        <p className="lede">
          {email
            ? `We sent a secure sign-in link to ${email}.`
            : "We sent a secure sign-in link to your operator email."}
        </p>
      </section>

      <section className="panel auth-panel">
        <p className="muted">
          The link expires in 15 minutes. If you do not see it, check spam and then request a new
          one from the sign-in page.
        </p>
        <a href="/auth/sign-in" className="secondary">
          Back to sign-in
        </a>
      </section>
    </main>
  );
}
