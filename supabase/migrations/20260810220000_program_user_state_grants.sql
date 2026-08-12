-- Allow the application roles to use the per-user Program state table.
-- Row-level security policies continue to restrict authenticated users to their own rows.
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.program_user_state
TO authenticated, service_role;
