# Agent Action Domains

Phase 1 review document for `standardize_agent_action_gating_1ed155d2.plan.md`.

This is documentation only. No schema, runtime, UI, or package code should be changed until this table and the defaults below are reviewed.

## Source Inventory

- Canonical current action source: `apps/agent-api/src/modules/artifacts/dtos/artifact-action.dto.ts`
- Current role allowlist source: `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts`
- Current action enforcement source: `apps/agent-api/src/modules/artifacts/services/artifact-legacy-runtime-core.service.ts`
- Current OpenClaw hidden-action source: `apps/agent-api/src/modules/agent-policy/agent-access-summary.ts`

Current `VALID_ACTIONS` count is 266 actions. The Cursor plan referenced 267 actions, so Phase 2 coverage tests must use the source file count as truth and fail if this count changes without updating this document and the package registry.

## Domain Registry

| Domain | Purpose |
|---|---|
| `read_campaign` | Read campaign records, dashboards, analytics, campaign media, campaign team, and campaign context. |
| `edit_campaign` | Create/update campaign settings, assign/unassign agents, update campaign context, and manage awareness points. |
| `read_marketing_artifacts` | Read/list offers, funnels, ads, websites, presentations, sequences, avatars, themes, and marketing field metadata. |
| `write_marketing_artifacts` | Create/update/delete marketing artifacts and artifact structure. |
| `manage_content` | Documents, PDFs, emails, social posts, blogs, and content publishing surfaces. |
| `manage_tasks_missions` | Spaces, tasks, missions, mission subtasks, comments, logs, plans, deliverables, and visual HTML. |
| `code_projects` | Project/dev-environment actions and project file operations. |
| `custom_db` | Custom object model actions and Supabase table/row actions. |
| `use_integrations` | Integration connection, discovery, toolkit execution, and Meta operations. |
| `generate_media` | Image/video generation, video analysis, transcript extraction, media processing, and media status reads. |
| `read_brain_personal` | User personal brain reads. |
| `read_brain_campaign` | Campaign/SK brain reads, brain scope metadata, brain logs, and memory/knowledge search. |
| `write_brain` | Memory writes, ingestion, transfer, source assignment, deletion, crystallization, and narrative writes. |
| `edit_brain_models` | Beliefs, perspectives, lint, and strategy model actions. |
| `manage_agents` | Agent CRUD, hiring, and skill/resource management. |
| `communicate` | User messages, agent ask/delegate, notes, and collaboration actions. |
| `use_mcp` | MCP server/tool/resource operations. |

## ACTION_TO_DOMAIN

Every action maps to exactly one `action_domain`.

