# Brain

## archive_brain_belief_pattern
**Required keys:** `brain_type`, `id`

**Optional keys:** `brain_id`

**Types:** `brain_type`: string, `brain_id`: string, `id`: string

Set a belief pattern to resolved status. Use when a belief has been overcome or is no longer relevant.

```json
{"action":"archive_brain_belief_pattern","label":"Archiving resolved belief","data":{"brain_type":"user_default","id":"UUID"}}
```

## archive_brain_page
**Required keys:** `brain_type`, `id`

**Optional keys:** `brain_id`

**Types:** `brain_type`: string, `brain_id`: string, `id`: string

Mark a brain page as archived. Required: brain_type and id from get_brain_pages. Page is hidden from active queries but data is preserved.

```json
{"action":"archive_brain_page","label":"Archiving old strategy page","data":{"brain_type":"user_default","id":"page-uuid"}}
```

## archive_brain_perspective
**Required keys:** `brain_type`, `id`

**Optional keys:** `brain_id`

**Types:** `brain_type`: string, `brain_id`: string, `id`: string

Set a perspective to transformed status. Use when a worldview has fundamentally shifted.

```json
{"action":"archive_brain_perspective","label":"Archiving transformed perspective","data":{"brain_type":"user_default","id":"UUID"}}
```

## archive_brain_timeline
**Required keys:** `brain_type`, `id`

**Optional keys:** `brain_id`

**Types:** `brain_type`: string, `brain_id`: string, `id`: string

Archive a Cortex timeline when its target has been merged, transformed, or retired. Required: brain_type and id. Do not use to hide ordinary old history.

```json
{"action":"archive_brain_timeline","label":"Archiving obsolete timeline","data":{"brain_type":"company","brain_id":"UUID","id":"timeline-uuid"}}
```

## archive_company_brain_object
**Required keys:** `id`

**Optional keys:** `brain_id`

**Types:** `id`: string, `brain_id`: string

Retire a company cortex object by setting status to retired.

```json
{"action":"archive_company_brain_object","label":"Archiving company object","data":{"id":"UUID"}}
```

## assign_user_memory_source
**Required keys:** `new_source_title`

**Optional keys:** `memory_ids`, `match_source_title`, `match_orphan_source_title`, `new_source_id`

**Types:** `new_source_title`: string, `match_source_title`: string, `new_source_id`: string

Assign or reassign memories on the USER DEFAULT BRAIN to a source group (updates source_title and optional source_id). Use to fix orphan memories (null/empty source_title) or regroup before transfer_brain_by_source. Provide one of: memory_ids (specific UUIDs), match_source_title (bulk rows with that title), or match_orphan_source_title: true (all null/empty source_title on default brain).

```json
{"action":"assign_user_memory_source","label":"Grouping orphan memories","data":{"match_orphan_source_title":true,"new_source_title":"Alex Hormozi Master Index"}}
```

```json
{"action":"assign_user_memory_source","label":"Renaming source group","data":{"match_source_title":"Old Bundle Name","new_source_title":"New Bundle Name"}}
```

```json
{"action":"assign_user_memory_source","label":"Tagging specific memories","data":{"memory_ids":["UUID1","UUID2"],"new_source_title":"Source notes","new_source_id":"optional-stable-id"}}
```

## atlas_save_brain_context
**Required keys:** `target_brain`, `content`

**Optional keys:** `intent`, `brain_id`, `agent_key`, `agent_id`, `contact_id`, `contactId`, `customer_source_identity_id`, `customerSourceIdentityId`, `campaign_id`, `space_id`, `title`, `source_type`, `sourceType`, `source_id`, `sourceId`, `source_title`, `sourceTitle`, `source_url`, `sourceUrl`, `source_identity`, `sourceIdentity`, `visitor_id`, `visitorId`, `telegram_chat_id`, `telegramChatId`, `meeting_id`, `meetingId`, `conversation_id`, `conversationId`, `object_type`, `signal_type`, `reason`, `context_form`, `confidence`, `confidence_basis`, `episode_id`, `occurred_at`, `occurred_until`, `asserted_at`, `valid_from`, `valid_until`, `temporal_status`, `temporal_confidence`, `temporal_source`, `effective_from`, `effective_until`, `evidence_started_at`, `evidence_ended_at`

**Aliases:** `targetBrain` → `target_brain`, `brainId` → `brain_id`, `contactId` → `contact_id`

**Types:** `target_brain`: string, `targetBrain`: string, `content`: string, `intent`: string, `brain_id`: string, `brainId`: string, `agent_key`: string, `agent_id`: string, `contact_id`: string, `contactId`: string, `customer_source_identity_id`: string, `customerSourceIdentityId`: string, `campaign_id`: string, `space_id`: string, `title`: string, `source_type`: string, `sourceType`: string, `source_id`: string, `sourceId`: string, `source_title`: string, `sourceTitle`: string, `source_url`: string, `sourceUrl`: string, `source_identity`: string, `sourceIdentity`: string, `visitor_id`: string, `visitorId`: string, `telegram_chat_id`: string, `telegramChatId`: string, `meeting_id`: string, `meetingId`: string, `conversation_id`: string, `conversationId`: string, `object_type`: string, `signal_type`: string, `reason`: string, `context_form`: string, `confidence`: number, `confidence_basis`: object, `episode_id`: string, `occurred_at`: iso_date, `occurred_until`: iso_date, `asserted_at`: iso_date, `valid_from`: iso_date, `valid_until`: iso_date, `temporal_status`: string, `temporal_confidence`: number, `temporal_source`: string, `effective_from`: iso_date, `effective_until`: iso_date, `evidence_started_at`: iso_date, `evidence_ended_at`: iso_date

**Use when:** Save user-provided knowledge to the requested Brain/context surface without requiring the MCP client to know the low-level write schema. Preferred tool for "save this to my/customer/company/agent/campaign/space brain" requests.

**Do not use when:** The user is only searching; use search_brains or a family-specific search tool. The user explicitly provided reviewed Company Cortex signal lineage, evidence, and retrieval rules for formation; use create_company_brain_object.

Atlas Brain router. Saves durable context to the right Brain family when the request explicitly asks to remember, save, or route knowledge. Required: target_brain and content. target_brain can be user, agent, company, or customer. Include agent_key or brain_id for agent brain, contact_id or durable source identity for customer brain, and source metadata when available.

```json
{"action":"atlas_save_brain_context","label":"Saving to brain","data":{"target_brain":"user","content":"Weekly launch reviews should include blocker counts.","source_type":"chat","source_title":"Launch review"}}
```

```json
{"action":"atlas_save_brain_context","label":"Saving agent knowledge","data":{"target_brain":"agent","agent_key":"loop","content":"Flow builders should align Space schema before compiling automations.","title":"Flow schema alignment"}}
```

```json
{"action":"atlas_save_brain_context","label":"Saving customer signal","data":{"target_brain":"customer","content":"Visitor asked for clearer onboarding pricing.","source_type":"widget_chat","conversation_id":"UUID","visitor_id":"visitor_123"}}
```

## connect_brain_belief_to_memory
**Required keys:** `brain_type`, `belief_id`, `memory_id`

**Optional keys:** `brain_id`

**Types:** `brain_type`: string, `brain_id`: string, `belief_id`: string, `memory_id`: string

Add a memory ID to a belief pattern's supporting_memories array. Reinforces the belief.

```json
{"action":"connect_brain_belief_to_memory","label":"Adding evidence to belief","data":{"brain_type":"user_default","belief_id":"UUID","memory_id":"UUID"}}
```

## connect_brain_belief_to_perspective
**Required keys:** `brain_type`, `perspective_id`, `belief_id`

