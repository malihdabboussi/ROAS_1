# Meeting Follow-Up Slack Confirm

**Last Modified:** 2026-08-29 (bounded daily focus and first-action recommendations)

## Thread-aware recording retrieval

When Pixel is mentioned inside an existing Slack thread, client resolution uses both the current mention and the preceding thread. This matters for short follow-ups such as “do you have it?” where the client name, onboarding-call request, and task context appear earlier. The resolved client campaign is bound to the Slack conversation before agent execution so Campaign Brain meeting evidence remains available even in shared review channels. Exact campaign-name matches take priority over broader partial matches; unresolved ambiguity still fails closed.

First production loop for the always-aware Slack agent: Fathom call lands in Meetings → Pixel drafts a human recap with the database-backed `post-call-delivery` skill (plus live `known_names` from campaigns / Page Grader / Slack People) → the exact recap and account-manager reminders are stored in Shadow Conversations. Flow-level `Shadow` performs the complete processing path without any Slack send. Flow-level `Active` sends the admin one concise meeting summary with the follow-up count and a **Review meeting follow-ups** link. The link opens the canonical meeting workspace and its existing chat; task delegation and the editable client message finish there without an automatic client send.

## Meeting workspace architecture (2026-07-28)

The canonical post-call path is now meeting-first rather than automation-task-first:

1. A durable Fathom event claim enters `processing`; a failed attempt is reclaimable instead of being permanently treated as a duplicate.
2. Recording reconciliation attaches a short pre-call, main call, or other fragment to one canonical meeting when calendar identity matches or start/title/participant evidence is unambiguous.
3. Every provider recording is stored in `meeting_recordings`. Every supplied transcript becomes its own complete child document deliverable.
4. Exact Fathom action items are stored in `meeting_actions` with provider evidence **and** mirrored into `follow_up` space_items (Programs Action items / Home). Each canonical follow-up stores `custom_data.action_provenance` with its source kind/key, bounded evidence excerpt, meeting/recording/transcript-document IDs, transcript turn/timestamp when available, and recording URL. When structured actions remain absent after refetch, written bullets from Fathom's `Next Steps` summary section are mirrored with summary provenance and their stated owners. Canonical profile/CRM identity resolves display names and IDs, while original provider text remains in evidence. Operators can also add manual follow-ups from the workspace **+** control during the call; those rows retain manual-note provenance and titles cross-reference so Fathom later merges instead of duplicating.
5. A unified recap document refreshes from every attached provider summary and all normalized provider actions. The longest/evidence-richest source is marked primary, but supplemental recordings remain visible.
6. Attendee contacts plus the owning Space and campaign become typed `meeting_context_links`. Context can guide prep and chat without rewriting provider evidence.
7. The curated meeting workspace exposes agenda/prep, recordings, transcript and recap deliverables, action items, live notes/snippets, and prior unresolved commitments in one read model. **Create with AI** on Agenda & prep (and **Start agenda** in the call-status row) seeds the meeting chat so Pixel writes that agenda Space Doc from open action items, launches, client reports, and related context.
8. Clicking a linked call opens the curated workspace directly. Clicking a future calendar call creates or reuses one scheduled call item and workspace, so its agenda, chat, notes, and later recording share the same meeting identity.
9. Every workspace has one persistent meeting conversation. When a legacy or materialized meeting has no conversation yet, opening its workspace creates the deterministic meeting conversation without changing the call phase; **Continue in chat** then opens that exact chat. Opening the workspace does not steal whatever chat is already open. **Continue in chat** sits on the same row as the All Meetings **Call status** picker (SelectCell: Live / Completed / No Show / Rescheduled) and Recap / Clean up / Follow-up. Task Status (To action / Following up / Done) stays on Follow-ups / Action items. Back returns to Agenda; there is no header close control that empties the work area.
10. Live notes and pasted call snippets are stored both as typed meeting snippets and as entries in that same conversation. They appear in the chat timeline without being executed as AI instructions.
11. When Fathom later publishes the recording, calendar/start/title/participant reconciliation attaches it to the scheduled workspace when the match is unambiguous instead of creating a duplicate call. Operators can also manually link a Fathom recording from the workspace Recordings & attachments picker (`POST /api/integrations/fathom/attach-to-meeting`), which force-ingests onto the open meeting. Transcript and recap deliverables render in that same card.
12. The next meeting can point back through `next_meeting_item_id`; unresolved confirmed/in-progress/rolled-forward commitments are surfaced before the next call.
13. Scheduled workspace resolution accepts timezone-aware calendar timestamps and normalizes them to UTC before persistence, so Google Calendar offsets remain chronologically comparable during later Fathom reconciliation.
14. Scheduled and Fathom meetings share one call-kind classifier: Personal, Team, Executive, Client, Partner, and Sales. Organization member email domains distinguish teammates from external attendees. Automatic classifications can refresh as richer recording evidence arrives, while a valid human selection is marked manual and remains authoritative. All Meetings stores Host, Attendees, Call status, and the All Tasks **Client Workspace** / **Campaign Space** columns (`campaign_name`, `space_title`) resolved from `custom_data.client_campaign`. Either workspace column opens the shared client/campaign picker; each client's broad **General** workspace is available even when it has no active campaign. The 2026-08-24 migration restores Attendees and backfills only historical calls with one strict client-name match, without replacing manual mappings. The mapping field itself stays available but is not a default column.
15. The workspace stays in an explicit loading state until its full read model is hydrated, so recordings, recap, notes, and tasks do not briefly appear empty.
16. Action rows reuse the shared work-item list primitives and mutate mirrored `follow_up` space items through the canonical Space task endpoint. User completion records a timestamped origin; provider completion is labeled only when Fathom supplied completed evidence. Related calls reuse the All Meetings native list. Both Related calls and Action items sit full width at the bottom of the workspace, outside the narrow details column.
17. Notes accept relevant links and render them as clickable content immediately after save. Meeting recap documents repair provider Markdown embedded in HTML paragraphs on open, and post-call draft cards normalize Markdown emphasis to plain text.
18. Recap and follow-up quick actions draft from available meeting evidence immediately. Missing dates are omitted or proposed instead of blocking the first draft with a clarification request.
19. Related calls require the same mapped client/campaign. A different mapped client never ranks, even with a recording or a shared host. Unmapped series can still match on a distinctive title token or two-plus overlapping attendees. Generic words like strategy/growth/webinar are not relatedness.
20. Pixel's active post-call recap links to the token-scoped `/meeting-review/:token` page, which works without an authenticated ROAS session. The context step edits the canonical meeting fields with the same Meetings controls: a readable uncollapsed summary, full-container Call Kind and Call status pickers, the canonical Client Workspace mapping, attendee badges, and the shared task due-date picker. Every retained follow-up is editable and removable and must include WHO, WHAT, and WHEN before continuing. **Refresh from meeting** explicitly reopens exact provider follow-ups that were previously dismissed from this review, while ordinary Fathom re-ingestion preserves deliberate dismissals. Saved timestamp values are normalized to date-only task values when the card hydrates, so retries preserve and display the selected date. Failed preview attempts preserve the operator's in-progress task dates and client choice. Both this public view and **Run post-call flow** in the authenticated meeting chat call the ROAS Portal delegation-preview API directly with the required client ID, campaign ID, complete retained task list, and one stable meeting idempotency key. Neither path sends a Pixel chat prompt, uses native `create_task`, or writes to the Delegation Desk. Both render the same task-review handoff from the returned `confirm_url`; only after the operator marks that review complete does the prepared client message appear in the same editable draft card for copy. It is never sent automatically.

Exact Fathom `action_items` are mirrored into Meetings `follow_up` space_items on ingest (Programs Action items + Home). When the webhook payload has zero actions, we refetch the meeting once from Fathom; if still empty we do not invent tasks from the transcript. The default `Fathom Meeting Log` automation runs lifecycle status updates plus grounded `agent_suggest_tasks` (enrich assignees/due/priority onto those follow_ups — never invent when `action_items` is empty). Slack confirm remains an explicit downstream workflow, not an automatic side effect of ingest.

Legacy Fathom call rows are backfilled into workspaces and recording sources. Existing full transcript text is copied into a transcript deliverable without deleting the original call data. Historical recording rows that predate transcript persistence can be repaired through the authenticated, cursor-paginated transcript backfill endpoint. It refetches the original Fathom transcript and reuses canonical meeting ingestion, so retries update the existing recording, recap, and provider actions without creating duplicate meetings or task floods.

## Status (2026-07-22)

