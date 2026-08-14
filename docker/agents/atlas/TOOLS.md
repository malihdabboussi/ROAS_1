# TOOLS.md — Brain Scholar Tools

## Backend Action Contract Protocol

Backend actions accept exact payload fields, not free-form keys derived from the action name or the user's wording. Guessing fields wastes a retry cycle and shows the user a hiccup.

Before calling a `vibey_backend` action, first use the exact contract already in your current context, the visible tool schema, or `skills/vibey-api/SKILL.md` references. Do not call `describe_action` when the required fields, optional fields, aliases, and action fit are already available.

Use `describe_action` only as a fallback for unknown, rare, or dynamic backend actions whose contract is not available in current context or reference files.

Example:

```json
{
  "action": "describe_action",
  "label": "Checking action contract",
  "data": { "action_name": "update_presentation" }
}
```

The result tells you:
- `required` — fields that must be present
- `optional` — fields you may send
- `aliases` — accepted alternate wording (e.g. `title` → `name`)
- `types` — expected primitive types
- `use_when` / `do_not_use_when` — when this action is the right call
- `examples` — valid payloads

Rules:
1. Send only fields in `required`, `optional`, or `aliases`.
2. If a user word maps to an alias, send the canonical field name.
3. For `use_integration`, put provider-specific inputs inside `data.params` using the exact parameter names returned by the integration docs. Do not send provider inputs flat on `data`.
4. If the contract says a different action fits the intent better, switch to that action before calling.
5. Do not surface `describe_action`, schemas, or internal contracts to the user.


Use `vibey_backend` for all brain operations.

## Read Operations

- `search_memory` — Search user memories by query
- `search_sk_entries` — Search agent SK entries by query and brain_id
- `search_campaign_brain` — Search campaign brain memories (requires campaign_id or campaign chat scope)
- `list_brain_scopes` — List available brain rows and campaigns for routing. Use this before deciding where knowledge belongs.
- `resolve_agent_sk_brain` — Resolve agent_key → SK brain_id and provisioned flag
- `get_brain_stats` — Stats per scope (user/agent/campaign)
- `list_recent_memories` — List recent memories for context
- `list_brain_domains` — List domain coverage across all brain scopes
- `get_brain_gaps` — Analyze gaps in knowledge coverage
- `get_narrative_pages` — Read the Cortex Max library for a brain before organizing, forming, or linting
- `get_belief_patterns` / `get_perspectives` — Read cognition layers before creating or changing beliefs and perspectives

## Write Operations — User Brain (default)

These tools ONLY write to the user's default brain. They have no campaign_id or brain_type parameter.

- `save_memory` — Store a memory (USER brain ONLY — no campaign routing)
- `ingest_brain_text` — Ingest text into USER brain only (`title` required)
- `ingest_brain_link` — Ingest URL into USER brain only (YouTube, articles, etc.)
- `ingest_user_document` — Ingest uploaded document into USER brain
- `ingest_user_link` — Ingest user-submitted URL into USER brain
- `trigger_crystallization` — Create Neural Snapshot (USER brain only)

## Write Operations — Campaign Brain

Campaign Brain stores durable client-level knowledge shared across that client's Spaces. Do not use it as a replacement for Company Cortex.

- `atlas_save_brain_context` — Save campaign knowledge with `target_brain: "campaign"`, `campaign_id`, `content`, and source metadata.
- Never use `save_user_memory` for campaign knowledge; it writes only to the user's default brain.

## Write Operations — Agent SK Brain

These tools write to a specific agent's expertise brain. Require `brainId` from `resolve_agent_sk_brain`.

- `ingest_sk_text` — Ingest text into agent brain (needs brainId + text)
- `ingest_sk_link` — Ingest URL into agent brain (needs brainId + url)

## Transfer and Cleanup

- `transfer_brain_node` — Copy/move a single node between brain layers
- `transfer_brain_by_source` — Batch move/copy all nodes sharing a `source_title` between scopes
- `assign_memory_source` — Assign orphan memories to a `source_title` on the default user brain
- `delete_brain_node` — Remove a misplaced node (verify IDs via search first)

## Company Cortex Skills

Company Cortex is not a document library. It is the organization’s operating mind.

- `company-daily-dream` — Use when a `company_daily_dream` background mission provides a compressed daily digest. Propose company-level signals only; do not create stable truths directly.
- `company-cortex-formation` — Use when proposed company signals need to become durable company cognition. Merge duplicates, reinforce repeated evidence, create tensions, and write retrieval rules.
- `company-context-rule-lint` — Use when context felt missing, wrong, or too much, or when retrieval rules need a health check.

Why these are separate:

- Daily dream keeps ingestion cheap and high-recall.
- Formation keeps durable Company Cortex clean and evidence-backed.
- Rule lint protects the agent context window by checking when company knowledge should be injected.


## Temporal And Timeline Tools

Shared Cortex timeline actions:
- `get_brain_timelines`
- `get_brain_timeline_items`
- `create_brain_timeline`
- `upsert_brain_timeline_items`
- `archive_brain_timeline`

These are Atlas-owned Cortex synthesis actions. Use them for curated milestones and evolution, not ordinary memory capture. Temporal retrieval accepts `time_mode`, `as_of`, `occurred_from`, `occurred_to`, and `include_historical`. Use `as_of` for past truth and `timeline` or `evolution` for change over time.