**Optional keys:** `brain_id`

**Types:** `brain_type`: string, `brain_id`: string, `perspective_id`: string, `belief_id`: string

Add a belief ID to a perspective's beliefs array.

```json
{"action":"connect_brain_belief_to_perspective","label":"Connecting belief to perspective","data":{"brain_type":"user_default","perspective_id":"UUID","belief_id":"UUID"}}
```

## create_brain_belief_pattern
**Required keys:** `brain_type`, `pattern_name`, `description`

**Optional keys:** `brain_id`, `emotional_signature`, `supporting_memories`, `strength`, `status`

**Types:** `brain_type`: string, `brain_id`: string, `pattern_name`: string, `description`: string, `strength`: number, `status`: string

Create a new belief pattern in the requested brain. Required: brain_type, pattern_name, description. Pass brain_id for agent, customer, or company brains.

```json
{"action":"create_brain_belief_pattern","label":"Recording new belief pattern","data":{"brain_type":"customer","brain_id":"UUID","pattern_name":"resistance to scaling","description":"Repeated concern about growing too fast without infrastructure","supporting_memories":["uuid-1","uuid-2","uuid-3"],"strength":0.5}}
```

## create_brain_page
**Required keys:** `brain_type`, `slug`, `title`, `content_md`

**Optional keys:** `brain_id`, `page_type`, `summary`, `tags`, `source_refs`

**Types:** `brain_type`: string, `brain_id`: string, `slug`: string, `title`: string, `content_md`: string, `page_type`: string, `summary`: string

Create a new brain library page. Required: brain_type, slug, title, content_md. Use brain_type=user_default for the default User Brain; pass brain_id for agent, customer, or company brains.

```json
{"action":"create_brain_page","label":"Creating brand voice page","data":{"brain_type":"user_default","slug":"brand-voice","title":"Brand Voice & Communication Style","page_type":"topic","content_md":"The brand started casual-first...","summary":"Coach at a conference: warm, authoritative","tags":["brand","voice"],"source_refs":[{"type":"memory","id":"UUID"}]}}
```

## create_brain_perspective
**Required keys:** `brain_type`, `name`, `description`

**Optional keys:** `brain_id`, `narrative_md`, `beliefs`, `influence_areas`, `blind_spots`, `strength`

**Types:** `brain_type`: string, `brain_id`: string, `name`: string, `description`: string, `narrative_md`: string, `blind_spots`: string, `strength`: number

Create a new perspective in the requested brain. Required: brain_type, name, description. Pass brain_id for agent, customer, or company brains.

```json
{"action":"create_brain_perspective","label":"Creating new perspective","data":{"brain_type":"customer","brain_id":"UUID","name":"Growth-at-all-costs mindset","description":"Believes rapid scaling is the only viable path","narrative_md":"This perspective emerged from...","beliefs":["belief-uuid-1","belief-uuid-2","belief-uuid-3"],"strength":0.6}}
```

## create_brain_timeline
**Required keys:** `brain_type`, `timeline_type`, `target_type`, `title`

**Optional keys:** `brain_id`, `target_id`, `summary`, `status`, `metadata`, `episode_id`, `occurred_at`, `occurred_until`, `asserted_at`, `valid_from`, `valid_until`, `temporal_status`, `temporal_confidence`, `temporal_source`, `effective_from`, `effective_until`, `evidence_started_at`, `evidence_ended_at`

**Types:** `brain_type`: string, `brain_id`: string, `timeline_type`: string, `target_type`: string, `target_id`: string, `title`: string, `summary`: string, `status`: string, `metadata`: object, `episode_id`: string, `occurred_at`: iso_date, `occurred_until`: iso_date, `asserted_at`: iso_date, `valid_from`: iso_date, `valid_until`: iso_date, `temporal_status`: string, `temporal_confidence`: number, `temporal_source`: string, `effective_from`: iso_date, `effective_until`: iso_date, `evidence_started_at`: iso_date, `evidence_ended_at`: iso_date

Create a Cortex timeline for a durable brain target. Required: brain_type, timeline_type, target_type, title. Use only for Atlas-owned synthesis when the target has a real evolution arc.

```json
{"action":"create_brain_timeline","label":"Creating decision timeline","data":{"brain_type":"company","brain_id":"UUID","timeline_type":"company_decision_history","target_type":"company_object","target_id":"object-uuid","title":"Approval Protocol Evolution","summary":"How the company approval protocol formed and changed.","evidence_started_at":"2026-06-01T00:00:00Z","temporal_confidence":0.8,"temporal_source":"company_cortex_formation"}}
```

## create_company_brain_edge
**Required keys:** `source_object_id`, `target_object_id`, `relation_type`

**Optional keys:** `brain_id`, `confidence`

**Types:** `source_object_id`: string, `target_object_id`: string, `relation_type`: string, `brain_id`: string, `confidence`: number

Create a typed edge between two company cortex objects. relation_type: supports, contradicts, contains, enforces, derived_from, refines.

```json
{"action":"create_company_brain_edge","label":"Linking company objects","data":{"source_object_id":"UUID","target_object_id":"UUID","relation_type":"contains","confidence":0.85}}
```

## create_company_brain_object
**Required keys:** `object_type`, `title`, `truth`, `source_signal_ids`, `evidence_refs`, `retrieval_rule`

**Optional keys:** `brain_id`, `status`, `confidence`, `confidence_basis`, `episode_id`, `occurred_at`, `occurred_until`, `asserted_at`, `valid_from`, `valid_until`, `temporal_status`, `temporal_confidence`, `temporal_source`, `effective_from`, `effective_until`, `evidence_started_at`, `evidence_ended_at`

**Types:** `object_type`: string, `title`: string, `truth`: string, `brain_id`: string, `status`: string, `confidence`: number, `source_signal_ids`: string_array, `evidence_refs`: object_array, `retrieval_rule`: object, `confidence_basis`: object, `episode_id`: string, `occurred_at`: iso_date, `occurred_until`: iso_date, `asserted_at`: iso_date, `valid_from`: iso_date, `valid_until`: iso_date, `temporal_status`: string, `temporal_confidence`: number, `temporal_source`: string, `effective_from`: iso_date, `effective_until`: iso_date, `evidence_started_at`: iso_date, `evidence_ended_at`: iso_date

**Use when:** Create a durable Company Cortex object only from reviewed signal lineage during formation.

**Do not use when:** Raw company knowledge is being saved from chat, MCP, documents, or activity; use propose_company_brain_signal.

Create a durable company cortex object on the org company brain from reviewed signal lineage only. Atlas formation/internal write. Requires source_signal_ids, evidence_refs, and retrieval_rule.trigger plus retrieval_rule.context_form.

```json
{"action":"create_company_brain_object","label":"Creating company belief","data":{"object_type":"belief","title":"Ask before workspace mutations","truth":"Agents must ask before creating or changing workspace objects.","status":"active","confidence":0.82,"source_signal_ids":["UUID"],"evidence_refs":[{"type":"company_signal","id":"UUID"}],"retrieval_rule":{"trigger":"workspace mutation","context_form":"Ask before creating or changing workspace objects."}}}
```

## crystallize_user_brain
**Required keys:** `text`

**Optional keys:** `input`

**Types:** `text`: string, `input`: string

USER BRAIN ONLY — crystallizes raw thought text into a neural snapshot through the snapshot crystallization pipeline. For agent brains, use the agent brain ingest actions instead.

```json
{"action":"crystallize_user_brain","label":"Crystallizing this insight","data":{"text":"My best launches happen when offer testing starts before creative production."}}
```

## delete_brain_node
**Required keys:** `brain_type`, `node_type`, `node_id`

**Optional keys:** `brain_id`, `agent_id`