| Area                                                   | State                                                                                                      |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| DM with concise meeting summary + follow-up count/link | Implemented                                                                                                |
| ✅ `white_check_mark` → stamp follow-ups in ROAS       | Working                                                                                                    |
| Shareable thread recap after ✅                        | Pixel-written, exact approved draft reused                                                                 |
| Database-backed `post-call-delivery` skill             | Implemented; runtime copy and production row synchronized                                                  |
| Shadow proposal in Team → People → Conversations       | Implemented                                                                                                |
| Flow-level Shadow / Active delivery                    | Implemented; Shadow sends nothing, Active sends only the admin review entry before human review            |
| Slack org token resolution (personal call + org Slack) | Fixed                                                                                                      |
| Topics truncation mid-word                             | Fixed (brief skips Topics dump)                                                                            |
| Fathom markdown links → Slack mrkdwn                   | Fixed                                                                                                      |
| Markdown tables in Pixel replies                       | Fixed; Slack delivery converts them to compact labeled bullets                                             |
| Owner names as linked bullets                          | Fixed (headers + nested tasks)                                                                             |
| Friendly human recap voice                             | Implemented through the post-call skill                                                                    |
| Thread-reply revise loop                               | Implemented for pending post-call drafts                                                                   |
| Pixel channel directory + channel/thread timelines     | Implemented; app deployment required                                                                       |
| Person Brains in global Brain navigation               | Implemented; app deployment required                                                                       |
| Scheduled proactive Team loops                         | Installed in Shadow; live history polling is rate-limited and requires the shared observation stream below |
| Signal resolution refresh                              | Implemented; rechecks source-thread replies and explicit checkmark reactions before planning               |
| Internal / External / Ignored classification           | Manual classifications are durable; inferred records require an explicit first save                        |
| Signal action routing                                  | Internal DM, group DM, source thread, thread broadcast, and source channel remain Shadow until approval    |
| Named campaign Brain routing from Slack                | Explicit client/campaign names override ambient campaign context                                           |
| Pixel reply completion reactions                       | 👀 while processing; ✅ only after Slack accepts the completed reply                                       |
| Automatic post-call processing                         | Shadow; Team and Client run; Personal never enters the bot                                                 |
| Auto-post to `#roas-call-recaps-internal`              | Implemented behind explicit `channel_delivery=automatic`; installed disabled pending review                |
| Page Grader dispatch on confirm                        | Fulfillment candidates only; conservative client/assignee resolution                                       |

## Intended product loop

```text
Fathom recording ready (my_recordings OR shared_team_recordings)
  → webhook resolves owner by webhook secret
  → if action_items empty: one Fathom list refetch (still empty → stay empty; no transcript invention)
  → optional transcript hydrate via Fathom API if payload omitted it
  → cursor-paginated transcript repair for historical rows that omitted transcript payloads
  → choose one canonical matching Meetings route (organization route wins an equal match)
  → one canonical Meetings item
  → one or more meeting_recordings + complete transcript deliverables
  → exact provider actions in meeting_actions + mirrored follow_up space_items (UI Action items)
  → canonical identity mapping; manual + merges by normalized title
  → unified recap refreshed across every attached recording
  → Fathom Meeting Log: processing → needs_follow_up → grounded agent_suggest_tasks (enrich only)
  → optional explicit Slack delivery workflow
  → Pixel + post-call-delivery skill drafts once
  → store the exact recap in the Shadow ledger
  → request_slack_follow_up_confirm
       Shadow: store recap + account-manager drafts in Conversations; send nothing
       Active: DM concise summary + follow-up count + one review link; keep reminder drafts unsent
  → link opens the public token-scoped view of the canonical meeting, or Run post-call flow opens the same review in meeting chat
  → edit/confirm canonical meeting fields and WHO / WHAT / WHEN for current follow-ups
  → one direct Page Grader delegation-preview request → existing Portal task-by-task Confirm UI
  → user marks the delegation review complete
  → the prepared client message appears in the existing editable draft card
  → user copies the message; ROAS does not send it automatically
```

## Daily focus and source-of-truth phases

The Brain is the retrieval and reasoning layer, not a replacement database for mutable work. Canonical task status remains in `space_items`; meetings, recordings, transcripts, and provider actions remain in the Meetings domain; Slack messages remain in the Slack evidence ledger; campaign metrics remain in their reporting integrations. Brain indexes durable facts, decisions, and evidence links across those owners so Pixel can route a question to the current system of record and cross-reference the result with conversation history.

Inventory prompts such as “what is open?” stay deterministic and fast. When the user asks Pixel to choose what to do first, Pixel still skips broad Brain preload, retrieves the same bounded canonical task and calendar evidence, and then gives that evidence to the tool-free writer for an actual recommendation. This keeps recommendation quality conversational without allowing the model to invent tasks or widen ownership.

| Phase                                     | State                                     | Outcome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Primary implementation paths                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Canonical call actions and daily focus | Implemented and browser-verified          | Provider or manual call commitments become canonical assigned tasks. My Tasks is a cross-Space signed-in-user query that includes assigned child actions under meeting records, New Chat surfaces the same queue, and operational chat combines that queue with live calendar events without treating Brain as the task store. Narrow agenda prompts bypass semantic Brain preload and model-led tool planning: the server runs the existing validated `list_tasks` and `list_calendar_events` actions in parallel, then deterministically renders a bounded workday view. The agenda shows at most ten current tasks and the next eight meetings, reports the remaining canonical counts, and separates up to three examples from the stale/overdue review queue so historical meeting actions cannot bury current work. A follow-up that quotes one task title and asks about assignment or source still searches the complete assigned-task lifecycle—including closed or review-needed rows—and renders its stored meeting/Slack provenance directly instead of launching a broad contextual search. Calendar follow-ups preserve and accurately label their requested window: today, tomorrow, upcoming/next few days, and “after today” do not collapse back to today's events. | `apps/api/src/modules/meetings/repositories/meeting-provider-actions.repository.ts`; `apps/agent-api/src/modules/artifacts/services/artifact-my-tasks.helper.ts`; `apps/agent-api/src/modules/artifacts/repositories/artifact-tasks.repository.ts`; `apps/agent-api/src/modules/chat/services/chat-operational-agenda.util.ts`; `apps/agent-api/src/modules/chat/services/chat-operational-agenda-format.util.ts`; `apps/agent-api/src/modules/chat/services/chat-canonical-task-lookup.util.ts`; `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`; `apps/api/src/modules/home/services/next-moves.service.ts`; `apps/web/src/features/home/components/SuggestedNextMoves.tsx` |
| 2. Action lifecycle reconciliation        | Implemented and production-verified       | An hourly, service-role reconciliation marks overdue or 30-day inactive meeting follow-ups with idempotent `custom_data.action_lifecycle` review metadata without changing task status. Meeting workspaces and My Tasks ask the owner whether each item is still open, done, or dismissible. Owner decisions retain provider metadata, add explicit completion/dismissal evidence, suppress recently reconfirmed work for 14 days, and never create a second task. The task rollup now includes canonical meeting `follow_up` child rows instead of hiding them behind their parent call.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `apps/api/src/modules/meetings/domain/meeting-action-lifecycle.ts`; `apps/api/src/modules/meetings/services/meeting-action-reconciliation.service.ts`; `apps/api/src/modules/meetings/repositories/meeting-action-reconciliation.repository.ts`; `apps/api/api/meeting-action-reconciliation-cron.ts`; `apps/api/src/modules/programs/repositories/task-rollup.repository.ts`; `apps/web/src/features/home/components/MeetingActionItemsSection.tsx`; `apps/web/src/components/work-views/AllTasksNativeList.tsx`; `apps/web/src/lib/tasks/task-lifecycle-review.ts`                                                                                                                                      |
| 3. Conversational evidence coverage       | Implemented; release verification pending | Canonical Fathom tasks retain transcript-turn or summary evidence with meeting, recording, transcript-document, timestamp, URL, and provider source IDs. Manual call tasks retain manual-note evidence. Tasks created by Pixel from Slack retain server-owned Slack team, channel, thread, message, excerpt, and ROAS conversation provenance without depending on model-supplied metadata. The meeting workspace returns sourced, missing-source, percentage, and source-kind coverage so contextual readers can explain why a priority exists without mutating the task.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `apps/api/src/modules/meetings/domain/meeting-action-provenance.ts`; `apps/api/src/modules/meetings/domain/upsert-provider-follow-ups.ts`; `apps/api/src/modules/meetings/repositories/meeting-workspace-read.repository.ts`; `apps/agent-api/src/modules/artifacts/services/artifact-task-activity-helper.ts`; `apps/agent-api/src/modules/artifacts/services/artifact-tasks.service.ts`                                                                                                                                                                                                                                                                                                                 |
| 4. Brain routing and provenance           | Implemented; release verification pending | Pixel now receives one source-of-truth policy and Brain/read actions return the shared `{ canonical_source, as_of, evidence, brain_context }` contract. Brain is the durable knowledge owner for approved decisions and client context, while Tasks, Meetings/Calendar, Slack evidence, and campaign reporting remain canonical for mutable facts. Named client binding remains unique and organization-scoped; missing campaign scope fails closed instead of falling back to General or another client.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `apps/agent-api/src/modules/artifacts/services/artifact-source-truth-contract.ts`; `apps/agent-api/src/modules/artifacts/services/artifact-brain-source-truth.ts`; `apps/agent-api/src/modules/artifacts/services/artifact-brain-search-actions.service.ts`; `apps/agent-api/src/modules/chat/services/chat-source-truth-instructions.ts`; `apps/agent-api/src/modules/chat/services/named-client-campaign-bind.ts`                                                                                                                                                                                                                                                                                       |
| 5. Live campaign intelligence             | Implemented; release verification pending | Auto campaign-status questions resolve the named client campaign once at the authenticated service boundary, then pass that same canonical campaign ID to the live dashboard, Campaign Brain, and open-task reads in parallel. Reporting supplies the as-of timestamp; Brain supplies durable decisions and conversational interpretation without becoming a stale metrics store. Brain retrieval failure is labeled unavailable and does not suppress correctly scoped reporting or tasks. Missing or ambiguous client scope fails closed before any campaign data is exposed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `apps/agent-api/src/modules/artifacts/services/artifact-analytics.service.ts`; `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts`; `apps/agent-api/src/modules/chat/services/chat-campaign-intelligence-execution.ts`; `apps/agent-api/src/modules/chat/services/chat-campaign-intelligence.util.ts`; `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`; `apps/agent-api/src/modules/chat/services/chat-campaign-intelligence-execution.test.ts`; `apps/agent-api/src/modules/artifacts/services/artifact-brain-search-campaign-brain.test.ts`                                                                                                                |
| 6. Proactive surfacing and quality        | Implemented; release verification pending | Home and New Chat now project the same cross-Space assigned-task rollup used by All Tasks and operational chat instead of maintaining a meeting-only queue. Meeting, Slack, and ordinary task provenance selects the source icon and destination without creating another task. Surfaced, accepted, snoozed, dismissed, and explicitly false-positive interactions are stored as product events; a security-invoker quality view joins those events back to the canonical task to derive edits, completion, and stale state. Broader proactive Slack delivery remains unchanged and approval-gated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `apps/api/src/modules/home/services/next-moves.service.ts`; `apps/api/src/modules/home/repositories/next-moves.repository.ts`; `apps/web/src/features/home/components/SuggestedNextMoves.tsx`; `supabase/migrations/20260829173000_action_recommendation_quality.sql`; task and meeting read models above                                                                                                                                                                                                                                                                                                                                                                                                 |

