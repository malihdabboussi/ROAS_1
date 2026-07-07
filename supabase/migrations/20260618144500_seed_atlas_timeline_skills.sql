-- Teach Atlas and the Brain Scholar alias the Temporal Timeline cognition layer.
-- Runtime skills are database-first; filesystem files are bootstrap/mirror only.

create or replace function pg_temp.append_system_agent_definition_patch(
  p_agent_key text,
  p_file_name text,
  p_marker text,
  p_patch text
)
returns void
language plpgsql
as $$
begin
  update public.agent_definitions
  set
    content = content || E'\n\n' || p_patch,
    updated_at = now()
  where agent_key = p_agent_key
    and file_name = p_file_name
    and user_id is null
    and org_id is null
    and content not like '%' || p_marker || '%';

  insert into public.agent_definitions (agent_key, file_name, content, user_id, org_id, source)
  select p_agent_key, p_file_name, p_patch, null, null, 'system'
  where not exists (
    select 1
    from public.agent_definitions
    where agent_key = p_agent_key
      and file_name = p_file_name
      and user_id is null
      and org_id is null
  );
end;
$$;

create or replace function pg_temp.append_system_agent_skill_patch(
  p_agent_key text,
  p_skill_key text,
  p_marker text,
  p_patch text
)
returns void
language plpgsql
as $$
begin
  update public.agent_skills
  set
    markdown_content = markdown_content || E'\n\n' || p_patch,
    updated_at = now()
  where agent_key = p_agent_key
    and skill_key = p_skill_key
    and user_id is null
    and org_id is null
    and markdown_content not like '%' || p_marker || '%';
end;
$$;

with agents(agent_key) as (
  values ('atlas'), ('brain_scholar')
)
select pg_temp.append_system_agent_definition_patch(
  agent_key,
  'SOUL.md',
  '## Temporal Cognition',
  E'## Temporal Cognition\n\nTime is part of cognition. Separate when Atlas learned something from when it happened, when it became valid, and when it stopped being true.\n\nEpisodes preserve raw source-event time. Brain objects preserve object truth and validity windows. Timelines are curated Cortex Max narratives for meaningful change: milestones, shifts, contradictions, formations, resolutions, and decisions.'
)
from agents;

with agents(agent_key) as (
  values ('atlas'), ('brain_scholar')
)
select pg_temp.append_system_agent_definition_patch(
  agent_key,
  'ROLE.md',
  '## Temporal Cortex Responsibility',
  E'## Temporal Cortex Responsibility\n\nPreserve temporal metadata at ingestion and synthesize timelines only for meaningful change. Cortex timelines explain how User, Customer, Agent, and Company brains evolve; they do not duplicate every raw episode.'
)
from agents;

with agents(agent_key) as (
  values ('atlas'), ('brain_scholar')
)
select pg_temp.append_system_agent_definition_patch(
  agent_key,
  'TOOLS.md',
  '## Temporal And Timeline Tools',
  E'## Temporal And Timeline Tools\n\nShared Cortex timeline actions:\n- `get_brain_timelines`\n- `get_brain_timeline_items`\n- `create_brain_timeline`\n- `upsert_brain_timeline_items`\n- `archive_brain_timeline`\n\nThese are Atlas-owned Cortex synthesis actions. Use them for curated milestones and evolution, not ordinary memory capture. Temporal retrieval accepts `time_mode`, `as_of`, `occurred_from`, `occurred_to`, and `include_historical`. Use `as_of` for past truth and `timeline` or `evolution` for change over time.'
)
from agents;

with agents(agent_key) as (
  values ('atlas'), ('brain_scholar')
)
select pg_temp.append_system_agent_definition_patch(
  agent_key,
  'AGENTS.md',
  '## Temporal Brain Rule',
  E'## Temporal Brain Rule\n\nTreat `created_at` as when Atlas learned or wrote a row, not when the event happened. Use episode and temporal fields for source-event time. Use Cortex timelines only for curated milestones, shifts, decisions, contradictions, formations, and resolutions.'
)
from agents;

