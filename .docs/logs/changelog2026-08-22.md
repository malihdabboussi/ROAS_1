# Changelog - August 22, 2026

## 2026-08-22 14:24 - [FEATURE]

What: Added a GitHub-distributed Claude plugin for ROAS missions and the Pixel Ladder 1–30 runbook, exposed complete mission supervision tools through the hosted MCP catalog, added reusable MCP mission guidance, and preserved structured tool-error envelopes across MCP execution failures.

Why: Claude could create a mission but could not inspect its plan, subtasks, logs, or deliverables, so it could not safely supervise work or prove completion.

Impact: Claude Cowork and other MCP clients can launch an idempotent mission, follow its durable execution state, stop at human gates, and report evidence-backed outcomes. The plugin validates against Claude's current plugin format and connects to `https://mcp.roas.io` through OAuth.

Files: `.claude-plugin/marketplace.json`, `plugins/roas-missions/**`, `packages/agent-policy/src/mcp-catalog.ts`, `apps/agent-api/src/modules/vibey-mcp/services/**`, `apps/docs/content/integrations/vibey-mcp.mdx`, `documentation/features/missions.md`.

## 2026-08-22 14:42 - [FIX]

What: Removed the stale `campaignNameFromMappingPath` import from the meeting-action task mapper.

Why: The helper was moved to the shared work-items module in `6cdc1e53`, but the old mapper gained an unused import during that move. TypeScript therefore blocked the `roas-web` Vercel preview for the Claude plugin PR.

Impact: The mapper's behavior is unchanged, and the web preview can complete TypeScript validation.

Files: `apps/web/src/features/home/lib/meeting-action-to-task-rollup.ts`.

## 2026-08-22 14:42 - [FIX]

What: Restored the local type-only `LlmModelOption` import in the Studio chat service while retaining its compatibility re-export.

Why: Moving the model option contract to `features/studio/types` left the service with a re-export but no local binding, so its existing `fetchLlmModels` return type blocked the `roas-web` Vercel preview.

Impact: The public Studio service contract and runtime behavior are unchanged, while TypeScript can resolve the model catalog response type again.

Files: `apps/web/src/features/studio/services/chat.service.ts`.

## 2026-08-22 14:52 - [FIX]

What: Replaced the meeting agenda adapter's duplicated Page Grader write shape with the canonical `PageGraderMeetingAgendaWrite` and result contracts.

Why: The canonical agenda now supports structured discussion topics and optional performance text, while the stale local `Record<string, string>` type rejected both and blocked the generic Vercel preview.

Impact: Runtime behavior is unchanged, and future Page Grader agenda contract changes now flow through the adapter's type boundary instead of drifting silently.

Files: `apps/api/src/modules/spaces/services/meetings-precall-drive-agenda.service.ts`.

## 2026-08-22 15:11 - [FIX]

What: Typed the initial chat retrieval-receipt stream as `BrainRetrievalReceipt[]` instead of `unknown[]`.

Why: The Fly production image correctly rejected the untyped receipt at the `SendFn` boundary, which requires a structured record and prevented the merged Claude MCP release from compiling.

Impact: Initial Brain retrieval receipts retain their existing runtime payload while the Agent API production build can verify the stream contract statically.

Files: `apps/agent-api/src/modules/chat/services/chat-turn-streaming-state.service.ts`.

## 2026-08-22 19:28 - [FIX]

What: Corrected the hosted MCP POST transport to return `200 OK` for JSON-RPC requests and `202 Accepted` with no body for notifications.

Why: NestJS defaulted successful POSTs to `201 Created`. Direct OAuth diagnostics proved the token, organization context, tool catalog, and mission actions were valid, but Claude rejected the non-standard transport status before exposing the tool result.

Impact: Claude and other Streamable HTTP MCP clients can accept successful ROAS tool responses, while notification handling now matches the MCP transport contract.

Files: `apps/agent-api/src/modules/vibey-mcp/controllers/vibey-mcp.controller.ts`, `apps/agent-api/src/modules/vibey-mcp/controllers/vibey-mcp.controller.test.ts`, `apps/docs/content/integrations/vibey-mcp.mdx`.

## 2026-08-22 20:33 - [FIX]

What: Clarified the hosted MCP route from the system General campaign into its child Spaces, constrained Personal Brain memory types in the hard action schema, and mirrored the complete structured error envelope into MCP text content.

Why: Claude interpreted `general: true` as the UI General workspace even though that filter means `campaign_id IS NULL`, accepted the unsupported `note` memory type until runtime, and could not reliably see structured error details returned only through `structuredContent`.

Impact: Claude and other MCP clients can resolve the real General workspace without false access conclusions, reject invalid memory writes before side effects, and receive actionable error codes, correction instructions, retry policy, and workflow evidence on every agent-visible failure.

Files: `packages/agent-policy/src/mcp-catalog.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, `apps/agent-api/src/modules/vibey-mcp/services/**`, `apps/docs/content/integrations/vibey-mcp.mdx`.
