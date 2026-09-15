# Changelog - [September 15, 2026]

## [2026-09-15 13:05] - [FIX]

What: Brain search hits are normalised into the `BrainMemory` shape before they reach the graph dock and node detail modal (`searchHitToBrainMemory`), mapping the API's `significance_score` onto `significance` and coercing `confidence`.
Why: `/api/brain/search` and `/api/brain/search/image` return `significance_score` and no `significance`, so picking a search result opened the modal with `significance: undefined`, the Significance bar showed `NaN%` and React logged "Received NaN for the `value` attribute" on the `<progress>` element. Canvas clicks were unaffected because the graph endpoint selects the real column.
Impact: Search results show their real significance in the dock and the modal; no NaN warnings. No API change.
Files: apps/web/src/features/brain/lib/brain-search-result.ts (new), apps/web/src/features/brain/lib/brain-search-result.test.ts (new), apps/web/src/features/brain/services/brain.service.ts

## [2026-09-15 13:40] - [FIX]

What: Chat no longer routes questions about a meeting that already happened ("summarize the last meeting demo", "what did we agree in the demonstration", "recap yesterday's meeting") into the operational calendar quick path. `shouldSkipBrainContextForOperationalAgenda` now returns false when the message matches `PAST_MEETING_RECALL_REQUEST`, so the turn keeps Brain context and answers from transcript memories.
Why: The quick path treats any message containing "meeting" as a calendar read, skips Brain retrieval, and calls `list_calendar_events`. For a personal workspace that call fails (calendar agenda is org-only), the research stage returns `failed`, and the user saw "The assistant is temporarily unavailable" instead of the meeting summary that already sits in the Brain.
Impact: Meeting-recall questions reach the Brain; today's/upcoming-meeting questions still take the quick path (existing tests unchanged). Local test: 41 chat routing tests pass.
Files: apps/agent-api/src/modules/chat/services/chat-operational-agenda.util.ts, apps/agent-api/src/modules/chat/services/chat-turn-gateway-preparation.service.test.ts

## [2026-09-15 18:55] - [FIX]

What: Chat turns now log an explicit warning when the personal Brain lane is denied: `personal brain access denied by policy for agent=… scope=…` when the policy check returns false, and `agent policy service unavailable; personal brain access denied` when the policy service is not injected. Shared helper `chat-personal-brain-access.log.ts` used by the prewarm and stable-turn context services.
Why: A local turn recorded `user_brain_access: false` in its brain_context span while the same policy check evaluated true outside the server, and the logs were silent because a false decision (unlike a thrown error) was never logged. Without this line the user's "Vibey can't see my meeting memories" report is not diagnosable from logs.
Impact: One warning line per denied turn; no behaviour change.
Files: apps/agent-api/src/modules/chat/services/chat-personal-brain-access.log.ts (new), apps/agent-api/src/modules/chat/services/chat-prewarm-context.service.ts, apps/agent-api/src/modules/chat/services/chat-stable-turn-context.service.ts