Phase 3 release acceptance requires focused API/agent-runtime tests, exact-SHA deployment verification, and signed-in evidence that new call and Slack-derived tasks expose their provenance while old rows are counted as missing-source gaps rather than silently treated as sourced. Phase 4 release acceptance requires exact-SHA deployment and a signed-in answer that preserves `{ canonical_source, as_of, evidence, brain_context }` without cross-client fallback. Phase 5 cannot be marked complete until a signed-in campaign-status browser test proves live metrics retrieval and client-safe Brain cross-reference. Phase 6 cannot be marked complete until its migration is applied, the signed-in Home list matches My Tasks, source links work, and accepted plus false-positive events are visible in the quality view. No new proactive delivery is activated by this phase.

Team meetings (teammate-hosted Fathom recordings shared to your plan) use the same path. Pixel/Slack follow-up is downstream of the Meetings call row — if the webhook never creates that row, no Slack agent work runs.

Fathom transcript entries are timestamped speaker segments, not separate meeting copies. A call with 867 transcript entries is still one call. When personal and organization automations both match the same webhook, the routing service records the call only once in the highest-specificity canonical route and records the number of matching routes for diagnostics.

## Agent strategy (Pixel / internal `vibey`)

Do **not** create a separate meeting-recap agent.

The Slack-facing bot is currently named **Pixel**. Its stable internal runtime key remains **`vibey`**. Naming is intentionally separate from capability design.

Pixel owns this as **one skill** among others:

- Read the call + relevant client/campaign brain
- Draft a friendly shareable recap (“Hey all — good connecting…”)
- Propose owned follow-ups
- Ask for ✅
- After confirm, post/share the recap

Specialize with skills/playbooks on Pixel later (client vs internal vs leadership). Do not spin up Customer Success / Manager / new specialists for this loop.

The skill is database-first in `agent_skills` and mirrored under `docker/agents/vibey/skills/post-call-delivery/` for runtime/bootstrap parity. The review DM contains the proposed recap. `custom_data.slack_follow_up_confirm` and `slack_shadow_actions` store the exact same draft; approval never regenerates it.

## Data flow

1. **Automation action** `request_slack_follow_up_confirm` runs after `agent_suggest_tasks` (Personal Dashboard Fathom Meeting Log template / live Meetings automation). The action is scoped to Team and Client (`meeting_scope: client_and_team`). Personal calls never enter the bot, including when scope is `all`. Executive, Partner, Sales, and unclassified calls skip unless scope is `all`.
2. Service resolves suggestion IDs from the action or the latest `agent_suggest_tasks` step.
3. Calls Agent API `/api/agents/post-call-draft`, explicitly loading `post-call-delivery`, and receives `{ message, rationale, context_sources }`.
   Before generation, Agent API loads the meeting workspace's portal agenda, canonical recap, transcript documents, and Pixel's available Brain context. The direct call/follow-up payload remains the final grounding source.
4. Writes that draft to `slack_shadow_actions` as a `workflow` proposal, linked to the admin's Slack person record when an email match exists.
5. Creates one Shadow `message` proposal per follow-up assignee matched to an **Internal** Slack person (grouped tasks, friendly reminder tone). Skips unmatched, External, Ignored, and `delivery_mode=off`. IDs are stored on `assignee_shadow_action_ids`.
6. In `delivery_mode=shadow`, stores the run payload and stops without opening a DM or sending any Slack message. In `delivery_mode=active` with channel delivery disabled, opens the admin review DM and posts only the concise meeting summary, follow-up count, and guided-review link. The client draft and account-manager reminder proposals remain stored and unsent while the operator completes the chat review. Channel posting remains a separate legacy explicit switch; the installed destination is `#roas-call-recaps-internal`, and the switch remains disabled.
7. Stores the Shadow or pending payload on the **call** item:

   `custom_data.slack_follow_up_confirm = { status, delivery_mode, channel_id, message_ts, space_item_ids, review_summary, draft_message, confirm_reaction, assignee_shadow_action_ids?, assignee_sent_action_ids?, ... }`

8. For legacy pending records created by the former reaction-based flow, Slack Events API `reaction_added` → `SlackService.handleReactionAddedEvent` → `MeetingFollowUpSlackConfirmService.handleReactionAdded` remains supported.
9. On a legacy match (pending + correct reaction + channel/ts):
   - Call payload → `status: approved`
   - Each follow-up gets `custom_data.slack_follow_up_confirm_status: approved`
   - Thread reply uses `draft_message` byte-for-byte; the legacy template builder is used only for pending records created before this change
   - Matching Shadow action advances through approved → sending → sent
10. Slack send org is the call's organization when present; personal call items resolve the user’s active Slack `agent_channels` organization.

For legacy pending records, a human reply in the review thread is still treated as revision feedback. The current guided review edits the follow-up message in the linked meeting chat and leaves final delivery to the operator by copying the completed draft.

## Message shape

**Review DM**

- Meeting title followed immediately by the canonical call date/time and mapped Client Workspace, then the compact purpose/key-takeaway summary
- One natural-language follow-up count (for example, “I found 5 follow-ups to review”)
- One **Review meeting follow-ups** link
- No separate call-status block, action-item dump, reaction CTA, or threaded client-message draft
- Link unfurls disabled so Fathom URLs stay compact

**Editable client follow-up**

- Opens conversationally, then states the meeting's central focus in one concise “As discussed…” paragraph
- Introduces team-owned work as “Here’s our hit list of actions on our end:”
- Includes the actual grounded follow-ups for that meeting rather than a fixed task count
- Prefixes each action with its evidence-backed `(DONE)`, `(IN PROGRESS)`, or `(TO-DO)` status and preserves useful links, owners, and dates when supplied
- Ends with a brief forward-looking line; it remains an editable copy-only draft and is never sent automatically

