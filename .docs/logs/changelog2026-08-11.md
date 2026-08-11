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
