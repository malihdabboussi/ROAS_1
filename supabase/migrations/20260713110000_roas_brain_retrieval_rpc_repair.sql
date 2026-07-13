-- Repair ROAS brain retrieval RPC surface after partial migration apply.
-- Resolves PostgREST "Could not choose the best candidate function" ambiguity
-- when both legacy (4-arg) and temporal (6+ arg) overloads exist.
-- Idempotent: safe to re-run.

drop function if exists public.search_narrative_pages(uuid, vector, numeric, integer);
drop function if exists public.search_brain_evidence_chunks(uuid, vector, numeric, integer);
drop function if exists public.search_company_cortex_signals(uuid, uuid, vector, numeric, integer);
drop function if exists public.search_company_cortex_signals_lexical(uuid, uuid, text, integer);
drop function if exists public.search_customer_avatars(uuid, vector, numeric, integer);
drop function if exists public.search_customer_avatars_lexical(uuid, text, integer);
