# PromptMode Action Legacy Audit - June 22, 2026

## Architect Summary

### What is happening right now

PromptMode has 374 backend actions. Think of this like a workshop with 374 labeled drawers. The labels now all exist and the drawers all have basic shape checks, but that does not mean every drawer still belongs in the workshop.

The important finding: none of the actions are obviously broken from the action registry point of view. Every backend action is exposed through the internal plugin and agent policy. That means agents can still see and call them unless we intentionally remove or hide them.

### Why this is happening

The action list grew by accumulation. New product areas added their own drawers: funnels, presentations, flows, missions, Brain, Meta, projects, Supabase, MCP, custom objects, team actions, and more. Older drawers stayed in the same cabinet even when newer workflows replaced part of the job.

The result is not pure dead code. It is mostly "legacy surface area": actions that still have handlers and docs, but may no longer be useful enough to keep agent-facing.

### What the options are

Option A: keep all 374 actions and add preflight everywhere.
This is safest for backward compatibility, but it spends time hardening actions we may not want agents using anymore.

Option B: prune first, then preflight.
This is better long term. We review low-evidence and legacy-looking actions first, remove or hide the ones we do not want, and only then invest in deep preflight for the smaller canonical action set.

Recommendation: use Option B, but do not delete from static code evidence alone. First confirm production usage for the candidate actions, then remove or deprecate in batches.

### What changes

Before preflight work continues, we should decide which actions are canonical. The user experience gets cleaner because agents have fewer ways to do the same thing, fewer old routes to pick by mistake, and fewer obscure actions that need defensive validation.

## Technical Evidence

### Inventory Result

Static inventory command separated generated exposure from real product references. Generated exposure means source-of-truth lists, schemas, policy, plugin, action docs, handler owner files, and capability policy. Product references means non-test code outside those generated/registry surfaces.

| Bucket | Count | Meaning |
| --- | ---: | --- |
| `keep_public_mcp` | 58 | Public MCP catalog actions. Treat as external/public API unless intentionally versioned. |
| `keep_static_product_refs` | 197 | Referenced by non-generated product code outside action source/handler files. |
| `internal_review_tested` | 90 | No static product caller found, but test coverage exists. Likely internal agent/API surface; review before deleting. |
| `legacy_review` | 10 | No static product caller, legacy/inherited handler path, or legacy method naming. |
| `removal_candidate_no_static_refs` | 19 | No static product caller and no tests found outside generated exposure. First removal-review batch. |

All 374 actions are exposed through:

- `docker/tools/vibey-backend/index.ts` internal plugin action surface.
- `packages/agent-policy/src/actions.ts` policy action surface.
- `apps/agent-api/src/modules/artifacts/dtos/artifact-action.dto.ts` backend `VALID_ACTIONS`.

The runtime handler registry is assembled in `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts` from many `getHandlers()` maps. The dispatch map is in `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts`.

### First Removal-Review Batch

These are the strongest "possibly old or unnecessary" candidates from static evidence. They have no visible non-generated product caller and no tests in the current scan.

