# URL Reference

This document lists the main public, provider, operator, and API URLs in LeadOS along with their related parameters.

## Primary Public End-User Funnels

| Category | URL | Method | Audience | Path Params | Query Params | Body Params | Notes |
|---|---|---|---|---|---|---|---|
| Primary Public Funnel | `https://leados.yourdeputy.com/start` | `GET` | Service consumers | None | `source`, `mode` | None | Primary concise public hub |
| Primary Public Funnel | `https://leados.yourdeputy.com/start/plumbing/emergency` | `GET` | Service consumers | None | `source`, `mode` | None | Concise emergency funnel |
| Primary Public Funnel | `https://leados.yourdeputy.com/start/plumbing/estimate` | `GET` | Service consumers | None | `source`, `mode` | None | Concise estimate funnel |
| Primary Public Funnel | `https://leados.yourdeputy.com/start/plumbing/commercial` | `GET` | Commercial/service consumers | None | `source`, `mode` | None | Concise commercial funnel |
| Primary Public Funnel | `https://leados.yourdeputy.com/start/providers/join` | `GET` | Providers | None | `source`, `mode` | None | Concise provider acquisition funnel |
| Primary Public Funnel | `https://leados.yourdeputy.com/start/local/19103` | `GET` | Local service consumers | `zip` | `source`, `mode` | None | Concise ZIP-aware local funnel |

## Main Public Pages

| Category | URL | Method | Audience | Path Params | Query Params | Body Params | Notes |
|---|---|---|---|---|---|---|---|
| Main Public Page | `https://leados.yourdeputy.com/` | `GET` | Mixed public | None | `source`, `returning`, `milestone`, `mode`, `score`, `blueprint`, `view` | None | Legacy-rich homepage; now points toward `/start` |
| Main Public Page | `https://leados.yourdeputy.com/showroom/plumbing` | `GET` | Internal/public review | None | None | None | Live preview showroom |
| Main Public Page | `https://leados.yourdeputy.com/deployments/plumbing` | `GET` | Internal/deployers | None | `recipe`, `zip`, `city`, `zips` | None | Deployment blueprint/generator |
| Main Public Page | `https://leados.yourdeputy.com/resources/plumbing` | `GET` | Public/nurture | None | None | None | Trust asset resource hub |

## Legacy Public Pages Kept Intact

| Category | URL | Method | Audience | Path Params | Query Params | Body Params | Notes |
|---|---|---|---|---|---|---|---|
| Legacy Public Page | `https://leados.yourdeputy.com/get-plumbing-help` | `GET` | Service consumers | None | `source`, `returning`, `milestone`, `mode`, `score`, `blueprint`, `view` | None | Legacy help hub |
| Legacy Public Page | `https://leados.yourdeputy.com/plumbing/emergency` | `GET` | Service consumers | None | `source`, `returning`, `milestone`, `mode`, `score`, `blueprint`, `view` | None | Legacy emergency page |
| Legacy Public Page | `https://leados.yourdeputy.com/plumbing/estimate` | `GET` | Service consumers | None | `source`, `returning`, `milestone`, `mode`, `score`, `blueprint`, `view` | None | Legacy estimate page |
| Legacy Public Page | `https://leados.yourdeputy.com/plumbing/commercial` | `GET` | Commercial buyers | None | `source`, `returning`, `milestone`, `mode`, `score`, `blueprint`, `view` | None | Legacy commercial page |
| Legacy Public Page | `https://leados.yourdeputy.com/local/19103` | `GET` | Local service consumers | `zip` | `source`, `returning`, `milestone`, `mode`, `score`, `blueprint`, `view` | None | Legacy local page |
| Legacy Public Page | `https://leados.yourdeputy.com/join-provider-network` | `GET` | Providers | None | `source`, `returning`, `milestone`, `mode`, `score`, `blueprint`, `view` | None | Legacy provider page |

## Hosted Funnel / Runtime Public Routes

| Category | URL | Method | Audience | Path Params | Query Params | Body Params | Notes |
|---|---|---|---|---|---|---|---|
| Hosted Funnel | `https://leados.yourdeputy.com/assess/plumbing` | `GET` | Public | `slug` | `niche`, `family`, `mode`, `source`, `audience`, `service`, `intent` | None | Hosted assessment route |
| Hosted Funnel | `https://leados.yourdeputy.com/funnel/qualification?niche=plumbing` | `GET` | Public | `family` | `niche`, `mode`, `source`, `audience`, `service`, `intent` | None | Hosted funnel route by family |
| Hosted Funnel | `https://leados.yourdeputy.com/offers/plumbing` | `GET` | Public | `slug` | `niche`, `family`, `mode`, `source`, `audience`, `service`, `intent` | None | Hosted offer route |
| Hosted Funnel | `https://leados.yourdeputy.com/calculator?niche=plumbing` | `GET` | Public | None | `niche`, `family`, `mode`, `source`, `audience`, `service`, `intent` | None | Calculator-style route |

