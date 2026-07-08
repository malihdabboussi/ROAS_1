# Changelog - July 08, 2026

## [2026-07-08 06:25] - [ARCH]

What: Ship ROAS production bundle to main — Fly runtime deploy docs/script fix, OpenClaw config, ROAS migrations/scripts, free onboarding billing path, agent onboarding HR seed fix, Vercel api workspace packaging, web flows/spaces fixes.
Why: Runtime chat fix was live-only; API/web onboarding and deploy tooling were uncommitted; repo must match production and trigger Vercel redeploys.
Impact: Push to main redeploys roas-api/roas-web; Fly redeploy via `bash scripts/roas/deploy-fly-runtimes.sh`; migration order + resilient runner committed for ROAS Supabase.
Files: `docker/*`, `scripts/roas/*`, `apps/api/*`, `apps/web/*`, `supabase/migrations/*`, `.dockerignore`, `.gitignore`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 06:35] - [FIX]

What: Hotfix roas-api Vercel runtime — restore `file:` workspace dep rewrite in `vercel-build.sh` and use `Express` type from `express` in `api/index.ts`.
Why: Commit `9758c81e` deploy built but `/api` returned `FUNCTION_INVOCATION_FAILED` (serverless could not resolve workspace packages without `file:` materialization).
Impact: Redeploy roas-api should restore `api.roas.io` health.
Files: `apps/api/scripts/vercel-build.sh`, `apps/api/api/index.ts`, `.docs/logs/changelog2026-07-08.md`

## [2026-07-08 07:38] - [FIX]

What: Stopped generic `Service unavailable` chat failures from being classified as model-busy errors while preserving explicit provider overload and rate-limit handling.
Why: Users could see “The model is busy” even after switching models when the real failure was runtime or gateway availability.
Impact: Chat send errors now point users toward temporary assistant/runtime unavailability instead of blaming the selected model for generic 503-style failures.
Files: `apps/agent-api/src/modules/chat/chat-stream-errors.ts`, `apps/agent-api/src/modules/chat/chat-stream-errors.test.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-recovery.service.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-recovery.service.test.ts`, `apps/web/src/lib/chat/chat-stream-errors.config.ts`, `apps/web/src/lib/chat/chat-stream-errors.config.test.ts`, `apps/web/src/features/studio/config/chat-stream-errors.config.test.ts`, `.docs/logs/changelog2026-07-08.md`
