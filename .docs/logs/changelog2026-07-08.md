# Changelog - July 08, 2026

## [2026-07-08 06:25] - [ARCH]

What: Ship ROAS production bundle to main — Fly runtime deploy docs/script fix, OpenClaw config, ROAS migrations/scripts, free onboarding billing path, agent onboarding HR seed fix, Vercel api workspace packaging, web flows/spaces fixes.
Why: Runtime chat fix was live-only; API/web onboarding and deploy tooling were uncommitted; repo must match production and trigger Vercel redeploys.
Impact: Push to main redeploys roas-api/roas-web; Fly redeploy via `bash scripts/roas/deploy-fly-runtimes.sh`; migration order + resilient runner committed for ROAS Supabase.
Files: `docker/*`, `scripts/roas/*`, `apps/api/*`, `apps/web/*`, `supabase/migrations/*`, `.dockerignore`, `.gitignore`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 06:35] - [FIX]

What: Hotfix roas-api Vercel runtime — restore `file:` workspace dep rewrite in `vercel-build.sh` and use `Express` type from `express` in `api/index.ts`.
Why: Commit `9758c81e` deploy built but `/api` returned `FUNCTION_INVOCATION_FAILED` (serverless could not resolve workspace packages without `file:` materialization).
Impact: Redeploy roas-api should restore `api.roas.io` health.
Files: `apps/api/scripts/vercel-build.sh`, `apps/api/api/index.ts`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 13:05] - [FIX]

What: Hotfix ROAS web navigation and home composer — Spaces rail navigates to `/spaces`; home send clears `sending` in `finally` so retries work; global chat seed/conversation fixes prepared (panel stays mounted when collapsed, home dashboard seeds accepted).
Why: Home composer appeared dead after first send; Spaces sidebar only toggled flyout; side chat conversation clicks no-op when chat panel was unmounted while collapsed.
Impact: Production deploy restores home→spaces send and Spaces navigation; global chat WIP remains local until next bundle.
Files: `apps/web/src/app/(dashboard)/home/page.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqRail.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/chat/containers/GlobalChatLayout.tsx`, `apps/web/src/features/chat/containers/GlobalChatPanel.tsx`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 07:38] - [FIX]

What: Stopped generic `Service unavailable` chat failures from being classified as model-busy errors while preserving explicit provider overload and rate-limit handling.
Why: Users could see “The model is busy” even after switching models when the real failure was runtime or gateway availability.
Impact: Chat send errors now point users toward temporary assistant/runtime unavailability instead of blaming the selected model for generic 503-style failures.
Files: `apps/agent-api/src/modules/chat/chat-stream-errors.ts`, `apps/agent-api/src/modules/chat/chat-stream-errors.test.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-recovery.service.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-recovery.service.test.ts`, `apps/web/src/lib/chat/chat-stream-errors.config.ts`, `apps/web/src/lib/chat/chat-stream-errors.config.test.ts`, `apps/web/src/features/studio/config/chat-stream-errors.config.test.ts`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 10:10] - [FIX]

What: Stabilized local web dev — default `dev` script uses turbopack on `127.0.0.1:3000`; added `optimizePackageImports` for icon packages; hardened middleware auth timeout and dev session fallback after login.
Why: Webpack `/home` compiles blocked the dev server for 10+ minutes after sign-in; Turbopack cache corruption and Edge auth races caused ChunkLoadError and login redirect loops.
Impact: Local `pnpm --filter @vibey/web dev` loads `/login` in ~9s cold / ~40ms warm; first authenticated `/home` still takes ~30–90s to compile once — wait through it. Use `dev:webpack` only if turbopack misbehaves (clear `.next` first).
Files: `apps/web/package.json`, `apps/web/next.config.js`, `apps/web/src/middleware.ts`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 11:10] - [FIX]

What: Added `suppressHydrationWarning` on root `<body>` in web layout.
Why: ClickUp Chrome extension injects `clickup-chrome-ext_installed` onto `<body>` before React hydrates, causing console hydration mismatch noise on every page load.
Impact: Dev console no longer reports false-positive body className hydration errors when ClickUp (or similar) extensions are installed.
Files: `apps/web/src/app/layout.tsx`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 11:14] - [FIX]

What: Added missing `useGlobalChatStore` import to `HomeDashboardV4Composer`.
Why: Home dashboard composer referenced the store without importing it, crashing `/home` with `ReferenceError: useGlobalChatStore is not defined`.
Impact: Home page loads after login instead of throwing on the dashboard composer.
Files: `apps/web/src/features/home/components/dashboard-v4/HomeDashboardV4Composer.tsx`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 11:44] - [FIX]

