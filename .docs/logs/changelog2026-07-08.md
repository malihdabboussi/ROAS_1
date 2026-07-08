# Changelog - July 08, 2026

## [2026-07-08 06:25] - [ARCH]

What: Ship ROAS production bundle to main — Fly runtime deploy docs/script fix, OpenClaw config, ROAS migrations/scripts, free onboarding billing path, agent onboarding HR seed fix, Vercel api workspace packaging, web flows/spaces fixes.
Why: Runtime chat fix was live-only; API/web onboarding and deploy tooling were uncommitted; repo must match production and trigger Vercel redeploys.
Impact: Push to main redeploys roas-api/roas-web; Fly redeploy via `bash scripts/roas/deploy-fly-runtimes.sh`; migration order + resilient runner committed for ROAS Supabase.
Files: `docker/*`, `scripts/roas/*`, `apps/api/*`, `apps/web/*`, `supabase/migrations/*`, `.dockerignore`, `.gitignore`, `.docs/logs/changelog2026-07-08.md`