| Action | Handler owner | Reason to review |
| --- | --- | --- |
| `get_website` | `artifact-funnels.service.ts` | Website read action has no static caller/test evidence. Check if `get_funnel` now covers this path. |
| `restart_project` | `artifact-projects.service.ts` | Project runtime control action, no static caller/test evidence. Likely old builder/runtime surface. |
| `fetch_project_url` | `artifact-projects.service.ts` | Project runtime URL action, no static caller/test evidence. |
| `list_project_directory` | `artifact-projects.service.ts` | Project filesystem-style action, no static caller/test evidence. |
| `get_project_errors` | `artifact-projects.service.ts` | Project runtime diagnostics action, no static caller/test evidence. |
| `define_object_type` | `artifact-custom-objects.service.ts` | Custom object schema action, no static caller/test evidence. |
| `list_object_types` | `artifact-custom-objects.service.ts` | Custom object schema action, no static caller/test evidence. |
| `get_object_type` | `artifact-custom-objects.service.ts` | Custom object schema action, no static caller/test evidence. |
| `update_object_type` | `artifact-custom-objects.service.ts` | Custom object schema action, no static caller/test evidence. |
| `get_mission_plan` | `artifact-missions.service.ts` | Mission read sub-action, no static caller/test evidence. |
| `get_mission_logs` | `artifact-missions.service.ts` | Mission read sub-action, no static caller/test evidence. |
| `update_awareness` | `artifact-north-star.service.ts` | North Star/awareness action, no static caller/test evidence. |
| `ingest_fathom_meeting` | `artifact-brain-scholar.service.ts` | Meeting-specific ingest action, no static caller/test evidence. |
| `ingest_fireflies_transcript` | `artifact-brain-scholar.service.ts` | Meeting-specific ingest action, no static caller/test evidence. |
| `supabase_list_tables` | `artifact-supabase.service.ts` | High-power Supabase action, no static caller/test evidence. |
| `supabase_create_table` | `artifact-supabase.service.ts` | High-power Supabase mutation action, no static caller/test evidence. |
| `supabase_insert_rows` | `artifact-supabase.service.ts` | High-power Supabase mutation action, no static caller/test evidence. |
| `supabase_update_rows` | `artifact-supabase.service.ts` | High-power Supabase mutation action, no static caller/test evidence. |
| `supabase_delete_rows` | `artifact-supabase.service.ts` | High-power Supabase mutation action, no static caller/test evidence. |

Recommended decision for this batch:

- Project runtime actions: decide whether PromptMode should still expose project runtime control. If not, remove/hide as a group.
- Custom object type actions: decide whether custom objects are still a product primitive. If not, remove/hide the whole custom object family, not one action at a time.
- Supabase actions: do not leave broadly exposed without strong product need. Either remove from general PromptMode or gate behind a dedicated admin/developer profile with deep async preflight.
- Meeting ingest actions: likely replace with integration/file ingestion flows unless these are still used by seeded skills.

### Legacy-Review Batch

These have no static product caller and route through legacy/inherited naming or a legacy bridge service.

| Action | Handler/method | Reason to review |
| --- | --- | --- |
| `get_delivery_estimate` | `getDeliveryEstimate` | Meta advanced action, no static caller/test evidence. |
| `list_meta_audiences` | `listMetaAudiences` | Meta advanced audience action, no static caller/test evidence. |
| `create_meta_custom_audience` | `createMetaCustomAudience` | Meta advanced audience mutation, no static caller/test evidence. |
| `create_meta_lookalike_audience` | `createMetaLookalikeAudience` | Meta advanced audience mutation, no static caller/test evidence. |
| `list_meta_pixel_events` | `listMetaPixelEvents` | Meta pixel action, no static caller/test evidence. |
| `create_meta_pixel_event` | `createMetaPixelEvent` | Meta pixel mutation, no static caller/test evidence. |
| `get_agent` | `hrGetAgent` | HR action has tests but no static product caller; keep only if HR agent still needs it. |
| `audit_team_agents_and_skills` | `auditTeamAgentsAndSkills` | Team audit action has tests but no static product caller. |
| `compare_team_skill_coverage` | `compareTeamSkillCoverage` | Team audit action has tests but no static product caller. |
| `summarize_agent_capabilities` | `summarizeAgentCapabilities` | Team audit action has tests but no static product caller. |

Recommended decision for this batch:

- Meta advanced audience/pixel actions should be either part of a real Meta Ads management product or hidden from general agents.
- HR/team audit actions are likely admin-only. Keep them only on HR/system profiles, not broad PromptMode exposure.

### Tested But No Static Product Caller

There are 90 actions with tests but no static product caller outside generated action exposure and handler files. These are not removal candidates yet. Tests are evidence that someone intentionally supported the behavior.

