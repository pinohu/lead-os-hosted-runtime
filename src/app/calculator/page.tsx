import { headers } from "next/headers";
import { AdaptiveLeadCaptureForm } from "@/components/AdaptiveLeadCaptureForm";
import { ExperienceScaffold } from "@/components/ExperienceScaffold";
import { getNiche } from "@/lib/catalog";
import { EXPERIENCE_ASSIGNMENT_HEADER } from "@/lib/experiments";
import { resolveExperienceProfile } from "@/lib/experience";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
import { tenantConfig } from "@/lib/tenant";

type CalculatorPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function asBoolean(value: string | string[] | undefined) {
  const normalized = asString(value)?.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export default async function CalculatorPage({ searchParams }: CalculatorPageProps) {
  const query = await searchParams;
  const niche = getNiche(asString(query.niche));
  const headerStore = await headers();
  const runtimeConfig = await getOperationalRuntimeConfig();
  const profile = resolveExperienceProfile({
    family: asString(query.mode) === "chat-first" ? "chat" : "lead-magnet",
    niche,
    supportEmail: tenantConfig.supportEmail,
    source: asString(query.source) ?? "roi_calculator",
    intent: asString(query.intent) === "solve-now" ? "solve-now" : "discover",
    returning: asBoolean(query.returning),
    milestone: asString(query.milestone),
    preferredMode: asString(query.mode) ?? "calculator-first",
    score: Number(asString(query.score) ?? 40),
    assignmentKey: headerStore.get(EXPERIENCE_ASSIGNMENT_HEADER) ?? undefined,
    userAgent: headerStore.get("user-agent") ?? undefined,
    referrer: headerStore.get("referer") ?? undefined,
    experimentPromotions: runtimeConfig.experiments.promotions,
  });

  return (
    <ExperienceScaffold
      eyebrow="Hosted calculator path"
      title={`${niche.label} upside estimator`}
      summary={`This path uses quantified value to earn the next ask. For visitors who need proof before commitment, the calculator should create clarity, not just curiosity.`}
      profile={profile}
      metrics={[
        { label: "Bias", value: niche.calculatorBias, detail: "The main framing angle for this niche." },
        { label: "Primary mode", value: profile.mode, detail: "How the runtime is currently choosing to lead." },
        { label: "Return strategy", value: "Resume, do not restart", detail: "Visit two reduces effort and increases relevance." },
      ]}
    >
      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Calculator principle</p>
          <h2>Show the upside before asking for deeper commitment</h2>
          <ul className="check-list">
            <li>Visitors should understand what they are estimating in under ten seconds.</li>
            <li>The calculation should frame the cost of inaction without manipulative fear.</li>
            <li>The CTA should feel like the logical next step, not a bait-and-switch.</li>
          </ul>
        </article>
        <article className="panel">
          <p className="eyebrow">Adaptive behavior</p>
          <h2>Calculator-first can still branch into chat or qualification</h2>
          <ul className="check-list">
            <li>If the visitor wants speed, we can shorten into a consult path.</li>
            <li>If the visitor wants reassurance, we can route into authority or webinar proof.</li>
            <li>If the visitor wants low friction, we can reopen the conversation in chat.</li>
          </ul>
        </article>
      </section>

      <AdaptiveLeadCaptureForm
        source="roi_calculator"
        family={profile.family}
        niche={niche.slug}
        service={tenantConfig.defaultService}
        pagePath={`/calculator?niche=${niche.slug}`}
        returning={asBoolean(query.returning)}
        profile={profile}
      />
    </ExperienceScaffold>
  );
}
