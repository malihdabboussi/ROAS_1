-- Seed SEO Research as the DB-first agent skill for DataForSEO-backed research.
insert into public.skill_library (
  skill_key,
  name,
  description,
  markdown_content,
  category,
  updated_at
)
values (
  'seo-research',
  'SEO Research',
  'Research search demand, keyword opportunities, Google SERPs, organic competitors, and backlink authority with SEO Research. Use when the user asks for SEO strategy, keyword research, SERP analysis, content gaps, domain competitors, backlink summaries, ranking opportunities, or what to write for organic search.',
  $skillbody$# SEO Research - Search Demand Intelligence

Turn a market, product, competitor, or content idea into search demand evidence: keywords, SERP competitors, ranking patterns, and backlink authority.

## Why seo_research, not web search

Web search shows pages. SEO Research shows the search market behind those pages: keyword demand, live Google organic results, competing domains, and backlink strength. Use web search for general facts, news, and source reading. Use `seo_research` when the user needs to decide what to rank for, what content to create, or which competitors own organic demand.

`seo_research` is platform-managed - always available to allowed agents, with no OAuth or connection step. Call actions like this:

```
use_integration -> {
  "service": "seo_research",
  "integration_action": "google_serp",
  "params": {
    "keyword": "ai landing page builder",
    "location_code": 2840,
    "language_code": "en"
  }
}
```

The full action catalog lives in `references/actions.md`. Read it when you need exact params or when choosing between keyword, SERP, competitor, and backlink actions.

## Step 1 - Start with intent

Name the search intent before calling tools. This keeps the research small and useful.

| Intent | Start with | Why |
|---|---|---|
| "What should we write about?" | `keyword_ideas` | Expands seed terms into adjacent demand |
| "Is this keyword worth targeting?" | `keyword_overview` | Checks metrics for known keywords |
| "Who ranks and what format wins?" | `google_serp` | Shows live organic competitors and page types |
| "Who competes with this domain?" | `competitors_domain` | Finds domains sharing organic keyword space |
| "How strong is this site?" | `backlinks_summary` | Checks backlink authority signals |

Default locale for US-facing research: `location_code: 2840`, `language_code: "en"`. Change location/language when the user names a market.

## Step 2 - Use the fewest paid calls that answer the question

SEO Research calls are paid from provider response cost. Keep the sample focused:

1. Use `keyword_ideas` on 1-3 seed phrases, not a broad topic dump.
2. Shortlist promising keywords by relevance before calling `keyword_overview`.
3. Run `google_serp` only for the top 3-5 keywords that could shape content strategy.
4. Use `competitors_domain` for the main domain or one clear competitor.
5. Use `backlinks_summary` on shortlisted domains where authority affects the recommendation.

If the user asks for a broad audit, say which sample you are starting with and expand only when the first pass shows a useful direction.

## Step 3 - Read the SERP like a strategist

For each target keyword, classify what Google rewards:

- Page type: landing page, listicle, comparison, guide, product page, tool, forum, video, local result.
- Search intent: informational, commercial, transactional, navigational.
- Competitive bar: brand strength, domain authority, backlink profile, content depth, freshness.
- Opportunity: missing angle, underserved segment, weak pages ranking, freshness gap, poor examples, thin comparison.

Do not recommend a content asset until the SERP pattern supports it. A keyword with volume is not useful if the ranking format does not match what the user can credibly publish.

## Deliverable

Use a table when comparing keywords or competitors:

| Keyword | Intent | SERP pattern | Competitive bar | Opportunity | Recommended asset |
|---|---|---|---|---|---|

Follow with the 2-3 strategic patterns that matter and the next actions: content brief, landing page, comparison page, refresh, backlink target, or skip.

## Examples

**"Find SEO opportunities for our AI funnel builder"**

1. `keyword_ideas` with seeds: "ai funnel builder", "landing page ai", "sales funnel software".
2. `keyword_overview` for the most relevant ideas.
3. `google_serp` for the top 3 opportunities.
4. Return a prioritized keyword table plus recommended page types.

**"Why is competitor.com beating us?"**

1. `competitors_domain` for the user's domain and the competitor if both are known.
2. `google_serp` for 3 shared commercial keywords.
3. `backlinks_summary` for both domains.
4. Explain whether the gap is keyword coverage, page format, topical authority, or link authority.

## Evidence discipline

- Separate measured data from inference. Say "SERP shows" for observed ranking patterns and "likely" for strategic interpretation.
- Report locale, language, date, and sample size.
- Include ranked URLs/domains when making a competitor claim.
- If data is thin, say what was sampled and what should be expanded next.

## If you're blocked

SEO Research is available to Vibey, marketing-domain agents, and analyst-domain agents. If a call comes back blocked, hand the request to a marketing or analyst teammate with `ask_agent` instead of switching to generic web search.$skillbody$,
  'research',
  now()
)
on conflict (skill_key) do update set
  name = excluded.name,
  description = excluded.description,
  markdown_content = excluded.markdown_content,
  category = excluded.category,
  updated_at = now();