**Types:** `brain_type`: string, `brain_id`: string, `agent_id`: string, `node_type`: string, `node_id`: string

Deletes a memory, snapshot, SK entry, SK source (and its entries), or a memory connection. Verifies ownership server-side.

```json
{"action":"delete_brain_node","label":"Removing misplaced memory","data":{"node_type":"memory","node_id":"UUID"}}
```

## delete_company_brain_edge
**Required keys:** `id`

**Optional keys:** `brain_id`

**Types:** `id`: string, `brain_id`: string

Delete a company cortex object edge by id when reconciling tensions or restructuring relations.

```json
{"action":"delete_company_brain_edge","label":"Removing company edge","data":{"id":"UUID"}}
```

## disconnect_brain_belief_from_memory
**Required keys:** `brain_type`, `belief_id`, `memory_id`

**Optional keys:** `brain_id`

**Types:** `brain_type`: string, `brain_id`: string, `belief_id`: string, `memory_id`: string

Remove a memory ID from a belief pattern's supporting_memories array.

```json
{"action":"disconnect_brain_belief_from_memory","label":"Removing evidence from belief","data":{"brain_type":"user_default","belief_id":"UUID","memory_id":"UUID"}}
```

## disconnect_brain_belief_from_perspective
**Required keys:** `brain_type`, `perspective_id`, `belief_id`

**Optional keys:** `brain_id`

**Types:** `brain_type`: string, `brain_id`: string, `perspective_id`: string, `belief_id`: string

Remove a belief ID from a perspective's beliefs array.

```json
{"action":"disconnect_brain_belief_from_perspective","label":"Disconnecting belief from perspective","data":{"brain_type":"user_default","perspective_id":"UUID","belief_id":"UUID"}}
```

## get_agent_brain_gaps
**Required keys:** `brain_id`

**Types:** `brain_id`: string

Returns explicit agent brain gaps plus thin domains that have low coverage. Requires brain_id.

```json
{"action":"get_agent_brain_gaps","label":"Analyzing knowledge gaps","data":{"brain_id":"UUID"}}
```

## get_brain_belief_patterns
**Required keys:** `brain_type`

**Optional keys:** `brain_id`, `status`, `limit`, `cursor`, `include_details`

**Types:** `brain_type`: string, `brain_id`: string, `status`: string, `limit`: number, `cursor`: string, `include_details`: boolean

Read identified belief patterns and recurring themes from a requested brain. Broad reads return one summary batch and pagination.next_cursor when more patterns exist. Continue by passing cursor=pagination.next_cursor, including after compaction. Use include_details=true only for selected detail batches. Required: brain_type. Use brain_type=user_default for the default User Brain; pass brain_id for agent, customer, or company brains.

```json
{"action":"get_brain_belief_patterns","label":"Reading belief patterns","data":{"brain_type":"user_default","limit":20}}
```

```json
{"action":"get_brain_belief_patterns","label":"Reading next belief batch","data":{"brain_type":"customer","brain_id":"UUID","status":"active","limit":20,"cursor":"pagination.next_cursor from previous result"}}
```

```json
{"action":"get_brain_belief_patterns","label":"Reading belief details","data":{"brain_type":"customer","brain_id":"UUID","status":"active","limit":20,"include_details":true}}
```

## get_brain_lint
**Required keys:** `brain_type`

**Optional keys:** `brain_id`, `check_type`, `severity`, `resolved`, `limit`

**Types:** `brain_type`: string, `brain_id`: string, `check_type`: string, `severity`: string, `resolved`: boolean, `limit`: number

Read brain lint results (health check findings). Default returns unresolved only. Filter by check_type (contradiction, stale, orphan, gap, shallow, missing_link), severity (info, warning, critical), or resolved (true to include resolved).

```json
{"action":"get_brain_lint","label":"Reading brain health findings","data":{}}
```

```json
{"action":"get_brain_lint","label":"Reading contradictions","data":{"check_type":"contradiction"}}
```

## get_brain_log
**Required keys:** `brain_type`

**Optional keys:** `brain_id`, `event_type`, `limit`

**Types:** `brain_type`: string, `brain_id`: string, `event_type`: string, `limit`: number

Read recent brain evolution log entries. Filter by event_type (create_page, update_page, archive_page, library_sync, detect_pattern, lint_pass). Default limit 10. Required: brain_type. Use brain_type=user_default for the default User Brain; pass brain_id for agent, customer, or company brains.

```json
{"action":"get_brain_log","label":"Reading recent brain activity","data":{"brain_type":"user_default","limit":10}}
```

```json
{"action":"get_brain_log","label":"Reading agent brain log","data":{"brain_type":"agent","brain_id":"UUID","limit":10}}
```

## get_brain_pages
**Required keys:** `brain_type`

**Optional keys:** `brain_id`, `slug`, `page_type`, `status`, `limit`, `cursor`, `include_content`

**Types:** `brain_type`: string, `brain_id`: string, `slug`: string, `page_type`: string, `status`: string, `limit`: number, `cursor`: string, `include_content`: boolean

Read structured knowledge pages from a brain library. Broad reads return one summary batch and pagination.next_cursor when more pages exist. Continue by passing cursor=pagination.next_cursor, including after compaction. content_md is omitted by default; pass slug for one page or include_content=true for selected content batches. Required: brain_type. Use brain_type=user_default for the default User Brain; pass brain_id for agent, customer, or company brains. Before patching, updating, archiving, linking, or unlinking pages, call this first and copy the returned page.id.

```json
{"action":"get_brain_pages","label":"Reading library pages","data":{"brain_type":"user_default","limit":20}}
```

```json
{"action":"get_brain_pages","label":"Reading one page","data":{"brain_type":"user_default","slug":"brand-voice"}}
```

```json
{"action":"get_brain_pages","label":"Reading next page batch","data":{"brain_type":"agent","brain_id":"UUID","limit":20,"cursor":"pagination.next_cursor from previous result"}}
```

## get_brain_perspectives
**Required keys:** `brain_type`

**Optional keys:** `brain_id`, `status`, `limit`, `cursor`, `include_details`

**Types:** `brain_type`: string, `brain_id`: string, `status`: string, `limit`: number, `cursor`: string, `include_details`: boolean

Read synthesized perspectives from the requested brain. Broad reads return one summary batch and pagination.next_cursor when more perspectives exist. Continue by passing cursor=pagination.next_cursor, including after compaction. Long narrative fields are omitted by default; use include_details=true only for selected detail batches. Required: brain_type. Use brain_type=user_default for the default User Brain; pass brain_id for agent, customer, or company brains.

```json
{"action":"get_brain_perspectives","label":"Reading perspectives","data":{"brain_type":"user_default","limit":20}}
```

```json
{"action":"get_brain_perspectives","label":"Reading next perspective batch","data":{"brain_type":"customer","brain_id":"UUID","status":"active","limit":20,"cursor":"pagination.next_cursor from previous result"}}
```

```json
{"action":"get_brain_perspectives","label":"Reading perspective details","data":{"brain_type":"customer","brain_id":"UUID","status":"active","limit":20,"include_details":true}}
```

## get_brain_stats
Returns stats for a brain scope. Default scope=user counts memories and SK on the user default brain. scope=agent requires agent_id or agent_key (e.g. vibey); if no agent brain row exists, provisioned=false and counts are zero.

```json
{"action":"get_brain_stats","label":"Checking your brain stats","data":{}}
```

```json
{"action":"get_brain_stats","label":"Agent brain stats","data":{"scope":"agent","agent_id":"vibey"}}
```

## get_brain_timeline_items
**Required keys:** `brain_type`, `timeline_id`

**Optional keys:** `brain_id`, `limit`

