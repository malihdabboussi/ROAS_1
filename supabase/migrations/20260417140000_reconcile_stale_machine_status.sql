-- Reconcile stale profiles.fly_machine_status rows.
--
-- Context: the old ensureRunning path used to write `failed` to the DB on any
-- wake-probe timeout. Many users ended up with fly_machine_status='failed' or
-- 'suspended' even though their Fly machine was actually healthy. That stale
-- status caused the web proxy to fall back to AGENT_BACKEND_URL (unpinned),
-- which routed traffic to random pool machines with no agent files.
--
-- The new ensureRunning (apps/api/src/modules/machines/services/machines.service.ts)
-- consults Fly's API directly and never reads these columns. The proxy likewise
-- only reads fly_machine_id for routing. Status columns are now informational.
--
-- This migration unblocks any user currently stuck with a stale 'failed' /
-- 'suspended' value. Safe to re-run: it only touches profiles that still have
-- a fly_machine_id (so the row points at a real machine) and whose status is
-- one of the stuck values. If the row is actually stale-wrong, ensureRunning
-- will correct the next write. If the machine really is down, the next user
-- request will wake it up.

UPDATE public.profiles
SET
  fly_machine_status = 'running',
  fly_runtime_status = 'running'
WHERE fly_machine_id IS NOT NULL
  AND (
    fly_machine_status IN ('failed', 'suspended')
    OR fly_runtime_status IN ('failed', 'suspended')
  );
