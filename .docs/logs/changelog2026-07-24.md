# Changelog - July 24, 2026

## [2026-07-24 21:55] - [FIX]

What: Unblocked the `roas-web` production build — added the missing `isShellWorkspaceRoute` import in `ShellChatMenu.tsx` (it was referenced but never imported) and typed the `AgentTurnFeedbackActions` mock-call tuple in `AssistantActions.test.tsx` so `next build`'s TypeScript step compiles.

Why: The committed shell/chat code failed `next build` typecheck (`Cannot find name 'isShellWorkspaceRoute'`), which blocked deploying the Programs/flyout polish to app.roas.io.

Impact: `roas-web` now builds and deploys to production. No runtime behavior change.

Files: `apps/web/src/components/shell/ShellChatMenu.tsx`, `apps/web/src/features/studio/components/message-bubble/AssistantActions.test.tsx`

## [2026-07-24 21:50] - [STYLE]

What: Retargeted brand primary from emerald green to Pixel purple (`#9333ea` / vibe-purple), including primary glass buttons (`button-glass-primary`, `button-glass-accent`) and empty-chat capability chips.

Why: Accent CTAs and chat capability icons still used green while Pixel/Inbox selection already read purple.

Impact: New chat, Mission Accept, capability strip, and other primary accents now match Pixel purple. Success/status greens (`--color-success`, `badge-glass-green`) stay green.

Files: `apps/web/src/app/globals.css`, `apps/website/src/app/globals.css`, `design-guidelines.md`

## [2026-07-24 21:42] - [FEATURE]

What: Repurposed top-bar PanelLeft to expand/collapse AI Chats (HQ rail stays icon-only), made AI Chats hover=docked mini / click=full-screen with a compact pill while open, removed Home/Work menu toggle, rounded the history New chat button, and added a perpetual marquee on empty-chat capability chips.

Why: Expanding the HQ menu competed with AI Chats; the Work tab had no durable home; the overflowing AI Chats pill collided with history Search; New chat lacked the app's standard radius; capability chips were static.

Impact: Nav stays collapsed; AI Chats is the primary expand surface; New chat matches Accept-style rounding; capability strip scrolls until hover/focus.

Files: `ShellTopBar.tsx`, `SidebarHqRail.tsx`, `ShellAiChatsButton.tsx`, `SidebarHqHubMenu.tsx`, `SidebarHqHubMenuContent.tsx`, deleted `ShellMenuChrome.tsx` / `SidebarWorkMenu.tsx`, `SpaceConversationsHeader.tsx`, `ShellEmptyChatCapabilityScroller.tsx`, both `globals.css`, tests, `claude-chatgpt-shell.md`

## [2026-07-24 21:34] - [STYLE]

What: Extended the Programs ClickUp-style polish to all hub-rail flyouts (Team, Brain, More, and the shared communication/channels nav) by upgrading the shared `.hub-dock-flyout-*` utilities instead of a second system — `.hub-dock-flyout-row` now uses `body-2` type, `.hub-dock-flyout-caption` is a stronger uppercase section header, and a new `.hub-dock-flyout-divider` hairline separates sections. Brain flyout now renders tinted square scope tiles (`badge-glass-*` per scope type), section dividers, and truncates the User-brains group to the first 5 with a "Show more" toggle (User brain always pinned above). Extracted the Brain row/helper presentational code into `SidebarBrainFlyoutRows.tsx` to stay under the 400-line limit. Unified Team section subheaders and "Show more" wording across flyouts.

Why: The wider flyouts read inconsistently vs the new Programs menu, and user brains overflowed the fixed-height Brain flyout viewport.

Impact: Team/Brain/More/channels flyouts share one denser, more readable ClickUp-like hierarchy; Brain no longer overflows and navigation to every brain is preserved (Show more reveals the rest). No ACL, routing, or data changes. Fixed-width viewport + truncate unchanged. Hub-dock utilities are web-dashboard-only (not present in `apps/website`), so no website globals sync needed.

Files: `apps/web/src/app/globals.css`, `apps/web/src/components/layout/sidebar/SidebarBrainFlyout.tsx`, `SidebarBrainFlyoutRows.tsx` (new), `SidebarTeam2Flyout.tsx`, `HomeCommunicationNav.tsx`

## [2026-07-24 21:36] - [FIX]

What: Empty-chat hero now always uses the active agent name/avatar (Pixel + lamp), not the org name.

Why: With an org named ROAS, the hero showed "ROAS" while the picker said "Pixel".

Impact: Center hero matches the agent picker — Pixel, not ROAS.

Files: `SpaceChatAgentEmptyState.tsx`, `SpaceChatAgentEmptyState.test.tsx`

## [2026-07-24 21:34] - [FEATURE]

What: Restored the empty-chat composer chrome (Find/Research/Create/… action pills, hover-expanding capability scroller, and the "Ask, create, search, @ to mention…" placeholder) that had regressed out of `SpaceVibeyChatPanel`'s render body, and renamed the default agent to "Pixel" with a lamp avatar via a single roster-normalization chokepoint.

