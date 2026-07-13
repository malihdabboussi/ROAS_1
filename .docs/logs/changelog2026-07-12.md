
## [2026-07-12 22:51] - [FEATURE]

What: Add always-visible live transcript panel to sidebar voice with mic/speaker activity meters and conversation history.
Why: Users could not tell whether mic, speaker, or permissions were failing when voice showed Listening with no audible feedback.
Impact: Voice UI always shows You/Atlas transcript lines (with placeholders), scrollable turn history from chat messages, and mic input vs speaker output level bars for debugging audio issues without relying on sound alone.
Files: `apps/web/src/features/spaces/components/chat/SpaceVoiceLiveTranscript.tsx`, `apps/web/src/features/spaces/components/chat/space-voice-live-transcript.logic.ts`, `apps/web/src/features/spaces/components/chat/space-voice-live-transcript.logic.test.ts`, `apps/web/src/features/spaces/components/chat/SpaceVoiceSessionView.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/brain/hooks/brain-live-session-audio.ts`, `apps/web/src/features/brain/hooks/use-brain-live-session.ts`


What: Fix Brain live voice WebSocket routing for local dev and make Live conversation start immediately from the composer menu.
Why: Dev server runs on `127.0.0.1`, so the voice hook fell back to `wss://127.0.0.1:3000` (Next.js) instead of agent-api on `:3003`, causing Connection error; the voice mode menu only changed the default without starting a call.
Impact: Live voice connects to agent-api in local dev; choosing Live conversation in the menu launches the call; live-session returns machineId for runtime pinning follow-up; clearer close-code error messages.
Files: `apps/web/src/lib/brain/brain-live-ws-url.ts`, `apps/web/src/lib/brain/brain-live-ws-url.test.ts`, `apps/web/src/features/brain/hooks/use-brain-live-session.ts`, `apps/web/src/features/studio/components/ChatInput/chat-input-voice-send-controls.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-voice-send-controls.test.tsx`, `apps/web/.env.local.example`, `apps/agent-api/src/modules/brain/brain-live-ws-url.ts`, `apps/agent-api/src/modules/brain/brain-live-ws-url.test.ts`, `apps/agent-api/src/modules/brain/controllers/brain-live.controller.ts`, `apps/agent-api/src/modules/public-agent/controllers/public-brain.controller.ts`, `apps/agent-api/src/modules/brain/services/brain-live.service.ts`, `apps/agent-api/src/modules/brain/services/brain-live.types.ts`

## [2026-07-12 22:45] - [FEATURE]

