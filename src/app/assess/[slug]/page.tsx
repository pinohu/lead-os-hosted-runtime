import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AdaptiveLeadCaptureForm } from "@/components/AdaptiveLeadCaptureForm";
import { ExperienceScaffold } from "@/components/ExperienceScaffold";
import { getNiche, nicheCatalog } from "@/lib/catalog";
import { EXPERIENCE_ASSIGNMENT_HEADER } from "@/lib/experiments";
import { resolveExperienceProfile } from "@/lib/experience";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
import { tenantConfig } from "@/lib/tenant";

type AssessmentPageProps = {
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

function asAudience(value: string | string[] | undefined): "client" | "provider" | undefined {
  const normalized = asString(value);
  return normalized === "provider" || normalized === "client" ? normalized : undefined;
}

export function generateStaticParams() {
  return Object.keys(nicheCatalog).map((slug) => ({ slug }));
}

export default async function AssessmentPage({ params, searchParams }: AssessmentPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const niche = getNiche(slug);
  const audience = asAudience(query.audience) ?? "client";

  if (!niche) notFound();

  const headerStore = await headers();
  const runtimeConfig = await getOperationalRuntimeConfig();
  const profile = resolveExperienceProfile({
    family: "qualification",
    niche,
    audience,
    supportEmail: tenantConfig.supportEmail,
    source: asString(query.source) ?? "assessment",
    intent: asString(query.intent) === "solve-now" ? "solve-now" : "compare",
    returning: asBoolean(query.returning),
    milestone: asString(query.milestone),
    preferredMode: asString(query.mode) ?? "booking-first",
    score: Number(asString(query.score) ?? 75),
    assignmentKey: headerStore.get(EXPERIENCE_ASSIGNMENT_HEADER) ?? undefined,
    userAgent: headerStore.get("user-agent") ?? undefined,
    referrer: headerStore.get("referer") ?? undefined,
    experimentPromotions: runtimeConfig.experiments.promotions,
  });

  return (
    <ExperienceScaffold
      eyebrow="Hosted assessment"
      title={niche.assessmentTitle}
      summary={
        audience === "provider"
          ? `${niche.summary} This provider assessment path is designed to confirm service area, issue fit, and dispatch readiness without turning onboarding into a brittle long form.`
          : `${niche.summary} This assessment path is now designed to feel like guided diagnosis instead of a long form. Each answer should earn the next question and move the visitor closer to a credible next step.`
      }
      profile={profile}
      metrics={[
        { label: "Assessment style", value: "Progressive", detail: "Only the next useful question should appear." },
        { label: "Return logic", value: "Milestone-aware", detail: "Visit two and three get lighter, smarter asks." },
        {
          label: "Output",
          value: audience === "provider" ? "Dispatch-ready onboarding" : "Tailored next action",
          detail: audience === "provider" ? "Coverage, capacity, and roster-fit setup." : "Booking, nurture, or authority path based on fit.",
        },
      ]}
    >
      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Questioning principle</p>
          <h2>{audience === "provider" ? "Never ask for roster data before the value is clear" : "Never ask before the value is clear"}</h2>
          <ul className="check-list">
            <li>Each question needs a clear reason connected to the visitor&apos;s outcome.</li>
            <li>Progress stays visible so effort never feels ambiguous.</li>
            <li>Back navigation stays light so visitors keep control of the path.</li>
          </ul>
        </article>
        <article className="panel">
          <p className="eyebrow">Result design</p>
          <h2>{audience === "provider" ? "Roster fit first, pressure second" : "Diagnosis first, pressure second"}</h2>
          <ul className="check-list">
            <li>The output frames what matters, not internal funnel jargon.</li>
            <li>{audience === "provider" ? "Ready providers shorten into network activation and dispatch mapping quickly." : "Hot leads shorten into booking or proposal quickly."}</li>
            <li>Unready leads keep a lower-friction second-touch return path.</li>
          </ul>
        </article>
      </section>

      <AdaptiveLeadCaptureForm
        source="assessment"
        family="qualification"
        niche={niche.slug}
        service={audience === "provider" ? "provider-network" : tenantConfig.defaultService}
        pagePath={`/assess/${niche.slug}`}
        returning={asBoolean(query.returning)}
        profile={profile}
      />
    </ExperienceScaffold>
  );
}
