import Link from "next/link";
import { buildDashboardSnapshot } from "@/lib/dashboard";
import { requireOperatorPageSession } from "@/lib/operator-auth";
import { getCanonicalEvents, getLeadRecords } from "@/lib/runtime-store";
import { tenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function ExperimentsPage() {
  await requireOperatorPageSession("/dashboard/experiments");
  const snapshot = buildDashboardSnapshot(await getLeadRecords(), await getCanonicalEvents());

  return (
    <main className="experience-page">
      <section className="experience-hero">
        <div className="hero-copy">
          <p className="eyebrow">Variation signals</p>
          <h1>{tenantConfig.brandName} observational variant reporting</h1>
          <p className="lede">
            Review which tagged experiences are showing stronger milestone movement. This page is
            observational until LeadOS has true randomized experiments and holdouts in place.
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
          </ul>
        </aside>
      </section>

      <section className="stack-grid">
        <article className="portal-notice">
          <strong>Interpret these results carefully.</strong>
          <p className="muted">
            Current variant reporting is based on tagged traffic segments, not randomized causal
            tests. Use it for directional learning, not final winner selection.
          </p>
        </article>
        {snapshot.experimentPerformance.length === 0 ? (
          <article className="panel">
            <p className="muted">No variant-tagged leads have been recorded yet.</p>
          </article>
        ) : (
          snapshot.experimentPerformance.map((experiment) => (
            <article key={experiment.experimentId} className="stack-card">
              <p className="eyebrow">{experiment.experimentId}</p>
              <h2>{experiment.entries} entries</h2>
              <p className="muted">
                Hot rate: {experiment.hotRate}% | M1 to M2: {experiment.m1ToM2}% | M1 to M3: {experiment.m1ToM3}% | Conversion: {experiment.conversionRate}%
              </p>
              <ul className="check-list">
                {experiment.topVariants.map((variant) => (
                  <li key={variant.variantId}>
                    {variant.variantId}: {variant.count}
                  </li>
                ))}
              </ul>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