**Types:** `brain_type`: string, `brain_id`: string, `timeline_id`: string, `limit`: number

Read items for a specific Cortex timeline. Required: brain_type and timeline_id. Use before adding or reconciling curated timeline milestones.

```json
{"action":"get_brain_timeline_items","label":"Reading timeline milestones","data":{"brain_type":"company","brain_id":"UUID","timeline_id":"timeline-uuid","limit":50}}
```

## get_brain_timelines
**Required keys:** `brain_type`

**Optional keys:** `brain_id`, `timeline_type`, `target_type`, `target_id`, `status`, `limit`

**Types:** `brain_type`: string, `brain_id`: string, `timeline_type`: string, `target_type`: string, `target_id`: string, `status`: string, `limit`: number

Read Atlas-curated Cortex timelines for a requested brain. Required: brain_type. Use when timeline synthesis needs existing timelines before creating or updating one. Timelines are curated evolution narratives, not raw episode lists.

```json
{"action":"get_brain_timelines","label":"Reading company timelines","data":{"brain_type":"company","brain_id":"UUID","target_type":"company_object","target_id":"object-uuid"}}
```

## get_company_brain_object_edges
**Optional keys:** `brain_id`, `source_object_id`, `target_object_id`, `relation_type`, `limit`

**Types:** `brain_id`: string, `source_object_id`: string, `target_object_id`: string, `relation_type`: string, `limit`: number

List typed relationships between company cortex objects (supports, contradicts, contains, enforces, derived_from, refines).

```json
{"action":"get_company_brain_object_edges","label":"Reading company brain edges","data":{"source_object_id":"UUID"}}
```

## get_company_brain_objects
**Optional keys:** `brain_id`, `object_type`, `status`, `limit`

**Types:** `brain_id`: string, `object_type`: string, `status`: string, `limit`: number

List durable Company Cortex objects for the org company brain. Filter by object_type and status. Omit brain_id to use the org default company brain.

```json
{"action":"get_company_brain_objects","label":"Reading company brain","data":{"object_type":"belief","status":"active","limit":20}}
```

## ingest_agent_brain_link
**Required keys:** `brain_id`, `url`

**Optional keys:** `title`, `domain`, `sourceType`, `source_type`, `episode_id`, `occurred_at`, `occurred_until`, `asserted_at`, `valid_from`, `valid_until`, `temporal_status`, `temporal_confidence`, `temporal_source`

**Types:** `brain_id`: string, `url`: string, `title`: string, `domain`: string, `sourceType`: string, `source_type`: string, `episode_id`: string, `occurred_at`: iso_date, `occurred_until`: iso_date, `asserted_at`: iso_date, `valid_from`: iso_date, `valid_until`: iso_date, `temporal_status`: string, `temporal_confidence`: number, `temporal_source`: string

Ingests a URL into an AGENT brain. brain_id (from resolve_agent_brain) and url are REQUIRED. Optional title overrides the extracted page title. Content is extracted from the URL and stored as agent brain entries.

```json
{"action":"ingest_agent_brain_link","label":"Adding agent knowledge from link","data":{"brain_id":"UUID-from-resolve_agent_brain","url":"https://example.com/article","title":"Optional Override Title"}}
```

## ingest_agent_brain_text
**Required keys:** `brain_id`, `text,content`, `title`, `source_type,sourceType`

**Optional keys:** `domain`, `source_type`, `episode_id`, `occurred_at`, `occurred_until`, `asserted_at`, `valid_from`, `valid_until`, `temporal_status`, `temporal_confidence`, `temporal_source`

**Types:** `brain_id`: string, `text`: string, `content`: string, `title`: string, `sourceType`: string, `source_type`: string, `domain`: string, `episode_id`: string, `occurred_at`: iso_date, `occurred_until`: iso_date, `asserted_at`: iso_date, `valid_from`: iso_date, `valid_until`: iso_date, `temporal_status`: string, `temporal_confidence`: number, `temporal_source`: string

Ingests raw text into an AGENT brain. brain_id (from resolve_agent_brain), text, sourceType, and title are ALL REQUIRED. title becomes the source name grouping entries for search and transfer. User sees: entry searchable via search_agent_brain. The agent uses this knowledge in future conversations.

```json
{"action":"ingest_agent_brain_text","label":"Adding agent knowledge from text","data":{"brain_id":"UUID-from-resolve_agent_brain","text":"Full text content to ingest...","sourceType":"document","title":"Descriptive Source Name","domain":"sales"}}
```

## ingest_customer_brain_link
**Required keys:** `url`

**Optional keys:** `brain_id`, `contact_id`, `contactId`, `customer_source_identity_id`, `customerSourceIdentityId`, `title`, `memory_type`, `source_identity`, `sourceIdentity`, `visitor_id`, `visitorId`, `telegram_chat_id`, `telegramChatId`, `meeting_id`, `meetingId`, `conversation_id`, `conversationId`, `metadata`, `episode_id`, `occurred_at`, `occurred_until`, `asserted_at`, `valid_from`, `valid_until`, `temporal_status`, `temporal_confidence`, `temporal_source`

**Types:** `url`: string, `contact_id`: string, `contactId`: string, `customer_source_identity_id`: string, `customerSourceIdentityId`: string, `brain_id`: string, `title`: string, `memory_type`: string, `source_identity`: string, `sourceIdentity`: string, `visitor_id`: string, `visitorId`: string, `telegram_chat_id`: string, `telegramChatId`: string, `meeting_id`: string, `meetingId`: string, `conversation_id`: string, `conversationId`: string, `metadata`: object, `episode_id`: string, `occurred_at`: iso_date, `occurred_until`: iso_date, `asserted_at`: iso_date, `valid_from`: iso_date, `valid_until`: iso_date, `temporal_status`: string, `temporal_confidence`: number, `temporal_source`: string

CUSTOMER BRAIN ONLY — saves a customer-relevant URL as a source-anchored memory. Required: url. Preferred: contact_id when known.

```json
{"action":"ingest_customer_brain_link","label":"Adding customer link","data":{"url":"https://example.com/customer-reference","contact_id":"UUID","title":"Customer reference"}}
```

```json
{"action":"ingest_customer_brain_link","label":"Adding customer link","data":{"url":"https://example.com/customer-reference","title":"Customer reference"}}
```

## ingest_customer_brain_text
**Required keys:** `text,content`

**Optional keys:** `brain_id`, `contact_id`, `contactId`, `customer_source_identity_id`, `customerSourceIdentityId`, `title`, `memory_type`, `source_type`, `sourceType`, `source_id`, `sourceId`, `source_url`, `sourceUrl`, `source_title`, `sourceTitle`, `source_identity`, `sourceIdentity`, `conversation_id`, `conversationId`, `visitor_id`, `visitorId`, `telegram_chat_id`, `telegramChatId`, `meeting_id`, `meetingId`, `metadata`, `episode_id`, `occurred_at`, `occurred_until`, `asserted_at`, `valid_from`, `valid_until`, `temporal_status`, `temporal_confidence`, `temporal_source`

**Types:** `text`: string, `content`: string, `contact_id`: string, `contactId`: string, `customer_source_identity_id`: string, `customerSourceIdentityId`: string, `brain_id`: string, `title`: string, `memory_type`: string, `source_type`: string, `sourceType`: string, `source_id`: string, `sourceId`: string, `source_url`: string, `sourceUrl`: string, `source_title`: string, `sourceTitle`: string, `source_identity`: string, `sourceIdentity`: string, `conversation_id`: string, `conversationId`: string, `visitor_id`: string, `visitorId`: string, `telegram_chat_id`: string, `telegramChatId`: string, `meeting_id`: string, `meetingId`: string, `metadata`: object, `episode_id`: string, `occurred_at`: iso_date, `occurred_until`: iso_date, `asserted_at`: iso_date, `valid_from`: iso_date, `valid_until`: iso_date, `temporal_status`: string, `temporal_confidence`: number, `temporal_source`: string

