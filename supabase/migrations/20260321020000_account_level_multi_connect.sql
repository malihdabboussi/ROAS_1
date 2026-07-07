-- Move multi_connect from per-integration column to account-level profiles.preferences JSONB

ALTER TABLE public.user_integrations DROP COLUMN IF EXISTS multi_connect_enabled;