## Provider Operations

| Category | URL | Method | Audience | Path Params | Query Params | Body Params | Notes |
|---|---|---|---|---|---|---|---|
| Provider Operations | `https://leados.yourdeputy.com/provider-portal` | `GET` | Providers | None | None | None | Provider operations portal |
| Provider Operations | `https://leados.yourdeputy.com/provider-portal/auth/verify` | `GET` | Providers | None | `token` | None | Provider magic-link verification |

## Operator / Admin

| Category | URL | Method | Audience | Path Params | Query Params | Body Params | Notes |
|---|---|---|---|---|---|---|---|
| Operator/Admin | `https://leados.yourdeputy.com/auth/sign-in` | `GET` | Operators | None | `error`, `next` | None | Operator sign-in |
| Operator/Admin | `https://leados.yourdeputy.com/auth/check-email` | `GET` | Operators | None | `email`, `next`, `delivery`, `reason` | None | Operator check-email page |
| Operator/Admin | `https://leados.yourdeputy.com/dashboard` | `GET` | Operators | None | queue/filter context params | None | Main dispatch desk |
| Operator/Admin | `https://leados.yourdeputy.com/dashboard/overview` | `GET` | Operators | None | None | None | Bird’s-eye system view |
| Operator/Admin | `https://leados.yourdeputy.com/dashboard/growth` | `GET` | Operators | None | None | None | Growth operations control surface |
| Operator/Admin | `https://leados.yourdeputy.com/dashboard/alerts` | `GET` | Operators | None | None | None | Alert operations |
| Operator/Admin | `https://leados.yourdeputy.com/dashboard/bookings` | `GET` | Operators | None | queue/filter params | None | Booking queue |
| Operator/Admin | `https://leados.yourdeputy.com/dashboard/documents` | `GET` | Operators | None | queue/filter params | None | Document queue |
| Operator/Admin | `https://leados.yourdeputy.com/dashboard/execution` | `GET` | Operators | None | queue/filter params | None | Execution queue |
| Operator/Admin | `https://leados.yourdeputy.com/dashboard/experiments` | `GET` | Operators | None | None | None | Experiment reporting/promotion |
| Operator/Admin | `https://leados.yourdeputy.com/dashboard/providers` | `GET` | Operators | None | filter params | None | Provider health |
| Operator/Admin | `https://leados.yourdeputy.com/dashboard/deployments` | `GET` | Operators | None | filter params | None | Deployment registry |
| Operator/Admin | `https://leados.yourdeputy.com/dashboard/workflows` | `GET` | Operators | None | queue/filter params | None | Workflow run history |
| Operator/Admin | `https://leados.yourdeputy.com/dashboard/settings` | `GET` | Operators | None | None | None | Runtime settings |
| Operator/Admin | `https://leados.yourdeputy.com/dashboard/manual` | `GET` | Operators | None | None | None | SOP center |
| Operator/Admin | `https://leados.yourdeputy.com/dashboard/leads/<leadKey>` | `GET` | Operators | `leadKey` | None | None | Lead journey detail |

## Public API / Integration Routes

| Category | URL | Method | Audience | Path Params | Query Params | Body Params | Notes |
|---|---|---|---|---|---|---|---|
| Public API | `https://leados.yourdeputy.com/api/health` | `GET` | Public/API | None | None | None | Runtime health |
| Public API | `https://leados.yourdeputy.com/api/decision` | `POST` | Public/API | None | None | decision payload | Decision engine |
| Public API | `https://leados.yourdeputy.com/api/intake` | `POST` | Public/API | None | None | intake payload | Public lead submission |
| Public API | `https://leados.yourdeputy.com/api/public-events` | `POST` | Public/API | None | None | event payload | Public funnel event capture |
| Public API | `https://leados.yourdeputy.com/api/widgets/boot` | `GET` | Public/API | None | `niche`, `service`, `entrypoint`, `audience`, `mode`, `family`, `zip`, `city`, `pageType`, `launcherLabel` | None | Widget bootstrap |
| Public API | `https://leados.yourdeputy.com/api/embed/manifest` | `GET` | Public/API | None | None | None | Integration/deployment catalog |
| Public API | `https://leados.yourdeputy.com/api/embed/generate` | `GET` | Public/API | None | `recipe`, `niche`, `service`, `entrypoint`, `audience`, `mode`, `family`, `zip`, `city`, `pageType`, `launcherLabel` | None | Single deployment generator |
| Public API | `https://leados.yourdeputy.com/api/embed/generate-bulk` | `GET` | Public/API | None | `format`, `recipe`, `niche`, `service`, `entrypoint`, `audience`, `mode`, `family`, `city`, `pageType`, `launcherLabel`, `zips`, `limit` | None | Bulk deployment generator |
| Public API | `https://leados.yourdeputy.com/api/embed/wordpress-plugin` | `GET` | Public/API | None | `recipe`, `niche`, `service`, `entrypoint`, `audience`, `mode`, `family`, `zip`, `city`, `pageType`, `launcherLabel`, `download` | None | WordPress plugin generator/download |
| Public API | `https://leados.yourdeputy.com/embed/lead-os-embed.js` | `GET` | Public/API | None | None | None | Embed script |