| Action | Domain |
|---|---|
| `create_offer` | `write_marketing_artifacts` |
| `update_offer_step` | `write_marketing_artifacts` |
| `get_offer` | `read_marketing_artifacts` |
| `list_offers` | `read_marketing_artifacts` |
| `delete_offer` | `write_marketing_artifacts` |
| `list_custom_fields` | `read_marketing_artifacts` |
| `create_ad` | `write_marketing_artifacts` |
| `update_ad` | `write_marketing_artifacts` |
| `patch_ad` | `write_marketing_artifacts` |
| `list_ads` | `read_marketing_artifacts` |
| `get_ad` | `read_marketing_artifacts` |
| `delete_ad` | `write_marketing_artifacts` |
| `create_ad_campaign` | `write_marketing_artifacts` |
| `create_ad_set` | `write_marketing_artifacts` |
| `get_ad_campaign` | `read_marketing_artifacts` |
| `get_ad_set` | `read_marketing_artifacts` |
| `update_ad_campaign` | `use_integrations` |
| `update_ad_set` | `use_integrations` |
| `create_funnel` | `write_marketing_artifacts` |
| `add_funnel_page` | `write_marketing_artifacts` |
| `update_funnel_page` | `write_marketing_artifacts` |
| `patch_funnel_page` | `write_marketing_artifacts` |
| `set_website_layout` | `write_marketing_artifacts` |
| `get_funnel` | `read_marketing_artifacts` |
| `list_funnels` | `read_marketing_artifacts` |
| `delete_funnel` | `write_marketing_artifacts` |
| `create_website` | `write_marketing_artifacts` |
| `add_website_page` | `write_marketing_artifacts` |
| `update_website_page` | `write_marketing_artifacts` |
| `patch_website_page` | `write_marketing_artifacts` |
| `get_website` | `read_marketing_artifacts` |
| `list_websites` | `read_marketing_artifacts` |
| `delete_website` | `write_marketing_artifacts` |
| `create_presentation` | `write_marketing_artifacts` |
| `update_presentation` | `write_marketing_artifacts` |
| `patch_presentation` | `write_marketing_artifacts` |
| `update_presentation_slide` | `write_marketing_artifacts` |
| `add_presentation_slide` | `write_marketing_artifacts` |
| `list_presentations` | `read_marketing_artifacts` |
| `get_presentation` | `read_marketing_artifacts` |
| `delete_presentation` | `write_marketing_artifacts` |
| `create_sequence` | `write_marketing_artifacts` |
| `add_sequence_email` | `write_marketing_artifacts` |
| `update_sequence_email` | `write_marketing_artifacts` |
| `get_sequence` | `read_marketing_artifacts` |
| `update_sequence` | `write_marketing_artifacts` |
| `list_sequences` | `read_marketing_artifacts` |
| `delete_sequence` | `write_marketing_artifacts` |
| `delete_sequence_email` | `write_marketing_artifacts` |
| `prepare_email_send` | `manage_content` |
| `prepare_sequence_send` | `manage_content` |
| `create_avatar` | `write_marketing_artifacts` |
| `get_avatar` | `read_marketing_artifacts` |
| `update_avatar` | `write_marketing_artifacts` |
| `list_avatars` | `read_marketing_artifacts` |
| `delete_avatar` | `write_marketing_artifacts` |
| `create_theme` | `write_marketing_artifacts` |
| `list_themes` | `read_marketing_artifacts` |
| `get_theme` | `read_marketing_artifacts` |
| `update_theme` | `write_marketing_artifacts` |
| `delete_theme` | `write_marketing_artifacts` |
| `extract_website_theme` | `write_marketing_artifacts` |
| `create_project` | `code_projects` |
| `get_project` | `code_projects` |
| `list_projects` | `code_projects` |
| `create_file` | `code_projects` |
| `update_file` | `code_projects` |
| `read_file` | `code_projects` |
| `read_document` | `manage_content` |
| `delete_file` | `code_projects` |
| `list_project_files` | `code_projects` |
| `update_project_deps` | `code_projects` |
| `import_github_repo` | `code_projects` |
| `get_project_logs` | `code_projects` |
| `restart_project` | `code_projects` |
| `fetch_project_url` | `code_projects` |
| `patch_file` | `code_projects` |
| `search_project_files` | `code_projects` |
| `list_project_directory` | `code_projects` |
| `get_project_errors` | `code_projects` |
| `define_object_type` | `custom_db` |
| `list_object_types` | `custom_db` |
| `get_object_type` | `custom_db` |
| `update_object_type` | `custom_db` |
| `create_object` | `custom_db` |
| `update_object` | `custom_db` |
| `list_objects` | `custom_db` |
| `get_object` | `custom_db` |
| `delete_object` | `custom_db` |
| `list_agent_skills` | `manage_agents` |
| `create_agent_skill` | `manage_agents` |
| `update_agent_skill` | `manage_agents` |
| `delete_agent_skill` | `manage_agents` |
| `create_agent_skill_resource` | `manage_agents` |
| `update_agent_skill_resource` | `manage_agents` |
| `delete_agent_skill_resource` | `manage_agents` |
| `copy_skill_resource` | `manage_agents` |
| `upload_skill_asset` | `manage_agents` |
| `save_document` | `manage_content` |
| `list_emails` | `manage_content` |
| `save_email` | `manage_content` |
| `get_email` | `manage_content` |
| `update_email` | `manage_content` |
| `delete_email` | `manage_content` |
| `create_pdf` | `manage_content` |
| `list_documents` | `manage_content` |
| `get_document` | `manage_content` |
| `update_document` | `manage_content` |
| `delete_document` | `manage_content` |
| `patch_state` | `communicate` |
| `check_meta_connection` | `use_integrations` |
| `check_integration_connection` | `use_integrations` |
| `list_meta_ad_accounts` | `use_integrations` |
| `list_meta_pages` | `use_integrations` |
| `publish_ad_to_meta` | `use_integrations` |
| `save_meta_defaults` | `use_integrations` |
| `get_meta_ad_status` | `use_integrations` |
| `get_meta_ads_insights` | `use_integrations` |
| `get_delivery_estimate` | `use_integrations` |
| `list_meta_audiences` | `use_integrations` |
| `create_meta_custom_audience` | `use_integrations` |
| `create_meta_lookalike_audience` | `use_integrations` |
| `list_meta_pixel_events` | `use_integrations` |
| `create_meta_pixel_event` | `use_integrations` |
| `get_capabilities` | `use_integrations` |
| `use_integration` | `use_integrations` |
| `get_integration` | `use_integrations` |
| `search_available_integrations` | `use_integrations` |
| `initiate_integration_connect` | `use_integrations` |
| `get_media_generation_status` | `generate_media` |
| `generate_image` | `generate_media` |
| `generate_video` | `generate_media` |
| `get_video_status` | `generate_media` |
| `analyze_video` | `generate_media` |
| `extract_url_transcript` | `generate_media` |
| `list_spaces` | `manage_tasks_missions` |
| `generate_visual_html` | `manage_tasks_missions` |
| `get_space` | `manage_tasks_missions` |
| `list_tasks` | `manage_tasks_missions` |
| `get_task` | `manage_tasks_missions` |
| `create_task` | `manage_tasks_missions` |
| `update_task` | `manage_tasks_missions` |
| `delete_task` | `manage_tasks_missions` |
| `add_task_comment` | `manage_tasks_missions` |
| `create_mission` | `manage_tasks_missions` |
| `list_missions` | `manage_tasks_missions` |
| `get_mission` | `manage_tasks_missions` |
| `get_mission_plan` | `manage_tasks_missions` |
| `get_mission_logs` | `manage_tasks_missions` |
| `get_mission_deliverables` | `manage_tasks_missions` |
| `update_mission` | `manage_tasks_missions` |
| `add_mission_comment` | `manage_tasks_missions` |
| `list_mission_subtasks` | `manage_tasks_missions` |
| `update_mission_subtask` | `manage_tasks_missions` |
| `retry_mission` | `manage_tasks_missions` |
| `trash_mission` | `manage_tasks_missions` |
| `create_agent` | `manage_agents` |
| `get_agent` | `manage_agents` |
| `update_agent` | `manage_agents` |
| `list_team` | `manage_agents` |
| `list_campaign_team` | `read_campaign` |
| `assign_agent_to_campaign` | `edit_campaign` |
| `unassign_agent_from_campaign` | `edit_campaign` |
| `save_memory` | `write_brain` |
| `search_memory` | `read_brain_personal` |
| `update_campaign_context` | `edit_campaign` |
| `create_awareness_point` | `edit_campaign` |
| `update_awareness` | `edit_campaign` |
| `create_social_post` | `manage_content` |
| `schedule_social_post` | `manage_content` |
| `update_social_post` | `manage_content` |
| `list_social_posts` | `manage_content` |
| `get_social_post` | `manage_content` |
| `delete_social_post` | `manage_content` |
| `publish_social_post` | `manage_content` |
| `create_blog_post` | `manage_content` |
| `update_blog_post` | `manage_content` |
| `list_blog_posts` | `manage_content` |
| `get_blog_post` | `manage_content` |
| `delete_blog_post` | `manage_content` |
| `get_social_post_template` | `manage_content` |
| `list_social_post_templates` | `manage_content` |
| `list_campaign_media` | `read_campaign` |
| `search_sk_entries` | `read_brain_campaign` |
| `search_campaign_knowledge` | `read_brain_campaign` |
| `get_brain_stats` | `read_brain_campaign` |
| `resolve_agent_sk_brain` | `read_brain_campaign` |
| `list_brain_scopes` | `read_brain_campaign` |
| `list_recent_memories` | `read_brain_campaign` |
| `list_brain_domains` | `read_brain_campaign` |
| `get_brain_gaps` | `read_brain_campaign` |
| `list_brain_imports` | `read_brain_campaign` |
| `trigger_crystallization` | `write_brain` |
| `ingest_brain_link` | `write_brain` |
| `ingest_brain_text` | `write_brain` |
| `ingest_user_document` | `write_brain` |
| `ingest_user_link` | `write_brain` |
| `ingest_sk_text` | `write_brain` |
| `ingest_sk_link` | `write_brain` |
| `ingest_campaign_file` | `write_brain` |
| `ingest_campaign_url` | `write_brain` |
| `ingest_fathom_meeting` | `write_brain` |
| `ingest_fireflies_transcript` | `write_brain` |
| `transfer_brain_node` | `write_brain` |
| `transfer_brain_by_source` | `write_brain` |
| `assign_memory_source` | `write_brain` |
| `delete_brain_node` | `write_brain` |
| `get_narrative_pages` | `read_brain_campaign` |
| `create_narrative_page` | `write_brain` |
| `patch_narrative_page` | `write_brain` |
| `update_narrative_page` | `write_brain` |
| `archive_narrative_page` | `write_brain` |
| `link_narrative_pages` | `write_brain` |
| `unlink_narrative_pages` | `write_brain` |
| `get_brain_log` | `read_brain_campaign` |
| `log_brain_event` | `write_brain` |
| `get_belief_patterns` | `edit_brain_models` |
| `create_belief_pattern` | `edit_brain_models` |
| `update_belief_pattern` | `edit_brain_models` |
| `archive_belief_pattern` | `edit_brain_models` |
| `merge_belief_patterns` | `edit_brain_models` |
| `connect_belief_to_memory` | `edit_brain_models` |
| `disconnect_belief_from_memory` | `edit_brain_models` |
| `get_perspectives` | `edit_brain_models` |
| `create_perspective` | `edit_brain_models` |
| `update_perspective` | `edit_brain_models` |
| `archive_perspective` | `edit_brain_models` |
| `connect_belief_to_perspective` | `edit_brain_models` |
| `disconnect_belief_from_perspective` | `edit_brain_models` |
| `get_brain_lint` | `edit_brain_models` |
| `run_brain_lint` | `edit_brain_models` |
| `resolve_brain_lint` | `edit_brain_models` |
| `create_strategy_node` | `edit_brain_models` |
| `list_strategy_nodes` | `edit_brain_models` |
| `bulk_create_ads` | `write_marketing_artifacts` |
| `generate_ad_copy` | `write_marketing_artifacts` |
| `get_daily_report_data` | `read_campaign` |
| `get_campaign_main_dashboard` | `read_campaign` |
| `get_campaign_social_analytics` | `read_campaign` |
| `get_campaign_stripe_overview` | `read_campaign` |
| `validate_project` | `code_projects` |
| `process_media` | `generate_media` |
| `list_mcp_servers` | `use_mcp` |
| `list_mcp_tools` | `use_mcp` |
| `use_mcp_tool` | `use_mcp` |
| `add_mcp_server` | `use_mcp` |
| `remove_mcp_server` | `use_mcp` |
| `list_mcp_resources` | `use_mcp` |
| `read_mcp_resource` | `use_mcp` |
| `send_user_message` | `communicate` |
| `ask_agent` | `communicate` |
| `delegate_to_agent` | `communicate` |
| `approve_agent_hire` | `manage_agents` |
| `brainstorm_agents` | `communicate` |
| `create_campaign` | `edit_campaign` |
| `update_campaign` | `edit_campaign` |
| `list_campaigns` | `read_campaign` |
| `get_campaign` | `read_campaign` |
| `save_member_note` | `communicate` |
| `get_member_notes` | `communicate` |
| `supabase_list_tables` | `custom_db` |
| `supabase_run_sql` | `custom_db` |
| `supabase_create_table` | `custom_db` |
| `supabase_insert_rows` | `custom_db` |
| `supabase_update_rows` | `custom_db` |
| `supabase_delete_rows` | `custom_db` |

