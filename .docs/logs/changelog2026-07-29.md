# Changelog - July 29, 2026

## [2026-07-29 12:58] - [FIX]

What: Added a durable run-status probe when a chat stream keeps receiving heartbeat bytes but stops delivering structured agent events. Completed or failed runs now enter the existing reconciliation flow, while genuinely active runs remain connected. Added regression coverage for heartbeat-only completed and active runs plus stream closure before a terminal event.

Why: A production chat completed and persisted its 2,605-character answer, but the live browser connection stopped after context/tool events. Heartbeats kept the old stall detector satisfied, so the saved answer did not appear until refresh.

Impact: Stalled live delivery now self-recovers after 60 seconds without requiring a page refresh or a manual “continue” message, while long-running active work is not aborted solely because its heartbeat stream is quiet between structured events.

Files: `apps/web/src/features/studio/services/stream-resilience.ts`, `apps/web/src/features/studio/services/stream-resilience.test.ts`, `apps/web/src/features/studio/services/chat-stream-interruption.test.ts`, `documentation/features/chat-stream-recovery.md`

## [2026-07-29 12:40] - [FIX]

What: Allowed the scheduled meeting workspace resolver to accept timezone-offset calendar timestamps and normalize them to UTC before persistence.

Why: Google Calendar returns valid ISO 8601 values such as `2026-07-29T11:00:00-07:00`, while the resolver only accepted UTC `Z` timestamps and displayed `Invalid datetime` when a future agenda meeting was opened.

Impact: Agenda meetings with explicit timezone offsets now open their curated workspace and connected chat, while stored meeting dates remain canonical UTC values for reliable later Fathom reconciliation.

Files: `apps/api/src/modules/meetings/controllers/meeting-workspace-resolution.controller.ts`, `apps/api/src/modules/meetings/controllers/meeting-workspace-resolution.controller.test.ts`, `documentation/features/meeting-follow-up-slack.md`.

## [2026-07-29 12:22] - [FEATURE]

What: Added one prioritized activity indicator to shared chat-history rows: amber for unresolved user action, animated purple while the agent is working, blue for unread assistant activity, and no indicator once read or idle. Added per-user conversation read timestamps and automatic read marking on selection.

Why: Background chat progress, completed unread results, and conversations waiting on the user were not visible from the left chat list.

Impact: All shell, Space, Team, and full-page chat lists that use the shared conversation list now expose the same activity state without duplicate green/blue meanings. Existing conversations are backfilled as read during migration.

Files: `apps/web/src/components/conversations/`, `apps/web/src/lib/conversations/`, `apps/api/src/modules/conversations/`, `supabase/migrations/20260729123000_conversation_activity_states.sql`, `documentation/features/claude-chatgpt-shell.md`

## [2026-07-29 12:11] - [FIX]

What: Removed the unsupported API TypeScript path mapping that made Vercel recompile `@vibey/api-shared` source after the Nest build.

Why: The frontend deployed the scheduled-meeting resolver while the backend deployment failed during Vercel's function compilation, leaving production on an older API without `POST /spaces/:spaceId/meetings/resolve`.

Impact: The backend can deploy its prebuilt Nest output and compiled shared package consistently, allowing the meeting workspace resolver and persistent meeting chat flow to reach production.

Files: `apps/api/tsconfig.json`.

## 2026-07-29 12:05 - [FIX]

What: Closed public sign-ups for now — `/register` redirects to login, API `POST /auth/register` rejects new accounts, Sign up CTAs removed/retargeted to login, marketing register links point to login, and AuthModal is login-only.

Why: Public registration needed to be blocked temporarily while keeping invite-based onboarding (`/invite`, `/join`, org invite tokens) available.

Impact: New users cannot create accounts via public register UI or API. Existing users can still sign in. Reopen by setting `NEXT_PUBLIC_WAITLIST_MODE=false` and redeploying.

Files: `apps/web/src/middleware.ts`, `apps/web/src/app/(auth)/register/page.tsx`, `apps/web/src/app/shared/layout.tsx`, `apps/web/src/features/spaces/components/shared/RestrictedViewPlaceholder.tsx`, `apps/web/src/features/public-agent/components/common/ConversionBar.tsx`, `apps/api/src/modules/auth/services/auth.service.ts`, `apps/api/src/modules/auth/config/auth-errors.config.ts`, `apps/website/src/components/*`, `apps/web/e2e/*`, env templates

