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

## [2026-07-28 10:47] - [FIX]

What: Team agenda keeps **Mine** on shared invites (`Mine · teammate`). Meeting card no longer duplicates guests under the title; Join sits left of a copyable full link; More details expands downward at fixed width and shows calendars + event description.

Why: Shared Team rows dropped Mine so Team looked teammate-only. The quick card widened on expand and repeated people as both account labels and guests.

Impact: Team reads as mine + team. Meeting popup stays narrow, guests list name+email once, and join links are copyable.

Files: `integrations-calendar-dedupe.ts`, `HomeMeetingDetailHost.tsx`, calendar description plumbing (Workspace/Google/Outlook), tests, `integration-connections.md`.
## [2026-07-28 12:55] - [FEATURE]

What: Added Workspace | Portal surface toggle that embeds Page Grader via short-lived SSO session.
Why: Keep ROAS as the primary shell while letting internal users work in Portal without a second login.
Impact: Authenticated ROAS users with matching Portal internal accounts can open Clients/Campaigns/Launches/Performance inside the shell.
Files: apps/api/.../page-grader-embed.controller.ts, page-grader-meeting.controller.ts, page-grader integration/API/module/dto, apps/web shell Portal surface + TopBar/Workspace, globals.css (web+website)

## [2026-07-28 13:03] - [ARCH]

What: Added the first-class meeting workspace storage foundation, deterministic multi-recording reconciliation, full-fidelity Fathom source normalization, safely rendered transcript deliverables, and an ingestion service that idempotently persists provider recordings and exact provider action items.

Why: The existing pipeline equates one Fathom recording with one meeting, truncates transcript text on the call item, and immediately sends broad AI task suggestions into Space subtasks. A canonical meeting needs many recording sources and auditable provider evidence before recap, task, live-chat, and continuity features can be correct.

Impact: The backend now has tested contracts for a two-minute pre-call plus a main call, short-call-only handling, primary recording selection, complete per-recording transcript documents, provider action source keys, meeting context links, snippets, live workspace state, and future next-meeting continuity. Webhook cutover remains pending until durable retry/reconciliation replaces the current external-event completion boundary.

Files: `supabase/migrations/20260728200000_meeting_workspace_foundation.sql`, `apps/api/src/modules/meetings/domain/meeting-recording-reconciliation.ts`, `apps/api/src/modules/meetings/providers/fathom-meeting-source.ts`, `apps/api/src/modules/meetings/repositories/meeting-workspace.repository.ts`, `apps/api/src/modules/meetings/services/meeting-source-ingestion.service.ts`, and focused tests.

## [2026-07-28 13:29] - [FEATURE]

What: Cut Fathom webhooks over to durable meeting-source reconciliation; added retryable event claims, multi-recording transcript deliverables, canonical assignee identity, typed Space/contact/campaign context, unified provider recaps, exact provider actions, legacy-call backfill, meeting workspace APIs, live notes/snippets, prior-commitment continuity, and a curated meeting UI with persistent meeting-scoped AI chat.

Why: A short pre-call and main call could become separate meeting tasks, provider action items were mixed with excessive generated tasks, assignee names varied between processors, and calendar prep/live notes/chat/transcripts/recap/next-meeting continuity had no shared meeting lifecycle.

Impact: One meeting can now own every matching Fathom recording without losing individual transcripts. New and migrated default Fathom flows no longer invent task suggestions or duplicate AI recap documents. Users can start a call, keep notes and snippets, work exact actions, inspect all deliverables, and chat with AI in one meeting-specific surface.

Files: `supabase/migrations/20260728200000_meeting_workspace_foundation.sql`, `apps/api/src/modules/meetings/**`, Fathom webhook/repository/service wiring, Personal Dashboard Fathom template, `MeetingWorkspaceDialog.tsx`, meeting workspace API client, shared meeting chat selection, Home meeting detail integration, focused tests, and `documentation/features/meeting-follow-up-slack.md`.

## [2026-07-28 13:37] - [FEATURE]

What: Added a private Delegation Desk Space template, Pixel's database-backed delegation skill, and a task-list bulk Delegate action with Batch, Review first, and Urgent modes. Multiple selected tasks are captured as one source-linked intake batch instead of being assigned individually.

Why: Brain dumps and bulk-selected work need filtering, consolidation, duplicate checks, and human-readable briefs before they reach teammates, managed agents, or The ROAS Portal.

Impact: Pixel can process private raw intake into concise Delegation Packets. Review modes stop before dispatch; urgent mode can route in the same run after required checks. Durable source fingerprints and destination receipts prevent duplicate or unconfirmed assignments.

