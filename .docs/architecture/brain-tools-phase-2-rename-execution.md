# Brain Tools Phase 2 Rename Execution

Last updated: 2026-05-21

## Purpose

This document is the Phase 2 execution plan for renaming and enforcing Brain tools around explicit brain families.

The goal is zero ambiguous Brain tool calls before shared-brain context, picker UI, or sharing UX is added.

Campaign Brain is removed from the Brain model and must not be renamed into the new model. Phase 2 removes Campaign Brain from agent/Atlas tools, generated docs, policy exposure, runtime prompts, and product docs. Campaign product features can still exist, but Campaign Brain as a brain family is no longer a thing in the app.

Phase 2 must be TDD first:

1. Write failing tests for the new tool contracts.
2. Add new action names and schemas.
3. Route new names to existing handlers only after tests prove target selection is explicit.
4. Remove legacy action names instead of keeping aliases.
5. Stop when old ambiguous behavior can no longer silently write or read the wrong brain.

## Non-Negotiable Rules

- No hidden fallback from Agent Brain to User Brain.
- No hidden fallback from explicit `brain_id` to default brain.
- No cross-family names like `search_sk_entries` for user-facing Brain semantics.
- No Brain action without a schema entry.
- No generated agent doc without matching schema and handler behavior.
- No handler-level ownership check that disagrees with main API Brain permission semantics.
- No Campaign Brain tools, docs, prompts, or Atlas permissions.
- No old Brain tool aliases. Old names must be removed so agents cannot keep using confusing contracts.
- No separate live voice Brain vocabulary. Live voice tools must use the same Phase 2 naming model.
- No Phase 3 shared-brain context until this file's hard-stop checks pass.

## Final Brain Families

| Family | Meaning | Writes Allowed In Phase 2 | Shared Brain Handling |
| --- | --- | --- | --- |
| User Brain | The authenticated user's personal default brain. | Yes, only through user-brain tools. | Not yet. Phase 3 adds shared reads. |
| Agent Brain | An agent SK/knowledge brain. | Yes, only with explicit `brain_id` or resolved agent identity. | Not yet. |
| Customer Brain | Org customer brain / customer-avatar memory. | Yes, only through customer-brain tools. | Not yet. |
| Company Brain | Org company cortex / company knowledge graph. | Yes, only through company-brain/cortex tools. | Not applicable as personal share. |
| Shared Brain | Another user's accessible personal brain. | No chat writes in Phase 2. | Phase 3 read-only selected context. |

Deprecated family:

| Family | Phase 2 decision | Required result |
| --- | --- | --- |
| Campaign Brain | Remove from the agent/Atlas Brain tool model. | No agent-facing Campaign Brain actions, generated docs, policy domains, OpenClaw actions, or Brain routing prompts remain. |

## New Canonical Action Names

### User Brain

| Current action | New action | Phase 2 behavior |
| --- | --- | --- |
| `save_memory` | `save_user_memory` | Writes only to authenticated user's personal default user brain. |
| `search_memory` | `search_user_brain` | Searches only authenticated user's personal default user brain. |
| `trigger_crystallization` | `crystallize_user_brain` | Crystallizes only authenticated user's personal default user brain. |
| `ingest_brain_text` | `ingest_user_brain_text` | Ingests text only into personal default user brain. |
| `ingest_brain_link` | `ingest_user_brain_link` | Ingests URL only into personal default user brain. |
| `ingest_user_document` | `ingest_user_brain_document` | Normalizes document ingest under user-brain naming. |
| `ingest_user_link` | `ingest_user_brain_link` | Alias target should collapse into the canonical link action. |
| `assign_memory_source` | `assign_user_memory_source` | Assigns source metadata only on user's personal default brain. |
| `list_recent_memories` | `list_user_brain_memories` | Lists recent personal default user brain memories only. |

### Agent Brain

| Current action | New action | Phase 2 behavior |
| --- | --- | --- |
| `resolve_agent_sk_brain` | `resolve_agent_brain` | Resolves an agent knowledge brain by explicit agent identity or current agent session. |
| `search_sk_entries` | `search_agent_brain` | Requires `brain_id` or current agent session. No user-default fallback. |
| `ingest_sk_text` | `ingest_agent_brain_text` | Requires `brain_id` or current agent session, plus source metadata. |
| `ingest_sk_link` | `ingest_agent_brain_link` | Requires `brain_id` or current agent session. |
| `list_brain_domains` | `list_agent_brain_domains` | Requires agent `brain_id` or current agent session. |
| `get_brain_gaps` | `get_agent_brain_gaps` | Requires agent `brain_id` or current agent session. |
| `list_brain_imports` | `list_agent_brain_imports` | Requires agent `brain_id` or current agent session. |

