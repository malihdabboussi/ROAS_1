# MCP Brain Audit

Last Modified: 2026-06-04

## Summary

Brain implementation is not part of the Spaces navigation change. This audit maps what Brain already has internally against what MCP exposes today, then defines the recommended MCP hierarchy for a later Brain pass.

The practical MCP use case is intentionally small:

- Discover accessible Brain scopes, especially Agent Brains and campaign/Space-related context.
- Search those brains for information.
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
→ save_user_memory(content, memory_type)
```

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

Do not add broad Brain model tools in the Spaces change. The next Brain MCP pass should stay small: expose brain scope discovery, Agent Brain resolution, campaign/Space context search, and the approved memory save route. Pages, logs, beliefs, perspectives, lint, and edge/object mutation tools are not part of the normal MCP use case yet.
