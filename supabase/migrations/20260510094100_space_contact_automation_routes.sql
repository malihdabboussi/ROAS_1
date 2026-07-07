CREATE TABLE IF NOT EXISTS space_contact_automation_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID,
  trigger_type TEXT NOT NULL CHECK (
    trigger_type IN (
      'contact_created',
      'contact_updated',
      'contact_tag_added',
      'contact_tag_removed',
      'contact_type_changed',
      'contact_source_changed'
    )
  ),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'error')),
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (space_id, automation_id)
);

CREATE INDEX IF NOT EXISTS idx_space_contact_automation_routes_user
  ON space_contact_automation_routes(user_id, trigger_type, status);

CREATE INDEX IF NOT EXISTS idx_space_contact_automation_routes_space
  ON space_contact_automation_routes(space_id);

ALTER TABLE space_contact_automation_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contact automation routes"
  ON space_contact_automation_routes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Org members can view contact automation routes"
  ON space_contact_automation_routes FOR SELECT
  USING (org_id IN (
    SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own contact automation routes"
  ON space_contact_automation_routes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() = created_by);

CREATE POLICY "Users can update their own contact automation routes"
  ON space_contact_automation_routes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contact automation routes"
  ON space_contact_automation_routes FOR DELETE
  USING (auth.uid() = user_id);
