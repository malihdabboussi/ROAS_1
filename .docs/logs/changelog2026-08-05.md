# Changelog - August 05, 2026

## [2026-08-05 14:05] - [FEATURE]

What: Shipped yesterday's Meeting Workspace board UI to production path — shell work area (not old fullscreen modal), single-column Attachments/Action items/Recordings, context chips, and meeting chat open via shared global-chat rail intent (no Home→Spaces store import).
Why: Board work was left in stash when the action-items API shipped; localhost and prod still showed the legacy modal.
Impact: Opening a Home Agenda meeting shows the curated board with left-rail meeting chat. Hard-refresh after `roas-web` deploy.
Files: `MeetingWorkspaceDialog.tsx`, `HomeMeetingDetailHost.tsx`, `MeetingWorkspaceAttachments.tsx`, `MeetingActionItemsSection.tsx`, `MeetingWorkspaceContextLinks.tsx`, `GlobalChatPanel.tsx`, `use-global-chat-store.ts`, related home libs/tests; removed `MeetingContextSidebar` / `MeetingNoteCapture`

## [2026-08-05 14:12] - [FIX]

What: Restored `ConversationScopePicker` `onOpenCampaign` prop so `roas-web` production build typechecks (ShellRightPanel already passed it).
Why: Meeting board PR merged but Vercel web deploy failed on that missing prop (pre-existing mismatch).
Impact: Unblocks `app.roas.io` deploy of the Meeting Workspace board.
Files: `ConversationScopePicker.tsx`, `ConversationScopeTrigger.tsx`, `conversation-scope-picker-layout.ts`, tests

## [2026-08-05 14:16] - [FIX]

What: Fixed MeetingWorkspaceContextLinks TypeScript index error (`id` from split could be undefined).
Why: Blocked `roas-web` production deploy after meeting board merge.
Impact: Unblocks app.roas.io deploy of the shell Meeting Workspace board.
Files: `MeetingWorkspaceContextLinks.tsx`

## [2026-08-05 14:20] - [FIX]

What: Wrapped meeting recordings `onLinked` so hydrate returns void (prod TS).
Why: `roas-web` deploy failed assigning `Promise<MeetingWorkspaceBundle>` to `Promise<void>`.
Impact: Unblocks Meeting Workspace board production deploy.
Files: `MeetingWorkspaceDialog.tsx`

## [2026-08-05 14:26] - [FIX]

What: Added `external_recording_id` to `CalendarAgendaRelatedCall` and completed Agenda minimized-entry test fixture fields.
Why: `roas-web` prod compile failed on meeting Fathom sync after board merge.
Impact: Unblocks Meeting Workspace board deploy to app.roas.io.
Files: `calendar-api.ts`, `AgendaMinimizedEventEntry.test.tsx`

## [2026-08-05 14:28] - [FIX]

What: Added `last_message_at` to studio `Conversation` type used by chat store updates.
Why: Production `roas-web` typecheck fails after chat last-activity wrote that field without updating the studio type.
Impact: Unblocks Meeting Workspace board web deploy.
Files: `apps/web/src/features/studio/types/index.ts`


## [2026-08-05 16:02] - [FIX]

What: Fixed Slack brain import archive coverage failing when period timestamps were ISO strings — hardened `mark_slack_archive_backfilled` to normalize Slack ts, cleaned 25 polluted `archive_oldest_ts` rows, rewrote retry job payloads, and made queue-worker + observation backfill normalize before mark/API calls.
Why: Queue-worker Slack sync enqueued ISO `last_synced_at`/`created_at` values; the RPC short-circuited on NULL and stored ISO, then later casts failed (`invalid input syntax for type numeric`).
Impact: Prod toast `Import failed: Failed to mark Slack archive coverage` unblocked; retry jobs already succeeding after DB repair. Code path still needs API + queue-worker deploy for defense in depth.
Files: `normalize-slack-timestamp.ts` (api + queue-worker), `slack-sync.service.ts`, `slack-observation.service.ts`, `slack-observation.repository.ts`, `brain-import-jobs-enqueue.base.ts`, `20260805230000_normalize_slack_archive_oldest_ts.sql`, tests

## [2026-08-05 17:02] - [OPS]

What: Merged PR #88 and deployed Slack archive timestamp normalize to production — `roas-api` (`dpl_4bscLBybkFouUXESDnewxnxPssWA` → `api.roas.io`) and Railway `queue-worker` (commit status success).
Why: Durable code-path fix for ISO→Slack-ts enqueue/backfill after the earlier prod DB repair.
Impact: New Slack brain sync jobs enqueue numeric period bounds; API backfill/mark also normalize ISO payloads.
Files: Vercel `roas-api`; Railway `roas-workers` / `queue-worker`; PR #88 (`24997360` / merge `923424ba`)
## [2026-08-05 20:08] - [FEATURE]

