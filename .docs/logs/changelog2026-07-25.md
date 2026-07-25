# Changelog - July 25, 2026

## 2026-07-25 08:18 - [FEATURE]

What: Added direct text and image editing in full funnel/website mode, serialized background saves with live status feedback, date-grouped and bookmarkable history, one-click first publish, and an explicit Publish updates action.

Why: The builder had durable file history and visual styling, but the core create-edit-recover-publish loop required too many indirect steps compared with leading AI website builders.

Impact: Users can edit selected content in place, replace images from their media library, understand when changes are saved, mark important versions, restore without losing later history, and publish through a clearer snapshot workflow.

Files: `apps/web/src/features/studio`, `apps/web/src/features/spaces/components/chat/FunnelDesignChatView.tsx`, `apps/web/src/lib/artifacts/comment-artifact-types.ts`, `apps/api/src/modules/funnels`, `supabase/migrations/20260725160000_funnel_history_bookmarks.sql`, `scripts/roas/migration-order.txt`, `documentation/features/website-artifacts.md`
