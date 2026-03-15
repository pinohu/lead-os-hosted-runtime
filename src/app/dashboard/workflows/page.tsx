import Link from "next/link";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import {
  getLeadRecord,
  getWorkflowRegistryRecords,
  getWorkflowRuns,
  type WorkflowRunRecord,
} from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";
import { isSystemWorkflowRun } from "@/lib/operator-view";

type WorkflowRunsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function WorkflowRunsPage({ searchParams }: WorkflowRunsPageProps) {
  await requireOperatorPageSession("/dashboard/workflows");
  const params = (await searchParams) ?? {};
  const includeSystemTraffic = asString(params.include) === "system";
  const runs = (await getWorkflowRuns()) as WorkflowRunRecord[];
  const visibleRuns = includeSystemTraffic ? runs : runs.filter((run) => !isSystemWorkflowRun(run));
  const hiddenRuns = Math.max(0, runs.length - visibleRuns.length);
  const registry = await getWorkflowRegistryRecords();
  const runsWithLead = await Promise.all(
    visibleRuns.map(async (run) => ({
      run,
      lead: run.leadKey ? await getLeadRecord(run.leadKey) : undefined,
    })),
  );

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

      <section className="stack-grid">
        {registry.length === 0 ? null : registry.map((workflow) => (
          <article key={workflow.slug} className="stack-card">
            <p className="eyebrow">Starter workflow</p>
            <h2>{workflow.workflowName}</h2>
            <p className="muted">
              Status: {workflow.status} | Active: {workflow.active ? "yes" : "no"}
            </p>
            <p className="muted">
              Manifest: {workflow.manifestVersion.slice(0, 12)} | Hash: {workflow.manifestHash.slice(0, 12)}
            </p>
            <p className="muted">
              Last provisioned: {workflow.lastProvisionedAt}
            </p>
            {workflow.detail ? <p className="muted">{workflow.detail}</p> : null}
          </article>
        ))}
      </section>

      <section className="stack-grid">
        {runsWithLead.length === 0 ? (
          <article className="panel">
            <p className="muted">No workflow runs have been recorded yet.</p>
          </article>
        ) : (
          runsWithLead.map(({ run, lead }) => (
            <article key={run.id} className="stack-card">
              <p className="eyebrow">{run.provider}</p>
              <h2>{run.eventName}</h2>
              <p className="muted">{run.detail}</p>
              <p className="muted">
                Mode: {run.mode} | Success: {run.ok ? "yes" : "no"}
              </p>
              <p className="muted">
                Lead: {run.leadKey ?? "not tied to a lead"}
                {lead ? ` | Family: ${lead.family}` : ""}
              </p>
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
