# PromptMode Action Family Map

Last Modified: June 22, 2026

## Summary

PromptMode currently has **374 backend actions** in `VALID_ACTIONS`.

Product decision as of June 22, 2026:

- **Needed / keep agent-facing:** 350 actions.
- **On hold / not used today:** 24 actions.
- The only on-hold families are **Projects / Code Runtime** and **Supabase**.
- All other families remain part of the product action surface and should be preflighted, tested, and documented when changed.
- Lifecycle is enforced in policy, generated `vibey-api` skills, the Docker plugin action enum, and backend execution. On-hold actions remain in backend compatibility maps but are hidden from agents and rejected before side effects.

Plugin-local helpers are separate from backend `VALID_ACTIONS`:

- `create_chat_plan`
- `update_chat_plan`

These are local planning helpers, not backend artifact actions.

## Family Table

| Family | Count | Status | What It Is |
| --- | ---: | --- | --- |
| General / Contracts / State | 4 | Keep | Action introspection, docs search, state patching, user messaging. |
| Offers / Ads | 14 | Keep | Offer creation, ad creative records, ad copy generation. |
| Meta Ads / Meta Account | 19 | Keep | Meta account checks, ad publishing, audience/pixel/insights actions. |
| Funnels / Websites / Forms | 33 | Keep | Funnel, website, HTML bundle, native form, and form publishing actions. |
| Presentations | 21 | Keep | Presentation creation, file bundles, assets, element edits, tweaks. |
| Email / Sequences | 16 | Keep | Email records, email sequences, prepare-send workflows. |
| Avatars / Themes | 11 | Keep | Buyer personas, campaign avatars, brand themes. |
| Projects / Code Runtime | 18 | On hold | Viktor/project code runtime. No users are using it today. |
| Custom Objects | 9 | Keep | Generic object system: flexible record types and records. |
| Agent Skills / Team / Delegation | 23 | Keep | Skills, HR/team actions, campaign assignment, agent delegation. |
| Documents / PDF / DOCX | 9 | Keep | Saved documents, document reads, PDF/DOCX generation. |
| Integrations / Calendar | 10 | Keep | Integration discovery/connect/use, calendar CRUD. |
| Media / Image / Video / Visual | 13 | Keep | Image/video generation, analysis, media processing, visual HTML. |
| Spaces / Tasks | 15 | Keep | Space views, fields, tasks, task comments, semantic Space search. |
| Flows / Automations | 21 | Keep | Flow capabilities, drafts, plans, blueprints, validation, publishing. |
| Missions | 23 | Keep | Mission lifecycle, comments, subtasks, deliverables, replan/approval. |
| Brain / Memory / Customer / Company Brain | 68 | Keep | User, agent, customer, and company Brain actions. |
| Social / Blog / Research | 17 | Keep | Social posts, blog posts, social/ad research. |
| Strategy / Analytics / Reports | 6 | Keep | Strategy nodes and campaign analytics/reporting. |
| Campaign / Context / Awareness | 11 | Keep | Campaign CRUD, campaign/team context, channel context, awareness. |
| MCP | 7 | Keep | MCP servers, tools, resources, dynamic external tool execution. |
| Supabase | 6 | On hold | Direct database actions for the held Projects/Viktor path. |

## Families

### General / Contracts / State

Purpose: shared utility actions that help the agent understand contracts, search Vibey docs, update internal state, or send a user-visible message.

Actions:

```txt
describe_action
search_vibey_docs
patch_state
send_user_message
```

Note: `patch_state` is generic and powerful. Keep it, but treat it as a preflight-sensitive action.

### Offers / Ads

Purpose: offer-building and ad creative records inside the campaign workspace.

Actions:

```txt
create_offer
update_offer_step
get_offer
list_offers
delete_offer
list_custom_fields
create_ad
update_ad
patch_ad
list_ads
get_ad
delete_ad
bulk_create_ads
generate_ad_copy
```

### Meta Ads / Meta Account

