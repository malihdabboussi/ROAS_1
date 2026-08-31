# Changelog - August 31, 2026

## 2026-08-31 08:36 - [FEATURE]

What: Added multiple named canvases per campaign, create/switch controls, board-scoped persistence and Pixel actions, and semantic Miro-style card and connector roles for the MFS Current Scene and Ideal Scene diagrams.

Why: Campaign Canvas was hard-coded to one board, so the two requested Multifamily Strategy maps could not exist independently and Pixel could write into the wrong board.

Impact: Existing boards remain the default, users can add and switch named boards, every operation/revision/realtime channel stays board-scoped, and the MFS maps can retain their specified live/complete/dead-end/changed/to-build/band visual language.

Files: `supabase/migrations/20260830120000_named_campaign_canvases.sql`, Canvas API/repository/service/types, Canvas web UI/hooks/styles, Pixel action schema/repository/service/docs/tests, `documentation/features/programs.md`.
