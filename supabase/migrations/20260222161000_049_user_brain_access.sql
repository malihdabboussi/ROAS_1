-- 049: Add user_brain_access toggle to agents_registry
-- When true, the agent can read the user's personal brain (memories + snapshots) in addition to its own SK brain.

ALTER TABLE agents_registry ADD COLUMN IF NOT EXISTS user_brain_access boolean NOT NULL DEFAULT false;
