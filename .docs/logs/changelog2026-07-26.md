# Changelog - July 26, 2026

## [2026-07-26 15:00] - [FIX]

What: Moved OpenRouter image generation to its dedicated image API, added explicit provider-output validation states to the billing ledger, verified ambiguous paid results through OpenRouter generation metadata, stopped agent retries when provider effect may already have occurred, and surfaced paid invalid outputs in the admin AI usage report.

Why: OpenRouter could successfully generate and bill an image while Vibey failed to parse the returned shape, causing the failure to look retryable and allowing thousands of duplicate paid requests.

Impact: Image success now requires validated image bytes. Paid or possibly-paid invalid output is recorded independently from settlement, emits a terminal media-generation error, preserves safe response-shape and provider verification evidence, and is visible to admins without storing image bytes in billing metadata.

Files: `packages/api-shared/src/services/provider-billing`, `apps/api/src/modules/provider-billing`, `apps/api/src/modules/media/integrations/gemini-image.integration.ts`, `apps/agent-api/src/modules/artifacts/services`, `apps/agent-api/src/modules/billing/services/provider-billing-attempts.service.ts`, `apps/api/src/modules/admin`, `apps/web/src/features/admin-ai-usage`, and `documentation/features/chat-stream-recovery.md`.

## 2026-07-26 13:18 - [FIX]

What: Kept the image history rail mounted while switching versions, limited selection changes to the main preview and active outline, made the artifact editor replace the existing right work surface, made the expanded editor close action return to its docked state, and changed generated-image chat previews to show the full image without a caption card. OpenRouter image generation now retries one malformed successful response inside the provider boundary.

Why: Selecting a thumbnail reloaded the entire history menu, the editor could compete with Agenda or another right-side surface, expanded close discarded the editor, chat previews cropped generated images, and an empty OpenRouter success body forced Pixel into a visible second tool attempt.

Impact: Version browsing feels immediate and stable, right-side work remains mutually exclusive and recoverable, generated images are visible in full, and transient provider response corruption is repaired before it reaches the agent.

