# Tool Integration Blueprint

## Goal

Use the Tigertail tool list to make LeadOS world-class without turning it into a brittle pile of overlapping SaaS products.

LeadOS should remain the system of intelligence and control:

- demand capture and experience resolution
- routing and dispatch logic
- exact-once orchestration
- observability and alerting
- profitability and marketplace intelligence
- deployment and rollout control

Third-party tools should act as execution satellites.

## World-Class Standard

From the perspective of a service owner, the system must cover the full operating loop:

1. call or lead enters
2. job is booked or assessed
3. crew or tech is scheduled
4. estimate is produced consistently
5. work is dispatched and documented
6. invoice is issued
7. payment is collected
8. follow-up, repeat-service, and referral loops fire
9. attribution and profitability stay visible

If a tool does not materially improve one of those stages, it should not sit in the critical path.

## Selection Rules

Choose tools that do at least one of the following:

- strengthen call-to-cash closure
- strengthen dispatch, scheduling, or documentation
- strengthen attribution or profitability visibility
- strengthen customer retention or referral loops
- provide redundancy for a critical communication path

Avoid tools that:

- duplicate the same responsibility as another stronger tool
- add a second source of truth for customers, jobs, or money
- force LeadOS to depend on low-value middleware chains
- introduce operational ambiguity between "configured" and "truly live"

## Decision Matrix

### Must Integrate Now

These tools are part of the world-class core stack and should be deepened first.

| Tool | Status | LeadOS role | Why it stays |
| --- | --- | --- | --- |
| SuiteDash | Must integrate now | CRM, customer history, invoices, recurring billing, client/provider records | Best fit from the list for customer record, billing spine, portals, and account continuity |
| Trafft | Must integrate now | scheduling, booking, reminders, capacity surface | Strong fit for booking and calendar control already present in code |
| CallScaler | Must integrate now | call attribution, call tracking, phone conversion intelligence | Phone calls are cash in home services; this closes a major blind spot |
| Documentero | Must integrate now | proposals, agreements, onboarding packs, phase documents | Strong fit for estimate, approval, and documentation trust layer |
| Emailit | Must integrate now | transactional and lifecycle email | Already part of runtime; needed for sign-in, confirmations, follow-up |
| WbizTool | Must integrate now | WhatsApp confirmations, reminders, follow-up | High-value alternate channel for urgent and appointment-heavy flows |
| Easy Text Marketing or SMS-iT | Must integrate now | primary SMS with one fallback | SMS is too important to leave single-threaded; choose one primary and one fallback |
| Salespanel | Must integrate now | attribution, scoring, funnel identity stitching | Strongest fit for first-party funnel intelligence and source truth |
| Plerdy | Must integrate now | CRO, heatmaps, funnel friction analysis | Best fit for public funnel optimization and evidence-led iteration |

### Phase 2 Integrations

These strengthen the system after the core call-to-cash path is hardened.

| Tool | Status | LeadOS role | Why phase 2 |
| --- | --- | --- | --- |
| Partnero | Phase 2 | referral and affiliate engine | High value after retention and repeat loops are stable |
| Thoughtly | Phase 2 | AI voice agent, after-hours intake, callback flows | Powerful but should follow call attribution and core dispatch truth |
| Activepieces | Phase 2 | fallback automation layer | Valuable as backup automation, not as primary orchestration |
| HappierLeads | Phase 2 | identify B2B provider-acquisition visitors | Useful for provider acquisition, not core homeowner operations |
| AITable | Phase 2 / optional | operator-friendly reporting mirror | Helpful as a reporting plane, but Postgres should remain the real ledger |

### Defer

These are not bad tools, but they are not needed to make LeadOS world-class right now.

| Tool family | Status | Reason |
| --- | --- | --- |
| Boost.space, Albato, KonnectzIT, Easyflow, PROCESIO | Defer | Too many overlapping middleware layers create fragility |
| Agiled, Flowlu, Nifty | Defer | Overlap with CRM/project operations already better served by SuiteDash plus LeadOS |
| SparkReceipt | Defer | Useful for accounting hygiene, not core to service operations path |
| Novocall | Defer | Interesting for instant callback widgets, but CallScaler is higher-value first |
| Brilliant Directories | Defer | Better suited to directory-first businesses than LeadOS's orchestration-first model |

### Skip For Core Architecture

Do not build the system around these.

| Tool family | Status | Reason |
| --- | --- | --- |
| Robomotion RPA, RTILA, ElectroNeek | Skip for core | RPA belongs at the edges for legacy rescue, not in the primary operating path |
| Generic content, social, and SEO production tools from the CSV | Skip for core | Useful for marketing production, not for operating system architecture |

## Exact LeadOS Subsystem Mapping

### 1. Call-to-Cash Spine

Primary tools:

- CallScaler
- SuiteDash
- Trafft
- Documentero
- commerce provider layer already in LeadOS

LeadOS subsystems:

- `src/lib/intake.ts`
- `src/lib/dispatch-ops.ts`
- `src/lib/provider-portal.ts`
- `src/lib/execution-queue.ts`
- `src/lib/providers.ts`
- `src/lib/runtime-config.ts`

What each tool should own:

- CallScaler: call source, number tracking, recording metadata, call outcomes
- LeadOS: unify calls and web leads into one lead timeline and routing decision
- Trafft: booking slots, confirmations, appointment state
- Documentero: proposals, agreements, scope docs, approval docs
- SuiteDash: account record, invoice object, recurring billing state, payment-facing record

What LeadOS must still own natively:

- end-to-end job state machine
- cross-channel dedupe
- profitability ledger
- operator visibility
- provider scoring and marketplace routing

### 2. Dispatch and Scheduling

Primary tools:

- Trafft
- LeadOS runtime config and provider roster

LeadOS subsystems:

- `src/lib/runtime-config.ts`
- `src/lib/dashboard.ts`
- `src/lib/dispatch-ops.ts`
- `src/app/dashboard/providers/page.tsx`
- `src/app/dashboard/bookings/page.tsx`

Tool responsibilities:

- Trafft: schedule, slot lookup, service map, reminders, public booking flow
- LeadOS: match provider, issue fit, urgency, ZIP-cell liquidity, capacity, margin-aware routing

World-class requirement:

- LeadOS must continue to own the routing brain even if Trafft owns calendar mechanics.

### 3. CRM and Customer History

Primary tools:

- SuiteDash

LeadOS subsystems:

- `src/lib/suitedash.ts`
- `src/lib/intake.ts`
- `src/lib/runtime-schema.ts`
- `src/app/dashboard/leads/[leadKey]/page.tsx`

Tool responsibilities:

- SuiteDash: contact, company, account, invoice/customer record, recurring billing anchor
- LeadOS: event ledger, journey timeline, dispatch context, experiment attribution, profitability

World-class requirement:

- LeadOS should never lose visibility just because SuiteDash is the CRM system of record for contacts.

### 4. Documents, Pricing, and Approval

Primary tools:

- Documentero
- LeadOS internal pricing and service modeling

LeadOS subsystems:

- `src/lib/providers.ts`
- `src/lib/runtime-config.ts`
- `src/app/dashboard/settings/page.tsx`
- `src/components/DispatchActionPanel.tsx`

Tool responsibilities:

- Documentero: proposal PDFs, agreements, onboarding and remediation documents
- LeadOS: standardized service packages, price logic, approval state, document generation triggers

Important native gap:

- world-class still requires a stronger native flat-rate price book and scope-template layer inside LeadOS
- no third-party tool on the list fully replaces that

### 5. Messaging and Recovery

Primary tools:

- Emailit
- WbizTool
- one primary SMS provider plus one fallback
- Thoughtly later

LeadOS subsystems:

- `src/lib/execution-queue.ts`
- `src/lib/observability-notifications.ts`
- `src/lib/providers.ts`
- `src/app/dashboard/alerts/page.tsx`

Tool responsibilities:

- Emailit: email
- WbizTool: WhatsApp
- SMS provider: SMS reminders, recovery, appointment nudges
- Thoughtly: voice callbacks and after-hours qualification
- LeadOS: orchestration, fallback ordering, cooldowns, alerting, acknowledgement, retry truth

World-class requirement:

- channel truth must remain honest
- "prepared" cannot be allowed to masquerade as "sent"

### 6. Attribution and Conversion Intelligence

Primary tools:

- CallScaler
- Salespanel
- Plerdy

LeadOS subsystems:

- `src/app/api/public-events/route.ts`
- `src/components/PublicEndUserFunnelPage.tsx`
- `src/lib/operator-observability.ts`
- `src/app/dashboard/overview/page.tsx`

Tool responsibilities:

- CallScaler: call attribution and call source truth
- Salespanel: lead scoring, identity stitching, source behavior, campaign intelligence
- Plerdy: heatmaps, scroll depth, funnel friction, CRO evidence
- LeadOS: join all of that to booked jobs, completed jobs, payment, and margin

World-class requirement:

- no attribution layer is useful unless it ties all the way to collected money and contribution margin

### 7. Referral and Compounding Growth

Primary tools:

- Partnero

LeadOS subsystems:

- `src/lib/trust-assets.ts`
- future post-conversion automation layer

Tool responsibilities:

- Partnero: referral enrollment, referral links, reward logic, partner tracking
- LeadOS: decide when to trigger referral asks, who qualifies, and what outcome was produced

### 8. Backup Automation and Exception Handling

Primary tools:

- Activepieces

LeadOS subsystems:

- `src/lib/providers.ts`
- `src/lib/execution-queue.ts`
- `src/lib/runtime-schema.ts`

Tool responsibilities:

- Activepieces: backup automation for non-critical secondary flows
- LeadOS: primary orchestration, state, retries, observability

Rule:

- Activepieces should support LeadOS, never replace it.

