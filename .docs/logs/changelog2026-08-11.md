# Changelog - August 11, 2026

## [2026-08-11 00:25] - [FIX]

What: Moved Vercel automation cron ingress into a standalone function that imports neither Nest nor BullMQ/Redis, then forwards to the authenticated scheduler execution endpoint.

Why: The cron-origin invocation initialized the monolith's unreachable Railway-private Redis socket and reset Supabase connections after Pixel's schedule claim.

Impact: Scheduled execution enters through a dependency-free function and runs through the already-verified normal serverless path. Compare-and-swap claims, inline fallback, run logging, quiet hours, allowlists, cadence, and caps remain unchanged.

Files: `apps/api/api/space-automation-cron.ts`, standalone function/config tests, `apps/api/vercel.json`, scheduler controller cleanup, documentation.

## [2026-08-11 00:40] - [FIX]

What: Replaced the standalone cron ingress's Express type dependency with its minimal request/response contract.

Why: Vercel successfully emitted the function but reported non-fatal Express declaration diagnostics while compiling it.

Impact: The isolated cron function remains behaviorally identical and now compiles without function-local TypeScript diagnostics.

Files: `apps/api/api/space-automation-cron.ts`, `apps/api/src/space-automation-cron-function.test.ts`.

## [2026-08-11 07:15] - [FEATURE]

What: Added a one-time near-context-limit notification to interactive OpenClaw replies when 10% or at most 32,000 tokens remain.

Why: Pixel should give Dylan the same early warning Viktor provides before a long conversation reaches its context ceiling.

Impact: The warning uses only fresh final-call usage, is suppressed for heartbeats and completed compactions, deduplicates per compaction cycle, and rearms after compaction or session reset. Automatic compaction remains unchanged.

Files: OpenClaw context-warning helper/tests, reply runner, session state, chat stream recovery documentation.

## [2026-08-11 15:57] - [FEATURE]

What: Replaced the mistaken conversation-context warning with Pixel Slack DMs at 70%, 90%, and 100% of monthly organization credits. Added a five-minute authenticated cron, canonical balance calculation, owner-to-Slack routing, retry-safe monthly threshold claims, and the production dedupe migration.

Why: The requested Viktor parity behavior concerns account credit exhaustion, not an individual conversation's context window.

Impact: Organization owners with mapped internal Slack identities receive each crossed threshold once per billing period. Failed Slack deliveries release their pending claim for retry; the unrelated OpenClaw context notice and state were removed.

Files: Billing credit alert controller/module/repository/service/tests, Vercel cron/function test, `billing_credit_slack_alerts` migration, OpenClaw warning rollback, chat recovery documentation.

## [2026-08-11 16:15] - [FIX]

What: Exported `BillingCreditsRepository` from `BillingModule` and added a module-metadata regression test for the Pixel credit-alert dependency boundary.

Why: The first production invocation revealed that the separately isolated alert module could not inject the repository even though TypeScript compilation passed.

Impact: Nest can now bootstrap the billing-alert worker and the regression test prevents the required Billing module import/export contract from drifting.

Files: `billing.module.ts`, `billing-credit-alerts.module.test.ts`.

## [2026-08-11 16:25] - [FIX]

What: Granted service-role table privileges for the `billing_credit_slack_alerts` dedupe ledger.

Why: The table's RLS policy allowed service-role access, but PostgreSQL still denied inserts because the base table grant was missing.

Impact: The production alert worker can atomically claim, mark, and retry Pixel credit-threshold Slack notifications.

Files: `20260811162500_billing_credit_slack_alerts_service_grant.sql`.

## [2026-08-11 14:05] - [FIX]

What: Hardened unified Page Grader meeting agendas so the mapped ROAS campaign agent receives bounded client Brain, meeting, work, and performance context; preserves operator notes; produces a validated six-section screen-share agenda; and writes one retry-safe Google Docs tab.

Why: The first live agenda looked polished but contained generic placeholders because rich agent HTML was not parsed, the wrong campaign could be used, Page Grader context was incomplete, and a prep could be marked ready before a useful Drive agenda existed.

Impact: Client-facing agendas now require specific evidence and decisions, reject lazy placeholder output and unmapped clients, avoid unrelated meeting leakage, preserve integration mapping across reconnects, and expose failed Drive writes for retry instead of reporting false success.

