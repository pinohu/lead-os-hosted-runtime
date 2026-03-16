import Link from "next/link";
import { OperatorPagination } from "@/components/OperatorPagination";
import { OperatorQueueFilters } from "@/components/OperatorQueueFilters";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { buildLeadDisplayName, buildLeadSubline, formatLeadKeyForDisplay, formatPortalLabel } from "@/lib/operator-ui";
import {
  getLeadRecord,
  getWorkflowRegistryRecords,
  getWorkflowRuns,
  type WorkflowRunRecord,
} from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";
import { isSystemWorkflowRun } from "@/lib/operator-view";

export const dynamic = "force-dynamic";

type WorkflowRunsPageProps = {
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

export default async function WorkflowRunsPage({ searchParams }: WorkflowRunsPageProps) {
  await requireOperatorPageSession("/dashboard/workflows");
  const params = (await searchParams) ?? {};
  const includeSystemTraffic = asString(params.include) === "system";
  const query = asString(params.query)?.trim().toLowerCase() ?? "";
  const resultFilter = asString(params.result)?.trim().toLowerCase() ?? "";
  const page = asPositiveInt(params.page);
  const runs = (await getWorkflowRuns()) as WorkflowRunRecord[];
  const visibleRuns = includeSystemTraffic ? runs : runs.filter((run) => !isSystemWorkflowRun(run));
  const hiddenRuns = Math.max(0, runs.length - visibleRuns.length);
  const registry = await getWorkflowRegistryRecords();
  const hydratedRuns = await Promise.all(
    visibleRuns.map(async (run) => ({
      run,
      lead: run.leadKey ? await getLeadRecord(run.leadKey) : undefined,
    })),
  );
  const runsWithLead = hydratedRuns.filter(({ run, lead }) => {
    if (resultFilter) {
      if (resultFilter === "failed" && run.ok) return false;
      if (resultFilter === "successful" && !run.ok) return false;
    }
    if (!query) return true;
    const haystack = [
      run.provider,
      run.eventName,
      run.detail,
      run.leadKey,
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
  const pageCount = Math.max(1, Math.ceil(runsWithLead.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedRuns = runsWithLead.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <main className="experience-page">
      <section className="experience-hero">
        <div className="hero-copy">
          <p className="eyebrow">Workflow history</p>
          <h1>{tenantConfig.brandName} workflow runs</h1>
          <p className="lede">
            This view shows which runtime emissions reached n8n or related workflow providers and
            where operators may need to inspect downstream automations.
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
              <strong>Total runs</strong>
              <span>{visibleRuns.length}</span>
            </li>
            <li>
              <strong>Live</strong>
              <span>{visibleRuns.filter((run) => run.mode === "live").length}</span>
            </li>
            <li>
              <strong>Failed</strong>
              <span>{visibleRuns.filter((run) => !run.ok).length}</span>
            </li>
            <li>
              <strong>Provisioned starters</strong>
              <span>{registry.length}</span>
            </li>
            {hiddenRuns > 0 && !includeSystemTraffic ? (
              <li>
                <strong>Hidden system runs</strong>
                <span>{hiddenRuns}</span>
              </li>
            ) : null}
          </ul>
        </aside>
      </section>

      <OperatorQueueFilters
        query={query}
        includeSystemTraffic={includeSystemTraffic}
        searchLabel="Search workflow runs"
        searchPlaceholder="Search by lead, provider, workflow event, or failure detail"
        extraParams={{ result: resultFilter || undefined }}
      />

      {hiddenRuns > 0 ? (
        <section className="panel">
          <p className="muted">
            {includeSystemTraffic
              ? "System verification workflow runs are included in this history."
              : "System verification workflow runs are hidden from the default history."}
          </p>
          <div className="cta-row">
            {includeSystemTraffic ? (
              <Link href="/dashboard/workflows" className="secondary">
                Hide system activity
              </Link>
            ) : (
              <Link href="/dashboard/workflows?include=system" className="secondary">
                Show system activity
              </Link>
            )}
          </div>
        </section>
      ) : null}

      <section className="panel">
        <p className="eyebrow">Current result set</p>
        <h2>{runsWithLead.length} workflow runs in view</h2>
        <p className="muted">
          {query
            ? `Filtered from ${visibleRuns.length} visible runs using "${query}".`
            : resultFilter
              ? `Filtered to ${formatPortalLabel(resultFilter)} workflow history.`
              : "Use search and system-traffic filters to focus on failures, providers, or lead identities."}
        </p>
        <p className="muted">Showing {pagedRuns.length} runs on this page.</p>
      </section>

      <OperatorPagination
        page={safePage}
        pageCount={pageCount}
        basePath="/dashboard/workflows"
        query={query}
        includeSystemTraffic={includeSystemTraffic}
        extraParams={{ result: resultFilter || undefined }}
      />

      <section className="stack-grid">
        {registry.length === 0 ? null : registry.map((workflow) => (
          <article key={workflow.slug} className="stack-card">
            <p className="eyebrow">Starter workflow</p>
            <h2>{formatPortalLabel(workflow.workflowName)}</h2>
            <p className="muted">
              Status: {formatPortalLabel(workflow.status)} | Active: {workflow.active ? "yes" : "no"}
            </p>
            <p className="muted">
              Manifest: {workflow.manifestVersion.slice(0, 12)} | Hash: {workflow.manifestHash.slice(0, 12)}
            </p>
            <p className="muted">
              Last provisioned: {workflow.lastProvisionedAt}
            </p>
            {workflow.detail ? <p className="muted portal-breakable">{workflow.detail}</p> : null}
          </article>
        ))}
      </section>

      <section className="stack-grid">
        {runsWithLead.length === 0 ? (
          <article className="panel">
            <div className="portal-empty">
              <p className="muted">
                {query
                  ? "No workflow runs match the current filters."
                  : "No workflow runs have been recorded yet."}
              </p>
              <p className="muted">Try a different lead, provider, or workflow-event search.</p>
            </div>
          </article>
        ) : (
          pagedRuns.map(({ run, lead }) => (
            <article key={run.id} className="stack-card">
              <p className="eyebrow">{formatPortalLabel(run.provider)}</p>
              <h2>{formatPortalLabel(run.eventName)}</h2>
              <p className="muted portal-breakable">{run.detail}</p>
              <p className="muted">
                Mode: {run.mode} | Success: {run.ok ? "yes" : "no"}
              </p>
              <div className="portal-summary">
                <strong className="portal-inline-text">
                  {lead
                    ? buildLeadDisplayName(lead)
                    : run.leadKey ? formatLeadKeyForDisplay(run.leadKey) : "Not tied to a lead"}
                </strong>
                <p className="muted portal-breakable">
                  {lead ? buildLeadSubline(lead) : "Workflow run is not attached to a lead profile."}
                </p>
                <p className="muted">Family: {lead?.family ?? "Unknown"}</p>
              </div>
              <p className="muted">Created: {run.createdAt}</p>
              {run.leadKey ? (
                <div className="cta-row">
                  <Link href={`/dashboard/leads/${encodeURIComponent(run.leadKey)}`} className="secondary">
                    Open lead detail
                  </Link>
                </div>
              ) : null}
            </article>
          ))
        )}
      </section>
    </main>
  );
}
