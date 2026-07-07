CREATE OR REPLACE FUNCTION get_machine_status_counts()
RETURNS TABLE(status TEXT, count BIGINT)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
STABLE
AS $$
  SELECT
    COALESCE(fly_runtime_status, 'none') AS status,
    COUNT(*) AS count
  FROM profiles
  WHERE fly_machine_id IS NOT NULL
  GROUP BY COALESCE(fly_runtime_status, 'none');
$$;
