# Security Hardening Runbook

## Scope

This runbook covers:

- auth verification failures (`jwt_invalid`, `jwks_unreachable`, `token_expired`),
- Supabase transport failures (`ENOTFOUND`, `ECONNRESET`, timeout/abort),
- mission outbox lag/retry/dead-letter behavior.

## Signals and SLO Targets

- Auth verification hard-fail rate: `< 0.5%` of authenticated requests in 5m window.
- Supabase transport retry exhaustion: `< 1%` of Supabase-bound requests in 5m window.
- Outbox lag (`pending oldest row age`): `< 60s` steady state.
- Outbox dead-letter count: `0` sustained; page on first recurring burst.

## Alert Thresholds

- **Auth failure burst**
  - Trigger: `>= 20` auth failures in 5m with same taxonomy code.
  - Action: inspect auth logs for `[AUTH]` codes; validate `SUPABASE_URL` and JWKS reachability.
- **Network transport burst**
  - Trigger: `>= 25` `[supabase_fetch] ... retry_error=` in 5m.
  - Action: run predeploy health gate, confirm DNS + auth + PostgREST paths.
- **Outbox lag**
  - Trigger: oldest pending outbox row age `> 180s` for 10m.
  - Action: check worker logs for circuit-open events and listener health.
- **Outbox dead-letter**
  - Trigger: any new `outbox_dead_letter` log.
  - Action: inspect row error payload, validate queue enqueue path and event payload contract.

## Triage Checklist

1. Confirm current deployment health:
   - run `pnpm security:predeploy:check` from repo root with production env vars.
2. Confirm worker listener health:
   - log should include `Outbox listener armed (channel=mission_outbox_new)`.
3. Confirm dispatcher is not continuously circuit-open:
   - look for `Outbox circuit opened`.
4. Confirm auth failure taxonomy:
   - inspect `[AUTH] jwt_invalid_*`, `[AUTH] token_expired`, `[AUTH] jwks_*`.
5. Confirm outbox state:
   - query `mission_outbox` for rows in `pending|processing|dead_letter`.

## Recovery Actions

- Auth/JWKS failure:
  - verify Supabase auth endpoint and JWKS URL reachability.
  - if JWKS endpoint is degraded, hold deployment promotion and retry.
- Network failures:
  - verify DNS resolution from host, then auth endpoint, then DB query path.
  - if failures persist, roll back to last-known-good deployment.
- Outbox dead-letter:
  - replay or manually requeue rows only after root cause is identified.
  - do not bulk-retry while transport or queue path is unstable.

## Rollback

- Fly:
  - `flyctl releases --app vibey-runtimes`
  - `flyctl deploy --app vibey-runtimes --config docker/fly.runtime.toml --image registry.fly.io/vibey-runtimes:<previous-tag>`
- Vercel:
  - promote last healthy deployment from dashboard/CLI only after health-gate checks pass.
