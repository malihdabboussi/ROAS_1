-- Org person ↔ calendar email graph for Workspace calendars and phantom people.

CREATE TABLE IF NOT EXISTS public.org_person_calendar_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  calendar_email text NOT NULL,
  display_name text,
  google_workspace_user_id text,
  channel_member_id uuid REFERENCES public.channel_members(id) ON DELETE SET NULL,
  vibey_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  person_brain_id uuid REFERENCES public.ns_brains(id) ON DELETE SET NULL,
  suggested_channel_member_id uuid REFERENCES public.channel_members(id) ON DELETE SET NULL,
  suggested_vibey_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  suggested_person_brain_id uuid REFERENCES public.ns_brains(id) ON DELETE SET NULL,
  match_status text NOT NULL DEFAULT 'unmatched',
  match_method text,
  personal_connection_label text,
  source text NOT NULL DEFAULT 'manual',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_person_calendar_identities_email_unique UNIQUE (org_id, calendar_email),
  CONSTRAINT org_person_calendar_identities_match_status_check
    CHECK (match_status IN ('unmatched', 'suggested', 'confirmed', 'rejected')),
  CONSTRAINT org_person_calendar_identities_source_check
    CHECK (source IN ('manual', 'directory_sync', 'personal_calendar', 'slack_email', 'portal_email'))
);

CREATE INDEX IF NOT EXISTS idx_org_person_calendar_identities_org_status
  ON public.org_person_calendar_identities (org_id, match_status, calendar_email);

CREATE INDEX IF NOT EXISTS idx_org_person_calendar_identities_channel_member
  ON public.org_person_calendar_identities (channel_member_id)
  WHERE channel_member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_org_person_calendar_identities_vibey_user
  ON public.org_person_calendar_identities (vibey_user_id)
  WHERE vibey_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_org_person_calendar_identities_person_brain
  ON public.org_person_calendar_identities (person_brain_id)
  WHERE person_brain_id IS NOT NULL;

ALTER TABLE public.org_person_calendar_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_person_calendar_identities_admin_select
  ON public.org_person_calendar_identities;
CREATE POLICY org_person_calendar_identities_admin_select
  ON public.org_person_calendar_identities
  FOR SELECT
  USING (public.is_org_admin_or_owner(org_id));

DROP POLICY IF EXISTS org_person_calendar_identities_admin_insert
  ON public.org_person_calendar_identities;
CREATE POLICY org_person_calendar_identities_admin_insert
  ON public.org_person_calendar_identities
  FOR INSERT
  WITH CHECK (public.is_org_admin_or_owner(org_id));

DROP POLICY IF EXISTS org_person_calendar_identities_admin_update
  ON public.org_person_calendar_identities;
CREATE POLICY org_person_calendar_identities_admin_update
  ON public.org_person_calendar_identities
  FOR UPDATE
  USING (public.is_org_admin_or_owner(org_id))
  WITH CHECK (public.is_org_admin_or_owner(org_id));

DROP POLICY IF EXISTS org_person_calendar_identities_admin_delete
  ON public.org_person_calendar_identities;
CREATE POLICY org_person_calendar_identities_admin_delete
  ON public.org_person_calendar_identities
  FOR DELETE
  USING (public.is_org_admin_or_owner(org_id));

CREATE TRIGGER set_updated_at_org_person_calendar_identities
  BEFORE UPDATE ON public.org_person_calendar_identities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE public.org_person_calendar_identities IS
  'Org-scoped map from calendar email to Slack People / portal users / Person Brains. Admins confirm matches; agents resolve agendas by email via Workspace DWD.';

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.org_person_calendar_identities
  TO authenticated, service_role;
