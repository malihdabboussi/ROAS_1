-- Personal (non-org) users must be able to enqueue their own mission_outbox rows.
-- Without this, mission create via user JWT succeeds for missions + logs but fails
-- (or never enqueues) plan dispatch when SUPABASE_DIRECT_DB_URL is unset.

DROP POLICY IF EXISTS "Users can write own mission outbox rows" ON public.mission_outbox;
CREATE POLICY "Users can write own mission outbox rows"
ON public.mission_outbox
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
