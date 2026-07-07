# Loop Flow Capability Schema Drift Audit

Generated: 2026-06-24
Last updated: 2026-06-24

## Purpose

Loop builds flows from the Flow capability catalog, but the backend executes flows through the published automation DTO schemas. This audit compares those two surfaces so Loop is shown the same contract the platform accepts.

Guardrail test:

```bash
TMPDIR=/private/tmp pnpm exec vitest run apps/api/src/modules/spaces/dto/__tests__/space-automation-flow-capability-drift.test.ts
```

Sources compared:

- Catalog Loop sees: `packages/api-shared/src/types/flow-capabilities.ts`
- Package/runtime catalog: `packages/api-shared/dist/types/flow-capabilities.js`
- Package subpath exports: `packages/api-shared/package.json`
- Action schema executed by API: `apps/api/src/modules/spaces/dto/space-automation-action.dto.ts`
- Trigger schema executed by API: `apps/api/src/modules/spaces/dto/space-automation-trigger.dto.ts`

## Current Result

- Current drift rows: 0
- Previous known drift rows: 46
- Action drift rows fixed: 28
- Trigger drift rows fixed: 18
- `send_to_agent` still exposes output and completion controls: `output_type`, `completed_status`, `continuation`, `target_item_ref`, `extended_brain_knowledge`, `inject_fields`, and `priority`.
- Space status/category/tag creation is not covered by this Flow catalog test. Those are Space schema mutation capabilities and are tracked in the Space Builder drift audit.

Definitions:

- `missing_in_catalog`: backend schema accepts the field, but Loop is not told about it in the Flow capability catalog.
- `catalog_only`: Loop is told about a field that the backend schema does not accept at that position.
- `requiredness`: both sides know the field, but one side says it is required while the other side says optional.

## Fixed Drift Classes

- Agent and Cursor actions now expose targeting, completion, continuation, priority, injection, and extended Brain knowledge fields accepted by the DTOs.
- Task/comment/status/priority/artifact actions now expose `target_item_ref` and `continuation` where the backend accepts them.
- Email actions now match DTO requiredness: `tool_slug`, `connected_account_id`, and `to` are required; manual `subject_template` and `body_template` remain optional schema fields with publish-time validation.
- Trigger filters now use backend field names such as `tag` instead of stale `tag_id`, and omit catalog-only `from` filters where the DTO does not accept them.
- `status_change.to` and `priority_changed.to` are now catalog-required, matching the published trigger schema.
- Connected app triggers now expose top-level `provider`, `trigger_slug`, and `connected_account_id`, with provider-specific config nested under `trigger_config`.
- The checked-in package `dist` catalog was updated with the source catalog because `@vibey/api-shared` resolves through the package build output in tests/runtime.
- The package export map now exposes existing `types/*`, `ad-canvas-agents`, `ad-strategies`, and `image-models` subpaths so runtime/tests can resolve current API-shared imports.

## Remaining Watch Points

- If the editor still shows agent-run output as `none`, the failure point is no longer the shared Flow capability catalog. Check action rendering/default binding or persisted flow data.
- If Loop adds a separate `change_status` step after an agent run, the catalog now exposes `completed_status`; the next failure point is planning instruction quality or semantic evaluation, not missing schema.
- A model self-score like `100/100` still does not prove build quality. Quality must come from deterministic checks: schema compatibility, required fields, field names, action order, output/continuation semantics, and per-space option availability.

## Acceptance Criteria

- The guardrail test expects `[]` and passes.
- Flow catalog updates are kept in both source and package/runtime catalog output.
- Any future automation DTO field change must update the Flow capability catalog in the same change or intentionally encode an exception in the drift test.
