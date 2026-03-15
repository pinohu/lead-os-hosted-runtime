# Marketplace Deployment Generator

LeadOS now exposes a deployment-grade integration stack for the plumbing marketplace:

- `/api/embed/manifest`
- `/api/widgets/boot`
- `/api/embed/generate`
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
3. Use `/api/widgets/boot` in the live browser widget.
4. Use hosted pages for ads, email, SMS, QR, and directory handoff.

## Scale assumptions

This system is designed for:

- thousands of ZIP-level demand pages
- thousands of provider websites
- separate demand and supply entry points
- centralized routing with decentralized public deployment
