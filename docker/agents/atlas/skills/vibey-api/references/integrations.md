# Integrations

## check_integration_connection
**Required keys:** `integration_id`

Checks connection state for one integration. **integration_id is REQUIRED**.

```json
{"action":"check_integration_connection","label":"Checking integration connection","data":{"integration_id":"youtube"}}
```

## create_calendar_event
**Required keys:** `provider`, `title`, `start`, `end`

**Optional keys:** `timezone`, `description`, `location`, `attendees`, `calendar_id`, `create_video_meeting`

**Types:** `provider`: string, `title`: string, `start`: iso_date, `end`: iso_date, `timezone`: string, `description`: string, `location`: string, `attendees`: object_array, `calendar_id`: string, `create_video_meeting`: boolean

**Use when:** Create a timed event in connected Google Calendar or Outlook.

Creates one timed provider-owned calendar event in Google Calendar or Outlook. Use create_task/update_task with start_date/due_date for task scheduling.

```json
{"action":"create_calendar_event","label":"Adding calendar event","data":{"provider":"google_calendar","title":"Review launch tasks","start":"2026-06-18T10:00:00.000Z","end":"2026-06-18T10:30:00.000Z","timezone":"Asia/Nicosia"}}
```

Contract example: create a Google Calendar meeting
```json
{"action":"create_calendar_event","label":"create a Google Calendar meeting","data":{"provider":"google_calendar","title":"Review launch tasks","start":"2026-06-18T10:00:00.000Z","end":"2026-06-18T10:30:00.000Z","timezone":"Asia/Nicosia"}}
```

## delete_calendar_event
**Required keys:** `provider`, `event_id`

**Optional keys:** `calendar_id`

**Types:** `provider`: string, `event_id`: string, `calendar_id`: string

**Use when:** Delete a connected Google Calendar or Outlook event.

Deletes one provider-owned Google Calendar or Outlook event.

```json
{"action":"delete_calendar_event","label":"Deleting calendar event","data":{"provider":"google_calendar","event_id":"google:event-123"}}
```

Contract example: delete a Google Calendar event
```json
{"action":"delete_calendar_event","label":"delete a Google Calendar event","data":{"provider":"google_calendar","event_id":"google:event-123"}}
```

## get_capabilities
Reads integration capabilities snapshot.

```json
{"action":"get_capabilities","label":"Checking connected capabilities","data":{}}
```

## get_integration
**Required keys:** `service`

Gets exact action slugs for a provider. **service is REQUIRED** (e.g. "instagram", "youtube", "social_analysis", "seo_research", "fathom", "fireflies", "zoom"). Use this for connected meeting providers before fetching a call, meeting, recording, conversation, or transcript. Social Analysis (service "social_analysis") is platform-managed for marketing/Vibey; SEO Research (service "seo_research") is platform-managed for marketing, analyst, and Vibey. Social Analysis covers social posts, comments, transcripts, trends, and audiences. SEO Research covers keyword overview, keyword ideas, Google organic SERP, domain competitors, and backlinks summary.

```json
{"action":"get_integration","label":"Loading SEO Research actions","data":{"service":"seo_research"}}
```

## initiate_integration_connect
**Required keys:** `integration_id`

Generates connect URL for an integration. **integration_id is REQUIRED**.

```json
{"action":"initiate_integration_connect","label":"Preparing integration connect","data":{"integration_id":"youtube"}}
```

## list_calendar_events
**Required keys:** `start`, `end`

**Optional keys:** `provider`, `timezone`

**Types:** `provider`: string, `start`: iso_date, `end`: iso_date, `timezone`: string

**Use when:** Read connected Google Calendar and Outlook events for a visible time window.

Lists normalized Google Calendar and Outlook events for a time window. Optional provider is "google_calendar" or "outlook".

```json
{"action":"list_calendar_events","label":"Checking calendar","data":{"start":"2026-06-18T00:00:00.000Z","end":"2026-06-19T00:00:00.000Z","timezone":"Asia/Nicosia"}}
```

