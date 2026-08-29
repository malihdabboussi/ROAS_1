# Changelog - August 29, 2026

## 2026-08-29 06:42 - [FIX]

What: Preserved provider follow-up refresh compatibility when no canonical assignee map is available, while retaining human assignment propagation during normal Fathom ingestion.

Why: Rebasing the canonical assignment work over the newer dismissed-follow-up refresh exposed a shared planner call that legitimately has provider actions but no identity-resolution pass.

Impact: Explicit refresh can reopen grounded provider follow-ups without crashing or inventing an assignee; normal ingestion still assigns uniquely resolved organization users into My Tasks.

Files: `apps/api/src/modules/meetings/domain/upsert-provider-follow-ups.ts`, `apps/api/src/modules/meetings/domain/upsert-provider-follow-ups.test.ts`, `apps/api/src/modules/meetings/repositories/meeting-workspace-state.repository.ts`, `.docs/logs/changelog2026-08-29.md`.

## 2026-08-29 05:21 - [FIX]

What: Added a bounded Auto-model route for canonical daily-focus prompts. The existing operational-agenda classifier now selects no-reasoning Terra tool retrieval, low-reasoning Sonnet writing, and direct instructions to query assigned tasks and calendar events without reading skills or listing Spaces. Added regression coverage for both the fast route and the full contextual route.

Why: Signed-in traces showed the assigned-task query completing in roughly 238 ms and calendar retrieval in roughly 5.7 seconds, while generic agent planning and writing kept the complete response near 68 seconds after Brain preload was already removed.

Impact: Plain My Tasks, daily-focus, calendar, schedule, and meeting-list questions can reach canonical tools with less model deliberation. Questions mentioning calls, transcripts, Slack, Brain, clients, campaigns, performance, notes, context, recommendations, or why retain full Brain retrieval and normal Auto reasoning.

Files: `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.test.ts`, `documentation/features/meeting-follow-up-slack.md`, `.docs/logs/changelog2026-08-29.md`.

## 2026-08-29 06:20 - [FIX]

What: Corrected the deterministic operational-agenda stream payload to emit the answer through the canonical `content` field and strengthened the regression assertion around that client-visible contract.

Why: Signed-in preview verification showed both canonical tools completing but no assistant answer rendering because the quick path emitted `delta`, which the progressive stream ignores for `content_delta` events.

Impact: Daily-focus and meeting-only quick-path answers now render and persist through the same stream accumulator used by normal chat responses.

Files: `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.test.ts`, `.docs/logs/changelog2026-08-29.md`.

## 2026-08-29 05:33 - [FIX]

What: Routed canonical operational-agenda research through the existing Gemini 3.5 Flash speed model without incompatible cross-model settings and corrected the calendar tool instruction to require the supported `start` and `end` fields exactly once.

Why: Signed-in preview evidence showed the bounded Terra route still waiting 34 seconds before its first tool call and initially calling the calendar action with unsupported `start_date` and `end_date` fields, leaving the complete turn at 67 seconds. A subsequent Haiku probe preserved that same 35-second pre-tool delay, so the operational route now uses the platform's designated speed model.

Impact: Pure My Tasks and calendar prompts retain the same fail-closed assigned-task query and Sonnet final-answer pass while avoiding Terra's long tool-planning delay and the failed calendar retry. Contextual Brain, call, Slack, client, and campaign questions remain unchanged.

Files: `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.test.ts`, `.docs/logs/changelog2026-08-29.md`.

## 2026-08-29 06:01 - [FIX]

What: Replaced model-led tool selection for canonical daily-focus requests with parallel server-side execution of the existing `list_tasks` and `list_calendar_events` actions. The quick path deterministically renders every verified record, while the normal agent route remains intact for contextual questions. Added regression coverage for exact assigned-task arguments, visible tool lifecycle events, all-record rendering, failure receipts, and meetings-only seven-day follow-ups.

Why: Signed-in Gemini, Haiku, and Terra probes all spent roughly 35 seconds processing the agent bootstrap before the first deterministic read. The live Gemini trace completed the actual task and calendar actions in about eight seconds but took 70 seconds overall.

Impact: Pure task/calendar turns avoid both 15k-token agent bootstraps and cannot lose tasks to a writer evidence cap, while retaining the existing action schemas, authorization, structured error contract, workflow circuit breaker, canonical records, and visible work summary. Calls, Slack, Brain, client, campaign, performance, recommendation, and rationale prompts continue through full contextual reasoning.

Files: `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.test.ts`, `documentation/features/meeting-follow-up-slack.md`, `.docs/logs/changelog2026-08-29.md`.

## [2026-08-29 06:58] - [FIX]

**What:** Corrected the deterministic operational-calendar route so follow-up requests for tomorrow or after today start on the next day, while upcoming windows remain bounded to seven days.

**Why:** Signed-in multi-turn browser QA found that “What meetings do I have coming up after today?” repeated today's calendar because the fast route recognized only a narrow set of future-window phrases.

**Impact:** Daily-focus chats now preserve the user's requested time window across follow-up turns without reintroducing the slower Brain/model path.

**Files:** `apps/agent-api/src/modules/chat/services/chat-operational-agenda.util.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.test.ts`, `documentation/features/meeting-follow-up-slack.md`

## [2026-08-29 07:07] - [FIX]

**What:** Made the operational calendar window helper own both the exact date range and its user-facing label, including a distinct one-day tomorrow state.

**Why:** The tomorrow query was date-correct after the previous fix but could still be presented as today's meetings during an ongoing chat.

**Impact:** Follow-up turns now consistently show Today's meetings, Tomorrow's meetings, or Upcoming meetings from the same deterministic temporal contract.

**Files:** `apps/agent-api/src/modules/chat/services/chat-operational-agenda.util.ts`, `apps/agent-api/src/modules/chat/services/chat-operational-agenda-format.util.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`, `apps/agent-api/src/modules/chat/services/chat-operational-agenda-format.util.test.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.test.ts`, `documentation/features/meeting-follow-up-slack.md`, `.docs/logs/changelog2026-08-29.md`
