-- ============================================================
-- USER STATUS: emoji + text status on profiles
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_emoji TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_text TEXT;
