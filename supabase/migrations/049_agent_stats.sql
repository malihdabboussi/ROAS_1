-- 049: Agent performance stats column on agents_registry (Sprint 3B)
-- Stores per-agent rolling metric scores as JSONB for zero-join reads.

ALTER TABLE agents_registry
  ADD COLUMN IF NOT EXISTS stats JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN agents_registry.stats IS
  'Rolling performance metrics: { execution_speed, quality, reliability, initiative, communication, spec_adherence, learning_rate, overall, missions_scored, last_scored_at }. All numeric scores 0.0–10.0.';
