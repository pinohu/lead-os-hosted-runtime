import Link from "next/link";
import { ExperimentPromotionForm } from "@/components/ExperimentPromotionForm";
import { buildDashboardSnapshotWithOptions } from "@/lib/dashboard";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { formatCurrency } from "@/lib/operator-ui";
import { getCanonicalEvents, getLeadRecords } from "@/lib/runtime-store";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
import { tenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

function classifyExperiment(experiment: {
  entries: number;
  contributionMargin: number;
  refunds: number;
  majorComplaints: number;
  conversionRate: number;
  marginRate: number;
}) {
  if (experiment.entries < 25) {
    return {
      status: "running",
      summary: "Still gathering enough traffic to trust the economics.",
    };
  }
  if (experiment.contributionMargin > 0 && experiment.refunds === 0 && experiment.majorComplaints === 0 && experiment.marginRate >= 20) {
    return {
      status: "promotable",
      summary: "This variant is economically healthy enough to consider promoting into the default deployment preset.",
    };
  }
  if (experiment.contributionMargin <= 0 || experiment.refunds > 0 || experiment.majorComplaints > 0) {
    return {
      status: "at-risk",
      summary: "This variant is moving traffic, but the downstream economics or service quality signals are not strong enough yet.",
    };
  }
  return {
    status: "enough-data",
    summary: "This variant has enough data for operator review, but it is not yet a clear winner.",
  };
}

export default async function ExperimentsPage() {
  await requireOperatorPageSession("/dashboard/experiments");
  const [leads, events, runtimeConfig] = await Promise.all([
    getLeadRecords(),
    getCanonicalEvents(),
    getOperationalRuntimeConfig(),
  ]);
  const snapshot = buildDashboardSnapshotWithOptions(leads, events, {
    dispatchProviders: runtimeConfig.dispatch.providers,
    marketplace: runtimeConfig.marketplace,
  });
  const promotedByExperiment = new Map(
    runtimeConfig.experiments.promotions.map((promotion) => [promotion.experimentId, promotion]),
  );

  return (
    <main className="experience-page">
      <section className="experience-hero">
        <div className="hero-copy">
          <p className="eyebrow">Experiment assignment</p>
          <h1>{tenantConfig.brandName} randomized experience reporting</h1>
          <p className="lede">
            Review which assigned experience variants are showing stronger milestone movement and better
            closed-loop plumbing outcomes. LeadOS now weights experiments against completed revenue,
            margin quality, review signals, and complaint risk instead of stopping at top-funnel motion.
          </p>
          <div className="cta-row">
            <Link href="/dashboard" className="secondary">
              Back to dashboard
            </Link>
          </div>
        </div>
        <aside className="hero-rail">
          <p className="eyebrow">Tracked variants</p>
          <ul className="journey-rail">
            <li>
              <strong>Experiments</strong>
              <span>{snapshot.experimentPerformance.length}</span>
            </li>
            <li>
              <strong>Variants</strong>
              <span>{snapshot.experimentPerformance.reduce((sum, item) => sum + item.topVariants.length, 0)}</span>
            </li>
            <li>
              <strong>Holdout variants</strong>
              <span>{snapshot.experimentPerformance.reduce((sum, item) => sum + item.topVariants.filter((variant) => variant.variantId.includes("holdout")).length, 0)}</span>
            </li>
          </ul>
        </aside>
      </section>

      <section className="stack-grid">
        <article className="portal-notice">
          <strong>Interpret these results as early experimental evidence.</strong>
          <p className="muted">
            Assignment is now randomized for key plumbing entry experiences when a stable visitor key
            is available. Treat these as decision support until samples are large enough to trust the
            revenue, margin, review, and complaint signals.
          </p>
        </article>
        {snapshot.experimentPerformance.length === 0 ? (
          <article className="panel">
            <p className="muted">No variant-tagged leads have been recorded yet.</p>
          </article>
        ) : (
          snapshot.experimentPerformance.map((experiment) => (
            <article key={experiment.experimentId} className={`stack-card tone-${classifyExperiment(experiment).status === "promotable" ? "success" : classifyExperiment(experiment).status === "at-risk" ? "warning" : "neutral"}`}>
              <div className="portal-status-row">
                <span className="portal-chip">{experiment.experimentId}</span>
                <span className="portal-chip">{classifyExperiment(experiment).status}</span>
                {promotedByExperiment.has(experiment.experimentId) ? <span className="portal-chip">live default</span> : null}
              </div>
              <h2>{experiment.entries} entries</h2>
              <p className="muted">
                Hot rate: {experiment.hotRate}% | M1 to M2: {experiment.m1ToM2}% | M1 to M3: {experiment.m1ToM3}% | Conversion: {experiment.conversionRate}%
              </p>
              <p className="muted">
                Completed revenue: {formatCurrency(experiment.completedRevenue)} | Margin: {formatCurrency(experiment.completedMargin)} | Margin rate: {experiment.marginRate}%
              </p>
              <p className="muted">
                Acquisition cost: {formatCurrency(experiment.acquisitionCost)} | Provider payout: {formatCurrency(experiment.providerPayout)} | Contribution: {formatCurrency(experiment.contributionMargin)}
              </p>
              <p className="muted">
                Contribution rate: {experiment.contributionMarginRate}% | Economic status: {experiment.contributionStatus}
              </p>
              <p className="muted">
                Positive reviews: {experiment.positiveReviews} | Negative reviews: {experiment.negativeReviews} | Major complaints: {experiment.majorComplaints} | Refunds: {experiment.refunds}
              </p>
              <p className="muted portal-breakable">
                <strong>Lifecycle:</strong> {classifyExperiment(experiment).summary}
              </p>
              <ul className="check-list">
                {experiment.topVariants.map((variant) => (
                  <li key={variant.variantId}>
                    {variant.variantId}: {variant.count}
                  </li>
                ))}
              </ul>
              {experiment.topVariants.filter((variant) => !variant.variantId.includes("holdout")).slice(0, 1).map((variant) => (
                <div key={`${experiment.experimentId}:${variant.variantId}`} className="stack-grid">
                  <p className="muted portal-breakable">
                    Promote the current lead variant winner into the synchronous live resolver so new visitors stop randomizing for this experiment.
                  </p>
                  <ExperimentPromotionForm
                    experimentId={experiment.experimentId}
                    variantId={variant.variantId}
                    promoted={promotedByExperiment.get(experiment.experimentId)?.variantId === variant.variantId}
                  />
                </div>
              ))}
            </article>
          ))
        )}
      </section>
    </main>
  );
}
