ALTER TABLE tasks ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_campaign ON tasks(campaign_id) WHERE campaign_id IS NOT NULL;

COMMENT ON COLUMN tasks.campaign_id IS 'Optional link to a campaign this task belongs to';;
