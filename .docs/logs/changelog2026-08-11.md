# Changelog - August 11, 2026

## [2026-08-11 00:25] - [FIX]

What: Moved Vercel automation cron ingress into a standalone function that imports neither Nest nor BullMQ/Redis, then forwards to the authenticated scheduler execution endpoint.

Why: The cron-origin invocation initialized the monolith's unreachable Railway-private Redis socket and reset Supabase connections after Pixel's schedule claim.

Impact: Scheduled execution enters through a dependency-free function and runs through the already-verified normal serverless path. Compare-and-swap claims, inline fallback, run logging, quiet hours, allowlists, cadence, and caps remain unchanged.

Files: `apps/api/api/space-automation-cron.ts`, standalone function/config tests, `apps/api/vercel.json`, scheduler controller cleanup, documentation.