## Auth / Verification Routes

| Category | URL | Method | Audience | Path Params | Query Params | Body Params | Notes |
|---|---|---|---|---|---|---|---|
| Auth/Verification | `https://leados.yourdeputy.com/auth/verify` | `GET` | Operators | None | `token`, `next` | None | Operator magic-link verification |
| Auth/Verification | `https://leados.yourdeputy.com/api/auth/request-link` | `POST` | Operators | None | None | `email`, `next` | Sends operator magic link |

## Deployment / Ops APIs

| Category | URL | Method | Audience | Path Params | Query Params | Body Params | Notes |
|---|---|---|---|---|---|---|---|
| Ops API | `https://leados.yourdeputy.com/api/deployments` | `GET` | Operators/API | None | `status`, `pageType`, `audience` | None | Deployment registry listing |
| Ops API | `https://leados.yourdeputy.com/api/deployments` | `POST` | Operators/API | None | None | deployment payload | Create/update deployment entry |
| Ops API | `https://leados.yourdeputy.com/api/deployments/bulk` | `POST` | Operators/API | None | None | bulk deployment payload | Bulk cohort registration |
| Ops API | `https://leados.yourdeputy.com/api/dashboard` | `GET` | Operators/API | None | `include` | None | Dashboard snapshot; `include=system` supported |
| Ops API | `https://leados.yourdeputy.com/api/cron/execution` | `GET` | Operators/API | None | `limit` | None | Execution queue drain |
| Ops API | `https://leados.yourdeputy.com/api/cron/dispatch` | `GET` | Operators/API | None | None | None | Dispatch cron |
| Ops API | `https://leados.yourdeputy.com/api/cron/observability` | `GET` | Operators/API | None | None | None | Alert/rule evaluation |
| Ops API | `https://leados.yourdeputy.com/api/cron/deployments/verify` | `GET` | Operators/API | None | None | None | Deployment verification/drift checks |

## Common Parameter Meanings

| Parameter | Type | Used On | Meaning |
|---|---|---|---|
| `zip` | path/query | local pages, widget boot, generators | ZIP code for local targeting |
| `city` | query | deployment/generator/widget routes | City context for local deployment packages |
| `recipe` | query | deployment blueprint, generate, generate-bulk, wordpress-plugin | Deployment recipe/pattern ID |
| `source` | query/body | public pages, start pages, intake/events | Traffic/source label |
| `mode` | query | public pages, start pages, widget boot, generators | Experience mode like `booking-first` or `form-first` |
| `family` | query | hosted funnel routes, widget boot, generators | Funnel family such as `qualification`, `lead-magnet`, `chat` |
| `service` | query/body | widget/generators/intake | Service intent like `emergency-plumbing`, `plumbing-estimate` |
| `audience` | query/body | widget/generators/hosted routes | `client` or `provider` |
| `entrypoint` | query | widget/generators | Specific entrypoint preset |
| `pageType` | query | widget/generators/deployments | Page placement/context type |
| `launcherLabel` | query | widget/generators | Override widget button label |
| `blueprint` | query | legacy public pages | Shows operator/deployment blueprint view |
| `view` | query | legacy public pages | Supports alternate blueprint rendering when set to `blueprint` |
| `returning` | query | legacy public pages | Biases experience toward returning visitor state |
| `milestone` | query | legacy public pages | Visitor milestone context |
| `score` | query | legacy public pages | Manually influences profile resolution |
| `format` | query | bulk generate | `json` or export format like `csv` |
| `zips` | query | bulk generate, blueprint | Comma-separated ZIP list |
| `limit` | query | bulk generate, cron execution | Limits results or tasks processed |
| `token` | query | verify routes | Magic-link token |
| `next` | query/body | auth routes | Safe internal redirect target after auth |
| `error` | query | sign-in/check-email | Error message or code |
| `delivery` | query | check-email | Delivery status, e.g. failed |
| `reason` | query | check-email | Provider/detail reason for delivery failure |