## What Still Must Be Built Natively In LeadOS

No tool list fully solves these. They are required for true world-class status.

### Field Service Operating Layer

- flat-rate price book enforcement
- scope templates by vertical
- technician or crew mobile workflow
- photo-first field documentation UX
- on-site approval workflow
- tech-facing closeout workflow

### Revenue Integrity Layer

- invoice issued -> payment requested -> payment collected truth
- payment failure and collections recovery
- financing and split-payment support
- contribution-margin reporting by technician, provider, service, ZIP, and source

### Marketplace Intelligence Layer

- provider ranking by real economic performance
- ZIP-cell liquidity and recruitment pressure
- source-to-margin attribution
- dispatch decisions that optimize profitable fulfillment, not just successful fulfillment

### Retention Layer

- memberships, warranties, annual service, reinspection loops
- reminder cadence by vertical
- post-job review and referral automation
- callback prevention and recovery workflows

## Safe Implementation Order

### Wave 1: Make the spine undeniable

1. Deepen SuiteDash
   - account history
   - invoice sync
   - recurring billing and membership anchors
2. Deepen Trafft
   - complete webhook state sync
   - service map coverage
   - operator visibility into booking truth
3. Add CallScaler
   - dynamic number insertion
   - source-tracked calls
   - call events into lead journey
4. Harden communications
   - choose one primary SMS provider
   - keep the second as fallback
   - standardize channel health and failover

### Wave 2: Make revenue and trust visible

5. Deepen Documentero
   - estimate templates
   - approvals
   - commercial and remediation documents
6. Add Salespanel
   - behavioral scoring
   - source-level identity and conversion tracking
7. Add Plerdy
   - funnel diagnostics
   - heatmaps
   - CRO feedback loop

### Wave 3: Add compounding growth

8. Add Partnero
   - referral loops
   - partner channels
9. Add Thoughtly
   - after-hours coverage
   - missed-call recovery
   - voice-led qualification
10. Add HappierLeads
   - provider acquisition enrichment only

### Wave 4: Safety and scale

11. Add Activepieces
   - only as fallback or secondary orchestration
12. Add AITable if operators truly need a mirrored reporting canvas

## Integration Ownership Table

| Capability | Primary owner | Secondary owner | LeadOS role |
| --- | --- | --- | --- |
| Lead capture and routing | LeadOS | Salespanel | own |
| Call tracking and attribution | CallScaler | LeadOS | ingest and unify |
| Booking and schedule | Trafft | LeadOS | orchestrate and observe |
| CRM and customer history | SuiteDash | LeadOS | mirror critical state |
| Proposal and job docs | Documentero | LeadOS | trigger and track |
| Email | Emailit | LeadOS | orchestrate and audit |
| WhatsApp | WbizTool | LeadOS | orchestrate and audit |
| SMS | Easy Text Marketing or SMS-iT | fallback provider | orchestrate and audit |
| Referral engine | Partnero | LeadOS | trigger and measure |
| Funnel intelligence | Salespanel | Plerdy | unify with revenue |
| CRO diagnostics | Plerdy | LeadOS | feed experiments |
| Backup automations | Activepieces | LeadOS | exception handling only |
| Voice automation | Thoughtly | LeadOS | call recovery and qualification |

## Risks To Avoid

### 1. Too many orchestration layers

If LeadOS, n8n, Activepieces, and provider webhooks all become equal sources of truth, the system will rot.

Patch:

- LeadOS remains the state machine
- execution providers remain effectors
- fallback automations do not own customer or job truth

### 2. Too many records of the customer

If SuiteDash, Salespanel, CallScaler, and LeadOS all become co-equal CRMs, history becomes unreliable.

Patch:

- SuiteDash owns CRM records
- LeadOS owns operational truth and event truth
- Salespanel owns scoring and behavior
- CallScaler owns call attribution details

### 3. "Configured" being mistaken for "live"

This has already shown up in the codebase before.

Patch:

- every integration surface must preserve `prepared`, `degraded`, `live`, and `failed` truth
- operator dashboards should highlight gaps without pretending the system is fully live

### 4. Tool sprawl hiding native product gaps

SaaS layering can hide the fact that a real field-service operating layer still needs native product work.

Patch:

- continue building native:
  - price book logic
  - technician/crew workflow
  - payment closure
  - profitability intelligence

## Final Recommendation

To make LeadOS world-class with the Tigertail list:

- deepen `SuiteDash`
- deepen `Trafft`
- add `CallScaler`
- deepen `Documentero`
- keep `Emailit`
- keep `WbizTool`
- standardize one `primary SMS` provider and one fallback
- add `Salespanel`
- add `Plerdy`
- add `Partnero`
- add `Thoughtly` after the call spine is in place
- keep `Activepieces` as backup only
- use `HappierLeads` only for provider acquisition
- use `AITable` only if operator reporting truly benefits from a mirror

Everything else should be subordinate to one rule:

LeadOS is the operating system. The other tools are replaceable execution components.
