# Agent Capability Family Drift Prioritization

Generated: 2026-06-24

## Purpose

Identify which capability families should get the next full `capability-drift-audit` pass after Flow and Space Builder, and record the first drift rows found by a broad source-surface comparison.

Compared surfaces:

- `VALID_ACTIONS`: `apps/agent-api/src/modules/artifacts/dtos/artifact-action.dto.ts`
- Executable schemas: `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`
- Runtime registry: `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts`
- Generated action docs source: `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`
- Shared policy action list/domains/contracts: `packages/agent-policy/src/actions.ts`, `packages/agent-policy/src/registry.ts`, `packages/agent-policy/src/action-contracts.ts`
- MCP catalog/groups: `packages/agent-policy/src/mcp-catalog.ts`

This is a source-level sweep. It does not prove production DB-backed `agent_definitions`, `agent_skills`, or runtime artifact sync.

## Result Summary

- Highest-priority family: `code_projects` and `custom_db` because many backend-valid actions are missing from the shared policy/action-contract surface.
- Highest-risk quick cleanup: docs-only phantom actions `ask_clarification`, `create_chat_plan`, and `update_chat_plan` are documented but not valid executable actions.
- Next docs drift family: Campaign and communication/channel actions work but lack first-class generated docs.
- Brain should get a full audit because `atlas_save_brain_context` lacks first-class generated docs and Brain has multiple agent/runtime/DB-backed surfaces.
- No broad source drift was found in this first sweep for media, contacts, skill-management, marketing artifact CRUD, or Space Builder after the latest fixes.

## 2026-06-24 Source Fix Update

The source-level drift rows in this report are now covered by `apps/agent-api/src/modules/agent-sync/services/agent-capability-source-drift.test.ts`.

Current source guardrail result:

- No generated docs exist for non-backend PromptMode action keys.
- No active backend PromptMode action is missing schema, registry, shared policy action/domain, or generated docs.
- Code Projects and Supabase/Custom DB actions are explicitly on-hold backend-compatible actions, not active policy actions.

Runtime materialization remains a separate concern. See `.docs/plans/agent-runtime-materialization-drift-audit.md`.

## Drift Rows Found

| Family | Action or surface | Current drift | Impact | Priority |
| --- | --- | --- | --- | --- |
| Global docs cleanup | `ask_clarification` | Docs-only: missing valid action, schema, registry, policy action, and policy domain | Agents can be taught to call an invalid action. | P0 |
| Global docs cleanup | `create_chat_plan` | Docs-only: missing valid action, schema, registry, policy action, and policy domain | Generated `vibey-api` can advertise a planning action that cannot execute. | P0 |
| Global docs cleanup | `update_chat_plan` | Docs-only: missing valid action, schema, registry, policy action, and policy domain | Generated `vibey-api` can advertise a planning update that cannot execute. | P0 |
| Code projects | `create_project`, `get_project`, `list_projects`, `create_file`, `read_file`, `update_file`, `delete_file`, `list_project_files`, `get_project_logs`, `update_project_deps`, `import_github_repo`, `validate_project` | Backend-valid/schema/registry actions missing shared policy action and policy domain | The backend can accept these actions, but access policy, inline access requests, system ownership, and capability graphs cannot reason about them. | P1 |
| Code projects | `fetch_project_url`, `get_project_errors`, `list_project_directory`, `patch_file`, `restart_project`, `search_project_files` | Missing generated docs plus missing shared policy action/domain | Agents may have executable handlers without policy ownership or useful action docs. | P1 |
| Custom DB / Supabase | `supabase_create_table`, `supabase_delete_rows`, `supabase_insert_rows`, `supabase_list_tables`, `supabase_run_sql`, `supabase_update_rows` | Backend-valid/schema/registry actions missing shared policy action and policy domain | High-risk data actions are not explicitly classified in shared policy; they need either deliberate on-hold status or strict access ownership. | P1 |
| Brain router | `atlas_save_brain_context` | Missing generated action docs source | Important save-router action can fall back to generic wording even though it routes memory writes across Brain families. | P1 |
| Campaign | `create_campaign`, `get_campaign`, `list_campaigns`, `update_campaign` | Missing generated action docs source | Agents can use campaign actions but receive generic docs instead of campaign-specific guidance. | P2 |
| Communication / channels | `discover_channel_context`, `set_channel_context`, `save_member_note`, `get_member_notes`, `search_vibey_docs` | Missing generated action docs source | Channel/team context actions and docs search lack first-class agent-facing examples and use/do-not-use guidance. | P2 |
| Tasks / Space item read | `get_space_item` | Missing generated action docs source | Agents can read one Space item but generated docs omit the direct action, increasing the chance they use heavier list/search paths. | P2 |

## Recommended Next Full Audits

1. **Code Projects + Custom DB / Supabase**
   - Reason: largest concrete drift and highest production risk.
   - Decision needed: either make these first-class agent-facing capabilities with policy/contracts/docs, or classify them explicitly as on-hold/non-agent-facing and stop advertising them through executable action surfaces.
   - Guardrail should compare valid actions, schemas, registry, lifecycle/preflight, policy domains, action contracts, MCP catalog, generated docs, and runtime error/circuit behavior.

2. **Docs-Only Phantom Actions**
   - Reason: smallest fix with high clarity payoff.
   - Actions: `ask_clarification`, `create_chat_plan`, `update_chat_plan`.
   - Guardrail should prevent `VIBEY_API_ACTION_DOCS` from containing actions absent from `VALID_ACTIONS` unless explicitly marked protocol-only/non-action.

3. **Brain Family**
   - Reason: Brain has User, Agent, Company, Customer, router, model, and ingestion layers, plus DB-backed Atlas skills/runtime artifacts.
   - First found drift: `atlas_save_brain_context` missing generated action docs.
   - Full audit should include recent Company/Customer Brain actions, Atlas router guidance, action preflight, MCP catalog, generated runtime skill docs, and production DB-backed skill rows if the question is live-agent behavior.

4. **Campaign + Communication**
   - Reason: current drift is mostly docs coverage, but these actions shape agent coordination and campaign setup.
   - Guardrail should compare generated docs/protocols and ensure channel/member context actions are not hidden behind generic docs.

5. **Task / Mission Detail Actions**
   - Reason: Flow and Space Builder are now covered, but task/mission item-level reads and mission manager actions need their own semantic audit.
   - First found drift: `get_space_item` missing generated action docs.

## Families Not Prioritized By This Sweep

- Media generation: no broad schema/registry/policy/docs drift found in the initial source sweep.
- Contacts/CRM: no broad source drift found.
- Skill management: no broad source drift found, but still worth a later DB-backed audit because skills/resources have runtime materialization and reference-file semantics.
- Marketing artifact CRUD: no broad source drift found, though individual artifact families can still have semantic gaps.

## Acceptance Criteria For Next Audits

- Each selected family gets a known-gap guardrail test with an explicit baseline.
- The report separates source drift from intentional product gaps and production/runtime sync gaps.
- Fixes shrink the baseline in the same change.
- For live-agent claims, verify DB-backed skills/definitions or generated runtime artifacts before saying production is fixed.