## 2026-07-29 10:25 - [FEATURE]

What: Made every agenda call open the curated meeting workspace directly, added scheduled workspace creation/reuse for future calendar calls, connected the workspace to the existing main shell chat, and placed live notes and call snippets into that same conversation timeline.

Why: Past calls were hidden behind an intermediate detail modal, future calls had no canonical workspace until Fathom arrived, and meeting details previously rendered a second isolated chat instead of using the app's main chat.

Impact: A future meeting now keeps one identity from agenda prep through the live call and post-call Fathom processing. Opening its workspace automatically opens the meeting's conversation in the existing left chat, notes and snippets remain typed meeting records while also appearing in that conversation, and later Fathom recordings can reconcile onto the scheduled workspace.

Files:

- `apps/api/src/modules/meetings/`
- `apps/web/src/features/home/`
- `apps/web/src/components/global-chat/`
- `apps/web/src/app/(dashboard)/home/`
- `documentation/features/meeting-follow-up-slack.md`

## 2026-07-29 12:18 - [FIX]

What: Made Quick Missions reuse an attached chat campaign and Space, added a searchable Campaign → Space fallback, changed Tasks / Files / Sources into an in-flow third chat column, and restored generated-image cards to the shared viewer.

Why: Scoped chats were asking for context they already had, the fallback was difficult to search, the work summary overlaid chat, and a Space media listener consumed image-open events before the persistent viewer could handle them.

Impact: Quick production starts from the correct linked Space, unscoped launches remain easy to target, chat and work content resize without overlap, and generated image cards open their actual asset viewer.

Files: `apps/web/src/features/spaces/components/playbooks/`, `apps/web/src/components/shell/`, `apps/web/src/features/spaces/hooks/use-space-open-media-event.ts`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `documentation/features/missions.md`, `documentation/features/claude-chatgpt-shell.md`

## 2026-07-29 13:00 - [FIX]

What: Removed the collapsed chat-history rail, replaced it with a labeled History + right-arrow restore action inside the chat column, moved the Campaign & Space panel close action into a dedicated top-right header position, and made pinned user messages mouse- and keyboard-operable controls.

Why: The collapsed history left unnecessary dead space, the work-summary close action looked attached to Sources, and the pinned user message appeared interactive without exposing reliable control semantics.

Impact: Collapsing history now gives all of its width back to chat, restoring it is obvious, the summary panel has a conventional close location, and the pinned message can be expanded or edited consistently.

Files: `apps/web/src/components/shell/ShellChatDrawer.tsx`, `apps/web/src/components/shell/ShellRightPanel.tsx`, `apps/web/src/features/studio/components/message-bubble/UserMessageBubble.tsx`, their focused tests, both product globals files, `documentation/features/claude-chatgpt-shell.md`

## 2026-07-29 13:12 - [FIX]

What: Replaced the large in-chat campaign save form with a compact dismissible suggestion that opens the existing Campaign & Space picker in the right summary panel.

Why: The old form duplicated the canonical scope picker, consumed too much chat space, and appeared even when the conversation or visible screen had already linked campaign context.

Impact: Unscoped chats get one lightweight guide into the established workflow, while campaign- or Space-linked chats no longer receive a redundant prompt.

Files: `apps/web/src/components/global-chat/components/ChatCampaignBrainNudge.tsx`, `apps/web/src/components/global-chat/config/work-context.config.ts`, `apps/web/src/components/shell/ShellRightPanel.tsx`, `apps/web/src/components/shell/use-shell-store.ts`, focused tests, `documentation/features/claude-chatgpt-shell.md`

## [2026-07-29 13:18] - [FIX]

What: Persisted AI Chat visibility, minimized state, and the selected conversation in the shared shell preferences.

Why: The drawer state existed only in page memory, so navigation remounts and browser refreshes returned users to a closed chat instead of their prior workspace.

Impact: Open chats now remain open on the same conversation across page changes and refreshes. Explicit minimize remains restorable, while explicit close still clears the conversation.

Files: `apps/web/src/components/shell/use-shell-store.ts`, `apps/web/src/components/shell/use-shell-store.test.ts`, `documentation/features/claude-chatgpt-shell.md`

## 2026-07-29 13:25 - [STYLE]

What: Removed AI Usage from the shared main-menu More flyout.

Why: AI Usage should no longer be presented as a primary navigation option.

Impact: The option is absent from both main-menu presentations, while the admin usage page remains available by direct URL.

