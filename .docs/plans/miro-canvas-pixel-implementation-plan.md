# Miro-Style Canvas + Pixel Implementation Plan

Date: 2026-08-10

## Architect Summary

Canvas will become a first-class visual workspace rather than a serialized React Flow graph. Humans and Pixel will use the same versioned board operations, so AI-created work appears immediately as normal editable objects and cannot silently overwrite concurrent human changes. Campaign, Program, and Space entry points will resolve a canonical board identifier instead of owning divergent canvas implementations.

The delivery order is correctness first, interaction second, native ROAS objects third, and Pixel orchestration fourth. This prevents a polished UI from hardening the current whole-document persistence and prevents Pixel from writing to the obsolete Workflow strategy-node model.

## Evidence Pack

- `apps/web/src/components/canvas/hooks/useCampaignWhiteboard.ts`: saves the complete graph after a 700 ms debounce and loads only once.
- `apps/web/src/components/canvas/types/whiteboard.types.ts`: persisted items lack dimensions, hierarchy, locking, style, revision, and provenance.
- `apps/api/src/modules/canvas/repositories/whiteboard.repository.ts`: whole-board JSON read/update boundary.
- `supabase/migrations/20260810184500_campaign_canvases.sql`: one board per campaign and no item/operation tables.
- `apps/agent-api/src/modules/artifacts/services/artifact-strategy.service.ts`: existing agent writes target `campaign_strategy_nodes`.
- `packages/agent-policy/src/action-contracts.ts`: `create_strategy_node` is Atlas-owned and is not a Canvas operation.
- `apps/web/src/features/studio/components/preview/workflow/WorkflowCanvas.tsx`: old strategy nodes render in Workflow, not Canvas.

## Recommended Approach

Keep `campaign_canvases` as the board identity during the first migration, then normalize its content into `canvas_items`, `canvas_connectors`, and `canvas_operations`. Add one transactional operation endpoint with optimistic revision checks and idempotency keys. Human UI mutations and Pixel actions both call this endpoint. Existing JSON graphs are migrated once and the old graph write path is removed after compatibility verification.

## Step-by-Step Implementation Plan

1. Database foundation
   - Add board `revision` and metadata.
   - Add normalized item, connector, and operation tables with campaign-derived RLS.
   - Backfill the existing graph into normalized rows where possible.
   - Contract: every committed batch increments the board revision once and records inverse operations.

2. Canvas API
   - Add `GET /api/canvas/campaigns/:campaignId/whiteboard` returning board/items/connectors.
   - Replace whole-graph PATCH with `POST .../operations`.
   - Validate base revision, idempotency key, operation count, item kinds, bounds, and references.
   - Apply the complete batch transactionally through a database RPC/repository chokepoint.

3. Web operation client
   - Replace graph serialization autosave with typed operation batching.
   - Track acknowledged revision and pending operation IDs.
   - Rebase safe position/content updates after revision conflicts; never silently overwrite.

4. Miro interaction shell
   - Vertical creation toolbar with Select, Hand, Sticky, Text, Shape, Connector, Frame, native ROAS card, Media, and Pixel.
   - Floating selection toolbar, resize handles, duplicate, lock, grouping, align/distribute, undo/redo.
   - Bottom navigation for zoom, fit, optional minimap, frames/layers.
   - Canvas focus mode so the board remains the dominant surface.

5. Native board objects
   - Add frames, sticky notes, text, shapes, generic cards, and resource cards.
   - Resource cards reference funnels, sequences/emails, ads, tasks, docs, presentations, offers, and media without copying source records.

6. Pixel capability
   - Add `get_canvas_board`, `list_canvas_items`, `apply_canvas_operations`, `arrange_canvas_items`, and `focus_canvas_viewport` as applicable.
   - Update hard schemas, valid actions, registry, handlers, policy, lifecycle, preflight, action contracts, generated docs, MCP catalog, structured errors, and circuit breaker coverage.
   - Pixel may invoke the governed operation surface directly when Canvas context is attached; attribution remains Pixel even if planning delegates internally.

7. Realtime and AI UX
   - Subscribe to committed board operations and merge by revision.
   - Attach board ID, revision, viewport, and selected IDs to Pixel chat context.
   - Large AI changes preview as ghost objects; explicit small changes commit directly with Undo.
   - Focus the viewport on Pixel's affected bounds after commit.

8. Collaboration, performance, and rollout
   - Presence/cursors, comments, layers/frames panel, templates, keyboard access, touch behavior.
   - Virtualize large boards and measure load, operation latency, render count, conflict rate, and failed batches.
   - Remove the old whole-graph write path and obsolete Canvas references to Workflow strategy nodes.

## Data and Contract Map

- Input: human interactions or Pixel operation batches.
- Validation: Zod hard schema plus semantic reference/revision validator.
- AuthZ: authenticated user + inherited Campaign/Program access; edit required for mutation.
- Storage: board identity, normalized items/connectors, append-only operation history.
- Output: committed revision, created-ID mapping, affected bounds, inverse batch.
- Side effects: realtime operation event and optional viewport-focus client event.
- Idempotency: unique `(board_id, idempotency_key)`.

## Test Plan

- Unit: schema bounds, operation inversion, layout, serialization, revision conflict.
- Repository/RPC: atomic batch, duplicate idempotency key, invalid references, RLS.
- API: viewer/editor permissions, stale revision, response contract.
- Agent: capability drift, policy exposure, preflight, structured errors, adjacent workflow circuit breaking.
- Web: selection tools, creation, resize, undo/redo, realtime merge, Pixel preview/apply.
- Manual: light/dark, keyboard, mobile/tablet, two-browser collaboration, Pixel live board creation.

## Rollout and Verification

- Gate normalized operations behind a Canvas operations feature flag until migrated boards load identically.
- Deploy migration before API, API before web, and agent capability after operation endpoint verification.
- Rollback by disabling operation writes; retain operation rows and compatibility graph until final cleanup.
- Do not run builds unless explicitly requested; use focused tests, lint, and typecheck.

## Missing Evidence

- Production/staging agent definition and generated skill synchronization is not verified locally.
  - Smallest experiment: read the DB-backed Pixel definition/skills and generated runtime artifacts after source changes.
  - Risk if skipped: source tests pass while deployed Pixel lacks the actions.
- Authenticated visual testing is unavailable in the current automated browser session.
  - Smallest experiment: use the user's signed-in local browser after each UI phase.
  - Risk if skipped: interaction or layout regressions survive static checks.
