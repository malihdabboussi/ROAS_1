-- ============================================================
-- HUMAN DMs: dedicated tables + RLS + Realtime + backfill
-- ============================================================
-- Splits human-to-human DMs out of `channels` into their own
-- tables so they no longer leak into channel listings and can
-- evolve independently from the channels feature.
-- ============================================================

-- ── Tables ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.human_dm_conversations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_low              UUID NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  user_high             UUID NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  last_message_at       TIMESTAMPTZ,
  last_message_preview  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT human_dm_conv_user_order CHECK (user_low < user_high),
  CONSTRAINT human_dm_conv_unique_pair UNIQUE (org_id, user_low, user_high)
);

CREATE INDEX IF NOT EXISTS idx_human_dm_conv_user_low  ON public.human_dm_conversations(user_low,  last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_human_dm_conv_user_high ON public.human_dm_conversations(user_high, last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.human_dm_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.human_dm_conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         TEXT,
  content_blocks  JSONB,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  edited_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_human_dm_msg_conv_created
  ON public.human_dm_messages(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.human_dm_reads (
  conversation_id UUID NOT NULL REFERENCES public.human_dm_conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- ── Triggers ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.tg_human_dm_msg_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.human_dm_conversations
     SET last_message_at      = NEW.created_at,
         last_message_preview = LEFT(COALESCE(NEW.content, ''), 160),
         updated_at           = NEW.created_at
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS human_dm_msg_after_insert ON public.human_dm_messages;
CREATE TRIGGER human_dm_msg_after_insert
AFTER INSERT ON public.human_dm_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_human_dm_msg_after_insert();

CREATE OR REPLACE FUNCTION public.tg_human_dm_msg_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    NEW.edited_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS human_dm_msg_before_update ON public.human_dm_messages;
CREATE TRIGGER human_dm_msg_before_update
BEFORE UPDATE ON public.human_dm_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_human_dm_msg_before_update();

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE public.human_dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_dm_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_dm_reads         ENABLE ROW LEVEL SECURITY;

-- conversations
DROP POLICY IF EXISTS human_dm_conv_select ON public.human_dm_conversations;
CREATE POLICY human_dm_conv_select ON public.human_dm_conversations
  FOR SELECT TO authenticated
  USING (auth.uid() IN (user_low, user_high) AND public.is_org_member(org_id));

DROP POLICY IF EXISTS human_dm_conv_insert ON public.human_dm_conversations;
CREATE POLICY human_dm_conv_insert ON public.human_dm_conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (user_low, user_high) AND public.is_org_member(org_id));

DROP POLICY IF EXISTS human_dm_conv_update ON public.human_dm_conversations;
CREATE POLICY human_dm_conv_update ON public.human_dm_conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (user_low, user_high) AND public.is_org_member(org_id))
  WITH CHECK (auth.uid() IN (user_low, user_high) AND public.is_org_member(org_id));

-- messages
DROP POLICY IF EXISTS human_dm_msg_select ON public.human_dm_messages;
CREATE POLICY human_dm_msg_select ON public.human_dm_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.human_dm_conversations c
      WHERE c.id = human_dm_messages.conversation_id
        AND auth.uid() IN (c.user_low, c.user_high)
    )
  );

DROP POLICY IF EXISTS human_dm_msg_insert ON public.human_dm_messages;
CREATE POLICY human_dm_msg_insert ON public.human_dm_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.human_dm_conversations c
      WHERE c.id = human_dm_messages.conversation_id
        AND auth.uid() IN (c.user_low, c.user_high)
    )
  );

DROP POLICY IF EXISTS human_dm_msg_update ON public.human_dm_messages;
CREATE POLICY human_dm_msg_update ON public.human_dm_messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS human_dm_msg_delete ON public.human_dm_messages;
CREATE POLICY human_dm_msg_delete ON public.human_dm_messages
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- reads
DROP POLICY IF EXISTS human_dm_reads_select ON public.human_dm_reads;
CREATE POLICY human_dm_reads_select ON public.human_dm_reads
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.human_dm_conversations c
      WHERE c.id = human_dm_reads.conversation_id
        AND auth.uid() IN (c.user_low, c.user_high)
    )
  );

DROP POLICY IF EXISTS human_dm_reads_upsert ON public.human_dm_reads;
CREATE POLICY human_dm_reads_upsert ON public.human_dm_reads
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.human_dm_conversations c
      WHERE c.id = human_dm_reads.conversation_id
        AND auth.uid() IN (c.user_low, c.user_high)
    )
  );

DROP POLICY IF EXISTS human_dm_reads_update ON public.human_dm_reads;
CREATE POLICY human_dm_reads_update ON public.human_dm_reads
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Unread counts RPC ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_human_dm_unread_counts(p_user_id uuid)
RETURNS TABLE(conversation_id uuid, unread bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT m.conversation_id, count(*)::bigint AS unread
  FROM public.human_dm_messages m
  JOIN public.human_dm_conversations c ON c.id = m.conversation_id
  LEFT JOIN public.human_dm_reads r
    ON r.conversation_id = m.conversation_id AND r.user_id = p_user_id
  WHERE p_user_id IN (c.user_low, c.user_high)
    AND m.sender_id <> p_user_id
    AND m.created_at > coalesce(r.last_read_at, 'epoch'::timestamptz)
  GROUP BY m.conversation_id
$$;

REVOKE EXECUTE ON FUNCTION public.get_human_dm_unread_counts(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_human_dm_unread_counts(uuid) TO authenticated;

-- ── Realtime ─────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'human_dm_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.human_dm_messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'human_dm_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.human_dm_conversations;
  END IF;
END $$;

-- ── Backfill from legacy `is_dm` channels ────────────────────

WITH pairs AS (
  SELECT DISTINCT
         c.id            AS channel_id,
         c.org_id,
         LEAST(a.user_id, b.user_id)    AS user_low,
         GREATEST(a.user_id, b.user_id) AS user_high,
         c.created_at,
         c.updated_at
    FROM public.channels c
    JOIN public.channel_memberships a ON a.channel_id = c.id AND a.member_type = 'user'
    JOIN public.channel_memberships b ON b.channel_id = c.id AND b.member_type = 'user' AND b.user_id <> a.user_id
   WHERE c.is_dm = true
     AND a.user_id < b.user_id
), inserted AS (
  INSERT INTO public.human_dm_conversations (org_id, user_low, user_high, created_at, updated_at)
  SELECT org_id, user_low, user_high, created_at, updated_at
    FROM pairs
  ON CONFLICT (org_id, user_low, user_high) DO NOTHING
  RETURNING id, org_id, user_low, user_high
), conv_map AS (
  SELECT p.channel_id, c.id AS conversation_id
    FROM pairs p
    JOIN public.human_dm_conversations c
      ON c.org_id = p.org_id AND c.user_low = p.user_low AND c.user_high = p.user_high
)
INSERT INTO public.human_dm_messages (id, conversation_id, sender_id, content, content_blocks, metadata, created_at, updated_at)
SELECT m.id, cm.conversation_id, m.sender_id::uuid, m.content, m.content_blocks, COALESCE(m.metadata, '{}'::jsonb), m.created_at, m.updated_at
  FROM public.channel_messages m
  JOIN conv_map cm ON cm.channel_id = m.channel_id
 WHERE m.sender_type = 'user'
ON CONFLICT (id) DO NOTHING;
