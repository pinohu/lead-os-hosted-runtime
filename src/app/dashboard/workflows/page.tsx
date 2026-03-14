import Link from "next/link";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { getLeadRecord, getWorkflowRuns, type WorkflowRunRecord } from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

export default async function WorkflowRunsPage() {
  await requireOperatorPageSession("/dashboard/workflows");
  const runs = (await getWorkflowRuns()) as WorkflowRunRecord[];
  const runsWithLead = await Promise.all(
    runs.map(async (run) => ({
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
              <span>{runs.length}</span>
            </li>
            <li>
              <strong>Live</strong>
              <span>{runs.filter((run) => run.mode === "live").length}</span>
            </li>
            <li>
              <strong>Failed</strong>
              <span>{runs.filter((run) => !run.ok).length}</span>
            </li>
          </ul>
        </aside>
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
