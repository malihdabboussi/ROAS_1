# Atlas DB Skills Phase 2 Update Plan

Last updated: 2026-05-21

## Purpose

Atlas skills and system files are database-first. Files under `docker/agents/**` are templates or runtime artifacts, but deployed agents read skills generated from `agent_skills`, `agent_skill_resources`, and `agent_definitions`.

This plan documents what must change in Supabase after the Phase 2 Brain tool rename/removal so Atlas does not regenerate old tool instructions on the next sync.

No DB writes were performed during this analysis.

## Source Of Truth

Database: `qfrvykscoymiwwgysvsr`

Tables checked:

| Table | Atlas / Brain Scholar rows found |
| --- | ---: |
| `agent_definitions` | 5 |
| `agent_skills` | 14 |
| `agent_skill_resources` | 5 |

Relevant DB rows are global except `atlas/skill-creator`, which is user-scoped:

| Table | Row |
| --- | --- |
| `agent_definitions` | `atlas / AGENTS.md` |
| `agent_definitions` | `atlas / TOOLS.md` |
| `agent_definitions` | `atlas / ROLE.md` |
| `agent_definitions` | `atlas / SOUL.md` |
| `agent_definitions` | `atlas / IDENTITY.md` |
| `agent_skills` | `atlas / brain-library-lint` |
| `agent_skills` | `atlas / brain-library-organization` |
| `agent_skills` | `atlas / brain-operations` |
| `agent_skills` | `atlas / brain-pattern-analysis` |
| `agent_skills` | `atlas / knowledge-intake` |
| `agent_skill_resources` | `atlas / brain-library-lint / references/actions.md` |
| `agent_skill_resources` | `atlas / brain-operations / references/brain-layers-and-tools.md` |
| `agent_skill_resources` | `atlas / brain-library-organization / references/actions.md` |
| `agent_skill_resources` | `atlas / brain-pattern-analysis / references/actions.md` |
| `agent_skill_resources` | `atlas / knowledge-intake / references/source-strategies.md` |

## Current DB Findings

The DB still contains old Phase 1/legacy names. These rows need updates:

| Source | Row | Old terms found |
| --- | --- | --- |
| `agent_definitions` | `atlas / TOOLS.md` | `save_memory`, `search_memory`, `search_sk_entries`, `resolve_agent_sk_brain`, `ingest_sk_text`, `ingest_sk_link`, `ingest_brain_text`, `ingest_brain_link`, `ingest_user_document`, `ingest_user_link`, `assign_memory_source`, `list_brain_scopes`, `list_recent_memories`, `trigger_crystallization` |
| `agent_skills` | `atlas / brain-operations` | Old user tools, old SK tools, Campaign Brain language, campaign ingest/search tools |
| `agent_skills` | `atlas / knowledge-intake` | Old user tools, old SK tools, Campaign Brain language, campaign ingest tools |
| `agent_skills` | `atlas / brain-library-lint` | `search_memory` |
| `agent_skills` | `atlas / brain-library-organization` | `search_memory` |
| `agent_skill_resources` | `atlas / brain-operations / references/brain-layers-and-tools.md` | Old user tools, old SK tools, Campaign Brain language, campaign ingest/search tools |
| `agent_skill_resources` | `atlas / brain-library-lint / references/actions.md` | `search_memory` |

Rows that appear already aligned or do not need Phase 2 tool-name edits:

| Row | Notes |
| --- | --- |
| `atlas / ROLE.md` | Already describes User, Company Cortex, Customer, Agent Brain, and Space / Initiative Context. |
| `atlas / SOUL.md` | Already uses current durable brain framing. |
| `atlas / AGENTS.md` | Mostly aligned, but should remove `campaign memory` wording in the blocking guidance. |
| `atlas / brain-pattern-analysis` | Mostly okay conceptually, but references `campaign` as a brain scope in one routing paragraph. |
| Company Cortex skills | No old Brain tool names found in main skill bodies. |
| Customer Brain skills | No Phase 2 action names found that block the rename, but future implementation may need `save_customer_memory` alignment once that tool exists. |

## Canonical Replacement Map

Apply these replacements in DB skill/system text:

| Old | New |
| --- | --- |
| `save_memory` | `save_user_memory` |
| `search_memory` | `search_user_brain` |
| `trigger_crystallization` | `crystallize_user_brain` |
| `ingest_brain_text` | `ingest_user_brain_text` |
| `ingest_brain_link` | `ingest_user_brain_link` |
| `ingest_user_document` | `ingest_user_brain_document` |
| `ingest_user_link` | remove; use `ingest_user_brain_link` |
| `assign_memory_source` | `assign_user_memory_source` |
| `list_recent_memories` | `list_user_brain_memories` |
| `resolve_agent_sk_brain` | `resolve_agent_brain` |
| `search_sk_entries` | `search_agent_brain` |
| `ingest_sk_text` | `ingest_agent_brain_text` |
| `ingest_sk_link` | `ingest_agent_brain_link` |
| `list_brain_scopes` | `list_available_brain_scopes` |
| `list_brain_domains` | `list_agent_brain_domains` |
| `get_brain_gaps` | `get_agent_brain_gaps` |
| `list_brain_imports` | `list_agent_brain_imports` |
| `search_campaign_knowledge` | remove |
| `ingest_campaign_file` | remove |
| `ingest_campaign_url` | remove |
| Campaign Brain / campaign brain | replace with campaign context / Space context where needed |

