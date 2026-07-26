# Changelog - July 26, 2026

## 2026-07-26 10:46 - [FIX]

What: Bounded OpenRouter/OpenClaw context and output growth, made scheduled Customer Brain pattern analysis a single tool-free inference, restored the canonical Opus Power route for Mission runs, capped Gemini reranker reasoning/output, shortened Anthropic cache retention, and removed credential-bearing localhost debug requests.

Why: Production showed $246.77 of OpenRouter usage in seven days while the provider billing ledger captured only $8.32. Aggregate traces identified repeated Brain-operation agent loops, including a 1.26M-token request and scheduled pattern analysis running while the app was idle.

Impact: Normal chat and Mission work keep Claude Sonnet quality and full tools; explicit Power work keeps Opus 4.8, high reasoning, and 1M context. Default runtime context is 65K, ordinary outputs are bounded, stale tool results prune after five minutes, and the preassembled pattern workflow cannot recursively call tools.

Files: `docker/openclaw.json`, `apps/openclaw/src/agents/pi-embedded-runner/run.ts`, `apps/openclaw/src/gateway/openresponses-http.ts`, `apps/agent-api/src/modules/brain/services/brain-reranker.service.ts`, `apps/agent-api/src/modules/brain/services/brain-reranker-deterministic.ts`, `apps/agent-api/src/modules/chat/services/anthropic-claude-admin-auth.service.ts`, `apps/agent-api/src/modules/chat/services/openclaw-model-routing.ts`, `apps/mission-worker/src/modules/brain-ops/brain-ops.processor.ts`, `apps/mission-worker/src/modules/missions/services/gateways/mission-openclaw.gateway.ts`, `packages/api-shared/src/services/model-strategy.ts`, `documentation/features/chat-stream-recovery.md`, `documentation/features/missions.md`, and focused regression tests.

## [2026-07-26 11:01] - [FIX]

What: Added an abortable 30-second timeout around the mission worker's internal plan-creation callback, with a focused regression test for a callback that never resolves, and documented the recovery contract.
Why: Static and IG organic video acceptance missions could remain in Planning indefinitely when the internal API callback stalled after the plan was generated.
Impact: A stalled callback now enters the existing mission retry and failure lifecycle instead of permanently blocking rendering, Media registration, and Deliverables.
Files: `apps/mission-worker/src/config/configuration.ts`, `apps/mission-worker/src/modules/missions/services/phases/mission-plan-phase.service.ts`, `apps/mission-worker/src/modules/missions/services/phases/mission-plan-phase.service.test.ts`, `documentation/features/missions.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-07-26 12:12] - [FIX]

What: Moved Missions view column-width persistence from the outer list mouse-up handler to the end of an actual changed column-resize gesture, carrying the exact final column width into the saved view.
Why: Selecting or expanding a mission released the pointer inside the list and unintentionally attempted to save the view, producing a false "Couldn't save view" toast.
Impact: Ordinary mission interactions no longer patch the view. A completed resize persists once even when the pointer is released outside the list, while a zero-change resize does not persist.
Files: `apps/web/src/features/mission-control/components/MissionList.tsx`, `apps/web/src/features/mission-control/components/MissionList.test.tsx`, `apps/web/src/features/spaces/components/MissionsViewListContent.tsx`, `apps/web/src/features/spaces/components/useMissionsViewColumns.ts`, `apps/web/src/features/spaces/components/useMissionsViewColumns.test.tsx`, `apps/web/src/features/spaces/components/useMissionsViewListState.ts`

## [2026-07-26 12:20] - [FIX]

What: Detached a failed native Postgres pool from the mission worker before awaiting pool shutdown.
Why: A direct-database transport failure left the ending pool visible to concurrent mission jobs, which then repeatedly failed with "Cannot use a pool after calling end on the pool."
Impact: Concurrent work immediately falls back to the existing Supabase HTTP path while the failed pool closes, instead of acquiring a dead pool and blocking mission scheduling, outbox dispatch, and lifecycle synchronization.
Files: `apps/mission-worker/src/lib/services/database.service.ts`, `apps/mission-worker/src/lib/services/database.service.test.ts`, `documentation/features/missions.md`

## [2026-07-26 12:20] - [FIX]

What: Updated the IG organic video production skill to invoke its bundled Pillow renderer from the exact materialized agent-workspace path.
Why: The prior relative path was interpreted from the mission working directory, where the renderer does not exist, so agents substituted document logs for rendered MP4 deliverables.
Impact: Video missions can execute the synchronized renderer deterministically and proceed to FFmpeg composition, visual verification, Media registration, and distinct video Deliverables.
Files: `supabase/migrations/20260726122500_ig_organic_video_renderer_path.sql`, `apps/agent-api/src/modules/agent-sync/services/ig-organic-video-ad-skill-contract.test.ts`, `documentation/features/missions.md`