**Per-assignee Shadow reminders (People)**

- One `action_kind: message` proposal per person who owns ≥1 follow-up
- Friendly nudge listing only that person’s tasks with an inline `linked here` call link
- Closes with “Feel free to message me if you have questions.”
- Every proposal and delivered message is visible in Team → People → Conversations with a post-call label, call title, timestamp, status, and rationale
- The guided meeting-review path keeps these proposals in Shadow and unsent while the operator reviews and delegates the tasks
- External and Ignored people never receive proactive post-call messages
- Legacy explicit channel delivery and old pending-record approval remain supported separately; they are not part of the guided review cycle
- Ops/`chat.postMessage` samples are **not** tracked unless they go through `sendShadowAction` (or mark the matching Shadow sent after post)
- If an ops sample is DMed to a different person than the ledger target (e.g. Aaron reminder content posted to Dylan’s Pixel DM), retarget `target_member_id` to the real recipient and keep `metadata.ops_manual` / `original_target_member_id` for audit — do not leave “Sent” under the wrong person

**Name knowledge at draft time**

- Before Pixel drafts the recap, the API loads canonical names from org campaigns, Page Grader clients / scope map, and Slack People
- Payload includes `known_names` so the skill prefers those spellings (no seeded alias map)
- Assignee reminder titles get a deterministic rewrite only when a catalog phrase already matches

**Thread replies**

- Legacy pending **review** thread → revise the stored client-facing draft
- Ops sample / no pending confirm → normal Pixel path: eyes reaction + agent reply
- Sent **assignee-reminder** thread → same Pixel path, with a bounded call brief (purpose + takeaways from the Meetings call item summary/description) plus that person's action items prepended from the Shadow ledger (`call_item_id` + `follow_up_ids`)
- Pixel keeps 👀 while the agent is working. After the response is accepted by Slack, Pixel adds ✅ and removes 👀. A provider-busy response waits five seconds and retries the selected model before using the configured fallback. If all attempts fail, Pixel removes 👀, explains that it is temporarily busy, and never marks the request complete.

**Legacy confirm reply (after ✅)**

- Exact `draft_message` shown during review, posted in the review thread
- No regeneration after approval
- Meeting ✅ still does **not** auto-send assignee reminders

## Slack agent roadmap toward the Viktor-style experience

All phases use one agent (`vibey`, currently displayed as Pixel), multiple narrow skills, durable conversation records, and the same safety progression: observe → contextualize → draft → Shadow review → approve → act → learn.

### Phase 0 — Production stabilization and preload (current)

- Deploy the ROAS Page Grader first-ingest and bounded Campaign Knowledge indexing fixes, then force-sync every mapped active client and verify Brain memories, evidence, and semantic objects—not only campaign shells.
- Deploy Page Grader's background queue identity fix, drain the active-client backlog without opening Client Intel, and verify its hourly and weeknight schedules from run history.
- Replace four independent Slack history scans with one durable Slack Events observation stream. Joined-channel messages are captured once with team/channel/thread/timestamp evidence; every Shadow detector reads the same stored window.
- Keep the four proactive loops in Shadow. Do not enable Active delivery until observation runs succeed without Slack rate limits and proposals carry valid source evidence.
- Production finding on 2026-07-20: all four installed loops were enabled and scheduled, but all 21 recorded runs failed with Slack `ratelimited`; 23 of 26 Page Grader campaign scopes were still pending their first complete Brain sync.

### Phase 1 — Post-call delivery loop (current)

- Fathom/Meetings trigger, concise Slack recap, guided meeting-chat review, existing bulk task delegation, editable follow-up-message draft, and operator copy.
- Per-assignee Shadow message proposals (grouped action-item reminders) are created but remain unsent during the guided review.
- Team → People exposes both the person directory and Conversations; a person opens their combined real Slack + Shadow timeline.

### Phase 2 — Conversation command center (implemented foundation)

- Team → People now has People, Conversations, Signals, and Channels. Channels uses a Slack-style split: left rail of Pixel’s channels (public `#` / private lock), right pane for the selected channel’s conversation and threads (`peopleView=channels&slackChannel=`).
- Conversations contains only person-targeted Shadow actions. Team-level findings without a recipient stay in Signals and appear as a clear “team signals need routing” handoff instead of an “Unknown person” conversation. Person timelines merge the real Slack DM with the Shadow ledger, render Slack mrkdwn, open at the latest activity, and expose a jump-to-latest control when an administrator scrolls upward.
- Signals (`peopleView=signals`) is a peer tab for channel-level workflow/risk findings with no `target_member_id`. It uses the same selectable list + detail pattern as Conversations so review does not sit above the chat inbox. Expanded evidence shows the readable channel, speaker, source time, exact Slack excerpt, rationale, confidence, and an Open in Slack link.
- Signals and Channels now keep their left directory independently scrollable while the selected signal/channel remains in the middle pane, matching the Conversations inbox interaction.
- `Check if resolved` reloads the source Slack thread and reactions. A later human reply or an explicit checkmark reaction marks the finding resolved; resolved findings cannot create another action plan.
- Signal coaching resolves Internal recipients by full name, unique first name, Slack ID, username, or unique role. It reports unmatched recipients and unsupported destinations rather than silently dropping work.
- Coached actions support Internal DM, Internal group DM, source-thread reply, thread broadcast, and source-channel message. Every action is persisted as Shadow and still requires approval plus an Internal/Active recipient before Slack delivery.
- Product rule: Shadow `target_member_id` must match the real Slack delivery recipient. UI labels say “Sent to this person’s Slack” (or “Ops sample · sent to this Slack DM”) — never imply someone else received the DM.
- Person conversations and channel timelines show timestamps and distinguish Pixel messages from human messages.
- Group-DM conversations, richer thread grouping, and participants remain follow-up work.
- Join action items and unresolved commitments to the conversation that created them.
- Add review filters: proposed, approved, sent, failed, needs response, and waiting on human.

### Phase 3 — Reply and revision loop (post-call foundation implemented)

- Post-call review-thread replies now revise the active client-facing proposal and create a versioned replacement Shadow action.
- Assignee-reminder DM threads (after send) prepend that person’s action items so Pixel can answer questions with eyes + reply.
- Empty bot-token mapped channels fall back to org Slack routing so IM replies are not silently dropped.
- Extend the same revision contract beyond post-call recaps to other proactive proposals.
- Add richer approve/edit/dismiss controls in ROAS while preserving the rule that a changed draft cannot inherit an older approval.

### Phase 4 — Proactive team support in Shadow (implemented MVP)

- One five-minute Team Intelligence loop observes Person Brain facts, repeated manual work, unanswered questions, and stalled commitments/client risk from the shared Slack event ledger. Its incremental cursor prevents overlapping scans or repeat model spend, while hourly reconciliation fills missed events and thread replies.
- Every detected signal includes its source channel, Slack timestamp, explanation, confidence, and a deduplication fingerprint.
- Signals below 80% confidence or without exact ledger evidence are rejected. An external-subject finding creates a team-level Signal plus a linked Internal workspace-owner Shadow draft when that owner is mapped; Pixel never targets the external person.
- Shadow creates reviewable proposals only. Runs are visible in the existing Flow run history and the installed loop can be disabled as its kill switch.

### Phase 5 — Approved active loops (first bounded behavior implemented)

- Admins can activate one installed loop at a time and scope it to Slack channel IDs and/or managed-person record IDs. Empty scope means every visible Pixel channel and every person except Ignored.
- Controls include Shadow/Active, schedule, lookback window, daily limit, quiet hours, instructions, Flow run history, and enabled/disabled kill switch.
- Active Person Brain compounding writes durable, source-attributed memories. Active unanswered-question delivery is permitted only when both the loop and the target person are Active; the audit row advances through approved → sending → sent/failed.
- Workflow-discovery and client-risk findings remain proposals even when the loop is Active.
- Friendly channel/person pickers, escalation owners, and campaign-scoped routing remain follow-up work.
- Keep new or materially changed behavior in Shadow until separately approved.

### Phase 6 — Compounding intelligence (Person Brain foundation implemented)

- Managed Person Brains now appear below User Brains in the global Brain menu, with separate portal-account and external-person icons.
- Active Person Brain loops route explicit Slack facts into the person’s managed Brain and deduplicate by both source message and normalized content.
- Historical backfill now reuses the retryable Slack Brain import queue for enabled mapped channels. It creates missing managed Person Brains, forks knowledge by Slack sender, skips Ignored people, and intentionally excludes DM history.
- Broader routing to Customer, Company, Agent, and Campaign Brains still requires per-loop ownership and permission rules.
- Show what Pixel learned, why it was saved, which conversations/people/campaigns it connects, and allow correction or deletion.
- Measure accepted proposals, edits before approval, response rate, commitments completed, time saved, and false-positive rate so each loop improves from real team feedback.

