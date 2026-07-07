# Changelog - June 19, 2026

## [2026-06-19 01:11] - [ARCH]

What: Refreshed the Phase 2 `apps/agent-api` remediation plan from a live scan and completed Batch 1 Type A foldering for `public-agent`.
Why: Phase 2 needed a current baseline and the public-agent module still had root-level controller/service/guard files before deeper Type B/C remediation.
Impact: Public-agent routes and behavior stayed unchanged while controllers now live under `controllers/`, the service under `services/`, and the guard under `guards/`; remaining public-agent fat-controller work is explicitly queued for Type B.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/public-agent`, `scripts/arch/loc-allowlist.json`

## [2026-06-19 01:13] - [ARCH]

What: Completed Phase 2 Batch 2 Type A foldering for `project-runtime`.
Why: Project runtime controller/service files were still at the module root, blocking vertical-slice layer organization before Type B/C cleanup.
Impact: Project runtime routes and focused behavior tests stayed unchanged; controllers now live under `controllers/`, services under `services/`, and import consumers point at the new paths. Existing controller direct-access and artifact service LOC debt were logged for queued follow-up.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/project-runtime`, `apps/agent-api/src/modules/artifacts/services/artifact-projects.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts`

## [2026-06-19 01:17] - [ARCH]

What: Completed Phase 2 Batch 3 Type A foldering for `task-agent` and `channel-agent`.
Why: Both modules still had root-level controller/service layer files after the fresh Phase 2 scan.
Impact: Routes and focused task/channel agent behavior stayed unchanged while controllers now live under `controllers/` and services under `services/`. Existing oversized service/direct-access debt remains logged for queued Type C/D cleanup.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/task-agent`, `apps/agent-api/src/modules/channel-agent`, `scripts/arch/loc-allowlist.json`

## [2026-06-19 01:21] - [ARCH]

What: Completed Phase 2 Batch 4 Type B thinning for `public-conversations.controller.ts`.
Why: The public conversations controller was over the controller LOC limit and owned inline Supabase conversation/message access.
Impact: Public conversation behavior is now locked by focused tests, the controller is 101 LOC with no direct Supabase/client hits, and the moved data access is centralized in `PublicAgentService` for the queued Type C repository extraction.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/public-agent/controllers/public-conversations.controller.ts`, `apps/agent-api/src/modules/public-agent/services/public-agent.service.ts`, `apps/agent-api/src/modules/public-agent/public-conversations.controller.test.ts`, `scripts/arch/loc-allowlist.json`

## [2026-06-19 01:24] - [ARCH]

What: Completed Phase 2 Batch 5 Type B thinning for `public-chat.controller.ts`.
Why: The public chat controller was over the controller LOC limit and directly created Supabase clients for send/identify flows.
Impact: Public chat send and identify behavior are locked by focused tests, the controller is 166 LOC with no direct Supabase/client hits, and remaining public-agent data access is queued for Type C repository/provider extraction.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/public-agent/controllers/public-chat.controller.ts`, `apps/agent-api/src/modules/public-agent/services/public-agent-chat.service.ts`, `apps/agent-api/src/modules/public-agent/public-chat.controller.test.ts`, `apps/agent-api/src/modules/public-agent/public-agent.module.ts`, `scripts/arch/loc-allowlist.json`

## [2026-06-19 01:27] - [ARCH]

What: Completed Phase 2 Batch 6 Type B thinning for project-runtime file and app restart controllers.
Why: `project-files.controller.ts` and `project-apps-proxy.controller.ts` still owned direct project lookup/update/storage access after Type A foldering.
Impact: Both controllers are now thin route delegators with no direct Supabase/storage hits; project-runtime service-layer data access is isolated for the queued Type C repository/provider batch.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/project-runtime/controllers/project-files.controller.ts`, `apps/agent-api/src/modules/project-runtime/controllers/project-apps-proxy.controller.ts`, `apps/agent-api/src/modules/project-runtime/services/project-files.service.ts`, `apps/agent-api/src/modules/project-runtime/services/project-apps-proxy.service.ts`, `apps/agent-api/src/modules/project-runtime/project-runtime.module.ts`

## [2026-06-19 01:29] - [ARCH]

What: Completed Phase 2 Batch 7 Type B thinning for `brain-eval-probe.controller.ts`.
Why: The internal eval probe controller was over the controller LOC limit and owned direct brain table/count lookups.
Impact: Eval probe behavior is locked by focused tests, the controller is 41 LOC with no direct Supabase hits, and the isolated service data access is logged for later repository cleanup.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/brain/controllers/brain-eval-probe.controller.ts`, `apps/agent-api/src/modules/brain/services/brain-eval-probe.service.ts`, `apps/agent-api/src/modules/brain/brain-eval-probe.controller.test.ts`, `apps/agent-api/src/modules/brain/brain.module.ts`

## [2026-06-19 01:33] - [ARCH]

What: Completed Phase 2 Batch 8 Type C repository extraction for `public-agent`.
Why: Public-agent services and guard still owned Supabase table access and client/session construction after controller thinning.
Impact: Public-agent production code outside `repositories/` now scans clean for direct Supabase/client access; behavior remains covered by public chat/conversation tests and route inventory.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/public-agent/repositories/public-agent.repository.ts`, `apps/agent-api/src/modules/public-agent/services/public-agent.service.ts`, `apps/agent-api/src/modules/public-agent/services/public-agent-chat.service.ts`, `apps/agent-api/src/modules/public-agent/guards/public-agent.guard.ts`, `apps/agent-api/src/modules/public-agent/public-agent.module.ts`, `apps/agent-api/src/modules/public-agent/public-chat.controller.test.ts`, `apps/agent-api/src/modules/public-agent/public-conversations.controller.test.ts`

## [2026-06-19 01:36] - [ARCH]

What: Completed Phase 2 Batch 9 Type C repository extraction for `project-runtime`.
Why: Project-runtime services still owned project row and storage access after controller thinning.
Impact: Project-runtime production code outside `repositories/` now scans clean for direct Supabase/storage access while file, restart, hydration, storage sync, and project-agent behavior remain covered by focused tests.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/project-runtime/repositories/project-runtime.repository.ts`, `apps/agent-api/src/modules/project-runtime/services/project-apps-proxy.service.ts`, `apps/agent-api/src/modules/project-runtime/services/project-files.service.ts`, `apps/agent-api/src/modules/project-runtime/services/project-disk-hydration.service.ts`, `apps/agent-api/src/modules/project-runtime/services/project-storage-sync.service.ts`, `apps/agent-api/src/modules/project-runtime/services/project-agent-call.service.ts`, `apps/agent-api/src/modules/project-runtime/project-runtime.module.ts`

## [2026-06-19 01:40] - [ARCH]

What: Completed Phase 2 Batch 10 Type C repository extraction for `task-agent`.
Why: Task-agent still had service-layer Supabase data access after Type A foldering, and the Phase 2 loop prioritizes direct-access cleanup before LOC-only decomposition.
Impact: Task-agent production code outside `repositories/` now scans clean for direct Supabase/RPC/storage/client access while task-agent behavior remains covered by focused service tests and route inventory. The remaining `task-agent.service.ts` max-lines violation is logged as Type D orchestration decomposition.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/task-agent/repositories/task-agent.repository.ts`, `apps/agent-api/src/modules/task-agent/services/task-agent.service.ts`, `apps/agent-api/src/modules/task-agent/task-agent.module.ts`, `apps/agent-api/src/modules/task-agent/task-agent.service.test.ts`, `apps/agent-api/src/modules/task-agent/task-agent-suggest-tasks.service.test.ts`

## [2026-06-19 01:49] - [ARCH]

What: Completed Phase 2 Batch 11 Type C repository extraction for `channel-agent` and refreshed the post-launch Phase 2 backlog counts.
Why: Channel-agent still owned channel/message/member/campaign Supabase access after Type A foldering, and Phase 2 prioritizes direct-access cleanup before LOC-only decomposition.
Impact: Channel-agent production code outside `repositories/` now scans clean for direct Supabase/RPC/storage/client access while focused service behavior and route inventory remain green. The remaining `channel-agent.service.ts` 1149 LOC violation is logged as Type D orchestration decomposition.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/channel-agent/repositories/channel-agent.repository.ts`, `apps/agent-api/src/modules/channel-agent/services/channel-agent.service.ts`, `apps/agent-api/src/modules/channel-agent/channel-agent.module.ts`, `apps/agent-api/src/modules/channel-agent/channel-agent.service.test.ts`

## [2026-06-19 01:53] - [ARCH]

What: Completed Phase 2 Batch 12 Type A2 foldering for `brain-import-runtime`, `browser-sessions`, and `sessions`.
Why: These modules still had controller/service files at the module root, blocking Phase 2 layer organization closeout.
Impact: Route behavior stayed unchanged while the six layer files now live under `controllers/` or `services/`. Browser-sessions and sessions direct-access cleanup remains explicitly queued for Type C, and the touched artifact media import is still blocked only by pre-existing max-lines debt.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/brain-import-runtime`, `apps/agent-api/src/modules/browser-sessions`, `apps/agent-api/src/modules/sessions`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-missions-media.service.ts`

## [2026-06-19 01:55] - [ARCH]

What: Completed Phase 2 Batch 13 Type A2 foldering for `admin-skill-builder`.
Why: The module still had controller/service Nest layer files at the module root after the first Type A2 pass.
Impact: Admin skill builder routes and providers stayed unchanged while controller/service files now live under layer folders. Root-layer Type A2 backlog is reduced to `agent-policy`, `composio`, and `shared`.
Files: `.docs/plans/architecture-compliance-remediation.md`, `apps/agent-api/src/modules/admin-skill-builder`

## [2026-06-19 01:56] - [ARCH]

What: Completed Phase 2 Batch 14 Type A2 foldering for `composio`.
Why: `composio.service.ts` was still a root-level Nest service file after the Type A2 scans.
Impact: Composio provider behavior and artifact Composio integration behavior stayed unchanged while the service now lives under `services/`. Type A2 root-layer backlog is reduced to `agent-policy` and `shared`.
Files: `.docs/plans/architecture-compliance-remediation.md`, `apps/agent-api/src/modules/composio`, `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts`

## [2026-06-19 01:58] - [ARCH]

What: Completed Phase 2 Batch 15 Type A2 foldering for `agent-policy`.
Why: `agent-policy.service.ts` was still a root-level Nest service file after the Type A2 scans.
Impact: The global `AgentPolicyService` provider contract stayed unchanged while the service now lives under `services/`. Remaining policy data-access and LOC decomposition work is logged as Type C/D follow-up.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/agent-policy`, `apps/agent-api/src/modules/task-agent/services/task-agent.service.ts`, `apps/agent-api/src/modules/channel-agent/services/channel-agent.service.ts`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/integration-context.service.ts`, `apps/agent-api/src/modules/brain/services/brain-context.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts`

## [2026-06-19 02:05] - [ARCH]

What: Completed Phase 2 Batch 16 Type A2 foldering for shared providers.
Why: The final shared service files at the module root blocked Phase 2 Type A2 closeout.
Impact: Shared provider exports stayed unchanged through `SharedContextModule`, all imports now use `shared/services/`, and the root-level controller/service/guard scan is empty. Remaining shared direct-access and headroom work is logged for Type C/D.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/shared`, `apps/agent-api/src/modules/task-agent`, `apps/agent-api/src/modules/channel-agent`, `apps/agent-api/src/modules/project-runtime`, `apps/agent-api/src/modules/public-agent`, `apps/agent-api/src/modules/brain`, `apps/agent-api/src/modules/artifacts`, `apps/agent-api/src/modules/chat`, `apps/agent-api/src/modules/agent-sync`

## [2026-06-19 02:10] - [ARCH]

What: Completed Phase 2 Batch 17 Type B2 split for the artifacts controller.
Why: `artifacts.controller.ts` was still above the 200-line controller limit after Type A2 closeout.
Impact: Artifact action/stream endpoints remain in `ArtifactsController`, OpenClaw proxy endpoints now live in `ArtifactOpenClawProxyController`, route inventory stayed unchanged, and both controllers are under the controller LOC limit.
Files: `.docs/plans/architecture-compliance-remediation.md`, `apps/agent-api/src/modules/artifacts/controllers/artifacts.controller.ts`, `apps/agent-api/src/modules/artifacts/controllers/artifact-openclaw-proxy.controller.ts`, `apps/agent-api/src/modules/artifacts/artifacts.controller.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

## [2026-06-19 02:19] - [ARCH]

What: Completed Phase 2 Batch 18 Type B2 split for the chat controller.
Why: `chat.controller.ts` was still above the 200-line controller limit after the artifacts split.
Impact: Chat prewarm, stream/stop, and status/resume routes now live in focused controllers with stream orchestration moved into `ChatStreamHttpService`; route inventory, stream behavior tests, and all touched files are under their LOC limits.
Files: `.docs/plans/architecture-compliance-remediation.md`, `apps/agent-api/src/modules/chat/controllers/chat.controller.ts`, `apps/agent-api/src/modules/chat/controllers/chat-stream.controller.ts`, `apps/agent-api/src/modules/chat/controllers/chat-status.controller.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-http.service.ts`, `apps/agent-api/src/modules/chat/controllers/chat.controller.prewarm.test.ts`, `apps/agent-api/src/modules/chat/chat.module.ts`

## [2026-06-19 02:22] - [ARCH]

What: Completed Phase 2 Batch 19 Type C repository extraction for session storage.
Why: Sessions storage still owned Supabase Storage calls in its service layer.
Impact: Session transcript/store storage access now lives in `SessionsStorageRepository`, sessions production code outside repositories scans clean, and path/not-found/list-probe behavior is locked by focused tests.
Files: `.docs/plans/architecture-compliance-remediation.md`, `apps/agent-api/src/modules/sessions/controllers/sessions-storage.controller.ts`, `apps/agent-api/src/modules/sessions/services/sessions-storage.service.ts`, `apps/agent-api/src/modules/sessions/repositories/sessions-storage.repository.ts`, `apps/agent-api/src/modules/sessions/services/sessions-storage.service.test.ts`, `apps/agent-api/src/modules/sessions/sessions.module.ts`

## [2026-06-19 02:28] - [ARCH]

What: Completed Phase 2 Batch 20 Type C repository extraction for browser sessions.
Why: Browser-session service methods still owned Supabase profile/domain/session table access.
Impact: Browser-session data access now lives in `BrowserSessionsRepository`, controller service-client threading was removed, browser-sessions production code outside repositories scans clean, and the legacy artifact cookie-file call shape remains supported.
Files: `.docs/plans/architecture-compliance-remediation.md`, `apps/agent-api/src/modules/browser-sessions/controllers/browser-sessions.controller.ts`, `apps/agent-api/src/modules/browser-sessions/services/browser-sessions.service.ts`, `apps/agent-api/src/modules/browser-sessions/repositories/browser-sessions.repository.ts`, `apps/agent-api/src/modules/browser-sessions/services/browser-sessions.service.test.ts`, `apps/agent-api/src/modules/browser-sessions/browser-sessions.module.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

## [2026-06-19 02:32] - [ARCH]

What: Completed Phase 2 Batch 21 Type C repository extraction for MCP services.
Why: MCP config/tool services still owned project server, vault secret, tool cache, and resource cache Supabase access.
Impact: MCP data access now lives in `McpRepository`, caller-provided Supabase clients are preserved, and MCP production code outside repositories scans clean.
Files: `.docs/plans/architecture-compliance-remediation.md`, `apps/agent-api/src/modules/mcp/repositories/mcp.repository.ts`, `apps/agent-api/src/modules/mcp/services/mcp-config.service.ts`, `apps/agent-api/src/modules/mcp/services/mcp-tool.service.ts`, `apps/agent-api/src/modules/mcp/services/mcp-config.service.test.ts`, `apps/agent-api/src/modules/mcp/services/mcp-tool.service.test.ts`, `apps/agent-api/src/modules/mcp/mcp.module.ts`

## [2026-06-19 02:33] - [ARCH]