Files: `apps/web/src/components/layout/sidebar/SidebarHqMoreFlyoutBody.tsx`

## [2026-07-29 13:46] - [FIX]

What: Replaced Agenda meeting dismissal with a persisted minimize and restore interaction. Minimized meetings remain in the calendar as compact rows with struck-through times and titles plus a clear minimized state.

Why: The previous X action removed meetings from every Agenda view, which made it look like the calendar item had been deleted instead of temporarily collapsed.

Impact: Users can reduce meeting clutter without losing calendar context, restore any minimized occurrence, and keep that choice across refreshes. Previously hidden occurrences migrate into the new minimized state.

Files: `apps/web/src/features/home/components/AgendaCard.tsx`, `apps/web/src/features/home/components/AgendaCardListBody.tsx`, `apps/web/src/features/home/components/AgendaCardEventEntry.tsx`, `apps/web/src/features/home/components/AgendaMinimizedEventEntry.tsx`, `apps/web/src/features/home/hooks/use-agenda-card-data.ts`, `apps/web/src/features/home/lib/agenda-minimize.ts`, focused tests, and Agenda message cleanup.

## [2026-07-29 14:03] - [FEATURE]

What: Added a pre-generation Static Ad Production gate in chat that uses the existing clickable, numbered clarification UI for the same three production types shown in the Builder, followed by staged family and format choices for Static Ad Book.

Why: Conversational ad generation could interpret a generic “yes” as permission to choose a layout and render immediately, preventing the user from selecting a better production type or format.

Impact: Builder selections remain authoritative, explicit chat choices skip redundant questions, and ambiguous chat requests must select a production direction before any image or deterministic static-ad render begins.

Files: `apps/web/src/components/chat/ClarificationCard.test.tsx`, `supabase/migrations/20260729173000_static_ad_chat_selection_gate.sql`, `scripts/roas/migration-order.txt`, `documentation/features/missions.md`

## [2026-07-29 14:04] - [FEATURE]

What: Added image markup mode to the shared artifact viewer with pen and pin tools, per-mark feedback, undo/clear controls, and location-aware edit instructions.

Why: Image feedback such as removing an object or fixing clipped text needs an exact visual target instead of relying on whole-image prose.

Impact: Users can mark the precise image area, describe each requested change, and create a non-destructive edited version through the existing image-generation and history flow.

Files: `apps/web/src/components/media/MediaImageMarkupCanvas.tsx`, `apps/web/src/components/media/media-image-markup.ts`, `apps/web/src/components/media/index.ts`, `apps/web/src/features/studio/components/preview/ShellMediaArtifactViewer.tsx`, `apps/web/src/features/studio/components/preview/ShellMediaImageActions.tsx`, focused tests, `documentation/features/claude-chatgpt-shell.md`

## [2026-07-29 13:16] - [FEATURE]

What: Reframed Delegation Desk packets as a private work queue of individual work items and optional multi-item work groups, added explicit holding-tank and delegation lifecycle views, and routed generated task cards into the existing right-side task detail panel instead of navigating away from the current screen.

Why: A packet did not clearly communicate what was created or where it lived, and task cards opened through generic Space navigation rather than the canonical task dock.

Impact: Promises, action items, and suggested work can remain unassigned and even unmapped while they are organized, given deadlines, grouped into subtasks, and later delegated. Opening a generated task preserves the current page and exposes the normal task detail experience on the right.

Files: `apps/api/src/modules/space-templates/data/space-template-catalog-delegation-desk.ts`, `apps/web/src/components/artifacts/artifact-inline-preview-card/`, `apps/web/src/components/shell/ShellTaskArtifactViewerAdapter.tsx`, `apps/web/src/features/spaces/services/delegation-intake.service.ts`, `apps/web/src/features/studio/components/`, `docker/agents/vibey/skills/delegation-desk/SKILL.md`, `supabase/migrations/20260729170000_upgrade_delegation_desk_work_queue.sql`, `scripts/roas/migration-order.txt`, `documentation/features/spaces-automation.md`, `documentation/features/page-grader-mcp-bridge.md`, `documentation/frontend-shared-surfaces.md`

## [2026-07-29 14:08] - [FEATURE]

What: Added Delegation Desk as a permanent Home menu destination immediately below My Tasks, and extracted a shared open-or-create service used by both navigation and bulk delegation intake.

Why: The full delegation holding tank existed only after the first bulk delegation action, leaving no stable place to review, organize, and dispatch outstanding work.

