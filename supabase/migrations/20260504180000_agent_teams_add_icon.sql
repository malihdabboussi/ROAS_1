-- Adds a Lucide icon name to user-defined teams (default 'users').
-- Pairs with `color` (IconColorId) for the brand mark shown next to each team
-- in the sidebar / team detail / grid grouping headers.
ALTER TABLE public.agent_teams
  ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT 'users';
