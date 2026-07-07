# Brain Tools Customer And Generic Actions Plan

Last updated: 2026-05-21
Status: implemented in code and Atlas DB rows on 2026-05-21; runtime file sync/regeneration still depends on the next Agent API sync.

## Purpose

This plan covers the remaining Brain tool clarity gaps after the Phase 2 rename/removal work:

1. Make Customer Brain work through first-class `vibey_backend` tools like User Brain, Agent Brain, and Company Brain.
2. Replace or wrap remaining generic Brain actions so agents see a clear family-specific tool model.

Implementation covered the Customer Brain action family, canonical shared Cortex action names, generated docs, OpenClaw exposure, agent-policy package updates, Atlas DB skill/system rows, and targeted tests.

## Current State

### Already Clear

User Brain, Agent Brain, and Company Brain now have explicit agent-facing action names.

| Family | Current explicit actions |
| --- | --- |
| User Brain | `save_user_memory`, `search_user_brain`, `ingest_user_brain_text`, `ingest_user_brain_link`, `ingest_user_brain_document`, `list_user_brain_memories`, `crystallize_user_brain` |
| Agent Brain | `resolve_agent_brain`, `search_agent_brain`, `ingest_agent_brain_text`, `ingest_agent_brain_link`, `list_agent_brain_domains`, `get_agent_brain_gaps`, `list_agent_brain_imports` |
| Company Brain | `get_company_brain_objects`, `get_company_brain_object_edges`, `search_company_brain`, `create_company_brain_object`, `update_company_brain_object`, `archive_company_brain_object`, `create_company_brain_edge`, `delete_company_brain_edge` |

### Customer Brain Before Implementation

Customer Brain exists in the main API and worker pipeline, but it does not have a dedicated `vibey_backend` action family.

Current Customer Brain paths:

- Main API: `/api/brain/customer/status`
- Main API: `/api/brain/customer/memories/text`
- Main API: `/api/brain/customer/memories/link`
- Worker routing: customer call routing, Slack customer forks, customer avatar synthesis
- DB model: `ns_brains.scope = 'customer'`, customer memories with `contact_id`
- Product invariant: there is one Customer Brain per personal workspace or organization scope. Atlas does not need a `resolve_customer_brain` action; handlers can resolve it from current user/org context.

Original agent-facing gap:

- `save_customer_memory` is referenced in import-job prompt text, but it is not a valid artifact action.
- Atlas can only reach customer writes through older session-target behavior or non-tool API paths.

### Generic Brain Tool Gap

These action groups still have generic names or generic target semantics:

- Narrative pages: `get_narrative_pages`, `create_narrative_page`, `patch_narrative_page`, `update_narrative_page`, `archive_narrative_page`, `link_narrative_pages`, `unlink_narrative_pages`
- Beliefs: `get_belief_patterns`, `create_belief_pattern`, `update_belief_pattern`, `archive_belief_pattern`, `merge_belief_patterns`, `connect_belief_to_memory`, `disconnect_belief_from_memory`
- Perspectives: `get_perspectives`, `create_perspective`, `update_perspective`, `archive_perspective`, `connect_belief_to_perspective`, `disconnect_belief_from_perspective`
- Brain operations: `get_brain_log`, `log_brain_event`, `get_brain_lint`, `run_brain_lint`, `resolve_brain_lint`, `delete_brain_node`, `transfer_brain_node`, `transfer_brain_by_source`, `ingest_fathom_meeting`

The main problem is not only naming. Some of these actions still rely on optional `brain_id` and default User Brain fallback instead of an explicit family target.

### Implemented Result

- Customer Brain now has first-class `vibey_backend` actions: `save_customer_memory`, `search_customer_brain`, `ingest_customer_brain_text`, `ingest_customer_brain_link`, `list_customer_brain_memories`, and `list_customer_avatars`.
- Shared Cortex actions now use canonical `*_brain_*` names for pages, beliefs, and perspectives.
- Shared Cortex/log/lint/delete actions have `ACTION_SCHEMAS` entries and require explicit target fields.
- Atlas DB skills and resources have been updated to use the new names.

## Target Model

Agents should not need to infer target family from hidden session state or generic tool names.

Target rules:

- If the user wants personal memory, Atlas uses User Brain tools.
- If the user wants agent expertise, Atlas uses Agent Brain tools.
- If the user wants company operating knowledge, Atlas uses Company Brain tools.
- If the user wants customer cognition, Atlas uses Customer Brain tools.
- If a tool can work across multiple families, its schema must require `brain_type` plus the required target id.
- Campaign/Space remains context only, not a Brain family.