Files: `page-grader-api.service.ts`, `page-grader-brain-sync.service.ts`, `meetings-precall-agenda-sections.ts`, `meetings-precall-drive-agenda.service.ts`, `meetings-precall-prep.helpers.ts`, `meetings-precall-prep.service.ts`, `meetings-precall-related-context.ts`, focused tests including cross-client context isolation, `documentation/features/page-grader-campaign-brain-sync.md`.

## [2026-08-11 21:07] - [FIX]

What: Added `compile_webinar_launch_bible` to the PromptMode backend plugin `SUPPORTED_ACTIONS` list in `docker/tools/vibey-backend/index.ts`, placed after `get_mission_deliverables` to match the backend DTO ordering.

Why: The action is active and agent-facing everywhere else (backend `VALID_ACTIONS`, artifact capability policy, action registry handler, agent-policy actions/registry, vibey-api action docs) but was missing from the plugin list, so the drift test "keeps PromptMode backend plugin actions aligned with active backend actions" in `apps/agent-api/src/modules/shared/vibey-backend-plugin.test.ts` failed on main.

Impact: Drift test suite is green again (10/10 in `vibey-backend-plugin.test.ts`); PromptMode agents can now invoke `compile_webinar_launch_bible` through the backend plugin as the rest of the action surface already intended.

Files: docker/tools/vibey-backend/index.ts
# Changelog - August 11, 2026

## [2026-08-11 00:25] - [FIX]

What: Moved Vercel automation cron ingress into a standalone function that imports neither Nest nor BullMQ/Redis, then forwards to the authenticated scheduler execution endpoint.

Why: The cron-origin invocation initialized the monolith's unreachable Railway-private Redis socket and reset Supabase connections after Pixel's schedule claim.

Impact: Scheduled execution enters through a dependency-free function and runs through the already-verified normal serverless path. Compare-and-swap claims, inline fallback, run logging, quiet hours, allowlists, cadence, and caps remain unchanged.

Files: `apps/api/api/space-automation-cron.ts`, standalone function/config tests, `apps/api/vercel.json`, scheduler controller cleanup, documentation.

## [2026-08-11 00:40] - [FIX]

What: Replaced the standalone cron ingress's Express type dependency with its minimal request/response contract.

Why: Vercel successfully emitted the function but reported non-fatal Express declaration diagnostics while compiling it.

Impact: The isolated cron function remains behaviorally identical and now compiles without function-local TypeScript diagnostics.

Files: `apps/api/api/space-automation-cron.ts`, `apps/api/src/space-automation-cron-function.test.ts`.

## [2026-08-11 07:15] - [FEATURE]

What: Added a one-time near-context-limit notification to interactive OpenClaw replies when 10% or at most 32,000 tokens remain.

Why: Pixel should give Dylan the same early warning Viktor provides before a long conversation reaches its context ceiling.

Impact: The warning uses only fresh final-call usage, is suppressed for heartbeats and completed compactions, deduplicates per compaction cycle, and rearms after compaction or session reset. Automatic compaction remains unchanged.

Files: OpenClaw context-warning helper/tests, reply runner, session state, chat stream recovery documentation.

## [2026-08-11 15:57] - [FEATURE]

What: Replaced the mistaken conversation-context warning with Pixel Slack DMs at 70%, 90%, and 100% of monthly organization credits. Added a five-minute authenticated cron, canonical balance calculation, owner-to-Slack routing, retry-safe monthly threshold claims, and the production dedupe migration.

Why: The requested Viktor parity behavior concerns account credit exhaustion, not an individual conversation's context window.

Impact: Organization owners with mapped internal Slack identities receive each crossed threshold once per billing period. Failed Slack deliveries release their pending claim for retry; the unrelated OpenClaw context notice and state were removed.

Files: Billing credit alert controller/module/repository/service/tests, Vercel cron/function test, `billing_credit_slack_alerts` migration, OpenClaw warning rollback, chat recovery documentation.

## [2026-08-11 16:15] - [FIX]

What: Exported `BillingCreditsRepository` from `BillingModule` and added a module-metadata regression test for the Pixel credit-alert dependency boundary.

Why: The first production invocation revealed that the separately isolated alert module could not inject the repository even though TypeScript compilation passed.