Purpose: external Meta account readiness, publishing, status, insights, audiences, and pixel events.

Actions:

```txt
create_ad_campaign
create_ad_set
get_ad_campaign
get_ad_set
update_ad_campaign
update_ad_set
check_meta_connection
list_meta_ad_accounts
list_meta_pages
publish_ad_to_meta
save_meta_defaults
get_meta_ad_status
get_meta_ads_insights
get_delivery_estimate
list_meta_audiences
create_meta_custom_audience
create_meta_lookalike_audience
list_meta_pixel_events
create_meta_pixel_event
```

Note: this family needs strong readiness preflight because it touches external accounts and can create or publish external objects.

### Funnels / Websites / Forms

Purpose: first-class marketing artifact creation and editing: funnels, websites, HTML bundle files/assets, native forms, publishing, and form responses.

Actions:

```txt
create_funnel
add_funnel_page
update_funnel_page
set_website_layout
get_funnel
list_funnels
delete_funnel
list_forms
get_form
create_form
update_form
attach_form_asset
publish_form
unpublish_form
list_form_responses
list_funnel_files
read_funnel_file
write_funnel_file
patch_funnel_file
delete_funnel_file
list_funnel_assets
attach_funnel_asset
detach_funnel_asset
apply_funnel_element_edit
add_funnel_anchor
extract_funnel_tweaks
update_funnel_tweaks
create_website
add_website_page
update_website_page
get_website
list_websites
delete_website
```

### Presentations

Purpose: presentation artifacts, slide updates, source-file bundle editing, assets, selected-element edits, anchors, and tweak markers.

Actions:

```txt
create_presentation
update_presentation
patch_presentation
update_presentation_slide
add_presentation_slide
list_presentations
get_presentation
delete_presentation
list_presentation_files
read_presentation_file
write_presentation_file
patch_presentation_file
delete_presentation_file
show_presentation_file
list_presentation_assets
attach_presentation_asset
detach_presentation_asset
apply_presentation_element_edit
add_presentation_anchor
extract_presentation_tweaks
update_presentation_tweaks
```

### Email / Sequences

Purpose: email content records, campaign email sequences, and send-preparation actions.

Actions:

```txt
create_sequence
add_sequence_email
update_sequence_email
get_sequence
get_sequence_email
update_sequence
list_sequences
delete_sequence
delete_sequence_email
prepare_email_send
prepare_sequence_send
list_emails
save_email
get_email
update_email
delete_email
```

### Avatars / Themes

Purpose: buyer personas/avatars and brand themes used by campaign creative work.

Actions:

```txt
create_avatar
get_avatar
update_avatar
list_avatars
delete_avatar
create_theme
list_themes
get_theme
update_theme
delete_theme
extract_website_theme
```

### Projects / Code Runtime - On Hold

Purpose: Viktor/project code runtime actions for project creation, file editing, runtime logs, URLs, and validation.

Status: **on hold / not used by users today**.

Actions:

```txt
create_project
get_project
list_projects
create_file
update_file
read_file
delete_file
list_project_files
update_project_deps
import_github_repo
get_project_logs
restart_project
fetch_project_url
patch_file
search_project_files
list_project_directory
get_project_errors
validate_project
```

Decision: do not spend deep preflight work here until Projects is reactivated.

### Custom Objects

Purpose: generic flexible records, similar to a small Airtable/Notion-style object system inside Vibey.

In simple words:

- `define_object_type` creates the kind of thing, like `Client`, `Vendor`, `Competitor`, or `Content Idea`.
- `create_object` creates one actual record of that type.
- `list_objects` and `get_object` read those records.
- `update_object` and `delete_object` change or remove them.

Actions:

```txt
define_object_type
list_object_types
get_object_type
update_object_type
create_object
update_object
list_objects
get_object
delete_object
```

Note: this family is needed, but it is generic. Preflight should verify object type existence, field compatibility, and write permissions before mutations.

### Agent Skills / Team / Delegation

