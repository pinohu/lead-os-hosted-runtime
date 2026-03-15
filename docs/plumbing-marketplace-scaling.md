# Plumbing Marketplace Scaling

LeadOS is being configured as a two-sided plumbing marketplace that must support thousands of providers and customers across many ZIP-code cells.

## Core assumption

- Demand side: homeowners, tenants, property managers, and clients requesting plumbing help.
- Supply side: plumbers, plumbing companies, and field-service providers joining the network.
- Routing should be local and liquidity-aware, not a flat national rotation.

## Geography model

LeadOS should treat geography as an operating primitive:

- ZIP code
- city
- county
- state
- service radius
- emergency coverage window
- after-hours readiness

## Scale implications

- Provider records need to support overlapping ZIP coverage, specialties, capacity, and service windows.
- Dispatch should prefer local liquidity and fit, not static provider order.
- Dashboards should aggregate by ZIP cluster or geo-cell so operators can spot demand gaps and oversupply.
- Public entry points can eventually segment by ZIP, city, service type, and urgency.

## Product implications

- Demand-side and supply-side funnels must stay separate.
- Customer intake must capture urgency, location, and issue type quickly.
- Provider onboarding must capture license and trust signals, service areas, issue fit, and capacity.
- Dispatch recommendations should be shaped by provider availability, geography fit, and closed-loop quality.

## Build priorities this assumption creates

- ZIP-cell coverage indexing
- provider self-serve coverage and capacity editing
- claim / accept / decline workflows for providers
- geo-cell demand scoring
- ranking by response time, fill rate, completion rate, and revenue contribution
- search and caching patterns that can handle large provider volumes cleanly

## Non-goal

Do not treat LeadOS as a generic national directory with flat lead rotation. The operating model should behave like a local dispatch marketplace that scales cell by cell.
