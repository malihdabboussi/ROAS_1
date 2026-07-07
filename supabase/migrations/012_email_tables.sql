-- Email Module Tables
-- Domain authentication, sender identities, email sending, events, suppressions, settings

-- email_domains: Domain authentication + DNS records
CREATE TABLE IF NOT EXISTS email_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  subdomain TEXT,
  from_email TEXT,
  sendgrid_domain_id BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verifying', 'verified', 'failed')),
  dns_records JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  inbound_parse_enabled BOOLEAN NOT NULL DEFAULT false,
  inbound_parse_hostname TEXT,
  mx_verified BOOLEAN NOT NULL DEFAULT false,
  mx_verified_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_domains_user_id ON email_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_email_domains_status ON email_domains(user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_domains_unique_domain ON email_domains(user_id, domain);

ALTER TABLE email_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own domains" ON email_domains
  FOR ALL USING (auth.uid() = user_id);

-- email_sender_identities: Sender addresses + CAN-SPAM
CREATE TABLE IF NOT EXISTS email_sender_identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES email_domains(id) ON DELETE CASCADE,
  sendgrid_sender_id BIGINT,
  nickname TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  reply_to_email TEXT NOT NULL,
  reply_to_name TEXT,
  address TEXT NOT NULL,
  address_2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  zip TEXT,
  country TEXT NOT NULL,
  signature TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_sender_identities_user_id ON email_sender_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_email_sender_identities_domain_id ON email_sender_identities(domain_id);

ALTER TABLE email_sender_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sender identities" ON email_sender_identities
  FOR ALL USING (auth.uid() = user_id);

-- email_settings: User preferences (schedule, provider, branding)
CREATE TABLE IF NOT EXISTS email_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_provider TEXT NOT NULL DEFAULT 'sendgrid' CHECK (email_provider IN ('sendgrid', 'ghl')),
  sending_days JSONB DEFAULT '["mon","tue","wed","thu","fri"]'::jsonb,
  sending_time_from TEXT DEFAULT '09:00',
  sending_time_until TEXT DEFAULT '17:00',
  sending_timezone TEXT DEFAULT 'America/New_York',
  hide_branding BOOLEAN NOT NULL DEFAULT false,
  pause_on_reply BOOLEAN NOT NULL DEFAULT true,
  stop_keywords_enabled BOOLEAN NOT NULL DEFAULT false,
  stop_keywords JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own email settings" ON email_settings
  FOR ALL USING (auth.uid() = user_id);

-- email_sends: Single email tracking
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES email_domains(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  from_email TEXT NOT NULL,
  subject TEXT,
  html_body TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'dropped', 'spam', 'unsubscribed', 'failed')),
  sendgrid_message_id TEXT,
  batch_id TEXT,
  sequence_id UUID,
  error_message TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_sends_user_id ON email_sends(user_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_lead_id ON email_sends(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_sg_msg_id ON email_sends(sendgrid_message_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(user_id, status);

ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own email sends" ON email_sends
  FOR ALL USING (auth.uid() = user_id);

-- email_events: Webhook events (opens, clicks, bounces)
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_send_id UUID NOT NULL REFERENCES email_sends(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  sg_event_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_events_send_id ON email_events(email_send_id);
CREATE INDEX IF NOT EXISTS idx_email_events_sg_event_id ON email_events(sg_event_id);

ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email events" ON email_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM email_sends WHERE email_sends.id = email_events.email_send_id AND email_sends.user_id = auth.uid())
  );

-- email_suppressions: Unsubscribes + bounces
CREATE TABLE IF NOT EXISTS email_suppressions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('bounce', 'spam_report', 'unsubscribe', 'manual', 'preference_center', 'global_unsubscribe')),
  bounce_type TEXT,
  bounce_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_suppressions_user_email ON email_suppressions(user_id, email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_suppressions_unique ON email_suppressions(user_id, email, reason);

ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own suppressions" ON email_suppressions
  FOR ALL USING (auth.uid() = user_id);

-- email_single_schedules: Scheduled single emails
CREATE TABLE IF NOT EXISTS email_single_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  sender_identity_id UUID REFERENCES email_sender_identities(id) ON DELETE SET NULL,
  domain_id UUID REFERENCES email_domains(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'sent', 'failed', 'cancelled')),
  job_id TEXT,
  sendgrid_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_single_schedules_user_id ON email_single_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_email_single_schedules_status ON email_single_schedules(status);

ALTER TABLE email_single_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own single schedules" ON email_single_schedules
  FOR ALL USING (auth.uid() = user_id);

-- email_broadcast_schedules: Scheduled broadcast emails
CREATE TABLE IF NOT EXISTS email_broadcast_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  segment_id UUID,
  sender_identity_id UUID REFERENCES email_sender_identities(id) ON DELETE SET NULL,
  domain_id UUID REFERENCES email_domains(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'sent', 'failed', 'cancelled')),
  job_id TEXT,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_broadcast_schedules_user_id ON email_broadcast_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_email_broadcast_schedules_status ON email_broadcast_schedules(status);

ALTER TABLE email_broadcast_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own broadcast schedules" ON email_broadcast_schedules
  FOR ALL USING (auth.uid() = user_id);

-- sequence_email_sends: Sequence email tracking
CREATE TABLE IF NOT EXISTS sequence_email_sends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  sequence_email_id UUID NOT NULL REFERENCES sequence_emails(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  email_send_id UUID REFERENCES email_sends(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'skipped')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sequence_email_sends_user_id ON sequence_email_sends(user_id);
CREATE INDEX IF NOT EXISTS idx_sequence_email_sends_sequence_id ON sequence_email_sends(sequence_id);

ALTER TABLE sequence_email_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sequence email sends" ON sequence_email_sends
  FOR ALL USING (auth.uid() = user_id);

-- broadcast_email_sends: Individual broadcast send tracking
CREATE TABLE IF NOT EXISTS broadcast_email_sends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broadcast_schedule_id UUID NOT NULL REFERENCES email_broadcast_schedules(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  email_send_id UUID REFERENCES email_sends(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_email_sends_schedule ON broadcast_email_sends(broadcast_schedule_id);

ALTER TABLE broadcast_email_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own broadcast sends" ON broadcast_email_sends
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM email_broadcast_schedules WHERE email_broadcast_schedules.id = broadcast_email_sends.broadcast_schedule_id AND email_broadcast_schedules.user_id = auth.uid())
  );
