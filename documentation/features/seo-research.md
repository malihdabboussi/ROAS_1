# SEO Research

Last Modified: 2026-06-15

SEO Research is a platform-managed internal capability backed by DataForSEO. Users do not connect an external account; Vibey owns the provider credentials and agents call the capability through `use_integration`.

## Actions

| Action | Agent-facing use | Backend route | DataForSEO endpoint |
| --- | --- | --- | --- |
| `keyword_overview` | Keyword overview metrics | `/api/integrations/dataforseo/keyword/overview` | `/v3/dataforseo_labs/google/keyword_overview/live` |
| `keyword_ideas` | Related keyword ideas | `/api/integrations/dataforseo/keyword/ideas` | `/v3/dataforseo_labs/google/keyword_ideas/live` |
| `google_serp` | Google organic SERP research | `/api/integrations/dataforseo/serp/google/organic` | `/v3/serp/google/organic/live/advanced` |
| `competitors_domain` | Organic domain competitors | `/api/integrations/dataforseo/competitors/domain` | `/v3/dataforseo_labs/google/competitors_domain/live` |
| `backlinks_summary` | Backlink summary metrics | `/api/integrations/dataforseo/backlinks/summary` | `/v3/backlinks/summary/live` |

## Data Flow

1. The agent loads the DB-backed `seo-research` skill when the request is about keyword research, SERP analysis, organic competitors, backlinks, content gaps, or ranking opportunities.
2. The agent discovers SEO Research capabilities from `integration_capabilities`.
3. The agent calls `use_integration` with service `seo_research` or `dataforseo`.
4. Agent API canonicalizes aliases to internal integration id `dataforseo`.
5. Legacy route config forwards POST params as the API request body.
6. The API controller validates the body, wraps it as a one-task DataForSEO task array, and sends Basic-auth POST requests using `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD`.
7. The controller checks both HTTP status and DataForSEO `status_code`, then returns the provider response.

## Billing

Successful calls extract DataForSEO USD `cost` from the response. The API passes that cost to `CreditsService.processDirectTextUsage` as `preComputedCost` with `modelName: dataforseo/<action>`.

The billing service owns the margin calculation, so SEO Research does not manually double costs.

## Agent Access

Allowed:

- Vibey
- Managed marketing-domain agents
- Managed analyst-domain agents

Skill seeding:

- `skill_library.skill_key = seo-research` holds the canonical skill.
- `skill_library_resources` holds `references/actions.md`.
- Future marketing and analyst domain hires receive the skill through `DOMAIN_LIBRARY_SKILLS`.
- Future `analyst`, `performance_analyst`, `copywriter`, `designer`, `brand_manager`, and `media_producer` template hires receive the skill through `template_skill_assignments`.
- Existing marketing/analyst agents are backfilled with missing `agent_skills` copies during the seed migration.

Blocked:

- HR
- Operations-domain agents
- Developer-domain agents
- Other managed domains unless explicitly routed through an allowed teammate

## Decision Log

- 2026-06-15: V1 uses only live/research endpoints. OnPage crawl is excluded because it needs async crawl lifecycle, polling, storage, and stronger budget controls.
- 2026-06-15: User-facing and agent-facing name is SEO Research. Internal provider id remains `dataforseo`.
- 2026-06-15: Billing uses DataForSEO response cost with the existing central margin path.
- 2026-06-15: Added `seo-research` as the DB-backed agent skill for Vibey, marketing agents, and analyst agents.
