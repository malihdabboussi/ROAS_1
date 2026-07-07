-- Agent edit checkpoints capture the prompt files and skill markdown for an agent
-- after HR-driven edit turns. Personal rows set user_id; org rows set org_id.

CREATE TABLE IF NOT EXISTS public.agent_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_key TEXT NOT NULL,
  source_conversation_id UUID,
  source_message_id UUID,
  kind TEXT NOT NULL DEFAULT 'auto_turn',
  summary TEXT NOT NULL,
  summary_edited_at TIMESTAMPTZ,
  summary_edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agent_checkpoints_owner_scope_check CHECK (
    (user_id IS NOT NULL AND org_id IS NULL)
    OR (user_id IS NULL AND org_id IS NOT NULL)
  ),
  CONSTRAINT agent_checkpoints_kind_check CHECK (kind IN ('auto_turn', 'restore', 'baseline')),
  CONSTRAINT agent_checkpoints_summary_length_check CHECK (
    char_length(btrim(summary)) BETWEEN 1 AND 140
  ),
  CONSTRAINT agent_checkpoints_snapshot_shape_check CHECK (jsonb_typeof(snapshot) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_agent_checkpoints_user_agent_created
  ON public.agent_checkpoints(user_id, agent_key, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_checkpoints_org_agent_created
  ON public.agent_checkpoints(org_id, agent_key, created_at DESC)
  WHERE org_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agent_checkpoints_source_message_agent_unique
  ON public.agent_checkpoints(source_message_id, agent_key)
  WHERE source_message_id IS NOT NULL AND kind = 'auto_turn';

ALTER TABLE public.agent_checkpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_checkpoints_personal_read ON public.agent_checkpoints;
CREATE POLICY agent_checkpoints_personal_read
  ON public.agent_checkpoints FOR SELECT
  USING (user_id = auth.uid() AND org_id IS NULL);

DROP POLICY IF EXISTS agent_checkpoints_personal_write ON public.agent_checkpoints;
CREATE POLICY agent_checkpoints_personal_write
  ON public.agent_checkpoints FOR ALL
  USING (user_id = auth.uid() AND org_id IS NULL)
  WITH CHECK (user_id = auth.uid() AND org_id IS NULL);

DROP POLICY IF EXISTS agent_checkpoints_org_read ON public.agent_checkpoints;
CREATE POLICY agent_checkpoints_org_read
  ON public.agent_checkpoints FOR SELECT
  USING (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_member(org_id));

DROP POLICY IF EXISTS agent_checkpoints_org_write ON public.agent_checkpoints;
CREATE POLICY agent_checkpoints_org_write
  ON public.agent_checkpoints FOR ALL
  USING (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id))
  WITH CHECK (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id));
