# LeadOS n8n Starter Pack

This hosted runtime now ships with a curated n8n starter pack instead of a random pile of templates.

## Why these repos were useful

- `Zie619/n8n-workflows`
  - strongest large-scale workflow index
  - useful for webhook fan-out, Airtable, calendars, and alerting patterns
- `enescingoz/awesome-n8n-templates`
  - useful as a broad discovery source
  - not imported directly because the repo is too noisy and awkward to mirror on Windows
- `czlonkowski/n8n-mcp`
  - useful for MCP, validation, and workflow-safety ideas
  - reinforces using validation before touching production flows
- `n8n-io/self-hosted-ai-starter-kit`
  - useful for agent, local-AI, and RAG workflow structure
- `wassupjay/n8n-free-templates`
  - useful for compact single-purpose templates like cart recovery, booking reminders, and lead qualification
- `growchief/growchief`
  - useful conceptually for outreach sequencing and concurrency-aware expansion flows

## What was actually applied

LeadOS now exposes a curated manifest at:

- `/api/n8n/manifest`

And importable workflow JSON at:

- `/api/n8n/workflows/lead-intake-fanout`
- `/api/n8n/workflows/hot-lead-booking-rescue`
- `/api/n8n/workflows/checkout-recovery-ladder`
- `/api/n8n/workflows/referral-activation-loop`
- `/api/n8n/workflows/ai-lead-qualifier-rag`

## Workflow map

### Lead intake fan-out
- receives LeadOS events
- normalizes lead payloads
- fans out to CRM, ledger, and alerts

### Hot lead booking rescue
- escalates qualified leads into booking
- waits
- retries with a recovery pass

### Checkout recovery ladder
- models 1h / 24h / 48h recovery
- built for paid-offer or checkout flows

### Referral activation loop
- triggers after activation
- runs referral and review follow-up

### AI lead qualifier
- uses an LLM-style classification step
- posts routing guidance back into LeadOS

## Recommended usage

1. Import the JSON into n8n.
2. Replace placeholder URLs and credentials.
3. Point webhook paths to your real LeadOS event sources.
4. Validate workflows before activating them.
5. Test in development before production.
