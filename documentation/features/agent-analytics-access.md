# Agent Analytics Access

Last Modified: 2026-04-20

## Overview

Agents can read the same campaign performance data that the Studio Main Dashboard renders for humans — executive KPIs, per-channel summaries, daily trend, contribution breakdown, alerts, per-platform social analytics, and Stripe revenue — through a set of thin-wrapper actions that call the exact same backend services the dashboard UI uses.

Paired with a database-backed skill (`campaign-performance-reporting`) that teaches agents to ask the user for output format (inline summary / document / slide deck) before pulling data, then drill into deeper sources only when the question or the top-level response demands it.

## Goals

- Give agents 1:1 parity with what humans see on `/campaign/:id/dashboard`.
- Avoid duplicated aggregation logic — reuse `MainDashboardService`, `SocialInsightsService`, and the Stripe overview service that already back the UI.
- Keep agents from over-pulling (the skill enforces "main-dashboard first, drill down only when needed").
- Preserve least-privilege: analytics access is scoped to marketing, analyst, operations, and Vibey.

## Data flow

```
User in chat → Agent → campaign-performance-reporting skill triggers
  → Agent asks: "inline / document / presentation?"
  → Agent calls get_campaign_main_dashboard (first)
  → Optional drill-downs:
    - get_campaign_social_analytics (per platform)
    - get_campaign_stripe_overview
    - get_meta_ads_insights (campaign / adset / ad)
  → Agent renders per chosen format
    - inline: writes summary directly in chat
    - document: save_document with markdown body
    - presentation: create_presentation + add_presentation_slide per slide
```

Each analytics action is a thin wrapper that calls `target.mainApiCall('GET', '/api/...')` on apps/api, reusing the 60s response cache, RLS-enforced Supabase client, org scoping via `x-org-id`, and partial-failure handling that `MainDashboardService` already implements.

## Backend layer

### Actions

| Action                          | Backend endpoint                                                | Returns                                  |
| ------------------------------- | --------------------------------------------------------------- | ---------------------------------------- |
| `get_campaign_main_dashboard`   | `GET /api/campaigns/:id/main-dashboard`                         | `MainDashboardResponse`                  |
| `get_campaign_social_analytics` | `GET /api/campaigns/:id/social-analytics?platform=...`          | `SocialAnalyticsResponse` per platform   |
| `get_campaign_stripe_overview`  | `GET /api/integrations/stripe/analytics/campaign-overview`      | `CampaignStripeOverview`                 |
| `get_daily_report_data`         | Supabase RPCs + Meta insights (no HTTP wrapper)                 | Custom shape for last-N-hours snapshots  |
| `get_meta_ads_insights`         | `GET /api/integrations/meta/insights`                           | `MetaAdsInsightsResponse`                |

### Parameter schemas

Defined in `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`. Schema types support `required` keys, `optional` keys, and `types` constraints (`string`, `iso_date`, `boolean`, `number`, `platform`).

- `get_campaign_main_dashboard` — `campaign_id` (resolved from session if absent), optional `since`/`until` ISO-8601, optional `refresh: boolean`
- `get_campaign_social_analytics` — required `platform: 'instagram' | 'linkedin'`, plus same campaign/date params
- `get_campaign_stripe_overview` — accepts either `since`/`until` ISO-8601 or `from_unix`/`to_unix` epoch seconds

### Campaign ID resolution

All three wrappers delegate to `target.resolveCampaignId(supabase, input, userId, sessionKey)` — same pattern as `get_daily_report_data`. If no campaign is in the session and none is supplied in data, the handler returns `{ success: false, error: 'campaign_id required...' }`.

### Stripe not-connected handling

When Stripe isn't linked for the campaign, the underlying endpoint returns a structured payload. The wrapper re-shapes it to `{ success: false, connected: false, error: ... }` so the skill can teach agents to say "Stripe isn't connected, so I skipped revenue" instead of erroring out.

## RBAC

Managed in `artifact-capability.policy.ts`:

| Profile                          | Has analytics actions? |
| -------------------------------- | ---------------------- |
| `vibey_ceo`                      | yes (all four)         |
| `managed_domain` marketing       | yes                    |
| `managed_domain` analyst         | yes (primary owner)    |
| `managed_domain` operations      | yes                    |
| `managed_domain` developer       | no                     |
| `managed_domain` support         | no                     |
| `system_hr`                      | no                     |
| `system_brain` (Atlas)           | no                     |
| `system_builder` (Viktor)        | no                     |

Profiles without access escalate via `ask_agent` / `delegate_to_agent`.

## Skill layer

Skill row + 4 resource files in Supabase (`agent_skills` / `agent_skill_resources`):

- `campaign-performance-reporting` (main skill) — triggered by phrases like "how is my campaign doing", "weekly report", "ROAS", "engagement", "revenue"
  - `references/inline-template.md` — 100-150 word chat summary structure
  - `references/document-template.md` — 600-1200 word markdown doc structure for `save_document`
  - `references/presentation-template.md` — 8-12 slide plan for `create_presentation` + `add_presentation_slide`
  - `references/drill-down-guide.md` — decision table for when to call which secondary action

Skill is global (`agent_key='*'`, `user_id=NULL`, `org_id=NULL`, `source='system'`), so it loads for every agent on Agent API restart via `AgentSyncService.syncAll()`.

### Ask-first rule

The skill's first rule is: ask the user for format before calling any analytics action. Reason: pulling a full aggregated dashboard to produce a 50-word inline answer wastes tokens; skipping the deep pull when the user wants a deck forces a second round-trip. The skill uses `ask_clarification` with a single-choice question (inline / document / presentation). Skipped only when the user explicitly said the format in their request.

## Code Examples

### Agent calling the aggregated dashboard

```json
{
  "action": "get_campaign_main_dashboard",
  "label": "Loading your dashboard",
  "data": { "since": "2026-04-13T00:00:00Z" }
}
```

### Agent drilling into Instagram

```json
{
  "action": "get_campaign_social_analytics",
  "label": "Checking Instagram performance",
  "data": { "platform": "instagram" }
}
```

### Agent pulling revenue

```json
{
  "action": "get_campaign_stripe_overview",
  "label": "Pulling revenue",
  "data": { "since": "2026-03-20T00:00:00Z", "until": "2026-04-20T23:59:59Z" }
}
```

## Testing

- `artifact-action-schemas.test.ts` — 18 tests covering required-only schemas (legacy), type constraints (ISO date, boolean, number, platform), and all 3 new analytics entries
- `artifacts.service.rbac.integrations-media.test.ts` — 24 new cases for the analytics wrappers (4 allowed profiles × 3 actions + 4 denied profiles × 3 actions), plus backfill verification for `get_daily_report_data`
- `artifacts.service.dispatch.test.ts` — already iterates every `VALID_ACTIONS` entry and asserts a handler is registered (smoke-tests our 3 new registrations)

## Decision Log

- **2026-04-20** — Shipped `get_campaign_main_dashboard`, `get_campaign_social_analytics`, `get_campaign_stripe_overview` as thin HTTP wrappers (not direct Supabase RPC calls) to inherit `MainDashboardService`'s 60s cache and partial-failure handling. Alternative (direct RPCs) was rejected because it would duplicate aggregation logic and bypass the cache.
- **2026-04-20** — Stripe RBAC widened to everyone with analytics access (marketing + analyst + operations + Vibey), per user decision. Narrower scoping (analyst + ops only) was considered but rejected: marketing needs ROAS tied to revenue for campaign decisions.
- **2026-04-20** — Skill forces "ask format first" instead of always-inline or always-ask-after. Reasoning documented in the SKILL.md body: data shape is same, render is very different, wrong choice wastes tokens.
- **2026-04-20** — Backfilled `get_daily_report_data` into marketing/analyst/operations allowlists. Previously Vibey-only, which was a gap: any domain with campaign context needs the last-N-hours snapshot.

## Related

- `documentation/features/email-campaign-system.md` — email analytics powered by the same `get_campaign_email_analytics` RPC
- `.cursor/skills/claude-skills/SKILL.md` — skill loading protocol (DB-first)
- `.cursor/skills/context_eng/SKILL.md` — context-engineering principles used to write the reporting skill
