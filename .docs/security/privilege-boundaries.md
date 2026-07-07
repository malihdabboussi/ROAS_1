# Mission Privilege Boundaries

## Current Boundary Model

- Request path (`AuthGuard` + `RoleGuard`) uses user-scoped RLS clients.
- `RoleGuard` no longer reads roles with service-role credentials.
- Worker paths keep service-role usage only for machine-to-machine mission processing.
- Outbox RLS remains strict for user inserts and service-role operational updates.

## Approved Service-Role Surfaces

- `apps/mission-worker/src/lib/services/database.service.ts`
- `apps/queue-worker/src/lib/services/database.service.ts`

These are background workers without user JWT context. Service-role usage here is intentional and required.

## Reduced Service-Role Surfaces

- `packages/api-shared/src/guards/role.guard.ts` migrated to request-scoped client from `AuthGuard`.

## Enforcement

- Any new API endpoint must prefer `request.supabase` (RLS-scoped) for user data access.
- Service-role client additions must include a specific machine-only justification.
