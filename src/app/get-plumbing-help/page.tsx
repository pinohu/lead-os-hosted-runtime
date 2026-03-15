import { headers } from "next/headers";
import Link from "next/link";
import { AdaptiveLeadCaptureForm } from "@/components/AdaptiveLeadCaptureForm";
import { ExperienceScaffold } from "@/components/ExperienceScaffold";
import { getNiche } from "@/lib/catalog";
import { buildDashboardSnapshot } from "@/lib/dashboard";
import { resolveExperienceProfile } from "@/lib/experience";
import { getAutomationHealth } from "@/lib/providers";
import { getCanonicalEvents, getLeadRecords } from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

type PlumbingHelpPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function asBoolean(value: string | string[] | undefined) {
  const normalized = asString(value)?.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export default async function PlumbingHelpPage({ searchParams }: PlumbingHelpPageProps) {
  const params = (await searchParams) ?? {};
  const niche = getNiche("plumbing");
  const headerStore = await headers();
  const [health, leads, events] = await Promise.all([
    Promise.resolve(getAutomationHealth()),
    getLeadRecords(),
    getCanonicalEvents(),
  ]);
  const snapshot = buildDashboardSnapshot(leads, events);
  const profile = resolveExperienceProfile({
    family: "qualification",
    niche,
    audience: "client",
    supportEmail: tenantConfig.supportEmail,
    source: asString(params.source) ?? "manual",
    intent: "solve-now",
    returning: asBoolean(params.returning),
    milestone: asString(params.milestone),
    preferredMode: asString(params.mode) ?? "booking-first",
    score: Number(asString(params.score) ?? 80),
    userAgent: headerStore.get("user-agent") ?? undefined,
    referrer: headerStore.get("referer") ?? undefined,
  });

  return (
    <ExperienceScaffold
      eyebrow="Marketplace demand path"
      title="Get plumbing help now without getting trapped in a dead-end quote form"
      summary="This is the demand-side entry point for homeowners, tenants, and clients who need a plumber fast or need a clean estimate path. LeadOS keeps the path short, urgency-aware, and clear about what happens next."
      profile={profile}
      metrics={[
        {
          label: "Hot plumbing leads",
          value: `${snapshot.totals.hotLeads}`,
          detail: "Urgent or booking-intent plumbing demand currently recognized by the runtime.",
        },
        {
          label: "Booked or offered",
          value: `${snapshot.milestones.lead.bookedOrOffered}`,
          detail: "Demand-side jobs already moved into booking, estimate, or proposal momentum.",
        },
        {
          label: "Dispatch channels",
          value: health.liveMode ? "Live" : "Dry run",
          detail: "Booking, follow-up, and workflow channels connected behind this path.",
        },
      ]}
    >
      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Who this is for</p>
          <h2>Homeowners, tenants, and clients who need plumbing service</h2>
          <ul className="check-list">
            <li>Urgent leaks, burst pipes, backups, and no-hot-water problems.</li>
            <li>Non-urgent estimates for replacements, installs, and planned work.</li>
            <li>People who want a fast next step without re-explaining their problem twice.</li>
          </ul>
        </article>
        <article className="panel">
          <p className="eyebrow">Marketplace split</p>
          <h2>Need the provider side instead?</h2>
          <p className="muted">
            If you are a plumber or service company looking for more jobs, coverage management, and network onboarding, use the provider path instead.
          </p>
          <div className="cta-row">
            <Link href="/join-provider-network" className="secondary">
              Go to provider onboarding
            </Link>
          </div>
        </article>
      </section>

      <AdaptiveLeadCaptureForm
        source="manual"
        family={profile.family}
        niche={niche.slug}
        service={tenantConfig.defaultService}
        pagePath="/get-plumbing-help"
        returning={asBoolean(params.returning)}
        profile={profile}
      />
    </ExperienceScaffold>
  );
}