### Campaign Brain Removal

Campaign Brain actions are removed. Do not create `search_campaign_brain`, `ingest_campaign_brain_file`, or `ingest_campaign_brain_url`.

| Current action | Phase 2 action | Required result |
| --- | --- | --- |
| `search_campaign_knowledge` | Remove | No action DTO, registry mapping, schema, OpenClaw enum, generated docs, capability policy grant, or Atlas allowlist entry. |
| `ingest_campaign_file` | Remove | No action DTO, registry mapping, schema, OpenClaw enum, generated docs, capability policy grant, Atlas contract, or internal prompt suggesting this action. |
| `ingest_campaign_url` | Remove | No action DTO, registry mapping, schema, OpenClaw enum, generated docs, capability policy grant, Atlas contract, or internal prompt suggesting this action. |
| Campaign Brain docs/examples | Remove | No generated agent instructions describe Campaign Brain as a Brain family. |
| Campaign Brain policy domains | Remove/rename | `read_brain_campaign` must not grant Brain access. Replace with family-specific User/Agent/Company/Customer Brain domains. |

Keep unrelated campaign product actions separate. Actions like `create_campaign`, `get_campaign`, `list_campaigns`, `update_campaign_context`, ad campaign actions, and campaign team assignment are not Campaign Brain tools.

### Meeting / External Ingest

| Current action | New action | Phase 2 behavior |
| --- | --- | --- |
| `ingest_fathom_meeting` | `ingest_brain_fathom_meeting` | Requires `target_brain` family and family-specific target id when not user default. Campaign target is not valid. |
| `ingest_fireflies_transcript` | `ingest_brain_fireflies_transcript` | If still mission-handled, schema must say so and handler must return a typed no-op result. |

### Brain Stats / Scope Listing

| Current action | New action | Phase 2 behavior |
| --- | --- | --- |
| `get_brain_stats` | `get_brain_stats` | Keep name only if schema requires `brain_type`; otherwise split by family. |
| `list_brain_scopes` | `list_available_brain_scopes` | Lists owned user, agent, customer, and company scopes. No Campaign Brain. No shared brains until Phase 3. |

### Narrative Pages / Cortex Max

| Current action | New action | Phase 2 behavior |
| --- | --- | --- |
| `get_narrative_pages` | `get_brain_pages` | Requires `brain_type` and `brain_id` unless default user brain is explicitly requested. |
| `create_narrative_page` | `create_brain_page` | Requires explicit writable brain target. |
| `patch_narrative_page` | `patch_brain_page` | Requires page id and scoped brain target verification. |
| `update_narrative_page` | `update_brain_page` | Requires page id and scoped brain target verification. |
| `archive_narrative_page` | `archive_brain_page` | Requires page id and scoped brain target verification. |
| `link_narrative_pages` | `link_brain_pages` | Requires both pages to belong to the same authorized brain target. |
| `unlink_narrative_pages` | `unlink_brain_pages` | Requires both pages to belong to the same authorized brain target. |
| `get_brain_log` | `get_brain_log` | Keep name. Require `brain_type` and explicit target. |
| `log_brain_event` | `log_brain_event` | Keep name. Require `brain_type` and explicit writable target. |
| `get_brain_lint` | `get_brain_lint` | Keep name. Require `brain_type` and explicit target. |
| `run_brain_lint` | `run_brain_lint` | Keep name. Require `brain_type` and explicit writable target. |
| `resolve_brain_lint` | `resolve_brain_lint` | Keep name. Must verify lint row belongs to authorized target. |

### Cognition / Beliefs / Perspectives

