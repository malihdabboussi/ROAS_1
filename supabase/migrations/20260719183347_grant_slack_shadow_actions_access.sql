-- The Shadow Mode migration enabled RLS but omitted base table privileges.
-- RLS policies still restrict authenticated access to organization admins/owners.

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.slack_shadow_actions
  TO authenticated, service_role;