CUSTOMER BRAIN ONLY — saves customer text knowledge. Required: text/content. Preferred: contact_id when known. If contact_id is unknown, include durable source identity such as source_id, source_url, conversation_id, visitor_id, meeting_id, telegram_chat_id, source_identity, or customer_source_identity_id.

```json
{"action":"ingest_customer_brain_text","label":"Adding customer insight","data":{"text":"The customer asked for clearer weekly rollout updates.","contact_id":"UUID","title":"Weekly updates request"}}
```

```json
{"action":"ingest_customer_brain_text","label":"Adding customer signal","data":{"text":"A public widget visitor asked for clearer weekly rollout updates.","conversation_id":"UUID","visitor_id":"visitor_123","title":"Public widget request"}}
```

## ingest_fathom_meeting
**Required keys:** `meeting_id,recording_id,call_id,meeting`

**Optional keys:** `title`, `brainId`, `brain_id`, `targetBrain`, `target_brain`, `campaignId`, `campaign_id`

**Types:** `meeting_id`: string, `recording_id`: string, `call_id`: string, `title`: string, `brainId`: string, `brain_id`: string, `targetBrain`: string, `target_brain`: string, `campaignId`: string, `campaign_id`: string

Imports a Fathom meeting recording/transcript. **meeting_id is REQUIRED**. User sees: meeting insights appear as memories in Brain with source attribution.

```json
{"action":"ingest_fathom_meeting","label":"Importing Fathom meeting","data":{"meeting_id":"..."}}
```

## ingest_fireflies_transcript
**Required keys:** `meeting_id,recording_id,call_id`

**Optional keys:** `meeting_id`, `recording_id`, `call_id`, `title`, `campaign_id`, `campaignId`, `space_id`, `scope_override`

**Types:** `meeting_id`: string, `recording_id`: string, `call_id`: string, `title`: string, `campaign_id`: string, `campaignId`: string, `space_id`: string, `scope_override`: string

Imports a Fireflies transcript. **transcript_id is REQUIRED**. User sees: transcript insights appear as memories in Brain with source attribution.

```json
{"action":"ingest_fireflies_transcript","label":"Importing Fireflies transcript","data":{"transcript_id":"..."}}
```

## ingest_user_brain_document
**Required keys:** `content,text`

**Optional keys:** `source_type`, `source_id`, `source_title`, `episode_id`, `occurred_at`, `occurred_until`, `asserted_at`, `valid_from`, `valid_until`, `temporal_status`, `temporal_confidence`, `temporal_source`

**Types:** `content`: string, `text`: string, `source_type`: string, `source_id`: string, `source_title`: string, `episode_id`: string, `occurred_at`: iso_date, `occurred_until`: iso_date, `asserted_at`: iso_date, `valid_from`: iso_date, `valid_until`: iso_date, `temporal_status`: string, `temporal_confidence`: number, `temporal_source`: string

Ingests a user-uploaded document into the brain pipeline. **document_id is REQUIRED**. User sees: extracted knowledge appears as memories in Brain. Processes the document content into structured memory entries.

```json
{"action":"ingest_user_brain_document","label":"Ingesting your document","data":{"content":"Document text","source_title":"Upload"}}
```

## ingest_user_brain_link
**Required keys:** `url`

**Optional keys:** `title`, `episode_id`, `occurred_at`, `occurred_until`, `asserted_at`, `valid_from`, `valid_until`, `temporal_status`, `temporal_confidence`, `temporal_source`

**Types:** `url`: string, `title`: string, `episode_id`: string, `occurred_at`: iso_date, `occurred_until`: iso_date, `asserted_at`: iso_date, `valid_from`: iso_date, `valid_until`: iso_date, `temporal_status`: string, `temporal_confidence`: number, `temporal_source`: string

USER DEFAULT BRAIN ONLY — does NOT write to agent brains. Ingests a URL through link extraction and memory ingestion into the user's default brain. For agent brain use ingest_agent_brain_link (with brain_id from resolve_agent_brain). Link extraction sets source title from the page when possible; if extraction returns no title, you MUST pass `title` in data. Optional `title` always overrides the extracted title.

```json
{"action":"ingest_user_brain_link","label":"Ingesting this source","data":{"url":"https://example.com/article","title":"Offer Positioning Notes"}}
```

## ingest_user_brain_text
**Required keys:** `text,content`, `title`

**Optional keys:** `episode_id`, `occurred_at`, `occurred_until`, `asserted_at`, `valid_from`, `valid_until`, `temporal_status`, `temporal_confidence`, `temporal_source`

**Types:** `text`: string, `content`: string, `title`: string, `episode_id`: string, `occurred_at`: iso_date, `occurred_until`: iso_date, `asserted_at`: iso_date, `valid_from`: iso_date, `valid_until`: iso_date, `temporal_status`: string, `temporal_confidence`: number, `temporal_source`: string

USER DEFAULT BRAIN ONLY — does NOT write to agent brains. Ingests raw text as memory content into the user's default brain. For agent brain use ingest_agent_brain_text (with brain_id from resolve_agent_brain). text/content must be at least 10 chars. **title is REQUIRED** — it becomes source_title and groups memories. Optional memory_type.

```json
{"action":"ingest_user_brain_text","label":"Ingesting this knowledge","data":{"text":"Customers convert faster when onboarding removes setup friction in first 10 minutes.","memory_type":"fact","title":"Onboarding Conversion Insight"}}
```

## link_brain_pages
**Required keys:** `brain_type`, `from_page_id`, `to_page_id`

**Optional keys:** `brain_id`, `link_type`

**Types:** `brain_type`: string, `brain_id`: string, `from_page_id`: string, `to_page_id`: string, `link_type`: string

Create a cross-reference link between two brain pages in the same requested brain target. Call get_brain_pages first.

```json
{"action":"link_brain_pages","label":"Linking pages","data":{"brain_type":"user_default","from_page_id":"UUID","to_page_id":"UUID","link_type":"related"}}
```

## list_agent_brain_domains
**Required keys:** `brain_id`

**Types:** `brain_id`: string

Lists agent brain domain coverage with entry counts per domain. Requires brain_id.

```json
{"action":"list_agent_brain_domains","label":"Mapping agent brain domains","data":{"brain_id":"UUID"}}
```

## list_agent_brain_imports
**Required keys:** `brain_id`

**Optional keys:** `source`, `limit`

**Types:** `brain_id`: string, `source`: string, `limit`: number

Lists import sessions from ns_memory_sessions for an agent brain. Requires brain_id. Optional source filter: all, fathom, or fireflies.

```json
{"action":"list_agent_brain_imports","label":"Checking recent imports","data":{"brain_id":"UUID","source":"fathom","limit":20}}
```

## list_available_brain_scopes
Lists owned brain scopes: default user brain, agent brains, and campaign brains (`scope`, `campaign_id`, `campaign_brains`). For client package knowledge use `search_campaign_brain` with `campaign_id` / `campaign_name` — never invent empty brain ids from campaign names, and never treat General as a client brain.

```json
{"action":"list_available_brain_scopes","label":"Listing brain scopes","data":{}}
```

## search_campaign_brain
**Required keys:** `query`

**Optional keys:** `campaign_id`, `campaign_name`, `brain_id`, `limit`

**Types:** `query`: string, `campaign_id`: string, `campaign_name`: string, `brain_id`: string, `limit`: number