What: Completed Phase 2 Batch 22 Type C repository extraction for shared agent runtime.
Why: `AgentRuntimeService` still owned the agent registry level lookup.
Impact: Runtime level data access now lives in `AgentRuntimeRepository`, shared production code outside repositories scans clean, and existing session-key/runtime behavior remains covered by focused tests.
Files: `.docs/plans/architecture-compliance-remediation.md`, `apps/agent-api/src/modules/shared/repositories/agent-runtime.repository.ts`, `apps/agent-api/src/modules/shared/services/agent-runtime.service.ts`, `apps/agent-api/src/modules/shared/agent-runtime.service.test.ts`, `apps/agent-api/src/modules/shared/shared-context.module.ts`

## [2026-06-19 02:36] - [ARCH]

What: Completed Phase 2 Batch 23 Type C repository extraction for conversations.
Why: Conversations services still owned contact lookup and permission/share Supabase access outside repositories.
Impact: Conversations data access now lives entirely in repository classes, conversations production code outside repositories scans clean, and focused service/permission tests cover the moved behavior.
Files: `.docs/plans/architecture-compliance-remediation.md`, `apps/agent-api/src/modules/conversations/repositories/conversation-permissions.repository.ts`, `apps/agent-api/src/modules/conversations/repositories/conversations.repository.ts`, `apps/agent-api/src/modules/conversations/services/conversations.service.ts`, `apps/agent-api/src/modules/conversations/services/conversation-permissions.service.ts`, `apps/agent-api/src/modules/conversations/services/conversations.service.test.ts`, `apps/agent-api/src/modules/conversations/conversations.module.ts`

## [2026-06-19 02:40] - [ARCH]

What: Completed Phase 2 Batch 24 Type C repository extraction for agent policy.
Why: `AgentPolicyService` still owned registry, team, grant, override, and role-default Supabase reads outside a repository boundary.
Impact: Policy table reads now live in `AgentPolicyRepository`, agent-policy production code outside repositories scans clean for direct Supabase access, and remaining service LOC/listener work is tracked as Type D/F follow-up.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/agent-policy/repositories/agent-policy.repository.ts`, `apps/agent-api/src/modules/agent-policy/services/agent-policy.service.ts`, `apps/agent-api/src/modules/agent-policy/agent-policy.module.ts`, `apps/agent-api/src/modules/agent-policy/agent-policy-action-domain.test.ts`

## [2026-06-19 02:48] - [ARCH]

What: Completed Phase 2 Batch 25 Type C repository extraction for Spaces retrieval.
Why: Six Spaces retrieval services still owned Supabase search, graph, semantic object/chunk, edge, and source-row access outside a repository boundary.
Impact: Spaces retrieval data access now lives in `SpacesRetrievalRepository`, the module scans clean outside repositories, and new focused tests lock writer/index/structural-edge behavior.
Files: `.docs/plans/architecture-compliance-remediation.md`, `apps/agent-api/src/modules/spaces-retrieval/repositories/spaces-retrieval.repository.ts`, `apps/agent-api/src/modules/spaces-retrieval/services/space-retrieval.service.ts`, `apps/agent-api/src/modules/spaces-retrieval/services/space-graph-expansion.service.ts`, `apps/agent-api/src/modules/spaces-retrieval/services/space-semantic-chunk-writer.service.ts`, `apps/agent-api/src/modules/spaces-retrieval/services/space-semantic-edge-writer.service.ts`, `apps/agent-api/src/modules/spaces-retrieval/services/space-structural-edge-builder.service.ts`, `apps/agent-api/src/modules/spaces-retrieval/services/space-asset-index.service.ts`, `apps/agent-api/src/modules/spaces-retrieval/services/space-asset-index.service.test.ts`, `apps/agent-api/src/modules/spaces-retrieval/services/space-structural-edge-builder.service.test.ts`, `apps/agent-api/src/modules/spaces-retrieval/services/space-semantic-writers.service.test.ts`, `apps/agent-api/src/modules/spaces-retrieval/spaces-retrieval.module.ts`

## [2026-06-19 02:57] - [ARCH]

What: Completed Phase 2 Batch 26 Type C repository extraction for the smaller agent-sync services.
Why: Runtime skill scope, instruction audit, and instruction repair services still owned Supabase access outside a module repository boundary.
Impact: The three targeted agent-sync services now delegate data access to `AgentSyncRepository`, focused behavior tests remain green, and the remaining agent-sync direct-access work is isolated to `agent-sync.service.ts`.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/agent-sync/repositories/agent-sync.repository.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-runtime-skill-scope.service.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-instruction-audit.service.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-instruction-repair.service.ts`, `apps/agent-api/src/modules/agent-sync/agent-sync.module.ts`

## [2026-06-19 03:05] - [ARCH]

What: Completed Phase 2 Batch 27 Type C repository extraction for agent-api billing credits.
Why: `CreditsService` still owned billing Supabase access for ownership, pricing, ledgers, plans, discounts, and usage-event persistence.
Impact: Billing data access now lives in `BillingCreditsRepository`, billing production code outside repositories scans clean, and new characterization tests lock the repository-moved behavior. The remaining `CreditsService` max-lines debt is tracked as Type D follow-up.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/billing/repositories/billing-credits.repository.ts`, `apps/agent-api/src/modules/billing/services/credits.service.ts`, `apps/agent-api/src/modules/billing/services/credits.service.test.ts`, `apps/agent-api/src/modules/billing/billing.module.ts`

## [2026-06-19 03:12] - [ARCH]

What: Completed Phase 2 Batch 28 Type C repository extraction for low-risk chat runtime/reference services.
Why: Several smaller chat services still owned Supabase access for trace, timeline, runtime-run, state, pulse, conversation-reference, and skill recommendation data.
Impact: Those data-access paths now live in `ChatRuntimeRepository`, seven targeted chat files scan clean, and focused chat tests cover the moved behavior.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/chat/repositories/chat-runtime.repository.ts`, `apps/agent-api/src/modules/chat/services/skill-recommendation-event-recorder.service.ts`, `apps/agent-api/src/modules/chat/services/skill-recommendation-event-recorder.service.test.ts`, `apps/agent-api/src/modules/chat/services/message-timeline.service.ts`, `apps/agent-api/src/modules/chat/services/tracing.service.ts`, `apps/agent-api/src/modules/chat/services/chat-run-event-store.service.ts`, `apps/agent-api/src/modules/chat/services/state-writer.service.ts`, `apps/agent-api/src/modules/chat/services/state-writer.service.test.ts`, `apps/agent-api/src/modules/chat/services/conversation-reference.util.ts`, `apps/agent-api/src/modules/chat/services/pulse-compositor.service.ts`, `apps/agent-api/src/modules/chat/services/pulse-compositor.service.test.ts`, `apps/agent-api/src/modules/chat/chat.module.ts`

## [2026-06-19 03:25] - [ARCH]

What: Completed Phase 2 Batch 29 Type C repository extraction for the remaining smaller chat services.
Why: Chat checkpoint, admin-auth, integration-context, and campaign-context services still owned Supabase table access outside repository boundaries.
Impact: Those data-access paths now live in focused chat repositories, the five targeted chat services scan clean, and remaining chat Type C work is isolated to `chat.service.ts`.
Files: `.docs/plans/architecture-compliance-remediation.md`, `apps/agent-api/src/modules/chat/repositories/agent-edit-checkpoint.repository.ts`, `apps/agent-api/src/modules/chat/repositories/chat-admin-auth.repository.ts`, `apps/agent-api/src/modules/chat/repositories/chat-context.repository.ts`, `apps/agent-api/src/modules/chat/services/agent-edit-checkpoint.service.ts`, `apps/agent-api/src/modules/chat/services/agent-edit-checkpoint.service.test.ts`, `apps/agent-api/src/modules/chat/services/anthropic-claude-admin-auth.service.ts`, `apps/agent-api/src/modules/chat/services/anthropic-claude-admin-auth.service.test.ts`, `apps/agent-api/src/modules/chat/services/openai-codex-admin-auth.service.ts`, `apps/agent-api/src/modules/chat/services/openai-codex-admin-auth.service.test.ts`, `apps/agent-api/src/modules/chat/services/integration-context.service.ts`, `apps/agent-api/src/modules/chat/services/integration-context.service.test.ts`, `apps/agent-api/src/modules/chat/services/campaign-context.service.ts`, `apps/agent-api/src/modules/chat/services/campaign-context.service.test.ts`, `apps/agent-api/src/modules/chat/chat.module.ts`

## [2026-06-19 03:32] - [ARCH]

What: Completed Phase 2 Batch 30 Type C repository extraction for the first `chat.service.ts` context-helper slice.
Why: `chat.service.ts` still owned direct Supabase access for previous images, profile summaries, team/campaign roster loading, and slash-command workflows.
Impact: Those data-access paths now live in `ChatContextRepository`, focused chat behavior tests remain green, and the remaining chat direct-access work is reduced to 14 hits in the same large service.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/chat/repositories/chat-context.repository.ts`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat.service.context-helpers.test.ts`, `apps/agent-api/src/modules/chat/services/chat.service.channel-message-persistence.test.ts`, `apps/agent-api/src/modules/chat/chat.module.ts`

## [2026-06-19 03:39] - [ARCH]

What: Completed Phase 2 Batch 31 Type C repository extraction for the remaining `chat.service.ts` direct access.
Why: `chat.service.ts` still owned model capability, contact-linking, profile timestamp, document persistence/cache, highlighted artifact, and message-reference Supabase access.
Impact: Chat service-layer production code now scans clean for direct Supabase/RPC/storage/client access; data access lives in `ChatContextRepository` and `ChatAttachmentContextRepository`, with chat LOC decomposition remaining as Type D work.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/chat/repositories/chat-context.repository.ts`, `apps/agent-api/src/modules/chat/repositories/chat-attachment-context.repository.ts`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat.service.context-helpers.test.ts`, `apps/agent-api/src/modules/chat/services/chat.service.channel-message-persistence.test.ts`, `apps/agent-api/src/modules/chat/chat.module.ts`

## [2026-06-19 03:43] - [ARCH]

What: Completed Phase 2 Batch 32 Type C repository extraction for the first `agent-sync.service.ts` identity/override slice.
Why: `agent-sync.service.ts` still owned direct Supabase access for system-agent keys, scoped skill deny overrides, and Fly machine profile identity lookups/updates.
Impact: Those identity/override data paths now live in `AgentSyncRepository`; focused agent-sync tests remain green, and the remaining direct-access work in `agent-sync.service.ts` is down to 25 hits.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/agent-sync/repositories/agent-sync.repository.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync.identity-access.test.ts`

## [2026-06-19 03:46] - [ARCH]

What: Completed Phase 2 Batch 33 Type C repository extraction for personal agent-sync materialization.
Why: `syncAgent` still owned direct Supabase reads for personal agent definitions, registry metadata, and workflows.
Impact: Personal sync materialization reads now live in `AgentSyncMaterializationRepository`; focused sync tests remain green, and `agent-sync.service.ts` is down to 22 direct hits.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/agent-sync/repositories/agent-sync-materialization.repository.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts`, `apps/agent-api/src/modules/agent-sync/agent-sync.module.ts`

## [2026-06-19 03:48] - [ARCH]

What: Completed Phase 2 Batch 34 Type C repository extraction for personal bulk agent sync.
Why: `syncAll` still owned direct Supabase reads for personal definitions, skills, skill resources, workflows, and registry rows.
Impact: Personal bulk sync reads now live in `AgentSyncMaterializationRepository`; materialization tests stay green, and `agent-sync.service.ts` is down to 17 direct hits.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/agent-sync/repositories/agent-sync-materialization.repository.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync.materialization-access.test.ts`

## [2026-06-19 04:09] - [ARCH]

What: Completed Phase 2 Batch 38 Type C repository extraction for smaller Brain runtime services.
Why: Several small Brain services still owned Supabase reads/writes for company context, content hashes, evidence chunks/episodes, emotional memory tagging, and agent voice persistence.
Impact: Those paths now live in `BrainRuntimeRepository`; five Brain services scan clean for direct Supabase access, and the remaining Brain backlog is split into runtime Type C files and Type H eval/tooling policy work.
Files: `.docs/plans/architecture-compliance-remediation.md`, `apps/agent-api/src/modules/brain/repositories/brain-runtime.repository.ts`, `apps/agent-api/src/modules/brain/services/company-context-compiler.service.ts`, `apps/agent-api/src/modules/brain/services/content-dedupe.service.ts`, `apps/agent-api/src/modules/brain/services/brain-evidence-ingestion.service.ts`, `apps/agent-api/src/modules/brain/services/emotional-tagging.service.ts`, `apps/agent-api/src/modules/brain/services/voice-assignment.service.ts`, `apps/agent-api/src/modules/brain/services/brain-runtime-access.service.test.ts`, `apps/agent-api/src/modules/brain/services/brain-evidence-ingestion.service.test.ts`, `apps/agent-api/src/modules/brain/brain.module.ts`

## [2026-06-19 03:51] - [ARCH]

What: Completed Phase 2 Batch 35 Type C repository extraction for org agent materialization.
Why: `syncOrgAgent` still owned direct Supabase reads for org definitions, skills, skill resources, workflows, and registry rows.
Impact: Org sync materialization reads now live in `AgentSyncMaterializationRepository`; org materialization tests stay green, and `agent-sync.service.ts` is down to 12 direct hits.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/agent-sync/repositories/agent-sync-materialization.repository.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync.materialization-access.test.ts`

## [2026-06-19 03:53] - [ARCH]

What: Completed Phase 2 Batch 36 Type C repository extraction for agent-sync org discovery and shared resources.
Why: `agent-sync.service.ts` still owned direct Supabase reads for org membership discovery, org shared skills, owner shared skills, and skill-library fallback resources.
Impact: Those reads now live behind agent-sync repositories; focused materialization tests stay green, and `agent-sync.service.ts` is down to 3 direct hits in the Brain narrative slice.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/agent-sync/repositories/agent-sync-materialization.repository.ts`, `apps/agent-api/src/modules/agent-sync/repositories/agent-sync.repository.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync.materialization-access.test.ts`

## [2026-06-19 04:01] - [ARCH]

What: Completed Phase 2 Batch 37 Type C repository extraction for agent-sync Brain narrative sync.
Why: `agent-sync.service.ts` still owned direct Supabase reads for Brain library discovery, active narrative pages, and Brain log entries.
Impact: Agent-sync production code outside repositories now scans clean for direct Supabase/RPC/storage/client access. The remaining agent-sync backlog is LOC-only Type D decomposition.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/agent-sync/repositories/agent-sync-materialization.repository.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync.materialization-access.test.ts`

## [2026-06-19 04:20] - [ARCH]

What: Completed Phase 2 Batch 39 Type C repository extraction for smaller Brain runtime context services.
Why: Pending captures, Scholar extraction context, and Spotlight still owned Supabase table/RPC access outside repository boundaries.
Impact: `PendingCapturesService`, `ScholarContextService`, and `BrainSpotlightService` now scan clean; the remaining Brain Type C runtime backlog is down to 8 files, with Brain eval/backfill tooling tracked separately as Type H and repository headroom tracked as Type G.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/brain/repositories/brain-runtime.repository.ts`, `apps/agent-api/src/modules/brain/services/pending-captures.service.ts`, `apps/agent-api/src/modules/brain/services/scholar-context.service.ts`, `apps/agent-api/src/modules/brain/services/brain-spotlight.service.ts`, `apps/agent-api/src/modules/brain/services/brain-runtime-access.service.test.ts`, `apps/agent-api/src/modules/brain/services/brain-spotlight.service.test.ts`

## [2026-06-19 04:31] - [ARCH]

What: Completed Phase 2 Batch 40 Type C repository extraction for Brain ingestion and ops services.
Why: SK ingestion, document ingestion, and Brain ops hooks still owned Supabase table/RPC access outside repository boundaries, and the existing Brain runtime repository was too close to its 400-line cap to keep extending.
Impact: `SkIngestionService`, `DocumentIngestionService`, and `BrainOpsHookService` now scan clean; Brain ingestion/ops persistence lives in the new focused `BrainIngestionRepository`, and the remaining Brain runtime Type C backlog is down to five files.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/brain/repositories/brain-ingestion.repository.ts`, `apps/agent-api/src/modules/brain/services/sk-ingestion.service.ts`, `apps/agent-api/src/modules/brain/services/document-ingestion.service.ts`, `apps/agent-api/src/modules/brain/services/brain-ops-hook.service.ts`, `apps/agent-api/src/modules/brain/services/brain-ingestion-access.service.test.ts`, `apps/agent-api/src/modules/brain/brain.module.ts`

