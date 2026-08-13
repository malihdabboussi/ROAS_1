# Canvas + Pixel Capability Drift Audit

Generated: 2026-08-10

## Purpose

Compare the visible whiteboard with agent action schemas, registries, handlers, policies, generated docs, and runtime expectations for Pixel-authored board content.

## Result Summary

- Known drift rows: 0 in the source action surfaces audited below.
- Remaining runtime verification gaps: 2.
- Critical conclusion: Pixel now reads and mutates the same versioned Canvas model as the UI; the obsolete strategy actions remain isolated to Workflow.

## Drift Rows

| Action or field | Current drift | Impact | Priority |
| --- | --- | --- | --- |
| `get_canvas_board` | No source drift found across schema, registry, policy, contract, docs, and handler | Pixel receives the visible board revision and normalized objects | Closed |
| `apply_canvas_operations` | No source drift found across schema, preflight, registry, policy, contract, docs, and handler | Pixel creates normal editable Canvas objects through the canonical RPC | Closed |

## Direct Capability Gaps

- None remain in source: affected bounds focus the board after Pixel batches, and embedded Pixel receives campaign, board, revision, selection, and viewport context.

## Recommended Fix Order

1. Verify the migration and generated Pixel skill against the deployed database/runtime.
2. Verify embedded Pixel composer context plus affected-bounds focus in the refreshed runtime.

## Acceptance Criteria

- Focused schema/preflight tests report zero unclassified Canvas action drift.
- Pixel reads the same revision visible in the UI.
- Pixel operation batches pass the same server validator as human edits.
- A committed Pixel batch appears without reload and can be undone as one action.
- Generated docs, MCP/action catalogs, policies, runtime artifacts, and DB-backed Pixel skills agree.
