import { headers } from "next/headers";
import Link from "next/link";
import { AdaptiveLeadCaptureForm } from "@/components/AdaptiveLeadCaptureForm";
import { ExperienceScaffold } from "@/components/ExperienceScaffold";
import {
  buildPlumbingIntegrationBundle,
  type PlumbingEntrypointDefinition,
} from "@/lib/plumbing-entrypoints";
import { getNiche } from "@/lib/catalog";
import { EXPERIENCE_ASSIGNMENT_HEADER } from "@/lib/experiments";
import { resolveExperienceProfile } from "@/lib/experience";
import { getOperationalRuntimeConfig } from "@/lib/runtime-config";
import { tenantConfig } from "@/lib/tenant";

type PlumbingEntryPageProps = {
  entry: PlumbingEntrypointDefinition;
  searchParams?: Record<string, string | string[] | undefined>;
};

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function asBoolean(value: string | string[] | undefined) {
  const normalized = asString(value)?.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function buildPublicMetrics(entry: PlumbingEntrypointDefinition) {
  if (entry.audience === "provider") {
    return [
      {
        label: "Job quality",
        value: "Better-fit work",
        detail: "Service area, specialty, and readiness matter before jobs are routed.",
      },
      {
        label: "Setup style",
        value: "Short and practical",
        detail:
          "The first step focuses on coverage, emergency availability, and the kinds of jobs you want.",
      },
      {
        label: "Best outcome",
        value: "More relevant leads",
        detail: "Good provider pages should feel selective, operational, and worth completing.",
      },
    ];
  }

  if (entry.kind === "emergency") {
    return [
      {
        label: "Speed",
        value: "Fast path",
        detail: "Urgent visitors should be able to act quickly without a long quote form.",
      },
      {
        label: "Contact",
        value: "Phone-first",
        detail: "The page keeps the best contact path obvious when timing matters most.",
      },
      {
        label: "Fallback",
        value: "Human help",
        detail: "If the issue is unusual, a dispatch-style fallback stays visible.",
      },
    ];
  }

  if (entry.kind === "estimate") {
    return [
      {
        label: "Pressure",
        value: "Lower-pressure flow",
        detail: "Planned jobs should feel calm, useful, and easy to continue.",
      },
      {
        label: "Detail level",
        value: "Only what is needed",
        detail: "The page asks for enough context to move forward, not everything at once.",
      },
      {
        label: "Best outcome",
        value: "Better estimate requests",
        detail: "Comparison-minded visitors get a cleaner route to the next step.",
      },
    ];
  }

  if (entry.kind === "commercial") {
    return [
      {
        label: "Language",
        value: "Commercial-safe",
        detail:
          "Property and facilities teams should not feel like they landed on a homeowner emergency page.",
      },
      {
        label: "Intake",
        value: "Structured request",
        detail: "The flow leaves room for site, building, and coordination context.",
      },
      {
        label: "Best outcome",
        value: "Qualified service requests",
        detail:
          "Commercial buyers should know what happens next and what kind of request they are making.",
      },
    ];
  }

  if (entry.kind === "local") {
    return [
      {
        label: "Local feel",
        value: "ZIP-specific",
        detail: "Local visitors should see their area reflected before they commit.",
      },
      {
        label: "Intent fit",
        value: "Urgent or planned",
        detail:
          "Search traffic can split into emergency, estimate, or commercial help without friction.",
      },
      {
        label: "Best outcome",
        value: "Less bounce",
        detail: "Local relevance and a clear next step keep geo pages from feeling generic.",
      },
    ];
  }

  return [
    {
      label: "Clarity",
      value: "Right path first",
      detail:
        "Visitors should know where to go without guessing whether this is urgent, planned, or commercial.",
    },
    {
      label: "Effort",
      value: "Short first step",
      detail: "The page should reduce decision effort before it asks for much information.",
    },
    {
      label: "Best outcome",
      value: "Clear next step",
      detail: "People convert better when the next action feels obvious, local, and credible.",
    },
  ];
}

function getExperiencePageClassName(entry: PlumbingEntrypointDefinition) {
  return `experience-page--${entry.kind}`;
}

function getRailContent(entry: PlumbingEntrypointDefinition) {
  switch (entry.kind) {
    case "emergency":
      return {
        eyebrow: "Right now matters most",
        title:
          "This page is built to shorten the distance between stress and a credible next step",
        summary:
          "Urgent visitors need speed, certainty, and a human fallback. The page should feel direct, calm, and local within seconds.",
      };
    case "estimate":
      return {
        eyebrow: "Built for comparison mode",
        title: "This page is built for people who want clarity before they commit",
        summary:
          "Planned work needs calmer expectations, lighter friction, and enough detail to keep the quote path useful without feeling like homework.",
      };
    case "commercial":
      return {
        eyebrow: "Commercial desk mindset",
        title: "This page is built to feel structured, capable, and property-aware",
        summary:
          "Property teams should see site-aware intake, repeat-work readiness, and a service conversation that feels more serious than a homeowner form.",
      };
    case "provider":
      return {
        eyebrow: "Worth a provider's time",
        title: "This page is built to attract better-fit plumbers, not curiosity clicks",
        summary:
          "The strongest provider pages lead with territory, specialties, and opportunity quality so serious teams can quickly decide whether to apply.",
      };
    case "local":
      return {
        eyebrow: "Local trust matters first",
        title:
          "This page is built to feel nearby, relevant, and useful before the first field",
        summary:
          "ZIP-level traffic decides fast whether a page feels local enough to trust, so the page should prove area fit and next-step clarity immediately.",
      };
    case "help-home":
      return {
        eyebrow: "Choose the right lane quickly",
        title: "This page is built to help people self-select before friction appears",
        summary:
          "When a visitor is not sure whether they need urgent help, an estimate, or commercial service, the first job is to remove confusion fast.",
      };
    default:
      return {
        eyebrow: "Start in the right place",
        title:
          "This page is built to help visitors recognize the best path without overthinking it",
        summary:
          "The homepage should work like a calm traffic director: clear choices, low friction, and no wasted clicks into the wrong funnel.",
      };
  }
}

function getRailHighlights(entry: PlumbingEntrypointDefinition) {
  switch (entry.kind) {
    case "emergency":
      return [
        {
          label: "Best for",
          detail: "Leaks, backups, no hot water, and fast-moving household disruption.",
        },
        {
          label: "Primary need",
          detail: "One obvious next step with a believable human fallback.",
        },
        {
          label: "Page goal",
          detail: "Reduce panic, shorten the path, and keep the visitor moving.",
        },
      ];
    case "estimate":
      return [
        {
          label: "Best for",
          detail: "Repairs, replacements, installs, and comparison-minded buyers.",
        },
        {
          label: "Primary need",
          detail: "A realistic quote path without a giant intake burden.",
        },
        {
          label: "Page goal",
          detail: "Keep evaluation mode open while still creating momentum.",
        },
      ];
    case "commercial":
      return [
        {
          label: "Best for",
          detail: "Facilities, multi-unit properties, and repeat-work conversations.",
        },
        {
          label: "Primary need",
          detail: "Structured intake that respects site and portfolio complexity.",
        },
        {
          label: "Page goal",
          detail: "Signal competence, coordination, and operational seriousness.",
        },
      ];
    case "provider":
      return [
        {
          label: "Best for",
          detail: "Plumbers with clear territory, specialties, and response readiness.",
        },
        {
          label: "Primary need",
          detail: "Proof the opportunity is selective and fit-based.",
        },
        {
          label: "Page goal",
          detail: "Attract strong operators, not casual low-intent signups.",
        },
      ];
    case "local":
      return [
        {
          label: "Best for",
          detail: "ZIP and city search traffic that needs fast relevance cues.",
        },
        {
          label: "Primary need",
          detail: "Local confidence before the visitor gives up or goes back to search.",
        },
        {
          label: "Page goal",
          detail: "Feel nearby, useful, and worth acting on right away.",
        },
      ];
    default:
      return [
        {
          label: "Best for",
          detail: "Visitors who need the right lane before choosing a longer flow.",
        },
        {
          label: "Primary need",
          detail: "Quick self-selection without confusion.",
        },
        {
          label: "Page goal",
          detail: "Get the right person into the right funnel quickly.",
        },
      ];
  }
}

function renderSignatureSection(entry: PlumbingEntrypointDefinition) {
  switch (entry.kind) {
    case "marketplace-home":
    case "help-home":
      return (
        <section className="funnel-spotlight funnel-spotlight--chooser">
          <article className="panel spotlight-lead">
            <p className="eyebrow">Choose your lane</p>
            <h2>Three very different situations should not start in the same form</h2>
            <p className="muted">
              The fastest path for an emergency is not the best path for a quote shopper,
              and neither of those should feel like a commercial desk.
            </p>
          </article>
          <div className="spotlight-grid">
            <article className="spotlight-card">
              <p className="eyebrow">Urgent</p>
              <h3>Get help now</h3>
              <p className="muted">
                For active leaks, backups, no hot water, and other problems where speed
                matters more than comparison.
              </p>
            </article>
            <article className="spotlight-card">
              <p className="eyebrow">Planned</p>
              <h3>Book an estimate</h3>
              <p className="muted">
                For repairs, installs, replacements, and lower-pressure quote decisions.
              </p>
            </article>
            <article className="spotlight-card">
              <p className="eyebrow">Commercial</p>
              <h3>Request service</h3>
              <p className="muted">
                For properties, buildings, facilities, and repeat-work coordination.
              </p>
            </article>
          </div>
        </section>
      );
    case "emergency":
      return (
        <section className="funnel-spotlight funnel-spotlight--emergency">
          <article className="panel spotlight-lead">
            <p className="eyebrow">What emergency visitors need first</p>
            <h2>Speed, clarity, and a fallback that still feels human</h2>
            <p className="muted">
              When someone is dealing with water, damage, or a disruption at home, the page
              has to reduce uncertainty before it asks for effort.
            </p>
          </article>
          <div className="spotlight-grid">
            <article className="spotlight-card danger-card">
              <p className="eyebrow">Fast recognition</p>
              <h3>"Yes, this page is for my problem"</h3>
              <p className="muted">
                Burst pipes, active leaks, sewer backups, and no-hot-water issues should
                be visible immediately.
              </p>
            </article>
            <article className="spotlight-card">
              <p className="eyebrow">Clear action</p>
              <h3>One main CTA beats a wall of choices</h3>
              <p className="muted">
                Visitors under pressure need one obvious next step and one safe fallback
                if the job is unusual.
              </p>
            </article>
            <article className="spotlight-card">
              <p className="eyebrow">Mobile reality</p>
              <h3>Short, thumb-friendly, and phone-first</h3>
              <p className="muted">
                Emergency pages perform best when they feel easy to complete one-handed in
                under a minute.
              </p>
            </article>
          </div>
        </section>
      );
    case "estimate":
      return (
        <section className="funnel-spotlight funnel-spotlight--estimate">
          <article className="panel spotlight-lead">
            <p className="eyebrow">What estimate shoppers need first</p>
            <h2>Calm expectations and a quote path that does not feel heavy</h2>
            <p className="muted">
              Planned-work visitors want proof they are in the right place without being
              pushed into emergency-style pressure or bloated intake.
            </p>
          </article>
          <div className="spotlight-grid">
            <article className="spotlight-card">
              <p className="eyebrow">Repair</p>
              <h3>Fix something specific</h3>
              <p className="muted">
                Leak repair, drain issues, fixture problems, and other scoped jobs need a
                straightforward quote path.
              </p>
            </article>
            <article className="spotlight-card">
              <p className="eyebrow">Replace</p>
              <h3>Price a bigger project</h3>
              <p className="muted">
                Water heaters, repiping, and upgrades need room for context without
                turning into a giant form.
              </p>
            </article>
            <article className="spotlight-card">
              <p className="eyebrow">Compare</p>
              <h3>Understand the next step clearly</h3>
              <p className="muted">
                This page should feel useful to people who are still evaluating, not only
                to people already ready to book.
              </p>
            </article>
          </div>
        </section>
      );
    case "commercial":
      return (
        <section className="funnel-spotlight funnel-spotlight--commercial">
          <article className="panel spotlight-lead">
            <p className="eyebrow">What commercial buyers need first</p>
            <h2>A service desk feel, not a homeowner page with business words added</h2>
            <p className="muted">
              Facilities teams and property managers are scanning for competence,
              structure, and whether the request path respects building complexity.
            </p>
          </article>
          <div className="spotlight-grid">
            <article className="spotlight-card">
              <p className="eyebrow">Properties</p>
              <h3>Site-aware intake</h3>
              <p className="muted">
                The page should acknowledge buildings, units, and recurring service needs
                as part of the first conversation.
              </p>
            </article>
            <article className="spotlight-card">
              <p className="eyebrow">Teams</p>
              <h3>Coordination-ready language</h3>
              <p className="muted">
                Commercial buyers want to know whether they are requesting service,
                discussing coverage, or setting up repeat work.
              </p>
            </article>
            <article className="spotlight-card">
              <p className="eyebrow">Continuity</p>
              <h3>Clear next-step expectations</h3>
              <p className="muted">
                The page should show that the next step is organized, documented, and not
                dependent on homeowner assumptions.
              </p>
            </article>
          </div>
        </section>
      );
    case "provider":
      return (
        <section className="funnel-spotlight funnel-spotlight--provider">
          <article className="panel spotlight-lead">
            <p className="eyebrow">What serious providers need first</p>
            <h2>Proof that this could lead to better-fit local work</h2>
            <p className="muted">
              Recruitment pages convert stronger when plumbers feel the opportunity is
              selective, operationally relevant, and based on real service fit.
            </p>
          </article>
          <div className="spotlight-grid">
            <article className="spotlight-card">
              <p className="eyebrow">Territory</p>
              <h3>Where you actually want jobs</h3>
              <p className="muted">
                Service area matters early because good providers do not want random work
                outside their preferred radius.
              </p>
            </article>
            <article className="spotlight-card">
              <p className="eyebrow">Specialties</p>
              <h3>The work you want more of</h3>
              <p className="muted">
                The page should focus on fit, emergency coverage, and readiness instead of
                generic company-profile trivia.
              </p>
            </article>
            <article className="spotlight-card">
              <p className="eyebrow">Standards</p>
              <h3>Why strong operators finish the form</h3>
              <p className="muted">
                Better pages make it obvious that speed, coverage, and response quality
                increase the value of the opportunity.
              </p>
            </article>
          </div>
        </section>
      );
    case "local":
      return (
        <section className="funnel-spotlight funnel-spotlight--local">
          <article className="panel spotlight-lead">
            <p className="eyebrow">What local search visitors need first</p>
            <h2>Proof this page is relevant to this ZIP, not just another generic directory</h2>
            <p className="muted">
              Local pages win when they feel nearby, specific, and immediately useful to
              both urgent visitors and comparison-minded shoppers.
            </p>
          </article>
          <div className="spotlight-grid">
            <article className="spotlight-card">
              <p className="eyebrow">Nearby</p>
              <h3>Keep the ZIP visible</h3>
              <p className="muted">
                Area-specific language helps search visitors trust the page before they
                commit to the first action.
              </p>
            </article>
            <article className="spotlight-card">
              <p className="eyebrow">Useful</p>
              <h3>Split urgent and planned intent fast</h3>
              <p className="muted">
                Some visitors need a plumber now and others are comparing. The page
                should support both without confusion.
              </p>
            </article>
            <article className="spotlight-card">
              <p className="eyebrow">Credible</p>
              <h3>Show the next step clearly</h3>
              <p className="muted">
                Local pages convert better when they feel like a real service page, not
                an SEO detour into a giant funnel.
              </p>
            </article>
          </div>
        </section>
      );
  }
}

function renderPremiumModules(entry: PlumbingEntrypointDefinition) {
  switch (entry.kind) {
    case "emergency":
      return (
        <section className="premium-module premium-module--emergency">
          <article className="panel premium-module__lead">
            <p className="eyebrow">Response-time trust</p>
            <h2>Emergency visitors should know how the path works before they commit</h2>
            <div className="premium-metric-grid">
              <article className="premium-metric-card">
                <strong>Fast triage</strong>
                <span>Start with the real issue</span>
                <p className="muted">
                  The first step should identify what is happening before the visitor is
                  asked to explain everything.
                </p>
              </article>
              <article className="premium-metric-card">
                <strong>Clear contact</strong>
                <span>Phone-first when timing matters</span>
                <p className="muted">
                  Urgent pages convert better when the best callback route is obvious and
                  easy to complete.
                </p>
              </article>
              <article className="premium-metric-card">
                <strong>Human fallback</strong>
                <span>No dead-end urgency flow</span>
                <p className="muted">
                  If the booking path is wrong for the issue, the visitor should still
                  have a believable next move.
                </p>
              </article>
            </div>
          </article>
          <div className="premium-split">
            <article className="premium-card premium-card--urgent">
              <p className="eyebrow">Issue triage</p>
              <h3>Common urgent plumbing situations</h3>
              <ul className="check-list">
                <li>Water actively leaking or spraying</li>
                <li>Sewer backup or overflow risk</li>
                <li>No hot water with immediate household disruption</li>
                <li>Drain blockage causing flooding or shutdown</li>
              </ul>
            </article>
            <article className="premium-card">
              <p className="eyebrow">Mobile urgency CTA</p>
              <h3>The main action should stay visible on small screens</h3>
              <p className="muted">
                Emergency visitors often arrive on mobile. The sticky action bar now
                leans into a stronger urgency CTA so they can keep moving without
                scrolling back up.
              </p>
            </article>
          </div>
        </section>
      );
    case "estimate":
      return (
        <section className="premium-module premium-module--estimate">
          <article className="panel premium-module__lead">
            <p className="eyebrow">Project gallery</p>
            <h2>Estimate shoppers should recognize their type of project immediately</h2>
            <div className="premium-gallery-grid">
              <article className="premium-gallery-card">
                <strong>Repair</strong>
                <span>Leaks, drains, fixtures, and scoped fixes</span>
              </article>
              <article className="premium-gallery-card">
                <strong>Replace</strong>
                <span>Water heaters, valves, fixtures, and aging components</span>
              </article>
              <article className="premium-gallery-card">
                <strong>Install</strong>
                <span>Planned upgrades, remodel plumbing, and new equipment</span>
              </article>
            </div>
          </article>
          <div className="premium-split">
            <article className="premium-card">
              <p className="eyebrow">Quote expectations</p>
              <h3>What buyers usually want to understand first</h3>
              <ul className="check-list">
                <li>Whether this is a repair, replacement, or installation conversation</li>
                <li>How much information is needed to keep the quote path moving</li>
                <li>Whether they can switch to a faster help path if the issue changes</li>
              </ul>
            </article>
            <article className="premium-card">
              <p className="eyebrow">Buyer-proof framing</p>
              <h3>Why this estimate path feels easier to trust</h3>
              <p className="muted">
                Planned-work pages convert better when they feel calm, realistic, and
                useful to someone still evaluating options instead of forcing
                instant-dispatch urgency.
              </p>
            </article>
          </div>
        </section>
      );
    case "commercial":
      return (
        <section className="premium-module premium-module--commercial">
          <article className="panel premium-module__lead">
            <p className="eyebrow">Property and service matrix</p>
            <h2>Commercial pages should show they understand the buyer's operating context</h2>
            <div className="service-matrix">
              <article className="service-matrix__card">
                <strong>Property managers</strong>
                <span>Tenant issues, scheduled work, and building coordination</span>
              </article>
              <article className="service-matrix__card">
                <strong>Facilities teams</strong>
                <span>System problems, urgency flags, and continuity planning</span>
              </article>
              <article className="service-matrix__card">
                <strong>Multi-site operators</strong>
                <span>Coverage conversations, recurring service, and rollout context</span>
              </article>
            </div>
          </article>
          <div className="premium-split">
            <article className="premium-card">
              <p className="eyebrow">Account-style credibility</p>
              <h3>This should feel like a capable service desk</h3>
              <ul className="check-list">
                <li>Structured intake for site and building context</li>
                <li>Language that supports repeat work and coordination</li>
                <li>Clear distinction between urgent service and longer-term coverage</li>
              </ul>
            </article>
            <article className="premium-card">
              <p className="eyebrow">Decision support</p>
              <h3>Commercial buyers convert when the next step feels organized</h3>
              <p className="muted">
                Property teams need confidence that the request will be handled
                seriously, documented properly, and routed without homeowner-style
                ambiguity.
              </p>
            </article>
          </div>
        </section>
      );
    case "provider":
      return (
        <section className="premium-module premium-module--provider">
          <article className="panel premium-module__lead">
            <p className="eyebrow">Territory and opportunity</p>
            <h2>Recruiting pages convert better when the opportunity feels selective and practical</h2>
            <div className="premium-gallery-grid">
              <article className="premium-gallery-card">
                <strong>Service area</strong>
                <span>Where you actually want work to come from</span>
              </article>
              <article className="premium-gallery-card">
                <strong>Issue fit</strong>
                <span>The types of jobs you want more of and the ones you do not</span>
              </article>
              <article className="premium-gallery-card">
                <strong>Readiness</strong>
                <span>Emergency windows, response pace, and dispatch practicality</span>
              </article>
            </div>
          </article>
          <div className="premium-split">
            <article className="premium-card">
              <p className="eyebrow">Qualification standards</p>
              <h3>Who this is strongest for</h3>
              <ul className="check-list">
                <li>Providers with clear territory and service radius</li>
                <li>Teams with real capacity and reliable response windows</li>
                <li>Operators who want fit and quality over random volume</li>
              </ul>
            </article>
            <article className="premium-card">
              <p className="eyebrow">Recruiting proof</p>
              <h3>Why a serious provider would keep going</h3>
              <p className="muted">
                This page now makes the opportunity feel more selective and
                operationally relevant instead of sounding like a generic public-listing
                pitch.
              </p>
            </article>
          </div>
        </section>
      );
    case "local":
      return (
        <section className="premium-module premium-module--local">
          <article className="panel premium-module__lead">
            <p className="eyebrow">Local confidence</p>
            <h2>Local visitors convert when the page proves it belongs to their search</h2>
            <div className="premium-metric-grid">
              <article className="premium-metric-card">
                <strong>ZIP-first</strong>
                <span>Keep the area visible early</span>
                <p className="muted">
                  Area relevance should be obvious before the visitor wonders whether the page is actually local.
                </p>
              </article>
              <article className="premium-metric-card">
                <strong>Intent split</strong>
                <span>Urgent and planned paths stay separate</span>
                <p className="muted">
                  Local traffic includes both solve-now visitors and comparison shoppers, and both need clear lanes.
                </p>
              </article>
              <article className="premium-metric-card">
                <strong>Search trust</strong>
                <span>Specific beats generic</span>
                <p className="muted">
                  The page should feel like a service destination, not a placeholder on the way to another form.
                </p>
              </article>
            </div>
          </article>
          <div className="premium-split">
            <article className="premium-card">
              <p className="eyebrow">Area-specific cues</p>
              <h3>What should feel local immediately</h3>
              <ul className="check-list">
                <li>ZIP or area reference in the hero</li>
                <li>Relevant next-step choices for urgent and planned demand</li>
                <li>Language that feels nearby instead of nationwide and vague</li>
              </ul>
            </article>
            <article className="premium-card">
              <p className="eyebrow">Why this matters</p>
              <h3>Local search visitors decide quickly whether to stay</h3>
              <p className="muted">
                Strong local pages reassure the visitor that this is a relevant, useful place to act right now, not just another generic listing.
              </p>
            </article>
          </div>
        </section>
      );
    default:
      return null;
  }
}

function renderPremiumProofMosaic(entry: PlumbingEntrypointDefinition) {
  switch (entry.kind) {
    case "emergency":
      return (
        <section className="premium-proof-mosaic premium-proof-mosaic--emergency">
          <article className="premium-proof-card premium-proof-card--wide">
            <p className="eyebrow">Five-star emergency experience</p>
            <h2>People under stress trust pages that feel calm, local, and obvious</h2>
            <p className="muted">
              The strongest emergency pages do not overload. They reassure, triage, and
              keep the best next move visible at every moment.
            </p>
          </article>
          <article className="premium-proof-card">
            <p className="eyebrow">Trust cue</p>
            <h3>Clear next-step certainty</h3>
            <p className="muted">Tell the visitor what happens after the submit before they wonder whether this is just another dead-end form.</p>
          </article>
          <article className="premium-proof-card">
            <p className="eyebrow">Buyer behavior</p>
            <h3>Stress reduces patience</h3>
            <p className="muted">Urgent visitors scan, not read. The page should win in seconds, not paragraphs.</p>
          </article>
        </section>
      );
    case "estimate":
      return (
        <section className="premium-proof-mosaic premium-proof-mosaic--estimate">
          <article className="premium-proof-card premium-proof-card--wide">
            <p className="eyebrow">Five-star estimate experience</p>
            <h2>Estimate shoppers stay when the page feels helpful instead of pushy</h2>
            <p className="muted">
              The quote path should support evaluation, reduce uncertainty, and make the
              next step feel useful even before a buyer is fully decided.
            </p>
          </article>
          <article className="premium-proof-card">
            <p className="eyebrow">Trust cue</p>
            <h3>Realistic expectations</h3>
            <p className="muted">People trust a page more when it explains what the quote process actually needs instead of pretending every job is instant-ready.</p>
          </article>
          <article className="premium-proof-card">
            <p className="eyebrow">Buyer behavior</p>
            <h3>Comparison mode stays open</h3>
            <p className="muted">Planned-work visitors often compare before acting, so the page should support progress without false urgency.</p>
          </article>
        </section>
      );
    case "commercial":
      return (
        <section className="premium-proof-mosaic premium-proof-mosaic--commercial">
          <article className="premium-proof-card premium-proof-card--wide">
            <p className="eyebrow">Five-star commercial experience</p>
            <h2>Commercial buyers stay when the page feels organized and accountable</h2>
            <p className="muted">
              Property teams are looking for competence signals, not consumer-style
              persuasion. The page should feel like a capable front door to real service.
            </p>
          </article>
          <article className="premium-proof-card">
            <p className="eyebrow">Trust cue</p>
            <h3>Structured service language</h3>
            <p className="muted">The request path should respect buildings, facilities, and repeat-work context from the first screen.</p>
          </article>
          <article className="premium-proof-card">
            <p className="eyebrow">Buyer behavior</p>
            <h3>Risk drives the decision</h3>
            <p className="muted">Commercial visitors buy confidence that the next step will be handled correctly and seriously.</p>
          </article>
        </section>
      );
    case "provider":
      return (
        <section className="premium-proof-mosaic premium-proof-mosaic--provider">
          <article className="premium-proof-card premium-proof-card--wide">
            <p className="eyebrow">Five-star provider recruiting</p>
            <h2>Good plumbers respond when the page makes the opportunity feel selective</h2>
            <p className="muted">
              Better providers are not looking for generic lead volume. They want fit,
              territory clarity, and signs that quality matters.
            </p>
          </article>
          <article className="premium-proof-card">
            <p className="eyebrow">Trust cue</p>
            <h3>Territory and fit first</h3>
            <p className="muted">Lead with job fit, service area, and response standards instead of vague “join us” language.</p>
          </article>
          <article className="premium-proof-card">
            <p className="eyebrow">Provider behavior</p>
            <h3>Strong operators filter quickly</h3>
            <p className="muted">The page should help a serious provider decide fast whether this is a quality opportunity worth their time.</p>
          </article>
        </section>
      );
    case "local":
      return (
        <section className="premium-proof-mosaic premium-proof-mosaic--local">
          <article className="premium-proof-card premium-proof-card--wide">
            <p className="eyebrow">Five-star local experience</p>
            <h2>Local pages win when they feel nearby, useful, and easy to trust</h2>
            <p className="muted">
              The strongest local landing pages do not feel like SEO bait. They feel like a real service page that understands why the visitor searched in the first place.
            </p>
          </article>
          <article className="premium-proof-card">
            <p className="eyebrow">Trust cue</p>
            <h3>Specificity beats generic language</h3>
            <p className="muted">Show area relevance, service intent, and a real next step before the visitor bounces back to search results.</p>
          </article>
          <article className="premium-proof-card">
            <p className="eyebrow">Search behavior</p>
            <h3>People judge local fit in seconds</h3>
            <p className="muted">A local visitor wants to know whether the page feels close, relevant, and worth acting on right now.</p>
          </article>
        </section>
      );
    default:
      return null;
  }
}

function renderClosingSection(entry: PlumbingEntrypointDefinition) {
  if (entry.audience === "provider") {
    return (
      <section className="closing-band closing-band--provider">
        <article className="panel closing-lead">
          <p className="eyebrow">Before a provider applies</p>
          <h2>The opportunity should feel selective, practical, and worth the time</h2>
          <p className="muted">
            Strong provider pages do not oversell. They make the fit criteria visible and
            let serious teams decide quickly whether they want in.
          </p>
        </article>
        <div className="closing-checks">
          <article className="closing-card">
            <h3>Best for</h3>
            <p className="muted">
              Providers with real coverage, clear specialties, and genuine dispatch
              capacity.
            </p>
          </article>
          <article className="closing-card">
            <h3>Worth finishing when</h3>
            <p className="muted">
              You want better-fit local work rather than another public-listing profile
              that attracts low-intent noise.
            </p>
          </article>
        </div>
      </section>
    );
  }

  return (
    <section className="closing-band">
      <article className="panel closing-lead">
        <p className="eyebrow">What good plumbing pages do well</p>
        <h2>They reduce uncertainty before they ask for commitment</h2>
        <p className="muted">
          The strongest service pages do not just collect leads. They make the visitor
          feel like the next step is obvious, local, and worth taking.
        </p>
      </article>
      <div className="closing-checks">
        <article className="closing-card">
          <h3>Clear promise</h3>
          <p className="muted">
            What happens next should be visible before the first form field creates
            friction.
          </p>
        </article>
        <article className="closing-card">
          <h3>Safe fallback</h3>
          <p className="muted">
            If the job is unusual, the visitor should never feel trapped in the wrong
            path.
          </p>
        </article>
      </div>
    </section>
  );
}

export async function PlumbingEntryPage({
  entry,
  searchParams = {},
}: PlumbingEntryPageProps) {
  const niche = getNiche("plumbing");
  const headerStore = await headers();
  const runtimeConfig = await getOperationalRuntimeConfig();

  const profile = resolveExperienceProfile({
    family: entry.family,
    niche,
    audience: entry.audience,
    supportEmail: tenantConfig.supportEmail,
    source: asString(searchParams.source) ?? "manual",
    intent: entry.intent,
    returning: asBoolean(searchParams.returning),
    milestone: asString(searchParams.milestone),
    preferredMode: asString(searchParams.mode) ?? entry.preferredMode,
    score: Number(asString(searchParams.score) ?? (entry.audience === "provider" ? 55 : 80)),
    assignmentKey: headerStore.get(EXPERIENCE_ASSIGNMENT_HEADER) ?? undefined,
    userAgent: headerStore.get("user-agent") ?? undefined,
    referrer: headerStore.get("referer") ?? undefined,
    experimentPromotions: runtimeConfig.experiments.promotions,
  });

  const integrations = buildPlumbingIntegrationBundle(entry, tenantConfig.siteUrl);
  const showBlueprint =
    asBoolean(searchParams.blueprint) || asString(searchParams.view) === "blueprint";
  const metrics = buildPublicMetrics(entry);
  const railContent = getRailContent(entry);
  const railHighlights = getRailHighlights(entry);

  const splitLink =
    entry.audience === "provider"
      ? {
          href: "/get-plumbing-help",
          label: "Need plumbing help instead?",
          description:
            "Use the customer-side path for homeowners, tenants, and commercial buyers who need service.",
          cta: "Go to plumbing help",
        }
      : {
          href: "/join-provider-network",
          label: "Need the provider side instead?",
          description:
            "Use the provider path if you are a plumber or service company interested in joining the network.",
          cta: "Go to provider onboarding",
        };

  return (
    <ExperienceScaffold
      className={getExperiencePageClassName(entry)}
      eyebrow={entry.eyebrow}
      title={entry.title}
      summary={entry.summary}
      profile={profile}
      metrics={metrics}
      heroSignals={entry.heroHighlights}
      audienceLabel={entry.audienceLabel}
      commitmentNote={entry.commitmentNote}
      railEyebrow={railContent.eyebrow}
      railTitle={railContent.title}
      railSummary={railContent.summary}
      railHighlights={railHighlights}
      primaryActionLabel={entry.kind === "emergency" ? "Get emergency help now" : undefined}
      secondaryActionLabel={entry.kind === "provider" ? "Talk to network ops" : undefined}
    >
      {renderSignatureSection(entry)}

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">{entry.chipsLabel}</p>
          <h2>
            {entry.audience === "provider"
              ? "What serious providers should recognize quickly"
              : "What people usually need help with here"}
          </h2>
          <p className="muted">{entry.commitmentNote}</p>
          <div className="signal-pill-grid" aria-label={entry.chipsLabel}>
            {entry.chips.map((chip) => (
              <span key={chip} className="signal-pill">
                {chip}
              </span>
            ))}
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">Need something else?</p>
          <h2>{splitLink.label}</h2>
          <p className="muted">{splitLink.description}</p>
          <div className="cta-row">
            <Link href={splitLink.href} className="secondary">
              {splitLink.cta}
            </Link>
          </div>
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">Why people choose this path</p>
          <h2>
            {entry.audience === "provider"
              ? "Built for the way plumbing teams actually work"
              : "Built to feel clear and easy to act on"}
          </h2>
          <div className="value-card-grid">
            {entry.valueCards.map((card) => (
              <article key={card.title} className="value-card">
                <h3>{card.title}</h3>
                <p className="muted">{card.detail}</p>
              </article>
            ))}
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">{entry.pathLabel}</p>
          <h2>What happens after you start</h2>
          <ol className="step-list">
            {entry.pathSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">{entry.trustLabel}</p>
          <h2>
            {entry.audience === "provider"
              ? "Why this feels worth your time"
              : "Why people feel comfortable moving forward"}
          </h2>
          <ul className="check-list">
            {entry.trustSignals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </article>
        <article className="panel">
          <p className="eyebrow">Questions we hear a lot</p>
          <h2>
            {entry.audience === "provider"
              ? "Answers before you decide to apply"
              : "Answers before you decide to reach out"}
          </h2>
          <div className="faq-stack">
            {entry.faq.map((item) => (
              <article key={item.question} className="faq-card">
                <h3>{item.question}</h3>
                <p className="muted">{item.answer}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <p className="eyebrow">{entry.proofLabel}</p>
          <h2>
            {entry.audience === "provider"
              ? "Looking for the customer side instead?"
              : "Looking for a different kind of plumbing help?"}
          </h2>
          <div className="entry-link-grid">
            {entry.relatedLinks.map((link) => (
              <Link key={link.href} href={link.href} className="entry-link-card">
                <strong>{link.label}</strong>
                <span>{link.description}</span>
              </Link>
            ))}
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">What to expect</p>
          <h2>
            {entry.audience === "provider"
              ? "What this path is designed to make easier"
              : "What this page is designed to make easier"}
          </h2>
          <ul className="check-list">
            {entry.proofSignals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </article>
      </section>

      {renderPremiumModules(entry)}
      {renderPremiumProofMosaic(entry)}

      <AdaptiveLeadCaptureForm
        source="manual"
        family={profile.family}
        niche={niche.slug}
        service={entry.service}
        pagePath={entry.route}
        returning={asBoolean(searchParams.returning)}
        profile={profile}
      />

      {renderClosingSection(entry)}

      {showBlueprint ? (
        <section className="grid two">
          <article className="panel">
            <p className="eyebrow">Hosted deployment</p>
            <h2>Direct link for this entry point</h2>
            <p className="muted">
              Use this URL for buttons, ads, email, SMS, QR flows, directory listings,
              or a dedicated subdomain handoff.
            </p>
            <div className="code-card">
              <pre>
                <code>{integrations.hostedUrl}</code>
              </pre>
            </div>
          </article>
          <article className="panel">
            <p className="eyebrow">Embed deployment</p>
            <h2>Widget install code for client websites</h2>
            <p className="muted">
              This script launches the matching LeadOS widget for this exact entry path
              and service intent.
            </p>
            <div className="code-card">
              <pre>
                <code>{integrations.widgetScript}</code>
              </pre>
            </div>
          </article>
          <article className="panel">
            <p className="eyebrow">Iframe handoff</p>
            <h2>Embedded hosted-page fallback</h2>
            <p className="muted">
              Use this when a client wants the full hosted page embedded instead of the
              drawer widget.
            </p>
            <div className="code-card">
              <pre>
                <code>{integrations.iframeEmbed}</code>
              </pre>
            </div>
          </article>
          <article className="panel">
            <p className="eyebrow">Integration endpoints</p>
            <h2>Boot and manifest endpoints</h2>
            <ul className="check-list">
              <li>
                <strong>Widget boot</strong>:{" "}
                <span className="portal-breakable">{integrations.bootEndpoint}</span>
              </li>
              <li>
                <strong>Embed manifest</strong>:{" "}
                <span className="portal-breakable">{integrations.manifestEndpoint}</span>
              </li>
              <li>
                <strong>Launcher label</strong>: {integrations.launcherLabel}
              </li>
              <li>
                <strong>Deployment blueprint</strong>:{" "}
                <Link href="/deployments/plumbing" className="link-inline">
                  Open generator page
                </Link>
              </li>
            </ul>
          </article>
        </section>
      ) : null}
    </ExperienceScaffold>
  );
}
