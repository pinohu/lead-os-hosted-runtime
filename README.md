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

## Deploy target

This repo is designed for modern Next.js hosting and should sit behind a subdomain used exclusively for lead capture and funnel execution.