## [2026-06-19 04:38] - [ARCH]

What: Completed Phase 2 Batch 41 Type C repository extraction for Brain eval-probe and emotional-intelligence services.
Why: Eval-probe and emotional-intelligence services still owned Supabase table/RPC access outside repository boundaries.
Impact: `BrainEvalProbeService` and `EmotionalIntelligenceService` now scan clean; the remaining Brain runtime Type C/D backlog is down to `brain-live.service.ts`, `brain-context.service.ts`, and `brain-retrieval.service.ts`.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/brain/repositories/brain-eval-probe.repository.ts`, `apps/agent-api/src/modules/brain/repositories/brain-emotional-intelligence.repository.ts`, `apps/agent-api/src/modules/brain/services/brain-eval-probe.service.ts`, `apps/agent-api/src/modules/brain/services/emotional-intelligence.service.ts`, `apps/agent-api/src/modules/brain/services/brain-emotional-intelligence.service.test.ts`, `apps/agent-api/src/modules/brain/brain-eval-probe.controller.test.ts`, `apps/agent-api/src/modules/brain/brain.module.ts`

## [2026-06-19 04:55] - [ARCH]

What: Completed Phase 2 Batch 42 Type C/D cleanup for Brain context runtime.
Why: `BrainContextService` still owned Supabase/RPC data access for context retrieval, graph traversal, wiki lookups, and fallback fetches, and the touched service was over the 600 LOC limit.
Impact: Brain context data access now lives in `BrainContextRepository`, reusable support/formatting/fallback helpers live in `BrainContextSupportService`, `BrainContextService` scans clean for direct Supabase access, and all changed Brain context files are under their LOC limits.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/brain/repositories/brain-context.repository.ts`, `apps/agent-api/src/modules/brain/services/brain-context.service.ts`, `apps/agent-api/src/modules/brain/services/brain-context-support.service.ts`, `apps/agent-api/src/modules/brain/services/brain-context.service.test.ts`, `apps/agent-api/src/modules/brain/brain.module.ts`

## [2026-06-19 05:04] - [ARCH]

What: Completed Phase 2 Batch 43 Type C extraction for the first Brain retrieval access/search slices.
Why: `BrainRetrievalService` still owned direct Supabase/RPC access for brain resolution, access-source lookups, memory/snapshot retrieval, company-object retrieval, and customer avatar/axis retrieval.
Impact: Those paths now live in `BrainRetrievalAccessRepository` and `BrainRetrievalSearchRepository`; retrieval behavior tests and full typecheck pass, while the large retrieval service remains active Type C/D work with 23 direct hits left.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/brain/repositories/brain-retrieval-access.repository.ts`, `apps/agent-api/src/modules/brain/repositories/brain-retrieval-search.repository.ts`, `apps/agent-api/src/modules/brain/services/brain-retrieval.service.ts`, `apps/agent-api/src/modules/brain/services/brain-retrieval.service.test.ts`, `apps/agent-api/src/modules/brain/services/brain-retrieval-snapshot.service.test.ts`, `apps/agent-api/src/modules/brain/brain.module.ts`

## [2026-06-19 05:15] - [ARCH]

What: Completed Phase 2 Batch 44 Type C/G extraction for the remaining Brain retrieval lanes and relation expansion.
Why: `BrainRetrievalService` still owned direct Supabase/RPC/table access for evidence chunks, SK entries, timeline items, company signals, cognition rows, memory/belief relations, and company object edge expansion.
Impact: Those paths now live in `BrainRetrievalContextRepository` and `BrainRetrievalRelationRepository`; `BrainRetrievalService` scans clean for direct `.from()`/`.rpc()` access and remains only a Type D LOC target at 1891 LOC.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/brain/repositories/brain-retrieval-context.repository.ts`, `apps/agent-api/src/modules/brain/repositories/brain-retrieval-relation.repository.ts`, `apps/agent-api/src/modules/brain/services/brain-retrieval.service.ts`, `apps/agent-api/src/modules/brain/services/brain-retrieval-search-lanes.service.test.ts`, `apps/agent-api/src/modules/brain/brain.module.ts`

## [2026-06-19 05:22] - [ARCH]

What: Completed Phase 2 Batch 45 Type C/G cleanup for Brain Live runtime data access.
Why: `BrainLiveService` still owned direct Supabase table/RPC/storage access for live-session campaign resolution, Brain context stats, company Cortex search, document reads, transcript writes, and delegation history.
Impact: Brain Live data access now lives in `BrainLiveRepository` and `BrainLiveDocumentRepository`; Brain runtime service/controller/gateway code is Type C clean, with `brain-live.service.ts` remaining as Type D LOC work.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/brain/repositories/brain-live.repository.ts`, `apps/agent-api/src/modules/brain/repositories/brain-live-document.repository.ts`, `apps/agent-api/src/modules/brain/services/brain-live.service.ts`, `apps/agent-api/src/modules/brain/services/brain-live-data-access.service.test.ts`, `apps/agent-api/src/modules/brain/brain.module.ts`

## [2026-06-19 05:27] - [ARCH]

What: Completed Phase 2 Batch 46 Type C/G cleanup for compact artifact action services.
Why: `ArtifactEmailsService`, `ArtifactStrategyService`, and `ArtifactNotificationsService` still owned direct Supabase table writes/reads outside repository boundaries.
Impact: Email artifact, strategy node, and in-app notification persistence now lives behind focused artifact repositories; the three services scan clean for direct `.from()`/`.rpc()` access and focused tests/typecheck/lint pass.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-emails.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-strategy.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-notifications.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-emails.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-strategy.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-notifications.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-small-actions-data-access.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

## [2026-06-19 05:34] - [ARCH]

What: Completed Phase 2 Batch 47 Type C/G cleanup for artifact runtime data-access services.
Why: Media generation jobs, channel-member notes, and funnel history services still owned direct Supabase table access outside repository boundaries.
Impact: The moved data access now lives behind focused artifact repositories, all three services scan clean for direct `.from()`/`.rpc()` access, and focused tests/typecheck/lint pass.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-media-jobs.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-channel-members.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-funnel-history.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-jobs.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-channel-members.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-funnel-history.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-runtime-data-access.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

## [2026-06-19 05:43] - [ARCH]

What: Completed Phase 2 Batch 48 Type C/G cleanup for compact artifact data-access services.
Why: Analytics, blog, visual-doc, space-schema, custom-object, and canvas services still owned direct Supabase table/RPC access outside repository boundaries.
Impact: The six services now delegate data access to focused artifact repositories, scan clean for direct `.from()`/`.rpc()` access, and focused tests/typecheck/lint pass.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-analytics.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-blog.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-visual-doc.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-space-schema.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-custom-objects.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-canvas.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-analytics.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-blog.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-visual-doc.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-space-schema.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-custom-objects.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-canvas.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-compact-data-access.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

## [2026-06-19 05:48] - [ARCH]

What: Completed Phase 2 Batch 49 Type C/G cleanup for artifact helper/context data access.
Why: Channel context, mission context enrichment, space doc creation, and ensure-space-view helpers still owned direct Supabase access outside repository boundaries.
Impact: The helper/context paths now delegate data access to focused artifact repositories, the four touched helper files scan clean, and focused tests/typecheck/lint pass.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-channel-context.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-mission-context.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-space-items.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-space-schema.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-channel-context.service.ts`, `apps/agent-api/src/modules/artifacts/services/mission-context-enricher.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-space-scope.ts`, `apps/agent-api/src/modules/artifacts/services/ensure-space-view.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-helper-data-access.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

## [2026-06-19 06:00] - [ARCH]

What: Completed Phase 2 Batch 50 Type C/D/G cleanup for artifact social posts.
Why: Social-post actions still owned direct Supabase table access, publishing orchestration lived in the large facade, and duplicated helper code kept the facade over the service LOC limit.
Impact: Social-post data access now lives in `ArtifactSocialPostsRepository`, publishing orchestration lives in `ArtifactSocialPostPublishingService`, the facade is under 600 LOC, and focused tests/typecheck/lint pass.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-social-posts.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-social-posts.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-social-post-publishing.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-social-posts.service.test.ts`, `apps/agent-api/src/modules/artifacts/utils/artifact-domain-handler-shared.util.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

## [2026-06-19 06:05] - [ARCH]

What: Completed Phase 2 Batch 51 Type C/G cleanup for legacy media upload and status.
Why: Legacy media upload/status helpers still owned Supabase Storage, media asset insertion, media job lookup, and mission deliverable lookup outside repository boundaries.
Impact: Upload/status services now delegate those reads and writes to focused artifact repositories, scan clean for direct data access, and focused tests/typecheck/lint pass.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-media-assets.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-media-jobs.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-mission-deliverables.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-upload.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-status.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-jobs.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-runtime-data-access.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

## [2026-06-19 06:17] - [ARCH]

What: Completed Phase 2 Batch 52 Type C/G cleanup for compact avatar, theme, north-star, and artifact MCP handlers.
Why: These compact artifact services still owned direct Supabase table access for avatar rows, theme rows/campaign assignment, awareness points, agent config, and MCP project context.
Impact: The four services now delegate data access to focused artifact repositories, scan clean for direct `.from()`/`.rpc()` access, and behavior-lock tests/typecheck/lint pass.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-avatars.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-themes.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-north-star.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-mcp.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-avatars.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-themes.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-north-star.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-mcp.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-compact-data-access.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

## [2026-06-19 06:25] - [ARCH]

What: Completed Phase 2 Batch 53 Type C/G cleanup for artifact flows, legacy integrations, company cortex, and customer brain handlers.
Why: These compact artifact services still owned direct Supabase table/RPC access outside repository boundaries.
Impact: The four services now delegate data access to focused artifact repositories, scan clean for direct `.from()`/`.rpc()` access, and behavior-lock tests/typecheck/lint pass.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-flows.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-legacy-integrations.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-company-cortex.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-customer-brain.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-flows.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-integrations.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-company-cortex.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-customer-brain.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-flows.service.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-integrations.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

## [2026-06-19 06:28] - [FIX]

What: Fixed chat provider billing error classification and social research account mutations in team spaces.
Why: New bug reports showed provider billing failures surfaced as generic temporary chat errors and IG Research account adds failing when request org context did not match the selected space.
Impact: Chat now shows a non-retryable provider billing message, and IG/all-social account add/sync/remove plus schema saves send the selected space org id explicitly.
Files: `apps/agent-api/src/modules/chat/chat-stream-errors.ts`, `apps/web/src/features/studio/config/chat-stream-errors.config.ts`, `apps/web/src/lib/api/backend-client.ts`, `apps/web/src/features/spaces/services/spaces.service.ts`, `apps/web/src/features/spaces/services/social-research.service.ts`, `apps/web/src/features/spaces/hooks/use-space-social-account-actions.ts`, `apps/web/src/features/spaces/hooks/use-all-social-research-account-actions.ts`

---

## [2026-06-19 06:30] - [DOCS]

What: Updated chat stream recovery and Social Research feature docs for today's bug fixes.
Why: Provider billing chat failures and selected-space org context for Social Research account mutations are now part of the documented behavior.
Impact: Future chat and Social Research debugging has the current recovery and request-scoping contracts.
Files: `documentation/features/chat-stream-recovery.md`, `documentation/features/social-research.md`

---

## [2026-06-19 06:34] - [ARCH]

What: Completed Phase 2 Batch 54 Type C/G cleanup for DOCX/PDF artifact file handlers.
Why: `ArtifactDocxService` and `ArtifactPdfService` still owned conversation document persistence, mission deliverable fallback persistence, subtask receipt updates, and media storage upload/signing outside repository boundaries.
Impact: DOCX/PDF file data access now lives in `ArtifactDocumentFilesRepository`; both services scan clean for direct Supabase/storage access and focused tests/typecheck/lint pass. The unrelated full artifact RBAC test baseline drift is tracked as future Type I work.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-document-files.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-docx.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-pdf.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-document-files.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 06:38] - [ARCH]

What: Completed Phase 2 Batch 55 Type C/D/G cleanup for skill asset artifact uploads.
Why: `ArtifactStateMetaIntegrationsGithubTeamBrainService` still owned Supabase Storage upload/public URL access and sat just over the service LOC limit.
Impact: Skill asset storage now lives in `ArtifactSkillAssetsRepository`, public-image fetch validation lives in `ArtifactSkillAssetFetcherService`, and the original service is Type C clean and under 600 LOC.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-skill-assets.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-skill-asset-fetcher.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-state-meta-integrations-github-team-brain.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-team-brain-agent-routes.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 06:44] - [ARCH]

What: Completed Phase 2 Batch 56 Type C/D/G cleanup for Sequences artifact handlers.
Why: `ArtifactSequencesService` still owned sequence and sequence-email Supabase table access and sat just over the service LOC limit.
Impact: Sequence data access now lives in `ArtifactSequencesRepository`; the service scans clean for direct access, is under 600 LOC, and focused tests/typecheck/lint pass.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-sequences.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-sequences.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-sequences.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 06:55] - [ARCH]

What: Completed Phase 2 Batch 57 Type C/D/G cleanup for legacy artifact session/campaign resolution.
Why: `ArtifactLegacySessionCampaignService` still owned campaign/theme/conversation Supabase access and remained over the 600-line service limit.
Impact: Data access now lives in `ArtifactLegacySessionCampaignRepository`, session-key parsing lives in `ArtifactSessionKeyParserService`, the facade is 572 LOC, and focused tests/typecheck/lint pass.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-legacy-session-campaign.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-session-campaign.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-session-key-parser.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-session-campaign.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 07:02] - [ARCH]

What: Completed Phase 2 Batch 58 Type C/G cleanup for legacy artifact state/meta data access.
Why: `ArtifactLegacyStateMetaService` still owned agent-state, Meta defaults, campaign resolution, integration lookup, and delivery-estimate Supabase reads/writes.
Impact: State/meta data access now lives in `ArtifactLegacyStateMetaRepository`; the service scans clean for direct access, tests/typecheck pass, and the remaining 820 LOC Type D split is logged.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-legacy-state-meta.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-state-meta.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-state-meta.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 07:05] - [ARCH]

What: Completed Phase 2 Batch 59 Type C/G cleanup for legacy media image generation data access.
Why: `ArtifactLegacyMediaGenerateService` still resolved campaign and theme context with direct Supabase reads inside image generation.
Impact: Image generation data access now lives in `ArtifactLegacyMediaGenerateRepository`; the service scans clean for direct access, tests/typecheck pass, and the remaining 897 LOC Type D split is logged.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-legacy-media-generate.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-generate.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-generate.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 07:09] - [ARCH]

What: Completed Phase 2 Batch 60 Type C cleanup for media processing persistence.
Why: `ArtifactMediaProcessingService` still owned processed media storage upload, signed URL creation, and media asset insertion.
Impact: Processed-media persistence now delegates to `ArtifactMediaAssetsRepository`; the service scans clean for direct access, tests/typecheck pass, and the remaining 1830 LOC Type D split is logged.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-media-processing.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-media-processing.service.test.ts`

---

## [2026-06-19 07:16] - [ARCH]

What: Completed Phase 2 Batch 61 Type C/G cleanup for legacy artifact billing and checkpoint data access.
Why: `artifacts-legacy.service.ts` still owned `billing_health_log` writes plus agent definition/skill checkpoint reads outside the repository layer.
Impact: Legacy artifact billing/checkpoint persistence now lives in `ArtifactLegacyRepository`; the legacy service scans clean for direct access, focused tests/typecheck pass, and the remaining 1652 LOC Type D split stays tracked.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-legacy.repository.ts`, `apps/agent-api/src/modules/artifacts/legacy/artifacts-legacy.service.ts`, `apps/agent-api/src/modules/artifacts/legacy/artifacts-legacy.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 07:22] - [ARCH]