What: Disabled Turbopack filesystem dev cache and restarted local web dev after clearing `.next`; removed dev `getSession` fallback from middleware.
Why: Long-running turbopack sessions were spending 1–6+ minutes on cache compaction/writes, blocking `/home` and even `/login`; middleware session fallback added extra auth work per request.
Impact: Local dev should stay responsive longer; first compile after restart is slower but requests should not stall for minutes mid-session.
Files: `apps/web/next.config.js`, `apps/web/src/middleware.ts`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 07:53] - [FIX]

What: Preserved locally streamed assistant content during the post-stream backend message refresh when the backend assistant row is empty or has not appeared yet.
Why: OpenAI subscription responses could visibly stream in and then disappear when the final refresh returned a lagging canonical message list.
Impact: The chat bubble now stays visible after completion while the backend catches up, then canonical messages still replace it once available.
Files: `apps/web/src/features/studio/services/chat.service.ts`, `apps/web/src/features/studio/services/chat-message-merge.test.ts`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 07:45] - [FIX]

What: Added a development-only session fallback for web middleware and dashboard layout auth checks, swallowed late timeout rejections from slow Supabase auth calls, and bounded the optional feature-updates API route to a quick empty response when auth/backend fetches stall.
Why: Local login could succeed but still look stuck or bounce back because protected routes treated a slow/failed verified Supabase auth fetch as “not logged in”; the background updates route could also hang for minutes and make the local app feel frozen.
Impact: In local development, an existing browser session keeps authenticated dashboard routes usable while remote auth verification is temporarily slow; optional feature updates no longer hold the shell open when upstream calls are unhealthy. Production keeps the stricter verified-user route-guard behavior.
Files: `apps/web/src/middleware.ts`, `apps/web/src/middleware.test.ts`, `apps/web/src/app/(dashboard)/layout.tsx`, `apps/web/src/app/api/feature-updates/route.ts`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 09:47] - [FEATURE]

What: Prepared the designer agent for product UI component design by adding explicit role authority, registering a `ui-component-design` runtime skill, adding the skill/reference files, documenting it, and seeding the skill through a migration.
Why: The designer agent needs a reusable workflow for working through modals, panels, forms, navigation, states, responsiveness, and component reviews instead of only asset/page design.
Impact: Designer missions can route UI component work through a dedicated design process and existing environments can seed the skill into `agent_skills`.
Files: `docker/agents/templates/designer/ROLE.md`, `docker/openclaw.json`, `docker/agents/templates/designer/skills/ui-component-design/SKILL.md`, `docker/agents/templates/designer/skills/ui-component-design/references/component-design-system.md`, `supabase/migrations/20260708094500_designer_ui_component_design_skill.sql`, `documentation/features/missions.md`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 09:58] - [FEATURE]

What: Made light mode the platform default across web, website, docs, admin, and the Chrome extension. Added an app theme boot script with a new storage key so existing users pick up light unless they explicitly choose dark in Appearance settings.
Why: Light mode is fully ready and should be the default experience for new and existing users, while still allowing a personal override in settings.
Impact: Product UI, marketing site, docs, admin, shared pages, and embedded form previews now default to light. Users who want dark can still toggle it in Appearance (web) or the site theme control (website).
Files: `apps/web/src/app/root-providers.tsx`, `apps/web/src/app/layout.tsx`, `apps/web/src/components/AppThemeBootScript.tsx`, `apps/web/src/lib/theme/app-theme.ts`, `apps/web/src/lib/theme/app-theme.test.ts`, `apps/web/src/app/shared/layout.tsx`, `apps/website/src/components/WebsiteThemeProvider.tsx`, `apps/website/src/components/WebsiteThemeBootScript.tsx`, `apps/docs/src/components/ThemeProvider.tsx`, `apps/admin/src/app/layout.tsx`, `apps/chrome-extension/sidepanel.html`, `apps/chrome-extension/popup.html`, `apps/web/src/features/spaces/components/artifacts/form/FormSettingsColorsSection.tsx`, `apps/web/src/features/spaces/components/artifacts/form/FormPreviewTab.tsx`, `apps/funnels/src/components/forms/FormRenderer.tsx`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 10:12] - [FEATURE]