insert into public.skill_library_resources (
  skill_key,
  file_path,
  content,
  content_type,
  storage_url
)
values (
  'seo-research',
  'references/actions.md',
  $resource$# SEO Research - Action Catalog

Every action runs through `use_integration` with `service: "seo_research"`. Put provider inputs inside `params`.

Default US locale: `location_code: 2840`, `language_code: "en"`.

## Keyword research

| Action | Params | Use |
|---|---|---|
| `keyword_ideas` | `keywords`, `location_code` (opt), `location_name` (opt), `language_code` (opt), `language_name` (opt), `limit` (opt), `offset` (opt) | Expand seed keywords into adjacent opportunities |
| `keyword_overview` | `keywords`, `location_code` (opt), `location_name` (opt), `language_code` (opt), `language_name` (opt) | Check metrics for known keywords |

Example:

```
use_integration -> {
  "service": "seo_research",
  "integration_action": "keyword_ideas",
  "params": {
    "keywords": ["ai funnel builder", "landing page ai"],
    "location_code": 2840,
    "language_code": "en",
    "limit": 25
  }
}
```

## SERP analysis

| Action | Params | Use |
|---|---|---|
| `google_serp` | `keyword`, `location_code` (opt), `location_name` (opt), `language_code` (opt), `language_name` (opt), `depth` (opt), `device` (opt), `os` (opt) | Inspect live Google organic results and winning page formats |

Example:

```
use_integration -> {
  "service": "seo_research",
  "integration_action": "google_serp",
  "params": {
    "keyword": "best landing page builder",
    "location_code": 2840,
    "language_code": "en",
    "depth": 20
  }
}
```

## Competitors and authority

| Action | Params | Use |
|---|---|---|
| `competitors_domain` | `target`, `intersecting_domains` (opt), `filters` (opt), `location_code` (opt), `location_name` (opt), `language_code` (opt), `language_name` (opt), `limit` (opt), `offset` (opt) | Find domains competing in the same organic keyword space |
| `backlinks_summary` | `target`, `internal_list_limit` (opt), `include_subdomains` (opt), `backlinks_status_type` (opt) | Check backlink summary metrics for a domain or URL |

Example:

```
use_integration -> {
  "service": "seo_research",
  "integration_action": "competitors_domain",
  "params": {
    "target": "example.com",
    "location_code": 2840,
    "language_code": "en",
    "limit": 10
  }
}
```

## Choosing the action

- Need more keyword candidates: `keyword_ideas`.
- Already have candidate keywords: `keyword_overview`.
- Need to know what ranks: `google_serp`.
- Need domain-level competitors: `competitors_domain`.
- Need authority/link context: `backlinks_summary`.$resource$,
  'text/markdown',
  null
)
on conflict (skill_key, file_path) do update set
  content = excluded.content,
  content_type = excluded.content_type,
  storage_url = excluded.storage_url;

insert into public.template_skill_assignments (template_key, skill_key, is_enabled)
values
  ('analyst', 'seo-research', true),
  ('performance_analyst', 'seo-research', true),
  ('copywriter', 'seo-research', true),
  ('designer', 'seo-research', true),
  ('brand_manager', 'seo-research', true),
  ('media_producer', 'seo-research', true)
