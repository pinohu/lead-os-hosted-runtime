import Link from "next/link";
import { tenantConfig } from "@/lib/tenant";

type ShowroomItem = {
  audience: "Customer" | "Provider";
  label: string;
  href: string;
  summary: string;
  bestFor: string;
};

const buyerFunnels: ShowroomItem[] = [
  {
    audience: "Customer",
    label: "Marketplace home",
    href: "/",
    summary: "Top-level marketplace entry that helps a visitor choose the right plumbing path first.",
    bestFor: "Broad traffic, homepage handoff, and mixed-intent campaigns.",
  },
  {
    audience: "Customer",
    label: "Customer help hub",
    href: "/get-plumbing-help",
    summary: "Demand-side decision page for visitors choosing between emergency, estimate, and commercial help.",
    bestFor: "Mixed homeowner and tenant demand that needs quick path selection.",
  },
  {
    audience: "Customer",
    label: "Emergency plumbing",
    href: "/plumbing/emergency",
    summary: "Fast, urgent, dispatch-first path for active plumbing issues and mobile solve-now traffic.",
    bestFor: "Paid traffic, urgent SEO, sticky CTAs, and \"need help now\" entry points.",
  },
  {
    audience: "Customer",
    label: "Plumbing estimate",
    href: "/plumbing/estimate",
    summary: "Calmer planned-work flow for installs, replacements, and estimate-minded visitors.",
    bestFor: "Water heater pages, repair pages, and project comparison traffic.",
  },
  {
    audience: "Customer",
    label: "Commercial plumbing",
    href: "/plumbing/commercial",
    summary: "Structured intake for property managers, facilities teams, and commercial service requests.",
    bestFor: "Commercial landing pages and B2B service acquisition.",
  },
  {
    audience: "Customer",
    label: "Local ZIP page",
    href: "/local/19103",
    summary: "ZIP-aware local landing page that keeps relevance and locality visible from the first screen.",
    bestFor: "Local SEO, geo pages, and area-specific high-intent traffic.",
  },
];

const providerFunnels: ShowroomItem[] = [
  {
    audience: "Provider",
    label: "Join provider network",
    href: "/join-provider-network",
    summary: "Public provider-acquisition page for plumbers and service teams who want better-fit dispatched work.",
    bestFor: "Recruiting providers, supply growth, and network onboarding campaigns.",
  },
  {
    audience: "Provider",
    label: "Provider portal",
    href: "/provider-portal",
    summary: "Operational portal for active providers to manage requests, capacity, and completion reporting.",
    bestFor: "Existing providers after onboarding and activation.",
  },
];

function FunnelPreviewCard({ item }: { item: ShowroomItem }) {
  const absoluteUrl = `${tenantConfig.siteUrl}${item.href}`;

  return (
    <article className="panel showroom-card">
      <div className="portal-status-row">
        <span className="portal-chip">{item.audience}</span>
        <span className="portal-chip">{item.label}</span>
      </div>
      <h2>{item.label}</h2>
      <p className="muted">{item.summary}</p>
      <div className="portal-data-list">
        <div>
          <dt>Best for</dt>
          <dd>{item.bestFor}</dd>
        </div>
        <div>
          <dt>Live URL</dt>
          <dd className="portal-breakable">{absoluteUrl}</dd>
        </div>
      </div>
      <div className="cta-row">
        <Link href={item.href} className="primary">
          Open live page
        </Link>
        <Link href={`${item.href}?blueprint=1`} className="secondary">
          Open blueprint view
        </Link>
      </div>
      <iframe
        src={item.href}
        title={`${item.label} preview`}
        className="showroom-frame"
        loading="lazy"
      />
    </article>
  );
}

export default function PlumbingShowroomPage() {
  return (
    <main className="experience-page showroom-page">
      <section className="experience-hero">
        <div className="hero-copy">
          <p className="eyebrow">Public showroom</p>
          <h1>See the real customer-facing plumbing funnels in one place</h1>
          <p className="lede">
            This page is for reviewing what actual homeowners, tenants, property teams, and plumbing providers
            will see. It is separate from the operator-facing blueprint generator.
          </p>
          <p className="hero-audience">
            Use this page to compare the real public experiences before choosing how to deploy them.
          </p>
          <div className="hero-highlight-row">
            <span className="hero-highlight">Real public pages</span>
            <span className="hero-highlight">Live preview frames</span>
            <span className="hero-highlight">Blueprint links included</span>
          </div>
          <div className="cta-row">
            <Link href="/deployments/plumbing" className="secondary">
              Open deployment blueprint
            </Link>
            <Link href="/plumbing/emergency" className="primary">
              Open emergency funnel
            </Link>
          </div>
        </div>
        <aside className="hero-rail">
          <p className="eyebrow">How to use this showroom</p>
          <ul className="journey-rail">
            <li>
              <strong>Review the public experience first</strong>
              <span>Look at the live funnels the same way a real customer or provider would.</span>
            </li>
            <li>
              <strong>Choose the right landing asset</strong>
              <span>Match urgent, estimate, commercial, local, or provider traffic to the correct page.</span>
            </li>
            <li>
              <strong>Move to blueprint only when deploying</strong>
              <span>Use the operator blueprint after you know which public experience you want to ship.</span>
            </li>
          </ul>
        </aside>
      </section>

      <section className="panel">
        <p className="eyebrow">Customer-side funnels</p>
        <h2>Homeowners, tenants, and buyers</h2>
        <p className="muted">
          These are the demand-side public pages meant to capture emergency jobs, planned estimates, commercial
          requests, and local search traffic.
        </p>
        <div className="showroom-grid">
          {buyerFunnels.map((item) => (
            <FunnelPreviewCard key={item.href} item={item} />
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Provider-side funnels</p>
        <h2>Plumbers and service providers</h2>
        <p className="muted">
          These are the supply-side public and operational pages used to recruit providers and then support them
          after onboarding.
        </p>
        <div className="showroom-grid">
          {providerFunnels.map((item) => (
            <FunnelPreviewCard key={item.href} item={item} />
          ))}
        </div>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">What this page is for</p>
          <h2>Public review, not implementation details</h2>
          <ul className="check-list">
            <li>Use this page when you want to review actual customer and provider funnels.</li>
            <li>Use the blueprint page when you want widget code, hosted links, bulk ZIP rollout, or WordPress packages.</li>
            <li>Use the blueprint links on each card if you want the operator/deployment version of the same asset.</li>
          </ul>
        </article>
        <article className="panel">
          <p className="eyebrow">Operator tools</p>
          <h2>Where deployment work happens after review</h2>
          <div className="cta-row">
            <Link href="/deployments/plumbing" className="secondary">
              Deployment blueprint
            </Link>
            <Link href="/dashboard/deployments" className="secondary">
              Rollout registry
            </Link>
            <Link href="/dashboard/manual" className="secondary">
              SOP center
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