Impact: Nest can now bootstrap the billing-alert worker and the regression test prevents the required Billing module import/export contract from drifting.

Files: `billing.module.ts`, `billing-credit-alerts.module.test.ts`.

## [2026-08-11 16:25] - [FIX]

What: Granted service-role table privileges for the `billing_credit_slack_alerts` dedupe ledger.

Why: The table's RLS policy allowed service-role access, but PostgreSQL still denied inserts because the base table grant was missing.

Impact: The production alert worker can atomically claim, mark, and retry Pixel credit-threshold Slack notifications.

Files: `20260811162500_billing_credit_slack_alerts_service_grant.sql`.

## [2026-08-11 14:05] - [FIX]

What: Hardened unified Page Grader meeting agendas so the mapped ROAS campaign agent receives bounded client Brain, meeting, work, and performance context; preserves operator notes; produces a validated six-section screen-share agenda; and writes one retry-safe Google Docs tab.

Why: The first live agenda looked polished but contained generic placeholders because rich agent HTML was not parsed, the wrong campaign could be used, Page Grader context was incomplete, and a prep could be marked ready before a useful Drive agenda existed.

Impact: Client-facing agendas now require specific evidence and decisions, reject lazy placeholder output and unmapped clients, avoid unrelated meeting leakage, preserve integration mapping across reconnects, and expose failed Drive writes for retry instead of reporting false success.

Files: `page-grader-api.service.ts`, `page-grader-brain-sync.service.ts`, `meetings-precall-agenda-sections.ts`, `meetings-precall-drive-agenda.service.ts`, `meetings-precall-prep.helpers.ts`, `meetings-precall-prep.service.ts`, `meetings-precall-related-context.ts`, focused tests including cross-client context isolation, `documentation/features/page-grader-campaign-brain-sync.md`.

## [2026-08-11 18:51] - [FIX]

What: Root-cause fix for clarification cards never triggering for Pixel (W5). The `vibey_backend` plugin now always merges its plugin-local actions (`ask_clarification`, `create_chat_plan`, `update_chat_plan`) into the tool enum for agents running under a scoped `ALLOWED_ACTIONS.json` (`withPluginLocalActions`), and the generated vibey-api skill now documents `ask_clarification` (Communication reference section + a "Clarify ambiguous requests with a card" Important Pattern) for all non-flows domains. Added regression tests: plugin enum exposure + local execute for scoped agents, ui-block-extractor message-shape → clarification block (text-envelope, plain record, flow tab suppression), skill-generator docs presence (and flows-domain exclusion), and web `messageContentBlockPartB` clarification block → ClarificationCard render with answer round-trip via sendOrApprove / flow dispatch.

Why: `ask_clarification` executes locally inside the plugin and is not a backend policy action, so agent-sync's policy-derived `ALLOWED_ACTIONS.json` never contained it. Every synced agent workspace (Pixel included) therefore got a tool schema whose action enum excluded it, and the generated SKILL.md never mentioned it — the model had no way to discover or call the action, so the card could never render. Guidance previously existed only in a TOOLS.md on an unmerged UI branch.

Impact: After merge + agent workspace re-sync, Pixel (and every synced agent) can emit `ask_clarification`; studio drawer and full-page chat render the tappable card (same MessageBubble path), and Slack/Telegram degrade to numbered plain text via the existing proxy conversion. Lifecycle/preflight: the action stays classified plugin-local (hard payload validator lives in the plugin); the capability-source drift test now recognizes plugin-local documented actions.

Files: `docker/tools/vibey-backend/index.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/agent-api/src/modules/agent-sync/services/vibey-api-skill-generator.ts`, `apps/agent-api/src/modules/agent-sync/services/vibey-api-skill-generator.test.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-capability-source-drift.test.ts`, `apps/agent-api/src/modules/shared/vibey-backend-plugin.test.ts`, `apps/agent-api/src/modules/shared/ui-block-extractor.test.ts`, `apps/web/src/features/studio/components/message-bubble/MessageContentBlockSwitchPartB.test.tsx`, `.docs/plans/pixel-next-wave-goal-2026-08-11.md`.
# Changelog - August 11, 2026

## [2026-08-11 08:27] - [FIX]

What: Separated campaign pinning from per-user favorites in both sidebar variants, wired campaign removal in the HQ favorites flyout, and added regression coverage for pinned Personal and General campaigns.