### People classification contract

- `relationship_source=manual` is authoritative. Slack discovery and sender resolution must preserve the saved `Internal`, `External`, or `Ignored` value.
- Inferred people show the three relationship choices in a dropdown and require `Save`.
- After saving, the relationship is displayed as a stable badge. Changing it requires `Edit`, a new selection, and another explicit `Save`.
- Active portal teammates with matching organization/email are backfilled as `Internal/manual`. James Anderson and Nefi Blanco are repaired as Internal for the ROAS organization.
- A missing portal identity is not sufficient evidence that someone is External. Restricted/guest Slack status or a known customer-contact role may still infer External, but inferred values remain visibly unconfirmed until saved.

### Slack context and delegation contract

- Slack is organization-scoped. Ambient campaign context is a retrieval hint, never a lock.
- Organization owners have **AI Data Admin** by default and can explicitly grant it to another active organization member. Pixel resolves that capability from the linked platform identity or Slack connection owner; Slack requests cannot self-assert it. The capability permits same-organization discovery across observed public/internal channels and private channels where Pixel is already a member. It never grants bulk private DM/group-DM access, cross-organization reads, access to unobserved private channels, or a bypass around Shadow, approval, audience, or send controls. Privileged Slack access decisions are written to `ai_data_access_audit`.
- An explicit Slack channel mention or channel ID is authoritative. Channel history returns the canonical channel ID/name with its messages; Pixel must verify that identity before mapping the client and must never substitute a client inferred from message content.
- Slack replies use compact labeled bullets for row-based data. Markdown tables remain available on portal surfaces, but Pixel's Slack delivery formatter converts any pipe table that slips through before posting.
- If Dylan names `Asura Group` (or another client/campaign), Pixel must call `search_campaign_brain` with that explicit campaign name/id instead of continuing to query the prior campaign.
- Named `campaign_id` / `campaign_name` on `search_campaign_brain` binds **this**
  portal conversation so CONNECTIONS shows that client. A Slack DM is a shared
  Pixel thread for every client; each message already maps to a specific portal
  chat. Binding does not glue the whole DM identity to one client forever. A new
  top-level DM starts a new portal chat; in-thread replies reuse the same chat.
- Human teammate work creates a durable human-assigned task. Managed AI-agent work uses agent delegation. Funnel, landing-page, campaign-page, and related fulfillment requests without a named human/agent infer Page Grader and use its connected MCP tool surface; the user does not need to name the integration.
- Page Grader writes resolve or confirm the client and campaign first. New campaigns and launches reuse known Brain, Space, and Page Grader context, then ask only for genuinely blocking missing details.
- Pixel may report delegation success only after the selected tool confirms a durable result.
- In funnel fulfillment, “the portal” means The ROAS Portal fulfillment path. Pixel creates a native ROAS platform funnel only when explicitly asked to build it in the ROAS platform funnel builder; a failed portal request stops with a blocker instead of silently becoming a generic task or native funnel.
- Slack-facing failures use Pixel/product-neutral language; the retired Vibey product name is not shown to Slack users.

## File map (what we built / touched)

### Core API

| Path                                                                                             | Role                                                                        |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `apps/api/src/modules/spaces/services/meeting-follow-up-slack-confirm.service.ts`                | Request confirm, handle ✅, stamp ROAS, resolve Slack org, assignee Shadows |
| `apps/api/src/modules/spaces/services/meeting-follow-up-action-ledger.ts`                        | Classifies internal, clarification, and fulfillment action items            |
| `apps/api/src/modules/spaces/services/meeting-follow-up-page-grader-routing.ts`                  | Resolves each action item to an unambiguous client and assignee             |
| `apps/api/src/modules/spaces/services/meeting-follow-up-slack-message.ts`                        | Pure message builders (brief, links, owner headers, shareable recap)        |
| `apps/api/src/modules/spaces/services/meeting-follow-up-assignee-reminders.ts`                   | Group follow-ups by assignee + reminder DM text + Shadow creates            |
| `apps/api/src/modules/spaces/services/meeting-follow-up-name-knowledge.ts`                       | Match/rewrite helpers against campaign / PG / People catalogs               |
| `apps/api/src/modules/spaces/services/meeting-follow-up-name-knowledge.loader.ts`                | Loads name catalogs for post-call draft payload                             |
| `apps/agent-api/src/modules/task-agent/services/task-agent-suggestions.service.ts`               | Synchronous Pixel post-call draft using the required skill                  |
| `docker/agents/vibey/skills/post-call-delivery/SKILL.md`                                         | Runtime/bootstrap copy of the post-call skill                               |
| `supabase/migrations/20260720234500_vibey_post_call_delivery_skill.sql`                          | Database-backed system skill                                                |
| `supabase/migrations/20260722223500_sync_post_call_delivery_skill.sql`                           | Synchronizes the live system skill with the runtime copy                    |
| `apps/api/src/modules/slack/repositories/slack-people.repository.ts`                             | Persists/advances the Shadow proposal ledger                                |
| `apps/web/src/features/team-2/components/people/SlackPeopleView.tsx`                             | People / Conversations / Signals / Channels entry points                    |
| `apps/web/src/features/team-2/components/people/SlackPeopleViewsNav.tsx`                         | People views tab strip + Conversations/Signals to-review badges             |
| `apps/web/src/features/team-2/components/people/SlackTeamSignalsView.tsx`                        | Team signals selectable list + approve/dismiss detail pane                  |
| `apps/api/src/modules/spaces/services/__tests__/meeting-follow-up-slack-confirm.service.test.ts` | Unit tests                                                                  |
| `apps/api/src/modules/spaces/services/space-automation.service.ts`                               | Executes `request_slack_follow_up_confirm`                                  |
| `apps/api/src/modules/meetings/domain/meeting-call-kind.ts`                                      | Canonical scheduled/Fathom call-kind taxonomy and classifier                |
| `apps/api/src/modules/spaces/services/slack-team-loop.service.ts`                                | Observes Slack, analyzes signals, writes proposals/memories/sends           |
| `apps/api/src/modules/spaces/services/slack-team-loop-analysis.ts`                               | Bounded schema-constrained analyzer and token accounting                    |
| `apps/api/src/modules/slack/integrations/slack-api-integration-core.base.ts`                     | Paginates the complete Slack channel directory                              |
| `apps/api/src/modules/slack/services/slack-people.service.ts`                                    | Pixel channel and threaded activity APIs                                    |
| `apps/web/src/features/team-2/components/people/SlackChannelsView.tsx`                           | Left-rail channel directory + right-pane conversation timeline              |
| `apps/web/src/components/layout/sidebar/SidebarBrainFlyout.tsx`                                  | Global Person Brain navigation                                              |
| `apps/api/src/modules/spaces/dto/space-automation-action.dto.ts`                                 | Action schema                                                               |
| `apps/api/src/modules/spaces/dto/space-automation-draft-action.dto.ts`                           | Draft/loose schema                                                          |
| `apps/api/src/modules/spaces/spaces.module.ts`                                                   | Registers the confirm service                                               |

### Slack webhook path

| Path                                                               | Role                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------------------- |
| `apps/api/src/modules/slack/services/slack.service.ts`             | Reactions + review revise + assignee-thread context prepend |
| `apps/api/src/modules/slack/services/slack-service-events.base.ts` | Message routing; empty-token fallback for DMs               |

### Template / catalog / capabilities

