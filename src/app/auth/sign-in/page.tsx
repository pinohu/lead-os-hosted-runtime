import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  OPERATOR_BROWSER_FALLBACK_COOKIE,
  buildOperatorAbsoluteUrl,
  createBrowserFallbackToken,
  getOperatorPublicOrigin,
  isAllowedOperatorEmail,
  sanitizeNextPath,
  sendOperatorMagicLink,
  summarizeOperatorDeliveryFailure,
} from "@/lib/operator-auth";

type SignInPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function requestMagicLinkAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nextPath = sanitizeNextPath(String(formData.get("next") ?? "/dashboard"));

  if (!email || !isAllowedOperatorEmail(email)) {
    redirect(buildOperatorAbsoluteUrl(`/auth/sign-in?error=unauthorized&next=${encodeURIComponent(nextPath)}`));
  }

  const headerStore = await headers();
  const origin = getOperatorPublicOrigin({
    host: headerStore.get("host"),
    forwardedHost: headerStore.get("x-forwarded-host"),
    forwardedProto: headerStore.get("x-forwarded-proto"),
  });

  const result = await sendOperatorMagicLink(email, origin, nextPath);
  if (!result.ok) {
    const cookieStore = await cookies();
    const fallbackToken = await createBrowserFallbackToken(email, origin, nextPath);
    cookieStore.set({
      name: OPERATOR_BROWSER_FALLBACK_COOKIE,
      value: fallbackToken,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });
    redirect(buildOperatorAbsoluteUrl(`/auth/check-email?email=${encodeURIComponent(email)}&delivery=failed&next=${encodeURIComponent(nextPath)}&reason=${encodeURIComponent(summarizeOperatorDeliveryFailure(result))}`));
  }

  redirect(buildOperatorAbsoluteUrl(`/auth/check-email?email=${encodeURIComponent(email)}`));
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = (await searchParams) ?? {};
  const error = asString(params.error);
  const nextPath = asString(params.next) ?? "/dashboard";

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Operator Access</p>
        <h1>Sign in to the LeadOS command center</h1>
        <p className="lede">
          Use your approved operator email and we will send you a secure magic link. No password is
          required.
        </p>
      </section>

      <section className="panel auth-panel">
        {error ? (
          <div className="status-banner error" role="alert">
            {error === "unauthorized" ? "You need an approved operator session to view that page." : "We could not complete sign-in. Request a new link and try again."}
          </div>
        ) : null}

        <form action={requestMagicLinkAction} className="auth-form">
          <input type="hidden" name="next" value={nextPath} />
          <label htmlFor="email">Operator email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="you@yourdomain.com"
          />
          <p className="muted form-help">
            The runtime only sends links to approved operator addresses.
          </p>
          <button type="submit" className="primary">
            Send magic link
          </button>
        </form>
      </section>
    </main>
  );
}