What: Completed Phase 2 Batch 62 Type C/G cleanup for mission media artifact data access.
Why: `ArtifactMissionsMediaService` still owned campaign media config reads, media asset list/read/search, storage signing/download, and extracted-frame persistence.
Impact: Mission media data access now lives in `ArtifactMediaAssetsRepository`; the service scans clean for direct access, focused tests/typecheck pass, and the remaining 1590 LOC Type D split stays tracked.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-media-assets.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-missions-media.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-missions-media.service.test.ts`

---

## [2026-06-19 07:30] - [ARCH]

What: Completed Phase 2 Batch 63 Type C/G cleanup for mission artifact visibility and mission-session reads.
Why: `ArtifactMissionsService` still owned agent visibility, mission list/detail, subtask, log, and deliverable Supabase reads outside repository boundaries.
Impact: Mission artifact data access now lives in `ArtifactMissionsRepository`; the service scans clean for direct access, focused tests/typecheck pass, and the remaining 839 LOC Type D split is tracked.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-missions.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-missions.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-missions.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 07:37] - [ARCH]

What: Completed Phase 2 Batch 64 Type C/G/I cleanup for artifact integration and Composio facade data access.
Why: `artifacts.service.ts` still owned integration capability reads, capability search RPC/text fallback, Composio config lookup, integration row writes, and agent-domain reads outside repository boundaries.
Impact: Integration/composio data access now lives in `ArtifactLegacyIntegrationsRepository`; `artifacts.service.ts` scans clean for direct access, focused tests/typecheck/lint pass, and the newly found full-file integrations-media RBAC drift is tracked as Type I.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-legacy-integrations.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifacts.service.rbac.integrations-media.test.ts`

---

## [2026-06-19 07:48] - [ARCH]

What: Completed Phase 2 Batch 65 Type C/G cleanup for legacy artifact runtime core data access.
Why: `ArtifactLegacyRuntimeCoreService` still owned authorization, campaign-permission, mission-session, deliverable, and agent-skill Supabase access outside repository boundaries.
Impact: Runtime data access now lives in `ArtifactLegacyRuntimeRepository`; the runtime core service scans clean for direct access, focused tests/typecheck/lint pass, and the remaining 972 LOC Type D split is tracked.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-legacy-runtime.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-runtime-core.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-runtime-core.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 07:58] - [ARCH]

What: Completed Phase 2 Batch 66 Type C/G cleanup for agent delegation artifact data access.
Why: `ArtifactAgentDelegationService` still owned scoped agent lookup, delegation persistence, and hire campaign-assignment Supabase access outside repository boundaries.
Impact: Agent delegation data access now lives in `ArtifactAgentDelegationRepository`; the service scans clean for direct access, focused tests/typecheck pass, and the remaining 1684 LOC Type D split is tracked.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-agent-delegation.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-agent-delegation.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-agent-delegation.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 08:05] - [ARCH]

What: Completed Phase 2 Batch 67 Type C/G cleanup for presentation artifact data access.
Why: `ArtifactPresentationsService` still owned presentation rows, bundle files, media asset lookup, and presentation asset persistence outside repository boundaries.
Impact: Presentation data access now lives in `ArtifactPresentationsRepository`; the service scans clean for direct access, focused tests/typecheck/lint pass, and the remaining 973 LOC Type D split is tracked.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-presentations.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-presentations.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-presentations.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 08:13] - [ARCH]

What: Completed Phase 2 Batch 68 Type C/G cleanup for offers and ads artifact data access.
Why: `ArtifactOffersAdsService` still owned offer, ad, ad-campaign, ad-set, tracking URL, delete-confirm lookup, and generated-TSX patch Supabase access outside repository boundaries.
Impact: Offers/ads data access now lives in `ArtifactOffersAdsRepository`; the service scans clean for direct access, focused tests/typecheck pass, and the remaining 1068 LOC Type D split is tracked.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-offers-ads.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-offers-ads.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-offers-ads.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 08:24] - [ARCH]

What: Completed Phase 2 Batch 69 Type C/G cleanup for flow-builder artifact data access.
Why: `ArtifactFlowBuilderService` still owned space/context reads, flow build session persistence, clarification rows, flow draft creation, blueprint CRUD, and evaluation writes outside repository boundaries.
Impact: Flow-builder data access now lives in `ArtifactFlowBuilderRepository`; the service scans clean for direct access, focused tests/typecheck pass, and the remaining 1097 LOC Type D split is tracked.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-flow-builder.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-flow-builder.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-flow-builder.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 08:32] - [ARCH]

What: Completed Phase 2 Batch 70 Type C/G cleanup for legacy team/brain artifact data access.
Why: `ArtifactLegacyTeamBrainService` still owned HR team/agent registry reads, campaign team assignment data access, fallback brain-memory snapshot reads, permission lookups, and brain access RPC checks outside repository boundaries.
Impact: Legacy team/brain data access now lives in `ArtifactLegacyTeamBrainRepository`; the service scans clean for direct access, focused tests/typecheck pass, and the remaining 1075 LOC Type D split is tracked.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-legacy-team-brain.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-team-brain.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-team-brain.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 08:41] - [ARCH]

What: Completed Phase 2 Batch 71 Type C/G cleanup for document artifact data access.
Why: `ArtifactDocumentsService` still owned mission/subtask context reads, deliverable persistence, conversation document CRUD, space document reads/updates, campaign space lookup, and Google Drive integration metadata lookup outside repository boundaries.
Impact: Document data access now lives in `ArtifactDocumentFilesRepository` and `ArtifactDocumentsRepository`; the service scans clean for direct access, focused tests/typecheck/lint pass, and the remaining 1448 LOC Type D split is tracked.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-documents.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-documents.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-documents.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 08:55] - [ARCH]

What: Completed Phase 2 Batch 72 Type C/G cleanup for funnel artifact data access.
Why: `ArtifactFunnelsService` still owned funnel/page/conversion-point, bundle file, asset, and media-asset Supabase access outside repository boundaries.
Impact: Funnel data access now lives in `ArtifactFunnelsRepository` and `ArtifactFunnelFilesRepository`; the service scans clean for direct access, focused tests/typecheck/lint pass, and the remaining 1409 LOC Type D split is tracked.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-funnels.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-funnel-files.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-funnels.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-funnels.service.contract.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 09:05] - [ARCH]

What: Completed Phase 2 Batch 73 Type C/G cleanup for task artifact data access.
Why: `ArtifactTasksService` still owned org-member/profile assignee lookups, task-space reads/writes, task item reads/writes, and activity persistence outside repository boundaries.
Impact: Task data access now lives in `ArtifactTasksRepository`; the service scans clean for direct access, focused tests/typecheck/lint pass, and the remaining 1753 LOC Type D split is tracked.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-tasks.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-tasks.service.ts`, `apps/agent-api/src/modules/artifacts/services/__tests__/artifact-tasks.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 09:18] - [ARCH]

What: Completed Phase 2 Batch 74 Type C/G cleanup for Brain Scholar artifact data access.
Why: `ArtifactBrainScholarService` still owned brain, narrative, cognition, log, lint, and directory lookup Supabase/RPC access outside repository boundaries.
Impact: Brain Scholar data access now lives in focused Brain Scholar, narrative, and cognition repositories; the service scans clean for direct access, focused tests/typecheck/lint pass, and the remaining 3114 LOC Type D split is tracked.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-brain-scholar.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-brain-narrative.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-brain-cognition.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 09:22] - [STYLE]

What: Strengthened Brain graph canvas contrast in light mode for nodes, relationships, belief/perspective halos, and monochrome fallback rendering.
Why: Brain nodes, beliefs, and perspectives were too faint against the light background because the canvas renderer reused dark-mode alpha values and white neutral strokes.
Impact: Dark mode preserves the existing render palette, while light mode uses the foreground RGB token for neutral canvas drawing and stronger alpha/rim values for graph readability.
Files: `.docs/logs/changelog2026-06-19.md`, `.docs/plans/agent-follow-up-work.md`, `apps/web/src/features/brain/components/ForceGraph.tsx`

---

## [2026-06-19 09:25] - [FIX]

What: Removed the colored reserved grip-column background from the task modal subtask quick-add composer.
Why: The subtask composer used the list-row gutter component for layout reservation, which painted a small hover/background square on the left in light mode.
Impact: Subtask quick-add keeps its row alignment but the left spacer is transparent, so hovering or editing no longer shows the standalone square.
Files: `.docs/logs/changelog2026-06-19.md`, `.docs/plans/agent-follow-up-work.md`, `apps/web/src/features/spaces/components/SpaceQuickAdd.tsx`

---

## [2026-06-19 09:30] - [STYLE]

What: Matched workspace settings sidebar nav spacing to account settings.
Why: Workspace settings menu items were tighter (`py-spacing-1`, no item gaps) than account settings (`py-spacing-2`, `space-y-spacing-1`).
Impact: Workspace settings sidebar now has the same clean vertical gaps between menu items as account settings.
Files: `apps/web/src/features/settings/components/WorkspaceSettingsModal.tsx`

---

## [2026-06-19 09:30] - [FIX]

What: Removed screen blending from the Cortex MAX icon image and kept sizing in normal component classes/styles.
Why: `mix-blend-mode: screen` made the pale Cortex MAX mark wash out on white/light surfaces.
Impact: The shared Cortex MAX symbol now renders with its original image contrast in light mode while preserving existing sizes across Brain, Settings, and menu usages.
Files: `.docs/logs/changelog2026-06-19.md`, `apps/web/src/features/brain/components/CortexMaxIcon.tsx`

---

## [2026-06-19 09:35] - [FIX]

What: Fixed skill recommendations settings switch layout so it no longer shrinks in the card row.
Why: The text column lacked `flex-1` and the switch lacked `shrink-0`, so the track collapsed in the wide description layout (unlike Models settings where the row layout reserves switch width).
Impact: Skill recommendations toggle renders at full size and is clickable again in workspace settings.
Files: `apps/web/src/features/settings/components/settings-content/SkillRecommendationsPageContent.tsx`

---

## [2026-06-19 09:40] - [STYLE]

What: Removed the sparkle icon from the skill recommendations settings card.
Why: User requested a cleaner card without the decorative icon chip.
Impact: Skill recommendations toggle card is text-only beside the switch.
Files: `apps/web/src/features/settings/components/settings-content/SkillRecommendationsPageContent.tsx`

---

## [2026-06-19 09:27] - [FIX]

What: Replaced the Brain selected-memory detail card's hardcoded dark glass shell with a tokenized card surface and tokenized header hover states.
Why: Opening a Brain memory in light mode still showed a black panel because `NodeDetailModal` used `card-glass` plus an inline dark rgba background.
Impact: The selected-memory card now follows light/dark theme surfaces, while move/copy/delete header controls use tokenized hover and destructive styling.
Files: `.docs/logs/changelog2026-06-19.md`, `.docs/plans/agent-follow-up-work.md`, `apps/web/src/features/brain/components/NodeDetailModal.tsx`

---

## [2026-06-19 09:29] - [FIX]

What: Added explicit repository type annotations on artifact Nest service constructors missing `: RepositoryType` metadata.
Why: Nest DI resolved constructor param index 2 of `ArtifactMcpService` as `[Function: Object]` because `artifactMcpRepository = new ArtifactMcpRepository()` had no type annotation, blocking agent-api boot; the same pattern affected other artifact module providers.
Impact: agent-api boots successfully; Nest injects registered repositories instead of failing `UnknownDependenciesException`.
Files: `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-mcp.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-docx.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-pdf.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-documents.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-offers-ads.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-presentations.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-sequences.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-themes.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-missions.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-avatars.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-state-meta-integrations-github-team-brain.service.ts`

---

## [2026-06-19 09:29] - [FEATURE]

What: Added native Form creation and management to the agent backend action surface.
Why: Agents could previously work with funnels, websites, presentations, ads, and sequences but had no first-class tool path for Vibey Forms.
Impact: Agents can now list, get, create, update, publish, unpublish, and read responses for native Forms, including schema questions, settings, colors, cover/logo/end-page image URLs, visibility, and response settings.
Files: `.docs/logs/changelog2026-06-19.md`, `.docs/plans/agent-follow-up-work.md`, `packages/api-shared/src/types/forms.ts`, `packages/api-shared/src/index.ts`, `apps/api/src/modules/forms/dto/index.ts`, `apps/api/src/modules/forms/repositories/forms.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-forms.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts`, `apps/agent-api/src/modules/artifacts/dtos/artifact-action.dto.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/agent-api/src/modules/agent-sync/contracts/agent-action-skill-links.ts`, `apps/agent-api/src/modules/agent-sync/services/vibey-api-skill-generator.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-runtime-core.service.ts`, `docker/tools/vibey-backend/index.ts`, `packages/agent-policy/src/actions.ts`, `packages/agent-policy/src/registry.ts`, `packages/agent-policy/src/action-contracts.ts`, `packages/agent-policy/src/mcp-catalog.ts`

---

## [2026-06-19 09:36] - [FEATURE]

What: Added task-row Send to agent hover action with task/mission send modes and assigned-agent preselection.
Why: Spaces tasks needed a direct row action for sending work to agents, with mission sends connected to the Missions surface.
Impact: Task sends keep the existing task activity flow; mission sends use the linked mission flow, ensure/focus the Missions tab, and agent-created chat missions now focus Missions after creation.
Files: `.docs/logs/changelog2026-06-19.md`, `.docs/plans/agent-follow-up-work.md`, `documentation/features/missions.md`, `apps/web/src/features/spaces/components/SpaceItemRow.tsx`, `apps/web/src/features/spaces/components/task-detail/SendTaskToAgentModal.tsx`, `apps/web/src/features/spaces/components/task-detail/SendTaskToAgentModePicker.tsx`, `apps/web/src/features/spaces/containers/SpaceItemsContainer.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/agent-api/src/modules/artifacts/services/ensure-space-view.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-missions.service.ts`

---

## [2026-06-19 09:38] - [FIX]

What: Corrected admin subscription integration overview rows when their vault secret is missing.
Why: The overview removed Codex/Claude from `connectedProviders` after a missing-secret check, but still returned the stale `integrations[*].status = connected` row that the Library card uses.
Impact: Disconnecting Claude Subscription or OpenAI Codex now refreshes the settings Library back to Connect even if a stale DB row remains connected.
Files: `.docs/logs/changelog2026-06-19.md`, `.docs/plans/agent-follow-up-work.md`, `apps/api/src/modules/integrations/services/integrations-overview.service.ts`, `apps/api/src/modules/integrations/services/__tests__/integrations-overview.service.test.ts`

---

## [2026-06-19 09:42] - [ARCH]

