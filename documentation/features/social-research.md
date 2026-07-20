# Social Research

Last Modified: 2026-07-20

## Overview

Social Research is the shared Spaces research surface behind the separate IG Research, TikTok Research, YouTube Research, and X Research views. Ads Research adds a mission-driven research workspace plus the existing manual ad-library search. Each view has its own type, tracked accounts, filters, settings, and persisted config, while the implementation uses shared platform-aware services and components.

Supported platform view types:

- `instagram_research` with `ig_research_config`
- `tiktok_research` with `tiktok_research_config`
- `youtube_research` with `youtube_research_config`
- `twitter_research` with `twitter_research_config`

## Data Flow

1. The user adds or syncs a platform handle from the People panel.
2. The web client calls `POST /api/spaces/:id/social-research/:platform/accounts` (and sync/remove/analyze endpoints) with the selected Space `org_id` as request org context for team/shared spaces.
3. `SocialResearchOrchestrationService` on the API calls Social Analysis, caches images, and persists `space_items`.
4. Each item stores its platform view marker in `custom_data._view_type`; new rows also store `custom_data._platform`, while automation mapping derives the platform from `_view_type` for older rows.
5. Thumbnails and profile images are cached through the media backend before persistence.
6. The grid, list, and modal render cached Vibey-hosted URLs instead of temporary platform CDN URLs.
7. Chat agents can run Social Research and Ads Research searches through agent-api actions. Those actions call the same manual Space search endpoints and persist the same saved-search snapshots used by the Space views.
8. In Ads Research, the user can start the deterministic `ads-research` mission. Atlas prepares campaign context, Blaze analyzes mounted Meta performance and competitive ads, then produces native Docs for analysis, recommendations, draft copy, and video scripts before a human approval gate.

## Backend Layer

`SocialResearchOrchestrationService` (`apps/api/src/modules/spaces/services/social-research-orchestration.service.ts`) owns sync, outlier selection, enrichment, and UI-triggered add/sync/analyze. It uses `ScrapeCreatorsApiService`, `MediaService.cacheSocialImage`, and `SpacesRepository` under request-scoped Supabase (RLS).

Outlier selection requires a valid `taken_at` timestamp inside the selected window. Enrichment only counts an item when the requested caption, transcript, or hook is present after the run; unavailable transcript/hook requests stay visible as zero enriched items instead of inflating the count.

Instagram transcript enrichment uses ScrapeCreators first. If ScrapeCreators returns no transcript, the API calls the agent-api `extract_url_transcript` action as a fallback so talking-head reels can be recovered through the existing yt-dlp + Deepgram path.

`SocialResearchController` routes:

- `POST /api/spaces/:id/social-research/:platform/accounts`
- `POST /api/spaces/:id/social-research/:platform/accounts/:handle/sync`
- `DELETE /api/spaces/:id/social-research/:platform/accounts/:handle`
- `POST /api/spaces/:id/social-research/:platform/items/:itemId/analyze`

Agent-triggered research uses `run_social_research_search` in agent-api. The action calls `POST /api/spaces/:id/social-research/:platform/topic-search`, then `POST /api/spaces/:id/social-research/topic-searches` when results are returned. Optional `save_top_n` also calls `POST /api/spaces/:id/social-research/:platform/topic-search/save` to save top results as Space items.

Ads Research uses matching agent-api actions:

- `search_ads_research_advertisers` calls `GET /api/spaces/:id/ads-research/:platform/advertisers`.
- `run_ads_research_search` calls `POST /api/spaces/:id/ads-research/:platform/search`, then `POST /api/spaces/:id/ads-research/searches` when results are returned.
- Optional `save_top_n` calls `POST /api/spaces/:id/ads-research/:platform/save`.

These actions are thin wrappers around the existing manual API path. Saved searches therefore populate `space_topic_searches` and `space_ad_searches`, not a separate agent-only store.

The media backend exposes `POST /api/media/cache-social-images` for authenticated batch image caching. The request includes `platform`, allowing Instagram, TikTok, YouTube, and X image sources to share the same caching path while preserving platform-specific validation.

