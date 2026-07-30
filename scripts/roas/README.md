# ROAS deploy scripts

Agent-facing entry points for ROAS production deploys. Secrets live in gitignored `scripts/roas/roas-secrets.env` (template: `roas-secrets.env.template`).

## Personal → org Meetings / spaces clone (one-time)

`clone-personal-spaces-to-org.py` clones Dylan's personal Meetings (items + Fathom Meeting Log) into ROAS org General, moves CEO HQ + Sales Pipeline into org General, disables the personal Fathom automation, and sets Fathom auto-ingest billing to the ROAS org.

```bash
python3 scripts/roas/clone-personal-spaces-to-org.py --dry-run
python3 scripts/roas/clone-personal-spaces-to-org.py
```

Idempotent: skips clone if org Meetings already exists; skips moves already on org General.

## ROAS Company Wiki rebuild

`rebuild-company-wiki.py` upgrades the existing ROAS Internal wiki records in place. It uses
locally maintained, human-authored operating blueprints; private ROAS source content is not sent
to an external model. Dry-run and audit modes are read-only, and the script refuses any database
host other than the configured ROAS production project.

```bash
# Validate every process without writing
python3 scripts/roas/rebuild-company-wiki.py

# Update one category, then rebuild the six navigation pages
python3 scripts/roas/rebuild-company-wiki.py --category="PAID MEDIA & ADVERTISING" --apply
python3 scripts/roas/rebuild-company-wiki.py --navigation --apply

# Verify the complete 84-process / 6-navigation topology and content contract
python3 scripts/roas/rebuild-company-wiki.py --audit
```

The process updates existing records only. Every SOP must pass the required-section, ordered
procedure, evidence, decision-table, QA, troubleshooting, escalation, and minimum-depth checks
before any write occurs. It does not approve or modify Company Cortex signals.

## Fly agent runtime (`roas-runtimes`)

**Always use the script — do not run raw `flyctl deploy`.**

```bash
bash scripts/roas/deploy-fly-runtimes.sh
```

What it does:

1. Applies section-9 secrets via `apply-fly-secrets.sh`
2. **Swaps root `.dockerignore` → `docker/fly.dockerignore` for the build, then restores** (see below)
3. Deploys from repo root with `docker/fly.roas.runtime.toml` + `docker/Dockerfile`
4. Prints `/api/health/deep` and fails when OpenClaw or auth is unreachable

Post-deploy smoke:

```bash
SMOKE_FLY=1 bash scripts/roas/smoke-deploy.sh
```

### Why the `.dockerignore` swap?

Root `.dockerignore` excludes `apps/openclaw` and `apps/agent-api` so Railway `mission-worker` snapshots stay small. The Fly runtime image **needs** those apps.

Fly/Depot uses BuildKit, which reads `.dockerignore` from the build context root only. **`flyctl deploy --ignorefile` is ignored** ([flyctl#3870](https://github.com/superfly/flyctl/issues/3870)). Raw `flyctl deploy` fails with:

```text
"/apps/openclaw": not found
"/apps/agent-api": not found
```

`deploy-fly-runtimes.sh` handles the swap automatically. Do not deploy Fly runtimes with bare `flyctl deploy`.

### Config files

| File                            | Purpose                                                                |
| ------------------------------- | ---------------------------------------------------------------------- |
| `docker/fly.roas.runtime.toml`  | Fly app config (ROAS only; `docker/fly.runtime.toml` is Vibey staging) |
| `docker/fly.dockerignore`       | Build context for Fly — includes openclaw + agent-api                  |
| `docker/openclaw.json`          | Baked into image; invalid plugins break `/v1/responses`                |
| `scripts/roas/roas-secrets.env` | Section 9 → Fly secrets                                                |

### Runtime requirements

- `AGENT_RUNTIME_MODE=shared` (section 9)
- `OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789` (in-container gateway, not public URL)
- `OPENROUTER_INTERACTIVE_API_KEY` for interactive Chat requests
- `OPENROUTER_BACKGROUND_API_KEY` for Mission and Brain requests
- `OPENROUTER_MEDIA_API_KEY` for media and image requests
- `OPENROUTER_API_KEY` remains the temporary fallback while the scoped keys are rolled out
- **One machine** for shared mode (agent registration is per-machine)

The scoped OpenRouter credentials are injected only for the active request and are
never persisted in OpenClaw sessions. Section 9 supplies all three scopes to the Fly
runtime. The API deployment also needs the background and media scopes for direct
analysis, billing reconciliation, and image calls. Rotate any credential pasted into
chat before adding it to `roas-secrets.env` or a production provider.

The image build runs OpenClaw's plugin-aware config validation after all runtime
plugins are installed. An unknown plugin now fails the build before Fly can
release it.

Fly checks `/api/health/deep`, which returns a non-2xx response when OpenClaw or
auth is unreachable. `/api/health` remains the lightweight process-health route
for diagnostics during startup.

## Other scripts

| Script                             | Use                                                           |
| ---------------------------------- | ------------------------------------------------------------- |
| `apply-fly-secrets.sh`             | Re-import section 9 only                                      |
| `smoke-deploy.sh`                  | Post-Vercel + optional Fly checks (also runs env-freshness)   |
| `deploy-railway-workers.sh`        | mission-worker / queue-worker (manual steps)                  |
| `apply-migrations-resilient.sh`    | ROAS Supabase migrations                                      |
| `verify-roas-runtime-profiles.sql` | Drift audit — fails if any profile/pool still routes to Vibey |
| `verify-vercel-env-freshness.sh`   | Guard — confirms critical env vars predate current prod build |

The root `.railwayignore` keeps Railway CLI mission-worker uploads aligned with
the mission-worker Docker build context. Do not remove the other-app exclusions:
tracked files in those apps are not part of the worker image and may include
machine-local symlink fixtures that the Railway uploader cannot archive.

### Drift guardrails (Phase 4)

Vercel bakes env vars at **build time**, so adding a var without redeploying leaves
production running without it (this bit us on `FLY_RUNTIME_APP` and `WORKER_SECRET`).

```bash
# Confirm no profile/machine still points at Vibey/Railway/govibey (expect verdict OK):
bash scripts/roas/apply-via-supabase-api.sh scripts/roas/verify-roas-runtime-profiles.sql

# Confirm critical env vars were set before the current prod build:
bash scripts/roas/verify-vercel-env-freshness.sh
```

`smoke-deploy.sh` runs the env-freshness guard automatically when `roas-secrets.env`
is present (set `SMOKE_ENV=0` to skip). Pass `AGENT_SLUG=<slug>` to also check the
`agents.roas.io` public-agent proxy.
