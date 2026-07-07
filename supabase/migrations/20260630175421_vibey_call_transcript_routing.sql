-- Fix call/meeting transcript retrieval routing for Vibey and connected providers.
-- Root cause: "call/transcript" requests were routed to Space/Brain only, while
-- Fathom/Fireflies/Zoom discovery lives behind integration actions.

update public.integration_capabilities
set
  route_config = '{"method":"GET","path":"/api/integrations/fathom/recordings/:recordingId/transcript"}'::jsonb,
  updated_at = now()
where integration_id = 'fathom'
  and action_slug = 'get_transcript';

update public.integration_capabilities
set
  route_config = '{"method":"GET","path":"/api/integrations/fathom/recordings/:recordingId/summary"}'::jsonb,
  updated_at = now()
where integration_id = 'fathom'
  and action_slug = 'get_summary';

update public.agent_definitions
set
  content = regexp_replace(
    content,
    $pattern$(For discovery(?:/| or )context questions:
- Search Space[^\n]*
- Search Brain[^\n]*
)$pattern$,
    $replacement$\1
For call, meeting, recording, or transcript retrieval:
- Treat phrases like "call", "meeting", "recording", "where I talked to...", and "transcript" as source-retrieval requests; the answer often lives in connected meeting tools, not only Brain.
- Search Space and Brain for imported meeting evidence, then check connected recording providers with `search_available_integrations` using "meeting transcript Fathom Zoom Fireflies".
- Use `get_integration` on connected candidates and `use_integration` to list records before fetching. For Fathom, run `list_meetings`, match by participant/title/date/topic, then `get_transcript` with the matched `recordingId`; for Fireflies, run `list_transcripts`, then `get_transcript` with `transcriptId`; for Zoom, use the exact discovered Zoom action.
- Do not ask the user to paste a transcript or link until accessible Space, Brain, and recording-provider sources have been checked.
- Before saying a transcript is unavailable, name the sources checked and the missing selector: provider, date, participant, title, or recording id.
- Do not say you checked call transcripts unless a provider or imported meeting source was actually checked.

$replacement$,
    ''
  ),
  updated_at = now()
where agent_key = 'vibey'
  and file_name = 'TOOLS.md'
  and content !~ 'For call, meeting, recording, or transcript retrieval:'
  and content ~ $pattern$(For discovery(?:/| or )context questions:
- Search Space[^\n]*
- Search Brain[^\n]*
)$pattern$;

update public.agent_skill_resources
set
  content = regexp_replace(
    content,
    $pattern$(## initiate_integration_connect)$pattern$,
    $replacement$## Call and meeting transcripts
Use this route when the user asks for a call, meeting, conversation, recording, or transcript. Search Space/Brain for imported meeting evidence, then check connected recording providers before asking the user for a pasted transcript or link.

1. Run `search_available_integrations` with query `"meeting transcript Fathom Zoom Fireflies"`.
2. For each connected candidate, run `get_integration` to load exact action slugs and parameter names.
3. For Fathom, call `use_integration` with `service: "fathom"` and `integration_action: "list_meetings"`, match by participant/title/date/topic, then call `get_transcript` with `params.recordingId`.
4. For Fireflies, call `list_transcripts`, match the transcript, then call `get_transcript` with `params.transcriptId`.
5. For Zoom, use the exact Zoom action returned by integration discovery.
6. If no connected provider or matching record is found, tell the user which sources were checked and ask for the missing selector: provider, date, participant, title, or recording id.

```json
{"action":"search_available_integrations","label":"Finding meeting transcript sources","data":{"query":"meeting transcript Fathom Zoom Fireflies"}}
```

```json
{"action":"use_integration","label":"Listing Fathom meetings","data":{"service":"fathom","integration_action":"list_meetings","params":{}}}
```

```json
{"action":"use_integration","label":"Reading Fathom transcript","data":{"service":"fathom","integration_action":"get_transcript","params":{"recordingId":"149415442"}}}
```

\1$replacement$,
    ''
  ),
  updated_at = now()
where skill_key = 'vibey-api'
  and file_path = 'references/integrations.md'
  and content !~ '## Call and meeting transcripts'
  and content ~ '## initiate_integration_connect';
