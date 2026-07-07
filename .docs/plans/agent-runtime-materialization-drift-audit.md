# Agent Runtime Materialization Drift Audit

Generated: 2026-06-24

## Scope

Audit whether the source capability surfaces that now pass the source drift guardrail have materialized into local runtime files and production DB-backed agent rows.

Checked surfaces:

- Source guardrail: `apps/agent-api/src/modules/agent-sync/services/agent-capability-source-drift.test.ts`
- Local runtime files under `docker/agents/**/skills/vibey-api`
- Production Supabase project `qfrvykscoymiwwgysvsr`
- Production tables: `agents_registry`, `agent_skills`, `agent_skill_resources`, `agent_definitions`

## Source Status

Source drift is fixed for the audited action surfaces.

Current broad source comparison:

```json
{
  "valid": 390,
  "active": 366,
  "onHold": 24,
  "docs": 384,
  "invalidDocs": [],
  "activeNoPolicy": [],
  "activeNoDocs": [],
  "activeNoSchema": [],
  "activeNoRegistry": [],
  "onHoldNotValid": [],
  "onHoldInPolicy": []
}
```

The new guardrail enforces:

- Generated `vibey-api` docs cannot contain non-backend PromptMode action keys.
- Every active backend PromptMode action must have schema, registry, shared policy, and generated docs.
- Code Projects and Supabase/Custom DB actions remain explicit on-hold backend-compatible actions, not active policy actions.

## Runtime Findings

### R1 - Local Loop Runtime Copy Is Stale

Local materialized Loop runtime:

`docker/agents/orgs/699e3530-881c-4653-b507-4c4b5993538f/loop/skills/vibey-api/ALLOWED_ACTIONS.json`

Contains:

- `create_space_field`
- `update_space_field`

Missing:

- `create_space_status`
- `append_space_field_option`
- `create_space_category`
- `create_space_tag`
- `create_space_view`
- `update_space_view`

This matches the user-visible symptom: Loop can read/build Flow context, but the materialized skill/allowed-action file does not expose the newer Space Builder mutations.

### R2 - Source Policy Now Grants Loop The New Space Builder Actions

Read-only source allowlist check for `system_flows` returned 52 actions and includes:

- `append_space_field_option`
- `create_space_category`
- `create_space_field`
- `create_space_status`
- `create_space_tag`
- `create_space_view`
- `get_space`
- `get_space_view`
- `list_space_view_items`
- `list_space_views`
- `search_space_context`
- `update_space_field`
- `update_space_view`

Interpretation: the source fix is present; the runtime needs a fresh agent sync/materialization from the current code.

### R3 - Production DB Has Loop Registry Rows, But No Persisted Loop `vibey-api` Skill Row

Production `agents_registry` has:

- Global `loop`, `is_system=true`, `sync_status=ready`
- Org `699e3530-881c-4653-b507-4c4b5993538f` `loop`, `is_system=true`, `sync_status=ready`, updated `2026-06-23 11:38:38+00`

Production `agent_skills` / `agent_skill_resources` did not return a Loop `skill_key='vibey-api'` row.

Code reading shows this is expected for Loop: `AgentSyncPolicySkillService.writeScopedVibeyApiSkill` generates `skills/vibey-api` directly to runtime files from the policy allowlist during sync. Loop does not need a persisted DB `vibey-api` row for that generated skill.

### R4 - Global DB `vibey-api` Skill Is Stale

Production has one global persisted `agent_skills` row:

- `agent_key='vibey'`
- `skill_key='vibey-api'`
- `source='system'`
- updated `2026-06-21 19:35:42+00`

It has `search_vibey_docs`, but is missing:

- `create_space_status`
- `append_space_field_option`
- `atlas_save_brain_context`
- `get_space_item`

Production `agent_skill_resources` for global `vibey/vibey-api` are also stale:

- `references/spaces.md` does not contain `create_space_status` or `append_space_field_option`
- `references/brain.md` does not contain `atlas_save_brain_context`
- `references/campaign.md` and `references/communication.md` predate the newly added generated docs

### R5 - Static DB Skills Still Reference Phantom Actions

The source `VIBEY_API_ACTION_DOCS` no longer advertises non-backend PromptMode actions, but production DB static skills still mention them:

- `agent_skills agent_key='*' skill_key='campaign-performance-reporting'` contains `ask_clarification`
- `agent_skills agent_key='*' skill_key='chat-plan-management'` contains `create_chat_plan` and `update_chat_plan`
- `agent_skills agent_key='loop' skill_key='flow-builder'` contains `ask_clarification`
- `agent_skills agent_key='vibey' skill_key='campaign-performance-reporting'` contains `ask_clarification`
- `agent_skills agent_key='vibey' skill_key='chat-plan-management'` contains `create_chat_plan` and `update_chat_plan`
- `agent_definitions agent_key='vibey' file_name='channels/SLACK.md'` and `channels/STUDIO.md` contain `ask_clarification`

Interpretation: removing phantom entries from generated `vibey-api` docs fixes one source leak, but DB-backed static skill text still needs a separate cleanup if those actions are truly not executable.

## Recommended Fix Order

1. Run an agent sync/runtime materialization for production Loop after deploying the source changes.
2. Verify Loop runtime `ALLOWED_ACTIONS.json` includes the six Space Builder mutations and `references/spaces.md` documents them.
3. Refresh or migrate the global DB `vibey-api` skill/resources if that row is still used by any production runtime path.
4. Create a follow-up static-skill phantom-action cleanup for `ask_clarification`, `create_chat_plan`, and `update_chat_plan` across DB-backed skills and source templates.

## Verification Run

Passed:

- `pnpm --filter @vibey/agent-api exec vitest run src/modules/agent-sync/services/agent-capability-source-drift.test.ts`
- `pnpm --filter @vibey/agent-api exec vitest run src/modules/agent-sync/services/agent-sync-action-exposure.tdd.test.ts src/modules/agent-sync/services/space-builder-capability-drift.test.ts`
- `pnpm --filter @vibey/agent-api exec vitest run src/modules/artifacts/services/artifact-action-schemas.test.ts src/modules/artifacts/services/artifact-workflow-capability-graph.test.ts`
- `pnpm --filter @vibey/agent-policy exec vitest run src/agent-policy.test.ts`
