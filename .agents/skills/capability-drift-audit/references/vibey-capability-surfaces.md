# Vibey Capability Surfaces

Use this reference when creating a capability drift audit or known-gap guardrail test.

## Surface Matrix

Check only the surfaces that apply to the family under audit.

| Surface | What it proves | Common files |
| --- | --- | --- |
| Executable schema | The action payload can be described and validated before handler execution. | `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, API DTO files, shared catalog types |
| Runtime registry | The action can route to a handler method. | `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts`, handler services |
| Handler implementation | The action can actually execute and persist/read data. | `apps/agent-api/src/modules/artifacts/services/*`, `apps/api/src/modules/*/services/*` |
| Valid action list | The action is accepted by the backend action DTO. | `apps/agent-api/src/modules/artifacts/dtos/artifact-action.dto.ts` |
| Policy allowlist | The intended agent/profile/domain can use the action. | `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts`, `packages/agent-policy/src/actions.ts`, `packages/agent-policy/src/registry.ts` |
| MCP catalog | External clients see the action as a tool with the right scopes/group. | `packages/agent-policy/src/mcp-catalog.ts`, MCP catalog tests |
| Generated action docs | Agent-facing skill docs explain the action with non-generic examples. | `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `vibey-api-skill-generator.ts` |
| Protocol references | Agents get the strategic rule for when and how to use a family. | `apps/agent-api/src/modules/agent-sync/contracts/agent-instruction-contracts.ts` |
| Runtime artifacts | Generated local/runtime files received the source truth. | `docker/agents/**`, generated `ALLOWED_ACTIONS.json`, generated skill references |
| DB-backed truth | Production/staging system agents received the update. | `agent_definitions`, `agent_skills`, `agent_skill_resources` |
| UI/editor surface | Users can select/configure the same capability. | `apps/web/src/features/**`, action builders, policy/access panels |

## Drift Categories

- `missing_in_surface`: source of truth has the action/field, but a downstream surface omits it.
- `surface_only`: a downstream surface advertises an action/field that executable code does not accept.
- `requiredness_mismatch`: two surfaces agree on a field name but disagree on required vs optional.
- `policy_missing`: schema/registry/docs exist, but the target agent/profile cannot use the action.
- `docs_missing`: action works, but generated skill docs would fall back to generic wording.
- `runtime_not_synced`: repo source changed, but DB/runtime artifacts still show old content.
- `not_implemented_anywhere`: the user-requested capability is a product gap, not drift.

## Known-Gap Test Pattern

Use a test that compares surfaces and asserts the current expected drift.

```ts
const EXPECTED_DRIFT = [
  'list_space_views | missing: action_docs, loop_policy',
]

expect(buildDriftRows().map(formatDriftRow)).toEqual(EXPECTED_DRIFT)
```

Keep the expected list human-readable. When a fix lands, remove that row from the baseline in the same change.

## Report Template

Use this structure for Markdown audit files:

```md
# [Family] Capability Drift Audit

Generated: YYYY-MM-DD

## Purpose
What question this audit answers and which agents/clients it applies to.

## Result Summary
- Known drift rows:
- Direct product gaps:
- Critical conclusion:

## Drift Rows
| Action or field | Current drift | Impact | Priority |

## Direct Capability Gaps
Capabilities the user expects that do not exist anywhere yet.

## Recommended Fix Order
Smallest durable fixes first.

## Acceptance Criteria
How tests, docs, runtime artifacts, and DB sync prove the fix.
```

## Production Verification

Use production/staging verification only when the user asks whether a live agent/runtime has the capability. Prefer read-only checks first:

- Query `agent_definitions` for system identity/tool rows.
- Query `agent_skills` and `agent_skill_resources` for generated skill bodies and references.
- Inspect generated runtime artifacts when they are the actual deployed input.
- Compare hashes/lengths before applying DB migrations or syncs.

Do not present local source tests as proof of production behavior.
