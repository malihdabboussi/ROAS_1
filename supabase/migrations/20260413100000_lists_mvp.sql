-- Lists MVP: persistent human-first task surface connected to Mission Control

-- 1. Lists table
CREATE TABLE IF NOT EXISTS lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  campaign_id UUID,
  is_template BOOLEAN NOT NULL DEFAULT false,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'team')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lists_org_id ON lists(org_id);
CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists(user_id);
CREATE INDEX IF NOT EXISTS idx_lists_campaign_id ON lists(campaign_id) WHERE campaign_id IS NOT NULL;

ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own lists"
  ON lists FOR SELECT TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Org members can read team lists"
  ON lists FOR SELECT TO public
  USING (visibility = 'team' AND org_id IS NOT NULL AND is_org_member(org_id));

CREATE POLICY "Users can insert own lists"
  ON lists FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lists"
  ON lists FOR UPDATE TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own lists"
  ON lists FOR DELETE TO public
  USING (auth.uid() = user_id);

CREATE TRIGGER set_lists_updated_at
  BEFORE UPDATE ON lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. List items table
CREATE TABLE IF NOT EXISTS list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'in_review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_type TEXT NOT NULL DEFAULT 'unassigned' CHECK (assignee_type IN ('human', 'agent', 'unassigned')),
  assignee_id TEXT,
  due_date TIMESTAMPTZ,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'agent_suggested', 'template', 'fathom')),
  linked_mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_list_items_list_id ON list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_list_items_org_id ON list_items(org_id);
CREATE INDEX IF NOT EXISTS idx_list_items_status ON list_items(status);
CREATE INDEX IF NOT EXISTS idx_list_items_linked_mission ON list_items(linked_mission_id) WHERE linked_mission_id IS NOT NULL;

ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own list items"
  ON list_items FOR SELECT TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Org members can read team list items"
  ON list_items FOR SELECT TO public
  USING (
    org_id IS NOT NULL
    AND is_org_member(org_id)
    AND EXISTS (
      SELECT 1 FROM lists l
      WHERE l.id = list_items.list_id
        AND l.visibility = 'team'
    )
  );

CREATE POLICY "Users can insert own list items"
  ON list_items FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own list items"
  ON list_items FOR UPDATE TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own list items"
  ON list_items FOR DELETE TO public
  USING (auth.uid() = user_id);

CREATE TRIGGER set_list_items_updated_at
  BEFORE UPDATE ON list_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE lists;
ALTER PUBLICATION supabase_realtime ADD TABLE list_items;

-- 4. Mission completion → list item sync trigger
CREATE OR REPLACE FUNCTION sync_mission_status_to_list_item()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'done' THEN
      UPDATE list_items
      SET status = 'done', updated_at = now()
      WHERE linked_mission_id = NEW.id AND status <> 'done';
    ELSIF NEW.status IN ('blocked') THEN
      UPDATE list_items
      SET status = 'in_progress', updated_at = now()
      WHERE linked_mission_id = NEW.id AND status NOT IN ('done');
    ELSIF NEW.status IN ('failed', 'error') THEN
      UPDATE list_items
      SET status = 'todo', notes = COALESCE(notes, '') || E'\n[Mission failed: ' || COALESCE(NEW.error, 'unknown error') || ']', updated_at = now()
      WHERE linked_mission_id = NEW.id AND status NOT IN ('done');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_mission_to_list_item
  AFTER UPDATE ON missions
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION sync_mission_status_to_list_item();