Files: `apps/web/src/features/studio/components/preview/ShellMediaArtifactViewer.tsx`, `apps/web/src/features/studio/components/preview/ShellMediaHistoryRail.tsx`, `apps/web/src/components/shell/ShellArtifactViewerPanel.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellWorkAreaControl.tsx`, `apps/web/src/components/shell/use-shell-store.ts`, `apps/web/src/components/chat/GeneratedMedia.tsx`, `apps/web/src/features/studio/components/chat/InlineImageGen.tsx`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-provider.service.ts`, focused tests, and `documentation/features/claude-chatgpt-shell.md`.

## 2026-07-26 12:43 - [STYLE]

What: Refined the shared image editor with stable chronological history selection, a scroll-following highlighted version, a multi-shape aspect-ratio control and explanatory menu, icon-led open destinations, and a compact floating edit composer with voice transcription.

Why: Selecting an older image moved it to the top of history, destination actions were visually ambiguous, aspect-ratio choices lacked context, and the edit input did not match the polished chat editing experience.

Impact: Image versions stay in a predictable timeline, the active version remains visible without reordering, aspect and destination actions are easier to scan, and users can type, attach a reference, or dictate an edit from the same compact control.

Files: `apps/web/src/components/media/MediaImageEditComposer.tsx`, `apps/web/src/components/media/aspect-ratio-menu.tsx`, `apps/web/src/features/studio/components/preview/ShellMediaArtifactViewer.tsx`, `apps/web/src/features/studio/components/preview/ShellMediaImageActions.tsx`, `apps/web/src/features/studio/components/preview/ShellMediaArtifactViewer.test.tsx`, `apps/web/src/lib/config/media-toast-errors.config.ts`, and `documentation/features/claude-chatgpt-shell.md`.

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

## [2026-07-26 14:35] - [FIX]

What: Added `process_media` operation `render_static_ad`, which loads one approved static-ad-book template, safely materializes exact copy, renders a canonical PNG with pinned Anton/Inter fonts and Chromium, registers campaign Media, and creates one native image Deliverable. Static missions now require that final action, and output verification enforces `exact_count` instead of accepting extra matching artifacts.

Why: Production acceptance proved the static playbook's final contract still pointed at `generate_image`, so the agent substituted Gemini for the unavailable shell renderer, altered exact copy, and left three draft images while an exact-one contract falsely passed.

Impact: AI image generation can provide clean source imagery but cannot satisfy the final static contract. A static mission completes only with the requested number of deterministic 1080×1350 or 1080×1920 PNGs, each represented once in Media and Deliverables.

Files: Agent API static renderer, media processing schema/preflight/persistence/docs/tests, mission-worker static playbook and exact-count verifier/tests, pinned renderer fonts in `docker/Dockerfile`, `supabase/migrations/20260726215000_static_ad_server_renderer.sql`, and `documentation/features/missions.md`.

## [2026-07-26 15:00] - [FIX]

What: Packaged the IG Story Pillow renderer at a stable production path, configured the Agent API to use that exact path, and added an image-build readability check plus a focused packaging regression test.
Why: Production acceptance reached `process_media/render_ig_story`, but the compiled service resolved beneath `dist/apps/agent-api/src` while the Docker image copied the Python asset beneath `dist/modules`, so the runtime could not open the renderer.
Impact: Fly image builds now fail immediately if the renderer is absent, and successful images invoke the same explicit renderer path regardless of TypeScript output layout.
Files: `docker/Dockerfile`, `apps/agent-api/src/modules/artifacts/services/artifact-runtime-packaging.test.ts`

## [2026-07-26 15:24] - [FIX]

What: Made IG Story post-render QA explicitly visual-only by requiring `analyze_video` with frame extraction enabled and transcription disabled, and clarified the generic video-analysis action guidance.
Why: Production acceptance produced both correct final MP4s, but the agent used `analyze_video`'s transcript-enabled default for visual QA and blocked on an unrelated, unconfigured Deepgram dependency.
Impact: Final-frame QA uses FFmpeg frame extraction without requiring a speech provider; Deepgram remains opt-in only when a spoken-audio transcript is actually requested.
Files: `supabase/migrations/20260726222500_ig_organic_video_visual_qa.sql`, IG video playbook and contract tests, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `documentation/features/missions.md`
## [2026-07-26 16:09] - [FIX]

What: Seeded verified capability and pricing contracts for Claude Opus 5, Claude Sonnet 5, GPT-5.6 Sol, and GPT-5.6 Terra, then aligned Auto and Economy routing to supported 300K and 272K context tiers.
Why: Production Chat accepted the request but ended its stream immediately because Auto routed to Opus 5 with model settings while `llm_model_capabilities` had no Opus 5 row; the newly introduced routed models had never been seeded.
Impact: Auto, Economy, and Power Chat requests validate against an explicit capability tier before provider execution, and regression coverage fails if the strategy or capability migration drifts again.
Files: `packages/api-shared/src/services/model-strategy.ts`, its test, `apps/agent-api/src/modules/chat/services/model-strategy-capability-contract.test.ts`, `apps/agent-api/src/modules/chat/services/chat.service.access-context.test.ts`, `supabase/migrations/20260726230500_model_strategy_capabilities.sql`, `scripts/roas/migration-order.txt`, `.docs/plans/agent-follow-up-work.md`, and `documentation/features/chat-stream-recovery.md`.

## 2026-07-26 11:08 - [STYLE]

What: Unified shell navigation and Home destination presentation, added independent chat-history collapse and restoration, surfaced real Favorites in Home, fixed chat filter layering and conversation selection behavior, aligned Inbox controls and metadata, and prevented duplicate global and agent-detail chat composers.

Why: The shell mixed flyout scales, card and page layouts, native-looking empty selectors, overlapping menus, coupled resize boundaries, and duplicate chat surfaces. These inconsistencies made common navigation and review flows feel unstable.

Impact: AI chat and right-side work surfaces now move predictably, Home destinations use cohesive full-page layouts, chat history can be hidden without closing the active chat, pinned work is reachable from Home, and agent details expose one authoritative composer.

Files: `apps/web/src/components/shell/*`, `apps/web/src/components/layout/sidebar/*`, `apps/web/src/components/conversations/ChatHistoryFilterMenu.tsx`, `apps/web/src/components/notifications/InboxFeed.tsx`, `apps/web/src/features/home/components/*`, `apps/web/src/features/studio/components/AllChatsPage.tsx`, `apps/web/src/features/team-2/components/Team2DetailView.tsx`, `apps/web/src/app/(dashboard)/home/*`, `documentation/features/claude-chatgpt-shell.md`

## 2026-07-26 10:33 - [FIX]

What: Made calendar writes account-explicit, removed implicit recent-campaign scope from Slack conversations, preserved Slack thread ancestry for agent replies, and taught the generated agent contract to answer organization-wide campaign performance questions across accessible client campaigns.

Why: Pixel guessed calendar identity, answered portfolio questions from one ambient campaign, and lost the proactive root message behind short Slack follow-ups.

Impact: Calendar creation now returns the exact connected account used and cannot silently fall back from an unavailable requested account. Slack follow-ups retain their source thread, while broad campaign questions compare the organization portfolio and distinguish missing data from KPI failures.

Files: `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/agent-api/src/modules/agent-sync/services/vibey-api-skill-generator.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-calendar.service.ts`, `apps/api/src/modules/integrations/services/integrations-calendar-connections.ts`, `apps/api/src/modules/integrations/services/integrations-calendar-mutations.ts`, `apps/api/src/modules/integrations/services/integrations-calendar.service.ts`, `apps/api/src/modules/slack/repositories/slack-runtime.repository.ts`, `apps/api/src/modules/slack/services/slack-service-conversation.base.ts`, `apps/api/src/modules/slack/services/slack-service-events.base.ts`, focused tests, and `documentation/features/integration-connections.md`.

## 2026-07-26 11:16 - [FEATURE]

What: Added a visible, removable context chip to the global chat composer, added an adjacent context selector for restoring or replacing Team, Brain, Campaign, and Flows context, and unified route attachment, agent recommendations, and model runtime context behind the same store state.

Why: Chat context was invisible and recommendations were inferred from the URL, so a user could not see or remove what the model was using and stale fields could survive when moving between surfaces.

Impact: Opening a supported product surface attaches it visibly; removing the chip immediately returns chat to General and removes the related recommendation and awareness payload; adding context restores the attachment without leaving the chat.

Files: `apps/web/src/components/global-chat/components/ChatSurfaceRecommendation.tsx`, `apps/web/src/components/global-chat/components/GlobalChatComposerFooter.tsx`, `apps/web/src/components/global-chat/config/work-context.config.ts`, `apps/web/src/components/global-chat/config/work-context.config.test.ts`, `apps/web/src/components/global-chat/containers/GlobalChatPanel.tsx`, `apps/web/src/components/global-chat/store/use-global-chat-store.ts`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.types.ts`, and `documentation/frontend-shared-surfaces.md`.

## 2026-07-26 12:00 - [FEATURE]

What: Turned the shared image viewer into a functional conversation-aware editing studio, routed GPT image edits through the same multimodal provider path as chat, added multi-image references and Portrait 3:4 support, moved aspect ratios and file actions into the top toolbar, restored the real Canva handoff, and fixed expanded portrait-image sizing.

Why: Direct editor prompts were sent to a Gemini-only integration even when ChatGPT Images was selected, so edits and ratio changes failed while the same request worked in chat. The viewer also lost source-chat history, opened downloads in a tab, and expanded over or beyond the application shell.

Impact: Images from chat, Campaigns, and Spaces now open one consistent mini-studio. Prompt edits, reference-image edits, and ratio versions persist to the originating conversation; the version rail stays scoped to that chat; download returns a file; tall images fit in the viewport; and users can open the image in a new tab, Canva, or its source chat.

Files: `apps/api/src/modules/media/dto/index.ts`, `apps/api/src/modules/media/integrations/gemini-image.integration.ts`, `apps/api/src/modules/media/integrations/openrouter-image-generation.ts`, `apps/api/src/modules/media/repositories/media.repository.ts`, `apps/api/src/modules/media/services/media-service-01.base.ts`, `apps/api/src/modules/media/services/media-service-02.base.ts`, `apps/web/src/components/media/*`, `apps/web/src/components/shell/ShellArtifactViewerPanel.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/features/spaces/views/media/MediaImageWorkspace.tsx`, `apps/web/src/features/studio/components/preview/ShellMediaArtifactViewer.tsx`, `apps/web/src/features/studio/components/preview/ShellMediaImageActions.tsx`, `apps/web/src/lib/services/media-api.ts`, focused tests, and `documentation/features/claude-chatgpt-shell.md`.

## 2026-07-26 11:58 - [STYLE]

What: Made the top-left AI Chat control permanently labeled and purple, hid the page expand/contract control when no page/chat relationship exists, moved visible work context into the composer footer beside Auto, removed the competing work-area width transition, corrected My Tasks search-input icon geometry, and bound jest-dom matchers to the app's active Vitest instance.

Why: The shell exposed a page-collapse action with nothing to collapse, context floated above the composer, two simultaneous animations made right-side pages appear to enter from both directions, and the My Tasks search placeholder overlapped its icon.

Impact: AI Chat remains discoverable in either drawer state, full-page chat closes back to Home, right-side work surfaces use one right-anchored reveal, context stays inside the input controls, My Tasks search text is legible, and focused DOM regressions execute instead of failing on missing matcher registration.

Files: `apps/web/src/components/shell/ShellTopBar.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/global-chat/components/GlobalChatComposerFooter.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/home/components/MyTasksPanel.tsx`, `apps/web/tests/setup.ts`, focused tests, and `documentation/features/claude-chatgpt-shell.md`.

## 2026-07-26 12:05 - [FIX]

What: Replaced the separate Team agent-chat runtime with the canonical shell chat, selected the opened agent automatically, filtered the left conversation history to that agent, attached Team as removable chat context, and removed the obsolete duplicate Team chat components.

Why: Team agent pages and the main AI Chat used different runtimes, so agent selection, history, and route context could diverge even though they represented the same conversation system.

Impact: Opening an agent now shows the same chat experience used everywhere else, scoped to that agent's conversations, while retaining the agent profile in the work area. Moving through Team keeps its context visible and removable in the composer.

Files: `apps/web/src/features/team-2/components/Team2DetailView.tsx`, `apps/web/src/features/team-2/components/Team2ManageContent.tsx`, `apps/web/src/features/team-2/components/Team2DetailView.test.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, removed `apps/web/src/features/team-2/components/Team2AgentChatWithConversations.tsx`, removed `apps/web/src/features/team-2/components/tabs/ChatTab.tsx`, and `documentation/features/claude-chatgpt-shell.md`.

## 2026-07-26 12:07 - [STYLE]

What: Made the AI Chat drawer icon reflect the action available in each state: expand while the drawer is collapsed and collapse while it is expanded.

Why: Reusing one static drawer icon made it unclear whether the control would open or close the AI Chat area.

Impact: The top-left AI Chat control now gives an immediate, accurate visual cue without changing its label, size, or behavior.

Files: `apps/web/src/components/shell/ShellTopBar.tsx`, `apps/web/src/components/shell/ShellTopBar.test.tsx`.

## 2026-07-26 12:15 - [STYLE]

What: Consolidated the chat work-context label, remove action, and add/change action into one compact composer control; added human-readable hover details for Team, agent, Space/campaign, Brain, Flows, and Slack-channel context; and made the empty Add context action transparent.

Why: Separate context and add buttons made it unclear which information would reach the selected agent, while the empty control looked heavier than the rest of the composer chrome.

Impact: Users can see one attached context, understand exactly what it contributes before sending, remove it with `×`, or open the context picker with `+`. With nothing attached, the composer stays visually clean.

Files: `apps/web/src/components/global-chat/components/GlobalChatComposerFooter.tsx`, `apps/web/src/components/global-chat/config/work-context.config.ts`, `apps/web/src/components/global-chat/config/work-context.config.test.ts`, and `documentation/features/claude-chatgpt-shell.md`.

## 2026-07-26 13:05 - [STYLE]

What: Made the work-area wrapper the single owner of page reveal motion, removed the inner page transform, made chat-history search collapse on outside click, made visible filter chips control the actual history query, kept Pixel's default history unfiltered, compacted the context and filter controls, retained the Team agent grid behind right-side agent details, and removed Pixel's role subtitle.

Why: Separate wrapper and card animations made the right page feel detached, while hidden/default filters and decorative chip removal made chat history state unclear.

Impact: The right page now moves as one cohesive surface. Search, filters, agent selection, context, and agent details visibly match the state the chat runtime is actually using.

Files: `apps/web/src/app/globals.css`, `apps/web/src/components/conversations/*`, `apps/web/src/components/global-chat/components/GlobalChatComposerFooter.tsx`, `apps/web/src/components/shell/ShellChatDrawer.tsx`, `apps/web/src/components/shell/ShellChatMenu.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/features/spaces/components/chat/SpaceChatAgentEmptyState.tsx`, `apps/web/src/features/spaces/components/chat/SpaceChatAgentPicker.tsx`, `apps/web/src/features/team-2/components/Team2DetailView.tsx`, `apps/web/src/features/team-2/components/Team2ManageContent.tsx`, focused tests, and `documentation/features/claude-chatgpt-shell.md`.

## 2026-07-26 14:10 - [FIX]

What: Kept organization-managed Person Brain names and avatars synchronized with their immutable linked Slack identity, and added a Team → People action that starts the existing shared 90-day Person Brain history backfill.

Why: Slack profile renames left stale Brain labels and broken avatars, while creating a Person Brain only provisioned an empty container and gave admins no visible way to start historical channel ingestion.

Impact: Anees changing his Slack profile to Alex updates the same linked Brain without merging Alex Pierce or any other same-name person. Admins can explicitly populate eligible Person Brains from enabled mapped Slack channels, while Ignored people and DMs remain excluded and recurring compounding stays incremental.

Files: `supabase/migrations/20260726143000_sync_slack_person_brain_profiles.sql`, `apps/web/src/features/team-2/components/people/SlackPeopleHeader.tsx`, `apps/web/src/features/team-2/components/people/SlackPeopleView.tsx`, `apps/web/src/features/team-2/components/people/SlackPeopleView.test.tsx`, `apps/web/src/features/team-2/hooks/use-slack-people.ts`, `apps/web/src/features/team-2/services/slack-people.service.ts`, `apps/web/src/features/team-2/config/messages.config.ts`, and `documentation/features/integration-connections.md`.

## 2026-07-26 14:20 - [STYLE]

What: Moved the collapsed chat-history restore control out of the chat canvas and replaced it with a tiny purple right arrow centered on the R-logo sidebar border, half inside and half outside the menu. Aligned it with a matching purple left-arrow collapse control so opening and closing history reads as one control moving with the drawer.

Why: The original floating control covered Pixel's profile image, while reserving a full collapsed rail consumed unnecessary horizontal space.

Impact: Collapsed chat history remains easy to restore from the exact sidebar boundary without covering the active agent identity, adding a container above Home, or leaving a column of dead space. Both drawer states now use the same size, color, and arrow language on one horizontal line.

Files: `apps/web/src/components/layout/sidebar/SidebarHqRail.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqSection.test.tsx`, `apps/web/src/components/shell/ShellChatDrawer.tsx`, `apps/web/src/components/shell/ShellChatDrawer.test.tsx`, `apps/web/src/components/shell/ShellChatMenu.tsx`, `apps/web/src/components/shell/ShellChatMenuActiveFilters.tsx`, and `apps/web/src/components/shell/ShellChatMenu.test.tsx`.

## 2026-07-26 14:36 - [FIX]

What: Unified typed channel mentions with the full organization roster, added a confirmation flow that preselects non-member agents or portal users before sending, preserved structured mention metadata from both typed text and editor chips, split Agents into their own entity-picker tab, added Internal, External, and Portal user filters to People, fixed thread panels being rendered outside the clipped channel viewport, and removed ChannelChat's obsolete oversized-file exception after the component dropped below its architecture limit.

Why: Typing `@vibey` only searched existing channel memberships, so it posted plain text and never invoked the agent, while selecting Vibey from the picker produced the structured mention required by the agent runtime.

Impact: Typed and selected mentions now use the same invocation path. If an addable mentioned participant is not yet in the channel, the existing add-members dialog opens with that participant selected and the message sends only after confirmation. The entity picker now makes agents and each people category explicit, and clicking a reply summary visibly opens its thread instead of placing the panel beyond the right edge.

Files: `apps/api/src/modules/entity-search/*`, `apps/web/src/components/channels/AddPeopleToChannelModal.tsx`, `apps/web/src/features/channels/components/*`, `apps/web/src/features/channels/containers/ChannelChatContainer.tsx`, `apps/web/src/features/channels/lib/*`, `apps/web/src/features/channels/services/entity-search.service.ts`, `scripts/arch/loc-allowlist.json`, and focused tests.

## 2026-07-26 14:49 - [FIX]

What: Replaced the work-area switcher's generic “Current page” entry with the active page's real name and added session history for recently viewed pages alongside recent artifacts.

Why: The control only remembered artifact previews, so it could neither identify the active destination nor return users to other pages they had visited.

Impact: The menu now names destinations such as Agenda, Inbox, Meetings, My Tasks, Skills, and active Campaign Spaces, keeps recently viewed pages unique and ordered by recency, and switches directly back to the selected page.

Files: `apps/web/src/components/shell/ShellTopBar.tsx`, `apps/web/src/components/shell/ShellWorkAreaControl.tsx`, `apps/web/src/components/shell/use-shell-store.ts`, and focused tests.

## 2026-07-26 14:51 - [STYLE]

What: Removed the visible container from both chat-history controls and positioned the collapsed restore chevron outside the ROAS rail's layout.

Why: The purple pill made the collapsed rail look wider and shifted the otherwise centered ROAS logo.

Impact: The ROAS logo stays centered in both drawer states while a small purple chevron remains available to expand or collapse chat history.

Files: `apps/web/src/components/layout/sidebar/SidebarHqRail.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqSection.test.tsx`, `apps/web/src/components/shell/ShellChatMenu.tsx`, and `apps/web/src/components/shell/ShellChatMenu.test.tsx`.

## 2026-07-26 15:14 - [FIX]

What: Made chat-history selection publish the exact conversation to the canonical chat store before the drawer opens, made the chat panel wait for and merge that selected row before resolving its saved agent, kept the shell image-viewer event adapter mounted while its panel is hidden, removed the page's forced flex layout while the editor replaces it, and routed image URL resolution exclusively through the existing authenticated media backend.

Why: A newly created Lux conversation could be missing from the panel's stale local page on the first click, while the image-open listener was mounted only after an image target already existed. The work page's custom flex class also overrode the generic hidden utility, leaving Agenda visible as an unintended third pane.

Impact: Lux and other agent conversations load with the correct history and agent on the first click. Clicking either a generated image preview or its output card now opens the image editor in place of the current work page, including for older images; closing the editor restores the still-mounted page.

Files: `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellWorkspace.test.tsx`, `apps/web/src/components/shell/ShellChatMenu.tsx`, `apps/web/src/components/shell/ShellChatMenu.test.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.logic.ts`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.logic.test.ts`, `apps/web/src/lib/services/media-api.ts`, and `documentation/features/claude-chatgpt-shell.md`.
## [2026-07-26 17:02] - [FIX]

What: Routed Chat-created mission `playbook` aliases through the deterministic playbook registry, expanded top-level IG video kickoff payloads, added media output-contract guidance and hard `process_media` consistency preflight, and tolerated transient lease-renewal failures until the active lease expires.
Why: Production Chat acceptance bypassed the requested IG playbook, generated an impossible `process_media` plus `doc` contract, and then aborted both corrective renders after a temporary Supabase timeout even though their 90-second execution leases were still valid.
Impact: Chat and UI playbook launches now share the same deterministic media contract, malformed media contracts replan before artifact work begins, and short database interruptions no longer destroy otherwise healthy long-running renders.
Files: `apps/mission-worker/src/modules/missions/playbooks/mission-playbook.registry.ts`, `apps/mission-worker/src/modules/missions/playbooks/ig-organic-video-ad.playbook.ts`, `apps/mission-worker/src/modules/missions/services/phases/mission-plan-phase.service.ts`, `apps/mission-worker/src/modules/missions/services/gateways/mission-openclaw.gateway.ts`, `apps/mission-worker/src/modules/missions/services/phases/mission-execute-phase.service.ts`, `apps/mission-worker/src/modules/missions/services/phases/mission-execute-helpers.ts`, `apps/mission-worker/src/modules/missions/services/mission-execution-lease.ts`, focused regression tests, `documentation/features/missions.md`, and `.docs/plans/agent-follow-up-work.md`.

## [2026-07-26 17:38] - [FIX]

What: Added a canonical top-level `playbook_id` to the agent-facing `create_mission` schema, persisted it into mission input without dropping kickoff context, and aligned generated action guidance and drift coverage.

Why: Post-deploy production acceptance showed Chat calling `create_mission` with only title, priority, and brief even after the user explicitly named `ig-organic-video-ad`. The mission stored `input = {}` and remained in freeform planning, so downstream playbook alias resolution never had a value to resolve.

Impact: Chat agents now receive an explicit playbook field in the hard action contract and examples. A named playbook reaches `input.playbook_id`, allowing the deterministic planner to build the correct media contract.

Files: `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-missions.service.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, focused action/schema/drift tests, `documentation/features/missions.md`, and `.docs/plans/agent-follow-up-work.md`.

## [2026-07-26 18:08] - [FIX]

What: Normalized legacy and cached AI usage reports at the frontend service boundary by defaulting newly added image-output metrics before rendering.

Why: A newer admin dashboard could receive an older API or in-memory cache shape during local development or a mixed-version rollout, leaving `paidOutputInvalid` and `outputIssues` undefined and crashing the page.

Impact: AI Usage remains renderable across rollout version skew, and both fresh and already-cached legacy reports safely show zero for image-output metrics that were not previously reported.

Files: `apps/web/src/features/admin-ai-usage/services/admin-ai-usage.service.ts`, `apps/web/src/features/admin-ai-usage/services/admin-ai-usage.service.test.ts`.

## [2026-07-26 19:00] - [FEATURE]

What: Added preset and custom UTC date ranges, equal-length previous-period comparisons, metric sparklines, and a daily provider-spend chart stacked by model to the current-app admin AI usage dashboard.

Why: The existing report exposed only rolling current-window totals, so admins could not inspect exact calendar ranges, distinguish daily spend by resolved model, or compare usage with the immediately preceding period.

Impact: `/admin/ai-usage` now supports inclusive one- to 366-day reporting with continuous daily series and compatibility defaults for mixed-version rollouts. Provider billing attempts remain authoritative for spend and request analytics, while traces remain authoritative for tokens and failures; all existing route, opportunity, reconciliation, workload, and costly-trace detail remains available.

Files: `apps/api/src/modules/admin/controllers/admin-ai-usage.controller.ts`, `apps/api/src/modules/admin/services/admin-ai-usage.service.ts`, `apps/api/src/modules/admin/repositories/admin-ai-usage.repository.ts`, `apps/api/src/modules/admin/types/admin-ai-usage.types.ts`, backend tests, `apps/web/src/features/admin-ai-usage/`, and `documentation/features/chat-stream-recovery.md`.
