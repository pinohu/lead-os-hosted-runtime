# Lead OS Hosted Runtime

Lead OS Hosted Runtime is the deployable subdomain app for WordPress and external websites.

It is intended to run on a dedicated lead subdomain such as:

- `leads.example.com`
- `go.example.com`

The hosted runtime owns:

- embeddable widget boot config
- lead intake
- routing and next-step recommendations
- hosted assessments and calculators
- shared tenant and niche manifests
- private operator dashboard access with magic-link auth and role-aware operator sessions
- operator views that hide internal verification traffic by default so dashboards reflect human activity first
- capacity-aware plumbing dispatch queues, provider scoring, and geo-cell revenue visibility

## Key docs

- [AGENTS.md](./AGENTS.md)
- [docs/runtime-operator-setup.md](./docs/runtime-operator-setup.md)
- [docs/n8n-starter-pack.md](./docs/n8n-starter-pack.md)
- [docs/three-visit-milestone-framework.md](./docs/three-visit-milestone-framework.md)

## Intended architecture

```text
WordPress site / external site
  -> loads lead-os-embed.js
  -> opens chat/form/assessment widget
  -> posts data to hosted runtime

Hosted runtime
  -> /api/widgets/boot
  -> /api/decision
  -> /api/intake
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
- `/api/widgets/boot`
- `/api/embed/manifest`

## WordPress pairing

Use the companion repo [lead-os-embed-widgets](https://github.com/pinohu/lead-os-embed-widgets) on the WordPress site.
