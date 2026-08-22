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
