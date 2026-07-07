-- Migration: 005_brain_emotional_layers
-- Dispenza 5-Layer Brain Model for VibeyV2
-- Layer 2: Emotional tagging on memories
-- Layer 3: Emotional responses (observation)
-- Layer 4: Belief patterns (detection)
-- Layer 5: Perspectives (worldview synthesis)

-- ═══════════════════════════════════════════════════════════════════════════════
-- LAYER 2: Emotional columns on memories table
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE memories ADD COLUMN IF NOT EXISTS source_emotion text;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS emotional_valence double precision;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS emotional_intensity double precision;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS speaker_intent text;

-- Constraints (safe: only add if column exists and constraint doesn't)
DO $$ BEGIN
  ALTER TABLE memories ADD CONSTRAINT memories_valence_check
    CHECK (emotional_valence >= -1 AND emotional_valence <= 1);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE memories ADD CONSTRAINT memories_intensity_check
    CHECK (emotional_intensity >= 0 AND emotional_intensity <= 1);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes for emotional queries
CREATE INDEX IF NOT EXISTS idx_memories_source_emotion ON memories(source_emotion);
CREATE INDEX IF NOT EXISTS idx_memories_emotional_intensity ON memories(emotional_intensity DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- LAYER 3: Emotional Responses (observation layer)
-- Records how users emotionally respond to memories during conversations
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS brain_emotional_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id uuid NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  observer_id text,                 -- who observed (agent/system)
  subject_id text NOT NULL,         -- the user whose response was observed
  emotion text NOT NULL,
  valence double precision CHECK (valence >= -1 AND valence <= 1),
  intensity double precision CHECK (intensity >= 0 AND intensity <= 1),
  context text,
  session_key text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brain_er_memory ON brain_emotional_responses(memory_id);
CREATE INDEX IF NOT EXISTS idx_brain_er_subject ON brain_emotional_responses(subject_id);
CREATE INDEX IF NOT EXISTS idx_brain_er_created ON brain_emotional_responses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brain_er_emotion ON brain_emotional_responses(emotion);

-- RLS: users can only see their own emotional responses
ALTER TABLE brain_emotional_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY brain_er_user_access ON brain_emotional_responses
  FOR ALL
  USING (subject_id = auth.uid()::text)
  WITH CHECK (subject_id = auth.uid()::text);

-- Service role bypass
CREATE POLICY brain_er_service_access ON brain_emotional_responses
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════════════════════
-- LAYER 4: Belief Patterns (detection layer)
-- Recurring emotional/behavioral patterns detected from accumulated responses
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS brain_belief_patterns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id text NOT NULL,         -- the user this pattern belongs to
  pattern_name text NOT NULL,
  description text,
  emotional_signature jsonb DEFAULT '{}',
  supporting_memories uuid[] DEFAULT '{}',
  supporting_responses uuid[] DEFAULT '{}',
  strength double precision DEFAULT 0.1 CHECK (strength >= 0 AND strength <= 1),
  status text DEFAULT 'emerging' CHECK (status IN ('emerging', 'active', 'challenged', 'transforming', 'resolved')),
  detected_at timestamptz DEFAULT now(),
  last_reinforced_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brain_bp_subject ON brain_belief_patterns(subject_id);
CREATE INDEX IF NOT EXISTS idx_brain_bp_status ON brain_belief_patterns(status);
CREATE INDEX IF NOT EXISTS idx_brain_bp_strength ON brain_belief_patterns(strength DESC);

-- RLS
ALTER TABLE brain_belief_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY brain_bp_user_access ON brain_belief_patterns
  FOR ALL
  USING (subject_id = auth.uid()::text)
  WITH CHECK (subject_id = auth.uid()::text);

CREATE POLICY brain_bp_service_access ON brain_belief_patterns
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════════════════════
-- LAYER 5: Perspectives (worldview synthesis)
-- Higher-level worldview lenses that emerge from clusters of belief patterns
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS brain_perspectives (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id text NOT NULL,
  name text NOT NULL,
  description text,
  beliefs uuid[] DEFAULT '{}',           -- references brain_belief_patterns
  influence_areas text[] DEFAULT '{}',   -- areas of life this perspective affects
  strength double precision DEFAULT 0.1 CHECK (strength >= 0 AND strength <= 1),
  status text DEFAULT 'emerging' CHECK (status IN ('emerging', 'active', 'shifting', 'transformed')),
  blind_spots text,                      -- identified blind spots
  detected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brain_persp_subject ON brain_perspectives(subject_id);
CREATE INDEX IF NOT EXISTS idx_brain_persp_status ON brain_perspectives(status);
