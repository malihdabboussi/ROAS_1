-- Repair: ns_memories.agent_id is missing on some environments (origin migration
-- skipped). The Brain graph select (MEMORY_GRAPH_SELECT) requests agent_id, so a
-- missing column 500s the graph endpoint. Add it to match the app contract.

ALTER TABLE public.ns_memories
  ADD COLUMN IF NOT EXISTS agent_id text;

CREATE INDEX IF NOT EXISTS idx_ns_memories_agent_id
  ON public.ns_memories (agent_id)
  WHERE agent_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