## ROLE_TO_DOMAINS Defaults

These defaults are the proposed Phase 2 starting point. They preserve the product intent of the existing profiles, but they do not perfectly reproduce every current action-level edge because several proposed domains are intentionally coarser than today's hardcoded sets. The parity conflicts below must be resolved before implementing package tests.

| Current policy branch | Default domains |
|---|---|
| `vibey_ceo` | `read_campaign`, `edit_campaign`, `read_marketing_artifacts`, `write_marketing_artifacts`, `manage_content`, `manage_tasks_missions`, `custom_db`, `use_integrations`, `generate_media`, `read_brain_personal`, `read_brain_campaign`, `write_brain`, `edit_brain_models`, `manage_agents`, `communicate`, `use_mcp` |
| `system_hr` | `read_campaign`, `edit_campaign`, `manage_agents`, `communicate` |
| `system_brain` | `manage_content`, `manage_tasks_missions`, `use_integrations`, `generate_media`, `read_brain_personal`, `read_brain_campaign`, `write_brain`, `edit_brain_models`, `manage_agents`, `communicate`, `use_mcp` |
| `system_builder` | `read_campaign`, `read_marketing_artifacts`, `manage_content`, `manage_tasks_missions`, `code_projects`, `custom_db`, `use_integrations`, `generate_media`, `read_brain_personal`, `read_brain_campaign`, `write_brain`, `manage_agents`, `communicate`, `use_mcp` |
| `managed_domain:marketing:employee` | `read_campaign`, `read_marketing_artifacts`, `write_marketing_artifacts`, `manage_content`, `manage_tasks_missions`, `use_integrations`, `generate_media`, `read_brain_personal`, `read_brain_campaign`, `write_brain`, `manage_agents`, `communicate`, `use_mcp`, `custom_db` |
| `managed_domain:analyst:employee` | `read_campaign`, `read_marketing_artifacts`, `manage_content`, `manage_tasks_missions`, `use_integrations`, `generate_media`, `read_brain_personal`, `read_brain_campaign`, `write_brain`, `manage_agents`, `communicate`, `use_mcp`, `custom_db` |
| `managed_domain:developer:employee` | `read_campaign`, `read_marketing_artifacts`, `manage_content`, `manage_tasks_missions`, `code_projects`, `use_integrations`, `generate_media`, `read_brain_personal`, `read_brain_campaign`, `write_brain`, `manage_agents`, `communicate`, `use_mcp`, `custom_db` |
| `managed_domain:operations:employee` | `read_campaign`, `read_marketing_artifacts`, `manage_content`, `manage_tasks_missions`, `use_integrations`, `generate_media`, `read_brain_personal`, `read_brain_campaign`, `write_brain`, `edit_brain_models`, `manage_agents`, `communicate`, `use_mcp`, `custom_db` |
| `managed_domain:*:manager` | Employee domains plus domain-specific manager grants for delegation, brain ingest, object type definition/update, and current manager-only Meta/campaign operations. |
| `managed_domain:*:c_level` | Manager domains plus c-level campaign/team/strategy grants. |
| `managed_domain:*:system` | Same as c-level for managed-domain profiles. |

