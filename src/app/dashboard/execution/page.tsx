import Link from "next/link";
import { OperatorPagination } from "@/components/OperatorPagination";
import { OperatorQueueFilters } from "@/components/OperatorQueueFilters";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { buildLeadDisplayName, buildLeadSubline, formatPortalLabel } from "@/lib/operator-ui";
import { getExecutionTasks, getLeadRecord, type ExecutionTaskRecord } from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

type ExecutionQueuePageProps = {
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

export default async function ExecutionQueuePage({ searchParams }: ExecutionQueuePageProps) {
  await requireOperatorPageSession("/dashboard/execution");
  const params = (await searchParams) ?? {};
  const query = asString(params.query)?.trim().toLowerCase() ?? "";
  const statusFilter = asString(params.status)?.trim().toLowerCase() ?? "";
  const page = asPositiveInt(params.page);
  const tasks = (await getExecutionTasks()) as ExecutionTaskRecord[];
  const hydratedTasks = await Promise.all(
    tasks.map(async (task) => ({
      task,
      lead: await getLeadRecord(task.leadKey),
    })),
  );
  const tasksInView = hydratedTasks.filter(({ task, lead }) => {
    if (statusFilter && task.status !== statusFilter) return false;
    if (!query) return true;
    const haystack = [
      task.provider,
      task.kind,
      task.status,
      task.dedupeKey,
      task.lastError,
      task.leadKey,
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
  const pageCount = Math.max(1, Math.ceil(tasksInView.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedTasks = tasksInView.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <main className="experience-page">
      <section className="experience-hero">
        <div className="hero-copy">
          <p className="eyebrow">Execution queue</p>
          <h1>{tenantConfig.brandName} side-effect executor</h1>
          <p className="lede">
            This queue shows the durable booking, workflow, and document tasks that sit behind lead intake.
            It is the fastest way to audit exact-once execution problems without digging through multiple providers first.
          </p>
          <div className="cta-row">
            <Link href="/dashboard" className="secondary">
              Back to dashboard
            </Link>
            <Link href="/dashboard/overview" className="secondary">
              Open overview
            </Link>
          </div>
        </div>
        <aside className="hero-rail">
          <p className="eyebrow">Queue summary</p>
          <ul className="journey-rail">
            <li>
              <strong>Total tasks</strong>
              <span>{tasks.length}</span>
            </li>
            <li>
              <strong>Pending</strong>
              <span>{tasks.filter((task) => task.status === "pending").length}</span>
            </li>
            <li>
              <strong>Processing</strong>
              <span>{tasks.filter((task) => task.status === "processing").length}</span>
            </li>
            <li>
              <strong>Failed</strong>
              <span>{tasks.filter((task) => task.status === "failed").length}</span>
            </li>
          </ul>
        </aside>
      </section>

      <OperatorQueueFilters
        query={query}
        includeSystemTraffic={false}
        searchLabel="Search execution tasks"
        searchPlaceholder="Search by provider, kind, status, dedupe key, or lead identity"
        extraParams={{ status: statusFilter || undefined }}
      />

      <section className="panel">
        <p className="eyebrow">Current result set</p>
        <h2>{tasksInView.length} execution tasks in view</h2>
        <p className="muted">
          {statusFilter
            ? `Filtered to ${formatPortalLabel(statusFilter)} tasks.`
            : "Use search and status drill-through links to isolate failed or delayed side effects."}
        </p>
        <p className="muted">Showing {pagedTasks.length} tasks on this page.</p>
      </section>

      <OperatorPagination
        page={safePage}
        pageCount={pageCount}
        basePath="/dashboard/execution"
        query={query}
        includeSystemTraffic={false}
        extraParams={{ status: statusFilter || undefined }}
      />

      <section className="stack-grid">
        {tasksInView.length === 0 ? (
          <article className="panel">
            <div className="portal-empty">
              <p className="muted">
                {query || statusFilter
                  ? "No execution tasks match the current filters."
                  : "No execution tasks have been queued yet."}
              </p>
              <p className="muted">Try another provider, lead, or status filter.</p>
            </div>
          </article>
        ) : (
          pagedTasks.map(({ task, lead }) => (
            <article key={task.id} className={`stack-card tone-${task.status === "failed" ? "danger" : task.status === "processing" ? "warning" : task.status === "completed" ? "success" : "neutral"}`}>
              <div className="portal-status-row">
                <span className="portal-chip">{formatPortalLabel(task.kind)}</span>
                <span className="portal-chip">{formatPortalLabel(task.status)}</span>
                <span className="portal-chip">{formatPortalLabel(task.provider)}</span>
              </div>
              <h2>{task.dedupeKey}</h2>
              <p className="muted">Attempts: {task.attempts}</p>
              {task.lastError ? <p className="muted portal-breakable"><strong>Last error:</strong> {task.lastError}</p> : null}
              <div className="portal-summary">
                <strong className="portal-inline-text">
                  {lead ? buildLeadDisplayName(lead) : task.leadKey}
                </strong>
                <p className="muted portal-breakable">
                  {lead ? buildLeadSubline(lead) : "Lead identity is not currently cached."}
                </p>
                <p className="muted">Family: {lead?.family ?? "Unknown"} | Stage: {lead?.stage ?? "Unknown"}</p>
              </div>
              <p className="muted">Updated: {task.updatedAt}</p>
              <div className="cta-row">
                <Link href={`/dashboard/leads/${encodeURIComponent(task.leadKey)}`} className="secondary">
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