Why: The pills/scroller/placeholder wiring was reverted (imports/state survived but the JSX usage was lost), so none of it rendered; separately the default agent still showed the seeded "Vibey"/"ROAS" identity with an AI-generated human portrait.

Impact: Empty chats now show pills above the composer, a capability strip under the hero that seeds the composer on click (and returns when the composer is cleared), and the new placeholder. `fetchTeamRoster` now presents the default `vibey` agent as "Pixel" with `/pixel-avatar.png` — but only when the org is still on the seeded default name, so customized agent names/avatars are untouched. Product/brand "Vibey" is unchanged.

Files: `SpaceVibeyChatPanel.tsx`, `SpaceChatAgentEmptyState.tsx`, `lib/team/default-agent-identity.ts` (+test), `lib/team/team-roster-api.ts`, `space-vibey-chat-panel.constants.ts`, `apps/web/public/pixel-avatar.png`, `apps/website/public/pixel-avatar.png`

## [2026-07-24 21:14] - [STYLE]

What: Moved AI Chats out of the centered Search control into a pen-marked launcher below the ROAS logo, added the matching AI Chats collapse control to the drawer header, and restored New to the chat-history toolbar.

Why: Search and chat entry were competing in the top bar, while opening and collapsing the drawer did not feel spatially connected to the left navigation.

Impact: Search is centered by itself; the collapsed sidebar exposes a protruding AI Chats launcher above Inbox; the opened drawer collapses through its matching header control; fresh chats start from New beside history Search/filter.

Files: `ShellAiChatsButton.tsx`, `ShellTopBar.tsx`, `SidebarHqRail.tsx`, `SpaceChatHeaderActions.tsx`, `SpaceConversationsHeader.tsx`, `ShellChatMenu.tsx`, both product `globals.css` files, focused tests, and `documentation/features/claude-chatgpt-shell.md`

## [2026-07-24 21:06] - [FIX]

What: Chat history filter menu now expands options inline on click, adds Icon (agent / logo / status / none) and bottom Reset to defaults, and maps Icon=agent to all-agent fetch in the shell drawer.

Why: Right-side hover submenus were clipped in the narrow history rail so filters looked dead; users wanted reset at the bottom and control over row leading marks instead of always showing Slack logos.

Impact: Type / Status / Last activity / Group by / Icon selections apply immediately; Reset restores defaults; shell rows can show agent avatars, channel logos, status, or no leading mark.

