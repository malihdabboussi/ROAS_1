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

## [2026-07-26 12:24] - [FEATURE]

What: Promoted Opus 5 medium to the quality default, assigned GPT-5.6 Terra low to Economy and Fable 5 medium to Power/high-stakes Brain synthesis, retained Sonnet 4.6 as the stable fallback, and registered Sonnet 5 plus GPT-5.6 Sol as non-default experiments. Added compact-first Customer Brain analysis with bounded targeted historical retrieval and conditional Fable review, raised Brain reranking from minimal to low reasoning, corrected trace model attribution, and added on-demand real-output efficiency reporting plus a repeatable paid model benchmark.

Why: The benchmark and production-cost audit showed that quality depends more on task routing, prompt fit, and evidence discipline than model recency alone. Routine jobs were paying to carry excessive context and tools, while high-impact worldview synthesis needed a stronger review path and retained access to precise older evidence.

Impact: Normal quality work receives Opus 5 with a 250K context ceiling; routine Customer Brain passes remain tool-free and escalate only when evidence or lifecycle risk requires it; full-worldview work keeps targeted retrieval tools; Fable cost is reserved for consequential synthesis; production traces record the model actually used; and future model changes can be evaluated against real task cost, latency, failures, feedback, and sampled outputs.

Files: `packages/api-shared/src/services/model-strategy.ts`, `docker/openclaw.json`, `apps/mission-worker/src/modules/brain-ops/brain-ops.processor.ts`, `apps/mission-worker/src/modules/missions/services/gateways/mission-openclaw.gateway.ts`, `apps/mission-worker/src/modules/missions/services/mission-tracing.service.ts`, `apps/agent-api/src/modules/brain/services/brain-reranker.service.ts`, model registries and UI strategy labels, `docker/agents/templates/brain_scholar/skills/customer-brain-pattern-analysis/SKILL.md`, `supabase/migrations/20260726123000_customer_brain_targeted_evidence.sql`, `scripts/evals/model-efficiency-report.mjs`, `scripts/evals/model-quality-benchmark.mjs`, feature documentation, and focused regression tests.

## [2026-07-26 12:42] - [FIX]