Purpose: agent skill management, HR/team operations, campaign assignment, and agent-to-agent delegation.

Actions:

```txt
list_agent_skills
create_agent_skill
update_agent_skill
delete_agent_skill
create_agent_skill_resource
update_agent_skill_resource
delete_agent_skill_resource
copy_skill_resource
upload_skill_asset
create_agent
get_agent
update_agent
list_team
audit_team_agents_and_skills
compare_team_skill_coverage
summarize_agent_capabilities
list_campaign_team
assign_agent_to_campaign
unassign_agent_from_campaign
ask_agent
delegate_to_agent
approve_agent_hire
brainstorm_agents
```

Note: keep strongly profile-gated. Not every agent should see or use this whole family.

### Documents / PDF / DOCX

Purpose: saved documents, document retrieval, and downloadable PDF/DOCX generation.

Actions:

```txt
save_document
create_pdf
create_docx
list_documents
get_document
read_space_document
read_document
update_document
delete_document
```

### Integrations / Calendar

Purpose: integration search/connect/readiness/use plus calendar events.

Actions:

```txt
check_integration_connection
get_capabilities
use_integration
get_integration
search_available_integrations
initiate_integration_connect
list_calendar_events
create_calendar_event
update_calendar_event
delete_calendar_event
```

Note: this family should use connection-readiness preflight before runtime/provider calls.

### Media / Image / Video / Visual

Purpose: image/video generation, media status, visual analysis, media processing, and HTML visual generation.

Actions:

```txt
get_media_generation_status
generate_image
edit_image
list_canvas_nodes
generate_ad_set
generate_video
get_video_status
analyze_video
analyze_image
extract_url_transcript
generate_visual_html
list_campaign_media
process_media
```

Note: this family needs strict operation-specific preflight because media actions are expensive and often depend on valid asset references.

### Spaces / Tasks

Purpose: Space context, Space views/items, Space fields, tasks, task CRUD, and task comments.

Actions:

```txt
list_spaces
search_space_context
get_space
list_space_views
get_space_view
list_space_view_items
get_space_item
create_space_field
update_space_field
list_tasks
get_task
create_task
update_task
delete_task
add_task_comment
```

### Flows / Automations

Purpose: Loop/Flow capability discovery, drafts, build context, clarification, plans, validation, compilation, blueprints, and publishing.

Actions:

```txt
search_flow_capabilities
get_flow_capability
list_flows
get_flow
create_flow_draft
update_flow_draft
validate_flow_draft
publish_flow
get_flow_build_context
create_flow_clarification
create_flow_plan
update_flow_plan
answer_flow_clarification
validate_flow_plan
compile_flow_plan
list_flow_blueprints
get_flow_blueprint
create_flow_blueprint_draft
validate_flow_blueprint
activate_flow_blueprint
evaluate_flow_plan
```

### Missions

Purpose: mission lifecycle, mission state, comments, deliverables, subtasks, replan, retry, and approval flows.

Actions:

```txt
create_mission
list_missions
get_mission
get_mission_plan
get_mission_logs
get_mission_deliverables
update_mission
add_mission_comment
list_mission_subtasks
update_mission_subtask
retry_mission
trash_mission
answer_mission_question
summarize_mission_state
attach_mission_context
show_mission_deliverable
create_mission_subtask
edit_mission_subtask
cancel_mission_subtask
retry_mission_subtask
reassign_mission_subtask
prepare_mission_replan
approve_mission
```

### Brain / Memory / Customer / Company Brain

Purpose: personal Brain, agent Brain, customer Brain, company Brain, narrative pages, timelines, beliefs, perspectives, lint, and memory transfer.

Actions:

```txt
save_user_memory
atlas_save_brain_context
search_user_brain
search_brain_context
search_agent_brain
get_brain_stats
resolve_agent_brain
list_available_brain_scopes
list_user_brain_memories
list_agent_brain_domains
get_agent_brain_gaps
list_agent_brain_imports
crystallize_user_brain
ingest_user_brain_link
ingest_user_brain_text
ingest_user_brain_document
ingest_agent_brain_text
ingest_agent_brain_link
ingest_fathom_meeting
ingest_fireflies_transcript
transfer_brain_node
transfer_brain_by_source
assign_user_memory_source
delete_brain_node
save_customer_memory
search_customer_brain
ingest_customer_brain_text
ingest_customer_brain_link
list_customer_brain_memories
list_customer_avatars
get_brain_pages
get_brain_timelines
get_brain_timeline_items
create_brain_timeline
upsert_brain_timeline_items
archive_brain_timeline
create_brain_page
patch_brain_page
update_brain_page
archive_brain_page
link_brain_pages
unlink_brain_pages
get_brain_log
log_brain_event
get_brain_belief_patterns
create_brain_belief_pattern
update_brain_belief_pattern
archive_brain_belief_pattern
merge_brain_belief_patterns
connect_brain_belief_to_memory
disconnect_brain_belief_from_memory
get_brain_perspectives
create_brain_perspective
update_brain_perspective
archive_brain_perspective
connect_brain_belief_to_perspective
disconnect_brain_belief_from_perspective
get_brain_lint
run_brain_lint
resolve_brain_lint
get_company_brain_objects
get_company_brain_object_edges
search_company_brain
create_company_brain_object
update_company_brain_object
archive_company_brain_object
create_company_brain_edge
delete_company_brain_edge
```

### Social / Blog / Research

Purpose: social posts, blog posts, templates, publishing, and social/ad research.

Actions:

```txt
run_social_research_search
run_ads_research_search
search_ads_research_advertisers
create_social_post
schedule_social_post
update_social_post
list_social_posts
get_social_post
delete_social_post
publish_social_post
create_blog_post
update_blog_post
list_blog_posts
get_blog_post
delete_blog_post
get_social_post_template
list_social_post_templates
```

### Strategy / Analytics / Reports

Purpose: strategy nodes and campaign dashboard/reporting data.

Actions:

```txt
create_strategy_node
list_strategy_nodes
get_daily_report_data
get_campaign_main_dashboard
get_campaign_social_analytics
get_campaign_stripe_overview
```

### Campaign / Context / Awareness

Purpose: campaign CRUD, campaign context, awareness points, member notes, and channel context.

Actions:

```txt
update_campaign_context
create_awareness_point
update_awareness
create_campaign
update_campaign
list_campaigns
get_campaign
save_member_note
get_member_notes
discover_channel_context
set_channel_context
```

### MCP

Purpose: external MCP server/tool/resource discovery and dynamic tool execution.

Actions:

```txt
list_mcp_servers
list_mcp_tools
use_mcp_tool
add_mcp_server
remove_mcp_server
list_mcp_resources
read_mcp_resource
```

Note: this family should use dynamic schema preflight from each MCP tool input schema.

### Supabase - On Hold

Purpose: direct database inspection and mutation actions, originally connected to the Projects/Viktor developer path.

Status: **on hold / not used by users today**.

Actions:

```txt
supabase_list_tables
supabase_run_sql
supabase_create_table
supabase_insert_rows
supabase_update_rows
supabase_delete_rows
```

Decision: do not spend deep preflight work here until this path is reactivated. If reactivated, these must be admin/developer-gated with strict SQL/table/permission preflight.

## Maintenance Rules

When adding, removing, or changing an agent-facing action:

1. Update `VALID_ACTIONS`.
2. Update `ACTION_METHOD_MAP`.
3. Update `ACTION_SCHEMAS`.
4. Update `ACTION_PREFLIGHT_COVERAGE`.
5. Update lifecycle classification in `packages/agent-policy/src/action-lifecycle.ts`.
6. Add or update preflight validators when schema alone is not enough.
7. Update plugin/policy/MCP drift tests.
8. Update this family map if the action surface changes.
9. Update generated action docs or feature docs when user-facing behavior changes.

No action should be left as an unlabeled or pass-through tool.