What: Rebuilt the home dashboard to match Vibey Dashboard v4 — hero glow/grid backdrop, centered 880px column, Space Grotesk greeting, chip-based composer (+ / Approval / Template / Space / Model, voice, send), template fan synced with the Template chip, 6s recommendation carousel, and v4 card grid with customize toggles. Wired real data through existing home cards, feeds, and send-to-space flow.
Why: Ship the hi-fi mockup as the production home screen while preserving composer attachments, space routing, card customization/reorder, credit banner, mission modals, and API-backed card content.
Impact: `/home` now uses the v4 layout and styling; default visible cards match the mockup (6 cards, org_pulse available via Customize); recommendation strip rotates every 6s.
Files: `apps/web/src/app/globals.css`, `apps/web/src/app/(dashboard)/home/page.tsx`, `apps/web/src/app/(dashboard)/home/layout.tsx`, `apps/web/src/features/home/components/dashboard-v4/*`, `apps/web/src/features/home/components/HomeCardsGrid.tsx`, `apps/web/src/features/home/components/HomeListCardShell.tsx`, `apps/web/src/features/home/components/DailyRecommendationStrip.tsx`, `apps/web/src/features/home/config/home-cards.config.ts`, `apps/web/src/features/home/config/home-dashboard-v4.config.ts`, `apps/web/src/features/home/context/home-dashboard-visual-context.tsx`, `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-shell.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-home-v4-footer.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input.types.ts`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 11:10] - [FEATURE]

What: Shipped the global unified chat rail in the dashboard shell — persistent agent chat between the HQ sidebar and main content across Home, Team, Brain, Spaces, Flows, and channels. Removed embedded Team/Brain/Flows side chats; added work-context composer footer, route recommendations, unified conversation list mode, Team sidebar Chat entry, and home composer seeding via global store.
Why: Replace three parallel chat implementations with one rail that survives navigation and supports capability-filtered agents per work surface.
Impact: Chat no longer lives inside feature pages; Home/Spaces/Team composers open or seed the global rail. Human DMs on `/team?dm=` hide the rail. Legacy `home_seed` Spaces URL handoff remains as fallback.
Files: `apps/web/src/app/(dashboard)/layout.tsx`, `apps/web/src/app/(dashboard)/dashboard-shell.tsx`, `apps/web/src/features/chat/**`, `apps/web/src/features/spaces/containers/SpacesContainer.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/home/components/dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/features/team-2/containers/Team2Container.tsx`, `apps/web/src/features/brain/containers/BrainHome.tsx`, `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/features/flows/containers/FlowsPage.tsx`, `apps/web/src/features/settings/components/settings-content/SkillsPageContent.tsx`, `apps/web/src/app/(dashboard)/home/channels/[id]/page.tsx`, `apps/web/src/components/layout/sidebar/SidebarTeam2Flyout.tsx`, `documentation/features/spaces-automation.md`, `documentation/features/flows-custom-workflows-v2-plan.md`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 11:28] - [STYLE]

What: Rethemed Home dashboard v4 for light mode by remapping all `--hd4-*` scoped variables to platform design tokens (`--color-background`, `--color-card`, `--color-primary`, `--chart-glass-label-purple`, etc.) instead of hardcoded dark hex values.
Why: The v4 home screen always rendered with a dark palette (`#161616` background) regardless of the user's theme preference.
Impact: `/home` v4 shell, hero glow/grid, composer, template fan, recommendation banner, card shells, and menus now follow light and dark theme automatically.
Files: `apps/web/src/app/globals.css`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 11:42] - [REFACTOR]

