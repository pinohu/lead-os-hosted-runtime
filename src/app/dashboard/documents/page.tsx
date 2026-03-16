import Link from "next/link";
import { OperatorPagination } from "@/components/OperatorPagination";
import { OperatorQueueFilters } from "@/components/OperatorQueueFilters";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { buildLeadDisplayName, buildLeadSubline, formatPortalLabel } from "@/lib/operator-ui";
import { getDocumentJobs, getLeadRecord, type DocumentJobRecord } from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";
import { isSystemDocumentJob } from "@/lib/operator-view";

export const dynamic = "force-dynamic";

type DocumentJobsPageProps = {
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

export default async function DocumentJobsPage({ searchParams }: DocumentJobsPageProps) {
  await requireOperatorPageSession("/dashboard/documents");
  const params = (await searchParams) ?? {};
  const includeSystemTraffic = asString(params.include) === "system";
  const query = asString(params.query)?.trim().toLowerCase() ?? "";
  const statusFilter = asString(params.status)?.trim().toLowerCase() ?? "";
  const page = asPositiveInt(params.page);
  const jobs = (await getDocumentJobs()) as DocumentJobRecord[];
  const visibleJobs = includeSystemTraffic ? jobs : jobs.filter((job) => !isSystemDocumentJob(job));
  const hiddenJobs = Math.max(0, jobs.length - visibleJobs.length);
  const hydratedJobs = await Promise.all(
    visibleJobs.map(async (job) => ({
      job,
      lead: await getLeadRecord(job.leadKey),
    })),
  );
  const jobsWithLead = hydratedJobs.filter(({ job, lead }) => {
    if (statusFilter) {
      if (statusFilter === "failed" && job.status !== "failed") return false;
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
          <p className="eyebrow">Document queue</p>
          <h1>{tenantConfig.brandName} document jobs</h1>
          <p className="lede">
            Monitor proposal, agreement, and onboarding document generation so operators can spot
            template gaps before they cost momentum.
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
              <strong>Generated</strong>
              <span>{visibleJobs.filter((job) => job.status === "generated").length}</span>
            </li>
            <li>
              <strong>Prepared</strong>
              <span>{visibleJobs.filter((job) => job.status === "prepared").length}</span>
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
        searchLabel="Search document jobs"
        searchPlaceholder="Search by lead, provider, template state, or detail"
        extraParams={{ status: statusFilter || undefined }}
      />

      {hiddenJobs > 0 ? (
        <section className="panel">
          <p className="muted">
            {includeSystemTraffic
              ? "System verification document jobs are included in this queue."
              : "System verification document jobs are hidden from the default queue."}
          </p>
          <div className="cta-row">
            {includeSystemTraffic ? (
              <Link href="/dashboard/documents" className="secondary">
                Hide system activity
              </Link>
            ) : (
              <Link href="/dashboard/documents?include=system" className="secondary">
                Show system activity
              </Link>
            )}
          </div>
        </section>
      ) : null}

      <section className="panel">
        <p className="eyebrow">Current result set</p>
        <h2>{jobsWithLead.length} document jobs in view</h2>
        <p className="muted">
          {query
            ? `Filtered from ${visibleJobs.length} visible jobs using "${query}".`
            : statusFilter
              ? `Filtered to ${formatPortalLabel(statusFilter)} document work.`
              : "Use search and system-traffic filters to narrow the queue when document volume grows."}
        </p>
        <p className="muted">Showing {pagedJobs.length} jobs on this page.</p>
      </section>

      <OperatorPagination
        page={safePage}
        pageCount={pageCount}
        basePath="/dashboard/documents"
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
                  ? "No document jobs match the current filters."
                  : "No document jobs have been recorded yet."}
              </p>
              <p className="muted">Try a different lead, provider, or status search.</p>
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