| Path                                                                                     | Role                                                                   |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `apps/api/src/modules/space-templates/data/space-template-catalog-personal-dashboard.ts` | Default Fathom Meeting Log: lifecycle + grounded `agent_suggest_tasks` |
| `apps/api/src/modules/meetings/domain/upsert-provider-follow-ups.ts`                     | Plans ingest mirror of provider actions → follow_up space_items        |
| `apps/api/src/modules/meetings/services/meeting-source-ingestion.service.ts`             | After `meeting_actions`, upserts matching follow_ups                   |
| `apps/api/src/modules/integrations/fathom/services/fathom-webhook.service.ts`            | One list refetch when webhook `action_items` is empty                  |
| `apps/api/src/modules/space-templates/data/__tests__/space-template-catalog.test.ts`     | Protects template action ordering and defaults                         |
| `packages/api-shared/src/types/flow-capabilities.ts`                                     | Capability surface                                                     |
| `apps/web/src/features/spaces/types/space-schema.ts`                                     | Frontend action type                                                   |
| `apps/web/src/features/spaces/components/automations/automation-catalog.ts`              | Catalog entry                                                          |
| `apps/web/src/lib/flows/flow-builder-canvas.utils.ts`                                    | Flow canvas                                                            |
| `apps/web/src/lib/flows/automation-flow-step-summary.utils.ts`                           | Step summary                                                           |
| `apps/web/src/lib/flows/automation-publishable.ts`                                       | Publishability                                                         |
| `apps/api/src/modules/spaces/data/space-automation-template-catalog-team.ts`             | Unified Slack Team Intelligence template                               |
| `apps/api/src/modules/slack/services/slack-observation.service.ts`                       | Webhook capture, reconciliation, threads, cursors, backfill batches    |
| `apps/api/src/modules/slack/repositories/slack-observation.repository.ts`                | Shared observation ledger persistence                                  |
| `supabase/migrations/20260721100000_slack_observation_ledger.sql`                        | Ledger, channel/member index, and cursors                              |
| `supabase/migrations/20260721101000_unify_slack_team_observation_loop.sql`               | Consolidates four scanners into one Shadow loop                        |
| `supabase/migrations/20260722230500_accelerate_slack_team_intelligence.sql`              | Moves installed unified analyzers to a five-minute cursor cadence      |

### Docs / logs

| Path                                                | Role                                                    |
| --------------------------------------------------- | ------------------------------------------------------- |
| `documentation/features/spaces-automation.md`       | Short action note + decision log                        |
| `documentation/features/meeting-follow-up-slack.md` | This doc                                                |
| `.docs/logs/changelog2026-07-20.md`                 | Day changelog entries                                   |
| `.docs/plans/agent-follow-up-work.md`               | Deferred items (thread revise, ActionBuilder LOC, etc.) |

## Key IDs used in admin testing (prod)

| Thing                                      | Value                                                                |
| ------------------------------------------ | -------------------------------------------------------------------- |
| Meetings space (org)                       | `71d2f284-78c5-4495-83d1-058dc285f094` (ROAS General; Fathom target) |
| Meetings space (old personal clone source) | `d957d348-c30a-4dbb-a089-ba3092332543` (automation disabled)         |
| Sample call                                | `9bf47aa7-b361-489e-b403-f213ba42e443` (“Nate and Dylan ops…”)       |
| Slack team                                 | `T03JLKLPXLY`                                                        |
| Dylan Slack user                           | `U03HG94MS8P`                                                        |
| DM channel                                 | `D0ACYFPD62V`                                                        |
| Default confirm email                      | `dylan@dylanvanas.com`                                               |
| Confirm reaction                           | `white_check_mark`                                                   |
| Events URL                                 | `https://api.roas.io/api/webhooks/slack/events`                      |

## Commits (feature line)

- `2a58d3b5` — feat: Slack DM follow-up confirm with summary and owners
- `7046aa68` — fix: ✅ reply + Slack org resolution; drop PG coupling
- `444fdcbf` — fix: shareable brief, Fathom Slack links, skip Topics dump
- `0b84ab6d` — fix: include Next Steps with timestamp links
- `99911625` — fix: nested bullets
- `c45cb0a3` — fix: owners as headers not hyperlinked bullets

## Decision log