Searches the campaign brain (`ns_memories` on the campaign-scoped `ns_brains` row) for client research, onboarding intake, strategy notes, and ROAS package knowledge. Prefer this over Agent/User/Company Brain for client intake. Cross-scope is allowed: if Team chat is on General, pass `campaign_id` or `campaign_name` for the client campaign (e.g. Impact). Never target General.

```json
{"action":"search_campaign_brain","label":"Searching campaign brain","data":{"query":"offer pricing ICP onboarding form","campaign_name":"Impact","limit":15}}
```

## list_customer_avatars
**Optional keys:** `brain_id`

**Types:** `brain_id`: string

Lists synthesized Customer Brain avatars for the current personal/org Customer Brain.

```json
{"action":"list_customer_avatars","label":"Reading customer avatars","data":{}}
```

## list_customer_brain_memories
**Optional keys:** `brain_id`, `limit`

**Types:** `brain_id`: string, `limit`: number

Lists recent memories from the current personal/org Customer Brain. Optional limit between 1 and 100.

```json
{"action":"list_customer_brain_memories","label":"Reviewing customer memories","data":{"limit":20}}
```

## list_user_brain_memories
**Optional keys:** `limit`

**Types:** `limit`: number

Lists recent memory entries from the user default brain. Optional limit between 1 and 100.

```json
{"action":"list_user_brain_memories","label":"Reviewing recent memories","data":{"limit":20}}
```

## log_brain_event
**Required keys:** `brain_type`, `event_type`, `summary`

**Optional keys:** `brain_id`, `affected_pages`, `source_ref`, `metadata`

**Types:** `brain_type`: string, `brain_id`: string, `event_type`: string, `summary`: string

Append an entry to the brain evolution log. event_type: create_page, update_page, archive_page, library_sync, detect_pattern, synthesize_perspective, lint_pass, compaction_extract, user_correction. affected_pages is array of page slugs touched. Required: brain_type. Use brain_type=user_default for the default User Brain; pass brain_id for agent, customer, or company brains.

```json
{"action":"log_brain_event","label":"Logging library sync","data":{"brain_type":"user_default","event_type":"update_page","summary":"Updated brand-voice and marketing-strategy pages with 4 new memories","affected_pages":["brand-voice","marketing-strategy"]}}
```

## merge_brain_belief_patterns
**Required keys:** `brain_type`, `primary_id`, `secondary_id`

**Optional keys:** `brain_id`, `description`

**Types:** `brain_type`: string, `brain_id`: string, `primary_id`: string, `secondary_id`: string, `description`: string

Merge two belief patterns. Supporting memories are combined into primary. Secondary is archived. Optional description overrides the merged description.

```json
{"action":"merge_brain_belief_patterns","label":"Merging overlapping beliefs","data":{"brain_type":"user_default","primary_id":"UUID","secondary_id":"UUID","description":"Combined belief description"}}
```

## patch_brain_page
**Required keys:** `brain_type`, `id`, `operation`, `content`

**Optional keys:** `brain_id`, `section`, `heading`, `after`, `source_refs`, `summary`

**Types:** `brain_type`: string, `brain_id`: string, `id`: string, `operation`: string, `content`: string, `section`: string, `heading`: string, `after`: string, `summary`: string

Edit a specific section of a brain page without rewriting the whole thing. Prefer over update_brain_page. Required: brain_type, id, operation, content. Get id from get_brain_pages first.

```json
{"action":"patch_brain_page","label":"Adding Q2 insights","data":{"brain_type":"user_default","id":"page-uuid","operation":"append_to_section","section":"The story","content":"After Q2, the user leaned further into the coach persona."}}
```

## propose_company_brain_signal
**Required keys:** `truth,content`

**Optional keys:** `brain_id`, `signal_type`, `object_type`, `scope`, `evidence_refs`, `confidence`, `confidence_basis`, `reason`, `context_form`, `source`, `source_type`, `source_id`, `source_url`, `source_title`, `title`, `episode_id`, `occurred_at`, `occurred_until`, `asserted_at`, `valid_from`, `valid_until`, `temporal_status`, `temporal_confidence`, `temporal_source`, `effective_from`, `effective_until`, `evidence_started_at`, `evidence_ended_at`

**Types:** `truth`: string, `content`: string, `brain_id`: string, `signal_type`: string, `object_type`: string, `scope`: object, `evidence_refs`: object_array, `confidence`: number, `confidence_basis`: object, `reason`: string, `context_form`: string, `source`: string, `source_type`: string, `source_id`: string, `source_url`: string, `source_title`: string, `title`: string, `episode_id`: string, `occurred_at`: iso_date, `occurred_until`: iso_date, `asserted_at`: iso_date, `valid_from`: iso_date, `valid_until`: iso_date, `temporal_status`: string, `temporal_confidence`: number, `temporal_source`: string, `effective_from`: iso_date, `effective_until`: iso_date, `evidence_started_at`: iso_date, `evidence_ended_at`: iso_date

**Use when:** Propose organization-level operating knowledge for human review before it becomes durable Company Brain knowledge. Preferred low-level Company Brain write action for MCP, agent, and Atlas save routes.

**Do not use when:** The user is only searching; use search_company_brain. You are running reviewed Company Cortex formation with approved source_signal_ids and retrieval rules; use create_company_brain_object.

Propose Company Brain knowledge for human review. Raw company saves create proposed signals only; durable Company Cortex objects are created later from reviewed signals by formation.

```json
{"action":"propose_company_brain_signal","label":"Proposing company signal","data":{"signal_type":"standard","truth":"Agents should ask before publishing customer-facing changes.","evidence_refs":[{"type":"conversation","id":"UUID"}],"confidence":0.72,"context_form":"Use this when deciding whether to publish externally."}}
```

## resolve_agent_brain
**Required keys:** `agent_id,agent_key,brain_id`

**Optional keys:** `agent_id`, `agent_key`, `brain_id`

**Types:** `agent_id`: string, `agent_key`: string, `brain_id`: string

Returns brain_id for an agent brain (ns_brains row for owner + agent_id) and provisioned boolean. Use before ingest_agent_brain_text / ingest_agent_brain_link or search_agent_brain targeting that brain.

```json
{"action":"resolve_agent_brain","label":"Resolving agent brain","data":{"agent_id":"vibey"}}
```

## resolve_brain_lint
**Required keys:** `brain_type`, `id`

**Optional keys:** `brain_id`

**Types:** `brain_type`: string, `brain_id`: string, `id`: string

Mark a lint result as resolved. Use after fixing the issue (created missing page, updated stale page, added link, etc.).

```json
{"action":"resolve_brain_lint","label":"Resolving lint finding","data":{"id":"UUID"}}
```

## run_brain_lint
**Required keys:** `brain_type`

**Optional keys:** `brain_id`

**Types:** `brain_type`: string, `brain_id`: string

Trigger an on-demand brain lint (health check). Enqueues a brain_lint job that Atlas will execute. Returns immediately with confirmation.

```json
{"action":"run_brain_lint","label":"Running brain health check","data":{}}
```

## save_customer_memory
**Required keys:** `content`, `memory_type`

**Optional keys:** `brain_id`, `contact_id`, `contactId`, `customer_source_identity_id`, `customerSourceIdentityId`, `source_type`, `sourceType`, `source_id`, `sourceId`, `source_url`, `sourceUrl`, `source_title`, `sourceTitle`, `source_identity`, `sourceIdentity`, `conversation_id`, `conversationId`, `visitor_id`, `visitorId`, `telegram_chat_id`, `telegramChatId`, `meeting_id`, `meetingId`, `significance`, `tags`, `speaker`, `metadata`, `episode_id`, `occurred_at`, `occurred_until`, `asserted_at`, `valid_from`, `valid_until`, `temporal_status`, `temporal_confidence`, `temporal_source`

