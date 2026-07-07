-- ============================================================================
-- Ensure cortex_max flag and pattern-analysis counters exist on ns_brains.
-- cortex_max was added ad-hoc; this migration makes it schema-safe with
-- an explicit DEFAULT false so new brains never auto-activate Cortex Max.
-- ============================================================================

ALTER TABLE ns_brains ADD COLUMN IF NOT EXISTS cortex_max boolean DEFAULT false;
ALTER TABLE ns_brains ADD COLUMN IF NOT EXISTS pages_updated_since_last_analysis integer DEFAULT 0;
ALTER TABLE ns_brains ADD COLUMN IF NOT EXISTS last_pattern_analysis_at timestamptz;
