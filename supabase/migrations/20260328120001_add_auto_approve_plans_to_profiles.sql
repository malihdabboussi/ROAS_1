-- Fix: profiles.auto_approve_plans column was missing, causing 400 on select
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auto_approve_plans BOOLEAN NOT NULL DEFAULT false;
