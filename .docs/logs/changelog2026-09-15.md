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