## Skill Update Rules

Use the `/claude-skills` and `/context_eng` guidance before every Atlas skill/system text update.

Rules:

- Atlas skills are database-first. Update Supabase `agent_definitions`, `agent_skills`, and `agent_skill_resources`; do not rely on filesystem-only edits.
- Read the skill-writing reference before rewriting Atlas skill bodies.
- Keep skill bodies lean. Move long tool tables and examples into resources when the main body gets noisy.
- Explain why a routing rule exists instead of only listing commands.
- Use one term per concept: `User Brain`, `Agent Brain`, `Company Brain`, `Customer Brain`, and `Campaign/Space context`.
- Do not document tools that do not exist yet.
- Do not keep compatibility aliases in Atlas instructions unless the code intentionally supports those aliases.
- Include only canonical examples.
- Re-read the final skill text as if Atlas is seeing it for the first time and remove contradictions, duplicate terms, and stale tool names.
- Verify DB skill rows after updates with old-name, Campaign Brain phrase, and canonical-name queries.

## Phase 1: Add Customer Brain Tool Family

### Step 1. Freeze Customer Brain Action Names

Recommended first set:

| New action | Purpose |
| --- | --- |
| `save_customer_memory` | Save one customer memory tied to a contact. |
| `search_customer_brain` | Search customer memories/snapshots by query. |
| `ingest_customer_brain_text` | Ingest a text source into Customer Brain. |
| `ingest_customer_brain_link` | Ingest a URL into Customer Brain. |
| `list_customer_brain_memories` | List recent Customer Brain memories. |
| `list_customer_avatars` | Read synthesized customer avatars for a Customer Brain. |

Required decision:

- Keep `contact_id` required for `save_customer_memory`.
- Allow optional `contact_id` for broader customer research only if the product wants customer-level memory not tied to a known contact.
- Do not add `resolve_customer_brain`: Customer Brain is singular per personal/org scope, so each Customer Brain action resolves the target internally from session context and optional `brain_id` only for verification.

### Step 2. Write Failing Tests First

Add or extend tests for:

- Action DTO includes Customer Brain actions.
- Action registry maps Customer Brain actions.
- Action schemas exist for every Customer Brain action.
- `save_customer_memory` requires `content`, `memory_type`, and `contact_id`.
- `search_customer_brain` requires `query`.
- Customer Brain actions are available to Atlas/system brain.
- Generic `save_user_memory` cannot write Customer Brain memories outside a customer brain job compatibility path.
- Import-job customer prompts reference only actions that exist.

### Step 3. Add Action DTO, Registry, And Schemas

Files:

- `apps/agent-api/src/modules/artifacts/dtos/artifact-action.dto.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`

Rules:

- Add action names only after tests assert them.
- Do not add aliases for old or fake names.
- Ensure `describe_action` returns exact customer contracts.

### Step 4. Add Runtime Handler

Create a dedicated handler service, or add a focused customer section if extraction is not worth it yet.

Recommended service:

- `apps/agent-api/src/modules/artifacts/services/artifact-customer-brain.service.ts`

Handler responsibilities:

- Resolve Customer Brain internally from current user/org context.
- Accept explicit `brain_id` only as a verification override; it must match the current personal/org Customer Brain.
- Verify `brain_id` has `scope = 'customer'`.
- Verify org role for writes.
- Validate `contact_id` belongs to the current personal/org workspace.
- Write customer memories with `contact_id`, `tags: ['customer_brain']`, source metadata, and embedding.
- Search only the resolved Customer Brain.
- List only the resolved Customer Brain.
- Read customer avatars for that brain.

### Step 5. Update Import-Job Prompt Text

File:

- `apps/api/src/modules/brain/services/brain-import-jobs.service.ts`

Required change:

- Keep the customer target prompt, but make it call the real `save_customer_memory` action after the action exists.
- Keep the contact filtering rules.
- Add a test that fails if the prompt references an action absent from the artifact action DTO.

### Step 6. Update Policy And OpenClaw

Files:

- `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts`
- `docker/tools/vibey-backend/index.ts`
- `packages/agent-policy/src/actions.ts`
- `packages/agent-policy/src/registry.ts`
- `packages/agent-policy/src/action-contracts.ts`
- `packages/agent-policy/src/domains.ts`

