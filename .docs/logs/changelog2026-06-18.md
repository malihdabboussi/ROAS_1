# Changelog - June 18, 2026

## 2026-06-18 19:58 - [FIX]

What:
- Added campaign, Space, and org scope suffixes to mission-worker mission and subtask OpenClaw session keys.
- Passed `SPACE_ID` into static mission runtime instructions and aligned stalled mission/subtask watchdog probes with the scoped session keys.
- Made Agent API mission artifact campaign resolution derive missing campaign scope from mission context and refuse the legacy personal `General` fallback for unscoped mission sessions.
- Added focused regression tests for scoped mission/subtask session keys and mission campaign fallback prevention.

Why:
- Hadash/Hadassah Space mission presentations were persisted under the user's personal `General` campaign with `space_id = null`, so the Space presentation tab could not list them even though the HTML presentation files existed.

Impact:
- New mission-authored presentations and artifacts keep the mission campaign/Space scope through runtime execution and recovery probes.
- Mission sessions missing campaign scope now fail closed instead of creating artifacts in a personal fallback campaign.

Files:
- `apps/mission-worker/src/modules/missions/services/agent-runtime.service.ts`
- `apps/mission-worker/src/modules/missions/services/gateways/mission-openclaw.gateway.ts`
- `apps/mission-worker/src/modules/missions/services/missions.scheduler-recovery.watchdogs.phase-b.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-legacy-session-campaign.service.ts`
- `apps/mission-worker/src/modules/missions/services/__tests__/agent-runtime.service.test.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-legacy-session-campaign.service.test.ts`
- `documentation/features/missions.md`

## 2026-06-18 19:54 - [FIX]

What:
- Replaced task artifact modal toolbar CSS tooltips with the shared portaled `Tooltip` component so icon help is not clipped by the modal shell.
- Made the shared deliverable export trigger visible and added presentation-specific HTML, PDF, and PPT exports to entity-backed task/presentation previews.
- Added a focused presentation deliverable export helper that reuses the presentation view export utilities.

Why:
- Presentation artifacts opened from task activity had broken clipped tooltips and did not expose the same export options available from the presentation view.

Impact:
- Task modal presentation artifacts can now download HTML and export PDF/PPT from the shared artifact preview. Other generated entity artifacts keep their existing PDF/Markdown/JSON export menu, and direct file artifacts have an explicit download attribute on the file action.

Files:
- `apps/web/src/components/deliverables/DeliverablePreviewModalToolbar.tsx`
- `apps/web/src/components/deliverables/DeliverablePreviewExportFooter.tsx`
- `apps/web/src/components/deliverables/use-deliverable-export-actions.ts`
- `apps/web/src/components/deliverables/deliverable-presentation-export.ts`
- `apps/web/src/components/deliverables/deliverable-preview-modal.types.ts`
- `apps/web/src/components/deliverables/DeliverablePreviewModal.tsx`
- `documentation/features/missions.md`

## 2026-06-18 19:26 - [STYLE]

What:
- Changed light-mode card/popover/modal surface tokens from pure white to warm white: web `--card`, `--popover`, `--color-card`, and `--fill-card`; website `--bg-surface`, `--bg-card`, and studio preview light `--color-card`.

Why:
- Pure `#ffffff` cards/modals felt disconnected from the warm cream app background and the strengthened light glass treatment.

Impact:
- Light-mode cards, modals, popovers, and compatible website preview surfaces now share a warmer white surface that should sit more naturally on the cream app canvas. Dark mode is unchanged.

Files:
- `apps/web/src/app/globals.css`
- `apps/website/src/app/globals.css`

## 2026-06-18 19:22 - [STYLE]

What:
- Strengthened light-mode muted text and icon tokens: web `--muted-foreground` / `--color-muted-foreground` and website `--text-muted` / related dim text aliases now use a darker neutral.
- Synced the website light studio-preview compatibility block to the same stronger muted foreground value.

Why:
- Light-mode menu text, secondary labels, and chrome icons were readable but too weak against the lighter glass/card surfaces.

Impact:
- Menus, inactive icons, metadata labels, and muted UI chrome should read clearer in light mode while still staying secondary to `text-foreground`. Dark mode muted values are unchanged.

Files:
- `apps/web/src/app/globals.css`
- `apps/website/src/app/globals.css`

## 2026-06-18 19:19 - [STYLE]

What:
- Strengthened light-mode glass contrast by increasing light `--color-border`, `--color-hover-subtle`, `--color-surface-subtle`, and website light glass surface tokens.
- Added tokenized `--color-glass-card-*` values in both web and website globals and converted `.card-glass` to read those tokens.
- Kept dark `.card-glass` visual values equivalent to the previous hardcoded dark values.

Why:
- In light mode, card glass and subtle panels were reading too close to the page background, making Team/Agent cards and similar glass surfaces feel washed out.

Impact:
- Light-mode glass cards, subtle panels, and hover surfaces should have stronger separation without per-component overrides. Dark mode remains visually unchanged for `.card-glass`.

Files:
- `apps/web/src/app/globals.css`
- `apps/website/src/app/globals.css`

## 2026-06-18 19:15 - [FIX]

What:
- Replaced the Spaces missions realtime full-list reload with row-level mission updates from Supabase `postgres_changes` events.
- Scoped `mission_subtasks` realtime handling to the affected mission row and any already-cached subtasks instead of clearing the whole subtask cache and calling the full `loadData()` path.

Why:
- The missions view was already subscribed to Supabase Realtime, but every realtime event was routed through `loadData()`, which set the screen-level loading state and repainted the list repeatedly.

Impact:
- Background mission and subtask changes now update the visible missions list without repeatedly blanking/reloading the screen. Initial load and explicit user-action refreshes remain unchanged.

Files:
- `apps/web/src/features/spaces/components/MissionsView.tsx`

## 2026-06-18 19:05 - [UTIL]

What:
- Added a new design token + utility for subtle translucent elevated panels: `--color-surface-subtle` (light `rgba(0,0,0,0.035)`, dark `rgba(255,255,255,0.04)`) and `.bg-surface-subtle`, in BOTH `apps/web` and `apps/website` globals.css (synced per §5).
- Light-mode token sweep, batch 3 (surfaces): swapped base `bg-white/[0.02–0.05]` → `bg-surface-subtle` across 22 `apps/web` `*.tsx` files.

Why:
- `bg-white/[0.0x]` panels are invisible in light mode (white on cream). No existing token was a clean drop-in (glass utilities add border/blur; `bg-secondary` is opaque). Dark value matches the prior ~0.03–0.04 white tint, so dark is ~unchanged; light gets a faint dark elevation. User-approved token.