| Current action | New action | Phase 2 behavior |
| --- | --- | --- |
| `get_belief_patterns` | `get_brain_belief_patterns` | Requires explicit brain target. |
| `create_belief_pattern` | `create_brain_belief_pattern` | Requires explicit writable brain target. |
| `update_belief_pattern` | `update_brain_belief_pattern` | Requires scoped row verification. |
| `archive_belief_pattern` | `archive_brain_belief_pattern` | Requires scoped row verification. |
| `merge_belief_patterns` | `merge_brain_belief_patterns` | Requires both rows in same authorized target. |
| `connect_belief_to_memory` | `connect_brain_belief_to_memory` | Requires belief and memory to belong to same authorized brain. |
| `disconnect_belief_from_memory` | `disconnect_brain_belief_from_memory` | Requires belief and memory to belong to same authorized brain. |
| `get_perspectives` | `get_brain_perspectives` | Requires explicit brain target. |
| `create_perspective` | `create_brain_perspective` | Requires explicit writable brain target. |
| `update_perspective` | `update_brain_perspective` | Requires scoped row verification. |
| `archive_perspective` | `archive_brain_perspective` | Requires scoped row verification. |
| `connect_belief_to_perspective` | `connect_brain_belief_to_perspective` | Requires both rows in same authorized target. |
| `disconnect_belief_from_perspective` | `disconnect_brain_belief_from_perspective` | Requires both rows in same authorized target. |

### Company Brain

Company Brain already has the clearest family-specific model. Normalize naming without losing meaning.

| Current action | New action | Phase 2 behavior |
| --- | --- | --- |
| `get_company_cortex_objects` | `get_company_brain_objects` | Requires org context and company brain resolver. |
| `get_company_cortex_object_edges` | `get_company_brain_object_edges` | Requires org context and company brain resolver. |
| `search_company_cortex` | `search_company_brain` | Requires org context and company brain resolver. |
| `create_company_cortex_object` | `create_company_brain_object` | Requires org context and writable company brain policy. |
| `update_company_cortex_object` | `update_company_brain_object` | Requires object to belong to company brain. |
| `archive_company_cortex_object` | `archive_company_brain_object` | Requires object to belong to company brain. |
| `create_company_cortex_edge` | `create_company_brain_edge` | Requires both objects to belong to company brain. |
| `delete_company_cortex_edge` | `delete_company_brain_edge` | Requires edge to belong to company brain. |

### Customer Brain

Customer Brain needs a first-class tool family.

| Current action | New action | Phase 2 behavior |
| --- | --- | --- |
| Special `save_memory` in customer brain jobs | `save_customer_memory` | Requires customer brain context or explicit customer brain target. |
| No canonical action | `search_customer_brain` | Requires org/customer brain resolver. |
| No canonical action | `ingest_customer_brain_text` | Requires org/customer brain resolver and writable policy. |
| No canonical action | `ingest_customer_brain_link` | Requires org/customer brain resolver and writable policy. |
| No canonical action | `list_customer_brain_memories` | Requires org/customer brain resolver. |

### Delete

| Current action | New action | Phase 2 behavior |
| --- | --- | --- |
| `delete_brain_node` | `delete_brain_node` | Keep name. Require `brain_type`, target id, `node_type`, and scoped ownership verification. |

## Legacy Alias Policy

Legacy aliases are not allowed in Phase 2.

| Legacy class | Policy |
| --- | --- |
| Ambiguous write names like `save_memory` | Remove. Replace with `save_user_memory`. |
| Ambiguous read names like `search_memory` | Remove. Replace with `search_user_brain`. |
| SK names like `search_sk_entries` | Remove. Replace with `search_agent_brain`. |
| Duplicate user ingest names | Remove duplicate names. Keep only canonical user-brain names. |
| Company Cortex names | Remove old `company_cortex` tool names if `company_brain` names are introduced. Do not keep both. |
| Campaign Brain names like `search_campaign_knowledge`, `ingest_campaign_file`, `ingest_campaign_url` | No alias. Remove from agents/Atlas. These names must fail as unavailable actions after Phase 2. |

Removal rules:

- Old names must be absent from action DTOs.
- Old names must be absent from action registry.
- Old names must be absent from action schemas.
- Old names must be absent from OpenClaw `SUPPORTED_ACTIONS`.
- Old names must be absent from generated docs and examples.
- Old names must be absent from capability policy and shared policy packages.
- Tests must assert old names are unavailable.

## Campaign Brain Removal Surface

Research found Campaign Brain references in these surfaces. Phase 2 must remove agent/Atlas exposure from all of them.

