# Changelog - [September 15, 2026]

## [2026-09-15 13:05] - [FIX]

What: Brain search hits are normalised into the `BrainMemory` shape before they reach the graph dock and node detail modal (`searchHitToBrainMemory`), mapping the API's `significance_score` onto `significance` and coercing `confidence`.
Why: `/api/brain/search` and `/api/brain/search/image` return `significance_score` and no `significance`, so picking a search result opened the modal with `significance: undefined`, the Significance bar showed `NaN%` and React logged "Received NaN for the `value` attribute" on the `<progress>` element. Canvas clicks were unaffected because the graph endpoint selects the real column.
Impact: Search results show their real significance in the dock and the modal; no NaN warnings. No API change.
Files: apps/web/src/features/brain/lib/brain-search-result.ts (new), apps/web/src/features/brain/lib/brain-search-result.test.ts (new), apps/web/src/features/brain/services/brain.service.ts