## Parity Conflicts To Resolve Before Phase 2

The proposed domain list is clear for users, but it is not yet granular enough to exactly encode the current hardcoded allowlists as simple domain unions.

| Conflict | Current behavior | Domain issue |
|---|---|---|
| `manage_content` mixes document/email with social/blog/publish actions. | Managed baseline agents get documents/emails, but not all social/blog publish/delete actions. | A single `manage_content` domain overgrants unless split into content-read/write subdomains or backed by presets with action-level exceptions. |
| `manage_tasks_missions` mixes task writes with mission management. | Managed baseline gets task read/write and mission read, while Vibey gets mission write/management. | Exact parity needs `manage_tasks` and `manage_missions`, or a mission write overlay. |
| `custom_db` mixes custom objects with Supabase admin actions. | Builder has `supabase_*`; many other profiles only have custom object CRUD. | Exact parity needs `custom_objects` and `supabase_admin`, or `supabase_*` must remain a special sensitive overlay. |
| `write_brain` mixes light memory writes with ingest/transfer/delete. | Many managed profiles can `save_memory`/`ingest_sk_*`, while Brain agents can ingest/transfer/delete broader brain data. | Exact parity needs `write_memory`, `ingest_brain`, and `admin_brain`, or destructive brain writes must be separately denied. |
| `use_integrations` mixes connection/discovery, toolkit use, Meta analytics, and Meta write/publish. | Profiles differ on `publish_ad_to_meta`, `save_meta_defaults`, Meta update actions, and analytics reads. | Exact parity needs integration read/write subdomains or the existing per-toolkit gate must also encode sub-action modes. |
| `manage_agents` mixes list skills with create/update/delete skills and HR agent CRUD. | Current `SKILL_ACTIONS` are allowed broadly in managed profiles, but team CRUD is HR-only. | Exact parity needs `read_agent_skills`, `write_agent_skills`, and `manage_team_agents`, or the skill-target overlay remains required. |