What: Completed Phase 2 Batch 75 Type H cleanup for Brain eval/backfill/tooling data access.
Why: Brain eval runners and backfill scripts still owned direct Supabase/RPC/client access outside repository boundaries.
Impact: Eval/backfill data access now lives in `BrainEvalDataRepository` and `SpaceRetrievalBackfillRepository`; the non-repository eval scan is clean, focused tests/typecheck/lint pass, and remaining eval LOC splits are tracked.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/brain/evals/repositories/brain-eval-data.repository.ts`, `apps/agent-api/src/modules/brain/evals/repositories/space-retrieval-backfill.repository.ts`, `apps/agent-api/src/modules/brain/evals/user-work/user-work-usage.util.ts`, `apps/agent-api/src/modules/brain/evals/user-work/user-work-yc-demo-real-runner.ts`, `apps/agent-api/src/modules/brain/evals/needle-in-haystack/brain-retrieval-backfill.ts`, `apps/agent-api/src/modules/brain/evals/needle-in-haystack/brain-sefy-personal-real-runner.ts`, `apps/agent-api/src/modules/brain/evals/needle-in-haystack/brain-yc-demo-real-runner.ts`, `apps/agent-api/src/modules/brain/evals/space-retrieval/space-retrieval-backfill.ts`, `apps/agent-api/src/modules/brain/evals/space-retrieval/space-retrieval-eval.util.ts`, `apps/agent-api/src/modules/brain/evals/space-retrieval/space-yc-demo-real-runner.ts`, `apps/agent-api/src/modules/brain/evals/space-retrieval/space-retrieval-eval.util.test.ts`, `apps/agent-api/src/modules/brain/evals/user-work/user-work-harness.eval.ts`

---

## [2026-06-19 09:42] - [ARCH]

What: Completed Phase 2 Batch 76 cleanup for newly discovered Artifact Forms direct data access.
Why: The post-Type-H broad scan surfaced `ArtifactFormsService` as a remaining non-repository direct Supabase access target.
Impact: Form data access now lives in `ArtifactFormsRepository`; `ArtifactFormsService` scans clean, remains under the service limit, focused tests/typecheck/lint pass, and the broad non-repository direct-access scan is clean.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-forms.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-forms.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-forms.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 09:52] - [ARCH]

What: Completed Phase 2 Batch 77 Type D/F cleanup for agent policy service decomposition.
Why: `AgentPolicyService` exceeded the 600 LOC service limit and owned the direct `pg` `LISTEN agent_policy_invalidate` lifecycle called out as Type F work.
Impact: Action-decision rules now live in `AgentPolicyActionDecisionService`, listener lifecycle lives in `AgentPolicyInvalidationListenerService`, `AgentPolicyService` is 521 LOC, Type F's known listener item is complete, and focused tests/typecheck/lint pass.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/agent-policy/services/agent-policy.service.ts`, `apps/agent-api/src/modules/agent-policy/services/agent-policy-action-decision.service.ts`, `apps/agent-api/src/modules/agent-policy/services/agent-policy-invalidation-listener.service.ts`, `apps/agent-api/src/modules/agent-policy/agent-policy.module.ts`, `apps/agent-api/src/modules/agent-policy/agent-policy-invalidation-listener.test.ts`

---

## [2026-06-19 09:58] - [ARCH]

What: Completed Phase 2 Batch 78 Type D cleanup for legacy state/meta artifact service decomposition.
Why: `ArtifactLegacyStateMetaService` remained above the 600 LOC service limit after earlier Type C repository cleanup.
Impact: Agent-state helpers now live in `ArtifactLegacyAgentStateService`, general Meta API/status/update wrappers live in `ArtifactLegacyMetaApiService`, the facade is 510 LOC, focused tests/typecheck/lint pass, and the hard service LOC backlog drops to 25.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-state-meta.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-agent-state.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-meta-api.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-state-meta.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 09:43] - [FIX]

What: Routed admin subscription disconnect/remove actions by stable integration id instead of runtime provider name.
Why: Connected Claude and Codex rows use runtime providers (`anthropic`, `openai-codex`), so the settings UI missed the Claude/Codex disconnect branches that expected `anthropic_claude` or `openai_codex`.
Impact: Clicking disconnect or remove for Claude Subscription/OpenAI Codex now calls the correct subscription disconnect endpoint and invalidates the model list.
Files: `.docs/logs/changelog2026-06-19.md`, `.docs/plans/agent-follow-up-work.md`, `apps/web/src/features/settings/components/settings-content/useIntegrations.ts`, `apps/web/src/features/settings/components/settings-content/useIntegrations.test.ts`

---

## [2026-06-19 09:52] - [FEATURE]

What: Added `attach_form_asset` so agents can attach uploaded or campaign media images to native Form cover, icon/logo, and thank-you image slots.
Why: Users can upload an image and ask an agent to add it to a Form, but the Form action surface only accepted raw settings URLs and did not resolve current request uploads.
Impact: Agents can now place one current uploaded image automatically, or attach by `media_asset_id`/`file_url`, while generated agent docs explain when to use the semantic Form asset tool.
Files: `.docs/logs/changelog2026-06-19.md`, `.docs/plans/agent-follow-up-work.md`, `apps/agent-api/src/modules/artifacts/repositories/artifact-forms.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-forms.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-forms.service.test.ts`, `apps/agent-api/src/modules/artifacts/dtos/artifact-action.dto.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-runtime-core.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifacts.service.rbac.test.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/agent-api/src/modules/agent-sync/contracts/agent-action-skill-links.ts`, `apps/agent-api/src/modules/agent-sync/contracts/agent-action-skill-links.test.ts`, `apps/agent-api/src/modules/agent-sync/services/vibey-api-skill-generator.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync-action-exposure.tdd.test.ts`, `docker/tools/vibey-backend/index.ts`, `packages/agent-policy/src/actions.ts`, `packages/agent-policy/src/registry.ts`, `packages/agent-policy/src/action-contracts.ts`, `packages/agent-policy/src/mcp-catalog.ts`, `packages/agent-policy/src/mcp-catalog.test.ts`, `packages/agent-policy/src/agent-policy.test.ts`

---

## [2026-06-19 10:06] - [ARCH]

What: Completed Phase 2 Batch 79 Type D cleanup for project artifact actions.
Why: `ArtifactProjectsService` remained above the 600 LOC service limit after earlier direct-access cleanup.
Impact: Project validation debounce/type-error analysis now lives in `ArtifactProjectValidationService`, runtime-only project actions live in `ArtifactProjectRuntimeActionsService`, `ArtifactProjectsService` is 576 LOC, focused tests/typecheck/lint pass, and the hard service LOC backlog drops to 24.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-projects.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-project-validation.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-project-runtime-actions.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-projects.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 10:15] - [ARCH]

What: Completed Phase 2 Batch 80 Type D cleanup for mission artifact actions.
Why: `ArtifactMissionsService` remained above the 600 LOC service limit after earlier direct-access cleanup.
Impact: Mission manager actions now live in `ArtifactMissionManagerActionsService`, mission API/read passthrough actions live in `ArtifactMissionApiActionsService`, `ArtifactMissionsService` is 583 LOC, focused tests/typecheck/lint pass, and the hard service LOC backlog drops to 23.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-missions.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-mission-manager-actions.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-mission-api-actions.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-missions.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 10:21] - [ARCH]

What: Completed Phase 2 Batch 81 Type D cleanup for legacy media generation helpers.
Why: `ArtifactLegacyMediaGenerateService` remained above the 600 LOC service limit and combined provider/model helper logic with image/video orchestration.
Impact: Provider model metadata, payload shaping, Google image REST calls, OpenRouter image calls, aspect-ratio normalization, and Seedance billing-model resolution now live in `ArtifactLegacyMediaProviderService`; the legacy generation facade is 595 LOC, focused tests/typecheck/lint pass, and the hard service LOC backlog drops to 22.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-generate.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-provider.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-generate.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 10:31] - [ARCH]

What: Completed Phase 2 Batch 82 Type D cleanup for presentation artifact actions.
Why: `ArtifactPresentationsService` remained above the 600 LOC service limit after earlier Type C repository cleanup.
Impact: HTML-bundle file/asset/edit-mode actions now live in `ArtifactPresentationBundleService`, legacy generated-HTML patch/slide actions live in `ArtifactPresentationLegacyEditService`, the presentation facade is 425 LOC, focused tests/typecheck/lint pass, and the hard service LOC backlog drops to 21.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-presentations.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-presentation-bundle.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-presentation-legacy-edit.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-presentations.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 10:38] - [ARCH]

What: Completed Phase 2 Batch 83 Type D cleanup for legacy runtime core actions.
Why: `ArtifactLegacyRuntimeCoreService` remained above the 600 LOC service limit after earlier Type C repository cleanup.
Impact: Main API calls, mission-session direct API emulation, internal-token proxying, and admin skill-builder proxy routing now live in `ArtifactLegacyRuntimeApiService`; the runtime core is 561 LOC, focused tests/typecheck/lint pass, and the hard service LOC backlog drops to 20.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-runtime-core.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-runtime-api.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-runtime-core.service.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-capability-policy.skill-resources.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 10:48] - [ARCH]

What: Completed Phase 2 Batch 84 Type D cleanup for legacy team/brain actions.
Why: `ArtifactLegacyTeamBrainService` remained above the 600 LOC service limit after earlier Type C repository cleanup.
Impact: Memory save/search fallback behavior, campaign team assignment/listing, and reusable artifact error handling now live in focused services; the legacy team/brain facade is 591 LOC, focused tests/typecheck/lint pass, and the hard service LOC backlog drops to 19.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-team-brain.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-team-brain-memory.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-campaign-team.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-runtime-error.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-team-brain.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 11:02] - [ARCH]

What: Completed Phase 2 Batch 85 Type D cleanup for offers/ads artifact actions.
Why: `ArtifactOffersAdsService` remained above the 600 LOC service limit after earlier Type C repository cleanup.
Impact: Core ad CRUD/tracking/list/get/delete/generated-TSX patch behavior now lives in `ArtifactAdCoreActionsService`, ad campaign/ad set/bulk/copy behavior lives in `ArtifactAdCampaignActionsService`, the offers/ads facade is 416 LOC, focused tests/typecheck/lint pass, and the live Type D scan now includes nested service files with exact `wc -l` semantics.
Files: `.agents/skills/architecture-compliance-remediation/SKILL.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-offers-ads.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-ad-core-actions.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-ad-campaign-actions.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-offers-ads.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 11:15] - [ARCH]

What: Completed Phase 2 Batch 86 Type D cleanup for flow-builder artifact actions.
Why: `ArtifactFlowBuilderService` remained above the 600 LOC service limit after earlier Type C repository cleanup.
Impact: Build-context, session, clarification, plan, evaluation, and blueprint workflows now live in focused flow-builder services/utilities; the public facade is 133 LOC, focused tests/typecheck/lint pass, and the hard Type D service backlog drops to 18.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-flow-builder.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-flow-builder-context.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-flow-builder-session.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-flow-builder-clarification.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-flow-builder-plan.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-flow-builder-blueprint.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-flow-builder-values.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-flow-builder-plan.util.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-flow-builder.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 11:22] - [ARCH]

What: Completed Phase 2 Batch 87 Type D cleanup for PDF renderer helpers.
Why: `ArtifactPdfRenderService` remained above the 600 LOC service limit after earlier document/PDF cleanup.
Impact: PDF renderer normalization, font/pdf-lib support, and text/block shaping now live in focused files; the renderer facade is 414 LOC, focused tests/typecheck/lint pass, and the hard Type D service backlog drops to 17.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-pdf-render.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-pdf-render-normalizer.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-pdf-render-text.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-pdf-render-support.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-pdf-render.types.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-pdf-render.service.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-document-files.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 11:31] - [ARCH]

What: Completed Phase 2 Batch 88 Type D cleanup for channel-agent runtime orchestration.
Why: `ChannelAgentService` remained above the 600 LOC service limit after earlier direct-access cleanup.
Impact: Prompt/context and attachment input handling now lives in `ChannelAgentInputService`, stream progress/status handling lives in `ChannelAgentProgressService`, the channel-agent facade is 560 LOC, focused tests/typecheck/lint pass, and the hard Type D service backlog drops to 16.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/channel-agent/services/channel-agent.service.ts`, `apps/agent-api/src/modules/channel-agent/services/channel-agent-input.service.ts`, `apps/agent-api/src/modules/channel-agent/services/channel-agent-progress.service.ts`, `apps/agent-api/src/modules/channel-agent/channel-agent.service.test.ts`, `apps/agent-api/src/modules/channel-agent/channel-agent.module.ts`

---

## [2026-06-19 06:45] - [FIX]

What: Added debug instrumentation across Claude Subscription auth path (vault resolve → agent-api proxy → OpenClaw gateway → runtime credential apply).
Why: HTTP 401 `Invalid bearer token` on Claude subscription requests needs runtime evidence to distinguish expired token, vault decrypt mismatch, missing credentials, or wrong auth profile.
Impact: No behavior change; debug logs write to `.cursor/debug-cacf83.log` during reproduction.
Files: `apps/agent-api/src/modules/chat/services/anthropic-claude-admin-auth.service.ts`, `apps/agent-api/src/modules/chat/services/openclaw-proxy.service.ts`, `apps/openclaw/src/gateway/openresponses-http.ts`, `apps/openclaw/src/agents/pi-embedded-runner/run.ts`


## [2026-06-19 11:43] - [FIX]

What: Removed stale duplicate helpers from `TaskAgentService`, typed task-agent tool-step output, and registered `TaskAgentInputService` / `TaskAgentProgressService` in `TaskAgentModule`.
Why: Post-refactor compile failed on undefined symbols (`formatAssigneeActivitySide`, `OrderedContentBlock`) from dead copied methods, and Nest could not inject `TaskAgentInputService`.
Impact: agent-api task-agent TypeScript compile is clean again; task-agent DI matches the channel-agent module pattern.
Files: `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/task-agent/services/task-agent.service.ts`, `apps/agent-api/src/modules/task-agent/services/task-agent-progress.service.ts`, `apps/agent-api/src/modules/task-agent/task-agent.module.ts`

---

## [2026-06-19 11:44] - [FIX]

What: Added `: ArtifactFlowBuilderRepository` type annotation on `ArtifactFlowBuilderSessionService` constructor param.
Why: Nest DI saw constructor index `[0]` as `[Function: Object]` and failed boot with `UnknownDependenciesException`.
Impact: agent-api boots successfully again.
Files: `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-flow-builder-session.service.ts`

---

## [2026-06-19 11:50] - [ARCH]

What: Completed Phase 2 Batch 89 Type D cleanup for task-agent runtime orchestration.
Why: `TaskAgentService` remained above the 600 LOC service limit after earlier direct-access cleanup.
Impact: Task input/context/slash-skill assembly now lives in `TaskAgentInputService`, stream progress/activity persistence now lives in `TaskAgentProgressService`, the task-agent facade is 590 LOC, focused tests/typecheck/lint pass, and the hard Type D service backlog drops to 15.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/task-agent/services/task-agent.service.ts`, `apps/agent-api/src/modules/task-agent/services/task-agent-input.service.ts`, `apps/agent-api/src/modules/task-agent/services/task-agent-progress.service.ts`, `apps/agent-api/src/modules/task-agent/task-agent.service.test.ts`, `apps/agent-api/src/modules/task-agent/task-agent.module.ts`

---

## [2026-06-19 11:57] - [ARCH]

What: Completed Phase 2 Batch 90 incremental Type D cleanup for chat service helper context.
Why: `ChatService` is the largest remaining Phase 2 service LOC blocker and still needs staged behavior-locked decomposition.
Impact: Profile/team/campaign context caching now lives in `ChatProfileContextService`, slash skill/workflow context loading now lives in `ChatSlashCommandService`, focused tests/typecheck/lint pass, and `chat.service.ts` drops from 4659 LOC to 4449 LOC while remaining open for further Type D splits.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-profile-context.service.ts`, `apps/agent-api/src/modules/chat/services/chat-slash-command.service.ts`, `apps/agent-api/src/modules/chat/services/chat.service.context-helpers.test.ts`, `apps/agent-api/src/modules/chat/services/__tests__/chat.service.test.ts`, `apps/agent-api/src/modules/chat/services/chat.service.channel-message-persistence.test.ts`, `apps/agent-api/src/modules/chat/chat.module.ts`

---

## [2026-06-19 12:07] - [ARCH]

