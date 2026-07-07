BEGIN;

DROP POLICY IF EXISTS "Users can delete own activity" ON public.space_item_activity;
CREATE POLICY "Users can delete own activity"
  ON public.space_item_activity FOR DELETE TO public
  USING ((SELECT auth.uid()) = user_id);

COMMIT;
