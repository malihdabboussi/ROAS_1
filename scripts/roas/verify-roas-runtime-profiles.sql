-- Audit ROAS runtime routing drift. Run after 20260711164000_roas_runtime_infrastructure_defaults.sql.
-- Phase 4 guardrail: any row that still points at Vibey/Railway/govibey infra is DRIFT.

-- 1. Distribution — expect all shared_railway rows on https://roas-runtimes.fly.dev.
SELECT agent_runtime_type, agent_runtime_url, COUNT(*) AS profile_count
FROM public.profiles
GROUP BY 1, 2
ORDER BY profile_count DESC;

SELECT fly_runtime_app, COUNT(*) AS profile_count
FROM public.profiles
WHERE fly_machine_id IS NOT NULL
GROUP BY 1
ORDER BY profile_count DESC;

SELECT fly_app, state, COUNT(*) AS pool_count
FROM public.machine_pool
GROUP BY 1, 2
ORDER BY pool_count DESC;

-- 2. DRIFT — profiles still routed at legacy Vibey/Railway/govibey infra. Expect 0 rows.
SELECT id, agent_runtime_type, agent_runtime_url, fly_runtime_app
FROM public.profiles
WHERE agent_runtime_url ~* '(vibey|railway\.app|govibey)'
   OR fly_runtime_app ~* '(vibey|railway|govibey)';

-- 3. DRIFT — machine pool bound to a legacy Fly app. Expect 0 rows.
SELECT machine_id, fly_app, state
FROM public.machine_pool
WHERE fly_app ~* '(vibey|railway|govibey)';

-- 4. VERDICT — single pass/fail row. drift_rows must be 0 for a clean ROAS cutover.
SELECT
  (SELECT COUNT(*) FROM public.profiles
     WHERE agent_runtime_url ~* '(vibey|railway\.app|govibey)'
        OR fly_runtime_app ~* '(vibey|railway|govibey)')
  + (SELECT COUNT(*) FROM public.machine_pool
       WHERE fly_app ~* '(vibey|railway|govibey)') AS drift_rows,
  CASE WHEN (
    (SELECT COUNT(*) FROM public.profiles
       WHERE agent_runtime_url ~* '(vibey|railway\.app|govibey)'
          OR fly_runtime_app ~* '(vibey|railway|govibey)')
    + (SELECT COUNT(*) FROM public.machine_pool
         WHERE fly_app ~* '(vibey|railway|govibey)')
  ) = 0 THEN 'OK — no legacy Vibey/Railway drift'
       ELSE 'DRIFT — legacy Vibey/Railway/govibey routing present' END AS verdict;
