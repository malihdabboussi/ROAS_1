CREATE TABLE IF NOT EXISTS public.mission_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'dead_letter')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 8,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_mission_outbox_dispatch_scan
  ON public.mission_outbox (status, next_attempt_at, created_at);

CREATE INDEX IF NOT EXISTS idx_mission_outbox_mission
  ON public.mission_outbox (mission_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_mission_outbox_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mission_outbox_updated_at ON public.mission_outbox;
CREATE TRIGGER trg_mission_outbox_updated_at
BEFORE UPDATE ON public.mission_outbox
FOR EACH ROW
EXECUTE FUNCTION public.set_mission_outbox_updated_at();

ALTER TABLE public.mission_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own mission outbox rows" ON public.mission_outbox;
CREATE POLICY "Users can view own mission outbox rows"
ON public.mission_outbox FOR SELECT
USING (auth.uid() = user_id);