Rules:

- Add a Customer Brain read category.
- Add a Customer Brain write category.
- Give Atlas explicit access.
- Do not give generic memory access permission to Customer Brain writes.

### Step 7. Update Generated Docs And Atlas DB Skills

Files:

- `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`
- `apps/agent-api/src/modules/agent-sync/services/vibey-api-skill-generator.ts`
- Supabase `agent_definitions`
- Supabase `agent_skills`
- Supabase `agent_skill_resources`

Rules:

- Customer Brain docs must list real customer actions only.
- Remove wording that says customer writes need a "supported route" once the route exists.
- Generated `vibey-api` docs must not mention Campaign Brain as a target.

### Step 8. Verify Customer Brain

Required checks:

- `describe_action(save_customer_memory)` returns a schema.
- Atlas can save a customer memory with a valid `contact_id`.
- Atlas cannot save a customer memory without `contact_id` when contact is required.
- Atlas cannot write Customer Brain using `save_user_memory`.
- `search_customer_brain` returns only customer memory rows for the target brain.
- Customer import jobs no longer reference missing actions.

## Phase 2: Rename Or Wrap Generic Cortex Tools

### Step 1. Split Actions Into Two Buckets

Bucket A: rename because the current name is pre-Phase-2 language.

| Current action | New action |
| --- | --- |
| `get_narrative_pages` | `get_brain_pages` |
| `create_narrative_page` | `create_brain_page` |
| `patch_narrative_page` | `patch_brain_page` |
| `update_narrative_page` | `update_brain_page` |
| `archive_narrative_page` | `archive_brain_page` |
| `link_narrative_pages` | `link_brain_pages` |
| `unlink_narrative_pages` | `unlink_brain_pages` |
| `get_belief_patterns` | `get_brain_belief_patterns` |
| `create_belief_pattern` | `create_brain_belief_pattern` |
| `update_belief_pattern` | `update_brain_belief_pattern` |
| `archive_belief_pattern` | `archive_brain_belief_pattern` |
| `merge_belief_patterns` | `merge_brain_belief_patterns` |
| `connect_belief_to_memory` | `connect_brain_belief_to_memory` |
| `disconnect_belief_from_memory` | `disconnect_brain_belief_from_memory` |
| `get_perspectives` | `get_brain_perspectives` |
| `create_perspective` | `create_brain_perspective` |
| `update_perspective` | `update_brain_perspective` |
| `archive_perspective` | `archive_brain_perspective` |
| `connect_belief_to_perspective` | `connect_brain_belief_to_perspective` |
| `disconnect_belief_from_perspective` | `disconnect_brain_belief_from_perspective` |

Bucket B: keep name, but require explicit target schema.

| Action | Required target change |
| --- | --- |
| `get_brain_log` | Require `brain_type`; require `brain_id` unless `brain_type = user_default`. |
| `log_brain_event` | Require `brain_type`; require authorized writable target. |
| `get_brain_lint` | Require `brain_type`; require target verification. |
| `run_brain_lint` | Require `brain_type`; require target verification. |
| `resolve_brain_lint` | Verify lint row belongs to the requested brain target. |
| `delete_brain_node` | Require `brain_type`, target id, `node_type`, and `node_id`. |
| `transfer_brain_node` | Support explicit source/target families beyond user/agent only, or explicitly reject unsupported families in schema. |
| `transfer_brain_by_source` | Same as transfer node. |
| `ingest_fathom_meeting` | Replace generic `targetBrain` with explicit `target_brain` enum and family-specific required ids. |

### Step 2. Add Failing Tests For New Generic-Replacement Names

Test layers:

- Action DTO tests
- Registry tests
- Schema tests
- Handler target enforcement tests
- Generated-doc tests
- OpenClaw bridge tests
- Policy tests

Required assertions:

- New action names exist.
- Old generic names are absent from agent-facing action lists after replacement.
- Every new action has an `ACTION_SCHEMAS` entry.
- `brain_type` is required where the action can target multiple families.
- Omitted target does not silently fall back except for explicit `brain_type = user_default`.
- Cross-brain links and belief-memory connections are rejected.
- Page updates verify page ownership through the requested brain target.

### Step 3. Add Target Resolver

Create one shared artifact target resolver for Brain tool handlers.

Suggested helper:

- `resolveArtifactBrainTarget(input, sessionKey, allowedFamilies)`

Inputs:

- `brain_type`
- `brain_id`
- `agent_id` or `agent_key`
- customer target data if needed
- current user/org/session

Outputs:

- `brainId`
- `brainType`
- `ownerId`
- `orgId`
- `canRead`
- `canWrite`

Rules:

- No hidden Agent Brain to User Brain fallback.
- No hidden explicit `brain_id` to default fallback.
- Company Brain must require org context.
- Customer Brain must resolve only customer-scope brains.
- Shared Brain reads remain Phase 3 behavior unless explicitly added.

### Step 4. Migrate Handler Internals

Keep internal method names if useful, but agent-facing action names must be canonical.

Required handler fixes:

- Page update/archive/link/unlink must verify target brain before writing.
- Link/unlink must verify both pages belong to the same authorized brain.
- Belief-memory connect must verify memory belongs to the same brain.
- `resolve_brain_lint` must verify lint result belongs to the authorized brain.
- `delete_brain_node` must verify node belongs to the requested authorized brain.
- `transfer_brain_node` and `transfer_brain_by_source` must reject unsupported source/target families clearly.

### Step 5. Remove Old Generic Agent-Facing Names

After new names and tests pass:

- Remove old generic names from `VALID_ACTIONS`.
- Remove old generic mappings from `ACTION_METHOD_MAP`.
- Remove old generic names from OpenClaw supported actions.
- Remove old generic names from policy packages.
- Remove old generic examples from generated docs.

Do not keep aliases unless the user explicitly decides backwards compatibility is required.

### Step 6. Update Generated Docs

Files:

- `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`
- `apps/agent-api/src/modules/agent-sync/services/vibey-api-skill-generator.ts`

Required changes:

- Brain routing should list User, Agent, Company, and Customer Brain.
- Generated docs must not say `agent/campaign/customer brain`.
- Generated docs must not mention Campaign Brain as a target.
- Generic page/cognition docs must point to canonical `*_brain_*` names.
- Examples must include `brain_type` where required.

### Step 7. Update Atlas DB Skills

After code and generated docs are aligned:

- Update Atlas `TOOLS.md`.
- Update Atlas `brain-operations`.
- Update Atlas `knowledge-intake`.
- Update Atlas Brain Library and Pattern Analysis references.

Rules:

- Atlas skills must describe only real actions.
- Customer Brain should no longer say "if tools are exposed" once tools exist.
- Campaign/Space remains context only.
- Apply the `/claude-skills` database-first workflow and `/context_eng` writing checklist before updating these rows.

### Step 8. Verify Generic Tool Cleanup

Required verification:

- No old generic agent-facing action names remain in action DTO, registry, schemas, OpenClaw, generated docs, policy, or Atlas DB skills.
- All replacement actions have schemas.
- All multi-family actions require `brain_type`.
- No handler silently falls back to User Brain when a non-user target is expected.
- Page, lint, belief, perspective, delete, and transfer operations reject out-of-target ids.

## Suggested Execution Order

1. Customer Brain action family tests.
2. Customer Brain action DTO/registry/schema/handler.
3. Customer Brain policy/OpenClaw/generated docs.
4. Customer Brain import-job prompt fix.
5. Customer Brain verification.
6. Generic tool replacement tests.
7. Generic tool DTO/registry/schema additions.
8. Shared target resolver.
9. Handler enforcement fixes.
10. Remove old generic names.
11. Generated docs cleanup.
12. Atlas DB skill cleanup.
13. Final verification.

## Hard Stop Criteria

Do not mark this complete until:

- `save_customer_memory` exists and works.
- Customer Brain search/list/ingest actions exist or are intentionally deferred in this document.
- The customer import prompt references only valid actions.
- Generic page/belief/perspective actions are renamed or wrapped with canonical Brain names.
- Every Brain action has `ACTION_SCHEMAS` coverage.
- Multi-family actions require explicit target fields.
- Campaign Brain is absent from agent-facing tools and docs.
- Atlas DB skills mention only real actions.
- Targeted tests pass.

## Open Decisions

1. Should `save_customer_memory` require `contact_id` in every case?
2. Should Customer Brain support free-floating customer-market memories without contact linkage?
3. Should page/belief/perspective tools become family-specific names, or one `brain_type`-based canonical name per operation?
4. Should old generic names be removed immediately, or hidden from agents while kept internally for one deploy?
5. Should transfer tools support Customer and Company Brain now, or reject them until a separate transfer model is designed?
