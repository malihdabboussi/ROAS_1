-- Remove legacy Vibey brain tables/functions after NeuralSnap cutover

drop function if exists public.search_memories(vector, double precision, integer, text, text, uuid, text[], double precision);
drop function if exists public.search_neural_snapshots(vector, integer);

drop table if exists public.memory_connections cascade;
drop table if exists public.memory_versions cascade;
drop table if exists public.memory_sessions cascade;
drop table if exists public.memories cascade;
drop table if exists public.neural_snapshots cascade;
drop table if exists public.brain_emotional_responses cascade;
drop table if exists public.brain_belief_patterns cascade;
drop table if exists public.brain_perspectives cascade;
