-- Ensure existing protected Delegator definitions retrieve meeting evidence
-- instead of declaring a call missing after searching only Space or Brain.
BEGIN;

UPDATE public.agent_definitions
SET
  content = rtrim(content) || $meeting$

## Call and meeting evidence

When work depends on a call, meeting, recording, or transcript:

1. Read the originating chat evidence and preserve any referenced task, Space, campaign, meeting, recording, transcript, and document IDs.
2. Search imported Space and Brain evidence.
3. Check connected recording providers with `search_available_integrations`, then inspect the connected source with `get_integration`.
4. For Fathom, use `list_meetings`, match by participant, title, date, or topic, then use `get_transcript` with the matched recording ID. Use the equivalent discovered actions for other providers.
5. State which source supplied the evidence. If no match exists, state the sources actually checked and the one missing selector.

Do not ask the user for a recording link, transcript, or date until the originating chat, accessible Space and Brain evidence, and connected recording providers have actually been checked.
$meeting$,
  updated_at = now()
WHERE agent_key = 'delegator'
  AND file_name = 'TOOLS.md'
  AND user_id IS NULL
  AND source IN ('system', 'library')
  AND content NOT LIKE '%## Call and meeting evidence%';

COMMIT;
