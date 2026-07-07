# Job Payload `orgId` Audit (apps/api -> workers)

## Scope

- Source app: `apps/api`
- Target workers: `apps/queue-worker`, `apps/mission-worker`
- Goal: confirm whether queue payloads include `orgId`

## Evidence

### 1) No BullMQ `queue.add(...)` usage found in `apps/api/src/modules`

Search pattern used:

- `queue.add(`
- `.add(`
- `@InjectQueue`
- `Queue<`

Result: no queue producer in `apps/api/src/modules` matching BullMQ-style enqueue.

### 2) Email sends are routed through DB schedule tables, not in-memory queue payloads

In `apps/api/src/modules/email-campaigns/services/email-orchestrator.service.ts`:

- `routeToBullMQ(...)` writes to:
  - `email_single_schedules`
  - `email_broadcast_schedules`
- No `queue.add` call is present.
- Worker picks up schedules from DB.

## Risk

If org context is not persisted in schedule rows, workers cannot safely scope by org.

## Required Follow-up

1. Verify schedule tables include `org_id` columns:
   - `email_single_schedules`
   - `email_broadcast_schedules`
2. If missing, add `org_id` to schedule tables and write it at insert time from API.
3. Ensure worker queries include:
   - `.eq('org_id', orgId)` when org mode
   - `.is('org_id', null)` when personal mode

