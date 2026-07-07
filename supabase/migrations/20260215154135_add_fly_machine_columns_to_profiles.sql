
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fly_machine_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fly_machine_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fly_machine_status TEXT DEFAULT 'none';
;
