import Link from "next/link";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { getBookingJobs, getLeadRecord, type BookingJobRecord } from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";
import { isSystemBookingJob } from "@/lib/operator-view";

export const dynamic = "force-dynamic";

type BookingJobsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BookingJobsPage({ searchParams }: BookingJobsPageProps) {
  await requireOperatorPageSession("/dashboard/bookings");
  const params = (await searchParams) ?? {};
  const includeSystemTraffic = asString(params.include) === "system";
  const jobs = (await getBookingJobs()) as BookingJobRecord[];
  const visibleJobs = includeSystemTraffic ? jobs : jobs.filter((job) => !isSystemBookingJob(job));
  const hiddenJobs = Math.max(0, jobs.length - visibleJobs.length);
  const jobsWithLead = await Promise.all(
    visibleJobs.map(async (job) => ({
      job,
      lead: await getLeadRecord(job.leadKey),
    })),
  );

  return (
    <main className="experience-page">
      <section className="experience-hero">
        <div className="hero-copy">
          <p className="eyebrow">Booking queue</p>
          <h1>{tenantConfig.brandName} scheduling jobs</h1>
          <p className="lede">
            Use this queue to monitor live Trafft availability lookups, booking handoffs, and the
            leads that are closest to a calendar commitment.
          </p>
          <div className="cta-row">
            <Link href="/dashboard" className="secondary">
              Back to dashboard
            </Link>
            <Link href="/dashboard/providers" className="secondary">
              Provider health
            </Link>
          </div>
        </div>
        <aside className="hero-rail">
          <p className="eyebrow">Queue summary</p>
          <ul className="journey-rail">
            <li>
              <strong>Total jobs</strong>
              <span>{visibleJobs.length}</span>
            </li>
            <li>
              <strong>Availability found</strong>
              <span>{visibleJobs.filter((job) => job.status === "availability-found").length}</span>
            </li>
            <li>
              <strong>Ready for handoff</strong>
              <span>{visibleJobs.filter((job) => job.status === "handoff-ready").length}</span>
            </li>
            {hiddenJobs > 0 && !includeSystemTraffic ? (
              <li>
                <strong>Hidden system jobs</strong>
                <span>{hiddenJobs}</span>
              </li>
            ) : null}
          </ul>
        </aside>
      </section>

      {hiddenJobs > 0 ? (
        <section className="panel">
          <p className="muted">
            {includeSystemTraffic
              ? "System verification booking jobs are included in this queue."
              : "System verification booking jobs are hidden from the default queue."}
          </p>
          <div className="cta-row">
            {includeSystemTraffic ? (
              <Link href="/dashboard/bookings" className="secondary">
                Hide system activity
              </Link>
            ) : (
              <Link href="/dashboard/bookings?include=system" className="secondary">
                Show system activity
              </Link>
            )}
          </div>
        </section>
      ) : null}

      <section className="stack-grid">
        {jobsWithLead.length === 0 ? (
          <article className="panel">
            <p className="muted">No booking jobs have been recorded yet.</p>
          </article>
        ) : (
          jobsWithLead.map(({ job, lead }) => (
            <article key={job.id} className="stack-card">
              <p className="eyebrow">{job.provider}</p>
              <h2>{job.status}</h2>
              <p className="muted">{job.detail}</p>
              <p className="muted">
                Lead: {job.leadKey}
                {lead ? ` | Family: ${lead.family} | Stage: ${lead.stage}` : ""}
              </p>
              <p className="muted">Updated: {job.updatedAt}</p>
              <div className="cta-row">
                <Link href={`/dashboard/leads/${encodeURIComponent(job.leadKey)}`} className="secondary">
                  Open lead detail
                </Link>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