What: Completed Phase 2 Batch 91 incremental Type D cleanup for chat document/reference context.
Why: `ChatService` remains the largest Phase 2 service LOC blocker and needs staged behavior-locked splits.
Impact: Uploaded document persistence/cache/context helpers now live in `ChatDocumentContextService`, highlighted artifact/message-reference/active-working-set helpers now live in `ChatReferenceContextService`, focused tests/typecheck/lint pass, and `chat.service.ts` drops from 4449 LOC to 4053 LOC while remaining open for further Type D splits.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-document-context.service.ts`, `apps/agent-api/src/modules/chat/services/chat-reference-context.service.ts`, `apps/agent-api/src/modules/chat/repositories/chat-attachment-context.repository.ts`, `apps/agent-api/src/modules/chat/repositories/chat-context.repository.ts`, `apps/agent-api/src/modules/chat/services/chat.service.context-helpers.test.ts`, `apps/agent-api/src/modules/chat/services/__tests__/chat.service.test.ts`, `apps/agent-api/src/modules/chat/services/chat.service.channel-message-persistence.test.ts`, `apps/agent-api/src/modules/chat/chat.module.ts`

---

## [2026-06-19 12:14] - [ARCH]

What: Completed Phase 2 Batch 92 incremental Type D cleanup for chat model/input support.
Why: `ChatService` remains the largest Phase 2 service LOC blocker and still owns model and gateway input helper concerns.
Impact: Model normalization/capability validation and OpenClaw image/file input-part construction now live in `ChatModelInputService`, focused tests/typecheck/lint pass, and `chat.service.ts` drops from 4053 LOC to 3830 LOC while remaining open for further Type D splits.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-model-input.service.ts`, `apps/agent-api/src/modules/chat/services/chat.service.context-helpers.test.ts`, `apps/agent-api/src/modules/chat/services/__tests__/chat.service.test.ts`, `apps/agent-api/src/modules/chat/services/chat.service.channel-message-persistence.test.ts`, `apps/agent-api/src/modules/chat/chat.module.ts`

---

## [2026-06-19 12:19] - [ARCH]

What: Completed Phase 2 Batch 93 incremental Type D cleanup for chat support helpers.
Why: `ChatService` still owned context accounting, access-token, and contact-linking support logic unrelated to stream orchestration.
Impact: Context breakdown accounting now lives in `ChatContextAccountingService`, Supabase token/RLS helpers in `ChatAccessTokenService`, contact email linking in `ChatContactLinkingService`, focused tests/typecheck/lint pass, and `chat.service.ts` drops from 3830 LOC to 3692 LOC while remaining open for further Type D splits.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-context-accounting.service.ts`, `apps/agent-api/src/modules/chat/services/chat-access-token.service.ts`, `apps/agent-api/src/modules/chat/services/chat-contact-linking.service.ts`, `apps/agent-api/src/modules/chat/services/chat.service.context-helpers.test.ts`, `apps/agent-api/src/modules/chat/services/__tests__/chat.service.test.ts`, `apps/agent-api/src/modules/chat/services/chat.service.channel-message-persistence.test.ts`, `apps/agent-api/src/modules/chat/chat.module.ts`

---

## [2026-06-19 12:26] - [ARCH]

What: Completed Phase 2 Batch 94 incremental Type D cleanup for chat prewarm stable context.
Why: `ChatService` still owned stable context prewarm orchestration unrelated to per-message stream handling.
Impact: Prewarm cache-key generation, cache orchestration, stable context loading, runtime readiness, policy checks, model selection, and stable summaries now live in `ChatPrewarmContextService`; focused tests/typecheck/lint pass, and `chat.service.ts` drops from 3692 LOC to 3392 LOC while remaining open for further Type D splits.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-prewarm-context.service.ts`, `apps/agent-api/src/modules/chat/services/chat.service.access-context.test.ts`, `apps/agent-api/src/modules/chat/services/chat.service.context-helpers.test.ts`, `apps/agent-api/src/modules/chat/services/__tests__/chat.service.test.ts`, `apps/agent-api/src/modules/chat/chat.module.ts`

---

## [2026-06-19 12:32] - [FIX]

What: Changed `latestUserContent` from `const` to `let` in `ChatService`.
Why: Previous-image URL context is appended after enrichment, which TypeScript rejected as reassignment to a constant.
Impact: agent-api compile succeeds again when image URL context is merged into the latest user message.
Files: `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/services/chat.service.ts`

---

## [2026-06-19 12:35] - [ARCH]

What: Completed Phase 2 Batch 95 incremental Type D cleanup for chat message enrichment.
Why: `ChatService` still owned document, artifact, reference, and slash-command enrichment logic unrelated to stream orchestration.
Impact: Message enrichment now lives in `ChatMessageEnrichmentService`; focused tests/typecheck/lint pass, the broad direct-access scan is clean, and `chat.service.ts` drops from 3392 LOC to 3180 LOC while remaining open for further Type D splits.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-message-enrichment.service.ts`, `apps/agent-api/src/modules/chat/services/chat.service.access-context.test.ts`, `apps/agent-api/src/modules/chat/services/chat.service.context-helpers.test.ts`, `apps/agent-api/src/modules/chat/services/__tests__/chat.service.test.ts`, `apps/agent-api/src/modules/chat/chat.module.ts`

---

## [2026-06-19 12:39] - [ARCH]

What: Completed Phase 2 Batch 96 incremental Type D cleanup for chat session-history integrity.
Why: `ChatService` still owned session confidence tracking and DB history reconstruction logic unrelated to stream orchestration.
Impact: Session confidence, context-gap detection, reconstruction, and gateway trace confidence updates now live in `ChatSessionHistoryService`; focused tests/typecheck/lint pass, the broad direct-access scan is clean, and `chat.service.ts` drops from 3180 LOC to 3097 LOC while remaining open for further Type D splits.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-session-history.service.ts`, `apps/agent-api/src/modules/chat/services/chat.service.access-context.test.ts`, `apps/agent-api/src/modules/chat/services/chat.service.context-helpers.test.ts`, `apps/agent-api/src/modules/chat/services/__tests__/chat.service.test.ts`, `apps/agent-api/src/modules/chat/chat.module.ts`

---

## [2026-06-19 12:44] - [ARCH]

What: Completed Phase 2 Batch 97 incremental Type D cleanup for Brain Scholar Atlas context saves.
Why: `ArtifactBrainScholarService` still owned Atlas brain-context routing helpers after Type C repository cleanup.
Impact: Atlas `atlas_save_brain_context` routing now lives in `ArtifactAtlasBrainContextService`; focused tests/typecheck/lint pass, the broad direct-access scan is clean, and `artifact-brain-scholar.service.ts` drops from 3114 LOC to 2899 LOC while remaining open for further Type D splits.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-atlas-brain-context.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 12:49] - [ARCH]

What: Completed Phase 2 Batch 98 incremental Type D cleanup for Brain Scholar access resolution.
Why: `ArtifactBrainScholarService` still owned default brain, agent brain, session access, brain-job validation, and permission-check helpers after Type C cleanup.
Impact: Brain access and resolution now live in `ArtifactBrainAccessService`; focused tests/typecheck/lint pass, the broad direct-access scan is clean, and `artifact-brain-scholar.service.ts` drops from 2899 LOC to 2798 LOC while remaining open for further Type D splits.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-access.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 12:54] - [ARCH]

What: Completed Phase 2 Batch 99 incremental Type D cleanup for Brain Scholar ingestion actions.
Why: `ArtifactBrainScholarService` still owned user/agent brain ingestion and internal brain node action routing after Type C cleanup.
Impact: User/agent ingestion, Fathom/Fireflies ingest routing, transfer/delete/source-assignment calls, and main-API helper logic now live in `ArtifactBrainIngestionActionsService`; focused tests/typecheck/lint pass, the broad direct-access scan is clean, and `artifact-brain-scholar.service.ts` drops from 2798 LOC to 2283 LOC while remaining open for further Type D splits.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-ingestion-actions.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 12:59] - [ARCH]

What: Completed Phase 2 Batch 100 incremental Type D cleanup for Brain Scholar timeline actions.
Why: `ArtifactBrainScholarService` still owned Brain timeline orchestration after Type C cleanup.
Impact: Timeline list/read/create/item-upsert/archive behavior now lives in `ArtifactBrainTimelineActionsService`; focused tests/typecheck/lint pass, the broad direct-access scan is clean, and `artifact-brain-scholar.service.ts` drops from 2283 LOC to 2076 LOC while remaining open for further Type D splits.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-timeline-actions.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 12:48] - [FIX]

What: Preserved queued chat runs as recoverable when the mission worker loses the internal Agent API stream bridge, and kept the web chat UI reconnecting when status is inactive but the assistant message is still incomplete.
Why: The incident showed OpenClaw could finish while the Agent API bridge returned `terminated`, leaving the UI with a partial assistant message that looked idle instead of recoverable.
Impact: Recoverable bridge losses now emit `stream_interrupted`, keep the Redis run ticket active for a bounded recovery window, avoid marking the DB run failed immediately, and trigger reconnect/polling UX instead of silently clearing the stream state.
Files: `.docs/logs/changelog2026-06-19.md`, `.docs/plans/agent-follow-up-work.md`, `apps/mission-worker/src/modules/agent-runtime/processors/agent-runtime-chat-shadow.processor.ts`, `apps/mission-worker/src/modules/agent-runtime/processors/agent-runtime-chat-shadow.processor.test.ts`, `apps/mission-worker/src/modules/agent-runtime/types/agent-runtime.types.ts`, `apps/web/src/features/studio/services/chat.service.ts`, `apps/web/src/features/studio/services/stream-resilience.ts`, `apps/web/src/features/studio/services/stream-resilience.test.ts`, `apps/web/src/features/studio/services/chat-stream-interruption.test.ts`, `apps/web/src/features/studio/config/chat-stream-errors.config.ts`, `apps/web/src/features/studio/config/chat-stream-errors.config.test.ts`

---

## [2026-06-19 13:06] - [ARCH]

What: Completed Phase 2 Batch 101 incremental Type D cleanup for Brain Scholar belief actions.
Why: `ArtifactBrainScholarService` still owned belief-pattern orchestration after Type C cleanup.
Impact: Belief-pattern list/create/update/archive/merge and memory connect/disconnect behavior now live in `ArtifactBrainBeliefActionsService`; focused tests/typecheck/lint pass, the broad direct-access scan is clean, and `artifact-brain-scholar.service.ts` drops from 2076 LOC to 1834 LOC while remaining open for further Type D splits.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-belief-actions.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 13:10] - [ARCH]

What: Completed Phase 2 Batch 102 incremental Type D cleanup for Brain Scholar perspective actions.
Why: `ArtifactBrainScholarService` still owned perspective orchestration after Type C cleanup.
Impact: Perspective list/create/update/archive and belief connect/disconnect behavior now live in `ArtifactBrainPerspectiveActionsService`; focused tests/typecheck/lint pass, the broad direct-access scan is clean, and `artifact-brain-scholar.service.ts` drops from 1834 LOC to 1678 LOC while remaining open for further Type D splits.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-perspective-actions.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 13:13] - [ARCH]

What: Completed Phase 2 Batch 103 incremental Type D cleanup for Brain Scholar lint actions.
Why: `ArtifactBrainScholarService` still owned Brain lint orchestration after Type C cleanup.
Impact: Brain lint list/enqueue/resolve behavior now lives in `ArtifactBrainLintActionsService`; focused tests/typecheck/lint pass, the broad direct-access scan is clean, and `artifact-brain-scholar.service.ts` drops from 1678 LOC to 1613 LOC while remaining open for further Type D splits.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-lint-actions.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 13:21] - [ARCH]

What: Completed Phase 2 Batch 104 incremental Type D cleanup for Brain Scholar narrative actions.
Why: `ArtifactBrainScholarService` still owned narrative page, Brain log, markdown patching, and page-file side-effect orchestration after Type C cleanup.
Impact: Narrative page/log behavior now lives in `ArtifactBrainNarrativeActionsService`; focused tests/typecheck/lint pass, the broad direct-access scan is clean, `artifact-brain-scholar.service.ts` drops from 1613 LOC to 1114 LOC, and the plan now tracks newly surfaced `chat-run-event-store.service.ts` at 612 LOC as Type D work.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-narrative-actions.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

---

## [2026-06-19 13:30] - [ARCH]

What: Completed Phase 2 Batch 105 final Type D cleanup for Brain Scholar and repaired a chat typecheck gate drift found during verification.
Why: `ArtifactBrainScholarService` still owned Brain search/read orchestration, and full typecheck exposed the recoverable context-window chat stream code using an unregistered error code plus a missing explicit success return.
Impact: Brain search/read behavior now lives in focused action services and `artifact-brain-scholar.service.ts` is under limit at 457 LOC; chat stream typecheck is restored; focused tests/typecheck/lint pass and the broad direct-access scan remains clean.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-read-actions.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-search-actions.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/chat-stream-errors.ts`, `apps/agent-api/src/modules/chat/chat-stream-errors.test.ts`, `apps/agent-api/src/modules/chat/services/chat.service.access-context.test.ts`

---

## [2026-06-19 13:33] - [ARCH]

What: Completed Phase 2 Batch 106 Type D cleanup for the chat run-event store.
Why: The exact nested service scan surfaced `chat-run-event-store.service.ts` above the 600 LOC service limit.
Impact: Redis key and positive-integer helpers now live in `chat-run-event-store-utils.ts`; focused tests/typecheck/lint pass, the broad direct-access scan is clean, and `chat-run-event-store.service.ts` is compliant at 599 LOC.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/services/chat-run-event-store.service.ts`, `apps/agent-api/src/modules/chat/services/chat-run-event-store-utils.ts`, `apps/agent-api/src/modules/chat/services/chat-run-event-store.service.test.ts`

---

## [2026-06-19 13:45] - [FIX]

What: Implemented resumable chat-run reliability foundations and Jaime-only aggregate team audit tools.
Why: Failed agent runs could emit `error` and then `done`, context-window failures were not classified recoverably, runtime statuses/checkpoints were missing, and broad team audits forced Jaime into many raw skill reads.
Impact: Chat runs now return explicit terminal statuses, context-window failures can checkpoint/compact/resume behind flags, failed turns avoid misleading `duration_ms`, frontend/backend error codes align, runtime checkpoints have a durable table/service, queued workers parse new terminal states, and HR-only audit tools are gated away from non-Jaime agents.
Files: `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-run-checkpoint.service.ts`, `apps/agent-api/src/modules/chat/services/chat-run-event-store.service.ts`, `apps/agent-api/src/modules/chat/repositories/chat-runtime.repository.ts`, `apps/agent-api/src/modules/chat/controllers/internal-chat-runtime.controller.ts`, `apps/agent-api/src/modules/chat/chat-stream-errors.ts`, `apps/agent-api/src/modules/chat/chat.module.ts`, `apps/web/src/features/studio/config/chat-stream-errors.config.ts`, `apps/mission-worker/src/modules/agent-runtime/processors/agent-runtime-chat-shadow.processor.ts`, `apps/mission-worker/src/modules/agent-runtime/types/agent-runtime.types.ts`, `supabase/migrations/20260619123000_chat_run_checkpoints_and_terminal_statuses.sql`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-team-brain.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-state-meta-integrations-github-team-brain.service.ts`, `apps/agent-api/src/modules/artifacts/legacy/artifacts-legacy.service.ts`, `packages/agent-policy/src/actions.ts`, `packages/agent-policy/src/registry.ts`, `packages/agent-policy/src/action-contracts.ts`, `docker/agents/hr/TOOLS.md`, `docker/agents/hr/skills/vibey-api/ALLOWED_ACTIONS.json`, `docker/agents/templates/hr/TOOLS.md`, `docker/agents/templates/hr/skills/vibey-api/ALLOWED_ACTIONS.json`, `documentation/features/chat-stream-recovery.md`

---

## [2026-06-19 13:49] - [ARCH]

What: Completed Phase 2 Batch 107 incremental Type D cleanup for the chat facade and aligned the artifact action DTO with existing HR audit actions.
Why: `ChatService` still carried compatibility delegates for helpers already extracted into focused services, and full typecheck found `audit_team_agents_and_skills` registered in schemas/policy/handler maps but missing from `VALID_ACTIONS`.
Impact: Helper characterization tests now target the extracted services directly, `ChatService.processMessage` calls those services without pass-through wrappers, focused tests/typecheck/lint pass, the broad direct-access scan remains clean, and `chat.service.ts` drops to 3091 LOC while staying in the Type D backlog.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat.service.context-helpers.test.ts`, `apps/agent-api/src/modules/chat/services/__tests__/chat.service.test.ts`, `apps/agent-api/src/modules/artifacts/dtos/artifact-action.dto.ts`

