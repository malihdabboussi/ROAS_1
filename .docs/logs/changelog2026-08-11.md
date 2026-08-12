# Changelog - August 11, 2026

## [2026-08-11 00:25] - [FIX]

What: Moved Vercel automation cron ingress into a standalone function that imports neither Nest nor BullMQ/Redis, then forwards to the authenticated scheduler execution endpoint.

Why: The cron-origin invocation initialized the monolith's unreachable Railway-private Redis socket and reset Supabase connections after Pixel's schedule claim.

Impact: Scheduled execution enters through a dependency-free function and runs through the already-verified normal serverless path. Compare-and-swap claims, inline fallback, run logging, quiet hours, allowlists, cadence, and caps remain unchanged.

Files: `apps/api/api/space-automation-cron.ts`, standalone function/config tests, `apps/api/vercel.json`, scheduler controller cleanup, documentation.

## [2026-08-11 00:40] - [FIX]

What: Replaced the standalone cron ingress's Express type dependency with its minimal request/response contract.

Why: Vercel successfully emitted the function but reported non-fatal Express declaration diagnostics while compiling it.

Impact: The isolated cron function remains behaviorally identical and now compiles without function-local TypeScript diagnostics.

Files: `apps/api/api/space-automation-cron.ts`, `apps/api/src/space-automation-cron-function.test.ts`.

## [2026-08-11 07:15] - [FEATURE]

What: Added a one-time near-context-limit notification to interactive OpenClaw replies when 10% or at most 32,000 tokens remain.

Why: Pixel should give Dylan the same early warning Viktor provides before a long conversation reaches its context ceiling.

Impact: The warning uses only fresh final-call usage, is suppressed for heartbeats and completed compactions, deduplicates per compaction cycle, and rearms after compaction or session reset. Automatic compaction remains unchanged.

Files: OpenClaw context-warning helper/tests, reply runner, session state, chat stream recovery documentation.

## [2026-08-11 15:57] - [FEATURE]

What: Replaced the mistaken conversation-context warning with Pixel Slack DMs at 70%, 90%, and 100% of monthly organization credits. Added a five-minute authenticated cron, canonical balance calculation, owner-to-Slack routing, retry-safe monthly threshold claims, and the production dedupe migration.

Why: The requested Viktor parity behavior concerns account credit exhaustion, not an individual conversation's context window.

Impact: Organization owners with mapped internal Slack identities receive each crossed threshold once per billing period. Failed Slack deliveries release their pending claim for retry; the unrelated OpenClaw context notice and state were removed.

Files: Billing credit alert controller/module/repository/service/tests, Vercel cron/function test, `billing_credit_slack_alerts` migration, OpenClaw warning rollback, chat recovery documentation.

## [2026-08-11 16:15] - [FIX]

What: Exported `BillingCreditsRepository` from `BillingModule` and added a module-metadata regression test for the Pixel credit-alert dependency boundary.

Why: The first production invocation revealed that the separately isolated alert module could not inject the repository even though TypeScript compilation passed.

Impact: Nest can now bootstrap the billing-alert worker and the regression test prevents the required Billing module import/export contract from drifting.

Files: `billing.module.ts`, `billing-credit-alerts.module.test.ts`.

## [2026-08-11 16:25] - [FIX]

What: Granted service-role table privileges for the `billing_credit_slack_alerts` dedupe ledger.

Why: The table's RLS policy allowed service-role access, but PostgreSQL still denied inserts because the base table grant was missing.

Impact: The production alert worker can atomically claim, mark, and retry Pixel credit-threshold Slack notifications.

Files: `20260811162500_billing_credit_slack_alerts_service_grant.sql`.

## [2026-08-11 14:05] - [FIX]

What: Hardened unified Page Grader meeting agendas so the mapped ROAS campaign agent receives bounded client Brain, meeting, work, and performance context; preserves operator notes; produces a validated six-section screen-share agenda; and writes one retry-safe Google Docs tab.

Why: The first live agenda looked polished but contained generic placeholders because rich agent HTML was not parsed, the wrong campaign could be used, Page Grader context was incomplete, and a prep could be marked ready before a useful Drive agenda existed.

Impact: Client-facing agendas now require specific evidence and decisions, reject lazy placeholder output and unmapped clients, avoid unrelated meeting leakage, preserve integration mapping across reconnects, and expose failed Drive writes for retry instead of reporting false success.

Files: `page-grader-api.service.ts`, `page-grader-brain-sync.service.ts`, `meetings-precall-agenda-sections.ts`, `meetings-precall-drive-agenda.service.ts`, `meetings-precall-prep.helpers.ts`, `meetings-precall-prep.service.ts`, `meetings-precall-related-context.ts`, focused tests including cross-client context isolation, `documentation/features/page-grader-campaign-brain-sync.md`.

## [2026-08-11 18:51] - [FIX]

What: Root-cause fix for clarification cards never triggering for Pixel (W5). The `vibey_backend` plugin now always merges its plugin-local actions (`ask_clarification`, `create_chat_plan`, `update_chat_plan`) into the tool enum for agents running under a scoped `ALLOWED_ACTIONS.json` (`withPluginLocalActions`), and the generated vibey-api skill now documents `ask_clarification` (Communication reference section + a "Clarify ambiguous requests with a card" Important Pattern) for all non-flows domains. Added regression tests: plugin enum exposure + local execute for scoped agents, ui-block-extractor message-shape → clarification block (text-envelope, plain record, flow tab suppression), skill-generator docs presence (and flows-domain exclusion), and web `messageContentBlockPartB` clarification block → ClarificationCard render with answer round-trip via sendOrApprove / flow dispatch.

Why: `ask_clarification` executes locally inside the plugin and is not a backend policy action, so agent-sync's policy-derived `ALLOWED_ACTIONS.json` never contained it. Every synced agent workspace (Pixel included) therefore got a tool schema whose action enum excluded it, and the generated SKILL.md never mentioned it — the model had no way to discover or call the action, so the card could never render. Guidance previously existed only in a TOOLS.md on an unmerged UI branch.

Impact: After merge + agent workspace re-sync, Pixel (and every synced agent) can emit `ask_clarification`; studio drawer and full-page chat render the tappable card (same MessageBubble path), and Slack/Telegram degrade to numbered plain text via the existing proxy conversion. Lifecycle/preflight: the action stays classified plugin-local (hard payload validator lives in the plugin); the capability-source drift test now recognizes plugin-local documented actions.

Files: `docker/tools/vibey-backend/index.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/agent-api/src/modules/agent-sync/services/vibey-api-skill-generator.ts`, `apps/agent-api/src/modules/agent-sync/services/vibey-api-skill-generator.test.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-capability-source-drift.test.ts`, `apps/agent-api/src/modules/shared/vibey-backend-plugin.test.ts`, `apps/agent-api/src/modules/shared/ui-block-extractor.test.ts`, `apps/web/src/features/studio/components/message-bubble/MessageContentBlockSwitchPartB.test.tsx`, `.docs/plans/pixel-next-wave-goal-2026-08-11.md`.
