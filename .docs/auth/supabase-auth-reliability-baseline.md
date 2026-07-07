# Supabase Auth Reliability Baseline

## Endpoint Guard Inventory

- `AuthGuard` (`@vibey/api-shared`) protects user JWT endpoints across:
  - `apps/agent-api` chat + conversations controllers
  - `apps/api` user-facing controllers (campaigns, missions, integrations, domains, users, etc.)
- `BrainAuthGuard` protects brain endpoints in:
  - `apps/api/src/modules/brain/controllers/*`
  - `apps/agent-api` brain service access points
- `InternalAuthGuard` protects internal service routes:
  - `apps/api` internal/funnels/missions internal controllers
  - `apps/agent-api` artifacts + agent-sync internal controllers

## Auth Error Taxonomy (Shared)

- `missing_authorization_header`
- `invalid_authorization_header`
- `token_invalid`
- `token_expired`
- `claims_invalid`
- `auth_provider_unavailable`

## HTTP Mapping Contract

- `token_*` and invalid auth header errors -> `401`
- auth provider availability/network faults -> `503`
- non-auth unhandled faults -> `500`

## Baseline Metrics Definitions

- `auth_requests_total{guard,app,result}`
  - `result`: `success|unauthorized|unavailable|error`
- `auth_latency_ms{guard,app}`
  - request-to-decision timing inside guard.
- `auth_jwks_verify_failures_total{reason}`
  - `reason`: `token_invalid|token_expired|claims_invalid|auth_provider_unavailable`
- `auth_unavailable_503_total{app,route}`
  - count of `503` caused by auth/network availability.
- `auth_first_request_after_warmup_total{result}`
  - `result`: `success|failure|timeout`

## SLO Targets

- first authenticated request success after machine warmup: `>= 99.5%`
- auth decision latency p95 (warm machine): `< 250ms`
- auth provider unavailable rate: `< 0.1%` rolling 24h
