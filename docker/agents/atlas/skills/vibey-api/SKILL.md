---
name: vibey-api
description: Vibey backend actions for artifacts, Spaces, Brain, team, campaigns, and Flows. Read before calling vibey_backend or campaign_capability.
---

# Vibey API

```
vibey_backend({ action: "ACTION_NAME", label: "UI label", data: { ... } })
```

In platform mode, OpenClaw may surface this same backend action tool as `campaign_capability`. Use the tool name currently exposed by the runtime; the `action`, `label`, and `data` payload contract is the same.

Auth, active Space, campaign context, and routing are handled automatically.

Before calling a backend action, use the exact contract already in this skill, the current tool schema, or current context. Call `describe_action` only when the contract is not available or the required fields, optional fields, aliases, or action fit are still uncertain. Do not guess payload keys.

## Quick Start

Save a memory (user brain only):
```json
{ "action": "save_user_memory", "label": "Saving to your brain", "data": { "content": "Key insight about the customer", "memory_type": "insight", "significance": 0.8, "tags": ["customer"] } }
```

Ingest agent brain knowledge (requires brain_id from resolve_agent_brain):
```json
{ "action": "ingest_agent_brain_text", "label": "Adding knowledge", "data": { "brain_id": "UUID", "text": "Content to learn...", "sourceType": "document", "title": "Source Name" } }
```

Save customer memory (contact_id preferred; use source identity when contact is unknown):
```json
{ "action": "save_customer_memory", "label": "Saving customer insight", "data": { "content": "Customer wants weekly rollout summaries.", "memory_type": "preference", "contact_id": "UUID" } }
```
Contactless source-anchored customer signal:
```json
{ "action": "save_customer_memory", "label": "Saving customer signal", "data": { "content": "Public widget visitor wants weekly rollout summaries.", "memory_type": "insight", "source_type": "widget_chat", "conversation_id": "UUID", "visitor_id": "visitor_123" } }
```

Ask another agent (requires target_agent_key + prompt):
```json
{ "action": "ask_agent", "label": "Consulting with Ivy", "data": { "target_agent_key": "copywriter", "prompt": "Review this headline and suggest improvements" } }
```

Delegate a task to another agent (requires target_agent_key + task_description):
```json
{ "action": "delegate_to_agent", "label": "Delegating to Rex", "data": { "target_agent_key": "developer", "task_description": "Build a responsive landing page for the Q2 launch" } }
```

Start a multi-agent brainstorm (requires agents array + topic + rounds):
```json
{ "action": "brainstorm_agents", "label": "Brainstorming Q3 positioning", "data": { "agents": ["niko", "ivy", "lux"], "topic": "Q3 product positioning strategy for enterprise", "rounds": 2 } }
```

List connected calendar events:
```json
{ "action": "list_calendar_events", "label": "Checking calendar", "data": { "start": "2026-06-18T00:00:00.000Z", "end": "2026-06-19T00:00:00.000Z", "timezone": "Asia/Nicosia" } }
```

Create a provider calendar event:
```json
{ "action": "create_calendar_event", "label": "Adding calendar event", "data": { "provider": "google_calendar", "title": "Review launch tasks", "start": "2026-06-18T10:00:00.000Z", "end": "2026-06-18T10:30:00.000Z", "timezone": "Asia/Nicosia" } }
```

## Important Patterns

Read the matching protocol reference before choosing backend actions when the request matches that protocol.

| Protocol | Version | Reference | Use when |
|---------|---------|-----------|----------|
| Brain Knowledge Protocol | v1 | `references/protocols/brain-knowledge-protocol.md` | Use when the answer may live in durable user, company, agent, customer, or cross-brain memory. |
| Skill Usage Protocol | v1 | `references/protocols/skill-usage-protocol.md` | Use when backend actions need to be paired with the right workflow skill for deliverable quality. |
| Tool Schema Protocol | v2 | `references/protocols/tool-schema-protocol.md` | Use before backend action calls when payload keys, aliases, types, or action fit are uncertain. |
| Data Grounding Protocol | v1 | `references/protocols/data-grounding-protocol.md` | Use whenever platform data, schemas, agent definitions, memory, current context, or user-owned artifacts can answer the question or constrain the action. |
| Planning Protocol | v1 | `references/protocols/planning-protocol.md` | Use for multi-step, cross-artifact, expensive, irreversible, or choice-heavy platform work. |
| Persistence Protocol | v1 | `references/protocols/persistence-protocol.md` | Use when completed or in-progress work should become durable platform assets or state. |
| Clarification Protocol | v1 | `references/protocols/clarification-protocol.md` | Use when missing inputs, ambiguity, destructive actions, publishing, cost, or preferences make guessing risky. |
| Delegation Protocol | v1 | `references/protocols/delegation-protocol.md` | Use when specialist consultation or executable work should be routed to another agent. |

