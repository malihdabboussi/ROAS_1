-- Broadcast policy cache invalidations across API processes.

CREATE OR REPLACE FUNCTION public.notify_agent_policy_invalidate(
  p_agent_key text DEFAULT NULL,
  p_team_id uuid DEFAULT NULL,
  p_org_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify(
    'agent_policy_invalidate',
    jsonb_build_object(
      'agentKey', p_agent_key,
      'teamId', p_team_id,
      'orgId', p_org_id,
      'userId', p_user_id
    )::text
  );
END;
$$;

REVOKE ALL ON FUNCTION public.notify_agent_policy_invalidate(text, uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_agent_policy_invalidate(text, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_agent_policy_invalidate(text, uuid, uuid, uuid) TO service_role;
