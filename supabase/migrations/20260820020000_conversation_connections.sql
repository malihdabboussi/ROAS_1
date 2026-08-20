-- Extra campaign/space connections on a conversation. conversations.campaign_id
-- remains the primary connection (Slack bind, named-client bind). This table is
-- additive; read paths union column-backed scope with these rows. No backfill.

CREATE TABLE public.conversation_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  org_id UUID,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('campaign', 'space')),
  entity_id UUID NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX conversation_connections_entity_uniq
  ON public.conversation_connections (conversation_id, entity_type, entity_id);

CREATE UNIQUE INDEX conversation_connections_one_primary
  ON public.conversation_connections (conversation_id)
  WHERE is_primary;

CREATE INDEX conversation_connections_conversation_idx
  ON public.conversation_connections (conversation_id, created_at);

ALTER TABLE public.conversation_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ConvConn read by share"
  ON public.conversation_connections FOR SELECT
  USING (
    conversation_id IN (
      SELECT c.id
      FROM public.conversations c
      WHERE public.conversation_effective_level(c.id, (SELECT auth.uid())) IS NOT NULL
    )
  );

CREATE POLICY "ConvConn write by edit"
  ON public.conversation_connections FOR ALL
  USING (
    conversation_id IN (
      SELECT c.id
      FROM public.conversations c
      WHERE public.conversation_effective_level(c.id, (SELECT auth.uid())) IN ('edit', 'admin')
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT c.id
      FROM public.conversations c
      WHERE public.conversation_effective_level(c.id, (SELECT auth.uid())) IN ('edit', 'admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_connections TO service_role;