- **Ad updates vs creation**: `create_ad` makes a new artifact. When the user asks to change, regenerate, or remake an existing ad, use `update_ad` with the ad_id. For image regeneration: `generate_image` first, then `update_ad` with the returned image_url and image_asset_id.
- **Theme auto-resolution**: `create_funnel`, `create_presentation`, and `create_ad` automatically pull the campaign's theme. Pass explicit `theme_id` only when overriding. Don't invent fallback colors/fonts when a campaign theme exists.
- **Document retrieval before Brain**: Treat uploaded files, generated documents, attachments, reports, spreadsheets, PDFs, and user-provided datasets as active Space evidence first because they usually have exact retrievable source objects. Use `list_documents`, `get_document`, `read_space_document`, `read_document` before Brain when the user refers to a file, upload, report, attachment, or data they already gave. Use Brain for durable remembered facts, preferences, or cross-Space knowledge when no current document source is expected. Example: "I already gave you the April follow-up call data" means search Space/docs first; "What does Brian usually care about in reports?" can use Brain if no document is the obvious source.
- **Document file formats**: `create_pdf` and `create_docx` default to markdown rendering. Set `content_format: "html"` when content contains HTML tags, otherwise tags print as raw text.
- **Space retrieval protocol**: for browse/count/selection requests, discover the live space schema/view first, then call a filtered list action. Use `get_space` or `list_space_views` to identify status option ids, view ids, and custom field ids; then call `list_tasks`, `list_documents`, or `list_space_view_items` with filters, `fields: "summary"`, a small `limit`, and `include_count: true` when the user asks for counts. Do not list hundreds of rows and filter them yourself.
- **My Tasks means assigned to the current human user**: for "my tasks", "tasks assigned to me", or "their tasks" when "their" means the current user, call `list_tasks` with `assigned_to_me: true`. Do not use `assignee_type: "unassigned"`, and do not ask for or pass `user_id`; the backend resolves the current user from the session and matches multi-assignee rows the same way Home > My Tasks does.
- **create_task auto-ensures a space**: when the user asks for a task and you don't know which space, just call `create_task` with `title` (and optional priority/due_date/etc.) — the handler resolves a campaign-scoped or general space with a list/board/calendar view, or creates a default "Campaign Tasks" / "My Tasks" space. The response always includes the resolved `space_id` and an `ensured_space` flag. Do NOT ask the user which space to use just because `list_spaces` is empty.
- **New tasks stay open**: omit `status` when creating a new task unless the user explicitly named an open status. The backend defaults to the space's open/not-started status. Never create a task as completed/done/closed; if the user explicitly asked to mark it complete, create the task first, then use `update_task` with the completed status.
- **Tasks schema is user-defined**: status, priority, tags, and custom fields are configurable per space. Run `get_space` against the resolved `space_id` before sending status / priority / tag option ids — using a hardcoded value like "todo" will fail when the user has renamed it. The error response lists valid options.
- **Reserved keys vs. custom_data**: top-level keys on the payload (status, priority, assignee_type, assignee_id, start_date, due_date, description, notes, parent_item_id, sort_order, recurrence) map to dedicated columns. Everything else — including tags — goes inside `custom_data`, keyed by the schema field id. `system: true` in the schema means the user can't delete that field; it does not mean it has its own column.
- **custom_data is shallow-merged**: `update_task` only replaces the keys you send; other custom_data keys are preserved. Arrays (like tags) are replaced wholesale, not appended — to add one tag, run `get_task` first, then send `custom_data: { tags: [...existing, "new"] }`. Send `custom_data: { someKey: null }` to clear a field.
- **Calendar events vs tasks**: Google Calendar and Outlook events are provider-owned integration records. Use `list_calendar_events`, `create_calendar_event`, `update_calendar_event`, and `delete_calendar_event` for connected calendar events. Use `create_task` or `update_task` with `start_date` and `due_date` when the user wants a Space task shown on the calendar. Calendar writes are for timed events only in v1; all-day provider events can be listed but should not be edited unless the backend contract adds all-day write support.
- **Campaign context**: `campaign_id` is resolved automatically from the session. NEVER pass `campaign_id` in `data` — it will be ignored or cause errors. The same applies to `conversation_id` and `user_id`.
- **Active scope contract**: tool calls inherit the user's current `space_id` and `campaign_id` automatically for each message. Do not pass `space_id` or `campaign_id` unless the user explicitly named a different space/campaign. If you do target a different scope, also pass `scope_override: true`.
- **Deletions**: All `delete_*` actions return a confirmation card. The user must approve before the delete executes.

## All Actions

Read the reference file for the section you need:

| Section | Reference File | Actions |
|---------|---------------|---------|
| Ads | `references/ads.md` | `generate_ad_set`, `list_canvas_nodes` |
| Blog | `references/blog.md` | `create_blog_post`, `delete_blog_post`, `get_blog_post`, `list_blog_posts`, `update_blog_post` |
| Brain | `references/brain.md` | `archive_brain_belief_pattern`, `archive_brain_page`, `archive_brain_perspective`, `archive_brain_timeline`, `archive_company_brain_object`, `assign_user_memory_source`, `atlas_save_brain_context`, `connect_brain_belief_to_memory`, `connect_brain_belief_to_perspective`, `create_brain_belief_pattern`, `create_brain_page`, `create_brain_perspective`, `create_brain_timeline`, `create_company_brain_edge`, `create_company_brain_object`, `crystallize_user_brain`, `delete_brain_node`, `delete_company_brain_edge`, `disconnect_brain_belief_from_memory`, `disconnect_brain_belief_from_perspective`, `get_agent_brain_gaps`, `get_brain_belief_patterns`, `get_brain_lint`, `get_brain_log`, `get_brain_pages`, `get_brain_perspectives`, `get_brain_stats`, `get_brain_timeline_items`, `get_brain_timelines`, `get_company_brain_object_edges`, `get_company_brain_objects`, `ingest_agent_brain_link`, `ingest_agent_brain_text`, `ingest_customer_brain_link`, `ingest_customer_brain_text`, `ingest_fathom_meeting`, `ingest_fireflies_transcript`, `ingest_user_brain_document`, `ingest_user_brain_link`, `ingest_user_brain_text`, `link_brain_pages`, `list_agent_brain_domains`, `list_agent_brain_imports`, `list_available_brain_scopes`, `list_customer_avatars`, `list_customer_brain_memories`, `list_user_brain_memories`, `log_brain_event`, `merge_brain_belief_patterns`, `patch_brain_page`, `propose_company_brain_signal`, `resolve_agent_brain`, `resolve_brain_lint`, `run_brain_lint`, `save_customer_memory`, `save_user_memory`, `search_agent_brain`, `search_brain_context`, `search_company_brain`, `search_customer_brain`, `search_user_brain`, `transfer_brain_by_source`, `transfer_brain_node`, `unlink_brain_pages`, `update_brain_belief_pattern`, `update_brain_page`, `update_brain_perspective`, `update_company_brain_object`, `upsert_brain_timeline_items` |
| Communication | `references/communication.md` | `discover_channel_context`, `get_member_notes`, `save_member_note`, `send_user_message`, `set_channel_context` |
| Documents | `references/documents.md` | `create_docx`, `create_pdf`, `delete_document`, `delete_email`, `get_document`, `get_email`, `list_documents`, `list_emails`, `read_space_document`, `save_document`, `save_email`, `update_document`, `update_email` |
| General | `references/general.md` | `describe_action`, `search_vibey_docs` |
| Integrations | `references/integrations.md` | `check_integration_connection`, `create_calendar_event`, `delete_calendar_event`, `get_capabilities`, `get_integration`, `initiate_integration_connect`, `list_calendar_events`, `search_available_integrations`, `update_calendar_event`, `use_integration` |
| MCP | `references/mcp.md` | `add_mcp_server`, `list_mcp_resources`, `list_mcp_servers`, `list_mcp_tools`, `read_mcp_resource`, `remove_mcp_server`, `use_mcp_tool` |
| Media | `references/media.md` | `analyze_image`, `analyze_video`, `edit_image`, `extract_url_transcript`, `generate_image`, `generate_video`, `get_media_generation_status`, `get_video_status`, `process_media`, `read_document`, `transcribe_audio` |
| Meta | `references/meta.md` | `check_meta_connection`, `create_meta_custom_audience`, `create_meta_lookalike_audience`, `create_meta_pixel_event`, `get_delivery_estimate`, `get_meta_ad_status`, `get_meta_ads_insights`, `list_meta_ad_accounts`, `list_meta_audiences`, `list_meta_pages`, `list_meta_pixel_events`, `publish_ad_to_meta`, `save_meta_defaults`, `update_ad_campaign`, `update_ad_set` |
| Missions | `references/missions.md` | `add_mission_comment`, `create_mission`, `get_mission`, `get_mission_deliverables`, `get_mission_logs`, `get_mission_plan`, `list_mission_subtasks`, `list_missions`, `retry_mission`, `trash_mission`, `update_mission`, `update_mission_subtask` |
| Sequences | `references/sequences.md` | `prepare_email_send`, `prepare_sequence_send` |
| Social | `references/social.md` | `create_social_post`, `delete_social_post`, `get_social_post`, `get_social_post_template`, `list_social_post_templates`, `list_social_posts`, `publish_social_post`, `schedule_social_post`, `update_social_post` |
| Spaces | `references/spaces.md` | `generate_visual_html` |
| State | `references/state.md` | `patch_state` |
| Strategy | `references/strategy.md` | `create_strategy_node`, `list_strategy_nodes` |
| Tasks | `references/tasks.md` | `add_task_comment`, `delete_task`, `get_space`, `list_spaces` |
| Team | `references/team.md` | `ask_agent`, `brainstorm_agents`, `copy_skill_resource`, `create_agent_skill`, `create_agent_skill_resource`, `delegate_to_agent`, `delete_agent_skill`, `delete_agent_skill_resource`, `get_agent`, `list_agent_skills`, `list_team`, `update_agent_skill`, `update_agent_skill_resource`, `upload_skill_asset` |