Recommended review decision: either approve these coarser domains as an intentional product simplification, or split the conflicting domains before writing Phase 2 tests. Do not implement package tests until this is decided, because the tests should encode the final domain contract.

## Two-Level Resolver Contract

Effective domains are resolved in this order:

```text
effective(agent) = roleDefaults(agent.role, agent.level)
                union teamGrants(agent.team_id)
                union agentOverrides.allow_extra(agent)
                minus agentOverrides.deny(agent)
```

Precedence:

1. `agent_deny`
2. `agent_allow_extra`
3. `team_grant`
4. `role_default`

Decision shape:

```ts
type PolicyDecision = {
  allowed: boolean
  reason: string
  sourceLevel: 'role_default' | 'team_grant' | 'agent_allow_extra' | 'agent_deny'
}
```

## Orthogonal Capabilities That Stay Outside `action_domain`

| Kind | Status |
|---|---|
| `integration:<slug>` | Keep. `use_integration` and provider-specific operations require both `action_domain:use_integrations` and the specific toolkit grant. |
| `brain_domain:<id>` | Keep. It scopes the knowledge bucket after a read/write brain action has already passed domain gating. |
| `mission_type:<id>` | Keep. It scopes mission category access after `manage_tasks_missions` passes. |
| `skill:<key>` | Keep. It enables/disables specific skills after agent/skill management gates pass. |
| `channel:<source>` | Keep in runtime as kill switch. UI may remain hidden at team level. |
| `brain_access:personal` | Deprecated alias for `action_domain:read_brain_personal` during migration. |
| `campaign_context:*` | Deprecated alias for `action_domain:read_campaign` during migration. |

