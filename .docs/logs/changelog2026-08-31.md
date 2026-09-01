# Changelog - August 31, 2026

## 2026-08-31 08:36 - [FEATURE]

What: Added multiple named canvases per campaign, create/switch controls, board-scoped persistence and Pixel actions, and semantic Miro-style card and connector roles for the MFS Current Scene and Ideal Scene diagrams.

Why: Campaign Canvas was hard-coded to one board, so the two requested Multifamily Strategy maps could not exist independently and Pixel could write into the wrong board.

Impact: Existing boards remain the default, users can add and switch named boards, every operation/revision/realtime channel stays board-scoped, and the MFS maps can retain their specified live/complete/dead-end/changed/to-build/band visual language.

Files: `supabase/migrations/20260830120000_named_campaign_canvases.sql`, Canvas API/repository/service/types, Canvas web UI/hooks/styles, Pixel action schema/repository/service/docs/tests, `documentation/features/programs.md`.

## 2026-08-31 09:08 - [FIX]

What: Made source URLs on standard Canvas cards render as clickable full links without converting the cards into embedded-page previews, and added a semantic annotation role for margin/footer notes.

Why: The MFS board specification requires every displayed URL to remain a live hyperlink while preserving the process-card layout.

Impact: Canvas cards can retain their normal title, body, metric, and semantic styling while offering a directly usable source link, and annotations can render without being misclassified as dead ends.

Files: `apps/web/src/components/canvas/components/WhiteboardNode.tsx`, `apps/web/src/components/canvas/types/whiteboard.types.ts`.

## 2026-08-31 09:27 - [FIX]

What: Added the persisted Canvas visual-role and metric fields to the hydrated node contract.

Why: Production typechecking correctly rejected semantic-role lookup while those persisted fields were still inferred as unknown.

Impact: Miro-style card roles and metric lines hydrate with explicit types and the web deployment can compile safely.

Files: `apps/web/src/components/canvas/types/whiteboard.types.ts`.

## 2026-08-31 09:46 - [FIX]

What: Added stable directional handle IDs to Canvas nodes and routed non-loop semantic connectors as orthogonal step lines.

Why: The MFS visual audit showed valid connectors fanning diagonally because persisted handle directions could not bind to unnamed React Flow handles.

Impact: Main paths, outcomes, retargeting feeds, and calling-layer connectors bind to their intended sides; ascension/reactivation loops retain curved routing.

Files: `apps/web/src/components/canvas/components/WhiteboardNode.tsx`, `apps/web/src/components/canvas/lib/whiteboard-graph.ts`.