What: Moved the global chat rail's expand control into the HQ sidebar as a "Chat" toggle above Home, removed the collapsed 48px chat rail (deleted `SpaceVibeyChatRail`), and made the Team/Spaces/Brain/Flows rail items open the chat rail when clicked.
Why: The collapsed chat rail took a persistent column between the sidebar and content; the expand affordance belongs in the left menu, and navigating to a working surface should surface its agent chat.
Impact: When collapsed the chat column is fully hidden on desktop; the sidebar Chat button toggles it (active state when open); clicking Team/Spaces/Brain/Flows navigates and expands the rail. Home does not auto-open chat. Mobile chat/page toggle unchanged.
Files: `apps/web/src/features/chat/containers/GlobalChatLayout.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqRail.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatRail.tsx` (deleted), `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 11:47] - [STYLE]

What: Redesigned global chat Work context picker to use portaled floating menus matching the composer model picker (fixed positioning, hover space submenu, model-style trigger pill). Unified voice input and live conversation into one composer control with hover menu to set the default action, keyboard shortcut hints, and per-space localStorage persistence.
Why: The Work: General dropdown was clipped inside the composer footer; separate voice buttons were crowded and did not remember a default mode per space.
Impact: Work/space context menus render outside the chat box without clipping; one voice button runs the saved default (input or live) and hover reveals the mode switcher; ⌘D/⌘S shortcuts unchanged.
Files: `apps/web/src/features/chat/components/GlobalChatComposerFooter.tsx`, `apps/web/src/features/chat/components/use-global-chat-work-context-menu.ts`, `apps/web/src/features/studio/components/ChatInput/chat-input-voice-send-controls.tsx`, `apps/web/src/features/studio/components/ChatInput/composer-voice-mode.ts`, `apps/web/src/features/studio/components/ChatInput/chat-input-home-v4-footer.tsx`, `apps/web/src/features/studio/components/ChatInput.tsx`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 11:52] - [FIX]

What: Fixed Home dashboard v4 scroll by completing the flex height chain from the dashboard shell through `HomeShell`, the home layout font wrapper, and `HomeDashboardV4Shell` (`flex-1 min-h-0 overflow-y-auto`).
Why: The v4 shell had `overflow-y-auto` but no bounded height — the layout font wrapper did not participate in flex sizing, so content grew past the viewport and was clipped instead of scrolling.
Impact: `/home` now scrolls through greeting, composer, template fan, recommendations, and all home cards (favorite spaces, conversations, etc.) when content exceeds the viewport.
Files: `apps/web/src/app/(dashboard)/home/layout.tsx`, `apps/web/src/app/(dashboard)/home/home-dashboard-content.tsx`, `apps/web/src/features/home/components/dashboard-v4/HomeDashboardV4Shell.tsx`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 12:49] - [REFACTOR]

What: Replaced Home dashboard v4 mock composer chips (model presets, approval, space) with the real ChatInput footer: full model picker (Auto, Cortex Max, subscription models), plus-menu Access/Integrations/Skills, and a new Space submenu in the plus menu; removed `chat-input-home-v4-footer.tsx` and mock preset config.
Why: The v4 home composer was built from a mockup with simplified controls that did not match the space chat box behavior or wire to real model/access systems.
Impact: Home composer now uses the same plus menu and model picker as side chat; space target is under Plus → Space; approval/action policy is under Plus → Access; templates remain in the fan above the composer only.
Files: `apps/web/src/features/home/components/dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-plus-menu-view.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-plus-menu-space-panel.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input.types.ts`, `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-home-v4-footer.tsx` (deleted), `apps/web/src/features/home/config/home-dashboard-v4.config.ts`, `apps/web/src/app/globals.css`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 12:15] - [FIX]

What: Split `/home` and dashboard shell compile cost — lazy-load `Sidebar`, `GlobalChatLayout`, and the full home dashboard body as separate client chunks so the initial authenticated `/home` route compiles a thin shell first.
Why: Local dev `/home` was blocking for minutes because every dashboard request eagerly compiled Sidebar + global chat + home composer/cards in one pass.
Impact: After login, `/home` should paint a skeleton quickly while sidebar, chat rail, and home content load in parallel; warm reloads stay fast.
Files: `apps/web/src/app/(dashboard)/layout.tsx`, `apps/web/src/app/(dashboard)/dashboard-shell.tsx`, `apps/web/src/app/(dashboard)/dashboard-sidebar.client.tsx`, `apps/web/src/app/(dashboard)/home/page.tsx`, `apps/web/src/app/(dashboard)/home/home-dashboard-content.tsx`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 12:40] - [REFACTOR]

What: Moved sidebar credits breakdown into the profile avatar dropdown — plan, balance, rollover/monthly/add-on split, Add credits, and View usage now live at the top of the avatar menu; removed separate `SidebarCreditsHover` from HQ rail, mobile drawer, and studio footer.
Why: Credits updates belonged in the same profile popup space instead of a second sidebar control.
Impact: Click profile pic → credits summary + settings in one menu; sidebar footer is avatar-only.
Files: `apps/web/src/components/layout/CreditsSummarySection.tsx`, `apps/web/src/components/layout/AvatarDropdown.tsx`, `apps/web/src/components/layout/sidebar/SidebarStudioFooter.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqRail.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqMobileDrawer.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqSection.test.tsx`, `apps/web/src/lib/billing/billing-api.ts`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 12:52] - [REFACTOR]

What: Removed redundant Chat entry from Team sidebar flyout; restored slide in/out animation on HQ flyout panels (Team, Spaces, Brain, Projects) using translate + opacity instead of width collapse.
Why: Conversation search/history is already in the main Chat tab; flyout panels felt abrupt without the previous slide transition.
Impact: Team flyout opens directly to Manage Agents, Skills, DMs, and People; sidebar panels slide slightly from the rail on open and slide back on close.
Files: `apps/web/src/components/layout/sidebar/SidebarTeam2Flyout.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqFlyouts.tsx`, `.docs/logs/changelog2026-07-08.md`
