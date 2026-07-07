CREATE TABLE enterprise_applications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  company_name  TEXT NOT NULL,
  company_size  TEXT NOT NULL
                  CHECK (company_size IN ('1-10', '11-50', '51-200', '200+')),
  role_title    TEXT,
  use_case      TEXT,
  team_size     TEXT,
  phone         TEXT,
  website       TEXT,
  source        TEXT NOT NULL DEFAULT 'app'
                  CHECK (source IN ('app', 'website')),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'contacted', 'approved', 'declined')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_enterprise_applications_status ON enterprise_applications(status);
CREATE INDEX idx_enterprise_applications_created ON enterprise_applications(created_at DESC);
CREATE INDEX idx_enterprise_applications_user ON enterprise_applications(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE enterprise_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full" ON enterprise_applications FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_enterprise_applications_updated_at
  BEFORE UPDATE ON enterprise_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
