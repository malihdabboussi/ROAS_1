# ROAS Platform

## Purpose

ROAS Platform is an agent-driven marketing and operations platform maintained as a monorepo.

## Apps

- `apps/web`: Next.js 16 product app on port 3000.
- `apps/api`: NestJS platform API on port 3001.
- `apps/agent-api`: agent backend on port 3003.
- `apps/openclaw`: OpenClaw gateway on port 18789.
- `apps/admin`: admin app on port 3002.
- `apps/funnels` and `apps/website`: funnel and public website surfaces.
- `apps/queue-worker`, `apps/mission-worker`, and `workers/apps-proxy`: background and proxy runtimes.

## Stack

Turborepo with pnpm 9.15.4, Node 22, TypeScript, Next.js, NestJS, Supabase, BullMQ/Redis, Playwright, and Vitest.

## Deploy map

| Surface | Provider | Evidence | Trigger |
|---|---|---|---|
| `apps/web` | Vercel | `apps/web/vercel.json`; `NEXT_PUBLIC_BACKEND_URL=https://api.roas.io` | git push → Vercel preview; merge to `main` → production |
| `apps/api` | Vercel project `roas-api` (`api.roas.io`) | `apps/api/.vercel/project.json`, `apps/api/vercel.json` (functions + crons) | same as web |
| `apps/agent-api` + OpenClaw runtime | Fly.io app `roas-runtimes` | `docker/fly.roas.runtime.toml`, `AGENT_BACKEND_URL=https://roas-runtimes.fly.dev`, `scripts/roas/deploy-fly-runtimes.sh` | manual: `bash scripts/roas/deploy-fly-runtimes.sh` (never raw `flyctl deploy`) |
| `apps/queue-worker`, `apps/mission-worker` | Railway project `roas-workers` (services `queue-worker`, `roas-platform`=mission-worker Dockerfile, `Redis`) | Railway MCP `get-service-config`: source `dylanvanas1/roas-platform` branch `main` | auto-deploy on merge to `main`; variables managed in the Railway dashboard / Railway MCP `set-variables`. `scripts/roas/deploy-railway-workers.sh` is a **sensitive manual helper** that prints secret `KEY=value` pairs to stdout and does not deploy: agents must never run it or capture its output in logs |
| `workers/apps-proxy` | Cloudflare Worker | `scripts/roas/deploy-apps-proxy.sh` | manual script |
| Legacy | VM + cloudflared (`.docs/deployment/backend-separation.md`) | doc describes an earlier topology; `apps/*/railway.json` for api/agent-api are unused configs | label as legacy in CLAUDE.md |

`/ship` never deploys. It opens a PR, which may create Vercel previews, and stops. Production deploys require a manual GitHub merge or the documented manual scripts. For Fly, use only `bash scripts/roas/deploy-fly-runtimes.sh`. `scripts/roas/deploy-railway-workers.sh` prints secret `KEY=value` pairs and does not deploy; agents must never run it or capture its output.

## Data

The only production Supabase project is `lhfgtsjetcardinpgouq`. Never use the legacy project `qfrvykscoymiwwgysvsr` for production data or migrations.

## Where rules and docs live

- Operating protocol: `AGENTS.md`
- Guidelines: `.docs/guidelines/{architecture,design,development,ai,features}`
- Agent skills: `.agents/skills/*/SKILL.md`
- Claude rules: `.claude/rules/*.md`
- Feature docs: `documentation/features`
- Utility docs: `documentation/utilities`
- Daily changelog: `.docs/logs/changelog<date>.md`
- Follow-up work: `.docs/plans/agent-follow-up-work.md`
- Pull request template: `.github/pull_request_template.md`

<!-- claude-command-set:surfaces:start -->
## Repo surfaces

default_branch: main
docs_dir: documentation/features
changelog_dir: .docs/logs
design_guide: .docs/guidelines/design/design-guidelines.md
pr_template: .github/pull_request_template.md
allowed_test_hosts: []
preview_provider: vercel
<!-- claude-command-set:surfaces:end -->

@AGENTS.md