What: Route Brain/Atlas live voice into the left sidebar chat instead of the floating stream overlay, and fix silent live voice sessions.
Why: The full-screen orb over the graph was confusing, slow to feel connected, and could show Listening with no audible reply because browser AudioContexts stayed suspended.
Impact: Brain voice orb on the stream now opens Atlas live voice in the sidebar; live voice resumes audio contexts before mic playback; the sidebar voice panel shows Listening/Speaking labels and live transcripts.
Files: `apps/web/src/components/global-chat/store/use-global-chat-store.ts`, `apps/web/src/features/brain/lib/brain-sidebar-voice.ts`, `apps/web/src/features/brain/lib/brain-sidebar-voice.test.ts`, `apps/web/src/features/brain/hooks/use-brain-visualization-actions.ts`, `apps/web/src/features/brain/hooks/use-brain-visualization-actions.test.tsx`, `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/features/brain/components/BrainVisualizationDock.tsx`, `apps/web/src/features/brain/components/BrainVisualizationModalLayer.tsx`, `apps/web/src/features/brain/components/BrainVisualizationModalLayer.test.tsx`, `apps/web/src/features/brain/hooks/brain-live-session-audio.ts`, `apps/web/src/features/brain/lib/audio-playback.ts`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVoiceSessionView.tsx`


What: Stop chat replies from disappearing into a stuck "Resuming…" state after stream completion.
Why: Post-stream DB merge could treat backend `duration_ms` as "complete" while dropping streamed text, then recovery re-fired on every message update and showed the Resuming orb over an empty turn.
Impact: Streamed assistant text is preserved when the DB row only has completion metadata; recovery no longer loops on content deltas; completed turns clear reconnecting/stream UI immediately.
Files: `apps/web/src/features/studio/lib/chat-turn-completion.ts`, `apps/web/src/features/studio/services/chat.service.ts`, `apps/web/src/features/studio/components/chat/StatusIndicator.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/team-2/components/hr-side-chat/TeamHrSideChatPanel.tsx`, `apps/web/src/lib/chat/studio-chat-runtime-adapter.ts`, `apps/web/src/features/studio/services/chat-stream-interruption.test.ts`

## [2026-07-12 19:40] - [FIX]

What: Fix assistant message persistence after chat streams complete; harden recovery merge when DB rows are empty.
Why: `messages` UPDATE RLS required `user_id = auth.uid()` while assistant rows are conversation-scoped, so agent-api updates silently affected 0 rows; client recovery then overwrote streamed text with empty DB data and stuck on "Resuming…".
Impact: Assistant content is saved via service role after access checks; OpenClaw `result.content` is used when progressive accumulation is empty; recovery upserts no longer downgrade local text; migration restores conversation-based UPDATE/DELETE policies.
Files: `supabase/migrations/20260712193000_fix_messages_update_rls.sql`, `apps/agent-api/src/modules/conversations/repositories/messages.repository.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-completion.service.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-terminal.service.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-stream.service.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-streaming-state.service.ts`, `apps/agent-api/src/modules/chat/services/chat-service-collaborators.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-terminal.service.test.ts`, `apps/web/src/features/studio/services/chat.service.ts`

## [2026-07-12 20:03] - [STYLE]

What: Redesigned the global chat agent recommendation banner — structured headline with interactive agent name, hover/focus slide-in for "Don't show this again", Switch + Dismiss on the right, tightened copy.
Why: The prior layout felt cramped and always showed the opt-out checkbox; production-style polish needed a cleaner hierarchy.
Impact: Hover or focus the agent name (e.g. Jaime) to reveal the persistent dismiss checkbox under the headline; clicking the name also switches agents.
Files: `apps/web/src/components/global-chat/components/ChatSurfaceRecommendation.tsx`, `apps/web/src/components/global-chat/config/work-context.config.ts`, `apps/web/src/app/globals.css`, `.docs/logs/changelog2026-07-12.md`

## [2026-07-12 20:04] - [FIX]

What: Chat sidebar toggles closed when the icon is clicked while open; Home keeps chat collapsed on load/navigation; Chat rail icon moved to the bottom above profile.
Why: Home is a dashboard-only screen; users expected the chat icon to behave as a toggle and sit near account controls.
Impact: Click Chat again to close; visiting `/home` auto-collapses chat (composer send still opens it); sidebar order is Home → sections → Chat → profile.
Files: `apps/web/src/components/layout/sidebar/SidebarHqRail.tsx`, `apps/web/src/components/global-chat/containers/GlobalChatLayout.tsx`, `.docs/logs/changelog2026-07-12.md`

## [2026-07-12 20:06] - [STYLE]

What: Refined agent recommendation banner — body copy only on Jaime/name hover; persistent opt-out moved to a compact chip with text + X (not a main-card checkbox).
Why: Main card felt cluttered; users wanted detail on the name and a subtler permanent-dismiss pattern.
Impact: Default view is headline + Switch/Dismiss; hover the agent name for hiring copy; hover the banner for a small "Don't show this again" chip — click text or X to hide permanently.
Files: `apps/web/src/components/global-chat/components/ChatSurfaceRecommendation.tsx`, `apps/web/src/app/globals.css`, `.docs/logs/changelog2026-07-12.md`

## [2026-07-12 20:10] - [FIX]

What: Removed the mobile Chat/Page top toggle; mobile now drives chat vs page from the shared collapsed state and exposes a "Chat" entry in the mobile side menu (above the profile), matching desktop.
Why: The top toggle duplicated navigation that belongs in the sidebar; Chat was missing from the mobile drawer.
Impact: On mobile, tapping a page nav item shows that page (chat collapsed); tapping Chat in the drawer opens the chat panel. Desktop unchanged.
Files: `apps/web/src/components/global-chat/containers/GlobalChatLayout.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqMobileDrawer.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqSection.test.tsx`, `.docs/logs/changelog2026-07-12.md`

## [2026-07-12 20:11] - [STYLE]

What: Agent recommendation banner — "Don't show this again" only after Dismiss (not hover); body copy spans full card width below Switch/Dismiss.
Why: Hover opt-out was too easy to hit; narrow body column wrapped to three lines.
Impact: Hover agent name for full-width detail; Dismiss swaps to the opt-out chip; text or X permanently hides.
Files: `apps/web/src/components/global-chat/components/ChatSurfaceRecommendation.tsx`, `apps/web/src/app/globals.css`, `.docs/logs/changelog2026-07-12.md`

## [2026-07-12 20:32] - [FIX]

What: Spaces sidebar campaign rows — chevron toggles expand/collapse; campaign name opens `/campaigns/{id}`.
Why: Campaign rows only expanded spaces with no way to open the campaign page from the name click.
Impact: Click "Acme SaaS Retainer" name → campaign dashboard/knowledge; click chevron → show/hide spaces.
Files: `apps/web/src/components/layout/sidebar/SidebarHqSpacesRows.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqSpacesRows.test.tsx`, `.docs/logs/changelog2026-07-12.md`

## [2026-07-12 22:13] - [FEATURE]

What: Agency campaign hub — Overview default tab, Work (missions), Brand & Knowledge (Brain links), Reporting (funnels/email/revenue), tab visibility settings menu; legacy `finance` tab maps to Reporting.
Why: ROAS agency users need a client HQ with spaces, knowledge, and results in one place instead of AutoPilot/Stripe-only tabs.
Impact: `/campaigns/{id}` opens Overview; campaign settings gear toggles visible tabs; knowledge tab links to Campaign Brain and Customer Brain.
Files: `apps/web/src/app/(dashboard)/campaigns/[id]/page.tsx`, `apps/web/src/app/(dashboard)/campaigns/[id]/_lib/campaign-nav-tabs.ts`, `apps/web/src/app/(dashboard)/campaigns/[id]/_lib/campaign-nav-tabs.test.ts`, `apps/web/src/app/(dashboard)/campaigns/[id]/_lib/campaign-reporting-view.ts`, `apps/web/src/app/(dashboard)/campaigns/[id]/_components/CampaignHeader.tsx`, `apps/web/src/app/(dashboard)/campaigns/[id]/_components/CampaignTabSettingsMenu.tsx`, `apps/web/src/app/(dashboard)/campaigns/[id]/_components/tabs/CampaignOverviewTab.tsx`, `apps/web/src/app/(dashboard)/campaigns/[id]/_components/tabs/CampaignReportingTab.tsx`, `apps/web/src/app/(dashboard)/campaigns/[id]/_components/tabs/CampaignKnowledgeTab.tsx`, `.docs/logs/changelog2026-07-12.md`

## [2026-07-12 22:33] - [FIX]

What: Brand & Knowledge tab — Campaign Brain sidebar section, removed top banner; Manage team / Add agents on Overview and Agent Access via Ready Employee Library modal.
Why: Banner copy was confusing; no way to assign agents from campaign hub; Brain access was only a link, not a first-class section.
Impact: Knowledge sidebar has Brand Assets → Campaign Brain → Agent Access; team modal opens from Overview Team and Agent Access headers.
Files: `apps/web/src/app/(dashboard)/campaigns/[id]/page.tsx`, `apps/web/src/app/(dashboard)/campaigns/[id]/_components/tabs/CampaignKnowledgeTab.tsx`, `apps/web/src/app/(dashboard)/campaigns/[id]/_components/tabs/CampaignOverviewTab.tsx`, `.docs/logs/changelog2026-07-12.md`

## [2026-07-12 22:38] - [FEATURE]

What: HQ logo opens a full hub menu — accordion sections for Team, Spaces, Brain, Projects (admin), Flows (admin), Home link, and Chat; mobile hamburger drawer uses the same menu; hover flyouts suppressed while hub menu is open.
Why: Hover-only navigation is fast but hides the full tree; users wanted one place to browse all team/spaces/brain options from the logo.
Impact: Click the Vibey logo to slide open the menu (Esc or X to close); current route section auto-expands; mobile drawer matches desktop structure with campaign-grouped spaces.
Files: `apps/web/src/components/layout/sidebar/SidebarHqHubMenu.tsx`, `SidebarHqHubMenuContent.tsx`, `SidebarHqHubMenuSection.tsx`, `SidebarHqHubMenuSpacesSection.tsx`, `sidebar-hq-hub-menu.types.ts`, `sidebar-hq-hub-menu.utils.ts`, `SidebarHqRail.tsx`, `SidebarHqSection.tsx`, `SidebarHqMobileDrawer.tsx`, `SidebarHqFlyouts.tsx`, `useSidebarController.ts`, `apps/web/src/app/globals.css`, `SidebarHqSection.test.tsx`, `.docs/logs/changelog2026-07-12.md`

## [2026-07-12 22:47] - [STYLE]

What: HQ hub menu is now one unified sidebar — the same card-glass shell expands from the icon rail to include the menu pane; closing animates width back to collapsed.
Why: The floating second panel felt like two sidebars; users wanted a single surface that slides open and closed.
Impact: Logo toggle widens one sidebar (rail + menu in one card); aside width animates 80px ↔ 400px; no separate floating menu card.
Files: `SidebarHqRail.tsx`, `SidebarHqHubMenu.tsx`, `SidebarHqSection.tsx`, `useSidebarController.ts`, `apps/web/src/app/globals.css`, `.docs/logs/changelog2026-07-12.md`

## [2026-07-12 22:50] - [FIX]

What: HQ sidebar toggles between icon rail OR full menu — not both at once; expanded menu includes profile footer.
Why: Expanded state still showed the narrow icon column beside the menu, which felt like two sidebars.
Impact: Collapsed = icons only; expanded = full menu only (328px); crossfade between modes on open/close.
Files: `SidebarHqRail.tsx`, `SidebarHqHubMenu.tsx`, `SidebarHqSection.tsx`, `useSidebarController.ts`, `apps/web/src/app/globals.css`, `.docs/logs/changelog2026-07-12.md`

## [2026-07-12 22:53] - [STYLE]

What: Hub menu uses the same fixed logo header as collapsed rail — removed MENU label, X button, and divider; logo toggles expand/collapse from the same spot.
Why: Expanded header duplicated chrome and broke the mirror effect between collapsed and expanded states.
Impact: Logo stays pinned top-left in both modes; click logo to open or close; Esc still closes expanded menu.
Files: `SidebarHqHubLogoButton.tsx`, `SidebarHqRail.tsx`, `SidebarHqHubMenu.tsx`, `apps/web/src/app/globals.css`, `.docs/logs/changelog2026-07-12.md`

## [2026-07-12 23:03] - [STYLE]

What: HQ hub menu polish — logo shows wordmark when expanded (icon when collapsed, no purple highlight); single outer scroll (removed nested section scrollbars); shared shell footer with Chat + full display name and no divider in expanded/mobile modes.
Why: Expanded menu had duplicate scrollbars, logo looked selected, and footer duplicated Chat with a divider instead of matching collapsed rail layout.
Impact: One scrollbar for the full menu; Brain/Team/Spaces sections scroll with the menu; footer stays pinned with spelled-out name when expanded.
Files: `SidebarHqHubLogoButton.tsx`, `SidebarHqShellFooter.tsx`, `SidebarHqRail.tsx`, `SidebarHqHubMenu.tsx`, `SidebarHqHubMenuContent.tsx`, `SidebarHqMobileDrawer.tsx`, `SidebarHqHubMenuSpacesSection.tsx`, `SidebarTeam2Flyout.tsx`, `apps/web/src/app/globals.css`, `SidebarHqSection.test.tsx`, `.docs/logs/changelog2026-07-12.md`

## [2026-07-12 23:05] - [FIX]

What: Agent recommendation follow-up after Dismiss now shows two text buttons — "Don't show this again" and "Remind me later" — instead of a chip with an ambiguous X.
Why: The X looked like a close control and duplicated the permanent opt-out action, which was confusing.
Impact: Dismiss hides the banner; user picks permanent opt-out or session-only snooze; "Remind me later" hides the prompt until the next visit without persisting dismissal.
Files: `ChatSurfaceRecommendation.tsx`, `apps/web/src/app/globals.css`, `.docs/logs/changelog2026-07-12.md`

## [2026-07-12 23:06] - [FIX]

What: Expanded HQ sidebar footer now lays out the user avatar and name horizontally; active Chat uses the same full-row purple glass treatment as hovered/selected menu items; desktop hub navigation no longer collapses the expanded menu.
Why: The footer name stacked under the avatar, Chat's selected state looked disconnected from the rest of the hub, and navigating from the expanded hub should preserve the menu state.
Impact: Expanded footer reads like one user row, active Chat matches menu highlight styling, and hub links keep the menu open while routing on desktop.
Files: `SidebarHqShellFooter.tsx`, `SidebarHqHubMenu.tsx`, `.docs/logs/changelog2026-07-12.md`

## [2026-07-12 23:11] - [FEATURE]

What: Restored the home composer Template chip next to Auto — synced with the template fan so selecting Social post, Funnel, Design, etc. shows the active template in the chat box footer and opens a picker menu to change or clear it.
Why: The v4 home mock included a Template control in the composer; only the placeholder changed when picking from the fan, so the selected template was invisible inside the chat box.
Impact: Clicking a template card updates both the fan selection and a Template chip beside Auto; the chip menu lists all templates plus Start blank; placeholder text still reflects the active template.
Files: `HomeDashboardTemplateChip.tsx`, `HomeDashboardV4Composer.tsx`, `home-dashboard-content.tsx`, `.docs/logs/changelog2026-07-12.md`

## [2026-07-12 23:07] - [FIX]

What: Repaired ROAS Brain chat retrieval — applied missing cognition search RPCs on production Postgres, dropped ambiguous duplicate function overloads, wired Brain graph scope/stats into Atlas chat system context, and fixed Fly secrets deploy to stage+deploy.
Why: Atlas `search_user_brain` failed on cognition RPC errors while the Brain graph loaded 1,726 memories from the same database; chat had no brain_id or on-screen stats in system context.
Impact: `search_user_brain` returns Dylan hits on local agent-api and `roas-runtimes.fly.dev`; Brain page chat passes active brain_id and memory counts to Atlas.
Files: `supabase/migrations/20260713110000_roas_brain_retrieval_rpc_repair.sql`, `scripts/roas/migration-order.txt`, `scripts/roas/apply-fly-secrets.sh`, `apps/web/src/features/brain/lib/brain-chat-awareness.ts`, `apps/web/src/features/brain/lib/brain-chat-awareness.test.ts`, `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/components/global-chat/lib/global-chat-storage.ts`, `apps/web/src/components/global-chat/containers/GlobalChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `.docs/logs/changelog2026-07-12.md`

## [2026-07-12 23:20] - [ARCH]

What: Ship accumulated ROAS platform changes to production and apply pending Supabase migrations (messages UPDATE/DELETE RLS + brain retrieval RPC repair).
Why: Large local working tree needed to go live across Vercel, Fly runtimes, Railway workers, and Cloudflare apps-proxy with schema aligned.
Impact: Production DB policies/RPCs updated; deploy pipeline triggered from main for app surfaces and agent runtime.
Files: `supabase/migrations/20260712193000_fix_messages_update_rls.sql`, `supabase/migrations/20260713110000_roas_brain_retrieval_rpc_repair.sql`, `scripts/roas/migration-order.txt`, apps/web, apps/api, apps/agent-api, apps/funnels, docker/, workers/apps-proxy