What: Shipped the stashed Slack Team Intelligence relevance-ranked EOD briefing (wins/decisions/updates/risks/questions), warmer digest voice, and briefing selection caps. Analysis now skips risks/questions that already look handled in-window; unanswered/client_risk still re-check thread replies/✅ before send.
Why: Prod EOD was still the old unanswered/risk alert queue (stash never pushed). Wednesday digests looked like random open threads, including already-handled risks.
Impact: Next Active EOD/digest runs prefer a varied business briefing over an unanswered-message list. Requires `roas-api` deploy.
Files: `slack-team-loop-analysis.ts`, `slack-team-loop-evidence.ts`, `slack-team-loop.service.ts`, `slack-team-signal-delivery.service.ts`, `slack-team-signal-message.ts`, Team Intelligence template, docs, focused tests

## [2026-08-05 20:12] - [FIX]

What: Analysis prompt now skips client_risk / unanswered_question when later in-window follow-up shows the item was already acknowledged, mitigated, or owned.
Why: Spencer-style dissatisfaction still surfaced at EOD even when the team had already handled it.
Impact: Next digest analysis should emit fewer stale risk/question signals; thread reply/✅ resolution still applies at send time.
Files: `apps/api/src/modules/spaces/services/slack-team-loop-analysis.ts`

## [2026-08-05 20:19] - [ARCH]

What: Production-deployed Slack EOD relevance briefing + already-handled skip to `api.roas.io` (`dpl_CDt7ASmqjEjyTjM3jjTbabY387Bt`).
Why: Briefing lived only in stash; Wednesday Pixel digests still ran the old alert queue.
Impact: Next Active Team Intelligence EOD/digest runs use the new briefing path.
Files: deploy only (`roas-api` → `api.roas.io`)

## [2026-08-05 20:32] - [FIX]

What: Team Intelligence briefings address the recipient in second person ("you stepped in" / "your plan") via prompt guidance plus deterministic name rewrite at compose time.
Why: EOD copy said "Dylan stepped in" when Dylan was the actor reading the DM.
Impact: Digests/thread follow-ups rewrite the recipient's display/first name to you/your; model is also instructed to write that way. Manual-run footer was never part of production delivery.
Files: `slack-team-signal-message.ts`, `slack-team-loop-analysis.ts`, focused tests

## [2026-08-05 20:33] - [FIX]

What: Org-chat personal User Brain resolve now always uses `org_id IS NULL` (Dylan stays private; company/campaign scoping unchanged).
Why: Chat retrieval filtered default user brains by current org, so Pixel/Atlas got company context but missed the personal brain in org workspace.
Impact: With `brain_access:personal`, org-chat preload and `search_user_brain` (no brain_id) find the owner's personal default brain. Requires `agent-api` deploy.
Files: `brain-retrieval-access.repository.ts`, `brain-context.repository.ts`, `brain-retrieval.service.test.ts`

## [2026-08-05 20:59] - [FIX]

What: Pixel digest thread replies now receive Team Intelligence source evidence; findings keep concrete dates; policy requires evidence/search before refusing digest questions.
Why: Asking for the MYK webinar date after an EOD digest only saw the summary, so Pixel declined instead of answering from source Slack.
Impact: Production digest follow-ups can answer concrete facts from stored source posts; weaker summary-only refusals are blocked by policy.
Files: `slack-digest-reply-context.ts`, `slack-digest-reply-context.service.ts`, `slack-inbound-thread-enrichment.service.ts`, `slack-digest-evidence.repository.ts`, `slack.service.ts`, `slack.module.ts`, analysis + policy + tests


## [2026-08-05 21:05] - [ARCH]

What: Merged PR #94 and deployed personal User Brain org-chat resolve to Fly `roas-runtimes` (agent-api).
Why: Production Pixel/Atlas still could not resolve Dylan while in org workspace until agent-api ran the fix.
Impact: Org-chat personal brain preload/`search_user_brain` should work now. Same chat is fine after refresh; hard refresh recommended.
Files: deploy `roas-runtimes` image `deployment-01KZAKGD15WDM915ZFTK2E4GPX`; merge `95799422`

## [2026-08-05 21:40] - [FIX]

What: Chat/channel/task personal User Brain access now uses `canAgentUseCapability` (role defaults) instead of only `effective.has('brain_access:personal')`; extracted `isRetryableAgentFailure` from task-agent to stay under the LOC allowlist.
Why: Org team grants often omit personal brain while vibey still has `read_brain_personal`, so Pixel skipped USER BRAIN preload and disabled `search_user_brain` even after org_id resolve was fixed.
Impact: Agents with role-default personal brain access preload/search Dylan in org chat without a team grant. Requires agent-api deploy.
Files: `chat-stable-turn-context.service.ts`, `chat-prewarm-context.service.ts`, `channel-agent.service.ts`, `task-agent.service.ts`, `is-retryable-agent-failure.ts`, loc-allowlist, access-context + channel/task mocks, `chat-stable-turn-context.user-brain-access.test.ts`