## Presets

These presets are convenience UI outputs. They should write `agent_team_grants` rows with `capability_kind='action_domain'`.

| Preset | Domains |
|---|---|
| Read-only campaign | `read_campaign`, `read_marketing_artifacts`, `read_brain_campaign` |
| Marketing builder | `read_campaign`, `edit_campaign`, `read_marketing_artifacts`, `write_marketing_artifacts`, `manage_content`, `use_integrations`, `generate_media` |
| Support agent | `read_campaign`, `read_marketing_artifacts`, `manage_tasks_missions`, `communicate` |
| Brain operator | `read_brain_personal`, `read_brain_campaign`, `write_brain`, `edit_brain_models`, `manage_content` |
| Dev builder | `code_projects`, `custom_db`, `use_mcp`, `generate_media`, `manage_tasks_missions` |
| Management | `read_campaign`, `edit_campaign`, `manage_tasks_missions`, `manage_agents`, `communicate`, `use_integrations` |

## Black-Box Verification Matrix

| Scenario | DB setup | Action call | Expected |
|---|---|---|---|
| Team denies write | No `action_domain:write_marketing_artifacts` team grant | `create_funnel` or `create_offer` | Denied with policy reason |
| Team allows write | Add team grant `action_domain:write_marketing_artifacts` | `create_funnel` or `create_offer` | Allowed, artifact created in campaign |
| Agent deny overrides team allow | Team grant ON plus agent override `deny` | Same write action | Denied with `sourceLevel='agent_deny'` |
| Agent allow overrides team deny | Team grant OFF plus agent override `allow_extra` | Same write action | Allowed with `sourceLevel='agent_allow_extra'` |
| Team read denied | No `action_domain:read_campaign` | `get_campaign` or `search_campaign_knowledge` | Denied and hidden from `disabledNativeActions` |
| Inherit resets correctly | Remove agent override after previous deny/allow | Same action | Reverts to team behavior |
| Integration double gate | `use_integrations` ON but `integration:slack` OFF, or inverse | `use_integration` with Slack slug | Denied unless both gates are ON |

## Phase 2 Test Contract

Before implementation, write failing tests that assert:

- Every `VALID_ACTIONS` entry exists in `ACTION_TO_DOMAIN`.
- No `ACTION_TO_DOMAIN` key is outside `VALID_ACTIONS`.
- Every action maps to exactly one domain.
- `ROLE_TO_DOMAINS` defaults and any approved split/overlay reproduce the current role behavior characterized from `artifact-capability.policy.ts`.
- Team grant, agent allow, and agent deny precedence match the resolver contract.
- Preset outputs contain only valid domains.
- Integration execution requires both `action_domain:use_integrations` and the specific `integration:<slug>` capability.
- `disabledNativeActions` and runtime action enforcement are computed from the same decision engine.
