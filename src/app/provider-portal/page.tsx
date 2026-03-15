import Link from "next/link";
import { ProviderDispatchRequestPanel } from "@/components/ProviderDispatchRequestPanel";
import { ProviderPortalProfileForm } from "@/components/ProviderPortalProfileForm";
import { getProviderPortalSnapshot } from "@/lib/provider-portal";
import { requireProviderPortalPageSession } from "@/lib/provider-portal-auth";

export const dynamic = "force-dynamic";

export default async function ProviderPortalPage() {
  const session = await requireProviderPortalPageSession();
  const snapshot = await getProviderPortalSnapshot(session.providerId);

  if (!snapshot.provider) {
    return (
      <main className="experience-page">
        <section className="panel">
          <p className="eyebrow">Provider portal</p>
          <h1>Provider profile not found</h1>
          <p className="muted">
            This access link no longer maps to an active dispatch provider. Ask network ops for a fresh link.
          </p>
          <div className="cta-row">
            <Link href="/join-provider-network" className="secondary">
              Back to provider join page
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="experience-page">
      <section className="experience-hero">
        <div className="hero-copy">
          <p className="eyebrow">Provider portal</p>
          <h1>{snapshot.provider.label}</h1>
          <p className="lede">
            Keep your service area and live capacity current, then respond quickly to dispatch requests so LeadOS can
            route profitable ZIP demand to the right crew.
          </p>
          <div className="cta-row">
            <a href="/provider-portal/sign-out" className="secondary">
              Sign out
            </a>
          </div>
        </div>
        <aside className="hero-rail">
          <p className="eyebrow">Dispatch summary</p>
          <ul className="journey-rail">
            <li>
              <strong>Pending requests</strong>
              <span>{snapshot.summary.pending}</span>
            </li>
            <li>
              <strong>Accepted</strong>
              <span>{snapshot.summary.accepted}</span>
            </li>
            <li>
              <strong>Declined</strong>
              <span>{snapshot.summary.declined}</span>
            </li>
            <li>
              <strong>Accepting jobs</strong>
              <span>{snapshot.provider.acceptingNewJobs ? "yes" : "paused"}</span>
            </li>
          </ul>
        </aside>
      </section>

      <section className="grid two">
        <ProviderPortalProfileForm provider={snapshot.provider} />
        <ProviderDispatchRequestPanel requests={snapshot.requests} />
      </section>
    </main>
  );
}