Impact: Every organization can open its complete private Delegation Desk directly. The first visit provisions it once; later visits reuse the same desk and preserve its holding-tank, review, deadline, and delegation views.

Files: `apps/web/src/components/layout/sidebar/SidebarHomeFlyout.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqFlyouts.tsx`, `apps/web/src/features/spaces/services/delegation-desk.service.ts`, `apps/web/src/features/spaces/services/delegation-intake.service.ts`, focused tests, delegation messages, `documentation/features/spaces-automation.md`

## [2026-07-29 14:58] - [STYLE]

What: Explicitly left-aligned the Delegation Desk button label in the Home flyout.

Why: Browser button alignment centered the label even though the leading icon aligned with the other Home menu rows.

Impact: The Delegation Desk icon and label now align consistently with every other Home destination.

Files: `apps/web/src/components/layout/sidebar/SidebarHomeFlyout.tsx`, `apps/web/src/components/layout/sidebar/SidebarHomeFlyout.test.tsx`

## [2026-07-29 15:42] - [FEATURE]

What: Added Delegator as a protected system agent dedicated to delegation, installed its database-backed Delegation Desk skill and runtime identity, routed Delegation Desk intake to it, and retained Pixel's existing delegation capability.

Why: Delegation was available only as one of Pixel's broad capabilities, so there was no focused agent surface where every conversation defaults to intake clarification, human-first owner resolution, safe dispatch, and receipt-backed tracking.

Impact: The ROAS organization gets a visible Delegator agent that can be opened directly from Team → Agents or the chat selector. Delegator owns Desk processing with narrow read/context and task permissions, while campaign mutation, Brain writes, skill editing, and unapproved external actions remain blocked. New organizations also receive the protected agent during core-agent provisioning.

Files: `docker/agents/templates/delegator/`, `supabase/migrations/20260729174500_seed_delegator_system_agent.sql`, `scripts/seed-system-agents.ts`, `packages/agent-policy/src/`, `apps/agent-api/src/modules/`, `apps/api/src/modules/org/services/org.service.ts`, `apps/api/src/modules/agent-teams/services/agent-policy-action-decision.service.ts`, `apps/api/src/modules/missions/lib/system-agent-keys.ts`, `apps/api/src/modules/space-templates/data/`, `apps/web/src/lib/agents/`, `documentation/features/spaces-automation.md`, `.docs/plans/agent-follow-up-work.md, `scripts/arch/loc-allowlist.json`

## [2026-07-29 16:10] - [FIX]

What: Fixed Delegator production seed to install for every org that already has Pixel, replace system definition rows safely, and remove the hardcoded non-ROAS org id.

Why: The first seed used an ON CONFLICT target that could not collapse NULL-org definition rows and targeted an org UUID that does not exist in ROAS production, so Team → Agents never received an org-scoped Delegator.

Impact: ROAS now has exactly one active org Delegator with five definition files and Delegation Desk skill; future applies are idempotent.

Files: `supabase/migrations/20260729174500_seed_delegator_system_agent.sql`, `supabase/migrations/20260729180000_repair_delegator_org_seed_and_defs.sql`, `scripts/roas/migration-order.txt`

## [2026-07-29 18:02] - [FIX]

What: Replaced the Fathom-only call-kind helper with one canonical meeting classifier, applied it to scheduled calendar creation and Fathom attachment, marked human edits as authoritative, and upgraded every Meetings-style Space/template to Personal, Team, Executive, Client, Partner, and Sales.

Why: Legacy organization Meetings spaces were skipped by personal-dashboard-only migrations, calendar calls stored an unsupported `scheduled` value, and recordings attached to an existing meeting bypassed classification.

Impact: Call kinds render with configured colors in the active Meetings space, new calendar and recorded calls classify consistently using organization identity, richer automatic evidence can refresh automatic classifications, and valid manual choices are preserved.

Files: `apps/api/src/modules/meetings/`, `apps/api/src/modules/spaces/services/space-automation-service-06.base.ts`, `apps/api/src/modules/spaces/services/spaces-service-02.base.ts`, `apps/api/src/modules/spaces/services/spaces-service-03.base.ts`, `apps/api/src/modules/space-templates/data/`, `supabase/migrations/20260729203000_durable_meeting_call_kinds.sql`, `scripts/roas/migration-order.txt`, `documentation/features/meeting-follow-up-slack.md`