- **2026-07-20:** Confirm is ROAS-owned. Internal handoffs remain in ROAS; only confirmed fulfillment candidates with unambiguous client and assignee mappings dispatch to Page Grader.
- **2026-07-20:** Client calls usually inherit their mapped Space client, but internal multi-client calls resolve the client independently from each action item before using Space/campaign mapping as a fallback.
- **2026-07-20:** Page Grader ClickUp status webhooks return completion, cancellation, and active status to the linked ROAS Action Ledger.
- **2026-07-20:** Slack brief uses Purpose + Key takeaways + Next Steps only — not full Topics (hits Slack length limits).
- **2026-07-20:** Fathom `[Name:](timestamp-url)` becomes plain `*Name's action items*` headers with task bullets under them (not hyperlinked names). Recording jump stays on the shared Fathom link.
- **2026-07-20:** Pixel is the current Slack display name; `vibey` remains the internal runtime key. Naming does not define the architecture.
- **2026-07-20:** One database-backed `post-call-delivery` skill owns meeting recap voice; no new specialist agent.
- **2026-07-20:** Approval applies to an immutable stored draft. The post-approval send does not ask the model to write again.
- **2026-07-20:** The first Slack message is an internal review brief. Thread replies revise the separate client-facing draft; ✅ on the original review message delivers the latest stored version.
- **2026-07-20:** Team support is consolidated in the existing Loops product through a Team filter; it is not a second automation system.
- **2026-07-20:** Off is the disabled Flow state. Shadow runs and proposes. Active may compound a Person Brain or answer an unanswered question only within admin scope, limits, quiet hours, and the person-level Active gate.
- **2026-07-20:** Slack source evidence is mandatory for every detected signal. Workflow-discovery and client-risk signals remain reviewable proposals in Active mode.
- **2026-07-20:** Per-assignee action-item reminders are Shadow `message` proposals created with the meeting review DM (not auto-sent on ✅). Matching uses Slack person email/display name; ignored and `delivery_mode=off` people are skipped.
- **2026-07-20:** Shadow ledger `target_member_id` must equal the Slack DM recipient. Ops samples delivered to Dylan cannot stay stamped on Aaron as Sent.
- **2026-07-20:** Person Brain history backfill is opt-in and bounded to enabled mapped channels; it never imports DMs. Managed Person Brains receive sender-filtered forks through the existing Brain queue, while portal users retain their canonical User Brain.
- **2026-07-22:** Completed calls continue into Slack review even when task suggestion returns no action items. The internal review and editable client-facing draft are still created; the draft explicitly says no action items were proposed.
- **2026-07-22:** Slack observation is webhook-first with hourly reconciliation, durable consumer recovery from the oldest unconsumed ledger event, and thread-aware unanswered-question suppression. Shadow continues during quiet hours because it cannot send; quiet hours block Active delivery only.
- **2026-07-22:** Slack Team Intelligence uses direct Gemini text generation so usage is covered by the configured Google spend cap and every run records input/output/total tokens plus provider cost. Active mode refuses to start without explicit channel and person allowlists.
- **2026-07-22:** Flow History distinguishes skipped/no-activity/analyzed/proposed outcomes. Manage People exposes channel-level workflow and risk signals with rationale and exact Slack evidence even when a proposal has no individual recipient.
- **2026-07-22:** Newly discovered Slack identities fail safe as External unless matched to a portal teammate or manually classified. Signal creation resolves Slack IDs to names and snapshots channel/person/time/source text so later review never depends on mutable Slack lookup state.
- **2026-07-22:** Recipient-less findings are Signals, never “Unknown person” conversations. External-subject Signals may create a linked Internal workspace-owner Shadow draft, but Pixel cannot target the external subject. The unified analyzer runs every five minutes from its exact cursor and rejects findings below 80% confidence.
- **2026-07-23:** Slack does not receive raw Markdown tables. Pixel is instructed to use labeled metric bullets in Slack, and the final Slack formatter deterministically converts any remaining pipe table before delivery.
- **2026-07-23:** Tagged Slack channels are authoritative client context. Pixel verifies the canonical channel identity before campaign/Brain lookup and fails closed rather than returning another client’s data.
- **2026-07-23:** “The portal” in funnel fulfillment means The ROAS Portal workflow. A failed fulfillment call cannot silently fall back to a generic task, native funnel, substitute owner, or substitute client.
- **2026-07-26:** Pixel and every user-visible Slack or portal surface call the internal Page Grader integration “The ROAS Portal.” The internal name remains limited to code, logs, tools, and operator documentation.
- **2026-07-24:** Provider rate limits receive one delayed retry on the selected model before model fallback. Exhausted retries return a specific Pixel-busy response instead of the generic processing error.
- **2026-07-24:** A Fathom webhook materializes one canonical Meetings item even when personal and organization automations both match. Equal filters prefer the organization Meetings route; transcript entry count remains segment count, not meeting count.
- **2026-07-28:** Linked Fathom Agenda rows open the curated meeting workspace. Ingestion owns processing/complete lifecycle state; reopening a completed call resumes its persistent chat without marking it live or relaunching its join URL.
- **2026-07-28:** Historical Fathom recordings missing transcript deliverables are repaired in bounded cursor pages through the same canonical ingestion service. Unavailable recordings cannot block older pages, and successful replays remain idempotent.
- **2026-07-28:** Production model capability tiers must cover every context window emitted by Auto chat routing. Contract tests enumerate full-task and staged-chat routes so meeting chat cannot select a context tier rejected by the runtime registry.
- **2026-07-29:** Meeting workspaces never render a second chat surface. Opening a meeting attaches its canonical conversation and meeting-aware context to the existing shell chat; live notes and call snippets are stored as typed meeting records and mirrored into that same conversation.
- **2026-08-04:** Open meeting renders the curated workspace in the shell work area (right card), not a fullscreen modal, so the linked meeting conversation stays visible in the left shell chat.
- **2026-08-04:** Live notes/snippets are entered in the linked meeting chat only; the duplicate capture field was removed from the meeting workspace panel.
- **2026-08-04:** While a meeting is live, the primary control is End call (not Rejoin). Live-chat awareness asks the agent for short brain-dump replies unless the user explicitly asks for guidance.
- **2026-08-04:** Action items header includes **+** → inline composer → `POST /api/spaces/:spaceId/meetings/:meetingItemId/actions` creating `source_type: manual` rows so commitments can be captured throughout the call without waiting on Fathom.
- **2026-08-04:** Manual and Fathom/provider action items are cross-referenced by normalized title/text. Adding a live duplicate returns the existing row; recording ingest merges into a matching live row instead of inserting a second action.
- **2026-08-04:** Meeting workspace chrome links to the owning Space and (when mapped) Campaign from the header and a Linked sidebar section.
- **2026-08-04:** Recordings sidebar **+** opens a Fathom picker; selecting a call attaches it to the open meeting via `POST /api/integrations/fathom/attach-to-meeting` (transcript/summary fetched when missing, then canonical ingest).
- **2026-08-04:** Meeting chat awareness includes recording status. When none are linked, Pixel is steered to Fathom list/transcript for action items and to the Recordings **+** picker — not a vague “check now” wait loop.
- **2026-08-04:** Exact Fathom actions are source of truth for Action items. Ingest mirrors them into `follow_up` space_items (Programs + Home). When the webhook sends 0 actions, refetch once from Fathom. Manual **+** cross-references/merges by normalized title.
- **2026-08-10:** If Fathom still returns no structured actions after refetch, a provider-authored `Next Steps` summary section is now the deterministic fallback. Only written bullets and stated owners are mirrored; the system does not infer tasks from arbitrary transcript prose. Generic Fathom titles use the same purpose-first canonical title in the picker, recording, transcript, recap, and meeting ingestion path.
- **2026-08-10:** The meeting workspace separates pre-call calendar agenda/prep from post-call Fathom recap and live notes. Recordings appear first. Canonical `follow_up` Space rows render as an interactive task table; Fathom rows retain provider attribution, task titles open the Space task detail, and completion can be toggled both on and off.
- **2026-08-10:** `/home/meetings` is the unified Meetings surface. It initializes the canonical Meetings Space and exposes its Agenda, All Meetings, Prep, Follow-ups, Action items, calendar, Meeting Logs, People, Missions, and custom views through one view strip. Agenda is ordered first and selected by default; that tab renders the existing live Mine/Team calendar list and calendar-board toggle, while every other tab uses the canonical Space items, filters, realtime updates, and task/document/contact renderers.
- **2026-08-10:** Continue in chat explicitly selects the persistent meeting conversation, restores meeting context, clears stale rail intent, expands the shared chat, and opens the drawer without route navigation or page refresh.
- **2026-08-17:** Meeting workspace Action items use the same native list as All Tasks (`AllTasksNativeList` / Space `ListView`): status, name, Client Workspace, Campaign Space, priority, assignee, due date, and **Add task**. Follow-up space-item fields (priority, assignee, due date) now travel with the workspace bundle so those columns are real, not empty captions.
- **2026-08-14:** Opening a meeting workspace no longer auto-selects its linked chat or remounts the shell chat. That switch happens only on Continue in chat or a recap/follow-up action. Seeded meeting prompts now send into the linked conversation instead of creating a new unlinked thread, and a meeting-tagged conversation restores meeting identity so Pixel does not ask which meeting.
- **2026-08-17:** Meeting workspace header drops the phase badge and close X. Continue in chat sits top-right. After a call ends, Start call sits next to Recap message so an accidental end can be restarted. Recordings and attachments share one card.
- **2026-08-20:** Meeting workspace Call status is the same All Meetings **Call status** field (`custom_data.call_status`: Live / Completed / No Show / Rescheduled). Task Status (Following up / Done) stays on follow-up work, not the meeting header. Continue in chat, that picker, Start/End call, and Recap / Clean up / Follow-up sit on one row.
- **2026-08-27:** Opening any meeting workspace idempotently ensures its dedicated conversation without starting or otherwise changing the call. Continue in chat is therefore available for scheduled and materialized meetings that previously had no conversation.
- **2026-08-19:** Meeting workspace Call status is the All Meetings **task** status (SelectCell: To action / Processing / Following up / Waiting / Done), not Live / Completed / No Show / Rescheduled. Continue in chat, that status picker, Start/End call, and Recap / Clean up / Follow-up sit on one row. `custom_data.call_status` still updates from recordings/reschedules for related-call scoring.
- **2026-08-18:** Agenda Space Doc no longer remounts on its own autosave (that was the Loading document flicker). Open transcript is a text link beside Open recording. Link recording sits under those links. Action items sit in the top row beside Recordings & attachments.
- **2026-08-18:** Agenda & prep has **Create with AI**. It reuses the Start agenda seed so Pixel writes the agenda Space Doc from open action items, launches, client reports, and related meeting context, omitting missing sources instead of inventing them.
- **2026-08-04:** Default / live `Fathom Meeting Log` again includes grounded `agent_suggest_tasks` after lifecycle status steps. Suggest enrichs existing follow_ups (assignee/due/priority via `source_action_index` / provider key / title); empty `action_items` → `{tasks:[]}`. Attach-to-existing-call also runs this automation after ingest.
- **2026-08-04:** Phase 3 gap repair: Meetings space calls with provider `meeting_actions` and 0 follow_ups were one-shot synced (14 follow_ups). Prod verification: recent calls with N actions have N follow_ups; calls with 0 stay at 0; live automation `ef3975a7-…` enabled with suggest-tasks.
- **2026-07-29:** Calendar timestamps with explicit timezone offsets are accepted at scheduled-workspace resolution and normalized to UTC before they are stored.
- **2026-07-29:** Every Space with a `call_kind` field receives the complete Personal/Team/Executive/Client/Partner/Sales option set, including legacy organization Meetings spaces. Calendar creation and Fathom attachment use one classifier; automatic results may refresh, but manual selections win.
- **2026-08-18:** Fathom Meeting Log post-call runs for Team and Client. Personal calls stay confidential and never draft. A Team title (weekly team, launch calendar) stays Team even when Fathom only recorded one speaker.
- **2026-08-12:** The live Fathom Meeting Log invokes Pixel's post-call workflow for canonical Client calls only. It starts in Shadow so drafts, action ownership, and Brain-backed context can be reviewed without posting to Slack; channel delivery remains disabled until approval.
- **2026-08-12:** Call-kind classification now gives explicit sales/demo and partner titles precedence, then treats a mostly-external meeting as Client before inspecting ordinary transcript discussion. Client performance calls can discuss sales or partnerships without being mislabeled. Pixel's post-call draft input now includes the portal agenda, recap, full transcript documents, and Brain context.
- **2026-08-12:** Channel delivery is an independent fail-closed action setting. The client recap channel ID is preconfigured, but only an explicit change to `channel_delivery=automatic` on an Active flow can post there; the rollout migration leaves it disabled for DM review.
- **2026-08-26:** Pixel's post-call DM is now a concise meeting summary plus follow-up count and one review link. That link opens the existing Meetings workspace and persistent chat, guides context confirmation before the existing Portal bulk delegation preview, and finishes with the Claude-style editable draft message. Initial Slack delivery no longer posts the client draft thread or sends assignee reminders; the operator copies the completed message instead of ROAS sending it.

- **2026-08-17:** Named `campaign_id` / `campaign_name` on `search_campaign_brain` binds **this** portal conversation so CONNECTIONS shows that client. A Slack DM remains a shared Pixel thread; each message already maps to a specific portal chat. Binding does not glue the whole DM identity to one client forever.