| Surface | Files / references | Required Phase 2 change |
| --- | --- | --- |
| Action DTO | `apps/agent-api/src/modules/artifacts/dtos/artifact-action.dto.ts` | Remove `search_campaign_knowledge`, `ingest_campaign_file`, and `ingest_campaign_url`. |
| Action registry | `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts` | Remove mappings for `searchCampaignKnowledge`, `ingestCampaignFile`, and `ingestCampaignUrl`. |
| Action schemas | `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts` | Remove schema entries for campaign ingest actions. |
| Runtime handlers | `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.ts` | Remove handler entries and private campaign knowledge ingest/search methods from the agent-facing Brain tool path. |
| Runtime prompts | `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-team-brain.service.ts`, `apps/api/src/modules/brain/services/brain-import-jobs.service.ts` | Remove guidance that tells agents to use `ingest_campaign_file` or `ingest_campaign_url`. |
| Generated action docs | `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts` | Remove `search_campaign_knowledge` docs and Campaign Brain examples from Brain stats/list scopes/routing copy. |
| Generated skill routing | `apps/agent-api/src/modules/agent-sync/services/vibey-api-skill-generator.ts` | Remove Campaign Brain from Brain routing instructions. |
| OpenClaw bridge | `docker/tools/vibey-backend/index.ts` | Remove campaign Brain actions from `SUPPORTED_ACTIONS`. |
| Capability policy | `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts` | Remove `search_campaign_knowledge` from `CAT_BRAIN_READ` and `BRAIN_SCHOLAR_ALLOWED_ACTIONS`; ensure Atlas/system_brain no longer receives Campaign Brain tools. |
| Shared agent policy package | `packages/agent-policy/src/actions.ts`, `packages/agent-policy/src/registry.ts`, `packages/agent-policy/src/action-contracts.ts`, `packages/agent-policy/src/domains.ts`, `packages/agent-policy/src/role-defaults.ts`, `packages/agent-policy/src/system-agent-contracts.ts` | Remove campaign Brain action definitions/contracts and stop using `read_brain_campaign` for Brain access. Keep non-Brain campaign product domains only if still used. |
| Tests | Existing action registry/schema/RBAC/policy tests | Update tests to assert campaign Brain actions are absent and unavailable to Atlas. |
| Product/docs copy | `apps/docs/content/**`, relevant web labels | Remove user-facing Campaign Brain docs/copy in Phase 2 so the app no longer teaches Campaign Brain as a product concept. |

Database tables and backend services that store historical `campaign_nodes` can remain only as dormant legacy storage if still needed by migrations, demo seeders, transfer history, or non-agent product cleanup. They must not be exposed to agents/Atlas as a Brain family.

## TDD First Test Plan

### Test Layer 1: Action Registry

Create or extend tests for `artifact-action.registry.ts`.

Required failing tests before implementation:

- New canonical action names exist in the action registry.
- Old Brain tool names are absent from the action registry.
- Campaign Brain actions are absent from the registry.
- User Brain actions are marked as global scope actions only when they intentionally bypass campaign/space defaults.
- Agent Brain actions do not inherit user default scope.
- Company and customer actions are categorized separately from generic memory actions.

### Test Layer 2: Action Schemas

Create or extend tests for `artifact-action-schemas.ts`.

Required failing tests before implementation:

- Every Brain action in the registry has an `ACTION_SCHEMAS` entry.
- `save_user_memory` requires `content` and `memory_type`.
- `search_user_brain` requires `query`.
- `ingest_user_brain_text` requires `title` and either `text` or `content`.
- `ingest_user_brain_link` requires `url`.
- `resolve_agent_brain` requires either explicit agent identity or current agent context.
- `search_agent_brain` rejects calls without `brain_id` and without current agent session.
- `ingest_agent_brain_text` requires `brain_id` or current agent session, plus `title`, text/content, and `sourceType`.
- `ingest_agent_brain_link` requires `brain_id` or current agent session and `url`.
- Campaign Brain schemas do not exist.
- Company tools require org context.
- Customer tools require customer brain context or explicit customer target.
- `get_brain_pages` requires `brain_type`; requires `brain_id` unless `brain_type = user_default`.
- `delete_brain_node` requires `brain_type`, target id, `node_type`, and `node_id`.

### Test Layer 3: Handler Enforcement

Create or extend tests for:

- `ArtifactLegacyTeamBrainService`
- `ArtifactBrainScholarService`
- `ArtifactCompanyCortexService`
- New customer-brain handler path if extracted

Required failing tests before implementation:

- `search_agent_brain` cannot fall back to user default when no agent brain target exists.
- `list_agent_brain_domains`, `get_agent_brain_gaps`, and `list_agent_brain_imports` cannot fall back to user default.
- Explicit `brain_id` is authorized before reads.
- Explicit `brain_id` is authorized before writes.
- Narrative page writes verify page ownership through the requested brain target.
- Lint resolution verifies lint result ownership through the requested brain target.
- Belief-memory connections reject cross-brain links.
- Company Brain object/edge writes verify org and company brain.
- Customer Brain writes never route through generic `save_memory`.
- `search_campaign_knowledge`, `ingest_campaign_file`, and `ingest_campaign_url` are unavailable to Atlas/Brain Scholar and all managed agents.

### Test Layer 4: Generated Agent Docs

Create or extend tests around `vibey-api-action-docs.ts` and `vibey-api-skill-generator.ts`.

Required failing tests before implementation:

- Generated docs list canonical names by family.
- Generated docs do not recommend `save_memory`, `search_memory`, or `search_sk_entries`.
- Generated docs do not mention old Brain tool names as supported aliases.
- Generated docs say User Brain, Agent Brain, Customer Brain, and Company Brain are separate tool families.
- Generated docs do not mention Campaign Brain as an available Brain family.
- Generated docs include examples for every canonical write and search action.
- Generated docs say ambiguous target requests must ask for clarification or use explicit selected context once Phase 3 exists.

### Test Layer 5: OpenClaw Bridge

Create or extend tests around `docker/tools/vibey-backend/index.ts`.

Required failing tests before implementation:

- `SUPPORTED_ACTIONS` includes canonical names.
- `SUPPORTED_ACTIONS` does not include Campaign Brain actions.
- `SUPPORTED_ACTIONS` does not include old Brain tool aliases.
- Brain schema validation failures are surfaced before or by agent-api consistently.
- Agent-specific `ALLOWED_ACTIONS.json` cannot expose old names without canonical equivalents.

### Test Layer 6: Capability Policy

Create or extend tests for `artifact-capability.policy.ts`.

Required failing tests before implementation:

- User Brain read/write policies are separate from Agent Brain read/write policies.
- Company Brain read/write policies are separate from User Brain memory policies.
- Customer Brain read/write policies are separate from generic memory policies.
- Builder agents do not get customer/company write actions by generic memory category.
- Atlas/system_brain does not get Campaign Brain read/write actions.
- Brain Scholar / Atlas gets the full explicit Brain action set intentionally.

### Test Layer 7: Live Voice Rename

Live voice Brain tools are in scope for Phase 2 and must use the same naming model as chat tools.

Required failing tests:

- Live voice `save_memory` becomes `save_user_memory`.
- Live voice `search_memory` / `search_brain` become `search_user_brain` or another canonical family-specific search name.
- Live voice `get_brain_stats` is aligned with the canonical stats contract.
- Live voice `list_recent_memories` becomes `list_user_brain_memories`.
- Live voice `trigger_crystallization` becomes `crystallize_user_brain`.
- Live voice `save_to_other_brain`, `copy_memory_to_brain`, and `move_memory_to_brain` are removed or replaced with explicit Phase 2 family-safe actions.
- `save_to_other_brain` cannot write to unauthorized or shared brains.
- `list_available_brains` matches the Phase 2 owned-brain scope model.

## Execution Order

### Step 1: Freeze Contract

- Confirm this document's canonical names.
- Confirm old Brain tool aliases are removed, not deprecated.
- Confirm live voice Brain tools are renamed in Phase 2.
- Confirm Campaign Brain removal is in scope for agents/Atlas and that no replacement Campaign Brain action names will be created.
- Do not edit runtime behavior before these decisions are locked.

### Step 2: Write Tests

- Add registry tests.
- Add schema coverage tests.
- Add handler enforcement tests.
- Add generated-doc tests.
- Add capability policy tests.
- Add OpenClaw bridge tests.
- Add Campaign Brain removal tests.
- Run only targeted tests first.

### Step 3: Add Canonical Names

Files:

- `apps/agent-api/src/modules/artifacts/dtos/artifact-action.dto.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`
- `docker/tools/vibey-backend/index.ts`

Rules:

- Add canonical names.
- Add schemas for every canonical name.
- Remove old action names instead of adding aliases.
- Remove Campaign Brain names instead of renaming them.
- Do not change generated docs before schema tests exist.

### Step 4: Enforce Handler Targets

Files:

- `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-legacy-team-brain.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-company-cortex.service.ts`
- `apps/api/src/modules/brain/services/brain-permissions.service.ts`

Rules:

- User Brain handlers resolve only personal default brain.
- Agent Brain handlers require explicit agent brain target or current agent session.
- Customer Brain handlers do not piggyback on generic user memory action names.
- Company Brain handlers keep org/company resolver guarantees.
- Campaign Brain handlers are removed from agent/Atlas tool dispatch.
- Shared Brain behavior remains blocked until Phase 3.

### Step 5: Update Generated Docs

Files:

- `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`
- `apps/agent-api/src/modules/agent-sync/services/vibey-api-skill-generator.ts`

Rules:

- Group docs by brain family.
- Show canonical names only in primary examples.
- Do not document old aliases.
- Remove Campaign Brain from generated docs, examples, and Brain routing instructions.
- Remove warnings that say wrong action silently writes to wrong brain; after Phase 2, wrong actions must fail.

### Step 6: Update Policy

Files:

- `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts`
- Any agent-specific `ALLOWED_ACTIONS.json`

Rules:

- Replace generic Brain categories with family-specific read/write categories.
- Builder access must be explicit.
- Brain Scholar / Atlas broad access must still be explicit by family.
- Remove Campaign Brain from Atlas/system_brain and shared `@vibey/agent-policy` Brain domains/contracts.

### Step 7: Verify OpenClaw Runtime Surface

Files:

- `docker/tools/vibey-backend/index.ts`

Rules:

- Tool enum exposes canonical names.
- Old names are absent.
- Campaign Brain action names are absent.
- Action descriptions/examples match generated docs and schemas.

## Zero-Failure Checklist

Before Phase 2 is done:

- [ ] Every canonical Brain action exists in action DTOs.
- [ ] Every canonical Brain action exists in action registry.
- [ ] Every canonical Brain action has schema preflight.
- [ ] Every schema-required field matches handler-required fields.
- [ ] Every generated doc example passes schema validation.
- [ ] Every old Brain action name is removed.
- [ ] No deprecated Brain aliases exist.
- [ ] Campaign Brain actions are removed, not aliased.
- [ ] Atlas/system_brain cannot call `search_campaign_knowledge`, `ingest_campaign_file`, or `ingest_campaign_url`.
- [ ] OpenClaw does not expose Campaign Brain actions.
- [ ] Generated docs do not mention Campaign Brain as an available Brain family.
- [ ] Runtime prompts no longer recommend Campaign Brain ingest/search actions.
- [ ] Live voice Brain tools use the same canonical names as chat Brain tools.
- [ ] No Agent Brain action can fall back to user default.
- [ ] No User Brain action can target agent/customer/company brains or any deprecated Campaign Brain path.
- [ ] No Customer Brain action routes through generic `save_memory`.
- [ ] No Company Brain action is granted by generic memory policy.
- [ ] Explicit `brain_id` reads are authorized.
- [ ] Explicit `brain_id` writes are authorized.
- [ ] Narrative page, lint, belief, perspective, and delete actions verify scoped ownership.
- [ ] OpenClaw exposes the same canonical surface as agent-api.
- [ ] Generated `vibey-api` docs match action schemas.
- [ ] Targeted tests pass.
- [ ] Hard-stop verification below is complete.

## Hard-Stop Verification

Phase 2 cannot be considered complete until these checks pass:

1. `save_user_memory` writes only to the personal default user brain.
2. `search_user_brain` searches only the personal default user brain.
3. `search_agent_brain` with no `brain_id` and no agent session fails.
4. `ingest_agent_brain_text` with no `brain_id` and no agent session fails.
5. `search_customer_brain` cannot be called by generic memory capability alone.
6. `search_company_brain` requires org/company brain context.
7. `search_campaign_knowledge`, `ingest_campaign_file`, and `ingest_campaign_url` are unavailable actions for Atlas/Brain Scholar and managed agents.
8. No `search_campaign_brain`, `ingest_campaign_brain_file`, or `ingest_campaign_brain_url` replacement actions exist.
9. `get_brain_pages` cannot read arbitrary page ids outside the authorized brain target.
10. `connect_brain_belief_to_memory` rejects cross-brain links.
11. `delete_brain_node` rejects node ids outside the authorized brain target.
12. Generated docs do not recommend old ambiguous names or Campaign Brain names.
13. Live voice Brain tools no longer expose old names.
14. Old Brain names fail as unavailable actions instead of working as aliases.

## Phase 2 Completion Definition

Phase 2 is complete only when Brain tools are explicit by family, fully schema-covered, tested first, documented, policy-gated, and Campaign Brain is removed from agents/Atlas.

After this hard stop, Phase 3 may add shared-brain read context and selected `brain_ids`.