Why: System campaigns are pinned by design, but the favorites UI incorrectly treated `isPinned` as `isFavorite`, so removing Personal or General either had no visible effect or toggled the favorite state in the wrong direction.

Impact: Personal and General now appear under Favorites only when explicitly favorited, and Remove from favorites updates and removes them correctly.

Files: `apps/web/src/components/layout/sidebar/SidebarSimpleSection.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqFlyouts.tsx`, `apps/web/src/components/layout/sidebar/SidebarSimpleSection.test.tsx`

## [2026-08-11 08:43] - [FEATURE]

What: Added an authenticated `search_conversations` agent action with title search, summaries, bounded recent-message excerpts, hard schema validation, lifecycle/preflight coverage, policy and MCP exposure, generated Vibey API documentation, runtime guidance, and regression tests.

Why: Pixel could see only the current thread and asked users to reconstruct earlier chats even though the product already stored and displayed their conversation history.

Impact: Authorized agents can now find active conversations in the current user and organization scope before asking for repeated context; results remain read-only and bounded.

Files: `apps/agent-api/src/modules/artifacts/repositories/artifact-conversation-search.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-conversation-search.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-conversation-search.service.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, `apps/agent-api/src/modules/artifacts/dtos/artifact-action.dto.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts`, `apps/agent-api/src/modules/agent-sync/services/vibey-api-skill-generator.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `packages/agent-policy/src/actions.ts`, `packages/agent-policy/src/registry.ts`, `packages/agent-policy/src/mcp-catalog.ts`, `packages/agent-policy/src/action-contracts.ts`, `packages/agent-policy/src/platform-tools-template.ts`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-11 14:25] - [FIX]

What: Added a persistent top-right Show page control to full-screen Home conversations. It restores the most recent work page while preserving the active conversation as the attached chat.

Why: Full-screen chat removed the existing work-area relationship, so the normal restore control disappeared and users had no consistent top-right path back to their page.

Impact: Full-screen chat always shows the page control; it restores the last eligible page when available and remains visibly disabled when no page can be restored.

Files: `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellWorkspace.test.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-11 08:47] - [FIX]

What: Kept the Recents chat history fully scrollable, expanded the Home next-move response from three to twelve actions so its existing See more control can reveal additional suggestions, and defaulted My Tasks to the all-scopes assignment feed.

Why: The suggestion API truncated its response at the same three-item limit used by the collapsed UI, making See more impossible, while My Tasks inherited a personal-only default that excluded organization work assigned to the signed-in user.

Impact: Users can scroll their full recent chat history, reveal additional grounded suggested actions, and see personal plus organization tasks assigned to them when opening My Tasks.

Files: `apps/api/src/modules/home/services/next-moves.service.ts`, `apps/api/src/modules/home/services/next-moves.service.test.ts`, `apps/web/src/features/home/components/HomeFeedScopePicker.tsx`, `apps/web/src/features/home/components/HomeFeedScopePicker.test.tsx`, `apps/web/src/features/home/components/SuggestedNextMoves.test.tsx`

## [2026-08-11 09:20] - [FIX]

What: Made Simple Recents load the signed-in user's conversations across personal and organization scopes, stopped composer agent changes from silently filtering the sidebar, and isolated cached history by scope and agent.

Why: Simple Recents inherited the active composer agent and reused cache keys that did not encode organization scope, so initialization or agent changes could replace current history with an older agent-only list even though every local service used the same database.

Impact: The Simple sidebar now stays on a stable all-chat history unless the user explicitly applies an agent filter, and cached lists cannot leak between personal and organization scopes.

Files: `apps/web/src/components/shell/ShellChatMenu.tsx`, `apps/web/src/components/shell/ShellChatMenu.test.tsx`, `apps/web/src/components/shell/shell-conversation-cache.ts`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-11 13:55] - [FIX]

What: Corrected the unified Google Calendar agenda request to use the provider's required snake-case time and recurrence fields and request the full response payload that contains the event array.

Why: The all-calendars action received `timeMin`/`timeMax` instead of `time_min`/`time_max` and used its compact response default, which omits detailed events. Accepted Google meetings could therefore disappear from Mine and from Team's merged Mine data while Fathom-only rows still rendered.

Impact: Personal Agenda receives the full set of expanded Google Calendar events for the requested window again, including recurring accepted invitations such as the missing 1DS weekly session. Team inherits the corrected Mine feed.

Files: `apps/api/src/modules/integrations/services/integrations-calendar-google-agenda.ts`, `apps/api/src/modules/integrations/services/__tests__/integrations-calendar-google-agenda.test.ts`, `documentation/features/integration-connections.md`

## [2026-08-11 14:48] - [FIX]

What: Routed Simple-sidebar history rows into the canonical full chat from every page, removed the full-chat close action, restored Outputs / Sources / Tasks after closing a chat artifact, made pasted-block comparison strict-safe, repaired affected mocks, and removed six unused Finder/iCloud conflict copies from the Canvas source tree.

Why: History clicks outside Home still opened the legacy drawer, full chat exposed an action that contradicted its permanent workspace role, closing the artifact editor left the summary closed, and stale duplicate source files prevented a clean web type-check.

Impact: Chat now keeps one stable ChatGPT-style workspace: history opens the selected full conversation, the summary appears by default, artifacts replace it in the right card without replacing chat, closing an artifact returns to the summary, and the web project type-checks cleanly.

Files: `apps/web/src/components/shell/ShellChatMenu.tsx`, `apps/web/src/components/shell/ShellChatMenu.test.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellWorkspace.test.tsx`, `apps/web/src/components/shell/ShellRightPanel.test.tsx`, `apps/web/src/features/spaces/components/chat/SpaceChatHeaderActions.tsx`, `apps/web/src/features/spaces/components/chat/SpaceChatHeaderActions.test.tsx`, `apps/web/src/features/composer/pasted-text/use-pasted-text-blocks.ts`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.test.tsx`, `apps/web/src/components/canvas/**/** 2.ts*`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-11 14:58] - [FIX]

