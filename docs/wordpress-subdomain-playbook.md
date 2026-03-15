# WordPress Subdomain Playbook

## Recommended architecture

- Main marketing site on WordPress/shared hosting
- Lead OS Hosted Runtime on a dedicated subdomain app host
- Embed script or plugin injected into WordPress pages

## Suggested domain split

- `www.example.com` -> WordPress
- `leads.example.com` -> Lead OS Hosted Runtime

## WordPress integration modes

1. Site-wide widget
   - add the embed script to the footer
   - use `/api/embed/manifest` to discover official presets
   - use `/api/embed/generate` to produce the exact widget snippet for the page type

2. Specific CTA handoff
   - link buttons to:
     - `/plumbing/emergency`
     - `/plumbing/estimate`
     - `/plumbing/commercial`
     - `/join-provider-network`

3. Hybrid mode
   - embed chat/form widget on WordPress
   - host long-form funnels on the subdomain

## Recommended production workflow

1. Choose the page type:
   - provider homepage
   - ZIP SEO page
   - estimate page
   - commercial page
   - provider recruiting page
2. Fetch `/api/embed/manifest` to render the available presets and recommended deployment patterns.
3. Call `/api/embed/generate` with the chosen recipe, ZIP, and audience to generate:
   - hosted URL
   - JavaScript widget snippet
   - iframe fallback
   - WordPress HTML block
4. If you want a packaged installation path instead of manual snippet placement, call `/api/embed/wordpress-plugin`.
5. Install the generated plugin and place the `[leados_embed]` shortcode where the widget should appear.
6. Keep long-form or higher-trust paths hosted on the LeadOS subdomain.