---

## [2026-06-19 13:58] - [ARCH]

What: Completed Phase 2 Batch 108 Type D cleanup for the legacy team/brain artifact facade.
Why: The later HR aggregate audit work pushed `ArtifactLegacyTeamBrainService` back over the 600 LOC service limit.
Impact: HR team listing, skill audit, coverage comparison, and capability summary behavior now live in `ArtifactLegacyTeamAuditService`; focused characterization tests cover the moved behavior; verification passes; `artifact-legacy-team-brain.service.ts` is compliant at 598 LOC with a headroom follow-up.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-team-brain.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-team-audit.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-team-brain.service.test.ts`

---

## [2026-06-19 14:14] - [ARCH]

What: Completed Phase 2 Batch 109 Type D cleanup for the funnel artifact facade.
Why: `ArtifactFunnelsService` remained a 1409 LOC hard service violation after Type C repository extraction.
Impact: Funnel file/page support, page bundle writes, page/layout handlers, and file/asset/tweak actions now live in focused injectable services; focused tests/typecheck/lint pass, the artifacts direct-access scan remains clean, and `artifact-funnels.service.ts` is compliant at 425 LOC.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-funnels.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-funnel-file-support.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-funnel-page-bundle.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-funnel-page.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-funnel-file-actions.service.ts`

---

## [2026-06-19 14:21] - [ARCH]

What: Completed Phase 2 Batch 110 incremental Type D cleanup for chat stream ordered blocks.
Why: `ChatService.processMessage` still owned deterministic UI block mutation logic inside the main stream workflow.
Impact: Ordered block mutation now lives in `ChatOrderedBlocksService`; a focused characterization locks persisted block shape for tool/thinking/text/UI events; verification passes; `chat.service.ts` drops to 2914 LOC while remaining an open Type D hard target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/chat.module.ts`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-ordered-blocks.service.ts`, `apps/agent-api/src/modules/chat/services/chat.service.access-context.test.ts`

---

## [2026-06-19 14:26] - [ARCH]

What: Completed Phase 2 Batch 111 incremental Type D cleanup for chat stream recovery logic.
Why: `ChatService.processMessage` still owned retryable-provider detection and context-window recovery helpers inside the main stream workflow.
Impact: Stream recovery classification, compact recovery input construction, and recovered-result merging now live in `ChatStreamRecoveryService`; focused recovery tests and typecheck/lint pass; `chat.service.ts` drops to 2792 LOC while remaining an open Type D hard target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/chat.module.ts`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-recovery.service.ts`, `apps/agent-api/src/modules/chat/services/chat.service.channel-message-persistence.test.ts`

---

## [2026-06-19 14:31] - [ARCH]

What: Completed Phase 2 Batch 112 incremental Type D cleanup for chat setup/platform stream events.
Why: `ChatService.processMessage` still owned setup status bucketing and platform tool event wrapping inside the main stream workflow.
Impact: Setup status labels, deterministic platform labels, and platform tool start/end event wrapping now live in `ChatSetupEventsService`; focused chat stream tests/typecheck/lint pass; `chat.service.ts` drops to 2700 LOC while remaining an open Type D hard target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/chat.module.ts`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-setup-events.service.ts`, `apps/agent-api/src/modules/chat/services/chat.service.access-context.test.ts`

---

## [2026-06-19 14:36] - [FIX]

What: Registered `ChatStreamMirrorService` in `ChatModule` providers alongside the other extracted chat stream helpers.
Why: `ChatService` constructor injection added `ChatStreamMirrorService` at index `[42]` but the module had not registered the provider, blocking agent-api boot.
Impact: agent-api boots successfully; stream mirror/redis shadow diagnostics inject through Nest instead of failing DI.
Files: `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/chat.module.ts`

---

## [2026-06-19 14:38] - [ARCH]

What: Completed Phase 2 Batch 113 incremental Type D cleanup for chat stream mirror diagnostics and pre-run event buffering.
Why: `ChatService.processMessage` still owned live/Redis shadow stream mirroring and pre-run event queueing inside the main stream workflow.
Impact: Stream mirror state, live/Redis shadow recording, pre-run event buffering/flushing, and mirror verification now live in `ChatStreamMirrorService`; focused chat stream tests/typecheck/lint pass; `chat.service.ts` drops to 2666 LOC while remaining an open Type D hard target. The plan now also tracks `artifact-legacy-media-generate.service.ts` as a restored hard Type D target at 784 LOC.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/chat.module.ts`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-mirror.service.ts`, `apps/agent-api/src/modules/chat/services/chat.service.access-context.test.ts`

---

## [2026-06-19 14:49] - [FIX]

What: Made chat ordered tool rows idempotent and grouped runtime skill-read activity with other context reads.
Why: A repeated stream/replay `tool_start` could append a second visible row for the same action, and `read_skill` was not included in the render-time read coalescing helper.
Impact: Duplicate live or replayed tool-start events now update the existing ordered block on both frontend and backend persistence; repeated skill reads collapse into one context-gathering row; focused regression tests cover skill-read grouping, duplicate live tool starts, and backend ordered-block idempotency.
Files: `apps/web/src/features/studio/store/use-chat-store.ts`, `apps/web/src/features/studio/components/message-bubble/message-bubble.utils.ts`, `apps/web/src/features/studio/components/chat/LockedInGroup.tsx`, `apps/web/src/features/studio/components/message-bubble/message-bubble.utils.test.ts`, `apps/web/src/features/studio/services/chat-stream-interruption.test.ts`, `apps/agent-api/src/modules/chat/services/chat-ordered-blocks.service.ts`, `apps/agent-api/src/modules/chat/services/chat-ordered-blocks.service.test.ts`, `documentation/features/chat-stream-recovery.md`

---

## [2026-06-19 14:48] - [ARCH]

What: Completed Phase 2 Batch 114 incremental Type D cleanup for chat progressive stream persistence.
Why: `ChatService.processMessage` still owned accumulated stream state, scheduled DB flushes, first-visible logging, timeline appends, ordered block mutations, and tool checkpoint scheduling.
Impact: Progressive stream state and persistence now live in `ChatProgressiveStreamService`; focused chat tests/typecheck/lint pass; `chat.service.ts` drops to 2450 LOC while remaining an open Type D hard target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/chat.module.ts`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-progressive-stream.service.ts`

---

## [2026-06-19 14:55] - [ARCH]

What: Completed Phase 2 Batch 115 incremental Type D cleanup for chat OpenClaw stream execution.
Why: `ChatService.processMessage` still owned repeated gateway stream calls, continuation handling, empty-output retries, strategy fallback, and context-window auto-recovery.
Impact: Gateway stream execution now lives in `ChatStreamExecutionService`; focused chat tests/typecheck/lint pass; `chat.service.ts` drops to 2265 LOC while remaining an open Type D hard target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/chat.module.ts`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`, `apps/agent-api/src/modules/chat/services/openclaw-proxy.service.ts`

---

## [2026-06-19 15:01] - [ARCH]

What: Completed Phase 2 Batch 116 incremental Type D cleanup for chat completion side effects.
Why: `ChatService.processMessage` still owned detached cost lookup, trace completion, skill recommendation recording, token aggregation, and credit processing.
Impact: Completion side effects now live in `ChatCompletionSideEffectsService`; focused chat tests/typecheck/lint pass; `chat.service.ts` drops to 2132 LOC and `agent-sync.service.ts` is now the top Type D target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/chat.module.ts`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-completion-side-effects.service.ts`

---

## [2026-06-19 15:09] - [ARCH]

What: Completed Phase 2 Batch 117 incremental Type D cleanup for AgentSync Brain library materialization.
Why: `AgentSyncService` still owned Brain narrative page/log file sync inside the oversized service.
Impact: Brain library file materialization now lives in `AgentSyncBrainLibraryService`; focused AgentSync tests/typecheck/lint pass; `agent-sync.service.ts` drops to 2163 LOC while remaining an open Type D hard target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/agent-sync/agent-sync.module.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync-brain-library.service.ts`

---

## [2026-06-19 15:16] - [ARCH]

What: Completed Phase 2 Batch 118 incremental Type D cleanup for Brain Live delegation streams.
Why: `BrainLiveService` still owned OpenClaw delegation and queued-message SSE stream parsing inside the oversized live voice service.
Impact: Delegation stream parsing now lives in `BrainLiveDelegationStreamService`; focused Brain Live tests/typecheck/lint pass; `brain-live.service.ts` drops to 1690 LOC while remaining an open Type D hard target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/brain/brain.module.ts`, `apps/agent-api/src/modules/brain/services/brain-live.service.ts`, `apps/agent-api/src/modules/brain/services/brain-live-delegation-stream.service.ts`, `apps/agent-api/src/modules/brain/services/brain-live.service.test.ts`

---

## [2026-06-19 15:22] - [ARCH]

What: Completed Phase 2 Batch 119 incremental Type D cleanup for AgentSync file materialization.
Why: `AgentSyncService` still owned skill/workflow filesystem writes and generated index/materialized resource helpers inside the oversized sync service.
Impact: Skill and workflow file materialization now lives in `AgentSyncFileMaterializationService`; focused AgentSync tests/typecheck/lint pass; `agent-sync.service.ts` drops to 1913 LOC while remaining an open Type D hard target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/agent-sync/agent-sync.module.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync-file-materialization.service.ts`

---

## [2026-06-19 15:27] - [ARCH]

What: Completed Phase 2 Batch 120 incremental Type D cleanup for OpenClaw model routing.
Why: `OpenClawProxyService` still owned gateway model normalization, token limit lookup, reasoning budget mapping, compatibility detection, and generated local debug instrumentation inside the oversized proxy.
Impact: Model routing helpers now live in `openclaw-model-routing.ts`; the generated Claude credential debug fetch is removed; focused OpenClaw/chat tests/typecheck/lint pass; `openclaw-proxy.service.ts` drops to 2024 LOC while remaining an open Type D hard target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/services/openclaw-proxy.service.ts`, `apps/agent-api/src/modules/chat/services/openclaw-model-routing.ts`

---

## [2026-06-19 15:11] - [FIX]

What: Fixed agent OpenRouter image generation to use image modalities/image_config and parse `message.images` image payloads.
Why: Chat avatar/image generation was returning HTTP 200 payloads without usable `message.content` because OpenRouter image outputs are returned under `message.images` when requested with the image-generation shape.
Impact: `generate_image` can now turn successful OpenRouter image responses into uploaded media bytes instead of failing with `No content in OpenRouter response`; invalid HTTP 200 non-JSON responses fail clearly.
Files: `apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-provider.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-provider.service.test.ts`, `.docs/logs/changelog2026-06-19.md`, `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-19 15:36] - [ARCH]

What: Completed Phase 2 Batch 121 incremental Type D cleanup for ChatService gateway input assembly.
Why: `ChatService.processMessage` still owned OpenClaw instruction assembly, dynamic context parts, file/image input parts, disabled action policy, measured context slices, and final gateway input-array construction inside the oversized service.
Impact: Gateway input assembly now lives in `ChatGatewayInputService`; focused chat tests/typecheck/lint pass; `chat.service.ts` drops to 1934 LOC while remaining an open Type D hard target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/chat.module.ts`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-gateway-input.service.ts`

---

## [2026-06-19 15:46] - [ARCH]

What: Completed Phase 2 Batch 122 incremental Type D cleanup for OpenClaw tool-event helpers.
Why: `OpenClawProxyService` still owned tool labeling, content-preview parsing, error categorization, and Telegram/Slack UI-block fallback text inside the oversized gateway proxy.
Impact: Tool-event helpers now live in `openclaw-tool-events.ts` and text-channel UI block conversion lives in `openclaw-ui-block-text.ts`; focused OpenClaw/chat tests/typecheck/lint pass; `openclaw-proxy.service.ts` drops to 1485 LOC while remaining an open Type D hard target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/services/openclaw-proxy.service.ts`, `apps/agent-api/src/modules/chat/services/openclaw-proxy.service.test.ts`, `apps/agent-api/src/modules/chat/services/openclaw-tool-events.ts`, `apps/agent-api/src/modules/chat/services/openclaw-ui-block-text.ts`

---

## [2026-06-19 15:53] - [ARCH]

What: Completed Phase 2 Batch 123 incremental Type D cleanup for ChatService assistant-turn startup.
Why: `ChatService.processMessage` still owned durable assistant message creation, runtime run startup, stream send registration, pre-run event flushing, message-start timeline emission, and trace startup inside the oversized service.
Impact: Assistant turn startup now lives in `ChatAssistantTurnService`; focused chat tests/typecheck/lint pass; `chat.service.ts` drops to 1860 LOC while remaining an open Type D hard target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/chat.module.ts`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-assistant-turn.service.ts`

---

## [2026-06-19 16:02] - [ARCH]

What: Completed Phase 2 Batch 124 incremental Type D cleanup for AgentSync org/shared-skill materialization.
Why: `AgentSyncService` still owned org agent discovery fanout and org shared-skill filesystem materialization inside the oversized sync service.
Impact: Org agent fanout and shared-skill writing now live in `AgentSyncOrgSharedSkillsService`; focused AgentSync tests/typecheck/lint pass; `agent-sync.service.ts` drops to 1768 LOC while remaining an open Type D hard target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/agent-sync/agent-sync.module.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync-org-shared-skills.service.ts`

---

## [2026-06-19 16:21] - [ARCH]

What: Completed Phase 2 Batch 125 Type D cleanup for BrainRetrievalService orchestration.
Why: `BrainRetrievalService` still owned candidate construction, query expansion, lane searches, related-context expansion, and timing helpers inside the oversized retrieval service.
Impact: Retrieval concerns now live in focused collaborators; focused Brain retrieval tests/typecheck/lint pass; `brain-retrieval.service.ts` drops to 598 LOC and is resolved as a hard Type D target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/brain/brain.module.ts`, `apps/agent-api/src/modules/brain/services/brain-retrieval.service.ts`, `apps/agent-api/src/modules/brain/services/brain-retrieval-candidate-builder.ts`, `apps/agent-api/src/modules/brain/services/brain-retrieval-query-expansion.service.ts`, `apps/agent-api/src/modules/brain/services/brain-retrieval-search-lane.service.ts`, `apps/agent-api/src/modules/brain/services/brain-retrieval-related-context.service.ts`, `apps/agent-api/src/modules/brain/services/brain-retrieval-timing.service.ts`, `apps/agent-api/src/modules/brain/services/brain-retrieval.types.ts`

---

## [2026-06-19 16:29] - [ARCH]

What: Completed Phase 2 Batch 126 incremental Type D cleanup for ChatService stable turn context.
Why: `ChatService.processMessage` still owned conversation runtime resolution, model selection, policy checks, and support-wiki context decisions inside the oversized service.
Impact: Stable turn-context resolution now lives in `ChatStableTurnContextService`; focused chat tests/typecheck/lint pass; `chat.service.ts` drops to 1748 LOC while remaining an open Type D hard target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/chat.module.ts`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-stable-turn-context.service.ts`

---

## [2026-06-19 16:53] - [ARCH]

What: Completed Phase 2 Batch 127 Type D cleanup for ArtifactMediaProcessingService.
Why: `ArtifactMediaProcessingService` still owned every ffmpeg operation family, shared download/runtime helpers, and processed-media persistence in a single oversized action facade.
Impact: Media processing now delegates to focused core, edit, visual, advanced, runtime, and persistence collaborators; focused media-processing test/typecheck/lint pass; `artifact-media-processing.service.ts` drops to 502 LOC and is resolved as a hard Type D target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-media-processing.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-media-processing-advanced-operations.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-media-processing-core-operations.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-media-processing-edit-operations.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-media-processing-operation-runtime.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-media-processing-persistence.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-media-processing-visual-operations.service.ts`

---

## [2026-06-19 17:01] - [ARCH]

What: Completed Phase 2 Batch 128 incremental Type D cleanup for AgentSync runtime identity.
Why: `AgentSyncService` still owned runtime identity cache persistence, pool-machine bind/reset serialization, workspace reset, and Fly machine identity bootstrap inside the oversized sync facade.
Impact: Runtime identity behavior now lives in `AgentSyncRuntimeIdentityService`; focused AgentSync tests/typecheck/lint pass; `agent-sync.service.ts` drops to 1466 LOC while remaining an open Type D hard target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync-runtime-identity.service.ts`