Files: `space-template-catalog-delegation-desk.ts`, Delegation Desk catalog and provisioning tests, `delegation-intake.service.ts`, `DelegationBulkPanel.tsx`, bulk action wiring, delegation message config, Pixel `delegation-desk` skill, migrations `20260728203000` and `20260728203100`, and Spaces/Page Grader feature documentation.

## [2026-07-28 13:46] - [FIX]

What: Completed the meeting lifecycle and Agenda entrypoint by moving Fathom ingestion through processing to complete, preserving completed status when reopening the persistent meeting chat, preventing post-call call-link relaunches, and routing linked Fathom Agenda rows into the curated meeting detail instead of the generic task card.

Why: Completed recordings could otherwise look like live calls, and the existing Fathom-specific Agenda branch bypassed the new meeting workspace entirely.

Impact: Recorded and upcoming calls now share the same meeting-first entry flow. Post-call users continue the existing meeting conversation without falsely restarting the call, while new calls still use Start call and Rejoin call states.

Files: `apps/api/src/modules/meetings/repositories/meeting-workspace.repository.ts`, `apps/api/src/modules/meetings/services/meeting-source-ingestion.service.ts`, `apps/api/src/modules/meetings/services/meeting-workspace.service.ts`, `apps/web/src/features/home/components/AgendaCard.tsx`, `apps/web/src/features/home/components/MeetingWorkspaceDialog.tsx`, `apps/web/src/features/home/lib/agenda-open-routing.ts`, and focused tests.

## [2026-07-28 13:55] - [PERF]

What: Split Auto chat into a low-cost GPT-5.6 Terra research/tool stage and one bounded, tool-free Claude Opus 5 writing stage. Added generation-level provider identifiers, token/cache/cost telemetry, and settlement-aware completion accounting.

Why: Opus 5 was repeatedly receiving full tool-loop context and workspace history, producing several large provider generations for a single visible answer while legacy completion accounting collapsed the run into one opaque charge.

Impact: Retrieval, tool execution, and evidence reduction stay on the cheaper model; Opus receives only a compact evidence packet and writes once. Every provider generation is now attributable by stage and cost, and a generation already recorded by provider settlement cannot be charged again by legacy completion accounting.

Files: `packages/api-shared/src/services/model-strategy.ts`, `packages/api-shared/src/services/model-strategy.test.ts`, `packages/api-shared/src/index.ts`, `apps/agent-api/src/modules/chat/services/chat-auto-pipeline.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.test.ts`, `apps/agent-api/src/modules/chat/services/openclaw-completed-generation.ts`, `apps/agent-api/src/modules/chat/services/openclaw-stream-lifecycle.service.ts`, `apps/agent-api/src/modules/chat/services/openclaw-stream-lifecycle.service.test.ts`, `apps/agent-api/src/modules/chat/services/openclaw-gateway-request.service.ts`, `apps/agent-api/src/modules/chat/services/openclaw-gateway-request.service.test.ts`, `apps/agent-api/src/modules/chat/services/openclaw-proxy.types.ts`, `apps/agent-api/src/modules/chat/services/chat-completion-side-effects.service.ts`, `apps/agent-api/src/modules/chat/services/chat-completion-side-effects.service.test.ts`, and `documentation/features/chat-stream-recovery.md`.

## [2026-07-28 18:56] - [FIX]

What: Aligned production model capability tiers with every context window emitted by Auto chat routing and added an authenticated, cursor-paginated Fathom transcript repair path that reuses canonical meeting ingestion.

Why: Persistent meeting chat could select an Opus context tier rejected by the runtime registry, while 53 historical Fathom recording rows created before transcript persistence had no complete transcript deliverable.

Impact: Meeting chat now completes and persists in production. Historical transcripts can be repaired in bounded pages without duplicate meetings, recaps, provider actions, or AI-generated task floods; unavailable recordings cannot block older pages.

Files: `supabase/migrations/20260728204000_align_model_strategy_context_tiers.sql`, `apps/agent-api/src/modules/chat/services/model-strategy-capability-contract.test.ts`, `apps/api/src/modules/integrations/fathom/controllers/fathom-meetings.controller.ts`, `apps/api/src/modules/integrations/fathom/fathom.module.ts`, `apps/api/src/modules/integrations/fathom/services/fathom-meeting-workspace-backfill.service.ts`, `apps/api/src/modules/integrations/fathom/services/fathom-meeting-workspace-backfill.service.test.ts`, `apps/api/src/modules/meetings/repositories/meeting-recording-backfill.repository.ts`, `apps/api/src/modules/meetings/meetings.module.ts`, and `documentation/features/meeting-follow-up-slack.md`.
