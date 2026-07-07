# Space Builder Capability Drift Audit

Generated: 2026-06-24
Last updated: 2026-06-24

## Purpose

This audit checks whether agents with Space-edit family access can mutate Space schema and read Space work objects through the shared runtime surfaces. Unlike the Flow catalog drift audit, this is not Loop-specific. Any agent with the same Space-builder action family inherits the same coverage and gaps.

Guardrail test:

```bash
TMPDIR=/private/tmp pnpm exec vitest run apps/agent-api/src/modules/agent-sync/services/space-builder-capability-drift.test.ts
```

Sources compared:

- Executable action schema: `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`
- Runtime action registry: `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts`
- Runtime policy allowlists: `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts`
- Generated `vibey-api` skill docs: `apps/agent-api/src/modules/agent-sync/services/vibey-api-skill-generator.ts`
- Shared instruction contract: `apps/agent-api/src/modules/agent-sync/contracts/agent-instruction-contracts.ts`
- Action docs: `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`
- MCP external tool catalog: `packages/agent-policy/src/mcp-catalog.ts`

## Current Result

- Current shared drift rows: 0
- Previous shared drift rows fixed: 3
- Direct Space-object action gaps: 2 intentional non-exposures
- Core Space schema mutation is exposed: `get_space`, `create_space_field`, and `update_space_field` are present in executable schema, registry, docs, MCP catalog, MCP `missions` permission group, Loop policy, and managed Space policy.
- Space view reads are exposed consistently: `list_space_views`, `get_space_view`, and `list_space_view_items` now exist across executable schema, registry, action docs, MCP catalog/group, Loop policy, and managed Space policy.
- Safe direct Space Builder helpers are exposed consistently: `append_space_field_option`, `create_space_status`, `create_space_category`, `create_space_tag`, `create_space_view`, and `update_space_view` exist across executable schema, registry, action docs, MCP catalog/group, Loop policy, and managed Space policy.

## What Agents Can Do Now

- Add a status through `create_space_status` without replacing the full status options array.
- Add tags or category-like options through `create_space_tag`, `create_space_category`, or `append_space_field_option`.
- Discover configured Space views with `list_space_views`.
- Read exact view metadata with `get_space_view`.
- List records inside custom/research/doc/table views with `list_space_view_items`.
- Create a configured Space view with `create_space_view`.
- Rename or reconfigure a view with `update_space_view`.

## Fixed Shared Drift Rows

| Action | Fixed surfaces | Impact |
| --- | --- | --- |
| `list_space_views` | Action docs, Loop runtime policy, managed Space runtime policy | Loop and Space-capable agents can discover view ids directly instead of relying only on `get_space.schema.views`. |
| `get_space_view` | Action docs, Loop runtime policy, managed Space runtime policy | Agents can read exact view metadata before selecting filters or visible fields. |
| `list_space_view_items` | Loop runtime policy, managed Space runtime policy | Agents can use custom/research view item listing through the same policy family already exposed in schema/MCP/docs. |
| `append_space_field_option` | Schema, DTO, registry, docs, MCP catalog/group, Loop runtime policy, managed Space runtime policy | Agents can append one select/multi-select option without manually resending full options arrays. |
| `create_space_status` | Schema, DTO, registry, docs, MCP catalog/group, Loop runtime policy, managed Space runtime policy | Loop can add a missing Flow status such as `RESEARCH` directly and use the returned option id. |
| `create_space_category` | Schema, DTO, registry, docs, MCP catalog/group, Loop runtime policy, managed Space runtime policy | Agents can add category options and create the default category select field if it is missing. |
| `create_space_tag` | Schema, DTO, registry, docs, MCP catalog/group, Loop runtime policy, managed Space runtime policy | Agents can append tag options through a direct helper instead of full-array replacement. |
| `create_space_view` | Schema, DTO, registry, docs, MCP catalog/group, Loop runtime policy, managed Space runtime policy | Agents can create a view when a flow or work process needs one. |
| `update_space_view` | Schema, DTO, registry, docs, MCP catalog/group, Loop runtime policy, managed Space runtime policy | Agents can rename or reconfigure an existing view using existing field ids. |

## Remaining Intentional Non-Exposures

These are not current action-surface drift rows. They remain intentionally unexposed because the safe shared executor contract is not available yet or the action is destructive.

| Requested capability | Current substitute | Gap |
| --- | --- | --- |
| `delete_space_field` | None | Protocol explicitly tells agents field deletion is not exposed. |
| `create_space_view_item` | Use `create_task` for task rows or dedicated actions for docs/research where available | No generic custom-view row creation action. |

## What This Means For Loop

Loop should know that Space status alignment is available because the generated `vibey-api` protocol renders when Space schema helpers are allowed. The test verifies the generated protocol includes:

- read live schema first with `get_space`
- use `create_space_field` for real fields
- add a status with `create_space_status`
- append categories, tags, and custom select options without full-array replacement
- create or update Space views with existing field ids

If Loop still says it cannot add a status, the likely failure is not raw access to the mutation action. It is one of these:

1. The refreshed DB-backed skill/runtime surface did not reach the active runtime.
2. The current conversation/tool context did not include the generated `vibey-api` protocol reference.
3. Loop chose the wrong planning path and treated Space alignment as outside the Flow build rather than pre-flow setup.
4. The action call failed at runtime, and Loop converted that into "I cannot" instead of reporting the actual tool error.

## Acceptance Criteria

- The guardrail test expects `[]` and passes for shared Space-builder exposure drift.
- Loop and any managed agent with Space family access receive the same Space schema mutation protocol in generated `vibey-api` docs.
- Status/category/tag alignment is validated through append-only helper schemas before claiming the agent can add those options.
- Any new Space-builder action updates executable schema, registry, policy allowlist, MCP catalog when applicable, action docs, generated skill docs, preflight/lifecycle coverage, and tests in the same change.