---

## [2026-06-19 17:07] - [ARCH]

What: Completed Phase 2 Batch 129 incremental Type D cleanup for ArtifactTasks assignee resolution.
Why: `ArtifactTasksService` still owned human assignee lookup/matching and contained generated localhost debug instrumentation inside the oversized task action facade.
Impact: Human assignee resolution now lives in `artifact-task-assignee-resolver.ts`; the generated debug fetch is removed; focused task tests/typecheck/lint pass; `artifact-tasks.service.ts` drops to 1514 LOC while remaining an open Type D hard target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-tasks.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-task-assignee-resolver.ts`

---

## [2026-06-19 17:16] - [ARCH]

What: Completed Phase 2 Batch 130 incremental Type D cleanup for ArtifactTasks schema/default-space behavior.
Why: `ArtifactTasksService` still owned schema option normalization, task-view filtering, item decoration, validation, and default task-space schema inside the oversized action facade.
Impact: Task schema behavior now lives in `artifact-task-schema-helper.ts` and `artifact-task-default-space-schema.ts`; focused task tests/typecheck/lint pass; `artifact-tasks.service.ts` drops to 892 LOC while remaining an open Type D hard target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-tasks.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-task-schema-helper.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-task-default-space-schema.ts`

---

## [2026-06-19 17:22] - [ARCH]

What: Completed Phase 2 Batch 131 Type D cleanup for ArtifactTasks support helpers.
Why: `ArtifactTasksService` still exceeded the service LOC cap after the schema split because activity helpers, task-space resolution, and payload picking remained in the facade.
Impact: Task activity, task-space, and payload support now live in focused helpers; focused task tests/typecheck/lint pass; `artifact-tasks.service.ts` drops to 593 LOC and is resolved as a hard Type D target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-tasks.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-task-activity-helper.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-task-space-resolver.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-task-payload-helper.ts`

---

## [2026-06-19 17:25] - [ARCH]

What: Completed Phase 2 Batch 132 Type D cleanup for ArtifactLegacyMediaGenerateService.
Why: `artifact-legacy-media-generate.service.ts` had grown back over the service LOC cap, mostly from generated localhost ingest debug blocks.
Impact: Generated debug side effects are removed; focused media generation tests/typecheck/lint pass; `artifact-legacy-media-generate.service.ts` drops to 595 LOC and is no longer a hard Type D blocker.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-generate.service.ts`

---

## [2026-06-19 17:30] - [ARCH]

What: Completed Phase 2 Batch 133 incremental Type D cleanup for ArtifactDocuments mission deliverables.
Why: `ArtifactDocumentsService` still owned mission session resolution, mission deliverable persistence compatibility, idempotency keys, and subtask receipt updates inside the oversized document action facade.
Impact: Mission document persistence now lives in `artifact-document-mission-deliverables.service.ts`; generated debug fetches are removed; focused document tests/typecheck/lint pass; `artifact-documents.service.ts` drops to 1037 LOC while remaining an open Type D target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-documents.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-document-mission-deliverables.service.ts`

---

## [2026-06-19 17:39] - [FIX]

What: Removed unused `GroupedRowGripColumn` import in `SpaceQuickAdd` and routed `ArtifactDocumentsService.updateDocument` through `ArtifactDocumentSpaceDocsService` after the space-docs extract.
Why: Workspace `pnpm typecheck` failed with TS6133 in web and missing symbol/method errors in agent-api.
Impact: All 18 turbo typecheck packages pass.
Files:
- `apps/web/src/features/spaces/components/SpaceQuickAdd.tsx`
- `apps/agent-api/src/modules/artifacts/services/artifact-documents.service.ts`

---

## [2026-06-19 17:44] - [ARCH]

What: Completed Phase 2 Batch 134 Type D cleanup for ArtifactDocuments space and Drive document helpers.
Why: `ArtifactDocumentsService` still exceeded the service LOC cap after the mission-deliverable split.
Impact: Space Docs listing, serialization, index building, Drive export reading, linked Space Doc lookup, and Space Doc update helpers now live in `artifact-document-space-docs.service.ts`; focused document tests/typecheck/lint pass; `artifact-documents.service.ts` drops to 588 LOC and is resolved as a hard Type D target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-documents.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-document-space-docs.service.ts`

---

## [2026-06-19 17:54] - [ARCH]

What: Completed Phase 2 Batch 135 Type D cleanup for ArtifactAgentDelegationService.
Why: `ArtifactAgentDelegationService` still owned target resolution, streaming parsing, query/task/brainstorm workflows, and hire approval in one oversized artifact action facade.
Impact: Agent delegation now delegates to focused context, stream, query, task, brainstorm, hire, and shared type collaborators; focused agent-delegation tests/typecheck/lint pass; `artifact-agent-delegation.service.ts` drops to 45 LOC and is resolved as a hard Type D target. A future Type L provider-boundary item tracks the pre-existing external HTTP calls now isolated in focused services.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-agent-delegation.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-agent-delegation.types.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-agent-delegation-context.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-agent-delegation-stream.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-agent-delegation-query.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-agent-delegation-task.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-agent-delegation-brainstorm.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-agent-delegation-hire.service.ts`

---

## [2026-06-19 18:04] - [ARCH]

What: Completed Phase 2 Batch 136 Type D cleanup for ArtifactMissionsMediaService.
Why: `ArtifactMissionsMediaService` still owned media catalog actions, document read/search/OCR, video analysis, URL transcript extraction, and usage charging in one oversized service.
Impact: Missions media now delegates to focused catalog, document, video, transcript, usage, and ffmpeg/process collaborators; focused missions-media tests/typecheck/lint pass; `artifact-missions-media.service.ts` drops to 105 LOC and is resolved as a hard Type D target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifact-missions-media.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-missions-media-catalog.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-missions-media-document.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-missions-media-video.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-missions-media-transcript.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-missions-media-usage.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-missions-media-ffmpeg.ts`

---

## [2026-06-19 18:21] - [ARCH]

What: Completed Phase 2 Batch 137 Type D cleanup for the legacy artifact service.
Why: `artifacts-legacy.service.ts` still owned legacy OpenClaw proxying, provider-cost billing orchestration, and checkpoint snapshot behavior inside the oversized inherited artifact facade.
Impact: Legacy OpenClaw chat proxying, responses proxying, provider-cost billing, and checkpoint behavior now live in focused collaborators; focused legacy artifact tests/typecheck/lint pass; `artifacts-legacy.service.ts` drops to 594 LOC and is resolved as a hard Type D target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/legacy/artifacts-legacy.service.ts`, `apps/agent-api/src/modules/artifacts/legacy/artifacts-legacy-openclaw-chat-proxy.service.ts`, `apps/agent-api/src/modules/artifacts/legacy/artifacts-legacy-openclaw-proxy.service.ts`, `apps/agent-api/src/modules/artifacts/legacy/artifacts-legacy-openclaw-cost.service.ts`, `apps/agent-api/src/modules/artifacts/legacy/artifacts-legacy-checkpoint.service.ts`, `apps/agent-api/src/modules/artifacts/legacy/artifacts-legacy.types.ts`

---

## [2026-06-19 18:31] - [ARCH]

What: Completed Phase 2 Batch 138 incremental Type D cleanup for ChatService collaborator construction.
Why: `ChatService` still carried a large lazy-helper construction block in addition to the remaining `processMessage` workflow.
Impact: Chat helper construction now lives in `chat-service-collaborators.ts`; focused chat tests/typecheck/lint pass; `chat.service.ts` drops to 1532 LOC and remains an open Type D hard target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-service-collaborators.ts`

---

## [2026-06-19 18:38] - [FIX]

What: Changed agent chat image generation to default to OpenRouter `google/gemini-3.1-flash-image` ("Nano Banana 2") instead of `openai/gpt-5.4-image-2`.
Why: The desired chat/avatar default is Nano Banana 2, and the stale action docs still encouraged agents to select GPT Image 2 as the default.
Impact: `generate_image` now routes no-model requests through OpenRouter Gemini 3.1, keeps GPT Image 2 as an explicit override, sends edit input images to OpenRouter, and bills the default under the Gemini image model.
Files: `apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-provider.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-generate.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-provider.service.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-generate.service.test.ts`, `apps/agent-api/src/modules/artifacts/legacy/artifacts-legacy.service.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `.docs/logs/changelog2026-06-19.md`, `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-19 18:43] - [ARCH]

What: Completed Phase 2 Batch 139 incremental Type D cleanup for BrainLive instruction assembly.
Why: `BrainLiveService` still owned Atlas/agent prompt assembly, persona loading, workspace resolution, history/profile context, and Brain context rendering inside the oversized live voice facade.
Impact: BrainLive instruction assembly now lives in `brain-live-instruction.service.ts`; focused BrainLive tests/typecheck/lint pass; `brain-live.service.ts` drops to 1273 LOC and remains an open Type D hard target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/brain/services/brain-live.service.ts`, `apps/agent-api/src/modules/brain/services/brain-live-instruction.service.ts`

---

## [2026-06-19 19:18] - [ARCH]

What: Completed Phase 2 Batch 140 final Type D cleanup for ChatService.
Why: `ChatService` still exceeded the service LOC limit after the collaborator and gateway splits.
Impact: Chat turn bootstrap, session setup, streaming state, stream result handling, terminal completion, and status/access queries now live in focused collaborators; focused chat tests/typecheck/lint pass; `chat.service.ts` drops to 595 LOC and is resolved as a hard Type D target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-service-collaborators.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-bootstrap.service.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-completion.service.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-gateway-preparation.service.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-query.service.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-session.service.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-stream.service.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-streaming-state.service.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-terminal.service.ts`

---

## [2026-06-19 19:30] - [FIX]

What: Routed Slack message edits through the existing Markdown-to-Slack `mrkdwn` renderer and added regression coverage for edited Slack text.
Why: Normal Slack sends already converted Vibey Markdown like `**bold**` to Slack syntax, but edited messages bypassed the renderer and could show raw Markdown in Slack.
Impact: Vibey Slack edits now render bold text, links, and escaped control characters consistently with normal Slack sends.
Files: `apps/openclaw/src/slack/actions.ts`, `apps/openclaw/src/slack/actions.read.test.ts`

---

## [2026-06-19 19:35] - [ARCH]

What: Completed Phase 2 Batch 141 Type D cleanup for `ArtifactsService`.
Why: The artifact action facade still exceeded the service LOC limit after prior artifact-domain splits.
Impact: Action preflight/authorization/resolver flow, integration discovery/connect/domain resolution, and Composio execution/account selection now live in focused helpers; focused artifact tests/typecheck/lint pass; `artifacts.service.ts` drops to 376 LOC and is resolved as a hard Type D target. A generated localhost debug fetch was removed from the touched action path.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-execution.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-integration-orchestrator.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-composio-runtime.service.ts`, `apps/agent-api/src/modules/artifacts/services/__tests__/integration-priority.test.ts`, `apps/agent-api/src/modules/artifacts/services/__tests__/integration-priority.spec.ts`

---

## [2026-06-19 19:51] - [ARCH]

What: Completed Phase 2 Batch 142 Type D cleanup for `CreditsService`.
Why: The agent billing facade still exceeded the service LOC limit after Type C repository extraction.
Impact: Transcript usage reading, pricing calculation, balance/deduction, usage-event processing, and shared credit types now live in focused collaborators; billing tests/typecheck/lint pass; `credits.service.ts` drops to 350 LOC and is resolved as a hard Type D target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/billing/billing.module.ts`, `apps/agent-api/src/modules/billing/services/credits.service.ts`, `apps/agent-api/src/modules/billing/services/credits-transcript.service.ts`, `apps/agent-api/src/modules/billing/services/credits-pricing.service.ts`, `apps/agent-api/src/modules/billing/services/credits-balance.service.ts`, `apps/agent-api/src/modules/billing/services/credits-balance-errors.ts`, `apps/agent-api/src/modules/billing/services/credits-usage-processing.service.ts`, `apps/agent-api/src/modules/billing/services/credits.types.ts`, `apps/agent-api/src/modules/billing/services/credits.service.test.ts`

---

## [2026-06-19 20:08] - [ARCH]

What: Completed Phase 2 Batch 143 Type D cleanup for `OpenClawProxyService`.
Why: The gateway proxy still owned request construction, compatibility retry, SSE reading, stall detection, tool timeline translation, UI block conversion, completion metadata, and failure reporting inside one oversized service.
Impact: Gateway request handling and stream processing now live in focused collaborators; proxy tests/typecheck/lint pass; `openclaw-proxy.service.ts` drops to 124 LOC and is resolved as a hard Type D target. Generated localhost ingest blocks in the imported Anthropic admin auth service were logged as future Type K cleanup.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/chat/chat.module.ts`, `apps/agent-api/src/modules/chat/services/openclaw-proxy.service.ts`, `apps/agent-api/src/modules/chat/services/openclaw-gateway-request.service.ts`, `apps/agent-api/src/modules/chat/services/openclaw-proxy.types.ts`, `apps/agent-api/src/modules/chat/services/openclaw-stream-state.ts`, `apps/agent-api/src/modules/chat/services/openclaw-stream-reader.service.ts`, `apps/agent-api/src/modules/chat/services/openclaw-stream-content.service.ts`, `apps/agent-api/src/modules/chat/services/openclaw-stream-tool.service.ts`, `apps/agent-api/src/modules/chat/services/openclaw-stream-lifecycle.service.ts`, `apps/agent-api/src/modules/chat/services/openclaw-proxy.service.test.ts`

---

## [2026-06-19 20:25] - [ARCH]

What: Completed Phase 2 Batch 144 Type D cleanup for `AgentSyncService`.
Why: Agent sync still held syncAll, personal sync, org sync, scope dedupe, policy skill materialization, and manifest verification in one oversized facade.
Impact: AgentSync now delegates to focused sync orchestration, scope, policy-skill, verification, type, and orchestration-context collaborators; focused AgentSync tests/typecheck/lint pass; `agent-sync.service.ts` drops to 559 LOC and is resolved as a hard Type D target.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/agent-sync/agent-sync.module.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync-all.service.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync-agent.service.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync-org-agent.service.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync-scope.service.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync-policy-skill.service.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync-verification.service.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync.types.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync-orchestration.types.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync-org-shared-skills.service.ts`

---

## [2026-06-19 20:36] - [ARCH]

What: Completed Phase 2 Batch 145 Type D cleanup for `BrainLiveService`.
Why: Brain Live still held action execution, delegation orchestration, document/file reading, tool declarations, transcript persistence, and usage tracking in one oversized live voice facade.
Impact: Brain Live now delegates to focused action, delegation, document, tool-declaration, transcript, and shared contract collaborators; focused BrainLive tests/typecheck/lint pass; `brain-live.service.ts` drops to 478 LOC and resolves the last Phase 2 hard service LOC violation.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-19.md`, `apps/agent-api/src/modules/brain/brain.module.ts`, `apps/agent-api/src/modules/brain/services/brain-live.service.ts`, `apps/agent-api/src/modules/brain/services/brain-live-actions.service.ts`, `apps/agent-api/src/modules/brain/services/brain-live-delegation.service.ts`, `apps/agent-api/src/modules/brain/services/brain-live-document.service.ts`, `apps/agent-api/src/modules/brain/services/brain-live-tool-declarations.service.ts`, `apps/agent-api/src/modules/brain/services/brain-live-transcript.service.ts`, `apps/agent-api/src/modules/brain/services/brain-live.types.ts`, `apps/agent-api/src/modules/brain/services/brain-live-instruction.service.ts`, `apps/agent-api/src/modules/brain/services/brain-live-delegation-stream.service.ts`

---