What: Added a deterministic server-side `process_media` operation that renders approved IG Story sticker copy with the bundled Pillow layout, Montserrat ExtraBold Italic, Apple Color Emoji, and FFmpeg, then persists the exact 10-second H.264/AAC MP4 to campaign Media.
Why: Production mission agents intentionally have no shell execution, so the prior skill instruction could locate the bundled renderer but could not execute it; agents substituted documents and never produced video deliverables.
Impact: IG organic video missions can now turn clean source videos into registered 1080x1920 MP4s through an existing validated, circuit-broken action without gaining shell access. The production skill forbids document substitutes and requires the returned media evidence.
Files: `apps/agent-api/src/modules/artifacts/scripts/render_ig_story.py`, `apps/agent-api/src/modules/artifacts/services/artifact-ig-story-renderer.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-ig-story-preflight.ts`, media action schema/preflight/processing files and tests, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/agent-api/src/modules/agent-sync/services/ig-organic-video-ad-skill-contract.test.ts`, `docker/Dockerfile`, `supabase/migrations/20260726124500_ig_organic_video_server_renderer.sql`, and `documentation/features/missions.md`.

## [2026-07-26 13:08] - [FIX]

What: Added Static Ad Production and IG Organic Video to the global Missions playbook selector, routed both through their existing canonical payload builders, added required production inputs and submission guards, and migrated the touched selector to the standard Radix dialog shell and button hierarchy.
Why: The deterministic playbooks existed in the worker and Ads Research handoff, but the Space-level Start playbook dialog recognized only Webinar and Meta workflows, making direct static/video playbook acceptance impossible.
Impact: Users can start one or more production-ready static ads or exact-scene IG Story videos directly from a campaign Space without falling back to a generic Mission. Existing Webinar and Meta workflows are unchanged.
Files: `apps/web/src/features/spaces/components/StartPlaybookModal.tsx`, `apps/web/src/features/spaces/components/StartAdProductionPlaybookFields.tsx`, `apps/web/src/features/spaces/components/StartPlaybookModal.test.tsx`, `apps/web/src/features/spaces/components/MissionsView.tsx`, `documentation/features/missions.md`.

## [2026-07-26 13:25] - [FEATURE]

What: Added an admin-only AI usage dashboard to the current web app with provider-route totals, OpenRouter workload and underlying-model detail, model workload, highest-cost traces, billing reconciliation coverage, and token-waste signals.

Why: AI usage and provider spend were split across trace, billing-attempt, and reconciliation records, making it difficult to see which integration processed work or identify expensive unproductive activity without querying production data manually.

Impact: Admins can review one, seven, or thirty days of model-family traces and provider-ledger usage at `/admin/ai-usage`. The report calls out oversized contexts, failed paid traces, unlinked or unsettled provider attempts, missing trace usage, and stale reconciliation without changing model routing or output quality.

Files: `apps/api/src/modules/admin`, `apps/web/src/app/(dashboard)/admin/ai-usage/page.tsx`, `apps/web/src/features/admin-ai-usage`, `apps/web/src/components/layout/sidebar/SidebarHqMoreFlyoutBody.tsx`, `apps/web/src/middleware.ts`, and `documentation/features/chat-stream-recovery.md`.

## [2026-07-26 13:34] - [FIX]

What: Normalized generated 4:5 and 9:16 images to 1080×1350 and 1080×1920 before Media registration, persisted measured image dimensions, and made static mission output verification reject mismatched pixels.
Why: Production acceptance produced an 896×1120 PNG while the agent and independent mission reviewer both claimed it was 1080×1350 because the contract trusted narrative evidence and Media stored no dimensions.
Impact: Static-ad missions now deliver canonical placement pixels, Media and Deliverables carry authoritative width/height evidence, and a provider-size regression triggers corrective execution instead of a false pass.
Files: `apps/agent-api/src/modules/artifacts/services/artifact-generated-image-normalizer.ts`, image generation/upload/result services and tests, `apps/mission-worker/src/modules/missions/playbooks/static-ad-production.playbook.ts`, mission deliverable contract evaluation and tests, `documentation/features/missions.md`.

## [2026-07-26 13:51] - [FIX]

What: Gave the AI usage dashboard its own full-height vertical scroll region inside the fixed dashboard shell.

Why: The shared shell intentionally hides page-level overflow, but the new long-form admin dashboard did not establish the inner scroll container required by that layout contract.

Impact: Admins can scroll through provider, efficiency, model, and costly-trace tables on desktop and mobile without changing other dashboard surfaces.

Files: `apps/web/src/features/admin-ai-usage/containers/AdminAiUsageDashboard.tsx`.

## [2026-07-26 14:01] - [FIX]

What: Changed IG Organic Video missions to require the final `process_media` Story render, made successful mission-session renders create native video Deliverables with authoritative 1080×1920 and 10-second metadata, and explicitly constrained footage resolution to preset reuse or the direct Higgsfield MCP.
Why: Production acceptance showed the playbook contract still required `generate_video`, which sent both scenes through Google Veo, accepted raw generation placeholders, and left the deterministic rendered MP4 path unable to satisfy the mission Deliverables contract.
Impact: Preset footage is reused, only missing presets spend Higgsfield generation, Google/Veo cannot substitute for the required source path, and only final deterministic Story MP4s registered in both Media and Deliverables can complete the mission.
Files: `apps/mission-worker/src/modules/missions/playbooks/ig-organic-video-ad.playbook.ts`, its focused test, `apps/agent-api/src/modules/artifacts/services/artifact-media-processing.service.ts`, `artifact-media-processing-persistence.service.ts`, `artifact-ig-story-mission-deliverable.service.ts`, the media-processing test, and `documentation/features/missions.md`.

## [2026-07-26 14:04] - [FIX]

What: Removed the unsupported “Anthropic direct” claim from AI usage reporting and separated verified provider-ledger routes from trace-only model families.

Why: Claude, Gemini, and OpenAI model identifiers identify a model family but do not prove whether transport used a direct API, subscription credential, or OpenRouter. Production provider records showed only OpenRouter calls during the reviewed window.

Impact: Provider cards now identify verified calls and costs only when billing-attempt evidence exists. Legacy or uninstrumented traces are labeled as model-family-only with their provider route explicitly unrecorded.

Files: `apps/api/src/modules/admin/services/admin-ai-usage.service.ts`, `apps/api/src/modules/admin/services/__tests__/admin-ai-usage.service.test.ts`, `apps/api/src/modules/admin/types/admin-ai-usage.types.ts`, `apps/web/src/features/admin-ai-usage/components/AiUsageSummary.tsx`, `apps/web/src/features/admin-ai-usage/components/AiUsageTables.tsx`, `apps/web/src/features/admin-ai-usage/types/admin-ai-usage.types.ts`, and `documentation/features/chat-stream-recovery.md`.
