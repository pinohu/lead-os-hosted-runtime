# Marketplace Deployment Generator

LeadOS now exposes a deployment-grade integration stack for the plumbing marketplace:

- `/api/embed/manifest`
- `/api/widgets/boot`
- `/api/embed/generate`
- `/api/embed/generate-bulk`
- `/api/embed/wordpress-plugin`
- `/api/deployments`
- `/deployments/plumbing`

## Endpoint roles

### `/api/embed/manifest`

Use this as the configuration catalog for:

- WordPress plugins
- agency deployment dashboards
- multi-site rollout tools
- embed code generators

It exposes:

- niche catalog
- entrypoint presets
- widget presets
- deployment patterns
- local SEO presets
- supported integration modes

### `/api/widgets/boot`

Use this as the live widget bootstrap endpoint.

It accepts query params for:

- `niche`
- `service`
- `entrypoint`
- `audience`
- `mode`
- `family`
- `zip`
- `city`
- `pageType`
- `launcherLabel`

It returns the resolved runtime payload for one deployed widget instance.

### `/api/embed/generate`

Use this as the deployment generator endpoint.

It accepts the same parameters as widget boot plus:

- `recipe`

It returns:

- hosted URL
- JavaScript widget snippet
- WordPress-ready HTML block
- iframe fallback
- preset-aware boot endpoint
- manifest endpoint
- resolved deployment pattern

### `/api/embed/generate-bulk`

Use this when rolling out many ZIP-aware deployments at once.

It accepts:

- `recipe`
- `city`
- `zips` as a comma-separated list
- `limit`

It returns a batch of generated deployment packages so an operator, script, or plugin can provision many localized landing pages in one request.

### `/api/embed/wordpress-plugin`

Use this when you want a ready-to-install WordPress deployment package instead of raw snippets.

It returns:
- generated plugin metadata
- a single-file PHP plugin
- a shortcode contract
- a direct download path for the generated plugin file

### `/api/deployments`

Use this as the rollout registry endpoint.

It supports:
- listing generated and live deployments
- registering a generated deployment against a real domain or page
- updating deployment status after QA, launch, pause, or retirement

### `/api/deployments/bulk`

Use this to register a rollout cohort in one request.

It supports:
- metro launch waves
- ZIP-cell SEO batches
- provider-site rollout batches
- consistent install type and status assignment across a cohort

Add `format=csv` when the output needs to be consumed by spreadsheets, rollout sheets, or external provisioning tools.

### `/deployments/plumbing`

Use this as the human-facing operator blueprint page for:

- reviewing deployment recipes
- copying the correct snippets
- generating ZIP-aware versions
- training operators and implementers

## Official deployment recipes

- `provider-homepage-emergency-widget`
- `zip-seo-page-urgent-widget`
- `estimate-page-widget`
- `commercial-service-page-widget`
- `provider-recruitment-widget`

## Recommended rollout model

1. Use `/api/embed/manifest` in the setup/configuration interface.
2. Use `/api/embed/generate` to create the exact deployment payload.
3. Use `/api/embed/generate-bulk` for ZIP-cell expansion and local SEO rollout batches.
4. Use `/api/widgets/boot` in the live browser widget.
5. Use hosted pages for ads, email, SMS, QR, and directory handoff.

## Scale assumptions

This system is designed for:

- thousands of ZIP-level demand pages
- thousands of provider websites
- separate demand and supply entry points
- centralized routing with decentralized public deployment
