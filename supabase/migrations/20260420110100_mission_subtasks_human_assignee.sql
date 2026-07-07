-- mission_subtasks: add human-assignee columns + SLA clock + bounce reason.
-- Keeps backward compatibility: existing rows become assignee_type='agent' (default) with
-- NULL assigned_user_id. Partial indexes scope new usage to actual human rows.

ALTER TABLE public.mission_subtasks
  ADD COLUMN IF NOT EXISTS assignee_type TEXT NOT NULL DEFAULT 'agent'
    CHECK (assignee_type IN ('agent','human')),
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS awaiting_human_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_escalate_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bounce_reason TEXT;

-- Invariant: agent rows may have NULL assigned_agent_key during planning (existing behavior),
-- but cannot carry a human user_id; human rows must have assigned_user_id and no agent_key.
ALTER TABLE public.mission_subtasks
  DROP CONSTRAINT IF EXISTS mission_subtasks_assignee_shape_check;
ALTER TABLE public.mission_subtasks
  ADD CONSTRAINT mission_subtasks_assignee_shape_check
  CHECK (
    (assignee_type = 'agent' AND assigned_user_id IS NULL)
    OR
    (assignee_type = 'human' AND assigned_user_id IS NOT NULL AND assigned_agent_key IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_mission_subtasks_assigned_user
  ON public.mission_subtasks(assigned_user_id)
  WHERE assignee_type = 'human';

CREATE INDEX IF NOT EXISTS idx_mission_subtasks_sla_escalate_at
  ON public.mission_subtasks(sla_escalate_at)
  WHERE status = 'awaiting_human';

COMMENT ON COLUMN public.mission_subtasks.assignee_type IS 'Discriminator: agent or human. Drives worker branch at execute phase.';
COMMENT ON COLUMN public.mission_subtasks.assigned_user_id IS 'FK to auth.users for human subtasks. NULL when assignee_type=agent.';
COMMENT ON COLUMN public.mission_subtasks.awaiting_human_since IS 'SLA clock start when subtask enters awaiting_human.';
COMMENT ON COLUMN public.mission_subtasks.sla_escalate_at IS 'Timestamp at which watchdog escalates to org owner.';
COMMENT ON COLUMN public.mission_subtasks.sla_escalated_at IS 'Set by watchdog when escalation notification is emitted.';
COMMENT ON COLUMN public.mission_subtasks.bounce_reason IS 'Reason the human gave when bouncing back to an agent or blocking the subtask.';
