-- 036: Campaign brain (knowledge) + campaign-scoped agents + campaign_id on missions/deliverables

-- Add brain columns to campaigns
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS resources JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS current_priorities TEXT[] DEFAULT '{}';

-- Campaign-scoped agent instances
CREATE TABLE IF NOT EXISTS campaign_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_key TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'working', 'offline')),
  memory JSONB NOT NULL DEFAULT '{}',
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, agent_key)
);

CREATE INDEX idx_campaign_agents_campaign ON campaign_agents(campaign_id);
CREATE INDEX idx_campaign_agents_user ON campaign_agents(user_id);

ALTER TABLE campaign_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaign_agents_own ON campaign_agents
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS set_updated_at_campaign_agents ON campaign_agents;
CREATE TRIGGER set_updated_at_campaign_agents
  BEFORE UPDATE ON campaign_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add campaign_id to missions
ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id);

CREATE INDEX IF NOT EXISTS idx_missions_campaign ON missions(campaign_id) WHERE campaign_id IS NOT NULL;

-- Add campaign_id to mission_deliverables
ALTER TABLE mission_deliverables
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id);

CREATE INDEX IF NOT EXISTS idx_deliverables_campaign ON mission_deliverables(campaign_id) WHERE campaign_id IS NOT NULL;

-- Update trigger: sync campaign_id from mission to task
CREATE OR REPLACE FUNCTION sync_mission_to_task()
RETURNS TRIGGER AS $$
BEGIN
  -- Create linked task when mission enters planning
  IF NEW.status = 'planning' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'planning') THEN
    INSERT INTO tasks (user_id, title, description, status, priority, mission_id, campaign_id, tags)
    VALUES (NEW.user_id, NEW.title, NEW.brief, 'planning', COALESCE(NEW.priority, 'medium'), NEW.id, NEW.campaign_id, ARRAY['mission'])
    ON CONFLICT (mission_id) WHERE mission_id IS NOT NULL DO NOTHING;
  END IF;

  -- When plan is ready (todo), update task title/description from the plan
  IF NEW.status = 'todo' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'todo') AND NEW.plan_id IS NOT NULL THEN
    UPDATE tasks
    SET title = COALESCE((SELECT content->>'title' FROM missions_plans WHERE id = NEW.plan_id), NEW.title),
        description = COALESCE((SELECT content->>'summary' FROM missions_plans WHERE id = NEW.plan_id), NEW.brief),
        status = 'todo',
        updated_at = NOW()
    WHERE mission_id = NEW.id;
  ELSIF NEW.status IN ('todo', 'in_progress', 'review', 'done', 'blocked') AND (OLD IS NULL OR OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE tasks
    SET status = NEW.status,
        updated_at = NOW(),
        completed_at = CASE WHEN NEW.status = 'done' THEN NOW() ELSE NULL END
    WHERE mission_id = NEW.id;
  END IF;

  -- Sync failed/dead_letter to blocked on tasks
  IF NEW.status IN ('failed', 'dead_letter') AND (OLD IS NULL OR OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE tasks
    SET status = 'blocked',
        progress_notes = COALESCE(NEW.error, 'Mission failed'),
        updated_at = NOW()
    WHERE mission_id = NEW.id;
  END IF;

  -- When retried (back to inbox), delete the linked task
  IF NEW.status = 'inbox' AND OLD.status IN ('failed', 'dead_letter', 'blocked') THEN
    DELETE FROM tasks WHERE mission_id = NEW.id;
  END IF;

  -- Sync progress_notes whenever they change
  IF NEW.progress_notes IS DISTINCT FROM OLD.progress_notes THEN
    UPDATE tasks
    SET progress_notes = NEW.progress_notes,
        updated_at = NOW()
    WHERE mission_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
