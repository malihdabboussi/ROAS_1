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

## [2026-09-15 20:20] - [FIX]

What: `ChatPrewarmContextService` now receives its `AgentPolicyService` and `ChatPrewarmCacheService` dependencies. Both were declared `@Optional() dep: Service | undefined`; TypeScript serialises an explicit union as `Object` in `design:paramtypes`, so Nest could not resolve the token and `@Optional()` injected `undefined` without any error. Same pattern fixed in `SpaceRetrievalService` (`graphExpansion`). Added `src/lib/nest-optional-injection.drift.test.ts`, which fails on any `@Optional()` parameter typed with a `| undefined` / `| null` union that lacks an explicit `@Inject(token)`.
Why: With no policy service, every chat turn built through the prewarm path computed `userBrainAccess = false`, so the personal Brain lane was skipped and Vibey answered "I don't have that meeting" although the memories existed. Verified with the new warning `agent policy service unavailable; personal brain access denied for agent=vibey` in the agent-api log, and by reading the compiled metadata: parameters 7 and 8 of the prewarm constructor were `Object`. The prewarm Redis cache was silently disabled by the same defect; space retrieval graph expansion never ran.
Impact: Personal Brain retrieval works in chat again (all environments, not local only); prewarm cache and space graph expansion are active. No API change. Prewarm optional dependencies moved to the end of the constructor; the only manual construction site (`chat-service-collaborators.ts`) updated.
Files: apps/agent-api/src/modules/chat/services/chat-prewarm-context.service.ts, apps/agent-api/src/modules/chat/services/chat-service-collaborators.ts, apps/agent-api/src/modules/spaces-retrieval/services/space-retrieval.service.ts, apps/agent-api/src/lib/nest-optional-injection.drift.test.ts (new)

## [2026-09-15 21:45] - [FIX]

What: Chat Brain retrieval now searches Specific Knowledge entries (`ns_sk_entries`: techniques, principles, frameworks) for user and customer brains, not only agent brains. `searchFamilyCandidates` adds the SK lane to the non-agent branch, and `skCandidate` carries the searched family instead of a hardcoded `agent` (receipts and scope labels stay correct). Added lane test "returns SK entries trained into a user brain".
Why: Train Brain writes SK entries into the user's default brain (e.g. the "Best Day for Webinars" training created the technique "Tuesday Webinar Scheduling Rule"), and the Brain page shows them, but chat retrieval never looked there: with retrieval timing logs on, the user-family search returned exactly the six memories and zero SK candidates, so Vibey answered "Wednesday" from general knowledge while the user's own trained rule said Tuesday.
Impact: Trained knowledge in personal/customer brains reaches the model's Brain context. Lane balancing already reserves a per-lane quota, so SK entries are not crowded out by memories.
Files: apps/agent-api/src/modules/brain/services/brain-retrieval-search-lane.service.ts, apps/agent-api/src/modules/brain/services/brain-retrieval-candidate-builder.ts, apps/agent-api/src/modules/brain/services/brain-retrieval-search-lanes.service.test.ts

## [2026-09-15 22:30] - [FEATURE]

What: Trained Specific Knowledge reaches the model with provenance. In the Brain context an SK item is now rendered as `- [trained <entry_type>] Title: text (trained by the user, mastery N%, confidence N%, from training "<source>")` instead of a bare `[sk_entry]` line, and the source-of-truth instructions gain one rule: trained Brain items are the user's own rules, apply them ahead of general best practice, cite them as such, say so when they conflict with other evidence, and hedge on low mastery.
Why: With SK now retrieved for personal brains (dd588087), a wrongly trained rule would otherwise be asserted as fact. Showing type, mastery, confidence and origin lets the model weigh it and lets the user trace an answer back to the training that caused it.
Impact: Answers grounded in training say so; low-mastery rules are hedged; no retrieval or storage change.
Files: apps/agent-api/src/modules/brain/services/brain-context-support.service.ts, apps/agent-api/src/modules/chat/services/chat-source-truth-instructions.ts, apps/agent-api/src/modules/brain/services/brain-context.service.test.ts