Impact:
- Subtle card/field/stat-box surfaces now theme correctly. Only the BASE utility was swapped — `hover:`/`focus:bg-white/[0.0x]` variants (17) and `bg-white/10` (more prominent, 14 files) are left for review (a custom class can't be a Tailwind variant; needs a hover token). Fixed-dark/canvas surfaces and leave-by-design files excluded.

Files:
- `apps/web/src/app/globals.css`, `apps/website/src/app/globals.css` (token + utility)
- 22 `apps/web/src/**/*.tsx` (surface class only)

## 2026-06-18 18:57 - [FIX]

What:
- Added human assignee resolution for agent-created and agent-updated Space tasks using `assignee_name`, `assignee_email`, or `assignee_id`.
- Updated the task action schema and Vibey API task docs so agents assign active organization members directly instead of looking for campaign team members.
- Added regression coverage for create/update assignment by name/email and ambiguous human-name handling.

Why:
- Agents could only use assignee IDs, so name-based assignment ended with `assignee_type` set but `assignee_id` missing/null and pushed the agent toward an irrelevant campaign-team path.

Impact:
- Human task assignment can resolve active org members by name/email; ambiguous or missing matches now return a clear org-member error instead of implying humans must be added to the campaign team.

Files:
- `apps/agent-api/src/modules/artifacts/services/artifact-tasks.service.ts`
- `apps/agent-api/src/modules/artifacts/services/__tests__/artifact-tasks.service.test.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`
- `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`
- `docker/agents/vibey/skills/vibey-api/references/tasks.md`
- `docker/agents/vibey/skills/vibey-api/SKILL.md`

## 2026-06-18 18:55 - [STYLE]

What:
- Light-mode token sweep, batch 2 (borders): swapped `border-white/10` → `border-border` across 35 `*.tsx` files in `apps/web/src` (spaces, team, studio, settings, brain, channels, etc.).
- Excluded leave-by-design files: public-agent embed, ad-preview/*, FunnelTypeMockups, Home/Agenda illustrations, unsubscribe page, Instagram/LinkedIn profile views, Meta sims, RoleEmblem, theme import dialogs.

Why:
- AGENTS.md §5.5 token conformance. `border-border` resolves to `rgba(255,255,255,0.1)` in dark — identical to `border-white/10` — and `rgba(0,0,0,0.08)` in light, so dark appearance is unchanged and light borders become visible.

Impact:
- Borders are token-driven and theme-correct; zero dark-mode change (exact opacity match). Only `border-white/10` touched — `border-white/5`, `/15`, `/20` left for review (no exact token yet). Companion to the text-white per-area sweeps logged at 18:49 (settings/billing) and the team/channels entry.

Files:
- 35 `*.tsx` across `apps/web/src` (border color class only).

## 2026-06-18 18:49 - [STYLE]

What:
- Light-mode token migration: swapped high-confidence `text-white` to `text-foreground` on plain icons sitting on card surfaces (45 swaps) and `placeholder:text-white/NN` to `placeholder:text-muted-foreground` on transparent modal inputs (2 swaps) across settings/billing/email/transfer features.

Why:
- White text was hardcoded, breaking light mode; these instances are plain foreground content on neutral card/modal surfaces, so the token swap themes them correctly in both modes.

Impact:
- Plan-feature icons, the Package add-on Brain icon, and the create-skill dialog placeholders now render correctly in light mode. Left untouched (reported for review): white text/icons on filled chips (`bg-destructive` button, `bg-primary` checkbox, avatar circles, step-circle checks), and ambiguous count badges in EmailLogsContent.

Files:
- `apps/web/src/features/settings/components/settings-content/billing-page/plan-features.tsx`
- `apps/web/src/features/settings/components/settings-content/billing-page/PackageTab.tsx`
- `apps/web/src/features/settings/components/settings-content/skills-page/dialogs/create-skill-dialog.tsx`

## 2026-06-18 18:34 - [FIX]

What:
- Prevented the Spaces chat panel from consuming or clearing a home-page chat seed while it is mounted for a different space than the `space` URL parameter.

Why:
- Sending from Home to a selected space could first mount the previous active space's chat panel; that stale panel saw `home_seed=1`, found no matching seed for itself, cleared the session payload, and left the requested space showing old conversations instead of starting the new Vibey conversation.

Impact:
- Home composer sends now wait for the requested space panel before consuming the seed, so the typed message starts a new Vibey conversation in the selected space.

Files:
- `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`

## 2026-06-18 18:33 - [STYLE]

What:
- Light-mode token sweep, batch 1 (modal/page backdrops): swapped ~60 hardcoded `bg-black/50–80` scrims to the existing `bg-modal-overlay` token across the web app (modal/dialog/drawer backdrops in components/, spaces, studio, team, billing, settings, brain, themes, mission-control, channels, org, projects, autopilot).
- Excluded by design: image/media hover-overlays that sit on user image content (`group-hover`/`opacity-0` — AdSettingsPanel ×3, BlogPostPreview, AgentInfoPanelPortraitSection ×2) stay `bg-black/*`; and leave-by-design platform simulations (ad-preview/*, MetaPublishModal, MetaIntegrationsReviewModal, AllContactsModal).

Why:
- AGENTS.md §5.5: every color via a token. `bg-modal-overlay` (rgba(0,0,0,0.6)) exists precisely to replace ad-hoc `bg-black/NN` modal overlays. Scrims correctly stay dark in both themes (they dim the page behind the modal).

Impact:
- Modal backdrops are token-driven and theme-consistent. Dark appearance unchanged except BrainVoiceOrb scrim normalized 0.8→0.6 (negligible). No behavior change. ~60 files; full list in `git diff`.

Files:
- ~60 `*.tsx` modal components across `apps/web/src` (backdrop line only). Representative: `components/layout/Sidebar.tsx`, `components/layout/SearchModal.tsx`, `features/billing/components/*Dialog.tsx`, `features/spaces/components/**/*Modal.tsx`, `features/brain/components/CortexMaxModal.tsx`.

## 2026-06-18 16:44 - [FIX]

What:
- Made web app scrollbars theme-aware: added `--scrollbar-thumb` / `--scrollbar-thumb-hover` tokens (dark thumb on light surfaces in `:root`, light thumb on dark surfaces in `.dark`) and converted the `.dark`-scoped `::-webkit-scrollbar` rules + the hardcoded-white `.scrollbar-thin` to read those tokens — so scrollbars are styled and visible in both themes (previously only styled under `.dark`, with `.scrollbar-thin` using white-on-transparent that vanishes on light backgrounds).
- Made the favicon adapt to the OS color scheme via `prefers-color-scheme` media descriptors (`icon-white.png` for dark, `icon-black.png` for light) instead of always white.

Why:
- Light-mode plumbing: scrollbars were dark-only and the favicon was locked white, both broken on light surfaces/tabs. Ported the token-driven scrollbar pattern that `apps/website` already uses (verified already token-driven there, so no website change needed — end state is synced per §5).

Impact:
- Scrollbars are visible and correctly contrasted in both themes; dark appearance unchanged (token values match the prior dark rgba). Browser-tab icon matches the OS light/dark chrome.

Files:
- `apps/web/src/app/globals.css`
- `apps/web/src/app/layout.tsx`

## 2026-06-18 16:43 - [FIX]

What:
- Fixed the shared backend `UUID_RE` in `apps/api/src/modules/leads/controllers/leads-controller-utils.ts`. The regex was missing its fourth group (`8-4-4-12` instead of the correct `8-4-4-4-12`), so it failed to match any real 36-char UUID.

Why:
- Every suffixed contact endpoint (`/contacts/:id/activity`, `/emails`, `/conversations`, `/notes`, `/send-email`, `/reclassify`, conversation-link) guards on `UUID_RE.test(id)` and threw `BadRequestException('Invalid contact id')` for all valid contact ids. The contact detail/timeline panels (which call `/activity`, `/emails`, `/conversations` with no `.catch`) surfaced this as an uncaught "Invalid contact id" runtime error on load. Frontend `UUID_RE` was correct, so the valid id passed the client guard and was rejected only by the backend.

Impact:
- Contact pages load again; activity timeline, communications (emails/conversations), notes, reclassify, and send-email endpoints accept valid contact ids. No schema or API-shape change.

Files:
- `apps/api/src/modules/leads/controllers/leads-controller-utils.ts`

## 2026-06-18 16:37 - [DOCS]

What:
- Added AGENTS.md §5.5 "Design tokens & theming (zero exceptions)": every color must come from a `--color-*` token via a utility class, no theme branching, the canonical hardcoded→token swap map, the "create the token, don't hardcode" workflow (light + dark values in both `apps/web` and `apps/website` globals.css), and the two legitimate exceptions (by-design fixed surfaces; canvas/third-party widgets reading tokens in JS).

Why:
- Establish a single standing standard before the light-mode token conformance sweep, so token usage is enforced going forward and light mode themes automatically as files conform.

Impact:
- All agents now have an explicit, checkable token rule for theme-able color. No code behavior change.

Files:
- `AGENTS.md`

## 2026-06-18 16:37 - [FEATURE]

What:
- Routed the previously orphaned `AppearancePageContent` into `AccountSettingsModal` (added `appearance` section type, dynamic import, nav item with `Palette` icon, switch case) so users can reach the Light/Dark toggle from Account Settings.
- Replaced the hardcoded `<Toaster theme="dark">` in `layout.tsx` with a new `ThemedToaster` client component that follows `next-themes` `resolvedTheme`, rendered inside the `ThemeProvider` in `root-providers.tsx`.

Why:
- The light-mode infrastructure existed but the toggle was never wired into any settings modal, and toasts were locked dark — both blocking light mode from being reachable/usable. Default theme intentionally kept `dark` (no flip to system until the component token sweep is done).

Impact:
- Account Settings → Appearance now exposes the theme toggle; toasts match the active theme. Foundation for the light-mode rollout; no other surfaces changed yet.

Files:
- `apps/web/src/features/settings/components/AccountSettingsModal.tsx`
- `apps/web/src/features/settings/contexts/AccountSettingsModalContext.tsx`
- `apps/web/src/app/themed-toaster.tsx`
- `apps/web/src/app/root-providers.tsx`
- `apps/web/src/app/layout.tsx`

## 2026-06-18 16:17 - [FIX]

What:
- Added display labels for space notification types (`space_task_comment`, etc.) in `notification-meta.ts`.
- Unknown notification types now title-case on fallback instead of showing raw lowercase snake_case.

Why:
- `space_task_comment` had no label mapping, so the filter showed `space task comment` while other types used proper names.

Impact:
- Filter and feed rows show **Task Comment** and matching labels for other space notification types.

Files:
- `apps/web/src/features/notifications/lib/notification-meta.ts`

## 2026-06-18 16:15 - [FEATURE]

What:
- Extended the home notification feed filter with a **Type** section (All types + types present in the feed, including Awareness).
- Status and type filters combine (e.g. Unread + Brain Failed).

Why:
- Users need to narrow the feed by notification category, not just read state.

Impact:
- Filter dropdown has Status and Type sections; only types that exist in the current feed are listed. Active filters highlight the filter icon and update empty-state copy.

Files:
- `apps/web/src/features/notifications/lib/notification-feed-filters.ts`
- `apps/web/src/features/notifications/components/NotificationFeedFilterPicker.tsx`
- `apps/web/src/features/home/components/cards/NotificationFeedCard.tsx`

## 2026-06-18 16:14 - [STYLE]

What:
- Aligned notification feed header action icons with a shared fixed `h-6 w-6` button class and consistent tooltip wrappers.

Why:
- Filter, mark-read, and delete icons sat on different baselines and spacing.

Impact:
- Header icon row is vertically centered with even gaps.

Files:
- `apps/web/src/features/notifications/components/NotificationFeedFilterPicker.tsx`
- `apps/web/src/features/home/components/cards/NotificationFeedCard.tsx`

## 2026-06-18 16:13 - [FEATURE]

What:
- Added an All / Unread / Read filter dropdown to the home notification feed header (left of mark-all-read).
- Moved unread count next to the card title as `(X unread)`.

Why:
- Users need to narrow the feed without leaving the home card; unread count reads better beside the title.

Impact:
- Filter icon opens a dropdown; active non-All filters highlight the button. List and Load more respect the selected filter.

Files:
- `apps/web/src/features/notifications/components/NotificationFeedFilterPicker.tsx`
- `apps/web/src/features/home/components/cards/NotificationFeedCard.tsx`
- `apps/web/src/features/home/components/HomeListCardShell.tsx`

## 2026-06-18 16:10 - [FEATURE]

What:
- Replaced the static "Showing latest 15 of 100" footer on the home notification feed with a **Load more** button that reveals 15 additional rows per click.

Why:
- Users could see a truncation message but had no way to expand the list in the card.

Impact:
- Notification feed loads 15 items initially; **Load more** appends the next 15 until all fetched items are visible.

Files:
- `apps/web/src/features/home/components/cards/NotificationFeedCard.tsx`

## 2026-06-18 16:08 - [STYLE]

What:
- Moved Brain Failed retry from an inline button to a hover **Retry import** icon alongside mark-read and delete in the notification feed row meta.

Why:
- Retry should match the same hover-reveal icon pattern as the other row actions.

Impact:
- Brain Failed rows show a spinning retry icon on hover only; no separate button below the message.

Files:
- `apps/web/src/features/notifications/components/NotificationFeedRowMeta.tsx`
- `apps/web/src/features/notifications/components/NotificationFeedRow.tsx`

## 2026-06-18 16:06 - [FEATURE]

What:
- Added a **Retry import** button to Brain Failed rows in the home notification feed.
- Centralized brain-import retry job ID parsing in `notification-meta.ts` (shared with the full notifications modal).

Why:
- Brain failed notifications already supported retry in the full feed modal but not on the home card.

Impact:
- Users can retry a failed brain import directly from the home notification feed without opening the full modal.

Files:
- `apps/web/src/features/notifications/components/NotificationFeedRow.tsx`
- `apps/web/src/features/notifications/lib/notification-meta.ts`
- `apps/web/src/features/mission-control/components/NotificationsFeedModal.tsx`

## 2026-06-18 16:04 - [FEATURE]

What:
- Added per-row mark-read and delete actions to the home notification feed with hover-reveal icons that slide in from the right and fade in place of the date.
- Added single-item delete/read APIs for notifications and awareness points.

Why:
- The home notification feed had bulk actions only; users could not dismiss or read one item without opening it.

Impact:
- Hovering a notification row reveals read + delete controls with a slide/fade transition; date returns when hover ends.
- Single notifications and awareness points can be marked read or deleted from the home feed.

Files:
- `apps/web/src/features/notifications/components/NotificationFeedRowMeta.tsx`
- `apps/web/src/features/notifications/components/NotificationFeedRow.tsx`
- `apps/web/src/features/notifications/hooks/use-notifications-feed.ts`
- `apps/web/src/features/home/components/cards/NotificationFeedCard.tsx`
- `apps/web/src/features/mission-control/services/missions.service.ts`
- `apps/api/src/modules/missions/controllers/missions-user.controller.ts`
- `apps/api/src/modules/missions/services/missions-user-operations.service.ts`
- `apps/api/src/modules/missions/repositories/missions-user-operations.repository.ts`
- `apps/api/src/modules/missions/controllers/__tests__/missions-controller-route-order.test.ts`
- `apps/api/src/modules/agents/controllers/agents.controller.ts`
- `apps/api/src/modules/agents/services/agents.service.ts`
- `apps/api/src/modules/agents/repositories/agents.repository.ts`

## 2026-06-18 14:59 - [FIX]

What:
- Expanded Space calendar Google/Outlook agenda fetches with a rolling four-week buffer before and after the visible board window.
- Added regression coverage for the Space external-calendar window expansion helper.

Why:
- Moving from week view to the next week could show an empty provider calendar because Spaces fetched external events only for the exact visible week, leaving adjacent weeks dependent on a cold narrow fetch.

Impact:
- Adjacent week navigation keeps provider schedule events available while Spaces refreshes the latest Google/Outlook agenda range.
- Tasks and campaign social posts keep their existing local/source-specific scheduling paths.

Files:
- `apps/web/src/features/spaces/views/calendar/useSpaceCalendarExternalEvents.ts`
- `apps/web/src/features/spaces/views/calendar/useSpaceCalendarExternalEvents.test.ts`

## 2026-06-18 14:59 - [FIX]

What:
- Added a narrow `brain_episodes` prerequisite migration before the Cortex timeline migration.

Why:
- Manual timeline migration attempts can fail on staging when the full temporal spine migration has not been applied yet.

Impact:
- Dashboard/manual migration order is now clear: apply the prerequisite, then timelines, then Atlas timeline skills.
- The prerequisite is idempotent and remains compatible with the full temporal spine migration.

Files:
- `supabase/migrations/20260618142500_brain_episodes_prerequisite.sql`

## 2026-06-18 14:57 - [FIX]

What:
- Made the timeline migration tolerate staging databases where `brain_episodes` has not been created yet by adding the timeline `episode_id` FK only when the referenced table exists.
- Replaced `$patch$` seed strings with escaped string literals and changed generic skill dollar tags to unique delimiters.

Why:
- Manual dashboard migration attempts failed when the temporal spine was missing and when the dashboard SQL wrapper hit an unterminated `$patch$` string.

Impact:
- The timeline migration can now run before or after the temporal spine without failing on `public.brain_episodes`.
- The Atlas timeline seed migration can be retried safely after a partial failure without duplicating already-appended prompt sections.

Files:
- `supabase/migrations/20260618143000_brain_timelines.sql`
- `supabase/migrations/20260618144500_seed_atlas_timeline_skills.sql`

## 2026-06-18 14:20 - [FIX]

What:
- Fixed the Studio composer so a same-conversation `default_model_id` refresh cannot overwrite a model the user just picked from the dropdown.
- Updated Agent API chat prewarm reuse so model routing is recomputed from the live request before calling OpenClaw.
- Removed temporary local debug fetch instrumentation from the subscription model send path.
- Added a regression test proving a live `openai-codex/gpt-5.5` request still reaches OpenClaw as `openai-codex/gpt-5.5` when stable prewarm data is reused.

Why:
- Selecting GPT-5.5 subscription could still send the conversation default model, causing OpenRouter Claude routing and Vibey credit usage instead of the admin subscription path.

Impact:
- Subscription model picker choices now remain authoritative for the send.
- Prewarm cache hits can still reuse stable context, but they cannot reuse stale model selection.

Files:
- `apps/web/src/features/studio/components/ChatInput.tsx`
- `apps/agent-api/src/modules/chat/services/chat.service.ts`
- `apps/agent-api/src/modules/chat/services/chat.service.access-context.test.ts`
- `documentation/features/chat-stream-recovery.md`
- `.docs/plans/agent-follow-up-work.md`

## 2026-06-18 14:18 - [FEATURE]

What:
- Added Cortex timeline tables, timeline item search RPCs, shared timeline types, and timeline retrieval candidates.
- Added Atlas-owned timeline actions, schemas, handlers, policy contracts, API docs, and Cortex Max endpoints.
- Queued `brain_timeline_synthesis` after Cortex library sync and pattern analysis, and taught the worker to dispatch Atlas with the new timeline skill.
- Updated crystallization to accept temporal payloads and write temporal fields through snapshots and evidence chunks.
- Added Cortex Max timeline UI, Atlas/brain_scholar prompt + skill updates, and a DB seed migration for the new timeline synthesis skill.

Why:
- Atlas needs a first-class cognition layer for meaningful change over time, separate from raw episodes and row creation time.

Impact:
- Timelines can represent customer journeys, perspective evolution, company decision history, agent knowledge growth, and user worldview arcs.
- Timeline UI shows happened/valid time separately from learned time and stays empty until Atlas synthesizes timelines.
- Staging migration apply is pending because Supabase MCP still fails the `_list_migrations` handshake gate.

Files:
- `supabase/migrations/20260618143000_brain_timelines.sql`
- `supabase/migrations/20260618144500_seed_atlas_timeline_skills.sql`
- `packages/api-shared/src/types/brain-timeline.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.ts`
- `apps/api/src/modules/brain/`
- `apps/mission-worker/src/modules/brain-ops/`
- `apps/web/src/features/brain/`
- `docker/agents/atlas/`
- `docker/agents/templates/brain_scholar/`
- `.docs/features/brain-feature-implementation.md`

## 2026-06-18 14:13 - [FEATURE]

What:
- Added admin/superadmin-only Claude Subscription integration using a Claude setup token stored encrypted in `vault_secrets`.
- Added the `anthropic_claude` integration catalog and RLS migration, and applied it to staging and production Supabase.
- Added Claude subscription model rows to `/api/models` when the admin has a connected vault-backed Claude Subscription.
- Routed `anthropic-subscription/...` chat requests through Agent API to OpenClaw with request-scoped Anthropic runtime credentials and no fallback to Vibey-paid models.
- Added the Claude Subscription card to the admin integrations section in workspace settings.

Why:
- Admins need the same UX as OpenAI Codex for using their own Claude subscription without spending Vibey model credits.

Impact:
- Admins/superadmins can connect Claude Subscription from Workspace Settings, then pick Claude subscription models from the existing model dropdown.
- Regular users do not see the admin integration or subscription models.
- Missing or disconnected Claude credentials fail before routing to a paid fallback.

Files:
- `apps/api/src/modules/integrations/anthropic-claude/`
- `apps/api/src/modules/integrations/integrations.module.ts`
- `apps/api/src/modules/integrations/repositories/integrations.repository.ts`
- `apps/api/src/modules/integrations/repositories/integrations.repository.test.ts`
- `apps/api/src/modules/integrations/services/integrations-overview.service.ts`
- `apps/api/src/modules/integrations/services/integrations-status.service.ts`
- `apps/api/src/modules/models/model-subscription-catalog.ts`
- `apps/api/src/modules/models/model-subscription-helpers.ts`
- `apps/api/src/modules/models/services/models.service.ts`
- `apps/api/src/modules/models/__tests__/models.service.test.ts`
- `apps/agent-api/src/modules/chat/chat.module.ts`
- `apps/agent-api/src/modules/chat/services/anthropic-claude-admin-auth.service.ts`
- `apps/agent-api/src/modules/chat/services/anthropic-claude-admin-auth.service.test.ts`
- `apps/agent-api/src/modules/chat/services/openclaw-proxy.service.ts`
- `apps/web/src/features/settings/components/settings-content/useIntegrations.ts`
- `apps/web/src/features/settings/components/settings-content/IntegrationsView.tsx`
- `apps/web/src/features/settings/config/settings-toast-errors.config.ts`
- `documentation/features/chat-stream-recovery.md`
- `supabase/migrations/20260618121500_anthropic_claude_admin_integration.sql`

## 2026-06-18 13:36 - [FEATURE]

What:
- Grouped admin OpenAI Codex subscription models into a nested flyout submenu placed directly below the three strategy rows in composer model pickers.
- Added shared subscription model partitioning/label helpers and a reusable `ComposerSubscriptionModelsSubmenu` component.
- Shortened selected and submenu labels by stripping the `OpenAI Subscription` prefix (for example `GPT-5.5 Codex`).

Why:
- Subscription models were cluttering the flat model list with long prefixed labels; admins need them grouped separately from Vibey-paid models.

Impact:
- Admin/superadmin users with connected OpenAI Codex see an `OpenAI Subscription` row that opens a right-side flyout with the three Codex models.
- Standard models remain in the main list; trigger labels use the shorter subscription names when one is selected.

Files:
- `apps/web/src/features/studio/lib/subscription-model-options.ts`
- `apps/web/src/features/studio/components/ComposerSubscriptionModelsSubmenu.tsx`
- `apps/web/src/features/studio/components/ComposerModelPicker.tsx`
- `apps/web/src/features/studio/components/ChatInput.tsx`
- `apps/web/src/features/studio/services/chat.service.ts`
- `apps/web/src/features/team/components/container/TeamCommunicationTab.tsx`
- `apps/chrome-extension/src/chat/ChatComposer.tsx`

## 2026-06-18 13:28 - [FEATURE]

What:
- Added admin/superadmin-only subscription model rows to the `/api/models` catalog response.
- Gated OpenAI Codex subscription models on a connected personal `openai_codex` integration plus the matching vault secret.
- Added a subscription model catalog module so Claude-style subscription providers can be added without changing the picker component.
- Invalidated the Studio model-list cache when the OpenAI Codex integration refreshes, disconnects, or is removed.
- Added model service coverage for connected superadmin access and non-admin exclusion.

Why:
- The composer model dropdown only renders the models returned by `/api/models`, so subscription-backed models need to be exposed there without making them workspace-enabled for every user.

Impact:
- Admins/superadmins with a connected OpenAI Codex subscription can pick `openai-codex/gpt-5.5`, `openai-codex/gpt-5.5-codex`, and `openai-codex/gpt-5.3-codex` from the existing model dropdown.
- Regular users and admins without the connected vault-backed integration only see normal Vibey-paid models.
- Studio refetches model choices after subscription integration changes instead of serving the previous `llm-models` cache entry.

Files:
- `apps/api/src/modules/models/services/models.service.ts`
- `apps/api/src/modules/models/repositories/models.repository.ts`
- `apps/api/src/modules/models/model-subscription-catalog.ts`
- `apps/api/src/modules/models/model-subscription-helpers.ts`
- `apps/api/src/modules/models/__tests__/models.service.test.ts`
- `apps/web/src/features/settings/components/settings-content/useIntegrations.ts`

## 2026-06-18 13:21 - [ARCH]

What:
- Split project custom-domain connect/disconnect orchestration out of `DomainConnectionService`.
- Added `DomainProjectConnectionService` and registered it in `DomainsModule`.
- Added behavior-lock coverage for project custom-domain connection while preserving existing project disconnection restoration coverage.
- Kept `DomainConnectionService` as the public controller-facing facade.

Why:
- `domain-connection.service.ts` was above the 480-line Type D warning threshold after Type C-H3 cleanup.
- Project domain connection owns the Vercel app-project transfer workflow and is a cohesive split from landing page, funnel, and presentation connection flows.

Impact:
- Behavior-neutral refactor; no API route, DTO, response, or schema contract changed.
- `domain-connection.service.ts` dropped from 545 LOC to 388 LOC; `domain-project-connection.service.ts` is 193 LOC.

Files:
- `apps/api/src/modules/domains/services/domain-connection.service.ts`
- `apps/api/src/modules/domains/services/domain-project-connection.service.ts`
- `apps/api/src/modules/domains/services/domain-connection.service.test.ts`
- `apps/api/src/modules/domains/domains.module.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## 2026-06-18 13:20 - [FIX]

What:
- Completed Temporal Brain Spine type-contract wiring for remaining API and Space retrieval consumers.
- Added temporal candidate metadata to the API Brain retrieval base and Space retrieval Brain adapter.
- Synced the API evidence ingestion path with episode upsert, temporal chunk fields, and `episode_id` returns.
- Updated the temporal follow-up log with the additional oversized files found during final validation.

Why:
- The shared Brain retrieval candidate contract now requires temporal metadata everywhere reranking/sufficiency consumes candidates.
- Document ingestion writes temporal evidence and needs the API evidence service to return the created episode id.

Impact:
- `@vibey/api`, `@vibey/agent-api`, `@vibey/mission-worker`, and `@vibey/web` typechecks pass for the touched temporal paths.
- Targeted Brain retrieval, action schema, API Brain, and company cortex tests pass.

Files:
- `apps/api/src/modules/brain/services/brain-retrieval-service-03.base.ts`
- `apps/api/src/modules/brain/services/brain-evidence-ingestion.service.ts`
- `apps/api/src/modules/brain/repositories/brain-evidence.repository.ts`
- `apps/api/src/modules/brain/services/__tests__/type-c-services.characterization.test.ts`
- `apps/agent-api/src/modules/spaces-retrieval/services/space-retrieval.service.ts`
- `.docs/plans/agent-follow-up-work.md`

## 2026-06-18 13:29 - [FEATURE]

What:
- Added calendar agent actions to the explicit policy contract surface as the `integration.calendar` family under `use_integrations`.
- Exposed `list_calendar_events`, `create_calendar_event`, `update_calendar_event`, and `delete_calendar_event` through the OpenClaw `vibey_backend` action enum.
- Synced existing scoped OpenClaw Vibey API allowlists and skill docs for agents that already have `use_integration`.
- Added generated and static Vibey API skill guidance explaining provider calendar events vs Space tasks.

Why:
- Agents need the same calendar CRUD actions as Spaces, but gated by the existing integrations access family instead of a separate permission path.

Impact:
- Integration-capable agents can list, create, update, and delete Google/Outlook calendar events through the normalized calendar actions.
- Provider calendar events stay separate from Space tasks; agents are instructed to use task actions with `start_date` and `due_date` for task scheduling.

Files:
- `packages/agent-policy/src/action-contracts.ts`
- `packages/agent-policy/src/agent-policy.test.ts`
- `docker/tools/vibey-backend/index.ts`
- `apps/agent-api/src/modules/shared/vibey-backend-plugin.test.ts`
- `apps/agent-api/src/modules/agent-sync/services/vibey-api-skill-generator.ts`
- `docker/agents/**/skills/vibey-api/ALLOWED_ACTIONS.json`
- `docker/agents/**/skills/vibey-api/SKILL.md`
- `docker/agents/**/skills/vibey-api/references/integrations.md`
- `apps/docs/content/spaces/views.mdx`

## 2026-06-18 13:30 - [FEATURE]

What:
- Added Airtable as a Composio-managed OAuth integration in the Settings catalog and backend overview.
- Registered Airtable Composio toolkit mapping, connection identity lookup, shared capability domain, and success toast copy.
- Added the Airtable Composio migration with the managed auth config id and selected OAuth scopes.
- Added focused coverage for Airtable toolkit mapping, identity lookup, capability sync, and agent `use_integration` execution.
- Added Airtable to the connected platforms docs.

Why:
- Users need to connect Airtable through the existing Composio OAuth flow and let agents execute Airtable `AIRTABLE_*` actions from synced capabilities.

Impact:
- Airtable appears in Settings -> Integrations with the existing Airtable logo and uses the generic Composio connection flow.
- Synced Airtable capabilities route through Composio under the shared integration domain.
- Agents with integration access can execute Airtable actions once the account is connected and capabilities are synced.

Files:
- `apps/api/src/modules/integrations/services/integrations-overview.service.ts`
- `apps/api/src/modules/integrations/services/integrations-identity-tools.ts`
- `apps/api/src/modules/composio/services/composio-capability-catalog.types.ts`
- `apps/web/src/features/settings/components/settings-content/useIntegrations.ts`
- `apps/web/src/features/settings/config/settings-toast-errors.config.ts`
- `apps/api/src/modules/integrations/services/__tests__/integrations-core.service.test.ts`
- `apps/api/src/modules/composio/composio.service.test.ts`
- `apps/agent-api/src/modules/artifacts/services/artifacts.service.rbac.integrations-media.test.ts`
- `apps/docs/content/integrations/connected-platforms.mdx`
- `supabase/migrations/20260618102917_airtable_composio_integration.sql`
- `.docs/plans/agent-follow-up-work.md`

## 2026-06-18 13:30 - [ARCH]

What:
- Split single-ad Meta media preparation out of `MetaPublishSingleService`.
- Added `MetaPublishMediaService` for image/video upload, Google Drive image resolution, carousel hashes, and placement customization rules.
- Registered the new Meta provider and updated the Meta API facade fallback construction.
- Added behavior-lock coverage for the single-image publish path before moving code.

Why:
- `meta-publish-single.service.ts` was above the Type D 480-line warning threshold and mixed media preparation into publish orchestration.

Impact:
- Behavior-neutral refactor; no route, DTO, schema, or response contract changed.
- `meta-publish-single.service.ts` dropped from 591 LOC to 448 LOC; `meta-publish-media.service.ts` is 185 LOC.
- The remaining Meta Type D1 headroom follow-up is `meta-publish-batch.service.ts`.

Files:
- `apps/api/src/modules/integrations/meta/services/meta-api/meta-publish-single.service.ts`
- `apps/api/src/modules/integrations/meta/services/meta-api/meta-publish-media.service.ts`
- `apps/api/src/modules/integrations/meta/services/meta-api.service.ts`
- `apps/api/src/modules/integrations/meta/meta.module.ts`
- `apps/api/src/modules/integrations/meta/services/__tests__/type-c-meta-services.test.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## 2026-06-18 13:36 - [ARCH]

What:
- Split batch Meta metadata persistence out of `MetaPublishBatchService`.
- Added `MetaPublishBatchPersistenceService` for campaign/ad set/ad local Meta ID payloads and staged update flushing.
- Registered the new Meta provider and updated the Meta API facade fallback construction.
- Added behavior-lock coverage for batch ad metadata persistence before moving code.

Why:
- `meta-publish-batch.service.ts` was above the Type D 480-line warning threshold and mixed persistence payload construction into batch publish orchestration.

Impact:
- Behavior-neutral refactor; no route, DTO, schema, or response contract changed.
- `meta-publish-batch.service.ts` dropped from 499 LOC to 429 LOC; `meta-publish-batch-persistence.service.ts` is 190 LOC.
- The Meta publish Type D1 headroom follow-up is resolved.

Files:
- `apps/api/src/modules/integrations/meta/services/meta-api/meta-publish-batch.service.ts`
- `apps/api/src/modules/integrations/meta/services/meta-api/meta-publish-batch-persistence.service.ts`
- `apps/api/src/modules/integrations/meta/services/meta-api.service.ts`
- `apps/api/src/modules/integrations/meta/meta.module.ts`
- `apps/api/src/modules/integrations/meta/services/__tests__/meta-api.service.test.ts`
- `apps/api/src/modules/integrations/meta/services/__tests__/type-c-meta-services.test.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## 2026-06-18 13:43 - [ARCH]

What:
- Split Google Drive Composio file operations out of `GoogleDriveApiService`.
- Added `GoogleDriveComposioFilesService` for list, shared-drive list, metadata fetch, download, upload, rename, share, and delete tool execution.
- Registered the new Google Drive provider and kept `GoogleDriveApiService` as the public facade.
- Added behavior-lock coverage for exported base64 download payloads before moving code.
- Updated the remediation skill direct-access scan to ignore `Buffer.from` false positives.

Why:
- `google-drive-api.service.ts` was above the Type D 480-line warning threshold and mixed content facade behavior with Composio tool response normalization.

Impact:
- Behavior-neutral refactor; no route, DTO, schema, or response contract changed.
- `google-drive-api.service.ts` dropped from 575 LOC to 243 LOC; `google-drive-composio-files.service.ts` is 317 LOC.
- The Google Drive API Type D1 headroom follow-up is resolved; Drive sync and Memories remain separate tracked work.

Files:
- `apps/api/src/modules/integrations/google-drive/services/google-drive-api.service.ts`
- `apps/api/src/modules/integrations/google-drive/services/google-drive-composio-files.service.ts`
- `apps/api/src/modules/integrations/google-drive/services/__tests__/google-drive-api.service.test.ts`
- `apps/api/src/modules/integrations/google-drive/google-drive.module.ts`
- `apps/api/src/modules/integrations/google-drive/types/google-drive.types.ts`
- `.agents/skills/architecture-compliance-remediation/SKILL.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## 2026-06-18 13:51 - [ARCH]

What:
- Split Brain node transfer copy/write orchestration out of `BrainNodeTransferService`.
- Added `BrainNodeTransferCopyService` for campaign copy rows, brain memory rows, SK source imports, and SK entry remapping.
- Added internal transfer result/scope types shared by the orchestrator and copy service.
- Added behavior-lock coverage for copying a memory into an agent skill brain as a source and entry pair.

Why:
- `brain-node-transfer.service.ts` was above the Type D 480-line warning threshold and mixed transfer validation/extraction with copy payload construction.

Impact:
- Behavior-neutral refactor; no route, DTO, schema, or response contract changed.
- `brain-node-transfer.service.ts` dropped from 556 LOC to 273 LOC; `brain-node-transfer-copy.service.ts` is 353 LOC.
- The Brain node transfer Type D1 headroom follow-up is resolved.

Files:
- `apps/api/src/modules/brain/services/brain-node-transfer.service.ts`
- `apps/api/src/modules/brain/services/brain-node-transfer-copy.service.ts`
- `apps/api/src/modules/brain/services/brain-node-transfer.types.ts`
- `apps/api/src/modules/brain/services/__tests__/brain-node-transfer.service.test.ts`
- `apps/api/src/modules/brain/brain.module.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## 2026-06-18 13:55 - [FIX]

What:
- Fixed connected Google/Outlook all-day events so Space and Home calendar boards treat provider end dates as exclusive all-day boundaries.
- Kept all-day provider events in the all-day strip, preserved them as read-only for drag/resize writes, and added a regression test for one-day provider all-day events.
- Updated Space provider grid blocks with source/time labels, color cues, and meeting/event affordances, and hid repeated labels on middle/end strip segments.
- Made week view always reserve the all-day row and replaced fixed 10 AM scrolling with first-event/current-time scroll positioning.

Why:
- Space calendar provider events were dropping `end` for all-day rows, causing all-day events to miss strip layout and appear as hidden midnight blocks.

Impact:
- Spaces calendar now renders tasks, social content, and provider all-day/timed events more consistently with Home agenda behavior.
- Home agenda board gets the shared all-day exclusive-end range fix via the new `allDay` calendar event flag.

Files:
- `apps/web/src/components/calendar/types.ts`
- `apps/web/src/components/calendar/CalendarBoard.tsx`
- `apps/web/src/components/calendar/CalendarBoard.test.tsx`
- `apps/web/src/features/home/components/AgendaCalendarPanel.tsx`
- `apps/web/src/features/spaces/views/calendar/SpaceCalendarEventRenderers.tsx`
- `apps/web/src/features/spaces/views/calendar/SpaceCalendarProviderEventBlocks.tsx`
- `apps/docs/content/spaces/views.mdx`
- `.docs/plans/agent-follow-up-work.md`

## 2026-06-18 13:56 - [ARCH]

What:
- Split Brain handoff brain-to-brain copy/remap orchestration out of `BrainHandoffService`.
- Added `BrainHandoffBrainCopyService` for memory, snapshot, SK source/entry, narrative page/link, connection, edge, and content hash remapping.
- Registered the new Brain provider and kept `BrainHandoffService` as the public mission-facing facade.
- Added behavior-lock coverage for copying Brain rows with remapped relationship ids into the target Brain.

Why:
- `brain-handoff.service.ts` was above the Type D 480-line warning threshold and mixed handoff target orchestration with durable record copy/remap logic.

Impact:
- Behavior-neutral refactor; no route, DTO, schema, or response contract changed.
- `brain-handoff.service.ts` dropped from 531 LOC to 197 LOC; `brain-handoff-brain-copy.service.ts` is 329 LOC.
- The Brain handoff Type D1 headroom follow-up is resolved.

Files:
- `apps/api/src/modules/brain/services/brain-handoff.service.ts`
- `apps/api/src/modules/brain/services/brain-handoff-brain-copy.service.ts`
- `apps/api/src/modules/brain/services/__tests__/brain-handoff.service.test.ts`
- `apps/api/src/modules/brain/brain.module.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## 2026-06-18 14:25 - [ARCH]

What:
- Split `MetaIntegration` into five focused base slices for core API/OAuth, audiences, creatives, campaigns, and fetch/webhook behavior.
- Kept `meta.integration.ts` as the public Nest provider facade with the same constructor and exported `MetaIntegration` class.
- Added direct characterization coverage for authorization URL construction, ad set payload normalization, and webhook verification behavior.

Why:
- `meta.integration.ts` was a Phase 1 Type D hard LOC violation at 1750 LOC.

Impact:
- Behavior-neutral refactor; no route, DTO, schema, or response contract changed.
- `meta.integration.ts` dropped to 11 LOC, and all extracted Meta integration slices are under the hard closeout limit.
- Remaining Phase 1 Type D hard closeout targets dropped from 12 to 11.

Files:
- `apps/api/src/modules/integrations/meta/integrations/meta.integration.ts`
- `apps/api/src/modules/integrations/meta/integrations/meta-integration-core.base.ts`
- `apps/api/src/modules/integrations/meta/integrations/meta-integration-audiences.base.ts`
- `apps/api/src/modules/integrations/meta/integrations/meta-integration-creatives.base.ts`
- `apps/api/src/modules/integrations/meta/integrations/meta-integration-campaigns.base.ts`
- `apps/api/src/modules/integrations/meta/integrations/meta-integration-fetch-webhook.base.ts`
- `apps/api/src/modules/integrations/meta/integrations/meta.integration.test.ts`
- `.docs/plans/architecture-compliance-remediation.md`

## 2026-06-18 14:30 - [ARCH]

What:
- Split the oversized Spaces DTO barrel into focused DTO modules for core space/item schemas, recurrence, automations, activity/view overrides, and sharing.
- Kept `apps/api/src/modules/spaces/dto/index.ts` as the stable public re-export surface for existing `../dto` consumers.
- Added a runtime barrel-export characterization check to the existing Spaces DTO schema test.

Why:
- `apps/api/src/modules/spaces/dto/index.ts` was a Phase 1 Type D hard LOC violation at 1595 LOC.

Impact:
- Behavior-neutral refactor; no route, DTO validation contract, schema, or response contract changed.
- `spaces/dto/index.ts` dropped to 142 LOC, and all extracted Spaces DTO files are under the applicable DTO/file limits.
- Remaining Phase 1 Type D hard closeout TypeScript targets dropped from 11 to 10.

Files:
- `apps/api/src/modules/spaces/dto/index.ts`
- `apps/api/src/modules/spaces/dto/space-core.dto.ts`
- `apps/api/src/modules/spaces/dto/space-recurrence.dto.ts`
- `apps/api/src/modules/spaces/dto/space-automation-shared.dto.ts`
- `apps/api/src/modules/spaces/dto/space-automation-trigger.dto.ts`
- `apps/api/src/modules/spaces/dto/space-automation-action.dto.ts`
- `apps/api/src/modules/spaces/dto/space-automation-draft-action.dto.ts`
- `apps/api/src/modules/spaces/dto/space-automation.dto.ts`
- `apps/api/src/modules/spaces/dto/space-activity.dto.ts`
- `apps/api/src/modules/spaces/dto/space-sharing.dto.ts`
- `apps/api/src/modules/spaces/dto/__tests__/space-schema.dto.test.ts`
- `.docs/plans/architecture-compliance-remediation.md`

## 2026-06-18 14:33 - [ARCH]

What:
- Split the oversized space-template seed catalog into seed types, shared builders/statuses/automation presets, universal template data, and specialized template data.
- Kept `space-template-catalog.ts` as the public facade exporting `SPACE_TEMPLATE_CATALOG` and the existing seed types.
- Added catalog characterization coverage for slug order, uniqueness, starter document shape, and seeded automation attachments.

Why:
- `apps/api/src/modules/space-templates/data/space-template-catalog.ts` was a Phase 1 Type D hard LOC violation at 1499 LOC.

Impact:
- Behavior-neutral refactor; the migration generator still imports `SPACE_TEMPLATE_CATALOG` from the same path.
- `space-template-catalog.ts` dropped to 19 LOC, and all extracted catalog files are under the hard closeout limit.
- Remaining Phase 1 Type D hard closeout TypeScript targets dropped from 10 to 9.

Files:
- `apps/api/src/modules/space-templates/data/space-template-catalog.ts`
- `apps/api/src/modules/space-templates/data/space-template-catalog.types.ts`
- `apps/api/src/modules/space-templates/data/space-template-catalog-builders.ts`
- `apps/api/src/modules/space-templates/data/space-template-catalog-universal.ts`
- `apps/api/src/modules/space-templates/data/space-template-catalog-specialized.ts`
- `apps/api/src/modules/space-templates/data/__tests__/space-template-catalog.test.ts`
- `.docs/plans/architecture-compliance-remediation.md`

## 2026-06-18 14:26 - [FIX]

What:
- Increased the calendar hover-card close grace period from 120ms to 350ms.
- Reduced the gap between the hovered calendar cell and the floating daily schedule card.

Why:
- Moving the mouse from a calendar cell into the floating schedule card could close the card before the pointer reached it.

Impact:
- Daily schedule hover cards are easier to enter and interact with without changing click or scheduling behavior.

Files:
- `apps/web/src/components/calendar/CalendarBoard.tsx`
- `.docs/plans/agent-follow-up-work.md`

## 2026-06-18 14:30 - [FIX]

What:
- Added subscription-model capability lookup mapping in Agent API for OpenAI Codex and Claude Subscription model IDs.
- Kept the runtime model passed to OpenClaw as the selected subscription ID.
- Tightened chat routing tests so capability lookup must hit the base provider model while OpenClaw still receives the subscription model.

Why:
- Queued chat runs reached `openai-codex/gpt-5.5` correctly, but model-settings validation queried `llm_model_capabilities` for that synthetic subscription ID and failed before OpenClaw could use the admin subscription credential.

Impact:
- `openai-codex/gpt-5.5` and Claude subscription models can use standard model settings validation without falling back to OpenRouter/provider-paid IDs.

Files:
- `apps/agent-api/src/modules/chat/services/chat.service.ts`
- `apps/agent-api/src/modules/chat/services/chat.service.access-context.test.ts`
- `documentation/features/chat-stream-recovery.md`
- `.docs/plans/agent-follow-up-work.md`

## 2026-06-18 14:30 - [FIX]

What:
- Made calendar hover cards choose above or below placement based on available viewport space.
- Clamped hover-card width and max height to the viewport so the card scrolls internally instead of clipping offscreen.

Why:
- Daily schedule hover cards could be clipped when they opened upward near the top of the screen.

Impact:
- Calendar hover cards remain accessible whether they open above or below the hovered schedule cell.

Files:
- `apps/web/src/components/calendar/CalendarBoard.tsx`
- `.docs/plans/agent-follow-up-work.md`

## 2026-06-18 14:37 - [ARCH]

What:
- Split the oversized Spaces automation template seed catalog into seed types, the shared `draft` builder, core templates, Phase 2 templates, and connected-app templates.
- Kept `space-automation-template-catalog.ts` as the public facade exporting `SPACE_AUTOMATION_TEMPLATE_CATALOG` and the existing seed type.

Why:
- `apps/api/src/modules/spaces/data/space-automation-template-catalog.ts` was a Phase 1 Type D hard LOC violation at 1304 LOC.

Impact:
- Behavior-neutral refactor; existing tests and the migration generator still import from the same catalog path.
- `space-automation-template-catalog.ts` dropped to 16 LOC, and all extracted catalog files are under the hard closeout limit.
- Remaining Phase 1 Type D hard closeout TypeScript targets dropped from 9 to 8.

Files:
- `apps/api/src/modules/spaces/data/space-automation-template-catalog.ts`
- `apps/api/src/modules/spaces/data/space-automation-template-catalog.types.ts`
- `apps/api/src/modules/spaces/data/space-automation-template-catalog-builders.ts`
- `apps/api/src/modules/spaces/data/space-automation-template-catalog-core.ts`
- `apps/api/src/modules/spaces/data/space-automation-template-catalog-phase2.ts`
- `apps/api/src/modules/spaces/data/space-automation-template-catalog-connected-apps.ts`
- `.docs/plans/architecture-compliance-remediation.md`

## 2026-06-18 14:38 - [FIX]

What:
- Added Agent API env-file resolution that loads the local Agent API env first and the sibling API env as a fallback.
- Documented `VAULT_ENCRYPTION_KEY` in the API and Agent API example env files.
- Preserved vault encryption configuration failures in OpenAI Codex and Claude subscription auth instead of returning a misleading disconnected state.

Why:
- OpenAI Codex appeared connected in settings because API had stored the vault-backed OAuth token, but queued chat failed because Agent API did not load the same vault encryption key and could not decrypt `vault_secrets`.

Impact:
- Local Agent API can read admin subscription tokens written by API when the key exists in `apps/api/.env`.
- Future vault key/config drift reports the real vault configuration error instead of “subscription is not connected.”

Files:
- `apps/agent-api/src/lib/agent-api-env.ts`
- `apps/agent-api/src/lib/agent-api-env.test.ts`
- `apps/agent-api/src/app.module.ts`
- `apps/agent-api/src/runtime-chat-app.module.ts`
- `apps/agent-api/src/modules/chat/services/openai-codex-admin-auth.service.ts`
- `apps/agent-api/src/modules/chat/services/openai-codex-admin-auth.service.test.ts`
- `apps/agent-api/src/modules/chat/services/anthropic-claude-admin-auth.service.ts`
- `apps/agent-api/src/modules/chat/services/anthropic-claude-admin-auth.service.test.ts`
- `apps/agent-api/.env.example`
- `apps/api/.env.example`
- `documentation/features/chat-stream-recovery.md`

## 2026-06-18 14:41 - [ARCH]

What:
- Split the oversized transfer service test into project/artifact, campaign, and space/view test files.
- Added shared transfer test helpers for queued Supabase mocks and transfer service construction.

Why:
- `apps/api/src/modules/transfer/__tests__/transfer.service.test.ts` was a Phase 1 Type D hard LOC violation at 1235 LOC.

Impact:
- Test-only behavior-neutral refactor; the split transfer suite still runs 17 passing tests.
- `transfer.service.test.ts` dropped to 192 LOC, and all extracted transfer test files are under the hard closeout limit.
- Remaining Phase 1 Type D hard closeout TypeScript targets dropped from 8 to 7.

Files:
- `apps/api/src/modules/transfer/__tests__/transfer.service.test.ts`
- `apps/api/src/modules/transfer/__tests__/transfer.service.campaign.test.ts`
- `apps/api/src/modules/transfer/__tests__/transfer.service.space-view.test.ts`
- `apps/api/src/modules/transfer/__tests__/transfer-test-helpers.ts`
- `.docs/plans/architecture-compliance-remediation.md`

## 2026-06-18 14:43 - [ARCH]

What:
- Split the oversized agents controller test into read/config, skills/workflows, and widget route test files.
- Added shared agents controller test helpers for mocked operations, controllers, and Supabase chains.

Why:
- `apps/api/src/modules/agents/controllers/agents.controller.test.ts` was a Phase 1 Type D hard LOC violation at 734 LOC.

Impact:
- Test-only behavior-neutral refactor; the split agents controller suite still runs 25 passing tests.
- `agents.controller.test.ts` dropped to 270 LOC, and all extracted agents controller test files are under the hard closeout limit.
- Remaining Phase 1 Type D hard closeout TypeScript targets dropped from 7 to 6.

Files:
- `apps/api/src/modules/agents/controllers/agents.controller.test.ts`
- `apps/api/src/modules/agents/controllers/agents.controller.skills-workflows.test.ts`
- `apps/api/src/modules/agents/controllers/agents.controller.widget.test.ts`
- `apps/api/src/modules/agents/controllers/agents-controller-test-helpers.ts`
- `.docs/plans/architecture-compliance-remediation.md`

## 2026-06-18 14:46 - [ARCH]

What:
- Split the oversized Fathom automation service test into recording fanout, source-routing, and actions/revocation test files.
- Added a tiny shared Fathom test helper for Supabase query-chain mocks.

Why:
- `apps/api/src/modules/spaces/services/__tests__/space-automation-fathom.service.test.ts` was a Phase 1 Type D hard LOC violation at 722 LOC.

Impact:
- Test-only behavior-neutral refactor; the split Fathom automation suite still runs 7 passing tests.
- `space-automation-fathom.service.test.ts` dropped to 180 LOC, and all extracted Fathom test files are under the hard closeout limit.
- Remaining Phase 1 Type D hard closeout TypeScript targets dropped from 6 to 5.

Files:
- `apps/api/src/modules/spaces/services/__tests__/space-automation-fathom.service.test.ts`
- `apps/api/src/modules/spaces/services/__tests__/space-automation-fathom-sources.service.test.ts`
- `apps/api/src/modules/spaces/services/__tests__/space-automation-fathom-actions.service.test.ts`
- `apps/api/src/modules/spaces/services/__tests__/space-automation-fathom-test-helpers.ts`
- `.docs/plans/architecture-compliance-remediation.md`

## 2026-06-18 14:48 - [ARCH]

What:
- Split the oversized social research orchestration service test into core orchestration and platform-specific test files.
- Added a shared social research orchestration test helper for service setup and mocked dependencies.

Why:
- `apps/api/src/modules/spaces/services/__tests__/social-research-orchestration.service.test.ts` was a Phase 1 Type D hard LOC violation at 699 LOC.

Impact:
- Test-only behavior-neutral refactor; the split social research orchestration suite still runs 15 passing tests.
- `social-research-orchestration.service.test.ts` dropped to 334 LOC, and all extracted files are under the hard closeout limit.
- Remaining Phase 1 Type D hard closeout TypeScript targets dropped from 5 to 4.

Files:
- `apps/api/src/modules/spaces/services/__tests__/social-research-orchestration.service.test.ts`
- `apps/api/src/modules/spaces/services/__tests__/social-research-orchestration-platforms.service.test.ts`
- `apps/api/src/modules/spaces/services/__tests__/social-research-orchestration-test-helpers.ts`
- `.docs/plans/architecture-compliance-remediation.md`

## 2026-06-18 14:53 - [ARCH]

What:
- Split the oversized Slack API integration into a thin injectable facade plus focused internal base slices.
- Moved shared Slack auth-error mapping and API constants into an internal shared file.

Why:
- `apps/api/src/modules/slack/integrations/slack-api.integration.ts` was a Phase 1 Type D hard LOC violation at 675 LOC.

Impact:
- Behavior-neutral production refactor; `SlackApiIntegration`, `SlackAuthError`, and `isSlackAuthError` keep their public import path.
- The facade is now 7 LOC, and all extracted Slack integration files are under the integration file limit.
- Remaining Phase 1 Type D hard closeout TypeScript targets dropped from 4 to 3.

Files:
- `apps/api/src/modules/slack/integrations/slack-api.integration.ts`
- `apps/api/src/modules/slack/integrations/slack-api-integration.shared.ts`
- `apps/api/src/modules/slack/integrations/slack-api-integration-core.base.ts`
- `apps/api/src/modules/slack/integrations/slack-api-integration-users.base.ts`
- `apps/api/src/modules/slack/integrations/slack-api-integration-history-search.base.ts`
- `.docs/plans/architecture-compliance-remediation.md`

## 2026-06-18 14:56 - [ARCH]

What:
- Split the oversized Machines service test into provisioning, ensure-running/runtime readiness, and idle-suspension test files.
- Added a shared Machines test helper for service construction, Supabase query-chain mocks, and fresh-machine fetch stubs.

Why:
- `apps/api/src/modules/machines/services/__tests__/machines.service.test.ts` was a Phase 1 Type D hard LOC violation at 649 LOC.

Impact:
- Test-only behavior-neutral refactor; the split Machines service suite still runs 12 passing tests.
- `machines.service.test.ts` dropped to 129 LOC, and all extracted Machines test files are under the hard closeout limit.
- Remaining Phase 1 Type D hard closeout TypeScript targets dropped from 3 to 2.

Files:
- `apps/api/src/modules/machines/services/__tests__/machines.service.test.ts`
- `apps/api/src/modules/machines/services/__tests__/machines.service.ensure-running.test.ts`
- `apps/api/src/modules/machines/services/__tests__/machines.service.suspend.test.ts`
- `apps/api/src/modules/machines/services/__tests__/machines-test-helpers.ts`
- `.docs/plans/architecture-compliance-remediation.md`

## 2026-06-18 14:59 - [ARCH]

What:
- Split the oversized Missions DTO barrel into focused core, plan/human-subtask, deliverable/comment, and manager/awareness/internal DTO modules.
- Kept `apps/api/src/modules/missions/dto/index.ts` as the public export barrel and added a Missions DTO schema characterization test.

Why:
- `apps/api/src/modules/missions/dto/index.ts` was a Phase 1 Type D hard LOC violation at 648 LOC.

Impact:
- Behavior-neutral DTO refactor; existing `../dto` imports continue to work through the barrel.
- `index.ts` dropped to 4 LOC, and all extracted Missions DTO files are under the hard closeout limit.
- Remaining Phase 1 Type D hard closeout TypeScript targets dropped from 2 to 1.

Files:
- `apps/api/src/modules/missions/dto/index.ts`
- `apps/api/src/modules/missions/dto/mission-core.dto.ts`
- `apps/api/src/modules/missions/dto/mission-plan.dto.ts`
- `apps/api/src/modules/missions/dto/mission-deliverable.dto.ts`
- `apps/api/src/modules/missions/dto/mission-manager.dto.ts`
- `apps/api/src/modules/missions/dto/__tests__/mission-dto-schemas.test.ts`
- `.docs/plans/architecture-compliance-remediation.md`

## 2026-06-18 15:02 - [ARCH]

What:
- Split the oversized Meta API service test into batch publish and status/webhook flow test files.

Why:
- `apps/api/src/modules/integrations/meta/services/__tests__/meta-api.service.test.ts` was the final Phase 1 Type D hard LOC violation at 629 LOC.

Impact:
- Test-only behavior-neutral refactor; the split Meta suite still runs 6 passing tests.
- `meta-api.service.test.ts` dropped to 400 LOC, and the extracted Meta status test is 231 LOC.
- Remaining Phase 1 Type D hard closeout TypeScript targets dropped from 1 to 0.

Files:
- `apps/api/src/modules/integrations/meta/services/__tests__/meta-api.service.test.ts`
- `apps/api/src/modules/integrations/meta/services/__tests__/meta-status.service.test.ts`
- `.docs/plans/architecture-compliance-remediation.md`

## 2026-06-18 15:04 - [FIX]

What:
- Changed subscription-backed chat usage accounting so `openai-codex/...` and `anthropic-subscription/...` requests record token usage with zero actual Vibey cost and zero credit charge.
- Stored the token-based equivalent value in usage metadata for visibility without treating it as provider spend.
- Added a credit-guard bypass for explicit subscription model sends and focused billing/guard tests.

Why:
- OpenClaw/pi-ai token estimates were being logged as `provider_direct` spend, so a Codex subscription run deducted 35 Vibey credits even though the model call used the admin subscription path.

Impact:
- Subscription-backed model sends no longer deduct Vibey chat credits or inflate actual model cost.
- Provider-paid model sends keep the existing cost and credit behavior.
- Embeddings and other non-subscription direct usage remain charged through their existing paths.

Files:
- `apps/agent-api/src/modules/billing/services/credits.service.ts`
- `apps/agent-api/src/modules/billing/guards/credits.guard.ts`
- `apps/agent-api/src/modules/billing/services/credits.service.test.ts`
- `apps/agent-api/src/modules/billing/guards/credits.guard.test.ts`
- `documentation/features/chat-stream-recovery.md`

## 2026-06-18 18:24 - [FIX]

What:
- Added inline Claude Subscription setup-token instructions to the admin integration connect modal.
- Extended connection fields with optional help title, command, text, and ordered steps.
- Documented that Claude Subscription uses `claude setup-token`, not an Anthropic Console API key.

Why:
- The Claude Subscription modal only asked for a token, so admins had no product guidance for where the setup-token comes from.

Impact:
- Admins now see the command to run, the accepted `sk-ant-oat01-...` prefix, and the paste flow directly before connecting Claude Subscription.
- Existing API-key integrations remain unchanged unless they opt into the optional field help metadata.

Files:
- `apps/web/src/features/settings/components/settings-content/integrations.types.ts`
- `apps/web/src/features/settings/components/settings-content/IntegrationCard.tsx`
- `apps/web/src/features/settings/components/settings-content/useIntegrations.ts`
- `documentation/features/chat-stream-recovery.md`

## 2026-06-18 18:29 - [FIX]

What:
- Added structured chat stream failure categories so transport drops, model overloads, model/context setting errors, runtime availability, and unknown failures have distinct user-facing behavior.
- Added open-tab stream stall detection that watches raw stream byte activity, aborts stale local readers after 60 seconds, preserves the run cursor, and starts the existing Redis/DB recovery flow automatically.
- Changed proxy mid-stream relay failures to emit recoverable `stream_interrupted` SSE errors, and kept Retry / Continue as final fallback controls for interrupted partial answers only.
- Added focused TDD coverage for failure classification, stall recovery, cursor-preserving abort, and proxy relay interruption coding.

Why:
- Chat failures were collapsing into generic Retry / Continue UX, leaving users unable to tell whether the connection dropped, the model was busy, or the request/context failed.

Impact:
- Connection/stream drops now auto-recover first; model/context/runtime failures show specific messages and do not offer misleading Continue actions.
- No database, Redis schema, or backend route contract changes.

Files:
- `apps/web/src/features/studio/config/chat-stream-errors.config.ts`
- `apps/web/src/features/studio/config/chat-stream-errors.config.test.ts`
- `apps/web/src/features/studio/store/use-chat-store.ts`
- `apps/web/src/features/studio/services/chat.service.ts`
- `apps/web/src/features/studio/services/chat-stream-interruption.test.ts`
- `apps/web/src/features/studio/services/stream-resilience.ts`
- `apps/web/src/features/studio/services/stream-resilience.test.ts`
- `apps/web/src/features/studio/components/chat/StreamInterruptedBar.tsx`
- `apps/web/src/app/api/proxy/[...path]/route.ts`
- `apps/web/src/app/api/proxy/[...path]/route.test.ts`
- `documentation/features/chat-stream-recovery.md`
- `.docs/plans/agent-follow-up-work.md`

## 2026-06-18 18:41 - [FIX]

What:
- Replaced the interrupted chat banner's separate Retry and Continue controls with one Resume action.
- Removed the continuation-message fallback from the banner and deleted the now-unused continuation prompt constant.
- Removed `allowContinue` stream-failure metadata so interrupted-answer UX cannot render a second action.
- Added focused component regression tests for the single Resume button and failed-resume cleanup path.

Why:
- Two recovery choices made the interrupted-answer UX feel ambiguous. A single Resume action keeps recovery simple, and users can type their own continuation if recovery cannot resume.

Impact:
- Interrupted stream banners now show one action: Resume.
- Resume attempts recovery; if the run still cannot resume, the banner clears instead of asking the user to choose another recovery path.

Files:
- `apps/web/src/features/studio/components/chat/StreamInterruptedBar.tsx`
- `apps/web/src/features/studio/components/chat/StreamInterruptedBar.test.tsx`
- `apps/web/src/features/studio/config/chat-stream-errors.config.ts`
- `apps/web/src/features/studio/config/chat-stream-errors.config.test.ts`
- `apps/web/src/features/studio/services/chat-stream-interruption.test.ts`
- `apps/web/src/features/studio/services/chat.service.ts`
- `documentation/features/chat-stream-recovery.md`

## [2026-06-18 12:00] - [STYLE]
What: Light-mode token migration (high-confidence swaps only) across team/channels feature areas. Swapped solid `text-white` → `text-foreground` on neutral-background form inputs/buttons/menu items, and `text-white/NN` → `text-muted-foreground` on plain labels, icons, headings, and empty-state/list text. Left all over-media overlays (portrait/avatar/image-preview spinners), the code-snippet `<pre>` + its copy button, `bg-white/10` filled button, the shared `ADD_TRIGGER_BASE` overlay button, and any `text-white/NN` paired with a `hover:text-white` state untouched for review.
Why: Continue per-feature token sweep so these surfaces theme correctly in light mode without breaking white-on-media or colored-button contrast.
Impact: 24 swaps across 5 files; no behavior change. Customer widget preview is iframe-isolated so was unaffected. RoleEmblem.tsx excluded by design.
Files:
- `apps/web/src/features/team/components/shared/CampaignDestinationField.tsx`
- `apps/web/src/features/team/components/container/AgentWidgetSection.tsx`
- `apps/web/src/features/team/components/container/WidgetBuilderImageField.tsx`
- `apps/web/src/features/team/components/container/WidgetBuilderModal.tsx`

## 2026-06-18 19:14 - [FIX]

What:
- Fixed Claude Subscription connect to store setup tokens with the existing vault `token` secret type.
- Kept the provider-specific `setup_token` subtype in vault metadata.
- Updated the Claude Subscription service regression test and feature documentation.

Why:
- Supabase rejected the previous `secret_type = 'setup_token'` write because `vault_secrets_secret_type_check` only allows `api_key`, `token`, `password`, `oauth_token`, and `custom`.

Impact:
- Claude Subscription can now store its encrypted setup token without changing the global vault schema.
- Existing runtime lookup still reads the same provider and vault label.

Files:
- `apps/api/src/modules/integrations/anthropic-claude/types/anthropic-claude.types.ts`
- `apps/api/src/modules/integrations/anthropic-claude/services/anthropic-claude.service.ts`
- `apps/api/src/modules/integrations/anthropic-claude/services/__tests__/anthropic-claude.service.test.ts`
- `documentation/features/chat-stream-recovery.md`

## 2026-06-18 19:21 - [FIX]

What:
- Mapped Claude Subscription picker model IDs to OpenClaw's canonical Anthropic gateway model IDs.
- Added regression coverage for Claude Subscription model routing and Codex/default gateway routing.

Why:
- `anthropic-subscription/claude-opus-4-8` was reaching OpenClaw as `anthropic/claude-opus-4-8`, but OpenClaw only recognizes the dotted model ID `anthropic/claude-opus-4.8`.

Impact:
- Selecting Claude Subscription Opus 4.8 now sends `anthropic/claude-opus-4.8` to OpenClaw and can use the connected Claude runtime credential path instead of failing with `Unknown model`.

Files:
- `apps/agent-api/src/modules/chat/services/openclaw-proxy.service.ts`
- `apps/agent-api/src/modules/chat/services/openclaw-proxy.service.test.ts`

## 2026-06-18 19:32 - [STYLE]

What:
- Strengthened task option badges, status pills, option dots, and priority flags for light mode.
- Kept dark-mode palette values aligned with the existing darker theme through explicit dark variants.

Why:
- Task status chips and activity tags were visually too weak on warm light surfaces.

Impact:
- Task detail status, task tags, activity tag previews, select-cell priority icons, and kanban priority icons have stronger contrast in light mode without changing behavior.

Files:
- `apps/web/src/features/spaces/components/OptionBadge.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskMetaFields.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskActivityFieldValuePreview.tsx`
- `apps/web/src/features/spaces/components/cells/SelectCell.tsx`
- `apps/web/src/features/spaces/components/KanbanView.tsx`

## 2026-06-18 19:40 - [STYLE]

What:
- Strengthened the TikTok Research default tab glyph in light mode.
- Changed completed Studio chat SSE/tool event icons from white to foreground inside the shared glass icon badge.

Why:
- The TikTok Research icon and completed event glyphs were too faint on light-mode glass/card surfaces.

Impact:
- TikTok Research tabs and completed chat tool/SSE event rows read with stronger contrast in light mode while preserving the existing dark-mode TikTok tint.

Files:
- `apps/web/src/features/spaces/components/view-type-tab-meta.ts`
- `apps/web/src/features/studio/components/chat/FlowTimeline.tsx`

## 2026-06-18 19:41 - [FIX]

What:
- Added direct Anthropic provider model definitions to the OpenClaw runtime config for Claude Subscription models.
- Registered Opus 4.6, Opus 4.7, Opus 4.8, Sonnet 4.6, and Haiku 4.5 under `models.providers.anthropic`.

Why:
- Claude Subscription requests now reach OpenClaw as `anthropic/claude-opus-4.8`, but the runtime config only had those Claude models under the `openrouter` provider.

Impact:
- OpenClaw can resolve direct Anthropic Claude Subscription model requests instead of failing with `Unknown model`.
- Runtime credentials still come from Vibey per request; no tokens are stored in the config.

Files:
- `docker/openclaw.json`

## 2026-06-18 19:47 - [FIX]

What:
- Added a forward runtime repair migration for the Temporal Brain Spine and Cortex timelines.
- Applied the missing temporal columns to production and staging via Supabase MCP.
- Added missing staging timeline tables, indexes, RLS policies, and timeline search RPCs.
- Seeded the missing staging `brain-timeline-synthesis` system skill rows for Atlas and brain_scholar.

Why:
- Production API traffic was failing on `/api/brain/graph` because deployed code selected `ns_belief_patterns.evidence_started_at`, but the temporal spine columns were missing from production.
- Staging was further behind and lacked both the temporal columns and timeline tables/RPCs.

Impact:
- Production and staging now expose `brain_episodes`, `brain_timelines`, `brain_timeline_items`, temporal graph columns, company effective fields, and timeline search RPCs.
- Production and staging both have Atlas/brain_scholar timeline synthesis skill rows.
- The Brain graph path can read temporal metadata without failing on missing columns.

Files:
- `supabase/migrations/20260618163348_brain_temporal_runtime_repair.sql`

## 2026-06-18 19:47 - [STYLE]

What:
- Strengthened remaining high-confidence light-mode palette/status surfaces found in Spaces and Studio chat.
- Updated view tab glyph palettes, chat plan completion states, voice run status icons, conversation completion icons, task attachment badges, research saved icons, task activity failure states, and research analysis action buttons.

Why:
- Several sibling status icons and badge-like surfaces used dark-theme palette values that became too faint on light glass/card surfaces.

Impact:
- Light mode has stronger status/tag/icon contrast across view tabs, chat plans, voice runs, task activity, task attachments, and research analysis actions.
- Dark-mode palette values are preserved for data-coded view/file badge colors.

Files:
- `apps/web/src/features/spaces/components/view-type-tab-meta.ts`
- `apps/web/src/features/studio/components/chat/ChatPlanCard.tsx`
- `apps/web/src/features/spaces/components/chat/SpaceVoiceRunsView.tsx`
- `apps/web/src/features/spaces/components/chat/SpaceConversationsList.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskActivityComment.tsx`
- `apps/web/src/features/spaces/components/instagram-research/InstagramResearchList.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskActivity.tsx`
- `apps/web/src/features/spaces/components/instagram-research/ContentAnalysisModal.tsx`

## 2026-06-18 19:50 - [STYLE]

What:
- Strengthened Spaces board column washes in light mode.
- Raised named kanban column backgrounds and borders in light mode while keeping their previous dark-mode opacity.
- Raised custom/preset kanban column tint overlays in light mode and kept the existing dark overlay strength.

Why:
- Board columns were too pale in the light theme and did not provide enough separation from cards and the page surface.

Impact:
- Board view columns now read as stronger section surfaces in light mode without changing task cards, drag/drop behavior, or dark-mode column tint strength.

Files:
- `apps/web/src/features/spaces/components/KanbanView.tsx`

## 2026-06-18 19:51 - [FIX]

What:
- Added slash-skill autocomplete to the task/channel rich composer and inserted selected skills as `/skill-key` text.
- Forwarded selected `skill_keys` from task comments and Send to agent requests through the web service and main API.
- Resolved referenced slash skills in task-agent runtime invokes and prepended their skill instructions before streaming.

Why:
- Task comments that tagged an agent plus `/skill` and Send to agent extra instructions could reach the agent without the referenced skill context.

Impact:
- Mentioned task agents and explicitly selected task agents now receive enabled referenced skill instructions when the user types or selects `/skill-key`.
- Unknown slash tokens remain normal prompt text and do not block task execution.

Files:
- `apps/web/src/features/channels/components/ChannelComposer.tsx`
- `apps/web/src/features/channels/components/SlashCommandTabbedMenu.tsx`
- `apps/web/src/features/channels/components/slash-command-types.ts`
- `apps/web/src/features/spaces/components/task-detail/TaskActivity.tsx`
- `apps/web/src/features/spaces/components/task-detail/SendTaskToAgentModal.tsx`
- `apps/web/src/features/spaces/services/spaces.service.ts`
- `apps/api/src/modules/spaces/dto/space-activity.dto.ts`
- `apps/api/src/modules/spaces/services/spaces-service-05.base.ts`
- `apps/api/src/modules/spaces/services/spaces-service-06.base.ts`
- `apps/agent-api/src/modules/task-agent/task-agent.controller.ts`
- `apps/agent-api/src/modules/task-agent/task-agent.service.ts`
- `apps/agent-api/src/modules/task-agent/task-agent.service.test.ts`
- `documentation/features/lists.md`

## [2026-06-18 20:11] - [FIX]

What: Wrapped `onRetry()` with `Promise.resolve()` in `NotificationFeedRowMeta` so `.finally()` is valid on `void | Promise<void>` callbacks.
Why: Workspace `pnpm typecheck` failed with TS2339 on line 59.
Impact: All 18 turbo typecheck packages pass.
Files:
- `apps/web/src/features/notifications/components/NotificationFeedRowMeta.tsx`

## [2026-06-18 20:15] - [REFACTOR]

What: Removed debug instrumentation from model-picker investigation (backend-client, middleware, proxy route, use-chat-input-model-options, models.controller) and deleted `.cursor/debug-a7c203.log`.
Why: Issue fixed; cleanup per debug session protocol.
Impact: No runtime debug logging for models fetch path.
Files:
- `apps/web/src/lib/api/backend-client.ts`
- `apps/web/src/middleware.ts`
- `apps/web/src/app/api/proxy/[...path]/route.ts`
- `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-options.ts`
- `apps/api/src/modules/models/controllers/models.controller.ts`
