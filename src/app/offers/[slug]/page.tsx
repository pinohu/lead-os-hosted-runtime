import { headers } from "next/headers";
import { AdaptiveLeadCaptureForm } from "@/components/AdaptiveLeadCaptureForm";
import { ExperienceScaffold } from "@/components/ExperienceScaffold";
import { getNiche } from "@/lib/catalog";
import { resolveExperienceProfile } from "@/lib/experience";
import { tenantConfig } from "@/lib/tenant";

type OfferPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function asBoolean(value: string | string[] | undefined) {
  const normalized = asString(value)?.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export default async function OfferPage({ params, searchParams }: OfferPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const niche = getNiche(slug);
  const headerStore = await headers();
  const profile = resolveExperienceProfile({
    family: "checkout",
    niche,
    supportEmail: tenantConfig.supportEmail,
    source: asString(query.source) ?? "checkout",
    intent: "solve-now",
    returning: asBoolean(query.returning),
    milestone: asString(query.milestone),
    preferredMode: asString(query.mode) ?? "form-first",
    score: Number(asString(query.score) ?? 90),
    userAgent: headerStore.get("user-agent") ?? undefined,
    referrer: headerStore.get("referer") ?? undefined,
  });

  return (
    <ExperienceScaffold
      eyebrow="Offer path"
      title={`${niche.label} offer path built for high-intent visitors`}
      summary={`${niche.summary} This page reduces anxiety around the offer by keeping the proof close, the path short, and the recovery ladder ready if someone hesitates.`}
      profile={profile}
      metrics={[
        { label: "Primary engine", value: "ThriveCart", detail: "Checkout and recovery are already connected." },
        { label: "Recovery ladder", value: "1h / 24h / 48h", detail: "Abandonment recovery sequence is prewired." },
        { label: "Post-purchase", value: "Onboarding ready", detail: "Portal invite, activation, and continuity can begin immediately." },
      ]}
    >
      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Why this offer page feels lighter</p>
          <h2>One ask, one fallback, one reassurance</h2>
          <ul className="check-list">
            <li>Primary CTA stays singular so purchase intent does not fragment.</li>
            <li>Support CTA stays human and non-threatening for slower deciders.</li>
            <li>Proof and risk-reduction sit next to the ask instead of below the fold.</li>
          </ul>
        </article>
        <article className="panel">
          <p className="eyebrow">What happens after the decision</p>
          <h2>No dead ends after purchase or hesitation</h2>
          <ul className="check-list">
            <li>Checkout success triggers onboarding, portal invite, and activation logic.</li>
            <li>Hesitation triggers recovery, coupon rescue, and second-touch re-entry.</li>
            <li>Returning visitors get a lighter path instead of repeating the same pitch.</li>
          </ul>
        </article>
      </section>

      <AdaptiveLeadCaptureForm
        source="checkout"
        family="checkout"
        niche={niche.slug}
        service={tenantConfig.defaultService}
        pagePath={`/offers/${niche.slug}`}
        returning={asBoolean(query.returning)}
        profile={profile}
      />
    </ExperienceScaffold>
  );
}