`POST /api/media/cache-instagram-images` remains an API alias only for old callers. New code should use the social endpoint.

`MediaService.cacheSocialImage` validates the source host, fetches the image with platform-compatible headers, normalizes it to JPEG, stores it in the existing `media` bucket, and creates a `media_assets` row with platform-aware metadata.

## Frontend Layer

`social-research.service.ts` is a thin API client for add/sync/remove/analyze plus UI helpers (`formatViewCount`, `extractHook`, `parseSocialHandle`, account search). Orchestration no longer runs in the browser.

Account add, sync, remove, and Social Research schema saves use the selected `activeSpace.org_id` instead of relying on the browser's global active org. This keeps People-panel mutations scoped to the Space the user is viewing, even when their session org differs.

The Ads Research view opens on **Research Runs**. **Run Research** opens Blaze in the slide-in chat and starts a short intake covering the research purpose, Standard or Deep depth, and any specific focus. Blaze creates the deterministic `ads-research` mission after the user answers and confirms the new mission in chat. Opening a run now shows a visual research report inside Ads Research. The report combines the exact saved ad-library cards used by Blaze with the analysis, recommendations, copy, and script deliverables. **Rerun Research** opens Blaze with a replacement-run preflight that verifies the exact campaign and Space, campaign-specific Customer Brain evidence, and the mounted Meta account before asking the user to confirm the client identity. The replacement run carries forward valid kickoff details but does not treat the old analysis or deliverables as factual input. Mission Details remains a secondary action for operational status, subtasks, activity, and approval. **Library Search** remains available as the secondary surface for manual Meta, TikTok, and Google ad-library searches. Library-only group, layout, sort, and refresh controls stay hidden while Research Runs is active.

The Ads Research mission deliberately stops before final creative production or Meta publishing. Recommended copy and video scripts load `dylans-super-voice` as their only voice authority, use native editable Docs, and reject PDF output. Ad Creation, Ad Launch, and Ad Optimization remain separate future workflows.

Current Ads Analysis verifies the live mounted Meta connection before drawing conclusions. Agent-side Meta requests carry the active organization context through to the API, and Blaze may only report live data as unavailable after a Meta tool returns a concrete failure. Missing documents or incomplete research context are not evidence that Meta is disconnected.

Every mission begins with `ADS-R#0 - Verified Campaign Research Context`. Atlas resolves the runtime campaign and Space first, then records a sourced client identity check covering the business model, offer, and audience. Customer Brain is used for campaign-specific customer evidence, while Company Brain remains organization-level guidance. Meta account labels and competitive ad-library findings are evidence labels only and cannot become client facts. Missing or conflicting identity evidence blocks analysis instead of allowing an inferred vertical.

Every ad-library search launched inside a mission records that mission id on the saved search snapshot. A saved search can belong to multiple research missions when Blaze reuses the same query. This preserves the Space library as one source of truth while allowing each run report to reconstruct its own visual evidence. Runs created before mission linking use a bounded run-time window to recover visual snapshots that were saved during that run.

New Space items store:

- `thumbnail_url` as the cached display URL.
- `thumbnail_source_url` as the original platform URL.
- `thumbnail_asset_id` for durable refresh and repair.
- `thumbnail_storage_path` for the Supabase object path.
- `thumbnail_cached_at`, `thumbnail_cache_status`, and `thumbnail_cache_error` for repair visibility.

Tracked accounts store matching profile image cache metadata using `profile_pic_*` fields.

## Rendering Contract

Thumbnails render only when `thumbnail_asset_id` exists and `thumbnail_url` is not a raw platform CDN URL. Legacy or failed-cache rows show the placeholder until account sync repairs them.

Videos still use the existing same-origin media proxy. Video caching remains intentionally outside this feature because storage and cost implications differ from thumbnails.

TikTok slideshows use a separate `slideshow` media type and can be toggled independently from videos and photos.

YouTube long-form videos use `youtube_video` (16:9 grid cards) and Shorts use `youtube_short` (9:16). Each can be toggled independently via `media_show_yt_videos` and `media_show_yt_shorts`.

