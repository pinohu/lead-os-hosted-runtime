import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OperatorSignInForm } from "@/components/OperatorSignInForm";
import {
  buildOperatorAbsoluteUrl,
  getOperatorAuthConfigurationStatus,
  getOperatorPublicOrigin,
  isAllowedOperatorEmail,
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
  const authConfig = getOperatorAuthConfigurationStatus();

  if (!authConfig.ready) {
    redirect(buildOperatorAbsoluteUrl(`/auth/sign-in?error=config&next=${encodeURIComponent(nextPath)}`));
  }

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
    redirect(buildOperatorAbsoluteUrl(
      `/auth/check-email?delivery=failed&email=${encodeURIComponent(email)}&next=${encodeURIComponent(nextPath)}&reason=${encodeURIComponent(result.detail)}`,
      {
        host: headerStore.get("host"),
        forwardedHost: headerStore.get("x-forwarded-host"),
        forwardedProto: headerStore.get("x-forwarded-proto"),
      },
    ));
  }

  redirect(buildOperatorAbsoluteUrl(`/auth/check-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent(nextPath)}`));
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = (await searchParams) ?? {};
  const error = asString(params.error);
  const nextPath = asString(params.next) ?? "/dashboard";
  const defaultEmail = asString(params.email) ?? "";
  const authConfig = getOperatorAuthConfigurationStatus();
  const formDisabled = !authConfig.ready;

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
            {error === "unauthorized"
              ? "You need an approved operator session to view that page."
              : error === "config"
                ? "Operator sign-in is not configured yet. Set LEAD_OS_AUTH_SECRET and LEAD_OS_OPERATOR_EMAILS."
                : error === "delivery-failed"
                  ? "We could not deliver the sign-in email. Fix email delivery and request a new link."
                  : error === "invalid-link"
                    ? "That sign-in link is invalid or expired. Request a fresh link."
                    : "We could not complete sign-in. Request a new link and try again."}
          </div>
        ) : null}

        <OperatorSignInForm
          action={requestMagicLinkAction}
          defaultEmail={defaultEmail}
          nextPath={nextPath}
          disabled={formDisabled}
        />
      </section>
    </main>
  );
}