on conflict (template_key, skill_key) do update set
  is_enabled = excluded.is_enabled;

insert into public.agent_skills (
  user_id,
  org_id,
  agent_key,
  skill_key,
  name,
  description,
  markdown_content,
  is_enabled,
  source,
  archetype_filter
)
select
  null,
  null,
  'vibey',
  skill_key,
  name,
  description,
  markdown_content,
  true,
  'system',
  null
from public.skill_library
where skill_key = 'seo-research'
on conflict (agent_key, skill_key) where user_id is null and org_id is null do update set
  name = excluded.name,
  description = excluded.description,
  markdown_content = excluded.markdown_content,
  is_enabled = true,
  source = 'system',
  updated_at = now();

insert into public.agent_skill_resources (
  user_id,
  org_id,
  agent_key,
  skill_key,
  file_path,
  content,
  content_type,
  storage_url
)
select
  null,
  null,
  'vibey',
  skill_key,
  file_path,
  content,
  coalesce(content_type, 'text/markdown'),
  storage_url
from public.skill_library_resources
where skill_key = 'seo-research'
on conflict (agent_key, skill_key, file_path) where user_id is null and org_id is null do update set
  content = excluded.content,
  content_type = excluded.content_type,
  storage_url = excluded.storage_url,
  updated_at = now();

with eligible_agents as (
  select
    ar.user_id,
    ar.org_id,
    ar.agent_key,
    coalesce(
      nullif(ar.config ->> 'capability_domain', ''),
      case
        when lower(ar.agent_key) in ('copywriter', 'designer', 'media_producer', 'brand_manager')
          or lower(ar.role) ~ '(copywriter|designer|creative|brand|media|marketing|social)'
          then 'marketing'
        when lower(ar.agent_key) in ('analyst', 'cfo')
          or lower(ar.role) ~ '(analyst|finance|data|performance)'
          then 'analyst'
        else null
      end
    ) as capability_domain
  from public.agents_registry ar
  where coalesce(ar.is_system, false) = false
    and coalesce(ar.status, '') <> 'deleted'
)
insert into public.agent_skills (
  user_id,
  org_id,
  agent_key,
  skill_key,
  name,
  description,
  markdown_content,
  is_enabled,
  source,
  archetype_filter
)
select
  case when ea.org_id is null then ea.user_id else null end,
  ea.org_id,
  ea.agent_key,
  sl.skill_key,
  sl.name,
  sl.description,
  sl.markdown_content,
  true,
  'template',
  null
from eligible_agents ea
cross join public.skill_library sl
where sl.skill_key = 'seo-research'
  and ea.capability_domain in ('marketing', 'analyst')
  and (
    (ea.org_id is null and ea.user_id is not null)
    or ea.org_id is not null
  )
  and not exists (
    select 1
    from public.agent_skills existing
    where existing.agent_key = ea.agent_key
      and existing.skill_key = sl.skill_key
      and (
        (ea.org_id is not null and existing.org_id = ea.org_id and existing.user_id is null)
        or (ea.org_id is null and existing.user_id = ea.user_id and existing.org_id is null)
      )
  );

insert into public.agent_skill_resources (
  user_id,
  org_id,
  agent_key,
  skill_key,
  file_path,
  content,
  content_type,
  storage_url
)
select
  s.user_id,
  s.org_id,
  s.agent_key,
  s.skill_key,
  r.file_path,
  r.content,
  coalesce(r.content_type, 'text/markdown'),
  r.storage_url
from public.agent_skills s
join public.skill_library_resources r on r.skill_key = s.skill_key
where s.skill_key = 'seo-research'
  and not exists (
    select 1
    from public.agent_skill_resources existing
    where existing.agent_key = s.agent_key
      and existing.skill_key = s.skill_key
      and existing.file_path = r.file_path
      and (
        (s.user_id is not null and existing.user_id = s.user_id)
        or (s.user_id is null and s.org_id is not null and existing.user_id is null and existing.org_id = s.org_id)
        or (s.user_id is null and s.org_id is null and existing.user_id is null and existing.org_id is null)
      )
  );
