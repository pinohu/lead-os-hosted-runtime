# Lead OS Hosted Runtime

Lead OS Hosted Runtime is the deployable subdomain app for WordPress and external websites.

It is intended to run on a dedicated lead subdomain such as:

- `leads.example.com`
- `go.example.com`

The hosted runtime owns:

- embeddable widget boot config
- deployment generator APIs and blueprint pages
- lead intake
- routing and next-step recommendations
- hosted assessments and calculators
- shared tenant and niche manifests
- private operator dashboard access with magic-link auth and role-aware operator sessions
- operator views that hide internal verification traffic by default so dashboards reflect human activity first
- capacity-aware plumbing dispatch queues, provider scoring, and geo-cell revenue visibility
- distinct customer-side and provider-side marketplace entry points
- multi-ZIP marketplace assumptions for thousands of providers and customers
- exact-once execution queues for booking, documents, workflow, outbound follow-up, and hot-lead alerts
- observability dashboards for lead journeys, bird's-eye operations, alert delivery health, and rollout drift
- experiment winners that can be promoted into live public experience defaults without code changes

## Key docs

- [Lead Operating System architecture (canonical, umbrella repo)](https://github.com/pinohu/lead-os/blob/master/docs/LEAD_OPERATING_SYSTEM_ARCHITECTURE.md)
- [AGENTS.md](./AGENTS.md)
- [docs/runtime-operator-setup.md](./docs/runtime-operator-setup.md)
- [docs/plumbing-marketplace-scaling.md](./docs/plumbing-marketplace-scaling.md)
- [docs/marketplace-deployment-generator.md](./docs/marketplace-deployment-generator.md)
- [docs/n8n-starter-pack.md](./docs/n8n-starter-pack.md)
- [docs/three-visit-milestone-framework.md](./docs/three-visit-milestone-framework.md)

## Intended architecture

```text
WordPress site / external site
  -> loads lead-os-embed.js
  -> opens chat/form/assessment widget
  -> posts data to hosted runtime

Hosted runtime
  -> /api/embed/manifest
  -> /api/embed/generate
  -> /api/widgets/boot
  -> /api/decision
  -> /api/intake
  -> /deployments/plumbing
  -> /assess/[slug]
  -> /calculator
```

## Environment variables

- `NEXT_PUBLIC_BRAND_NAME`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPPORT_EMAIL`
- `LEAD_OS_WIDGET_ORIGINS`
- `LEAD_OS_DEFAULT_SERVICE`
- `LEAD_OS_DEFAULT_NICHE`
- `LEAD_OS_AUTH_SECRET`
- `LEAD_OS_OPERATOR_EMAILS`
- `LEAD_OS_OPERATOR_ROLES`

## Deploy target

This repo is designed for modern Next.js hosting and should sit behind a subdomain used exclusively for lead capture and funnel execution.

## Railway deployment

This repo is preconfigured for Railway with [`railway.json`](./railway.json).

Recommended flow:

1. Create a new Railway project from this GitHub repo
2. Set the root to the repository root
3. Add the environment variables from [`.env.example`](./.env.example)
4. Point your subdomain, such as `leads.audreysplace.place`, to Railway
5. Verify the runtime with:

- `/api/health`
- `/api/embed/generate?recipe=provider-homepage-emergency-widget&zip=19103`
- `/api/widgets/boot`
- `/api/embed/manifest`
- `/api/cron/observability` with `Authorization: Bearer <CRON_SECRET>`
- `/api/cron/deployments/verify` with `Authorization: Bearer <CRON_SECRET>`

## WordPress pairing

Use the companion repo [lead-os-embed-widgets](https://github.com/pinohu/lead-os-embed-widgets) on the WordPress site.
