
## Backend Action Contract Protocol

Backend actions accept exact payload fields, not free-form keys derived from the action name or the user's wording. Guessing fields wastes a retry cycle and shows the user a hiccup.

Before calling a `vibey_backend` action whose contract is not already in your current context, call `describe_action` for that action and use only the fields it returns.

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

# TOOLS.md - Brain Scholar Tools


## Runtime Operating Layers

These layers exist to help the user get faster, more accurate work without repeating context or watching you stumble through avoidable tool errors.

Use them in this order:

1. **Platform protocols** — Use these for cross-cutting Vibey behavior: Space knowledge, Brain knowledge, skill usage, tool schemas, planning, persistence, clarification, and delegation. They help you find the right context, avoid guessing, save work in the right place, and keep long-running work coherent for the user.
2. **Skills** — Use skills for the actual craft. Read the relevant `skills/{skill-key}/SKILL.md` before creating, editing, publishing, or reviewing meaningful deliverables. This gives the user work that follows the right workflow and quality bar.
3. **Vibey API** — Use `skills/vibey-api/SKILL.md` before calling `vibey_backend`. It contains your allowed backend actions, exact schemas, relevant protocols, and action-to-skill guidance. This prevents broken actions from guessed fields.
4. **State** — Use state to remember active work, blockers, pending approvals, and important artifact ids. This keeps the user from having to explain the same project twice.

### Default Work Routing

For discovery/context questions:
- Search Space when the answer may live in tasks, docs, missions, artifacts, conversations, or media.
- Search Brain when the answer is durable memory, preferences, company rules, customer patterns, or agent expertise.

For deliverable work:
- Read the matching workflow skill first.
- Then read `vibey-api` for the action contract.
- Use `describe_action` when payload shape is uncertain.

For multi-step work:
- Make a short plan before executing.
- Persist created or edited assets.
- Update state when work is active, blocked, or waiting on approval.

For unclear, destructive, publish/send, or expensive actions:
- Ask a focused clarification before acting.


Use `vibey_backend` for Brain operations. Choose the action family that matches the durable target. The action name is the contract.

## Family-Specific Brain Tools

### User Brain

- `search_user_brain` - Search the authenticated user's personal default brain.
- `save_user_memory` - Save one personal memory.
- `ingest_user_brain_text` - Ingest text into User Brain.
- `ingest_user_brain_link` - Ingest a URL into User Brain.
- `ingest_user_brain_document` - Ingest document text into User Brain.
- `list_user_brain_memories` - List recent User Brain memories.
- `crystallize_user_brain` - Create a Neural Snapshot for User Brain.
- `assign_user_memory_source` - Assign source metadata on User Brain memories.

### Agent Brain

- `resolve_agent_brain` - Resolve an agent identity to its Agent Brain id.
- `search_agent_brain` - Search an Agent Brain by `brain_id`.
- `ingest_agent_brain_text` - Ingest text into an Agent Brain.
- `ingest_agent_brain_link` - Ingest a URL into an Agent Brain.
- `list_agent_brain_domains` - Read Agent Brain domain coverage.
- `get_agent_brain_gaps` - Read Agent Brain gaps and thin domains.
- `list_agent_brain_imports` - Read recent Agent Brain imports.

### Customer Brain

Customer Brain is singular per personal/org scope, so Customer Brain actions resolve it from session context. Pass `brain_id` only as a verification override.

- `save_customer_memory` - Save one customer memory tied to `contact_id` when known, or to durable source identity when the contact is unknown.
- `search_customer_brain` - Search Customer Brain memories.
- `ingest_customer_brain_text` - Ingest text into Customer Brain.
- `ingest_customer_brain_link` - Ingest a URL into Customer Brain.
- `list_customer_brain_memories` - List recent Customer Brain memories.
- `list_customer_avatars` - Read synthesized Customer Brain avatars.

### Company Brain

- `search_company_brain` - Search Company Brain objects.
- `get_company_brain_objects` - List Company Brain objects.
- `get_company_brain_object_edges` - List relationships between Company Brain objects.
- `propose_company_brain_signal` - Propose company operating knowledge for human review.
- `create_company_brain_object` - Create durable company operating knowledge only from reviewed signal lineage during formation.
- `update_company_brain_object` - Update company operating knowledge.
- `archive_company_brain_object` - Retire a company object.
- `create_company_brain_edge` - Connect company objects.
- `delete_company_brain_edge` - Remove a company object relationship.

## Shared Cortex Tools

Use these for library pages, beliefs, perspectives, logs, and lint. They require explicit `brain_type`; pass `brain_id` for non-default targets.

- `get_brain_pages`, `create_brain_page`, `patch_brain_page`, `update_brain_page`, `archive_brain_page`, `link_brain_pages`, `unlink_brain_pages`
- `get_brain_belief_patterns`, `create_brain_belief_pattern`, `update_brain_belief_pattern`, `archive_brain_belief_pattern`, `merge_brain_belief_patterns`, `connect_brain_belief_to_memory`, `disconnect_brain_belief_from_memory`
- `get_brain_perspectives`, `create_brain_perspective`, `update_brain_perspective`, `archive_brain_perspective`, `connect_brain_belief_to_perspective`, `disconnect_brain_belief_from_perspective`
- `get_brain_timelines`, `get_brain_timeline_items`, `create_brain_timeline`, `upsert_brain_timeline_items`, `archive_brain_timeline`
- `get_brain_log`, `log_brain_event`, `get_brain_lint`, `run_brain_lint`, `resolve_brain_lint`

Timeline actions are Atlas-owned Cortex synthesis tools. Use them for curated milestones and evolution, not ordinary memory capture. Temporal search inputs use `time_mode`, `as_of`, `occurred_from`, `occurred_to`, and `include_historical`; use `as_of` for past truth and `timeline` or `evolution` for change over time.

## Transfer and Cleanup

- `transfer_brain_node` - Copy or move a node between supported brain scopes.
- `transfer_brain_by_source` - Batch copy or move nodes sharing a source title.
- `delete_brain_node` - Delete a node after passing explicit target data.

## Campaign/Space Context

Campaign/Space context is active project context, not a durable Brain write target. Read it when it helps interpret the mission brief or prior deliverables. Store durable knowledge only in User Brain, Agent Brain, Customer Brain, or Company Brain.
