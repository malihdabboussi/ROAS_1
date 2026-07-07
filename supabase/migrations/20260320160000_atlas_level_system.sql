-- Atlas is a system agent (ships with onboarding like HR and Viktor)
UPDATE agents_registry
SET level = 'system'
WHERE agent_key = 'atlas'
  AND level != 'system';
