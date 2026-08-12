# Changelog - [August 11, 2026]

## [2026-08-11 18:22] - [FIX]

What: Unscoped artifact creation no longer dead-ends. In `resolveCampaignId` (agent-api write path), a request context with a space but no campaign now resolves the space's own campaign (new `findSpaceCampaignId` repository lookup on `spaces.campaign_id`), and a personal-scope context falls back to the user's General campaign via the existing `ensureGeneralCampaignId` — instead of returning null and triggering "campaign_id required. Create or select a campaign first." downstream in every create service. The read path (`resolveActiveCampaignIdForContext`) is unchanged and still returns null without touching the database. Also added the missing `space_id` column + partial index to `blog_posts`, `emails`, and `conversation_documents` (migration `20260811190000`) — the last three artifact tables without it, whose create paths already send `space_id` via scope defaults.

Why: Dylan's approved routing model for the Create menu: artifacts inherit the chat's scope — space chat → that space's campaign, campaign chat → that campaign, unscoped/personal chat → General (internal bucket). Personal chats previously errored on create_presentation/create_funnel/etc.

Impact: Creating any artifact from a personal or space-scoped chat now lands it in the right campaign (General for personal) instead of failing. Three new regression tests pin the fallback behavior; the pre-existing read-path test still pins that reads never attach General. 42/42 service tests pass; 7 unrelated artifacts-module test failures reproduce identically on unmodified main (verified by revert).

Files: apps/agent-api/src/modules/artifacts/services/artifact-legacy-session-campaign.service.ts, apps/agent-api/src/modules/artifacts/repositories/artifact-legacy-session-campaign.repository.ts, apps/agent-api/src/modules/artifacts/services/artifact-legacy-session-campaign.service.test.ts, supabase/migrations/20260811190000_add_space_id_missing_artifact_tables.sql.

## [2026-08-11 18:11] - [FEATURE]

What: Added a grouped "+ Create" submenu to the chat composer plus-menu. New catalog config (`shell-create-menu.config.ts`) defines 5 groups in Dylan's approved order — Start With (Offer, Avatar/ICP), Docs & Decks (Document, Presentation), Marketing (Funnel, Ad, Email Sequence, Script), Media (Image, Video), More (Website, Social Post, Ad Campaign, plus Form/Spreadsheet greyed "Soon"). Each item is a quick start: picking it seeds the composer with its prompt (without sending) and rides the item's systemContext to target the exact backend action (create_offer, create_avatar, create_docx, create_presentation, create_funnel, create_ad, create_sequence, generate_image, generate_video, create_website, create_social_post, create_ad_campaign) at send time via the existing quick-start capability-chip flow. Replaced the old lone "Generate image" plus-menu row (its behavior is superseded by the Create → Image item).

Why: Approved game plan (claude.ai artifact 569139fd) — ChatGPT-style create menu where every output type routes through the chat and the agent does the intake; discoverability for the platform's full creatable surface.

Impact: Space chat composer "+" now shows "Create" as the first row with a grouped submenu; selecting an item pre-fills the composer and arms the matching quick-action system context (visible as the capability chip). Surfaces that don't pass `onCreateMenuSelect` fall back to plain prompt seeding. No backend changes.

Files: apps/web/src/components/shell/shell-create-menu.config.ts (new), apps/web/src/features/studio/components/ChatInput/chat-input-plus-menu-create-panel.tsx (new), chat-input-plus-menu-view.tsx, chat-input-policy.ts, use-chat-input-plus-menu.ts, use-chat-input-plus-controller.ts, chat-input.types.ts, ChatInput.tsx, apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx, plus test updates (chat-input-plus-menu-view.test.tsx, use-chat-input-plus-controller.test.ts, use-chat-input-plus-menu-props.test.ts, chat-input-plus-menu-portal.test.tsx, chat-input-normal-footer.test.tsx).