High-value examples to preserve unless product says otherwise:

- Mission manager actions: `answer_mission_question`, `create_mission_subtask`, `retry_mission_subtask`, `approve_mission`.
- Brain graph actions: `create_brain_page`, `create_brain_belief_pattern`, `connect_brain_belief_to_memory`, `get_brain_lint`.
- Company Brain actions: `get_company_brain_objects`, `create_company_brain_edge`, `delete_company_brain_edge`.
- Research actions: `run_social_research_search`, `run_ads_research_search`, `search_ads_research_advertisers`.
- MCP management actions: `remove_mcp_server`, `list_mcp_resources`, `read_mcp_resource`.
- Project helper actions: `patch_file`, `search_project_files`, `validate_project`.

These need product-owner review, not automatic deletion.

### Keep By Default

Do not prune these categories before production usage review:

- 58 MCP catalog actions in `packages/agent-policy/src/mcp-catalog.ts`.
- Actions with static non-generated product references.
- Core creation/update/read/delete surfaces for currently visible product areas: campaigns, spaces, tasks, missions, documents, forms, funnels, presentations, flows, Brain, integrations, and media.
- Actions used by seeded skills or workflow instructions in migrations, even if the action name is not directly called from frontend code.

### Missing Evidence

Static code cannot prove runtime usage. Agents can call action names dynamically from generated skills and prompt docs.

The missing evidence is production action telemetry:

- Count of successful and failed tool calls by action name over the last 14/30/60 days.
- Which agent/profile called each action.
- Whether each call came from PromptMode, MCP, mission agents, or another runtime.
- Whether calls came from seeded skills/workflows.

Smallest experiment:

- Add or query structured logging around `ArtifactsService.executeAction` / `ArtifactActionExecutionService.executeAction`.
- Produce `action_name`, `agent_key`, `profile`, `runtime_surface`, `success`, `error_class`, `effect_state`, and timestamp.
- Run the report before removing any action.

### Recommended Cleanup Workflow

1. Add a usage report for the 29 `removal_candidate_no_static_refs` + `legacy_review` actions.
2. If an action has zero production calls for 30 days and no seeded skill dependency, mark it `deprecated`.
3. Hide deprecated actions from plugin/policy docs first, while keeping backend handlers temporarily.
4. After one release window, remove from `VALID_ACTIONS`, `ACTION_METHOD_MAP`, schemas, preflight coverage, plugin, policy, catalog/docs, tests, and handler maps in the same change.
5. Only then continue deep preflight on the remaining canonical action set.

### Commands Used

Static inventory sources:

```bash
apps/agent-api/src/modules/artifacts/dtos/artifact-action.dto.ts
apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts
apps/agent-api/src/modules/artifacts/services/artifacts.service.ts
docker/tools/vibey-backend/index.ts
packages/agent-policy/src/actions.ts
packages/agent-policy/src/mcp-catalog.ts
```

The scan excluded generated/source-of-truth action exposure from "product caller" evidence:

```bash
apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts
apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts
apps/agent-api/src/modules/artifacts/services/artifact-action-additional-schemas.ts
apps/agent-api/src/modules/artifacts/services/artifact-action-preflight.ts
apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts
packages/agent-policy/src/actions.ts
packages/agent-policy/src/registry.ts
packages/agent-policy/src/action-contracts.ts
docker/tools/vibey-backend/index.ts
```

### Assessment

We should not start deep preflight across all 374 yet. The action set should be pruned or at least tiered first.

Most likely first decisions:

- Hide/remove dangerous broad Supabase actions from normal PromptMode unless this is an explicit developer/admin agent capability.
- Review project runtime actions as a group because they look like older code-builder/runtime controls.
- Review custom object actions as a group because they have no static caller/test evidence in this scan.
- Keep public MCP and actively tested Brain/Mission/Flow actions until telemetry proves they are unused.
