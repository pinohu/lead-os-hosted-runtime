# LeadOS Hosted Runtime

## Fast Start

- Stack: Next.js App Router, React 19, TypeScript, Node test runner.
- Primary commands:
  - `cmd /c npm test`
  - `cmd /c npm run build`
  - `cmd /c npm run dev`

## Navigation

- `src/app`
  - Route handlers, dashboard pages, and hosted funnel routes.
- `src/components`
  - Client-side islands such as runtime settings and lead-capture forms.
- `src/lib`
  - Provider integrations, runtime config persistence, orchestration, and webhook logic.
- `tests`
  - Focused Node tests grouped by subsystem.
- `docs/runtime-operator-setup.md`
  - Operator-facing provider setup flow, including Trafft service discovery and mapping behavior.

## High-Value Files

- `src/app/dashboard/settings/page.tsx`
  - Server-side loader for provider discovery and operator settings.
- `src/components/RuntimeConfigForm.tsx`
  - Client-side runtime config editor for Trafft, Documentero, and Crove.
- `src/lib/provider-discovery.ts`
  - Trafft and Documentero discovery helpers used by the operator dashboard.
- `src/lib/runtime-config.ts`
  - Non-secret runtime config schema and persistence helpers.
- `src/lib/providers.ts`
  - Live provider execution path for bookings, documents, and follow-up actions.

## Gotchas

- Trafft service mappings are normalized to lower-case labels before persistence.
- Trafft service IDs can be numeric or string-like; store them as strings in runtime config.
- Secrets stay in environment variables. Runtime config is for non-secret operational values only.
- When touching provider or settings code, run both `cmd /c npm test` and `cmd /c npm run build`.
