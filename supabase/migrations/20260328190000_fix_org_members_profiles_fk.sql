-- Add a direct FK from org_members.user_id to profiles(id) so PostgREST
-- can resolve the profiles join correctly (previously it resolved through
-- invited_by which is null for the owner, showing "Unknown").
ALTER TABLE public.org_members
  ADD CONSTRAINT org_members_user_id_fk_profiles
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);