What: Kept a top-right Show page control outside every collapsed work surface, gave the Home surface a non-empty history label, and prevented the Home new-chat transition from routing back to the conversation that was active before New Chat.

Why: Simple/left menu layouts hid the only work-area restore control with the page itself, `/home` produced a blank hover row, and the temporary starting route accepted a stale active conversation id before the new conversation was created.

Impact: Full-screen chat always has a visible page restore path, its hover history names Home correctly, and sending from New Chat remains on the newly created conversation instead of reopening an old one.

Files: `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellWorkspace.test.tsx`, `apps/web/src/components/shell/ShellTopBar.tsx`, `apps/web/src/components/shell/ShellTopBar.test.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-11 15:23] - [FIX]

What: Removed the remaining conversation-switch render loops from pasted-block, quick-start, model-preference, draft, and Space-scope synchronization, and treated inaccessible linked meeting conversations as unavailable background context instead of a page-fatal error.

Why: Opening Meetings or a meeting workspace could oscillate between conversation contexts while several composer effects unconditionally mirrored state. React eventually raised Maximum update depth; an inaccessible legacy meeting conversation could then surface as an uncaught permission rejection.

Impact: Meetings now survives conversation-context changes without nested update crashes, composer state only publishes when values actually differ, and a meeting workspace remains available when its optional historical chat cannot be read. The combined shell and meeting regression suite passes 81 tests and the local web runtime type-check passes.

Files: `apps/web/src/features/composer/pasted-text/use-pasted-text-blocks.ts`, `apps/web/src/features/composer/pasted-text/use-pasted-text-blocks.test.tsx`, `apps/web/src/features/studio/store/use-chat-store.ts`, `apps/web/src/components/shell/use-shell-chat-quick-start.ts`, `apps/web/src/components/shell/use-shell-chat-quick-start.test.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-prefs.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-draft.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-draft.test.ts`, `apps/web/src/features/studio/services/conversation-load-errors.ts`, `apps/web/src/features/studio/services/conversation-load-errors.test.ts`, `apps/web/src/features/studio/services/chat.service.ts`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-11 15:52] - [FIX]

What: Made chat viewport and sticky-prompt height synchronization normalize measurements and skip unchanged state writes.

Why: The chat panel's `ResizeObserver` and conversation-change effect could repeatedly publish equivalent or subpixel-different heights while the Meetings page switched chat context, causing another Maximum update depth crash.

Impact: Opening Meetings no longer enters the `SpaceVibeyChatPanel.useEffect.applyHeight` render loop. The focused height and chat regression suite passes 24 tests, ESLint passes, and the local web type-check passes.

Files: `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/observed-height.ts`, `apps/web/src/features/spaces/components/chat/observed-height.test.ts`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-11 17:34] - [FIX]

What: Made meeting conversation creation deterministic and idempotent, and added scoped archival cleanup for older unlinked duplicate meeting chats. Deployed the calendar agenda, Program favorites, and meeting conversation fixes to the production API.

Why: Parallel meeting workspace requests could both observe an empty conversation link, create separate chats, and leave one orphaned duplicate in Recents after the workspace linked the other.

Impact: One meeting now resolves to one active conversation even under concurrent requests. Opening an existing linked meeting archives same-meeting orphan chats without deleting their data. Production `api.roas.io` is serving deployment `dpl_GJocN6nhhfyzoc6HxCHggozVG2Bz`.

Files: `apps/api/src/modules/conversations/repositories/conversations.repository.ts`, `apps/api/src/modules/conversations/repositories/conversations.repository.test.ts`, `apps/api/src/modules/conversations/services/conversations.service.ts`, `apps/api/src/modules/conversations/services/conversations.service.test.ts`, `apps/api/src/modules/meetings/domain/meeting-conversation-id.ts`, `apps/api/src/modules/meetings/domain/meeting-conversation-id.test.ts`, `apps/api/src/modules/meetings/services/meeting-conversation-deduplication.service.ts`, `apps/api/src/modules/meetings/services/meeting-conversation-deduplication.service.test.ts`, `apps/api/src/modules/meetings/services/meeting-workspace.service.ts`, `apps/api/src/modules/meetings/services/meeting-workspace.service.test.ts`, `apps/api/src/modules/meetings/meetings.module.ts`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-11 17:48] - [FIX]

What: Added direct client-contract and Simple-sidebar regression coverage for removing Personal and General Program favorites, including the post-refresh state returned by the API.

Why: The favorites failure persisted in the local flow even after the UI wiring changed, so the test boundary needed to prove both the encoded Program request and the refreshed sidebar state rather than only the initial click.

Impact: The verified local runtime now guards the complete remove-favorite path from the context menu through the Program API and refreshed sidebar list.

Files: `apps/web/src/lib/programs/programs-api.test.ts`, `apps/web/src/components/layout/sidebar/SidebarSimpleSection.test.tsx`

## [2026-08-11 17:51] - [FIX]

What: Synchronized the local runtime mirror with the latest full-chat restore and extracted meeting-workspace implementation while retaining the runtime's newer instant-meeting and agenda controls.

Why: The source workspace and the server's runtime mirror had diverged, so several completed fixes were present on main but absent from the app actually running on port 3000.

Impact: The local app now runs the combined implementation: full-chat page restore, editable meeting titles, recordings and attachments first, distinct prep/recap/notes sections, reopenable and movable action items, pre-call quick actions, and impromptu meeting creation. The hot runtime compiles, focused tests pass, and its web type-check and lint are clean.

Files: `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellTopBar.tsx`, `apps/web/src/features/home/components/MeetingWorkspaceDialog.tsx`, `apps/web/src/features/home/components/MeetingWorkspaceBody.tsx`, `apps/web/src/features/home/components/MeetingActionItemsSection.tsx`, `apps/web/src/features/home/components/MeetingActionMoveMenu.tsx`, `apps/web/src/features/home/components/MeetingRenamableTitle.tsx`, `apps/web/src/features/home/components/MeetingAgendaPrepSection.tsx`, `apps/web/src/features/home/components/MeetingNotesSection.tsx`, `apps/web/src/features/home/components/MeetingPostCallSections.tsx`, `apps/web/src/features/home/components/MeetingCallStatusSection.tsx`, `apps/web/src/features/home/config/meeting-post-call-actions.config.ts`, `apps/web/src/features/home/services/meeting-workspace-api.ts`

## [2026-08-11 17:53] - [STYLE]

What: Moved the shared Deep Search, Task, Image, Slides, Doc, Daily Brief, and Delegate quick actions into the composer overhang, immediately to the right of Choose Space and Plugins, while keeping grounded suggested next moves below the complete composer.

Why: The actions were still rendered above the input even though the requested ChatGPT-style hierarchy placed composer tools inside the lower shelf and smart suggestions beneath it.

Impact: New Chat now has one unified input-plus-shelf container without the detached action row or right-edge overflow, followed by clickable personalized suggestions.

Files: `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.test.tsx`

## [2026-08-11 17:40] - [DOCS]
What: Added mandatory "0. Git workflow" section to AGENTS.md (branch-per-agent, push-before-session-end, no direct main pushes, app-runner-only dev servers, throwaway integration branches, corrupted-checkout tar fallback). Created missing .claude/CLAUDE.md (@../AGENTS.md import) — it was referenced in AGENTS.md's header comment but never existed, so Claude Code sessions were not loading the protocol. Synced both files to the runtime working copy.
Why: 12 parallel agents (Codex + Claude) were leaving work as uncommitted files across divergent working copies; pushes from any one copy silently missed the others' work. 51 unmerged codex/* branches on origin.
Impact: All agents now follow one branch/PR flow; work is always pushed before a session closes.
Files: AGENTS.md, .claude/CLAUDE.md

## [2026-08-11 17:52] - [STYLE]
What: Home composer restyled toward a ChatGPT-like layout — quick-start pills (Deep Search, Task, Image, Slides, Doc, Daily Brief, Delegate) moved to a centered row above the input box, bottom shelf reduced to Choose Space + Plugins. Sidebar Recents/Favorites section headers unified (shared uppercase section-label typography, hover-revealed trailing chevron). Profile-row unread-updates dot repositioned onto the avatar corner with a "New updates available" tooltip. Conversation-row hover tooltip now shows a formatted "Last activity …" timestamp instead of the raw ISO string.
Why: The empty-chat composer felt cluttered with action pills inside the shelf row; sidebar section headers had mismatched styles; the purple profile dot and raw ISO tooltip read as bugs.
Impact: Cleaner first-run composer, consistent sidebar section headers, self-explanatory update indicator, human-readable recents tooltips.
Files: apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx, apps/web/src/components/layout/sidebar/SidebarSimpleSection.tsx, apps/web/src/components/layout/sidebar/SidebarSimpleRecents.tsx, apps/web/src/components/layout/AvatarDropdown.tsx, apps/web/src/components/conversations/SpaceConversationRows.tsx

## [2026-08-11 18:00] - [FIX]

What: Restored the repository contracts required by the local Mode C API for instant meeting creation and daily automation-liveness claims.

Why: The accumulated local WIP retained callers for both operations while their service/repository methods were missing, preventing the platform API from compiling and starting locally.

Impact: The local platform API compiles and serves on port 3001 while preserving the surrounding meeting and automation WIP.

Files: `apps/api/src/modules/meetings/services/meeting-workspace.service.ts`, `apps/api/src/modules/spaces/repositories/space-automations.repository.ts`

## [2026-08-11 17:57] - [FIX]

What: Removed the outer dashboard Suspense fallback's placeholder top bar and added a loading-state regression test.

Why: The fallback could render its placeholder header at the same time as the nested workspace rendered the real route header, producing two identical top bars during initial page load.

Impact: The workspace is now the sole owner of route chrome during loading, so Inbox and other dashboard routes render one top bar from the first visible frame. The shell regression suite passes 30 tests, and the local web type-check and focused lint are clean.

Files: `apps/web/src/app/(dashboard)/dashboard-frame.client.tsx`, `apps/web/src/app/(dashboard)/dashboard-frame.client.test.tsx`

## [2026-08-11 18:20] - [FIX]

What: Canonicalized Mine and Team meeting rows: Mine now loads caller-owned calendar connections only, calendar invites retain their live join URL when enriched by Fathom, same-minute duplicate Fathom recordings with the same meeting identity collapse, and only the next unfinished calendar invite can expand as the Agenda hero.

Why: Organization-shared teammate connections leaked into Mine, Fathom recording URLs could be presented as live meeting links, duplicate recording rows could survive with generated titles, and a no-upcoming fallback expanded the first past recording.

Impact: Mine and Team have clear ownership boundaries, live calls and recordings use the correct actions, repeated 1DS recordings collapse, and past recordings remain compact instead of appearing as the next call.

Files: `apps/api/src/modules/integrations/services/integrations-calendar-connections.ts`, `apps/api/src/modules/integrations/services/integrations-calendar-dedupe.ts`, `apps/api/src/modules/integrations/services/integrations-calendar.service.ts`, `apps/api/src/modules/integrations/services/__tests__/integrations-calendar-connections.test.ts`, `apps/api/src/modules/integrations/services/__tests__/integrations-calendar-dedupe.test.ts`, `apps/web/src/features/home/components/AgendaCard.tsx`, `apps/web/src/features/home/components/AgendaCardListBody.tsx`, `apps/web/src/features/home/components/AgendaCardEventEntry.tsx`, `apps/web/src/features/home/lib/agenda-list-view.ts`, `apps/web/src/features/home/lib/agenda-list-view.test.ts`, `documentation/features/integration-connections.md`
# Changelog - [August 11, 2026]

## [2026-08-11 18:50] - [FEATURE]

What: Added the "+ Create" entry point to the Outputs/right rail. The rail header now has a "+" button opening the same grouped create catalog as the composer plus-menu (shared panel moved to `components/shell/ShellCreateMenuPanel.tsx`). Picking an item seeds the global chat composer without sending via `seedComposer({seedMode:'attach'})`, and a new optional `quickStartId` on `GlobalChatSeedDetail` lets the chat panel arm the matching quick-start capability chip (new `armQuickStart` on the quick-start hook, applied in `SpaceVibeyChatPanel`'s attach path) — so the item's systemContext still targets the exact create action even when creation starts from the rail. Space-scoped rails pass their spaceId in the seed workContext so the right panel consumes it.

Why: Second entry point from the approved create-menu plan — create from the rail, same chat-routed flow, no systemContext loss.

Impact: Rail "+" → dropdown → composer pre-filled with prompt + armed chip. Config gains `findShellCreateMenuItem`; new test file pins item resolution, unique ids, and that every active item has a prompt + QUICK ACTION context.

Files: apps/web/src/components/shell/ShellCreateMenuPanel.tsx (moved from ChatInput/chat-input-plus-menu-create-panel.tsx), ShellRightPanel.tsx, shell-create-menu.config.ts (+ new .test.ts), use-shell-chat-quick-start.ts, components/global-chat/store/use-global-chat-store.ts, features/studio/components/ChatInput/chat-input-plus-menu-view.tsx, features/spaces/components/chat/SpaceVibeyChatPanel.tsx.

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
# Changelog - [August 11, 2026]

## [2026-08-11 20:30] - [FEATURE]

What: Video create-type P1 — Video quick-start above the empty chat composer with a triage systemContext (single clip via generate_video, produced organic story ad via create_mission with the ig-organic-video-ad playbook kickoff gathered in-chat, script via create_docx); generate_video now accepts and persists space_id on media_generation_jobs so the finished asset registers in Space Media even when polling has no request context; the video-only Media view keeps a generation composer (video mode seeding generate_video instead of hiding entirely); Outputs rail shows a video icon for video rows.

Why: Dylan locked the video workstream decisions: one Video entry that triages in chat, playbook functionality absorbed into the chat flow (no modal handoff), and Space Media as the destination — previously generate_video output could land with space_id null and stay invisible in Space Media, the video-only filter removed the only generation affordance, and video rows in the rail rendered a generic file icon.

Impact: Users can start any video flavor from the empty chat quick starts; agent-generated videos reliably land in the current space's media library; the video-only Media view can seed video generation with aspect control and first-frame reference; rail rows are recognizable as video.

Files: apps/web/src/components/shell/shell-empty-chat-prompts.config.ts, apps/web/src/components/shell/ShellEmptyChatPrompts.test.tsx, apps/web/src/components/shell/ShellRightPanelFiles.tsx, apps/web/src/components/media/MediaGenerateComposer.tsx, apps/web/src/features/spaces/views/media/media-view-presentation.ts, apps/web/src/features/spaces/views/media/media-view-presentation.test.ts, apps/web/src/features/spaces/views/media/SpaceMediaView.tsx, apps/agent-api/src/modules/artifacts/services/artifact-action-additional-schemas.ts, apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-generate.service.ts, apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-generate.service.test.ts, apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-jobs.service.ts, apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-status.service.ts, apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-status.service.test.ts, apps/agent-api/src/modules/artifacts/repositories/artifact-media-jobs.repository.ts, apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts, supabase/migrations/20260811210000_media_generation_jobs_space_id.sql
