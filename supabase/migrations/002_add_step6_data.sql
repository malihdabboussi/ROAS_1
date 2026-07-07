-- Add step6_data column for Unique Mechanisms step
ALTER TABLE offers ADD COLUMN IF NOT EXISTS step6_data JSONB;
