-- 044: Add level column to agents_registry for agent hierarchy
-- c_level: CEO/COO — full context access
-- manager: mid-level — campaign-scoped context
-- employee: workers — mission-scoped context only

ALTER TABLE agents_registry
  ADD COLUMN IF NOT EXISTS level TEXT NOT NULL DEFAULT 'employee'
    CHECK (level IN ('c_level', 'manager', 'employee'));

-- Set existing managers to c_level (they act as COO)
UPDATE agents_registry SET level = 'c_level' WHERE agent_key = 'manager';
