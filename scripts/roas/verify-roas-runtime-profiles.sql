-- Audit ROAS runtime routing drift. Run after 20260711164000_roas_runtime_infrastructure_defaults.sql.

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
