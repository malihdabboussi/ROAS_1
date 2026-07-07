-- Remove the internal-only 'manager' agent_key.
-- This agent was never in any user's agents_registry; it was an internal
-- OpenClaw gateway agent used for mission planning. Vibey now handles
-- all mission planning directly.

BEGIN;

DELETE FROM agent_skill_resources WHERE agent_key = 'manager';
DELETE FROM agent_skills           WHERE agent_key = 'manager';
DELETE FROM agent_definitions      WHERE agent_key = 'manager';
DELETE FROM agent_templates        WHERE template_key = 'manager';

COMMIT;