Do not create aliases in skill text. Old names must disappear so regenerated runtime skills cannot keep the confusing contracts alive.

## Required DB Changes

### 1. `agent_definitions`: `atlas / TOOLS.md`

Replace the DB `TOOLS.md` content with the aligned template content from:

`docker/agents/templates/brain_scholar/TOOLS.md`

That file is already updated locally with:

- `search_user_brain`
- `search_agent_brain`
- `list_available_brain_scopes`
- `resolve_agent_brain`
- `list_user_brain_memories`
- `list_agent_brain_domains`
- `get_agent_brain_gaps`
- `save_user_memory`
- `ingest_user_brain_text`
- `ingest_user_brain_link`
- `ingest_user_brain_document`
- `crystallize_user_brain`
- `ingest_agent_brain_text`
- `ingest_agent_brain_link`
- `assign_user_memory_source`

### 2. `agent_definitions`: `atlas / AGENTS.md`

Update two phrases:

- `campaign memory` -> `campaign context`
- `campaign context, campaign memory, or prior deliverables` -> `campaign context, Space docs, or prior deliverables`

Reason: Atlas should still read campaign context, but not treat Campaign Brain as a durable brain family.

### 3. `agent_skills`: `atlas / brain-operations`

Rewrite the skill around four concepts:

- User Brain tools: `save_user_memory`, `search_user_brain`, `ingest_user_brain_text`, `ingest_user_brain_link`, `ingest_user_brain_document`, `crystallize_user_brain`, `list_user_brain_memories`.
- Agent Brain tools: `resolve_agent_brain`, `search_agent_brain`, `ingest_agent_brain_text`, `ingest_agent_brain_link`, `list_agent_brain_domains`, `get_agent_brain_gaps`, `list_agent_brain_imports`.
- Company Brain/Cortex tools: use `*_company_brain_*` names.
- Campaign/Space context is active project context, not a Brain write target.

Remove the “three brain layers” framing that includes Campaign Brain.

### 4. `agent_skill_resources`: `brain-operations / references/brain-layers-and-tools.md`

This is the highest-risk resource because it contains the old routing table and exact old tool names.

Replace it with a new reference named the same path, but conceptually titled `Brain Families and Tools Reference`.

Required content:

- User Brain section with canonical user tools.
- Agent Brain section with canonical agent tools.
- Company Brain section with canonical company tools.
- Campaign/Space Context section that says it is not a Brain write target.
- Transfer and cleanup section with `assign_user_memory_source` and no campaign `source_scope` / `target_scope`.
- No mention of `ingest_campaign_*` or `search_campaign_knowledge`.

### 5. `agent_skills`: `atlas / knowledge-intake`

Rewrite the routing section:

- Replace “three separate brains” with “durable brain families plus campaign/Space context.”
- Remove Campaign Brain row.
- Replace tool examples with canonical names.
- State that if the user asks for “campaign brain,” Atlas treats that as campaign/Space context and asks where durable knowledge should be stored if a write is needed.

### 6. `agent_skills`: `atlas / brain-library-lint`

Replace all `search_memory` instructions with `search_user_brain`, unless the lint job explicitly passes `brain_id` for a non-user brain. If the lint target is an agent brain, use the target-specific brain read tools and explicit `brain_id`.

### 7. `agent_skill_resources`: `brain-library-lint / references/actions.md`

Replace `search_memory` with `search_user_brain`.

Also add one sentence:

> Use agent-brain search tools only when the lint job explicitly targets an agent brain.

### 8. `agent_skills`: `atlas / brain-library-organization`

Replace `search_memory` references with `search_user_brain` for user-brain library organization.

If this skill is also used for agent/customer/company brain jobs, add a routing preface:

> Use the read/search tool for the brain family in the job target. Do not fall back to user-brain search for agent/company/customer jobs.

### 9. `agent_skills`: `atlas / brain-pattern-analysis`

Change the Brain Routing paragraph:

- Remove `campaign` from the list of durable brain scopes.
- Keep `customer` if the job targets Customer Brain.
- Clarify that Campaign/Space context can influence interpretation but is not where beliefs/perspectives are written.

### 10. `agent_skill_resources`: `brain-pattern-analysis / references/actions.md`

Change:

> include `brain_id` when working on an agent, campaign, or customer brain

to:

> include `brain_id` when working on an agent, customer, company, or explicit non-default brain target

## Suggested Update Order

