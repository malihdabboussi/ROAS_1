-- Add voice_name column to agents_registry for Gemini Live voice assignment
ALTER TABLE agents_registry ADD COLUMN IF NOT EXISTS voice_name TEXT DEFAULT NULL;

COMMENT ON COLUMN agents_registry.voice_name IS 'Gemini prebuilt voice name for live voice sessions (e.g. Kore, Puck, Aoede)';
