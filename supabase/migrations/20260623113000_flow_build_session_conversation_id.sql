-- Tie Flow build sessions to Loop chat conversations so the inspector follows the active thread.

ALTER TABLE public.project_flow_build_session
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_flow_build_session_space_conversation
  ON public.project_flow_build_session(space_id, conversation_id, updated_at DESC)
  WHERE conversation_id IS NOT NULL;
