# CEO awareness E2E demo (seed + how to observe)

## What must be true (production `mission-worker`)

1. **`DATABASE_URL`** (direct Postgres) is set — without it, `hasPgPool()` is false and **no user is eligible** (`getUsersWithCLevelAgents` returns `[]`; awareness never runs).
2. **`AWARENESS_LOOP_ENABLED`** is not `false`.
3. User row: **`awareness_loop_enabled = true`** (Mission Control toggle).
4. User has **paid** subscription (`subscription_plans.slug != 'free'`), **CEO** archetype on `agents_registry` (`level = c_level`, `config.archetype = 'ceo'`).
5. **`monthly_credit_usage`** for current month has **remaining credits &gt; 0** (otherwise awareness auto-disables and inserts a notification).
6. **Unconsumed** `agent_signals` **sum(weight) &ge; 4** after synthetic checks (`checkSyntheticSignals`).
7. No **`agent_awareness_sessions`** row with `status = 'in_progress'`.
8. **`profiles.last_ceo_eval_at`** older than **10 minutes** (or `NULL`) — shared cooldown with CEO ops loop.
9. Scheduler runs **`runSignalIntelligence`** on an interval; default **`MISSIONS_WATCHDOG_MS`** is **900000** (15 minutes). For faster iteration locally use e.g. `MISSIONS_WATCHDOG_MS=60000`.

## What to watch after a run

- `agent_awareness_sessions` — new completed row, `decision` = notify | act | wait.
- `agent_awareness_points` — if `notify` and non-empty `content`.
- `missions_logs` — `awareness.comment`, `awareness.reassigned`, `awareness.subtask_nudged`, `awareness.progress_notes`, or `mission.retried` with `retried_by: awareness`.
- Mission row — `failed`/`error` &rarr; `inbox` if model emitted `retry_mission` and dispatcher executed it.

## Re-run seed SQL (another user or after cleanup)

Adjust `user_id`, `campaign_id`, and idempotency prefixes.

```sql
UPDATE profiles SET awareness_loop_enabled = true WHERE id = '<USER_UUID>';

INSERT INTO missions (user_id, title, brief, status, campaign_id, assigned_agent_key, idempotency_key, error, progress_notes)
VALUES
  ('<USER_UUID>', 'DEMO: Awareness — failed (retry target)', 'Synthetic; delete after test.', 'failed', '<CAMPAIGN_UUID>', 'vibey',
   'demo-awareness-failed-' || gen_random_uuid()::text, 'Demo: simulated timeout', 'Awareness E2E seed'),
  ('<USER_UUID>', 'DEMO: Awareness — blocked', 'Synthetic; delete after test.', 'blocked', '<CAMPAIGN_UUID>', 'vibey',
   'demo-awareness-blocked-' || gen_random_uuid()::text, null, 'Demo: user decision needed');

-- Sum of unconsumed weights must be >= 4
INSERT INTO agent_signals (user_id, campaign_id, signal_type, signal_data, weight)
VALUES
  ('<USER_UUID>', '<CAMPAIGN_UUID>', 'demo_awareness_seed', '{"note":"E2E"}', 2),
  ('<USER_UUID>', '<CAMPAIGN_UUID>', 'demo_awareness_seed_b', '{"note":"E2E"}', 2);
```

## Cleanup (optional)

Delete dependents before `missions` if your DB enforces FKs (order may vary):

```sql
UPDATE profiles SET awareness_loop_enabled = false WHERE id = '<USER_UUID>';

-- Resolve demo mission ids first, then:
DELETE FROM mission_outbox WHERE mission_id IN (SELECT id FROM missions WHERE user_id = '<USER_UUID>' AND title LIKE 'DEMO: Awareness%');
DELETE FROM missions_logs WHERE mission_id IN (SELECT id FROM missions WHERE user_id = '<USER_UUID>' AND title LIKE 'DEMO: Awareness%');
DELETE FROM mission_subtasks WHERE mission_id IN (SELECT id FROM missions WHERE user_id = '<USER_UUID>' AND title LIKE 'DEMO: Awareness%');
DELETE FROM missions_plans WHERE mission_id IN (SELECT id FROM missions WHERE user_id = '<USER_UUID>' AND title LIKE 'DEMO: Awareness%');
DELETE FROM tasks WHERE mission_id IN (SELECT id FROM missions WHERE user_id = '<USER_UUID>' AND title LIKE 'DEMO: Awareness%');
DELETE FROM missions WHERE user_id = '<USER_UUID>' AND title LIKE 'DEMO: Awareness%';

DELETE FROM agent_signals WHERE user_id = '<USER_UUID>'
  AND signal_type IN ('demo_awareness_seed', 'demo_awareness_seed_b');
```

## No instant “fire awareness” button in repo

The worker only runs awareness from **`MissionsScheduler`** (interval). For a **one-off** run you’d add a guarded internal route or a small script that bootstraps Nest and calls `CeoAwarenessRunner.run(userId)` — not shipped by default.
