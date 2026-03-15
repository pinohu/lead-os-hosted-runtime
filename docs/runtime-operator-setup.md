# Runtime Operator Setup

LeadOS separates secret credentials from operator-editable runtime settings.

## Operator access

- Approved operators sign in from `/auth/sign-in`.
- The primary path is a magic link delivered to the approved operator email.
- If mail delivery fails, LeadOS does not create a fallback operator session. Auth stays strict.
- Operator roles are resolved from `LEAD_OS_OPERATOR_ROLES` when provided.
- If roles are not configured yet, LeadOS assigns the first approved operator as `admin` and the remaining approved operators as `operator`.
- `analyst` sessions can review dashboards but cannot mutate dispatch state.
- The main dashboard and execution queues hide internal verification traffic by default; append `?include=system` if you need to inspect smoke-check or webhook-validation activity.

## What lives in runtime settings

- Trafft public booking URL
- Trafft default service ID
- LeadOS-to-Trafft service mappings
- Plumbing dispatch roster with capacity, issue fit, and coverage metadata
- Documentero template IDs and default format
- Crove fallback webhook and template IDs

## Deployment generator workflow

LeadOS now supports a deployment-grade integration workflow for marketplace rollout:

1. Use `/api/embed/manifest` to discover the official entrypoint presets, widget presets, and deployment patterns.
2. Use `/api/embed/generate` to generate the exact hosted URL, widget snippet, iframe fallback, and WordPress-ready HTML block for a page deployment.
3. Use `/api/widgets/boot` as the live runtime bootstrap that the embedded widget consumes in the browser.
4. Use `/deployments/plumbing` as the operator-facing blueprint page for reviewing recipes and copying snippets.

This is the intended path for:

- provider homepages
- ZIP SEO pages
- estimate pages
- commercial plumbing pages
- provider recruiting pages

## Trafft discovery flow

The settings dashboard uses `src/lib/provider-discovery.ts` to load Trafft metadata before rendering the client form.

Discovery order:

1. Try authenticated admin API service endpoints when Trafft API URL and auth credentials are present.
2. Fall back to public-origin service endpoints derived from the saved or env-backed booking URL.
3. Normalize results into operator-friendly cards with service ID, duration, price, capacity, and source.

## Mapping behavior

- The default service ID is the fallback when LeadOS does not find a service-specific mapping.
- Service-specific mappings are keyed by the normalized LeadOS service label.
- Mapping labels are stored lower-case, so `"Legal Strategy Call"` and `"legal strategy call"` resolve to the same key.
- Dispatch roster providers are normalized into lower-case coverage lists so geo and issue matching stays deterministic.
- Dispatch dashboards now expose geo-cell demand and completed-revenue hotspots from that roster plus closed-loop plumbing outcomes.

## Marketplace scale assumptions

LeadOS should be operated as a two-sided marketplace:

- Demand side: homeowners, tenants, property managers, and clients requesting plumbing help.
- Supply side: plumbers, plumbing companies, and field-service providers joining the network.

Assume the live system will need to support thousands of providers and customers across many ZIP codes, overlapping service areas, and different emergency coverage windows. Runtime settings, dispatch rosters, provider scoring, and operator queues should be maintained with that scale and locality in mind.

## When discovery fails

- Operators can still save a manual default service ID.
- Operators can still add manual mapping rows.
- The settings page should still load even when tenant discovery is unavailable, as long as the dashboard session is valid.

## Related files

- `src/app/dashboard/settings/page.tsx`
- `src/components/RuntimeConfigForm.tsx`
- `src/lib/provider-discovery.ts`
- `src/lib/runtime-config.ts`