X tweets use `tweet` (square cards) and video tweets use `tweet_video` (16:9). Each can be toggled independently via `media_show_x_tweets` and `media_show_x_videos`.

## Decision Log

### 2026-07-20 - Verified identity and replacement reruns

Ads Research now requires a sourced client identity handoff before Blaze analyzes current or competitive ads. This prevents agency names, Meta account labels, or competitor observations from being mistaken for the client's business model. A run report can start a fresh replacement mission through Blaze after the user confirms the resolved identity and account mapping.

### 2026-07-20 - Mission-driven Ads Research workspace

Ads Research now opens on a visual Research Runs workspace backed by the deterministic `ads-research` mission. The mission connects Brain context, mounted Meta performance, visual ad-library evidence, recommendations, draft copy, and draft video scripts, then pauses for human approval. The original manual ad-library workflow remains intact under Library Search so research evidence can still be found or curated directly.

### 2026-06-19 - Space-scoped account mutations

People-panel account add, sync, remove, and schema-save calls now pass the selected Space org id through the backend client. This prevents team Space mutations from failing with `Space not found` when the browser's global active org is stale or points at a different org.

### 2026-06-16 - Chat-triggered saved research searches

Added agent-api actions for chat-triggered Social Research and Ads Research. The actions reuse the existing Space search controllers and saved-search controllers so agent-initiated searches appear in the same saved-search views as manual searches. Social chat search supports Instagram, TikTok, and YouTube saved topic searches; Ads chat search supports Meta, TikTok, and Google with Google limited to brand search.

### 2026-05-28 - Instagram transcript fallback

IG Research transcript analysis now keeps ScrapeCreators as the first source and falls back to agent-api `extract_url_transcript` when ScrapeCreators returns no usable transcript. This preserves existing Social Research storage and response contracts while improving transcript recovery for talking-head reels where ScrapeCreators returns `transcripts: [null]`.

### 2026-05-25 - X Research view

Added `twitter_research` as a fourth Social Research view type (UI label **X**; internal slug `twitter`). ScrapeCreators Twitter profile/user-tweets/tweet/transcript endpoints feed the same orchestration stack as IG/TikTok/YouTube. Automation platform selectors add `twitter` and extend `all` to IG+TT+YT+X; `both` remains IG+TT for backward compatibility.

### 2026-05-25 - YouTube Research view

Added `youtube_research` as a third Social Research view type. ScrapeCreators YouTube channel/videos/shorts/details/transcript endpoints feed the same orchestration stack as IG/TikTok. Automation platform selectors add `youtube` and `all` (IG+TT+YT); `both` remains IG+TT for backward compatibility.

### 2026-05-20 - Backend orchestration and automations

Social sync, outlier pick, and enrichment run on the API. Scheduled automations can chain `sync_social_research` → `select_social_outliers` → `enrich_social_research_items` → `create_task` → `send_to_agent`. Step outputs expose `digest`, `selected_item_ids`, and counts for templates.

### 2026-05-20 - Automation hardening

Social research automations now derive missing platform metadata from view type for legacy rows, exclude undated posts from windowed outlier selection, require social research views for sync, validate API platform params, and only report enrichment counts when requested data is actually available.

### 2026-05-12 - Generalize IG Research into Social Research

IG Research and TikTok Research are separate user-facing views, but shared internally. This keeps the Add view catalog clear while preventing duplicated research logic. Platform-specific behavior is selected through `SocialPlatform`, view type, and config key.

### 2026-05-12 - Remove Obsolete IG Shims

The old `instagram-research.service.ts`, `ig-image-proxy.ts`, and `use-space-ig-account-actions.ts` shims were removed after all active callers moved to platform-aware Social Research APIs.

### 2026-05-09 - Cache Social Images in Vibey Storage

Platform CDN URLs are temporary and can fail later even if the saved URL is still present in the database. The durable fix is to store image bytes in Vibey-owned storage and keep the original URL only as source metadata.
