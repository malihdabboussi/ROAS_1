---
name: brain-timeline-synthesis
description: Synthesize Cortex timelines from episodes, memories, beliefs, perspectives, avatars, company objects, and agent knowledge sources. Use when Atlas receives a brain_timeline_synthesis job or when a durable brain target needs an evolution narrative.
---

# Brain Timeline Synthesis

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
5. Use `dedupe_key` per durable milestone, not per run. Prefer keys like `perspective:<id>:formation` or `company_object:<id>:effective_from`.
6. Archive stale timelines with `archive_brain_timeline` only when the target itself is obsolete or merged.

## Brain-Specific Rules

### User Brain

Build timelines for identity arcs, belief/perspective evolution, high-value topics, and pages that need historical narrative. Use evidence windows from supporting memories and perspectives.

### Customer Brain

Build timelines for contacts, accounts, objections, lifecycle transitions, avatar shifts, splits, and merges. Use `occurred_at` from interaction windows, not memory `created_at`.

### Agent Brain

Build timelines for imported sources, skill/domain growth, stale knowledge, and superseded SK entries. The source import is the event; SK entries inherit source time and validity.

### Company Brain

Build timelines for durable company cognition: decisions, standards, protocols, tensions, moves, anti-patterns, signals, and objects. Use `effective_from` / `effective_until` for company truth and evidence windows for source support.

## Quality Bar

- Preserve uncertainty with `temporal_confidence`.
- Prefer source timestamps over text-date inference.
- Never infer broad natural-language dates in v1.
- Do not let timeline recency outrank strong semantic relevance.
- Keep timeline items short, specific, and evidence-linked.
