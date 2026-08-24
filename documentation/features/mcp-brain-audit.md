# MCP Brain Audit

Last Modified: 2026-08-23

## Summary

Brain implementation is not part of the Spaces navigation change. This audit maps what Brain already has internally against what MCP exposes today, then defines the recommended MCP hierarchy for a later Brain pass.

The practical MCP use case is intentionally small:

- Discover accessible Brain scopes, especially Agent Brains and campaign/Space-related context.
- Search those brains for information.
- Synthesize an evidence-backed answer about what the authenticated user thinks about one topic.
- Save information through the supported memory/write path, usually by routing the request to Atlas/user-memory handling rather than exposing every low-level Brain model.

## Personal Brain

What exists internally:

- Memories: `save_user_memory`, `search_user_brain`, `list_user_brain_memories`, `assign_user_memory_source`, `delete_brain_node`
- Pages: `get_brain_pages`, `create_brain_page`, `patch_brain_page`, `update_brain_page`, `archive_brain_page`, `link_brain_pages`, `unlink_brain_pages`
- Logs: `get_brain_log`, `log_brain_event`
- Beliefs: `get_brain_belief_patterns`, create/update/archive/merge belief actions, belief-memory links
- Perspectives: `get_brain_perspectives`, create/update/archive perspective actions, belief-perspective links
- Lint: `get_brain_lint`, `run_brain_lint`

What MCP exposes today:

- `search_user_brain`
- `synthesize_user_brain_topic`
- `list_user_brain_memories`
- `save_user_memory`
- `search_brains`

What is missing:

- For the common MCP use case, Personal Brain is mostly covered for search/list/save.
- Exact memory read by id is still missing if the agent needs to open one returned memory directly.
- Pages/logs/beliefs/perspectives/lint exist internally but are not required for the first MCP Brain pass.

Recommended MCP hierarchy:

```text
list_user_brain_memories(limit?)
→ search_user_brain(query)
→ synthesize_user_brain_topic(topic, question?, evidence_limit?)
→ save_user_memory(content, memory_type)
```

### Topic synthesis data flow

`synthesize_user_brain_topic` is a read-only personal Brain action. OAuth resolves the current user and optional organization; clients cannot pass either identity in tool arguments.

```text
Claude question
→ personal Brain OAuth scope check
→ four bounded retrieval angles
→ candidate deduplication and evidence diversity
→ grouped topic dossier with stable E1...En refs
→ Claude writes the answer from cited evidence
```

The server returns evidence groups rather than generating uncited prose. Groups include beliefs, decisions, preferences, frameworks and strategies, stories and examples, perspectives, synthesized context, and supporting evidence. `coverage.context_sufficient`, source counts, confidence, and gaps tell the client when not to claim a complete answer.

Example:

```json
{
  "topic": "webinars",
  "question": "What do I think about webinars?",
  "evidence_limit": 24
}
```

Claude should build the opening answer from `synthesis.short_answer_basis`, cite refs such as `[E1]` after material claims, and state the returned gaps when coverage is insufficient.

## Agent Brain

What exists internally:

- Accessible scopes and resolution: `list_available_brain_scopes`, `resolve_agent_brain`
- Search: `search_agent_brain`
- Domains/gaps/imports: `list_agent_brain_domains`, `get_agent_brain_gaps`, `list_agent_brain_imports`
- Imports: `ingest_agent_brain_text`, `ingest_agent_brain_link`

What MCP exposes today:

- `search_agent_brain`

What is missing:

- Agent Brain discovery before search.
- A simple MCP-exposed list/resolve path for accessible Agent Brains.
- Save/write path is not exposed through MCP today; internal imports exist, but exposing them should be an explicit product decision.

Recommended MCP hierarchy:

```text
list_available_brain_scopes()
→ resolve_agent_brain(agent_id | agent_key | brain_id)
→ search_agent_brain(brain_id, query, domain?)
```

```text
search_brains(query, families: ["agent"])
```

## Customer Brain

What exists internally:

- Memories/search: `save_customer_memory`, `search_customer_brain`, `list_customer_brain_memories`
- Customer/contact adjacent access: `list_customer_avatars`
- Imports: `ingest_customer_brain_text`, `ingest_customer_brain_link`

What MCP exposes today:

- `search_customer_brain`

What is missing:

- MCP does not expose `list_customer_brain_memories`.
- MCP does not expose a customer-memory save path.
- There is no verified `list_customers` Brain action in this audit.

Recommended MCP hierarchy:

```text
search_customer_brain(query, limit?)
```

```text
list_customer_brain_memories(limit?)
```

## Company Brain

What exists internally:

- Signals: `propose_company_brain_signal` creates proposed Company Cortex signals for human review.
- Objects: `get_company_brain_objects`, `create_company_brain_object`, `update_company_brain_object`, `archive_company_brain_object`
- Edges: `get_company_brain_object_edges`, `create_company_brain_edge`, `delete_company_brain_edge`
- Search: `search_company_brain`

What MCP exposes today:

- `search_company_brain`
- `propose_company_brain_signal`

What is missing:

- MCP does not expose `get_company_brain_objects`.
- Object edge browsing.
- Update/archive and edge mutation exposure decisions.
- Direct object creation is no longer the normal MCP write path. Durable objects require reviewed signal lineage, evidence refs, and retrieval rules.

Recommended MCP hierarchy:

```text
list_company_brain_objects(object_type?, limit?)
→ get_company_brain_object(object_id)
→ list_company_brain_object_edges(object_id)
→ get_company_brain_object_edge(edge_id)
```

```text
search_company_brain(query, object_type?, limit?)
```

```text
propose_company_brain_signal(truth, signal_type?, evidence_refs?, source metadata?)
→ human review
→ company_cortex_formation
→ durable company object
```

## Decision

Do not expose broad Brain model mutation tools solely to answer personal topic questions. The topic-synthesis path composes the existing permission-scoped retrieval lanes—including returned beliefs and perspectives—behind one bounded read tool, then leaves final prose synthesis to the MCP client so every claim can remain tied to returned evidence. Pages, logs, lint, and edge/object mutation tools are not part of this normal MCP use case.

## Decision Log

- 2026-08-23: Added `synthesize_user_brain_topic` as a read-only User Brain dossier action. Kept retrieval and evidence packing server-side, final prose client-side, and reused the existing MCP OAuth, action preflight, structured error, and workflow circuit paths.