insert into public.agent_skills (
  user_id,
  org_id,
  agent_key,
  skill_key,
  name,
  description,
  markdown_content,
  is_enabled,
  source
)
values
(
  null,
  null,
  'atlas',
  'brain-timeline-synthesis',
  'Brain Timeline Synthesis',
  'Synthesize Cortex timelines from episodes, memories, beliefs, perspectives, avatars, company objects, and agent knowledge sources. Use when Atlas receives a brain_timeline_synthesis job or when a durable brain target needs an evolution narrative.',
  $_atlas_timeline_skill_md_$# Brain Timeline Synthesis

You create and maintain Cortex Max timelines. A timeline is not a dump of every episode. It is a curated narrative of meaningful change.

## The Three Time Layers

- **Episode:** raw source event. A Fathom call, Slack import window, widget session, Telegram conversation, uploaded document, or agent source import. It answers when the source happened.
- **Brain object:** durable truth extracted from evidence. It answers what Atlas learned and when that truth is valid or effective.
- **Timeline:** synthesized cognition. It explains the arc: milestones, shifts, contradictions, formations, resolutions, decisions, and phase changes.

`created_at` means Atlas wrote or learned the row. It does not mean the event happened. Unknown event time stays unknown.

## When To Create A Timeline

Create or update a timeline when the target has enough evidence to explain change over time:

- a user belief or perspective formed, shifted, contradicted itself, or resolved
- a customer/account journey moved phases, surfaced objections, bought, churned, expanded, or changed worldview
- an agent source/domain grew, became stale, or superseded older SK entries
- a company object, standard, protocol, decision, tension, or signal became effective, changed, or was retired
- a narrative page needs a real evolution arc instead of static summary prose

Do not create a timeline for routine ingestion, isolated facts, or every episode.

## Item Types

- `event` - a meaningful source event that changed context
- `decision` - a committed choice with durable implications
- `shift` - a meaningful change in belief, behavior, stance, lifecycle, or operating model
- `milestone` - a notable achievement, threshold, or phase boundary
- `contradiction` - evidence that conflicts with prior active truth
- `formation` - when a belief, perspective, avatar, protocol, or object became coherent
- `resolution` - when a contradiction settled or an old truth was retired

## Workflow

1. Read existing timelines with `get_brain_timelines`.
2. Read supporting objects for the target: memories, evidence chunks, pages, beliefs, perspectives, avatars, company objects, or SK sources.
3. Decide whether a timeline exists or should be created with `create_brain_timeline`.
4. Upsert only curated items with `upsert_brain_timeline_items`.
5. Use `dedupe_key` per durable milestone, not per run.
6. Archive stale timelines with `archive_brain_timeline` only when the target itself is obsolete or merged.

## Brain-Specific Rules

- User Brain: build timelines for identity arcs, belief/perspective evolution, high-value topics, and pages that need historical narrative.
- Customer Brain: build timelines for contacts, accounts, objections, lifecycle transitions, avatar shifts, splits, and merges. Use `occurred_at` from interaction windows, not memory `created_at`.
- Agent Brain: build timelines for imported sources, skill/domain growth, stale knowledge, and superseded SK entries.
- Company Brain: build timelines for durable decisions, standards, protocols, tensions, moves, anti-patterns, signals, and objects. Use `effective_from` / `effective_until` for company truth.

## Quality Bar

- Preserve uncertainty with `temporal_confidence`.
- Prefer source timestamps over text-date inference.
- Never infer broad natural-language dates in v1.
- Do not let timeline recency outrank strong semantic relevance.
- Keep timeline items short, specific, and evidence-linked.$_atlas_timeline_skill_md_$,
  true,
  'system'
),
(
  null,
  null,
  'brain_scholar',
  'brain-timeline-synthesis',
  'Brain Timeline Synthesis',
  'Synthesize Cortex timelines from episodes, memories, beliefs, perspectives, avatars, company objects, and agent knowledge sources. Use when Atlas receives a brain_timeline_synthesis job or when a durable brain target needs an evolution narrative.',
  $_brain_scholar_timeline_skill_md_$# Brain Timeline Synthesis

You create and maintain Cortex Max timelines. A timeline is not a dump of every episode. It is a curated narrative of meaningful change.

## The Three Time Layers

- **Episode:** raw source event. A Fathom call, Slack import window, widget session, Telegram conversation, uploaded document, or agent source import. It answers when the source happened.
- **Brain object:** durable truth extracted from evidence. It answers what Atlas learned and when that truth is valid or effective.
- **Timeline:** synthesized cognition. It explains the arc: milestones, shifts, contradictions, formations, resolutions, decisions, and phase changes.

`created_at` means Atlas wrote or learned the row. It does not mean the event happened. Unknown event time stays unknown.

## When To Create A Timeline

Create or update a timeline when the target has enough evidence to explain change over time:

- a user belief or perspective formed, shifted, contradicted itself, or resolved
- a customer/account journey moved phases, surfaced objections, bought, churned, expanded, or changed worldview
- an agent source/domain grew, became stale, or superseded older SK entries
- a company object, standard, protocol, decision, tension, or signal became effective, changed, or was retired
- a narrative page needs a real evolution arc instead of static summary prose

Do not create a timeline for routine ingestion, isolated facts, or every episode.

## Item Types

- `event` - a meaningful source event that changed context
- `decision` - a committed choice with durable implications
- `shift` - a meaningful change in belief, behavior, stance, lifecycle, or operating model
- `milestone` - a notable achievement, threshold, or phase boundary
- `contradiction` - evidence that conflicts with prior active truth
- `formation` - when a belief, perspective, avatar, protocol, or object became coherent
- `resolution` - when a contradiction settled or an old truth was retired

## Workflow

1. Read existing timelines with `get_brain_timelines`.
2. Read supporting objects for the target: memories, evidence chunks, pages, beliefs, perspectives, avatars, company objects, or SK sources.
3. Decide whether a timeline exists or should be created with `create_brain_timeline`.
4. Upsert only curated items with `upsert_brain_timeline_items`.
5. Use `dedupe_key` per durable milestone, not per run.
6. Archive stale timelines with `archive_brain_timeline` only when the target itself is obsolete or merged.

## Brain-Specific Rules

- User Brain: build timelines for identity arcs, belief/perspective evolution, high-value topics, and pages that need historical narrative.
- Customer Brain: build timelines for contacts, accounts, objections, lifecycle transitions, avatar shifts, splits, and merges. Use `occurred_at` from interaction windows, not memory `created_at`.
- Agent Brain: build timelines for imported sources, skill/domain growth, stale knowledge, and superseded SK entries.
- Company Brain: build timelines for durable decisions, standards, protocols, tensions, moves, anti-patterns, signals, and objects. Use `effective_from` / `effective_until` for company truth.

## Quality Bar

- Preserve uncertainty with `temporal_confidence`.
- Prefer source timestamps over text-date inference.
- Never infer broad natural-language dates in v1.
- Do not let timeline recency outrank strong semantic relevance.
- Keep timeline items short, specific, and evidence-linked.$_brain_scholar_timeline_skill_md_$,
  true,
  'system'
)
on conflict (agent_key, skill_key) where user_id is null and org_id is null
do update set
  name = excluded.name,
  description = excluded.description,
  markdown_content = excluded.markdown_content,
  is_enabled = true,
  source = 'system',
  updated_at = now();

