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
