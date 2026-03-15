import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { OperatorSignInForm } from "@/components/OperatorSignInForm";
import {
  buildOperatorAbsoluteUrl,
  buildOperatorDestinationUrl,
  createBrowserFallbackToken,
  createSessionToken,
  getOperatorPublicOrigin,
  isAllowedOperatorEmail,
  OPERATOR_BROWSER_FALLBACK_COOKIE,
  OPERATOR_SESSION_COOKIE,
  sanitizeNextPath,
  sendOperatorMagicLink,
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
    cookieStore.set({
      name: OPERATOR_BROWSER_FALLBACK_COOKIE,
      value: await createBrowserFallbackToken(email, origin, nextPath),
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });
    cookieStore.set({
      name: OPERATOR_SESSION_COOKIE,
      value: await createSessionToken(email),
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    redirect(buildOperatorDestinationUrl(nextPath, {
      host: headerStore.get("host"),
      forwardedHost: headerStore.get("x-forwarded-host"),
      forwardedProto: headerStore.get("x-forwarded-proto"),
    }, { auth: "browser-fallback" }));
  }

  redirect(buildOperatorAbsoluteUrl(`/auth/check-email?email=${encodeURIComponent(email)}`));
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = (await searchParams) ?? {};
  const error = asString(params.error);
  const nextPath = asString(params.next) ?? "/dashboard";
  const defaultEmail = asString(params.email) ?? "";

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

        <OperatorSignInForm
          action={requestMagicLinkAction}
          defaultEmail={defaultEmail}
          nextPath={nextPath}
        />
      </section>
    </main>
  );
}
