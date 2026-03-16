import Link from "next/link";
import { DispatchActionPanel } from "@/components/DispatchActionPanel";
import { OperatorPagination } from "@/components/OperatorPagination";
import { OperatorQueueFilters } from "@/components/OperatorQueueFilters";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { buildLeadDisplayName, buildLeadSubline, formatPortalLabel } from "@/lib/operator-ui";
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

function asPositiveInt(value: string | string[] | undefined) {
  const parsed = Number(asString(value) ?? "1");
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

const PAGE_SIZE = 12;

export default async function BookingJobsPage({ searchParams }: BookingJobsPageProps) {
  const session = await requireOperatorPageSession("/dashboard/bookings");
  const params = (await searchParams) ?? {};
  const includeSystemTraffic = asString(params.include) === "system";
  const query = asString(params.query)?.trim().toLowerCase() ?? "";
  const statusFilter = asString(params.status)?.trim().toLowerCase() ?? "";
  const page = asPositiveInt(params.page);
  const jobs = (await getBookingJobs()) as BookingJobRecord[];
  const visibleJobs = includeSystemTraffic ? jobs : jobs.filter((job) => !isSystemBookingJob(job));
  const hiddenJobs = Math.max(0, jobs.length - visibleJobs.length);
  const hydratedJobs = await Promise.all(
    visibleJobs.map(async (job) => ({
      job,
      lead: await getLeadRecord(job.leadKey),
    })),
  );
  const jobsWithLead = hydratedJobs.filter(({ job, lead }) => {
    if (statusFilter) {
      const failed = !["booked", "availability-found", "ready", "handoff-ready", "rescheduled", "status-changed"].includes(job.status);
      if (statusFilter === "failed" && !failed) return false;
      if (statusFilter !== "failed" && job.status !== statusFilter) return false;
    }
    if (!query) return true;
    const haystack = [
      job.provider,
      job.status,
      job.detail,
      job.leadKey,
      lead?.email,
      lead?.phone,
      lead?.company,
      lead?.firstName,
      lead?.lastName,
      lead?.family,
      lead?.stage,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
  const pageCount = Math.max(1, Math.ceil(jobsWithLead.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedJobs = jobsWithLead.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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

      <OperatorQueueFilters
        query={query}
        includeSystemTraffic={includeSystemTraffic}
        searchLabel="Search bookings"
        searchPlaceholder="Search by lead, provider, status, ZIP, or detail"
        extraParams={{ status: statusFilter || undefined }}
      />

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

      <section className="panel">
        <p className="eyebrow">Current result set</p>
        <h2>{jobsWithLead.length} booking jobs in view</h2>
        <p className="muted">
          {query
            ? `Filtered from ${visibleJobs.length} visible jobs using "${query}".`
            : statusFilter
              ? `Filtered to ${formatPortalLabel(statusFilter)} booking work.`
              : "Use search and system-traffic filters to narrow the queue when volume spikes."}
        </p>
        <p className="muted">Showing {pagedJobs.length} jobs on this page.</p>
      </section>

      <OperatorPagination
        page={safePage}
        pageCount={pageCount}
        basePath="/dashboard/bookings"
        query={query}
        includeSystemTraffic={includeSystemTraffic}
        extraParams={{ status: statusFilter || undefined }}
      />

      <section className="stack-grid">
        {jobsWithLead.length === 0 ? (
          <article className="panel">
            <div className="portal-empty">
              <p className="muted">
                {query
                  ? "No booking jobs match the current filters."
                  : "No booking jobs have been recorded yet."}
              </p>
              <p className="muted">
                Try a different lead, provider, or status search, or remove system-traffic filters.
              </p>
            </div>
          </article>
        ) : (
          pagedJobs.map(({ job, lead }) => (
            <article key={job.id} className="stack-card">
              <p className="eyebrow">{formatPortalLabel(job.provider)}</p>
              <h2>{formatPortalLabel(job.status)}</h2>
              <p className="muted portal-breakable">{job.detail}</p>
              <div className="portal-summary">
                <strong className="portal-inline-text">
                  {lead ? buildLeadDisplayName(lead) : job.leadKey}
                </strong>
                <p className="muted portal-breakable">
                  {lead ? buildLeadSubline(lead) : "Lead identity is not currently cached."}
                </p>
                <p className="muted">Family: {lead?.family ?? "Unknown"} | Stage: {lead?.stage ?? "Unknown"}</p>
              </div>
              <p className="muted">Updated: {job.updatedAt}</p>
              {session.role !== "analyst" ? (
                <DispatchActionPanel
                  leadKey={job.leadKey}
                  compact
                  visibleActions={["retry-booking", "assign-backup-provider", "mark-booked"]}
                />
              ) : (
                <p className="muted">Analyst role can review booking state but cannot trigger booking actions.</p>
              )}
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
