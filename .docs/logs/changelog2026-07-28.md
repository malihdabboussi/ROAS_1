# Changelog - July 28, 2026

## [2026-07-28 07:50] - [FEATURE]

What: Wired 18 industry-adjacent IG Story CloudFront presets + stills into the scene catalog and skill stock library (Claude-generated Higgsfield assets; scene IDs aligned to delivered names).

Why: Industry packs had prompt seeds only; Production/`reuse_when_available` needed real preset URLs so insurance/RE/coaching/trades/fitness/creator ads avoid lifestyle beach defaults without burning credits.

Impact: All six industry packs show “Clean preset ready”; skill guidance now says industry presets ship and should be reused.

Files: `ig-organic-video-scenes.config.ts`, migration `20260728120000_ig_organic_video_industry_presets.sql`, skill contract test, `social-research.md`.


## [2026-07-28 08:14] - [FIX]

What: Menu dock hold-drag now live-previews the real menu into each candidate home (layout opens the seam while still holding). Top/bottom docks are compact and centered on the work card again (not a full-width blocked rail).

Why: Full-width top strip looked like a separate rail and was not centered; users need to see the menu lock into left/right/top/bottom before release.

Impact: Dragging shows the menu sitting in the target dock immediately; top/bottom read as a centered HQ pill on the page card.

Files: `SidebarHqHubLogoButton.tsx`, `use-shell-menu-dock.ts`, `ShellMenuDockLayout.tsx`, `ShellWorkspace.tsx`, `Sidebar.tsx`, `SidebarHqRail.tsx`, `SidebarHqSection.tsx`, `HubDockFlyout.tsx`, both product `globals.css`, tests, `claude-chatgpt-shell.md`.

## [2026-07-28 10:33] - [FIX]

What: Changed the manual chat `Resume` action to refresh the canonical conversation, stop an orphaned interrupted run, and start one hidden continuation grounded in the exact user request, partial assistant output, and original attachments.

Why: Interrupted queued runs could remain marked active after execution stopped, causing `Resume` to reconnect to the same dead run instead of continuing the unfinished answer.

Impact: Manual recovery now continues the same task from the visible stopping point, including screenshot context, without making the user resend the prompt or attachment.

Files: `StreamInterruptedBar.tsx`, `StreamInterruptedBar.test.tsx`, `chat.service.ts`, `chat-resume-context.ts`, `chat-resume-context.test.ts`, `chat-stream-interruption.test.ts`, `chat-stream-recovery.md`.

## [2026-07-28 11:03] - [FIX]

What: Repaired stopped-chat recovery across the live stream, worker race, refresh, and expired-Redis paths. Bridge interruptions now persist as recoverable runtime failures without releasing the orphan-safety lock; status returns a stable recovery code; partial text without a completion marker is rechecked; and failed continuation attempts keep the `Continue response` control visible.

Why: Visible partial output was treated as complete, pre-agent stream failures were hidden, bridge-error cursors could skip the only recovery event, and failed Resume attempts deleted their own controls. Together these paths made refresh plus another click appear more reliable than the in-place recovery action.

Impact: Standard users get a clear “work is safe” state, can continue the exact unfinished task and attachments without resending, can retry if continuation fails, and recover the same state after refresh without admin knowledge. Context-window recovery remains distinct and compacts before continuing.

Files: `chat-runtime.repository.ts`, `chat-turn-query.service.ts`, `chat-service-collaborators.ts`, `agent-runtime-chat-shadow.processor.ts`, `chat.service.ts`, `StreamInterruptedBar.tsx`, `chat-stream-errors.config.ts`, related tests, `chat-stream-recovery.md`.

## [2026-07-28 11:46] - [FEATURE]

What: Expanded Quick Mission static-ad production into Validate Messaging, qualified image-brief, and multi-format static-ad-book lanes. Added per-format variation counts, per-output exact-copy fields, Write for me defaults, contextual client selection, tokenized dropdowns, and a linked launch receipt in the active chat.

Why: Chat-launched missions did not visibly confirm their start, the current Space/campaign was discarded, native dropdowns rendered inconsistently, and the single-format kickoff could not represent the three approved static-ad production processes.

Impact: A user can launch the correct static-ad workflow from Chat or Missions, inherit the current client context, request one to ten final ads across multiple templates, and see the launched Mission immediately in the conversation. The worker now contracts each production lane on its correct final-image action and exact output count.

Files: `QuickMissionsHubHost.tsx`, `QuickMissionsHubModal.tsx`, `QuickMissionContextFields.tsx`, `StaticAdProductionFields.tsx`, `StartAdProductionPlaybookFields.tsx`, `static-ad-production.ts`, `static-ad-formats.config.ts`, `static-ad-production.playbook.ts`, focused tests, `loc-allowlist.json`, `missions.md`.

## [2026-07-28 10:44] - [FIX]

What: Replaced the native campaign select in the valuable-chat save prompt with a branded searchable picker, clear selected state, an empty-campaign state, and standard app action buttons.

Why: The browser-native select looked disconnected from the app, did not support campaign search, and made selection and saving unclear.

Impact: Users can now search client campaigns by name, confirm the selected campaign, and attach or dismiss the chat through consistent ROAS controls.

Files: `apps/web/src/components/global-chat/components/ChatCampaignBrainNudge.tsx`, `apps/web/src/components/global-chat/components/ChatCampaignPicker.tsx`, `apps/web/src/components/global-chat/components/ChatCampaignPicker.test.tsx`.

## [2026-07-28 11:42] - [FIX]

What: Kept mission task chat sendable while an agent is working, and added on-demand runtime materialization for invoked skills owned by another agent.

Why: The task activity UI incorrectly used embedded composer mode as a working-state flag, which removed its send controls. Chat exposed the account-wide skill catalog, but runtime repair only synchronized the active agent's normal skill set, so cross-agent skill files remained missing and the agent could not start.

Impact: Users can continue sending task context during active mission work. Invoked account-level skills are copied into the active runtime without deleting its existing skills or rewriting its normal skill index.

Files: `TaskActivity.tsx`, `TaskActivity.test.tsx`, agent runtime readiness, required-skill sync/materialization services, orchestration wiring, and focused tests.