Contract example: list tomorrow calendar events
```json
{"action":"list_calendar_events","label":"list tomorrow calendar events","data":{"start":"2026-06-18T00:00:00.000Z","end":"2026-06-19T00:00:00.000Z","timezone":"Asia/Nicosia"}}
```

## search_available_integrations
**Optional keys:** `query`, `service`, `limit`

**Types:** `query`: string, `service`: string, `limit`: number

Semantic search for available integration actions. Use it for meeting, call, conversation, recording, or transcript requests with a query like "meeting transcript Fathom Zoom Fireflies" before asking the user to paste a transcript. Response includes user_connected (boolean) per integration. Platform-managed integrations like Social Analysis and SEO Research do not need a user connection when RBAC allows them; user-connected providers still require a connection before use.

```json
{"action":"search_available_integrations","label":"Searching integration actions","data":{"query":"keyword ideas for ai landing pages"}}
```

```json
{"action":"search_available_integrations","label":"Finding meeting transcript sources","data":{"query":"meeting transcript Fathom Zoom Fireflies"}}
```

## update_calendar_event
**Required keys:** `provider`, `event_id`

**Optional keys:** `title`, `start`, `end`, `timezone`, `description`, `location`, `attendees`, `calendar_id`, `create_video_meeting`

**Types:** `provider`: string, `event_id`: string, `title`: string, `start`: iso_date, `end`: iso_date, `timezone`: string, `description`: string, `location`: string, `attendees`: object_array, `calendar_id`: string, `create_video_meeting`: boolean

**Use when:** Move, rename, or edit a timed Google Calendar or Outlook event.

Updates a timed provider-owned calendar event. event_id may be the normalized id returned by list_calendar_events.

```json
{"action":"update_calendar_event","label":"Moving calendar event","data":{"provider":"outlook","event_id":"outlook:event-123","start":"2026-06-18T11:00:00.000Z","end":"2026-06-18T11:45:00.000Z","timezone":"Asia/Nicosia"}}
```

Contract example: move a calendar event
```json
{"action":"update_calendar_event","label":"move a calendar event","data":{"provider":"outlook","event_id":"outlook:event-123","start":"2026-06-18T11:00:00.000Z","end":"2026-06-18T11:45:00.000Z","timezone":"Asia/Nicosia"}}
```

## use_integration
**Required keys:** `service`, `integration_action`

**Optional keys:** `params`, `integration_connection_id`, `user_integration_id`, `connected_account_id`

**Types:** `params`: object, `integration_connection_id`: string, `user_integration_id`: string, `connected_account_id`: string

**Use when:** Execute a connected provider action. Put provider-specific inputs inside params using the exact parameter names returned by get_integration or search_available_integrations.

Executes an integration action. **service is REQUIRED**, **integration_action is REQUIRED**. Put every provider-specific input inside **params** using the exact parameter names returned by get_integration or search_available_integrations; never send provider inputs flat on data. For call, meeting, conversation, recording, or transcript requests, list provider records before fetching the transcript: Fathom list_meetings then get_transcript with recordingId; Fireflies list_transcripts then get_transcript with transcriptId; Zoom uses the exact discovered action. Social Analysis: service "social_analysis" for social profiles, posts, comments, transcripts, search, trends, and audience research. SEO Research: service "seo_research" for keyword overview, keyword ideas, Google organic SERP, domain competitors, and backlinks summary. Read the matching skill before multi-step research: social-intel for Social Analysis, seo-research for SEO Research.

```json
{"action":"use_integration","label":"Checking keyword ideas","data":{"service":"seo_research","integration_action":"keyword_ideas","params":{"keywords":["ai landing page builder"],"location_code":2840,"language_code":"en","limit":25}}}
```

```json
{"action":"use_integration","label":"Listing Fathom meetings","data":{"service":"fathom","integration_action":"list_meetings","params":{}}}
```

```json
{"action":"use_integration","label":"Reading Fathom transcript","data":{"service":"fathom","integration_action":"get_transcript","params":{"recordingId":"149415442"}}}
```

Contract example: run a connected integration action
```json
{"action":"use_integration","label":"run a connected integration action","data":{"service":"fathom","integration_action":"get_transcript","params":{"recordingId":"149415442"}}}
```
