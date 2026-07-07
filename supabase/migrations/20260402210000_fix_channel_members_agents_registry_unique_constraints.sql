-- PostgREST cannot target expression-based unique indexes with ON CONFLICT.
-- The COALESCE(org_id, '00000000-...') pattern breaks .upsert({ onConflict: '...,org_id' }).
-- Replace with NULLS NOT DISTINCT (PG 15+) so NULL org_id is treated as equal for uniqueness
-- while keeping the constraint matchable by PostgREST.

-- channel_members
DROP INDEX IF EXISTS channel_members_unique_member;
ALTER TABLE public.channel_members
  ADD CONSTRAINT channel_members_unique_member
  UNIQUE NULLS NOT DISTINCT (user_id, platform, platform_id, org_id);

-- agents_registry (proactive — no upserts today, but prevents the same class of bug)
DROP INDEX IF EXISTS agents_registry_user_agent_org_uniq;
ALTER TABLE public.agents_registry
  ADD CONSTRAINT agents_registry_user_agent_org_uniq
  UNIQUE NULLS NOT DISTINCT (user_id, agent_key, org_id);
