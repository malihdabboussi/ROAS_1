# ROAS deploy scripts

Agent-facing entry points for ROAS production deploys. Secrets live in gitignored `scripts/roas/roas-secrets.env` (template: `roas-secrets.env.template`).

## Fly agent runtime (`roas-runtimes`)

**Always use the script — do not run raw `flyctl deploy`.**

```bash
bash scripts/roas/deploy-fly-runtimes.sh
```

What it does:

1. Applies section-9 secrets via `apply-fly-secrets.sh`
2. **Swaps root `.dockerignore` → `docker/fly.dockerignore` for the build, then restores** (see below)
3. Deploys from repo root with `docker/fly.roas.runtime.toml` + `docker/Dockerfile`
4. Prints `/api/health`

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
- **One machine** for shared mode (agent registration is per-machine)

Health should report `mode=shared`, `sync=ok`. Gateway may show `degraded` briefly after deploy while OpenClaw warms.

## Other scripts

| Script                          | Use                                          |
| ------------------------------- | -------------------------------------------- |
| `apply-fly-secrets.sh`          | Re-import section 9 only                     |
| `smoke-deploy.sh`               | Post-Vercel + optional Fly checks            |
| `deploy-railway-workers.sh`     | mission-worker / queue-worker (manual steps) |
| `apply-migrations-resilient.sh` | ROAS Supabase migrations                     |
