-- Add auto_approve_plans toggle to profiles (default false = approval required)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_approve_plans boolean DEFAULT false;

-- Add pending_approval to missions status CHECK constraint
ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_status_check;
ALTER TABLE missions ADD CONSTRAINT missions_status_check
  CHECK (status = ANY (ARRAY['inbox','backlog','planning','todo','in_progress','review','blocked','done','archived','error','failed','dead_letter','pending_approval']));
