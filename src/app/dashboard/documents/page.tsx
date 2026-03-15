import Link from "next/link";
import { requireOperatorPageSession } from "@/lib/operator-auth";
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

export default async function DocumentJobsPage({ searchParams }: DocumentJobsPageProps) {
  await requireOperatorPageSession("/dashboard/documents");
  const params = (await searchParams) ?? {};
  const includeSystemTraffic = asString(params.include) === "system";
  const jobs = (await getDocumentJobs()) as DocumentJobRecord[];
  const visibleJobs = includeSystemTraffic ? jobs : jobs.filter((job) => !isSystemDocumentJob(job));
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

      <section className="stack-grid">
        {jobsWithLead.length === 0 ? (
          <article className="panel">
            <p className="muted">No document jobs have been recorded yet.</p>
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