1. Update `agent_definitions` first: `TOOLS.md`, then `AGENTS.md`.
2. Update the high-risk routing skills: `brain-operations`, `knowledge-intake`.
3. Update resource files: `brain-operations/references/brain-layers-and-tools.md`, `brain-library-lint/references/actions.md`, `brain-pattern-analysis/references/actions.md`.
4. Update secondary skills: `brain-library-lint`, `brain-library-organization`, `brain-pattern-analysis`.
5. Trigger or wait for `AgentSyncService.syncAll()` so DB changes regenerate runtime files.
6. Re-run verification queries below.

## Verification Queries

### Old Tool Names Must Be Gone

```sql
with search_terms(term) as (
  values
    ('save_memory'),
    ('search_memory'),
    ('search_sk_entries'),
    ('resolve_agent_sk_brain'),
    ('ingest_sk_text'),
    ('ingest_sk_link'),
    ('ingest_campaign_file'),
    ('ingest_campaign_url'),
    ('search_campaign_knowledge'),
    ('assign_memory_source'),
    ('list_brain_scopes'),
    ('list_recent_memories'),
    ('trigger_crystallization'),
    ('ingest_brain_text'),
    ('ingest_brain_link'),
    ('ingest_user_document'),
    ('ingest_user_link')
),
defs as (
  select 'agent_definitions'::text as source_table, agent_key, file_name as item_key, content
  from public.agent_definitions
  where agent_key in ('atlas','brain_scholar')
),
skills as (
  select 'agent_skills'::text as source_table, agent_key, skill_key as item_key,
         coalesce(description,'') || E'\n' || coalesce(markdown_content,'') as content
  from public.agent_skills
  where agent_key in ('atlas','brain_scholar')
),
resources as (
  select 'agent_skill_resources'::text as source_table, agent_key,
         skill_key || '/' || file_path as item_key, content
  from public.agent_skill_resources
  where agent_key in ('atlas','brain_scholar')
),
all_rows as (
  select * from defs
  union all select * from skills
  union all select * from resources
)
select source_table, agent_key, item_key, array_agg(term order by term) as matching_terms
from all_rows
cross join search_terms
where lower(content) like '%' || lower(term) || '%'
group by source_table, agent_key, item_key
order by source_table, agent_key, item_key;
```

Expected result after updates: no rows, except intentional historical audit rows if those are explicitly excluded from runtime sync. For `agent_definitions`, `agent_skills`, and `agent_skill_resources`, the result should be empty.

### Campaign Brain Product Language Must Be Gone From DB Skills

```sql
with search_terms(term) as (
  values ('Campaign Brain'), ('campaign brain'), ('campaign-brain')
),
all_rows as (
  select 'agent_definitions'::text as source_table, agent_key, file_name as item_key, content
  from public.agent_definitions
  where agent_key in ('atlas','brain_scholar')
  union all
  select 'agent_skills'::text, agent_key, skill_key,
         coalesce(description,'') || E'\n' || coalesce(markdown_content,'')
  from public.agent_skills
  where agent_key in ('atlas','brain_scholar')
  union all
  select 'agent_skill_resources'::text, agent_key, skill_key || '/' || file_path, content
  from public.agent_skill_resources
  where agent_key in ('atlas','brain_scholar')
)
select source_table, agent_key, item_key, array_agg(term order by term) as matching_terms
from all_rows
cross join search_terms
where lower(content) like '%' || lower(term) || '%'
group by source_table, agent_key, item_key
order by source_table, agent_key, item_key;
```

Expected result after updates: no rows.

### Canonical Tool Names Should Exist

```sql
select
  bool_or(content ilike '%save_user_memory%') as has_save_user_memory,
  bool_or(content ilike '%search_user_brain%') as has_search_user_brain,
  bool_or(content ilike '%resolve_agent_brain%') as has_resolve_agent_brain,
  bool_or(content ilike '%ingest_agent_brain_text%') as has_ingest_agent_brain_text
from (
  select content from public.agent_definitions where agent_key = 'atlas'
  union all
  select markdown_content from public.agent_skills where agent_key = 'atlas'
  union all
  select content from public.agent_skill_resources where agent_key = 'atlas'
) rows;
```

Expected result: all `true`.

## Quality Bar For Rewrites

Use the context engineering rules while editing the DB skill text:

- Explain why Campaign/Space context is not a Brain write target.
- Keep one term per concept: use `User Brain`, `Agent Brain`, `Company Brain`, `Customer Brain`, and `Campaign/Space context`.
- Do not keep compatibility aliases “just in case.” That recreates ambiguity.
- Prefer short routing tables over long prose.
- Include examples only for canonical tools.
- Remove references to tools that no longer exist.
- Keep the main skill body lean; put long tool tables in resources.

## Hard Stop

Do not mark Phase 2 fully complete until:

- DB skills/resources/system files are updated.
- Runtime agent files are regenerated from DB.
- Verification queries return no old tool names.
- Generated `skills/vibey-api` output for Atlas no longer includes old Brain names or Campaign Brain.
- Targeted tests/typecheck still pass after sync.