**Types:** `content`: string, `memory_type`: string, `contact_id`: string, `contactId`: string, `customer_source_identity_id`: string, `customerSourceIdentityId`: string, `brain_id`: string, `source_type`: string, `sourceType`: string, `source_id`: string, `sourceId`: string, `source_url`: string, `sourceUrl`: string, `source_title`: string, `sourceTitle`: string, `source_identity`: string, `sourceIdentity`: string, `conversation_id`: string, `conversationId`: string, `visitor_id`: string, `visitorId`: string, `telegram_chat_id`: string, `telegramChatId`: string, `meeting_id`: string, `meetingId`: string, `significance`: number, `speaker`: string, `metadata`: object, `episode_id`: string, `occurred_at`: iso_date, `occurred_until`: iso_date, `asserted_at`: iso_date, `valid_from`: iso_date, `valid_until`: iso_date, `temporal_status`: string, `temporal_confidence`: number, `temporal_source`: string

CUSTOMER BRAIN ONLY — saves one customer memory in the current personal/org Customer Brain. Required: content and memory_type. Preferred: contact_id when known. If contact_id is unknown, include durable source identity such as source_id, source_url, conversation_id, visitor_id, meeting_id, telegram_chat_id, source_identity, or customer_source_identity_id. Optional Fathom/source fields: brain_id, source_type, source_title, speaker, metadata, significance, tags. Do not use save_user_memory for customer knowledge.

```json
{"action":"save_customer_memory","label":"Saving customer memory","data":{"content":"Customer prefers weekly implementation summaries.","memory_type":"preference","contact_id":"UUID","source_type":"fathom_call","source_id":"meeting_123","source_title":"Customer call","speaker":"Maria Lopez","metadata":{"meeting_id":"meeting_123","routing_confidence":0.91,"routing_rationale":"Customer onboarding call"}}}
```

```json
{"action":"save_customer_memory","label":"Saving customer signal","data":{"content":"Anonymous visitor asked for clearer weekly rollout updates.","memory_type":"insight","source_type":"widget_chat","conversation_id":"UUID","visitor_id":"visitor_123","source_title":"Public widget chat"}}
```

## save_user_memory
**Required keys:** `content`, `memory_type`

**Optional keys:** `source_type`, `source_id`, `source_title`, `significance`, `tags`, `domain`, `contact_id`, `episode_id`, `occurred_at`, `occurred_until`, `asserted_at`, `valid_from`, `valid_until`, `temporal_status`, `temporal_confidence`, `temporal_source`

**Types:** `content`: string, `memory_type`: string, `source_type`: string, `source_id`: string, `source_title`: string, `significance`: number, `domain`: string, `contact_id`: string, `episode_id`: string, `occurred_at`: iso_date, `occurred_until`: iso_date, `asserted_at`: iso_date, `valid_from`: iso_date, `valid_until`: iso_date, `temporal_status`: string, `temporal_confidence`: number, `temporal_source`: string

USER DEFAULT BRAIN ONLY — does NOT write to agent brains. For agent brain knowledge, use ingest_agent_brain_text. REQUIRED FIELDS: content (string, minimum 10 characters — this is the knowledge text, NOT called 'memory'), memory_type (must be one of: decision, insight, preference, fact, story, framework, event). Optional: significance (0-1, default 0.7), tags (string array), source_type, source_id, source_title, domain.

```json
{"action":"save_user_memory","label":"Saving this to your brain","data":{"content":"Users who buy after webinar need 3-day follow-up","memory_type":"insight","significance":0.8,"tags":["webinar","follow-up"]}}
```

## search_agent_brain
**Required keys:** `query`, `brain_id`

**Optional keys:** `domain`, `limit`, `time_mode`, `as_of`, `occurred_from`, `occurred_to`, `include_historical`

**Types:** `query`: string, `brain_id`: string, `domain`: string, `limit`: number, `time_mode`: string, `as_of`: iso_date, `occurred_from`: iso_date, `occurred_to`: iso_date, `include_historical`: boolean

**Use when:** Search an Agent Brain by brain_id for source-grounded SK entries, scores, related context, and sufficiency signals.

Searches an Agent Brain with hybrid semantic + lexical retrieval. Requires brain_id from resolve_agent_brain. Results are source-grounded and include scores, match_reasons, evidence_refs, related, metadata, context_sufficient, missing, and suggested_next_queries. If context_sufficient=false, search again with suggested_next_queries or ask the user instead of answering definitively. Optional filters: domain, limit.

```json
{"action":"search_agent_brain","label":"Searching agent brain","data":{"query":"objection handling framework","brain_id":"UUID","domain":"sales","limit":10}}
```

## search_brain_context
**Required keys:** `query`

**Optional keys:** `families`, `brain_ids`, `brainIds`, `limit`, `include_related`, `require_sufficient_context`, `time_mode`, `as_of`, `occurred_from`, `occurred_to`, `include_historical`

**Types:** `query`: string, `limit`: number, `include_related`: boolean, `require_sufficient_context`: boolean, `time_mode`: string, `as_of`: iso_date, `occurred_from`: iso_date, `occurred_to`: iso_date, `include_historical`: boolean

**Use when:** Explicitly search across accessible Brain families when the user asks to search all brains/everything/shared brains.

**Do not use when:** The user asks for one specific Brain family; use search_user_brain, search_agent_brain, search_customer_brain, or search_company_brain instead. The user refers to uploaded files, attachments, reports, spreadsheets, PDFs, generated documents, or data they previously provided in the active work; search or read Space/document sources first because those usually have exact retrievable objects. This agent does not have access to the requested Brain family (user requires Read personal brain; agent/company/customer require the matching read_brain action domain).

Explicit cross-Brain search across all accessible Brain families or selected families. Use only when the user asks to search all brains, every brain they can access, shared brains, or multiple named Brain families. For uploaded files, attachments, reports, spreadsheets, PDFs, generated documents, or data the user previously provided in the active work, search or read Space/document sources before Brain because those sources usually have exact retrievable objects. Results are source-grounded and include family/kind/source fields, scores, match_reasons, evidence_refs, related, metadata, context_sufficient, missing, suggested_next_queries, and by_family counts. For one specific family, use the family-specific search action instead.

```json
{"action":"search_brain_context","label":"Searching all accessible brains","data":{"query":"pricing decision","families":["user","company"],"limit":10}}
```

Contract example: search user and company brains together
```json
{"action":"search_brain_context","label":"search user and company brains together","data":{"query":"pricing decision","families":["user","company"],"limit":10}}
```

## search_company_brain
**Required keys:** `query`

**Optional keys:** `brain_id`, `limit`, `time_mode`, `as_of`, `occurred_from`, `occurred_to`, `include_historical`

**Types:** `query`: string, `brain_id`: string, `limit`: number, `time_mode`: string, `as_of`: iso_date, `occurred_from`: iso_date, `occurred_to`: iso_date, `include_historical`: boolean

**Use when:** Search Company Brain for source-grounded operating beliefs, standards, protocols, decisions, related company objects, scores, and sufficiency signals.

Search Company Brain with hybrid semantic + lexical retrieval over company cortex objects and related edges. Use when you need operating beliefs, standards, tensions, protocols, decisions, or org guidance. Results are source-grounded and include scores, match_reasons, evidence_refs, related company objects, metadata, context_sufficient, missing, and suggested_next_queries. If context_sufficient=false, search again with suggested_next_queries or ask the user instead of answering definitively.

```json
{"action":"search_company_brain","label":"Searching company brain","data":{"query":"approval before publish","limit":10}}
```

