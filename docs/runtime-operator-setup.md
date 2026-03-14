# Runtime Operator Setup

LeadOS separates secret credentials from operator-editable runtime settings.

## What lives in runtime settings

- Trafft public booking URL
- Trafft default service ID
- LeadOS-to-Trafft service mappings
- Documentero template IDs and default format
- Crove fallback webhook and template IDs

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

## When discovery fails

- Operators can still save a manual default service ID.
- Operators can still add manual mapping rows.
- The settings page should still load even when tenant discovery is unavailable, as long as the dashboard session is valid.

## Related files

- `src/app/dashboard/settings/page.tsx`
- `src/components/RuntimeConfigForm.tsx`
- `src/lib/provider-discovery.ts`
- `src/lib/runtime-config.ts`