with patch(skill_key, marker, content) as (
  values
    ('knowledge-intake', '## Temporal Metadata', E'## Temporal Metadata\n\nPreserve source-event time as metadata. Pass `occurred_at` / `occurred_until` when the source system provides them, `asserted_at` when the user or source asserted the knowledge, and `valid_from` / `valid_until` only when the truth itself has a validity window. Do not turn low-value date facts into memory text.'),
    ('knowledge-extraction', '## Temporal Metadata Preservation', E'## Temporal Metadata Preservation\n\nReject low-value date facts as memory text, but preserve source time, assertion time, validity windows, and source-event windows in metadata. Do not infer broad dates from prose in v1.'),
    ('brain-operations', '## Temporal Retrieval', E'## Temporal Retrieval\n\nUse `time_mode`, `as_of`, `occurred_from`, `occurred_to`, and `include_historical` when the user asks about time. `as_of` means what was true then. `timeline` and `evolution` mean show the change arc. Timeline actions are Atlas-owned Cortex synthesis actions.'),
    ('brain-pattern-analysis', '## Evidence Windows And Timelines', E'## Evidence Windows And Timelines\n\nUse evidence windows when judging formation and change. `created_at` is learned time; `occurred_at`, `valid_from`, and evidence windows describe when evidence happened and when the belief or perspective was true. Mark perspective formations, shifts, contradictions, and resolutions as timeline-worthy.'),
    ('brain-library-organization', '## Temporal Page Narratives', E'## Temporal Page Narratives\n\nUse temporal fields for evolution stories, not row creation time. If a source was imported today but happened two years ago, write the page as an old event learned today. Preserve evidence references for timeline synthesis when a page reveals a durable formation, shift, contradiction, decision, or resolution.'),
    ('brain-library-lint', '## Temporal Contradiction Handling', E'## Temporal Contradiction Handling\n\nCheck timelines and temporal fields before calling something a contradiction. A belief from 2024 and a different belief from 2026 may be evolution, not conflict. If the contradiction represents a true shift or resolution, mark it as timeline-worthy.'),
    ('customer-call-routing', '## Customer Call Time Fields', E'## Customer Call Time Fields\n\nWhen calling `save_customer_memory`, pass the Fathom call window as `occurred_at` / `occurred_until`, processing time as `asserted_at`, and `temporal_source: "fathom_call"`. A call imported today but recorded in the past remains a past event learned today.'),
    ('customer-brain-pattern-analysis', '## Customer Pattern Time', E'## Customer Pattern Time\n\nUse `occurred_at` for sequence and recency when present; fall back to `created_at` only when event time is unknown. Do not treat late-imported old calls as fresh customer movement. Mark formations, shifts, contradictions, and resolutions as timeline-worthy.'),
    ('customer-avatar-synthesis', '## Avatar Timeline Changes', E'## Avatar Timeline Changes\n\nAvatar shifts, splits, merges, and transformations are timeline-worthy. Use supporting evidence windows and `occurred_at` to explain when the customer worldview moved, not when Atlas ran synthesis.'),
    ('company-daily-dream', '## Timeline-Worthy Company Signals', E'## Timeline-Worthy Company Signals\n\nMark signals as timeline-worthy when they represent a durable company decision, protocol change, standard formation, contradiction, tension emergence, or effective operating shift. Preserve the digest source window for later evidence windows.'),
    ('company-cortex-formation', '## Company Effective Time', E'## Company Effective Time\n\nPreserve `effective_from` / `effective_until` for company truth and evidence windows for source support. Create timeline items when a durable company object forms, changes, contradicts prior truth, becomes effective, or retires.')
),
agents(agent_key) as (
  values ('atlas'), ('brain_scholar')
)
select pg_temp.append_system_agent_skill_patch(agents.agent_key, patch.skill_key, patch.marker, patch.content)
from agents
cross join patch;
