# Brain Families and Tools Reference

## Durable Brain Families

| Family | What it holds | Read tools | Write tools |
| --- | --- | --- | --- |
| User Brain | Personal memories, preferences, beliefs, notes, links, documents, and snapshots. | `search_user_brain`, `list_user_brain_memories`, `get_brain_pages`, `get_brain_belief_patterns`, `get_brain_perspectives` | `save_user_memory`, `ingest_user_brain_text`, `ingest_user_brain_link`, `ingest_user_brain_document`, `crystallize_user_brain`, `assign_user_memory_source` |
| Agent Brain | Agent expertise corpus, examples, source imports, domains, and gaps. | `resolve_agent_brain`, `search_agent_brain`, `list_agent_brain_domains`, `get_agent_brain_gaps`, `list_agent_brain_imports`, `get_brain_pages` | `ingest_agent_brain_text`, `ingest_agent_brain_link` |
| Customer Brain | Customer cognition, objections, preferences, and avatars. | `search_customer_brain`, `list_customer_brain_memories`, `list_customer_avatars`, `get_brain_belief_patterns`, `get_brain_perspectives` | `save_customer_memory`, `ingest_customer_brain_text`, `ingest_customer_brain_link` |
| Company Brain | Organization-level truths, decisions, standards, protocols, perspectives, tensions, and relationships. | `search_company_brain`, `get_company_brain_objects`, `get_company_brain_object_edges` | `propose_company_brain_signal`, `propose_company_brain_signal`, `create_company_brain_object`, `update_company_brain_object`, `archive_company_brain_object`, `create_company_brain_edge`, `delete_company_brain_edge` |

## Shared Cortex Targeting

Shared Cortex actions require `brain_type`. Use `brain_type: "user_default"` for the default User Brain. Pass `brain_id` for Agent Brain, Customer Brain, or Company Brain.

## Campaign/Space Context

Campaign/Space context is active project context. It can include briefs, working docs, prior deliverables, and mission-specific facts. It is useful for interpretation, but it is not a durable Brain write target.

Company Brain write rule: raw inputs create proposed signals through `propose_company_brain_signal`; durable objects are created by reviewed formation with `source_signal_ids`, evidence refs, and retrieval rules.
