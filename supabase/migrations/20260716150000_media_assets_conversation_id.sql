-- Link generated media assets back to the chat conversation that created them.
ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS conversation_id UUID NULL
    REFERENCES public.conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_media_assets_conversation_created
  ON public.media_assets (conversation_id, created_at DESC)
  WHERE conversation_id IS NOT NULL;

COMMENT ON COLUMN public.media_assets.conversation_id IS
  'Conversation that generated or first registered this asset (Space Media → Show in chat).';
