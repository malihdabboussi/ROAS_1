# Drill-down guide

The default entry point is `get_campaign_main_dashboard`. It answers most questions in one call. Drill deeper only when the user's question or the top-level response requires it.

## Decision table

| Signal from user or data                                       | Action                                                             |
|----------------------------------------------------------------|--------------------------------------------------------------------|
| User asks about overall performance / KPIs / alerts            | `get_campaign_main_dashboard` (stop here)                          |
| User mentions Instagram, LinkedIn, posts, reach, engagement    | `get_campaign_social_analytics` per named or connected platform    |
| `main_dashboard.partial.social === true`                       | `get_campaign_social_analytics` per `connected_platforms` entry    |
| User mentions revenue / Stripe / sales / net / refunds / ROAS  | `get_campaign_stripe_overview`                                     |
| Format is `document` or `presentation` and revenue is material | `get_campaign_stripe_overview`                                     |
| User asks about specific ad set or individual ad               | `get_meta_ads_insights` with `level: "adset"` or `"ad"`            |
| User asks "which ads are underperforming?"                     | `get_meta_ads_insights` with `level: "ad"` and sort by CTR/ROAS    |
| Last-N-hours snapshot ("how did we do today?")                 | `get_daily_report_data` with `hours`                               |

## Parallelizing calls

When two independent drill-downs are both needed, issue them in parallel rather than sequentially. Typical parallel pattern for a "full weekly report document":

1. `get_campaign_main_dashboard` (first, to know what needs drill-down)
2. Then in parallel:
   - `get_campaign_social_analytics` per connected platform
   - `get_campaign_stripe_overview`
   - `get_meta_ads_insights` at campaign level if ads section is material

## Handling missing / partial data

- `partial.funnels|emails|ads|social === true` → mention in the output "(partial — <source> was unavailable)". Don't fabricate missing numbers.
- `connected_platforms` is empty → social section becomes "No social platforms connected" rather than zeros.

## Handling not-connected data sources (bridge to integration-playbook)

When an analytics action returns `connected: false`, don't just skip the section. Hand off to the `integration-playbook` flow: call `initiate_integration_connect({ integration_id })` and tell the user in plain language that you've opened the authorization prompt. Wait for them to approve before retrying.

Decision table for not-connected states:

| Response shape                                                  | Do this                                                                 |
|-----------------------------------------------------------------|-------------------------------------------------------------------------|
| `get_campaign_social_analytics` → `connected: false` (narrow question about that platform) | `initiate_integration_connect({ integration_id: <platform> })`, tell user, wait |
| `get_campaign_social_analytics` → `connected: false` (broader report, user didn't name this platform specifically) | Note "X isn't connected — skipped". Offer to connect at the end of the report. |
| `get_campaign_stripe_overview` → `{ success: false, connected: false }` (broader report) | Skip Revenue section. Mention once: "Stripe isn't connected — revenue skipped." Offer connect at end. |
| `get_campaign_stripe_overview` → `{ success: false, connected: false }` (user asked specifically about revenue) | `initiate_integration_connect({ integration_id: 'stripe' })`, tell user, wait |
| User already declined connecting ("don't connect, just show me what you have") | For social + marketing/Vibey agents: try `use_integration({ service: 'scrapecreators', integration_action: 'instagram_profile', params: { handle } })` for public-view data. Flag clearly as public, not owner insights. |

Language rule: say "not connected" and "Settings > Integrations", never "OAuth", "token expired", "401", or similar internal terms.

## Date ranges

- Default to "last 30 days" if the user didn't specify — matches dashboard default.
- "This week" → `since` = 7 days ago, `until` = now.
- "Yesterday" → `since` = start of yesterday, `until` = end of yesterday.
- If the user says "compare to last week", pull two overlapping ranges and compute deltas yourself — the actions don't return WoW comparisons directly.

## When NOT to drill down

- User asked a single narrow question ("what's my conversion rate?") — just the main dashboard.
- Format is `inline` and the main dashboard already has the answer in the KPIs or a single alert.
- Rate limit / cost awareness: Meta and Stripe external calls aren't free. If main-dashboard already answered the question, stop.