- **2026-08-18:** All Meetings has a Client / Campaign column. Mapping tags the call with the Page Grader client and that client’s campaign (`custom_data.client_campaign`) and does not transfer the row. Client and campaign names link to `/clients/{id}` and the campaign Space. An Agenda link opens the same meeting workspace as clicking the call. Call Kind stays independent.
- **2026-08-19:** All Meetings adds a Space column (mapped campaign Space) and labels the mapping column Campaign. Related calls use that same All Meetings row. Related + Action items sit full width at the bottom of the meeting workspace. Relatedness drops different mapped clients; object `client_campaign` mappings now score.
- **2026-08-20:** All Meetings default columns are Name, Call Kind, Client Workspace, Campaign Space, Host, Call date, Call status, Recording. Call status stays a column and also drives the name-column status dropdown. Host is a people picker. Client / Campaign mapping remains a field, not a default column.
- **2026-08-18:** Calendar events materialize onto All Meetings rows without opening the specialized card. Host is the calendar organizer, else the Fathom recorder. Call status is blank / Live / Completed / No Show / Rescheduled (recording landing sets Completed). All Meetings is the default tab and filters past + today + tomorrow. Agenda still opens the specialized card; All Meetings opens the standard task card. Related calls on that card feed Pixel so last week’s recording is not a Recordings + ask. Prep tab and Prep for call are gone. Impromptu defaults to Team. Completing a call (status or recording) runs the existing post-call Pixel path.
- **2026-08-27:** Meetings always prefers the active organization’s canonical Meetings space over a legacy personal duplicate. Production history was consolidated into the organization space so cached and refreshed space lists cannot swap between different call datasets.
- **2026-08-27:** Completed meeting workspaces expose **Run post-call flow** instead of the former recap-only action. It starts the same guided context confirmation, bulk delegation review link, and editable unsent follow-up-message sequence used by Pixel's Slack review link.
- **2026-08-27:** The guided post-call action uses the actual MCP execution contract: discover the connected Portal server, list its tools by `server_id`, then invoke `page_grader_create_delegation_preview` through `use_mcp_tool`. It never falls back to native Delegation Desk writes from the meeting Space.
- **2026-08-27:** Pixel's prepared and final client follow-up now uses a conversational Slack recap, one central “As discussed…” takeaway, an actual status-led hit list, and a short forward-looking close. The meeting records determine the number of bullets; Pixel cannot preserve a stale count or invent completed work.
- **2026-08-27:** Pixel's post-call review DM now identifies the exact canonical call with its Slack-localized date/time and mapped Client Workspace directly under the title. Its action remains the ROAS **Review meeting follow-ups** link; a Fathom recording link is never substituted for the task-delegation review.
- **2026-08-27:** Post-call review links now use an expiring, hashed guest token at `/meeting-review/:token`. Signed-out and incognito reviewers can confirm the one linked meeting and continue its constrained Pixel chat without gaining access to the Meetings workspace. The review resolves attendee option IDs to names, uses the canonical Client Workspace mapping picker, persists dismissed follow-ups, and carries the prepared follow-up message through task delegation into the editable final message card.
- **2026-08-27:** The public context form retains canonical client/campaign IDs and local WHO/WHAT/WHEN edits when Portal preview creation fails. Its delegation request now supplies the Portal's required `client_id`; summary formatting is cleaned for display, selectors use their complete containers, and due dates reuse the standard task picker.
- **2026-08-27:** The authenticated meeting-chat flow now uses the same deterministic backend delegation-preview endpoint and shared task-review/follow-up stages as the public review. Continuing from the context card no longer seeds Pixel or lets the model reinterpret, omit, or reroute confirmed tasks.
- **2026-08-27:** A meeting mapped to a Portal client but not an explicit campaign inherits that client's canonical campaign and Space from the connected Page Grader scope map before preview creation. The visible Client Workspace remains authoritative while the delegation request receives the required campaign ID.
- **2026-08-27:** Delegation preview creation validates the saved campaign against the Portal's current client campaign catalog. If that campaign was deleted and the client has one live campaign, the review uses that live campaign and repairs the saved client scope mapping before opening the task review.
- **2026-08-28:** The review can restore missing provider follow-ups from the meeting's canonical Fathom actions without removing manual items. The existing Portal bulk-delegation review is embedded beneath the confirmed meeting context, so reviewers complete it in the same post-call page before advancing to the follow-up message.
- **2026-08-28:** Canonical user identity resolved from a Fathom action is now written onto the mirrored `follow_up` `space_items` task (`assignee_type`, `assignee_id`, and `assignees`) while provider evidence remains in `custom_data`. The post-call review edits and delegates that existing task; it does not create a second ROAS task. My Tasks is the default task scope, and New Chat surfaces up to five records from that same canonical My Tasks rollup.
- **2026-08-28:** Pixel daily-focus questions use one fail-closed cross-Space `list_tasks({ assigned_to_me: true })` read. This mode requires current-user ownership, removes each Space's configured closed statuses, and never widens to unassigned or organization-wide tasks after failure. Calendar remains a separate authoritative read for today's meetings; Brain may explain priority context but cannot introduce a task.
- **2026-08-28:** `assigned_to_me` is authoritative even if an agent also supplies `space_id`. The task service ignores that incidental Space for ownership-scoped reads so fresh chats cannot silently narrow My Tasks to one discovered Space.
- **2026-08-28:** Purely operational task/calendar prompts bypass semantic Brain retrieval and read their canonical live systems directly. Brain retrieval remains enabled when the prompt asks for call, transcript, Slack, client, campaign, recommendation, or rationale context.
- **2026-08-29:** The daily-focus quick path executes the existing schema-validated, authorized task and calendar read actions directly and in parallel, then renders every verified record deterministically. This removes both agent bootstraps and the writer evidence cap without creating a second task/calendar implementation or weakening the contextual Brain route.
- **2026-08-29:** Conversational tasks now retain server-owned `action_provenance` on the canonical task row. Fathom follow-ups point to the recording, transcript document, provider source key, bounded transcript/summary excerpt, timestamp/turn, and playback URL; manual call actions point to the meeting note; Slack-created tasks point to the originating Slack conversation. The meeting read model reports source coverage and missing-source gaps without rewriting historical rows.
- **2026-08-29:** A quoted task assignment/source follow-up is an exact canonical task lookup, not open-ended research. Pixel queries only tasks assigned to the signed-in user, includes closed rows so completed work can be explained, requires an exact normalized title match, and renders stored Fathom, manual-note, or Slack provenance without Brain or provider fan-out.
- **2026-08-29:** Cross-Space `assigned_to_me` reads include assigned child tasks, because meeting-derived actions are intentionally stored under their canonical meeting record. `include_closed` is honored on that same path, and exact quoted-task source questions bypass Brain preload before the canonical task read.
- **2026-08-29:** A first-action follow-up is no longer rendered as another agenda inventory. Pixel retrieves the same bounded My Tasks and calendar evidence without Brain fan-out, then uses the tool-free writer to choose and explain the next action from those canonical records.
- **2026-08-29:** Campaign-status questions bypass broad Brain preload before scope validation. Without a resolved client campaign, Pixel immediately streams a normal user-visible request to select one specific campaign; that guidance is not recorded as a failed run and invokes neither model nor tools. With a resolved campaign, the campaign route reads live reporting, Campaign Brain, and open campaign tasks explicitly and formats the answer deterministically without a writer pass. The response includes the canonical metrics, partial-data labels, reporting owner, exact as-of timestamp, Campaign Brain result count, and open-task count; zero or missing values never become an inferred operational cause.
- **2026-08-29:** Named campaign status requests resolve Campaign Brain first and use its canonical campaign ID for the dashboard and task reads. This repairs stale conversations bound to the system General campaign, keeps all three sources on one client campaign, and fails closed before exposing General reporting when no client campaign resolves.
- **2026-08-29:** Natural-language campaign status prompts preserve the full query but also extract hyphen-delimited campaign phrases for exact scoped lookup. Resolution therefore does not depend on the campaign appearing in the bounded recent-campaign fuzzy list.
- **2026-08-29:** When runtime organization context is unavailable, campaign-name resolution uses the same signed-in user-ownership boundary as campaign access verification. It does not require owned organization campaigns to have a null `org_id`; duplicate names remain ambiguous and fail closed. Explicit organization context remains strictly organization-scoped.
- **2026-08-29:** Deterministic campaign status resolves the named campaign directly through the authenticated service client before invoking any artifact action. Brain, dashboard, and task reads receive the same explicit canonical campaign ID and run independently, so a stale General conversation cannot redirect the request and a Brain outage cannot suppress live reporting or scoped work.
- **2026-08-29:** Cross-campaign status reads explicitly authorize a read-only scope override after canonical campaign resolution, enumerate that campaign's Spaces, and bind task retrieval to the uniquely named non-General Space from the user's question. A stale active workspace can no longer redirect reporting or leak unrelated tasks. Campaign Brain's optional LLM reranker falls back to deterministic ranking when its response is malformed or unavailable, preserving already-grounded evidence instead of failing the entire read.

## Related

- Space automations overview: `documentation/features/spaces-automation.md`
- Deferred follow-ups: `.docs/plans/agent-follow-up-work.md`
