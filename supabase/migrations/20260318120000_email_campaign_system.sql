-- Email Provider Recipes: maps provider -> ordered API call steps for broadcast and sequence
CREATE TABLE email_provider_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  recipe_type TEXT NOT NULL CHECK (recipe_type IN ('broadcast', 'sequence')),
  step_order INT NOT NULL,
  action_slug TEXT NOT NULL,
  params_template JSONB NOT NULL,
  result_key TEXT,
  result_alias TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, recipe_type, step_order)
);

-- Email Provider Capabilities: which providers support email sending
CREATE TABLE email_provider_capabilities (
  provider TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  supports_broadcast BOOLEAN DEFAULT TRUE,
  supports_sequences BOOLEAN DEFAULT TRUE,
  supports_scheduling BOOLEAN DEFAULT TRUE,
  supports_segments BOOLEAN DEFAULT TRUE,
  requires_list BOOLEAN DEFAULT TRUE,
  is_bullmq_provider BOOLEAN DEFAULT FALSE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Pending Sends: persists send payload for Telegram/Slack callback approval
CREATE TABLE email_pending_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  sequence_id UUID,
  sequence_email_id UUID,
  send_type TEXT NOT NULL CHECK (send_type IN ('broadcast', 'sequence')),
  provider TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'cancelled', 'sent', 'error')),
  channel TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_pending_sends_user_status ON email_pending_sends (user_id, status);
CREATE INDEX idx_email_pending_sends_status ON email_pending_sends (status) WHERE status = 'pending';

-- Seed: ActiveCampaign broadcast recipe (3 steps)
INSERT INTO email_provider_recipes (provider, recipe_type, step_order, action_slug, params_template, result_key, result_alias, description) VALUES
  ('active_campaign', 'broadcast', 1, 'create_campaign', '{"campaign": {"type": "single", "name": "{{name}}", "status": 0, "sdate": "{{schedule_date}}"}}', 'campaign.id', 'campaign_id', 'Create draft campaign'),
  ('active_campaign', 'broadcast', 2, 'create_message', '{"message": {"campaignid": "{{campaign_id}}", "format": "html", "subject": "{{subject}}", "fromemail": "{{from_email}}", "fromname": "{{from_name}}", "html": "{{html}}", "text": "{{text}}"}}', 'message.id', 'message_id', 'Create email message'),
  ('active_campaign', 'broadcast', 3, 'update_campaign', '{"id": "{{campaign_id}}", "campaign": {"status": 1}}', NULL, NULL, 'Activate campaign for sending');

-- Seed: ActiveCampaign sequence recipe (3 steps, executed per email)
INSERT INTO email_provider_recipes (provider, recipe_type, step_order, action_slug, params_template, result_key, result_alias, description) VALUES
  ('active_campaign', 'sequence', 1, 'create_campaign', '{"campaign": {"type": "single", "name": "{{sequence_name}} - Email {{email_index}}", "status": 0, "sdate": "{{calculated_sdate}}"}}', 'campaign.id', 'campaign_id', 'Create scheduled campaign per email'),
  ('active_campaign', 'sequence', 2, 'create_message', '{"message": {"campaignid": "{{campaign_id}}", "format": "html", "subject": "{{subject}}", "fromemail": "{{from_email}}", "fromname": "{{from_name}}", "html": "{{html}}"}}', 'message.id', 'message_id', 'Create email message'),
  ('active_campaign', 'sequence', 3, 'update_campaign', '{"id": "{{campaign_id}}", "campaign": {"status": 1}}', NULL, NULL, 'Activate campaign for scheduled sending');

-- Seed: Provider capabilities
INSERT INTO email_provider_capabilities (provider, display_name, supports_broadcast, supports_sequences, supports_scheduling, supports_segments, requires_list, is_bullmq_provider) VALUES
  ('active_campaign', 'ActiveCampaign', TRUE, TRUE, TRUE, TRUE, TRUE, FALSE),
  ('vibey', 'Vibey (Native)', TRUE, TRUE, TRUE, FALSE, FALSE, TRUE),
  ('gohighlevel', 'GoHighLevel', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE);

-- RLS
ALTER TABLE email_provider_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_provider_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_pending_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_recipes" ON email_provider_recipes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_capabilities" ON email_provider_capabilities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "users_own_pending_sends" ON email_pending_sends FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service_role_all_pending_sends" ON email_pending_sends FOR ALL USING (true) WITH CHECK (true);