## search_customer_brain
**Required keys:** `query`

**Optional keys:** `brain_id`, `limit`, `time_mode`, `as_of`, `occurred_from`, `occurred_to`, `include_historical`

**Types:** `query`: string, `brain_id`: string, `limit`: number, `time_mode`: string, `as_of`: iso_date, `occurred_from`: iso_date, `occurred_to`: iso_date, `include_historical`: boolean

**Use when:** Search Customer Brain for source-grounded customer memories, avatar evidence, scores, and sufficiency signals.

Searches the current personal/org Customer Brain with hybrid semantic + lexical retrieval. Use for customer cognition, avatar evidence, preferences, objections, and account-specific facts. Results are source-grounded and include scores, match_reasons, evidence_refs, related, metadata, context_sufficient, missing, and suggested_next_queries. If context_sufficient=false, search again with suggested_next_queries or ask the user instead of answering definitively.

```json
{"action":"search_customer_brain","label":"Searching customer brain","data":{"query":"onboarding objections","limit":10}}
```

## search_user_brain
**Required keys:** `query`

**Optional keys:** `brain_id`, `limit`, `time_mode`, `as_of`, `occurred_from`, `occurred_to`, `include_historical`

**Types:** `query`: string, `brain_id`: string, `limit`: number, `time_mode`: string, `as_of`: iso_date, `occurred_from`: iso_date, `occurred_to`: iso_date, `include_historical`: boolean

**Use when:** Search the selected/default User Brain for source-grounded memories, snapshots, related beliefs/pages, scores, and sufficiency signals.

**Do not use when:** Searching an Agent, Customer, or Company Brain; use the family-specific Brain search action instead.

Searches the selected/default User Brain with hybrid semantic + lexical retrieval. Results are source-grounded and include result id, brain_id, family, kind, title, snippet/content, source_type/source_id/source_title, scores, match_reasons, evidence_refs, related, metadata, context_sufficient, missing, and suggested_next_queries. If context_sufficient=false, search again with suggested_next_queries or ask the user instead of answering definitively. For structured curated knowledge, prefer get_brain_pages first.

```json
{"action":"search_user_brain","label":"Searching your brain","data":{"query":"webinar follow-up strategy for conversions"}}
```

## transfer_brain_by_source
**Required keys:** `operation`, `source_title`, `source_scope`, `target_scope`

**Optional keys:** `source_type`, `source_id`

**Types:** `operation`: string, `source_title`: string, `source_type`: string, `source_id`: string

Batch copy or move ALL memories (and optional snapshots when source_type+source_id match) sharing the same source_title between supported brain scopes. Campaign/Space context is not a durable Brain target. Far more efficient than node-by-node transfer_brain_node for large groups. operation: copy or move. Optional source_type / source_id narrow memory rows; when both are set, matching ns_snapshots are included.

```json
{"action":"transfer_brain_by_source","label":"Copying source group between brains","data":{"operation":"copy","source_title":"Q4 Playbook","source_type":"document","source_scope":{"type":"user"},"target_scope":{"type":"agent","agent_id":"vibey"}}}
```

## transfer_brain_node
**Required keys:** `operation`, `node_type`, `node_id`, `source_scope`, `target_scope`

**Optional keys:** `connected_node_ids`, `source_type`, `source_id`, `source_title`

**Types:** `operation`: string, `node_type`: string, `node_id`: string, `source_type`: string, `source_id`: string, `source_title`: string

Copy or move a brain node (memory, snapshot, sk_entry, sk_source, experience bundle) between supported brain scopes. Campaign/Space context is not a durable Brain target. For experience, pass connected_node_ids. Uses main API internal transfer pipeline.

```json
{"action":"transfer_brain_node","label":"Moving knowledge to the right brain","data":{"operation":"move","node_type":"memory","node_id":"UUID","source_scope":{"type":"user"},"target_scope":{"type":"agent","agent_id":"vibey"},"connected_node_ids":[]}}
```

## unlink_brain_pages
**Required keys:** `brain_type`, `from_page_id`, `to_page_id`

**Optional keys:** `brain_id`

**Types:** `brain_type`: string, `brain_id`: string, `from_page_id`: string, `to_page_id`: string

Remove a cross-reference link between two brain pages in the same requested brain target.

```json
{"action":"unlink_brain_pages","label":"Removing link","data":{"brain_type":"user_default","from_page_id":"UUID","to_page_id":"UUID"}}
```

## update_brain_belief_pattern
**Required keys:** `brain_type`, `id`

**Optional keys:** `brain_id`, `pattern_name`, `description`, `strength`, `status`, `emotional_signature`

**Types:** `brain_type`: string, `brain_id`: string, `id`: string, `pattern_name`: string, `description`: string, `strength`: number, `status`: string

Update any field on a belief pattern: pattern_name, description, strength, status, emotional_signature.

```json
{"action":"update_brain_belief_pattern","label":"Updating belief strength","data":{"brain_type":"user_default","id":"UUID","strength":0.8,"status":"active"}}
```

## update_brain_page
**Required keys:** `brain_type`, `id`

**Optional keys:** `brain_id`, `content_md`, `summary`, `title`, `tags`, `source_refs`

**Types:** `brain_type`: string, `brain_id`: string, `id`: string, `content_md`: string, `summary`: string, `title`: string

Full rewrite of a brain page. Use only for major restructures — prefer patch_brain_page for incremental updates. Required: brain_type and id from get_brain_pages.

```json
{"action":"update_brain_page","label":"Rewriting brand voice page","data":{"brain_type":"user_default","id":"page-uuid","content_md":"Complete new narrative...","summary":"Updated one-liner"}}
```

## update_brain_perspective
**Required keys:** `brain_type`, `id`

**Optional keys:** `brain_id`, `name`, `description`, `narrative_md`, `strength`, `status`, `blind_spots`

**Types:** `brain_type`: string, `brain_id`: string, `id`: string, `name`: string, `description`: string, `narrative_md`: string, `strength`: number, `status`: string, `blind_spots`: string

Update any field on a perspective: name, description, narrative_md, strength, status, blind_spots.

```json
{"action":"update_brain_perspective","label":"Updating perspective narrative","data":{"brain_type":"user_default","id":"UUID","narrative_md":"Updated narrative...","strength":0.7}}
```

## update_company_brain_object
**Required keys:** `id`

**Optional keys:** `brain_id`, `title`, `truth`, `status`, `confidence`

**Types:** `id`: string, `brain_id`: string, `title`: string, `truth`: string, `status`: string, `confidence`: number

Update fields on an existing company cortex object (title, truth, status, confidence, retrieval_rule).

```json
{"action":"update_company_brain_object","label":"Updating company standard","data":{"id":"UUID","confidence":0.9}}
```

## upsert_brain_timeline_items
**Required keys:** `brain_type`, `timeline_id`, `items`

**Optional keys:** `brain_id`

**Types:** `brain_type`: string, `brain_id`: string, `timeline_id`: string, `items`: object_array

Create or update curated timeline milestones. Required: brain_type, timeline_id, items. Use stable dedupe_key values so repeated synthesis updates the same milestone instead of duplicating it.

```json
{"action":"upsert_brain_timeline_items","label":"Updating timeline milestones","data":{"brain_type":"company","brain_id":"UUID","timeline_id":"timeline-uuid","items":[{"item_type":"decision","title":"Approval-first mutations adopted","description":"The company resolved autonomy vs approval by requiring approval before mutating workspace state.","occurred_at":"2026-06-18T10:00:00Z","temporal_source":"company_cortex_formation","importance":0.8,"confidence":0.82,"dedupe_key":"company_object:object-uuid:approval-first-decision"}]}}
```