Files: `ChatHistoryFilterMenu.tsx`, `conversation-list-query.ts`, `SpaceConversationRows.tsx`, `SpaceConversationsList.tsx`, `ShellChatMenu.tsx`, `AllChatsPage.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-07-24 20:21] - [FIX]

What: Collapsing the page work area now expands the AI chat drawer in place (history rail stays visible) and animates the page closed, instead of swapping to a bare full-screen chat that dropped history.

Why: Closing the right-side collapse control was unmounting ShellChatDrawer and replacing it with GlobalChatPanel alone, so chat history disappeared in "full screen" chat.

Impact: PanelRight collapse on Inbox/Brain/Spaces/etc keeps Today/Yesterday thread list + active chat; page content slides/shrinks away. Expand restores the page.

Files: `ShellWorkspace.tsx`, `ShellChatDrawer.tsx`, `globals.css`, shell drawer/workspace tests

## [2026-07-24 20:22] - [FIX]

What: Top-left sidebar pin/expand works while AI Chats is open — HQ rail is no longer force-hidden (`w-0` / `return null`) when the chat drawer is open.

Why: Chat-covers-menu logic blocked PanelLeft from showing Home/Work; pin state changed but the menu never rendered.

Impact: With AI Chats open, Expand/Collapse sidebar shows or hides the menu beside the chat drawer.

Files: `Sidebar.tsx`, `SidebarHqRail.tsx`, `ShellTopBar.test.tsx`

## [2026-07-24 20:32] - [FEATURE]

What: Claude-style chat history — default flat list (group by None), nested filter menu (Type / Status / Last activity / Group by date|status|campaign|agent|channel), Show all agent conversations in the filter strip, pop-out to full-page `/chats` with Search / Select / New.

Why: Date buckets (Today / Yesterday / Last 7 Days) were hard-coded; Claude uses None by default with optional grouping and a dedicated All Chats surface.

Impact: Shell AI drawer history is a single newest-first list unless Group by is set. Filter status defaults to Active; activity default All. `/chats` is the All Chats and Tasks page.

Files: `conversation-list-query.ts`, `ChatHistoryFilterMenu.tsx`, `SpaceConversationsList.tsx`, `SpaceConversationSections.tsx`, `ShellChatMenu.tsx`, `AllChatsPage.tsx`, `app/(dashboard)/chats/page.tsx`

## [2026-07-24 20:36] - [FIX]

What: Page work-area open/close now right-anchors the panel body to the clip edge so Show page slides in from the right (not left-growing beside chat).

Why: Flex width growth revealed left-aligned dashboard content first, which felt like a left-side entrance.

Impact: Collapse page / Show page animates from the right edge of the shell.

Files: `ShellWorkspace.tsx`, `globals.css`

## [2026-07-24 20:38] - [STYLE]

What: Chat history header is Search + hover-only All Chats pop-out + Filter. Show all agent conversations moved into the filter menu.

Why: Match the tighter Claude-like toolbar (no always-visible agents icon).

Impact: Shell chat list toolbar shows fewer icons; agents scope is a filter checkbox.

Files: `ChatHistoryFilterMenu.tsx`, `SpaceConversationsHeader.tsx`

## [2026-07-24 20:52] - [FEATURE]

What: Added a draggable, persisted width for the AI drawer's chat-history rail and made scrollbars across the product appear only during active scrolling.

Why: The fixed 200px history rail truncated conversation titles, while the globally styled scrollbar thumb remained visible even when the list was idle.

Impact: Users can widen or narrow chat history in docked and full-screen chat; docked resizing preserves active-chat space by growing the drawer with the rail. Any product scrollbar fades back to hidden shortly after scrolling stops.

Files: `root-providers.tsx`, `ShellChatDrawer.tsx`, `ResizableDivider.tsx`, `use-shell-store.ts`, both product `globals.css` files, and focused tests

## [2026-07-24 20:59] - [FIX]

What: Removed the AI drawer's fixed 720px resize ceiling, made dragging it to the viewport edge collapse the page into full-screen chat, and changed page restoration to an explicit slide from beyond the right edge.

Why: The fixed drawer clamp stopped the drag halfway across larger screens, while width-only flex growth could still reveal the page from the left.

Impact: The AI drawer can consume the full available shell width. Releasing at the right edge enters the same full-screen state as the collapse button, and Show page restores the prior docked width while the page slides in from the right.

Files: `ShellChatDrawer.tsx`, `ShellWorkspace.tsx`, `use-shell-store.ts`, `globals.css`, shell tests, and `documentation/features/claude-chatgpt-shell.md`

## [2026-07-24 21:20] - [STYLE]

What: Programs flyout ClickUp-style visual polish — section dividers (All Tasks / tree / New Program), `body-2` row labels, larger flyout title, colored program icon tiles (`badge-glass-*`), and deterministic default colors when `icon_color` is empty (user picks preserved). New Program modal defaults to a colorful swatch.

Why: ClickUp Spaces menu reads clearer with colored tiles, larger type, and stronger section separation; Programs without a stored color looked gray-only.

Impact: Programs panel hierarchy and default colors match the ClickUp reference without changing ACL/dnd behavior. Fixed-width truncate unchanged.

Files: `program-icon-appearance.ts` (+ test), `SidebarProgramFolder.tsx`, `SidebarHqSpacesBucketList.tsx`, `SidebarHqSpacesRows.tsx`, `NewProgramModal.tsx`, `HubDockFlyout` title CSS in `apps/web/src/app/globals.css`, `documentation/features/programs.md`

## [2026-07-24 21:12] - [FEATURE]

What: Programs polish part 2 — (1) ClickUp-style sidebar drag-reorder: drag a space into another campaign, drag a campaign into another program (or out to General); (2) Program-access hardening: space moves now assert Program `edit` on the source/target campaign's Program, and program access resolution is batched (single `listByIds` instead of per-program `findById`); (3) Compat: read-only report + Share-UI notice for space shares overridden by Program privacy.

Why: The new drag-move made it trivial to reparent a space/campaign into a Private Program, which would have bypassed the Program ACL. Sharing a space that sits inside a private Program silently failed for invitees. Program list gates were doing N+1 lookups per sidebar/hub request.

Impact: Users can reorganize the Programs tree by dragging (optimistic + rollback + Vibey-voice toast on failure); moving into a program the user can't edit is rejected server-side. The Share modal warns when a space lives in a private program. `GET /programs/share-conflicts` (org admin) lists overridden shares. No destructive changes.

Files: `apps/web/.../sidebar/sidebar-tree-dnd.tsx` (+ test), `SidebarHqSpacesRows.tsx`, `SidebarHqSpacesBucketList.tsx`, `SidebarHqSpacesGroupedList.tsx`, `useSidebarCampaignsCore.ts`, `useSidebarController.ts`, `config/sidebar-toast-errors.config.ts`, `features/spaces/hooks/use-space-program-privacy.ts`, `features/spaces/components/ShareModal.tsx`, `features/spaces/components/modals/SpaceModalsHost.tsx`, `apps/api/.../spaces/services/spaces-service-01.base.ts`, `spaces/services/spaces.service.ts`, `programs/services/program-permissions.service.ts` (+ test), `programs/repositories/programs.repository.ts`, `programs/services/program-share-compat.ts` (+ test), `program-share-compat.service.ts`, `program-share-compat.repository.ts`, `programs/controllers/programs.controller.ts`, `programs.module.ts`, `documentation/features/programs.md`, `documentation/features/program-share-privacy-overrides.md`

## [2026-07-24 20:55] - [FIX]

What: Fixed Create Program (RLS INSERT…RETURNING), IconPicker clicks inside dialogs, Programs sidebar hover refetch, and Personal via Private Program ACL.

Why: Program create failed because SELECT RLS called has_program_access on an in-flight row; icon picker was portaled under Dialog body pointer-events:none; Programs panel remounted and refetching on every hover; users needed personal campaigns without a parallel ACL.

Impact: Create Program works on prod after DB migration (applied). Folders render from org-scoped cache on hover. Each user gets a Private Personal Program; Make personal moves campaigns into it. Web/API code still needs merge/deploy for UI/API ensure + picker/perf.

Files: `supabase/migrations/20260724204707_programs_insert_returning_rls.sql`, `programs.repository.ts`, `programs.service.ts`, `NewProgramModal.tsx`, `IconLibraryPopup.tsx`, `programs-list-cache.ts`, `SidebarHqSpacesGroupedList.tsx`, `useSidebarController.ts`, `useSidebarCampaignsCore.ts`, `SidebarCampaignMenuPortal.tsx`, `documentation/features/programs.md`

## [2026-07-24 11:05] - [FIX]

What: Cloned personal Meetings (268 items + Fathom Meeting Log) into ROAS org General; moved CEO HQ + Sales Pipeline into org General; disabled personal Fathom Meeting Log; set Fathom auto-ingest billing to ROAS org. Prefer org Meetings for Home/Agenda/Fathom ensure; rename Programs UI folder Ungrouped → General.

Why: Cross-org personal Meetings injection was buggy and no longer needed; team Fathom should land in the org workspace. Ungrouped campaigns already behave as General.

Impact: ROAS General now has Meetings / CEO HQ / Sales Pipeline. New Fathom webhooks route to org Meetings automation `ef3975a7-…`. Personal Meetings history remains as a disabled-automation archive. UI shows General instead of Ungrouped. Requires api/web deploy for resolution + rename.

Files: `scripts/roas/clone-personal-spaces-to-org.py`, `meetings-precall-prep.service.ts`, `fathom-oauth.service.ts`, `resolve-meetings-space-id.ts`, `integrations-calendar*.ts`, `calendar-api.ts`, Programs Ungrouped→General UI files, `documentation/features/programs.md`, `documentation/features/meeting-follow-up-slack.md`

## 2026-07-24 08:39 - [FEATURE]

What: Added Higgsfield as a native OAuth-connected MCP integration with PKCE, resource-bound authorization, vaulted access/refresh tokens, automatic agent-runtime token refresh, agent-enabled MCP registration, and Settings connect/disconnect UI.

Why: Video-ad missions and Slack agents need durable Higgsfield access without API keys or Composio.

Impact: Admins can connect Higgsfield once from Integrations; ROAS agents can discover and call its MCP tools, and expiring access tokens refresh without interrupting missions.

Files: `apps/api/src/modules/integrations/higgsfield/*`, `apps/agent-api/src/modules/mcp/*`, `apps/web/src/features/settings/components/settings-content/useIntegrations.ts`, `apps/web/src/lib/integrations/integration-catalog.ts`, `packages/api-shared/src/services/mcp-oauth-token-bundle.ts`, `supabase/migrations/20260724223000_higgsfield_mcp_integration.sql`

## 2026-07-24 08:54 - [FEATURE]

What: Applied the Higgsfield catalog migration to ROAS production, configured the production OAuth client/callback/state signer, and deployed the exact connector commit to `api.roas.io`, `app.roas.io`, and `sites.roas.io`.

Why: The connector needs a live callback, catalog row, and Settings card before a user can authorize Higgsfield.

Impact: The Higgsfield card and protected connect/callback routes are live. The Fly agent-runtime deployment remains gated because its established Docker build requires two Git-ignored local runtime inputs.

Files: Supabase `lhfgtsjetcardinpgouq`, Vercel `roas-api` deployment `dpl_62p1osBwt88UQkoaXJjzGvSrQHhk`, Vercel production web/funnels from commit `64553b53`

## 2026-07-24 09:29 - [FIX]

What: Regenerated and committed OpenClaw's A2UI canvas bundle with its matching checksum, then deployed the Higgsfield-enabled agent runtime to Fly.

Why: The clean production image could not build without the generated canvas asset, and the available local asset was stale relative to its source inputs.

Impact: The Fly runtime now includes the verified Higgsfield MCP execution path. Deep health passes with the agent API, OpenClaw gateway, and auth service reachable.

Files: `apps/openclaw/src/canvas-host/a2ui/a2ui.bundle.js`, `apps/openclaw/src/canvas-host/a2ui/.bundle.hash`, Fly app `roas-runtimes`

## 2026-07-24 10:03 - [FIX]

What: Added the missing Automation section to the integrations Library and covered it with a Higgsfield rendering regression test.

Why: Higgsfield was active in the integration catalog but its valid `automation` category was absent from the Library's display order, so the UI silently omitted its card.

Impact: Searching or browsing the integrations Library now shows Higgsfield with an enabled Connect action.

Files: `apps/web/src/features/settings/components/settings-content/IntegrationsLibrary.tsx`, `apps/web/src/features/settings/components/settings-content/IntegrationsLibrary.test.tsx`

## 2026-07-24 09:34 - [FIX]

What: Added a five-second same-model retry before fallback for provider-busy Pixel runs and a specific Slack-facing busy response when every attempt remains unavailable.

Why: A valid Slack follow-up reached Pixel, but the primary and fallback models were both attempted inside the same rate-limit window and the real cause was hidden behind a generic processing error.

Impact: Transient provider throttles can recover without user action. Exhausted attempts remain visibly incomplete, do not receive a success checkmark, and tell the user Pixel is temporarily busy without exposing provider internals.

Files: `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`, `apps/agent-api/src/modules/chat/controllers/channel-chat.controller.ts`, tests, `documentation/features/meeting-follow-up-slack.md`

## [2026-07-24 10:01] - [FIX]

What: Fixed Slack→brain import OpenClaw stream failures cascading into toast spam. SSE failures now surface nested `response.error` (OpenRouter rate limits), stale recovery no longer double-claims live 15m streams, agent-api health recovery no longer wakes rate-limited retries, Slack daily enqueues are staggered, and Home toasts batch identical failures.

Why: ~249 `campaign_slack_import` jobs failed today with generic "OpenClaw stream failed" while the real cause was provider rate limits; a 5-minute stale reclaim plus wake-on-health-recovery burned attempts and flooded the Home notifier.

Impact: Imports back off on rate limits instead of failing opaquely; duplicate toasts collapse; failed jobs were requeued with a staggered schedule starting ~30 minutes out. Deploy of api/queue-worker/web is still required for the code path.

Files: `apps/api/src/modules/missions/services/gateways/mission-agent-gateway.service.ts`, `apps/api/src/modules/canvas/services/canvas-delegation.service.ts`, `apps/api/src/modules/brain/services/brain-import-jobs.base.ts`, `apps/api/src/modules/brain/services/brain-import-jobs-runtime.base.ts`, `apps/api/src/modules/brain/services/brain-import-jobs.types.ts`, `apps/api/src/modules/brain/repositories/brain-import-jobs-runtime.repository.ts`, `apps/queue-worker/src/modules/slack-sync/services/slack-sync.service.ts`, `apps/web/src/features/brain/components/BrainImportJobNotifier.tsx`

## [2026-07-24 10:42] - [FIX]

What: Pushed and deployed `6b904ad1` (OpenClaw Slack import rate-limit hardening + Programs sidebar WIP) to production.

Why: Home toast storms needed the API/queue-worker/web fix live, and local WIP was ready to ship.

Impact: `origin/main` = `6b904ad1`. Vercel `roas-api` / `roas-web` / `roas-funnels` READY; Railway `queue-worker` Online; smoke 4/4.

Files: production deploy of commit `6b904ad1`

## [2026-07-24 12:06] - [FEATURE]

What: Shipped Program-level permissions MVP (visibility workspace/private/selected, created_by, program_shares, has_program_access; Nest ProgramPermissionsService; campaign/space/All Tasks inherit; org ShareModal + sidebar Share/lock).

Why: Programs were org-wide with no ACL; Private/Selected needed a Program boundary that inherits into campaigns and spaces.

Impact: Default workspace behavior unchanged. Restricted Programs hide from non-ACL members in sidebar, hub, All Tasks, and campaign/space APIs. Agents inherit invoking-user access via RLS.

Files: `supabase/migrations/20260724190155_program_permissions.sql`, `apps/api/src/modules/programs/*`, `apps/api/src/modules/campaigns/*`, `apps/api/src/modules/spaces/services/space-permissions*`, `apps/web/src/lib/org/org-resource-sharing.ts`, `apps/web/src/components/org/ShareModal*`, `apps/web/src/components/layout/sidebar/SidebarProgram*`, `documentation/features/programs.md`

## [2026-07-24 12:21] - [FEATURE]

What: Applied `program_permissions` migration on ROAS prod and archive-deployed Program ACL MVP to production aliases.

Why: Ship Program visibility/shares with inherit gates live on api.roas.io / app.roas.io without git push.

Impact: Migration on `lhfgtsjetcardinpgouq` (4 Programs default workspace). `roas-api` `dpl_Ax3TfvkFZQeGeTLqeXg4TKeh3ExL` → api.roas.io; `roas-web` `dpl_8uXenuiokK4k1Zh9XRom3KiGFusW` → app.roas.io. Smoke 4/4. `/api/programs` returns 401 (route present).

Files: production deploy of branch `feat/program-level-permissions` working tree

## [2026-07-24 11:14] - [FIX]

What: Hydrated abbreviated inbound Slack file events through `files.info` before download, added forwarded-message unfurl parsing, and loaded recent context from a forwarded message's source channel when Pixel has access.

Why: Pixel silently discarded screenshots whose event contained only a Slack file id and treated forwarded channel messages as ordinary links, so it claimed it could not see either the attachment or the referenced conversation.

Impact: Forwarded Slack messages now carry their author, channel, content, links, and readable source-channel discussion into Pixel. Attached screenshots and documents reach the agent even when Slack omits their private download URL from the initial event.

Files: `apps/api/src/modules/slack/types/slack.types.ts`, `apps/api/src/modules/slack/services/slack-forwarded-message-context.ts`, `apps/api/src/modules/slack/services/slack-service-conversation.base.ts`, `apps/api/src/modules/slack/services/slack-service-events.base.ts`, `apps/api/src/modules/slack/services/slack-service-media.base.ts`, Slack regression tests, `documentation/features/integration-connections.md`

## [2026-07-24 11:23] - [FEATURE]
What: Archive-deployed Personal→org Meetings + General UI rename + org Meetings resolution / Fathom routing prefs to production (API + web). Protected aliases from competing CLI/git promotes.
Why: DB clone already live; ship code so Home/Agenda/ensureMeetingsSpace prefer org Meetings and UI shows General instead of Ungrouped, without wiping Programs/Team Agenda via a stale git deploy.
Impact: `api.roas.io` → `dpl_4zoos5ePGPQkARdPcta1zBmqnSzY` READY; `app.roas.io` → `dpl_8tg2Lo34LbqFMay1iAWiFvRd1De6` READY. Smoke: `/api/programs` 401, Team Agenda `scope=team` 401, `app.roas.io/login` 200. No origin push.
Files: local branch `fix/personal-to-org-meetings-spaces` working tree; Vercel `roas-api` / `roas-web`

## [2026-07-24 15:11] - [FIX]

What: Extended Pixel's native Slack DM action to open one-to-one or multi-person conversations, return the conversation type, and resolve every recipient to a friendly Slack display name.

Why: Pixel could only open a one-to-one DM and received only a channel id, so a request for a group chat with Dylan and Betty was rejected and Pixel exposed Betty's raw Slack user id.

Impact: Pixel can use one action for a direct or group DM, include the requesting user when asked for a chat “with me,” and refer to participants by name. Slack OAuth now requests the `mpim:write` permission required to create group DMs.

Files: `apps/api/src/modules/slack/dto/slack.dto.ts`, `apps/api/src/modules/slack/dto/slack.dto.test.ts`, `apps/api/src/modules/slack/services/slack-agent-tools.service.ts`, `apps/api/src/modules/slack/services/slack-agent-tools.service.test.ts`, `apps/api/src/modules/slack/services/slack.service.ts`, `apps/api/src/modules/composio/services/slack-legacy-capabilities.partial.ts`, `supabase/migrations/20260724232000_slack_group_dm_agent_action.sql`, `apps/docs/content/channels/connecting-slack.mdx`, `documentation/features/integration-connections.md`

## [2026-07-24 15:29] - [FIX]

What: Unified authorization and Person Brain ownership across multiple Slack delivery identities linked to the same portal user, contact, or managed Person Brain. Slack Connect accounts now inherit a saved manual classification only through a strong identity link; names alone never grant access.

Why: Teammates such as Bryce can have a regular Slack account and a Slack Connect account. The records were evaluated independently, so a known Internal teammate could be blocked as External in a group conversation.

Impact: Linked Slack aliases behave as one durable person for trust and Brain context while preserving their separate Slack ids for delivery. Existing linked inferred records are backfilled from an unambiguous manual classification, managed Person Brains can be shared by aliases, and unknown Slack Connect members remain fail-closed.

Files: `apps/api/src/modules/slack/repositories/slack-runtime.repository.ts`, `apps/api/src/modules/slack/services/slack-sender-resolver.service.ts`, `apps/api/src/modules/slack/services/slack-sender-resolver.service.test.ts`, `supabase/migrations/20260724234000_slack_identity_aliases.sql`, `apps/docs/content/channels/connecting-slack.mdx`, `documentation/features/integration-connections.md`

## [2026-07-24 15:30] - [FIX]

What: Routed current and prior chat image attachments into the native image-edit action, explicitly treated user-supplied photos as valid inputs for ordinary benign edits, and added native video/Higgsfield chat routing to the shared agent tool instructions.

Why: Vibey received and could see an employee portrait but invented a separate consent restriction, searched for an external OpenAI integration, and told the user to leave ROAS instead of using the already-permitted media actions.

Impact: Agents can edit an attached photo directly in chat with `generate_image`; they no longer require a separate ChatGPT connection for native image work, and Higgsfield-specific video skills route through the connected in-chat MCP tools.

Files: `apps/agent-api/src/modules/chat/services/chat-document-context.service.ts`, `apps/agent-api/src/modules/chat/services/chat.service.context-helpers.test.ts`, `packages/agent-policy/src/platform-tools-template.ts`, `packages/agent-policy/src/platform-tools-template.test.ts`, `documentation/features/document-intelligence.md`

## [2026-07-24 15:35] - [FIX]

What: Made a successful assistant-message fork navigate directly to the new conversation's canonical Home chat URL and added a regression test for the returned fork id.

Why: The fork API created the conversation and copied its messages, but the UI only changed in-memory chat state. The original URL remained authoritative and reopened the source conversation, leaving the user on the old chat despite the success toast.

Impact: Clicking Fork now opens the new chat immediately. The production fork shown in the report was verified as conversation `26aa2a05-4693-480d-b802-c21b79bd0a41` with 30 copied messages.

Files: `apps/web/src/features/studio/components/message-bubble/AssistantActions.tsx`, `apps/web/src/features/studio/components/message-bubble/AssistantActions.test.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-07-24 16:18] - [FEATURE]

What: Redesigned the dashboard shell: Home|Work sidebar toggle (Inbox/Team/Programs/Brain/More vs Page Grader actions), centered Search ⌘K + AI Chats unit, AI drawer that covers the sidebar menu with in-drawer history + Slack badges, and top-right limited to summary + space expand/collapse.

Why: Align shell UX with ClickUp-style Search/AI Chats; stop using Chat as a sidebar mode; surface Slack-origin threads in history.

Impact: Opening AI Chats hides the HQ menu and docks history+chat on the left. Work menu hosts Page Grader entry points. Fullscreen Home chat unchanged.

Files: `ShellTopBar.tsx`, `ShellMenuChrome.tsx`, `ShellChatDrawer.tsx`, `ShellChatMenu.tsx`, `ShellWorkspace.tsx`, `use-shell-store.ts`, `SidebarHqHubMenu.tsx`, `SidebarHqHubMenuContent.tsx`, `SidebarWorkMenu.tsx`, `SidebarHqRail.tsx`, `manage-rail-items.tsx`, `SpaceConversationRows.tsx`, `apps/web/src/app/globals.css`, `documentation/features/claude-chatgpt-shell.md`

## [2026-07-24 16:25] - [FIX]

What: Made AI Chats always open the left drawer with history (including on Home), restyled the top Search+AI Chats control as a ClickUp-style unified pill, collapsed the HQ sidebar while the drawer is open, and added an idle hint so ⌘K no longer looks broken when empty.

Why: AI Chats was routing Home to full-page `/home?chat=new`; Search idle state looked empty; the center control needed a nested AI Chats pill.

Impact: AI Chats / pen dock chat beside the current page with history on the left. Search still needs typing to fetch — idle copy explains that. Next.js HMR `Failed to fetch` is unrelated to search API.

Files: `ShellTopBar.tsx`, `ShellWorkspace.tsx`, `ShellChatMenu.tsx`, `Sidebar.tsx`, `StudioSearchModal.tsx`, `studio-search-messages.config.ts`, `apps/web/src/app/globals.css`, related tests

## [2026-07-24 16:31] - [FIX]

What: Aligned chat creation output contracts for funnels, websites, and async videos; added an empty-baseline capability drift guard across schemas, registries, policies, and agent docs; and verified output cards open canonical in-app destinations.

Why: Video generation returned `job_id` while its status schema required `operation_id`, completed polls omitted the saved media id, funnel fallback cards were missing, and website results could be labeled or opened through the wrong artifact route.

Impact: Agents can poll generated videos with the returned job id, completed videos open in Space Media, funnels retain an openable fallback card, and websites open as Websites while sharing funnel storage. Focused backend and web tests cover the execution, result, render, and open paths.

Files: `artifact-action-additional-schemas.ts`, `artifact-legacy-media-status.service.ts`, `artifact-funnels.service.ts`, `ui-block-extractor.ts`, `FinalOutputCards.test.tsx`, `useArtifactsController.ts`, `artifact-type-to-space-view-type.ts`, creation-output drift tests/report, `documentation/features/website-artifacts.md`, `documentation/features/document-intelligence.md`

## [2026-07-24 16:39] - [FEATURE]

What: Added organization-scoped People attachments to every shared Chat composer and changed Fathom webhook routing to create one canonical Meetings item when multiple personal/organization routes match. Person references now fail closed when the selected identity cannot be resolved inside the active organization, and client-supplied Brain identifiers are never trusted. Prepared a guarded cleanup migration for the known duplicate meeting.

Why: Users need to reference portal teammates and Slack-only people directly in ordinary ROAS chats so agents can use the correct User or Person Brain. A single Fathom call was also being materialized in two Spaces even though its 867 transcript rows were only timestamped speaker segments of one transcript.

Impact: Home, Space, and agent chats can attach a validated person from the `@` or plus menu. The backend resolves the person through the active organization and supplies the correct Brain context; unresolved, cross-organization, or spoofed references contribute no context. Future Fathom calls choose one canonical route, with organization Meetings preferred on an equal match; the exact historical duplicate can be removed separately by deploying the guarded migration.

Files: `apps/web/src/features/studio/components/ChatInput/*`, `apps/web/src/features/studio/types/index.ts`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.logic.ts`, `apps/api/src/modules/entity-search/*`, `apps/api/src/modules/spaces/services/space-automation-service-06.base.ts`, `apps/agent-api/src/modules/chat/*`, `supabase/migrations/20260724235500_dedupe_canonical_fathom_meeting.sql`, `documentation/features/claude-chatgpt-shell.md`, `documentation/features/meeting-follow-up-slack.md`

## [2026-07-24 20:41] - [FIX]

What: Corrected the Fly runtime image to package the tracked HR system-agent template instead of an ignored local workspace directory, and committed the OpenClaw lockfile used by frozen production installs.

Why: Exact-commit production builds could not find `docker/agents/hr` and could not reproduce OpenClaw dependencies because its lockfile was ignored, so Pixel's otherwise verified release failed before the runtime image was created.

Impact: Clean releases no longer depend on developer-local ignored files, the HR runtime workspace is built from the repository's canonical template, and OpenClaw's frozen install is reproducible.

Files: `docker/Dockerfile`, `apps/openclaw/pnpm-lock.yaml`

## [2026-07-24 16:39] - [FEATURE]

What: Added full static-ad production to Paid Ads Production with ten selectable formats, one-to-ten output quantities, feed/Story sizing, campaign/research copy or exact copy, Media uploads, explicit real/generated person sourcing, and one shared mission path for UI and chat. Seeded the complete Static Ad Book skill with all references, templates, examples, and deterministic HTML-to-PNG renderer for Lux and Vibey. Registered both static-ad and the existing IG organic video launchers as executable mission-worker playbooks.

Why: Ads Production could launch the prior video form but the worker did not recognize that playbook, and there was no complete static workflow capable of turning selected frameworks, copy, and client imagery into an exact number of finished assets from either the UI or an agent conversation.

Impact: Users can choose Static ads or Video ads, request 1-10 client-ready static outputs, attach approved people/products/proof, and have Lux create visually verified image Deliverables in Space Media. Vibey can invoke the same Static Ad Book conversationally. Focused web, API, agent-api, and mission-worker tests pass; the supplied renderer produced and passed visual QA on a real 1080x1350 PNG.

Files: `apps/web/src/features/spaces/components/ads-research/*StaticAd*`, `apps/web/src/features/spaces/components/ads-research/AdsResearchProductionView.tsx`, `apps/web/src/features/spaces/components/playbooks/static-ad-production*`, `apps/web/src/features/spaces/config/static-ad-formats.config.ts`, `apps/mission-worker/src/modules/missions/playbooks/*ad-production*`, `apps/mission-worker/src/modules/missions/playbooks/ig-organic-video-ad.playbook.ts`, `apps/mission-worker/src/modules/missions/services/phases/mission-plan-phase.service.ts`, `apps/api/src/modules/missions/services/webinar-fulfillment-team.service.ts`, `apps/agent-api/src/modules/agent-sync/services/static-ad-book-skill-contract.test.ts`, `supabase/migrations/20260724143000_static_ad_book_skill.sql`, `documentation/features/social-research.md`

## [2026-07-24 21:21] - [FEATURE]

What: ClickUp Brain–inspired empty mini-chat — capability scroller under agency/agent hero (seeds composer; clear restores chips), Find/Research/Create… action pills above the input, Ask/create/search placeholder, and removed the redundant “New chat” header title.

Why: Docked empty chat lagged ClickUp’s discoverability and still showed a useless New chat label.

Impact: Empty conversations guide users into prompts without leaving the drawer; capability chips (what) stay distinct from action pills (how).

Files: `SpaceChatAgentEmptyState.tsx`, `SpaceVibeyChatPanel.tsx`, `ShellEmptyChat*.tsx`, `shell-empty-chat-prompts.config.ts`, `ChatInput` `onComposerValueChange`, web+website `globals.css`, `claude-chatgpt-shell.md`, tests

## [2026-07-24 21:26] - [STYLE]

What: Redesigned AI Chats peek (left-aligned overflow, chevron, stays as toggle), full-width New under history Search, Cursor-style relative ages on chat rows, X to close the drawer, tightened history search, and removed chat names from the top bar.

Why: Peek/history chrome felt sparse and ClickUp/Cursor-inspired density was clearer for scanning recency and starting chats.

Impact: Collapsed rail peeks AI Chats from the left; history is denser and more scannable; closing chat is an X or the peek toggle.

Files: `ShellAiChatsButton.tsx`, `SidebarHqRail.tsx`, `SpaceConversationsHeader.tsx`, `SpaceConversationRows.tsx`, `SpaceChatHeaderActions.tsx`, `ShellTopBar.tsx`, `format-compact-relative-time.ts`, web+website `globals.css`, docs/tests

## [2026-07-24 23:08] - [FIX]

What: Completed the release verification fixes for the AI Chats, Programs sidebar, and shared chat surfaces by removing a stale shell route import and updating test fixtures and mocks to match the current team-roster and Programs contracts.

Why: The implementation type-checked, but focused tests still referenced the pre-cache Programs API and an incomplete roster entry, which would block packaging the remaining WIP as one clean release.

Impact: Web and API type-checks pass, the Fathom routing tests pass, and all 69 focused web tests for the changed shell, conversation, Brain, and chat surfaces pass.

Files: `ShellChatMenu.tsx`, `SpaceChatAgentEmptyState.test.tsx`, `SidebarHqSection.test.tsx`, `SidebarHqSpacesGroupedList.test.tsx`

## [2026-07-24 20:55] - [FIX]

What: Restored the missing workspace-route policy import used when deleting the currently selected shell conversation and made the fork-action mock preserve its component prop contract during type checking.

Why: The web production build correctly rejected a reference to `isShellWorkspaceRoute` that was not imported into `ShellChatMenu`.

Impact: The shell preserves its intended post-delete navigation behavior, the fork regression remains type-safe, and the web release can complete type checking.

Files: `apps/web/src/components/shell/ShellChatMenu.tsx`, `apps/web/src/features/studio/components/message-bubble/AssistantActions.test.tsx`
