import { filterPromptModeActiveActions, isPromptModeActionOnHold } from '@vibey/agent-policy'

export type ArtifactCapabilityProfile =
  | 'vibey_ceo'
  | 'system_hr'
  | 'system_brain'
  | 'system_builder'
  | 'system_flows'
  | 'managed_domain'
export type ArtifactCapabilityDomain =
  | 'management'
  | 'marketing'
  | 'analyst'
  | 'developer'
  | 'operations'
  | 'support'
  | 'flows'
export type ArtifactAgentLevel = 'system' | 'c_level' | 'manager' | 'employee'

type LegacyCapabilityProfile = 'managed_c_level' | 'managed_manager' | 'managed_employee'

export type ArtifactAgentRecord = {
  agent_key: string
  role?: string | null
  level?: string | null
  config?: Record<string, unknown> | null
}

export type ArtifactCapabilityPolicy = {
  profile: ArtifactCapabilityProfile
  level: ArtifactAgentLevel
  domain: ArtifactCapabilityDomain
}

export const DELEGATION_READ_ACTIONS = new Set<string>(['ask_agent'])
export const DELEGATION_WRITE_ACTIONS = new Set<string>(['delegate_to_agent'])
export const DELEGATION_ADMIN_ACTIONS = new Set<string>(['approve_agent_hire'])
export const DELEGATION_BRAINSTORM_ACTIONS = new Set<string>(['brainstorm_agents'])

const TEAM_ACTIONS = new Set<string>(['create_agent', 'get_agent', 'update_agent', 'list_team'])
export const HR_AUDIT_ACTIONS = new Set<string>([
  'audit_team_agents_and_skills',
  'compare_team_skill_coverage',
  'summarize_agent_capabilities',
])

const SKILL_ACTIONS = new Set<string>([
  'list_agent_skills',
  'create_agent_skill',
  'update_agent_skill',
  'delete_agent_skill',
  'create_agent_skill_resource',
  'update_agent_skill_resource',
  'delete_agent_skill_resource',
  'copy_skill_resource',
  'upload_skill_asset',
])

const PROJECT_ACTIONS = new Set<string>([
  'create_project',
  'get_project',
  'list_projects',
  'create_file',
  'update_file',
  'read_file',
  'delete_file',
  'list_project_files',
  'update_project_deps',
  'import_github_repo',
  'get_project_logs',
  'restart_project',
  'fetch_project_url',
  'patch_file',
  'search_project_files',
  'list_project_directory',
  'get_project_errors',
  'validate_project',
])

function toActiveActionSet(actions: Iterable<string>): Set<string> {
  return new Set(filterPromptModeActiveActions(actions))
}

const MISSION_READ_ACTIONS = new Set<string>([
  'list_missions',
  'get_mission',
  'get_mission_deliverables',
  'compile_webinar_launch_bible',
])

const MISSION_MANAGEMENT_ACTIONS = new Set<string>([
  'create_mission',
  'list_missions',
  'get_mission',
  'get_mission_plan',
  'get_mission_logs',
  'get_mission_deliverables',
  'update_mission',
  'add_mission_comment',
  'list_mission_subtasks',
  'update_mission_subtask',
  'retry_mission',
  'trash_mission',
])

const MISSION_MANAGER_ACTIONS = new Set<string>([
  'answer_mission_question',
  'summarize_mission_state',
  'attach_mission_context',
  'show_mission_deliverable',
  'create_mission_subtask',
  'edit_mission_subtask',
  'cancel_mission_subtask',
  'retry_mission_subtask',
  'reassign_mission_subtask',
  'prepare_mission_replan',
  'approve_mission',
])

export const SKILL_WRITE_ACTIONS = new Set<string>([
  'create_agent_skill',
  'update_agent_skill',
  'delete_agent_skill',
  'create_agent_skill_resource',
  'update_agent_skill_resource',
  'delete_agent_skill_resource',
  'copy_skill_resource',
  'upload_skill_asset',
])

// ── Capability Categories ──────────────────────────────────────────────────

const CAT_DOCUMENTS = new Set<string>([
  'save_document',
  'list_emails',
  'save_email',
  'get_email',
  'update_email',
  'delete_email',
  'create_pdf',
  'create_docx',
  'list_documents',
  'get_document',
  'read_space_document',
  'update_document',
])

const CAT_MEMORY = new Set<string>([
  'save_user_memory',
  'search_user_brain',
  'search_brain_context',
  'resolve_agent_brain',
  'search_agent_brain',
])

const CAT_INTEGRATIONS = new Set<string>([
  'get_integration',
  'search_available_integrations',
  'initiate_integration_connect',
  'check_integration_connection',
  'get_capabilities',
  'use_integration',
  'list_calendar_events',
  'create_calendar_event',
  'update_calendar_event',
  'delete_calendar_event',
])

const CAT_COMMUNICATION = new Set<string>([
  'describe_action',
  'send_user_message',
  'save_member_note',
  'get_member_notes',
  'discover_channel_context',
  'set_channel_context',
])

const CAT_MCP_READ = new Set<string>([
  'list_mcp_servers',
  'list_mcp_tools',
  'use_mcp_tool',
  'list_mcp_resources',
  'read_mcp_resource',
])

const CAT_STATE = new Set<string>(['patch_state'])

const CAT_CHAT_PLANS = new Set<string>(['create_chat_plan', 'update_chat_plan'])

const CAT_SKILLS_BASELINE = new Set<string>([
  'list_agent_skills',
  'create_agent_skill',
  'update_agent_skill',
  'delete_agent_skill',
])

const CAT_MEDIA_CONSUMER = new Set<string>([
  'analyze_image',
  'analyze_video',
  'transcribe_audio',
  'extract_url_transcript',
  'read_document',
  'get_media_generation_status',
  'get_video_status',
  'process_media',
])

const CAT_MEDIA_CREATOR = new Set<string>([
  'generate_image',
  'edit_image',
  'generate_ad_set',
  'generate_video',
])

const CAT_BRAIN_READ = new Set<string>([
  'get_brain_stats',
  'list_available_brain_scopes',
  'list_user_brain_memories',
  'list_agent_brain_domains',
  'search_customer_brain',
  'search_campaign_brain',
  'list_customer_brain_memories',
  'list_customer_avatars',
])

const CAT_BRAIN_CORTEX_READ = new Set<string>([
  'get_brain_pages',
  'get_brain_belief_patterns',
  'get_brain_perspectives',
  'get_company_brain_objects',
  'get_company_brain_object_edges',
  'search_company_brain',
])

const CAT_SPACE_RETRIEVAL = new Set<string>(['search_space_context'])

const CAT_CONTACTS_READ = new Set<string>([
  'list_contacts',
  'get_contact',
  'get_contact_activity',
  'list_contact_communications',
])

const CAT_CONTACTS_WRITE = new Set<string>([
  'create_contact',
  'update_contact',
  'add_contact_note',
  'update_contact_note',
])

const CAT_TASKS_READ = new Set<string>([
  'list_spaces',
  'get_space',
  'list_space_views',
  'get_space_view',
  'list_space_view_items',
  'list_tasks',
  'get_task',
])

const CAT_TASKS_WRITE = new Set<string>([
  'generate_visual_html',
  'create_space_field',
  'update_space_field',
  'append_space_field_option',
  'create_space_status',
  'create_space_category',
  'create_space_tag',
  'create_space_view',
  'update_space_view',
  'create_task',
  'update_task',
  'delete_task',
  'add_task_comment',
])

export const FLOW_ALLOWED_ACTIONS = new Set<string>([
  'search_flow_capabilities',
  'get_flow_capability',
  'list_flows',
  'get_flow',
  'create_flow_draft',
  'update_flow_draft',
  'validate_flow_draft',
  'publish_flow',
  'get_flow_build_context',
  'create_flow_clarification',
  'create_flow_plan',
  'update_flow_plan',
  'answer_flow_clarification',
  'validate_flow_plan',
  'compile_flow_plan',
  'list_flow_blueprints',
  'get_flow_blueprint',
  'create_flow_blueprint_draft',
  'validate_flow_blueprint',
  'activate_flow_blueprint',
  'evaluate_flow_plan',
  'list_spaces',
  'get_space',
  'list_space_views',
  'get_space_view',
  'list_space_view_items',
  'search_space_context',
  'list_tasks',
  'get_task',
  'create_space_field',
  'update_space_field',
  'append_space_field_option',
  'create_space_status',
  'create_space_category',
  'create_space_tag',
  'create_space_view',
  'update_space_view',
  'create_task',
  'update_task',
  'get_integration',
  'search_available_integrations',
  'check_integration_connection',
  'list_mcp_servers',
  'list_mcp_tools',
  'use_mcp_tool',
  'list_mcp_resources',
  'read_mcp_resource',
  'send_user_message',
  'ask_agent',
  'delegate_to_agent',
  'describe_action',
  'patch_state',
])

// ── Composed Baselines ─────────────────────────────────────────────────────

const MANAGED_BASELINE_ACTIONS = new Set<string>([
  ...MISSION_READ_ACTIONS,
  ...DELEGATION_READ_ACTIONS,
  ...CAT_DOCUMENTS,
  ...CAT_MEMORY,
  ...CAT_INTEGRATIONS,
  ...CAT_COMMUNICATION,
  ...CAT_MCP_READ,
  ...CAT_STATE,
  ...CAT_SKILLS_BASELINE,
  ...CAT_MEDIA_CONSUMER,
  ...CAT_CHAT_PLANS,
  ...CAT_BRAIN_READ,
  ...CAT_BRAIN_CORTEX_READ,
  ...CAT_SPACE_RETRIEVAL,
  ...CAT_CONTACTS_READ,
  ...CAT_CONTACTS_WRITE,
  ...CAT_TASKS_READ,
  ...CAT_TASKS_WRITE,
  'list_campaigns',
  'get_campaign',
])

const MARKETING_EMPLOYEE_ACTIONS = new Set<string>([
  ...MANAGED_BASELINE_ACTIONS,
  ...MISSION_READ_ACTIONS,
  'create_offer',
  'update_offer_step',
  'get_offer',
  'list_offers',
  'list_custom_fields',
  'create_ad',
  'update_ad',
  'patch_ad',
  'list_ads',
  'get_ad',
  'create_ad_campaign',
  'create_ad_set',
  'get_ad_campaign',
  'get_ad_set',
  'update_ad_campaign',
  'update_ad_set',
  'create_funnel',
  'add_funnel_page',
  'update_funnel_page',
  'set_website_layout',
  'get_funnel',
  'list_funnels',
  'list_forms',
  'get_form',
  'create_form',
  'update_form',
  'attach_form_asset',
  'publish_form',
  'unpublish_form',
  'list_form_responses',
  'list_funnel_files',
  'read_funnel_file',
  'write_funnel_file',
  'patch_funnel_file',
  'delete_funnel_file',
  'list_funnel_assets',
  'attach_funnel_asset',
  'detach_funnel_asset',
  'apply_funnel_element_edit',
  'add_funnel_anchor',
  'extract_funnel_tweaks',
  'update_funnel_tweaks',
  'create_website',
  'add_website_page',
  'update_website_page',
  'get_website',
  'list_websites',
  'create_presentation',
  'update_presentation',
  'patch_presentation',
  'update_presentation_slide',
  'add_presentation_slide',
  'list_presentation_files',
  'read_presentation_file',
  'write_presentation_file',
  'patch_presentation_file',
  'delete_presentation_file',
  'show_presentation_file',
  'list_presentation_assets',
  'attach_presentation_asset',
  'detach_presentation_asset',
  'get_presentation',
  'list_presentations',
  'create_sequence',
  'add_sequence_email',
  'get_sequence',
  'get_sequence_email',
  'update_sequence',
  'update_sequence_email',
  'list_sequences',
  'prepare_email_send',
  'prepare_sequence_send',
  'create_avatar',
  'get_avatar',
  'update_avatar',
  'list_avatars',
  'create_theme',
  'get_theme',
  'update_theme',
  'extract_website_theme',
  'list_themes',
  'get_media_generation_status',
  'generate_image',
  'generate_video',
  'get_video_status',
  'analyze_image',
  'analyze_video',
  'transcribe_audio',
  'extract_url_transcript',
  'process_media',
  'check_meta_connection',
  'list_meta_ad_accounts',
  'list_meta_pages',
  'get_meta_ad_status',
  'get_meta_ads_insights',
  'get_delivery_estimate',
  'list_meta_audiences',
  'create_meta_custom_audience',
  'create_meta_lookalike_audience',
  'list_meta_pixel_events',
  'create_meta_pixel_event',
  'get_capabilities',
  'use_integration',
  'create_social_post',
  'get_social_post',
  'schedule_social_post',
  'update_social_post',
  'list_social_posts',
  'publish_social_post',
  'create_blog_post',
  'update_blog_post',
  'list_blog_posts',
  'get_blog_post',
  'get_social_post_template',
  'list_social_post_templates',
  'list_campaign_media',
  'bulk_create_ads',
  'generate_ad_copy',
  'get_daily_report_data',
  'get_campaign_main_dashboard',
  'get_campaign_social_analytics',
  'get_campaign_stripe_overview',
])

const ANALYST_EMPLOYEE_ACTIONS = new Set<string>([
  ...MANAGED_BASELINE_ACTIONS,
  ...MISSION_READ_ACTIONS,
  'list_offers',
  'get_offer',
  'list_funnels',
  'get_funnel',
  'list_forms',
  'get_form',
  'list_form_responses',
  'list_funnel_files',
  'read_funnel_file',
  'list_funnel_assets',
  'list_websites',
  'get_website',
  'list_presentations',
  'get_presentation',
  'list_presentation_files',
  'read_presentation_file',
  'show_presentation_file',
  'list_presentation_assets',
  'list_sequences',
  'get_sequence',
  'get_sequence_email',
  'list_avatars',
  'get_avatar',
  'list_themes',
  'get_theme',
  'check_meta_connection',
  'list_meta_ad_accounts',
  'list_meta_pages',
  'get_meta_ad_status',
  'get_meta_ads_insights',
  'get_delivery_estimate',
  'list_meta_audiences',
  'list_meta_pixel_events',
  'get_capabilities',
  'use_integration',
  'get_daily_report_data',
  'get_campaign_main_dashboard',
  'get_campaign_social_analytics',
  'get_campaign_stripe_overview',
])

const DEVELOPER_EMPLOYEE_ACTIONS = new Set<string>([
  ...MANAGED_BASELINE_ACTIONS,
  ...MISSION_READ_ACTIONS,
  'get_capabilities',
  'use_integration',
])

const OPS_EMPLOYEE_ACTIONS = new Set<string>([
  ...MANAGED_BASELINE_ACTIONS,
  ...MISSION_READ_ACTIONS,
  'list_offers',
  'get_offer',
  'list_funnels',
  'get_funnel',
  'list_forms',
  'get_form',
  'list_form_responses',
  'list_funnel_files',
  'read_funnel_file',
  'list_funnel_assets',
  'list_websites',
  'get_website',
  'list_presentations',
  'get_presentation',
  'list_presentation_files',
  'read_presentation_file',
  'show_presentation_file',
  'list_presentation_assets',
  'list_sequences',
  'get_sequence',
  'get_sequence_email',
  'list_avatars',
  'get_avatar',
  'list_themes',
  'get_theme',
  'list_campaigns',
  'get_campaign',
  'list_campaign_media',
  'list_campaign_team',
  'list_strategy_nodes',
  'delegate_to_agent',
  'check_meta_connection',
  'list_meta_ad_accounts',
  'list_meta_pages',
  'get_meta_ad_status',
  'get_meta_ads_insights',
  'get_delivery_estimate',
  'list_meta_audiences',
  'list_meta_pixel_events',
  'get_capabilities',
  'use_integration',
  'get_daily_report_data',
  'get_campaign_main_dashboard',
  'get_campaign_social_analytics',
  'get_campaign_stripe_overview',
])

const C_LEVEL_EXTRAS = new Set<string>([
  'list_campaigns',
  'get_campaign',
  'list_campaign_media',
  'list_strategy_nodes',
])

export const CEO_ONLY_ACTIONS = new Set<string>(['update_campaign_context'])

export const VIBEY_ALLOWED_ACTIONS = new Set<string>([
  ...MARKETING_EMPLOYEE_ACTIONS,
  ...MISSION_MANAGEMENT_ACTIONS,
  ...MISSION_MANAGER_ACTIONS,
  ...CAT_SPACE_RETRIEVAL,
  ...CAT_CONTACTS_READ,
  ...CAT_CONTACTS_WRITE,
  ...CAT_TASKS_READ,
  ...CAT_TASKS_WRITE,
  'list_mcp_servers',
  'list_mcp_tools',
  'use_mcp_tool',
  'add_mcp_server',
  'remove_mcp_server',
  'list_mcp_resources',
  'read_mcp_resource',
  'analyze_image',
  'process_media',
  'delete_offer',
  'list_ads',
  'get_ad',
  'delete_ad',
  'get_ad_campaign',
  'get_ad_set',
  'delete_funnel',
  'delete_website',
  'write_funnel_file',
  'patch_funnel_file',
  'delete_funnel_file',
  'attach_funnel_asset',
  'detach_funnel_asset',
  'get_presentation',
  'delete_presentation',
  'patch_presentation',
  'write_presentation_file',
  'patch_presentation_file',
  'delete_presentation_file',
  'attach_presentation_asset',
  'detach_presentation_asset',
  'update_presentation_slide',
  'add_presentation_slide',
  'get_sequence',
  'get_sequence_email',
  'update_sequence',
  'update_sequence_email',
  'delete_sequence',
  'delete_sequence_email',
  'delete_avatar',
  'get_theme',
  'update_theme',
  'delete_theme',
  'get_document',
  'read_space_document',
  'update_document',
  'delete_document',
  'list_emails',
  'get_email',
  'update_email',
  'delete_email',
  'get_social_post',
  'delete_social_post',
  'delete_blog_post',
  'get_daily_report_data',
  'get_campaign_main_dashboard',
  'get_campaign_social_analytics',
  'get_campaign_stripe_overview',
  'get_integration',
  'search_available_integrations',
  'initiate_integration_connect',
  'publish_ad_to_meta',
  'update_ad_campaign',
  'update_ad_set',
  'save_meta_defaults',
  'get_meta_ads_insights',
  'publish_social_post',
  'schedule_social_post',
  'create_blog_post',
  'update_blog_post',
  'list_blog_posts',
  'get_blog_post',
  'get_social_post_template',
  'list_social_post_templates',
  'define_object_type',
  'update_object_type',
  'list_campaign_media',
  'transfer_brain_by_source',
  'assign_user_memory_source',
  'ask_agent',
  'delegate_to_agent',
  'approve_agent_hire',
  'brainstorm_agents',
  'create_campaign',
  'update_campaign',
  'list_campaigns',
  'get_campaign',
  'list_strategy_nodes',
  'list_campaign_team',
  'assign_agent_to_campaign',
  'unassign_agent_from_campaign',
  'update_campaign_context',
  'create_awareness_point',
  'update_awareness',
])

export const HR_ALLOWED_ACTIONS = new Set<string>([
  'create_agent',
  'get_agent',
  'update_agent',
  'list_team',
  'list_campaign_team',
  'assign_agent_to_campaign',
  'unassign_agent_from_campaign',
  ...HR_AUDIT_ACTIONS,
  ...SKILL_ACTIONS,
  'ask_agent',
  'delegate_to_agent',
  'approve_agent_hire',
])

export const BRAIN_SCHOLAR_ALLOWED_ACTIONS = new Set<string>([
  ...CAT_TASKS_READ,
  'list_mcp_servers',
  'list_mcp_tools',
  'use_mcp_tool',
  'list_mcp_resources',
  'read_mcp_resource',
  'save_document',
  'create_pdf',
  'create_docx',
  'list_documents',
  'get_document',
  'read_space_document',
  'update_document',
  'compile_webinar_launch_bible',
  'search_user_brain',
  'search_brain_context',
  'save_user_memory',
  'search_agent_brain',
  'search_campaign_brain',
  'get_brain_stats',
  'resolve_agent_brain',
  'list_available_brain_scopes',
  'list_user_brain_memories',
  'list_agent_brain_domains',
  'get_agent_brain_gaps',
  'list_agent_brain_imports',
  'crystallize_user_brain',
  'ingest_user_brain_link',
  'ingest_user_brain_text',
  'ingest_user_brain_document',
  'ingest_agent_brain_text',
  'ingest_agent_brain_link',
  'ingest_fathom_meeting',
  'ingest_fireflies_transcript',
  'transfer_brain_node',
  'transfer_brain_by_source',
  'assign_user_memory_source',
  'delete_brain_node',
  'save_customer_memory',
  'search_customer_brain',
  'ingest_customer_brain_text',
  'ingest_customer_brain_link',
  'list_customer_brain_memories',
  'list_customer_avatars',
  'get_brain_pages',
  'get_brain_timelines',
  'get_brain_timeline_items',
  'create_brain_timeline',
  'upsert_brain_timeline_items',
  'archive_brain_timeline',
  'create_brain_page',
  'patch_brain_page',
  'update_brain_page',
  'archive_brain_page',
  'link_brain_pages',
  'unlink_brain_pages',
  'get_brain_log',
  'log_brain_event',
  'get_brain_belief_patterns',
  'create_brain_belief_pattern',
  'update_brain_belief_pattern',
  'archive_brain_belief_pattern',
  'merge_brain_belief_patterns',
  'connect_brain_belief_to_memory',
  'disconnect_brain_belief_from_memory',
  'get_brain_perspectives',
  'create_brain_perspective',
  'update_brain_perspective',
  'archive_brain_perspective',
  'connect_brain_belief_to_perspective',
  'disconnect_brain_belief_from_perspective',
  'get_brain_lint',
  'run_brain_lint',
  'resolve_brain_lint',
  'get_company_brain_objects',
  'get_company_brain_object_edges',
  'search_company_brain',
  'propose_company_brain_signal',
  'create_company_brain_object',
  'update_company_brain_object',
  'archive_company_brain_object',
  'create_company_brain_edge',
  'delete_company_brain_edge',
  'list_agent_skills',
  'get_integration',
  'search_available_integrations',
  'check_integration_connection',
  'initiate_integration_connect',
  'use_integration',
  'get_capabilities',
  'extract_url_transcript',
  'ask_agent',
  'delegate_to_agent',
])

export const BUILDER_ALLOWED_ACTIONS = new Set<string>([
  ...CAT_TASKS_READ,
  ...CAT_TASKS_WRITE,
  'save_document',
  'create_pdf',
  'create_docx',
  'list_documents',
  'get_document',
  'read_space_document',
  'update_document',
  'generate_image',
  'get_media_generation_status',
  'analyze_image',
  'process_media',
  'transcribe_audio',
  'extract_url_transcript',
  'list_mcp_servers',
  'list_mcp_tools',
  'use_mcp_tool',
  'list_mcp_resources',
  'read_mcp_resource',
  'get_capabilities',
  'use_integration',
  'get_integration',
  'search_available_integrations',
  'initiate_integration_connect',
  'check_integration_connection',
  'save_user_memory',
  'search_user_brain',
  'search_brain_context',
  'search_agent_brain',
  'search_campaign_brain',
  'resolve_agent_brain',
  'ingest_agent_brain_text',
  'ingest_agent_brain_link',
  'list_agent_skills',
  'list_campaigns',
  'get_campaign',
  'list_campaign_media',
  'list_object_types',
  'get_object_type',
  'create_object',
  'update_object',
  'list_objects',
  'get_object',
  'delete_object',
  'ask_agent',
  'delegate_to_agent',
  'brainstorm_agents',
  'send_user_message',
  'save_member_note',
  'get_member_notes',
  'patch_state',
  'list_missions',
  'get_mission',
  'get_mission_deliverables',
  'create_chat_plan',
  'update_chat_plan',
  'list_offers',
  'get_offer',
  'list_themes',
  'get_theme',
  'list_avatars',
  'get_avatar',
])

export function normalizeAgentLevel(level: unknown): ArtifactAgentLevel | null {
  if (level === 'system' || level === 'c_level' || level === 'manager' || level === 'employee') {
    return level
  }
  return null
}

export function normalizeCapabilityDomain(value: unknown): ArtifactCapabilityDomain | null {
  if (value === 'shared') return 'operations'
  if (
    value === 'management' ||
    value === 'marketing' ||
    value === 'analyst' ||
    value === 'developer' ||
    value === 'operations' ||
    value === 'support' ||
    value === 'flows'
  ) {
    return value
  }
  return null
}

function normalizeCapabilityProfile(
  value: unknown,
): ArtifactCapabilityProfile | LegacyCapabilityProfile | null {
  if (
    value === 'vibey_ceo' ||
    value === 'system_hr' ||
    value === 'system_brain' ||
    value === 'system_builder' ||
    value === 'system_flows' ||
    value === 'managed_domain' ||
    value === 'managed_c_level' ||
    value === 'managed_manager' ||
    value === 'managed_employee'
  ) {
    return value
  }
  return null
}

function mapLegacyProfileToDomain(profile: LegacyCapabilityProfile): ArtifactCapabilityDomain {
  if (profile === 'managed_employee') return 'operations'
  return 'marketing'
}

export function inferCapabilityDomain(
  agentKey: string,
  role?: string | null,
): ArtifactCapabilityDomain | null {
  const key = (agentKey || '').toLowerCase()
  const roleText = (role || '').toLowerCase()

  if (
    ['copywriter', 'designer', 'media_producer', 'brand_manager'].includes(key) ||
    /(copywriter|designer|creative|brand|media|marketing|social)/.test(roleText)
  ) {
    return 'marketing'
  }

  if (['analyst', 'cfo'].includes(key) || /(analyst|finance|data|performance)/.test(roleText)) {
    return 'analyst'
  }

  if (
    ['developer', 'automation_integrations_engineer', 'qa_engineer', 'pm_product'].includes(key) ||
    /(developer|engineer|automation|integrations|qa|reliability|full-stack|full stack)/.test(
      roleText,
    )
  ) {
    return 'developer'
  }

  if (
    ['customer_support', 'customer_success', 'customer_coach'].includes(key) ||
    /(customer.?success|customer.?support|support.?agent|coach|mentor|client|help.?desk)/.test(
      roleText,
    )
  ) {
    return 'support'
  }

  if (
    ['pm_operations', 'product_manager'].includes(key) ||
    /(operations|project.?manag|coordinator|program.?manag)/.test(roleText)
  ) {
    return 'operations'
  }

  return null
}

export function isSystemBuilderKey(agentKey: string): boolean {
  return (
    agentKey === 'viktor' ||
    agentKey === 'widget_builder' ||
    agentKey.startsWith('viktor_') ||
    agentKey.startsWith('widget_builder_')
  )
}

export function inferCapabilityProfile(
  agentKey: string,
  level: ArtifactAgentLevel | null,
): ArtifactCapabilityProfile | null {
  if (agentKey === 'vibey') return 'vibey_ceo'
  if (agentKey === 'hr') return 'system_hr'
  if (agentKey === 'brain_scholar' || agentKey === 'atlas') return 'system_brain'
  if (agentKey === 'loop') return 'system_flows'
  if (isSystemBuilderKey(agentKey)) return 'system_builder'
  if (level === 'system') return 'managed_domain'
  if (level === 'employee' || level === 'manager' || level === 'c_level') return 'managed_domain'
  return null
}

function resolvePromotedVibeyAllowlist(): Set<string> {
  const allow = new Set<string>(VIBEY_ALLOWED_ACTIONS)
  allow.add('list_team')
  for (const action of PROJECT_ACTIONS) allow.delete(action)
  return toActiveActionSet(allow)
}

export function resolveManagedActionAllowlist(
  domain: ArtifactCapabilityDomain,
  level: ArtifactAgentLevel,
): Set<string> {
  if (domain === 'management') {
    return new Set<string>()
  }
  const set = new Set<string>(MANAGED_BASELINE_ACTIONS)

  if (domain === 'marketing') {
    for (const a of MARKETING_EMPLOYEE_ACTIONS) set.add(a)
    set.add('list_campaign_team')
    if (level === 'manager' || level === 'c_level' || level === 'system') {
      set.add('publish_ad_to_meta')
      set.add('save_meta_defaults')
    }
  }
  if (domain === 'analyst') {
    for (const a of ANALYST_EMPLOYEE_ACTIONS) set.add(a)
    set.add('list_campaign_team')
  }
  if (domain === 'developer') {
    for (const a of DEVELOPER_EMPLOYEE_ACTIONS) set.add(a)
    set.add('list_campaign_team')
  }
  if (domain === 'operations') {
    for (const a of OPS_EMPLOYEE_ACTIONS) set.add(a)
  }

  if (level === 'manager' || level === 'c_level' || level === 'system') {
    set.add('define_object_type')
    set.add('update_object_type')
    for (const a of DELEGATION_WRITE_ACTIONS) set.add(a)
    for (const a of DELEGATION_BRAINSTORM_ACTIONS) set.add(a)
  }

  if (
    domain === 'operations' &&
    (level === 'manager' || level === 'c_level' || level === 'system')
  ) {
    set.add('update_campaign')
    set.add('update_sequence')
    set.add('prepare_email_send')
    set.add('prepare_sequence_send')
    set.add('create_awareness_point')
    set.add('update_awareness')
    set.add('get_media_generation_status')
    set.add('analyze_image')
    set.add('analyze_video')
    set.add('transcribe_audio')
    set.add('extract_url_transcript')
    set.add('process_media')
    set.add('list_ads')
    set.add('get_ad')
    set.add('get_ad_campaign')
    set.add('get_ad_set')
    set.add('list_custom_fields')
    set.add('get_social_post')
    set.add('publish_social_post')
    set.add('add_mcp_server')
    set.add('remove_mcp_server')
  }

  if (level === 'c_level' || level === 'system') {
    for (const a of C_LEVEL_EXTRAS) set.add(a)
    if (domain === 'marketing' || domain === 'developer') {
      set.add('add_mcp_server')
      set.add('remove_mcp_server')
    }
    if (domain === 'operations') {
      set.add('create_campaign')
      set.add('update_campaign_context')
    }
  }

  return toActiveActionSet(set)
}

export function resolvePolicyActionAllowlist(policy: ArtifactCapabilityPolicy): Set<string> {
  if (policy.profile === 'system_hr') {
    return toActiveActionSet(HR_ALLOWED_ACTIONS)
  }

  if (policy.profile === 'system_brain') {
    return toActiveActionSet(BRAIN_SCHOLAR_ALLOWED_ACTIONS)
  }

  if (policy.profile === 'system_builder') {
    return toActiveActionSet(BUILDER_ALLOWED_ACTIONS)
  }

  if (policy.profile === 'system_flows') {
    return toActiveActionSet(FLOW_ALLOWED_ACTIONS)
  }

  if (policy.profile === 'vibey_ceo') {
    return resolvePromotedVibeyAllowlist()
  }

  const managedAllow = resolveManagedActionAllowlist(policy.domain, policy.level)
  for (const skillAction of SKILL_ACTIONS) {
    managedAllow.add(skillAction)
  }
  return toActiveActionSet(managedAllow)
}

export function resolveCapabilityPolicy(
  agent: ArtifactAgentRecord,
): ArtifactCapabilityPolicy | null {
  const level = normalizeAgentLevel(agent.level)
  if (!level) return null

  const explicitProfile = normalizeCapabilityProfile(agent.config?.capability_profile)
  let profile: ArtifactCapabilityProfile | null = null
  let explicitDomain: ArtifactCapabilityDomain | null = normalizeCapabilityDomain(
    agent.config?.capability_domain,
  )

  if (
    explicitProfile === 'vibey_ceo' ||
    explicitProfile === 'system_hr' ||
    explicitProfile === 'system_brain' ||
    explicitProfile === 'system_builder' ||
    explicitProfile === 'system_flows' ||
    explicitProfile === 'managed_domain'
  ) {
    profile = explicitProfile
  } else if (
    explicitProfile === 'managed_c_level' ||
    explicitProfile === 'managed_manager' ||
    explicitProfile === 'managed_employee'
  ) {
    profile = 'managed_domain'
    if (!explicitDomain) explicitDomain = mapLegacyProfileToDomain(explicitProfile)
  } else {
    profile = inferCapabilityProfile(agent.agent_key, level)
  }

  if (!profile) return null
  if (profile === 'vibey_ceo') return { profile, level, domain: 'management' }
  if (profile === 'system_hr') return { profile, level, domain: 'management' }
  if (profile === 'system_brain') return { profile, level, domain: 'management' }
  if (profile === 'system_builder') return { profile, level, domain: 'developer' }
  if (profile === 'system_flows') return { profile, level, domain: 'flows' }

  const domain = explicitDomain || inferCapabilityDomain(agent.agent_key, agent.role)
  if (!domain) return null
  return { profile, level, domain }
}

function resolveActionRecoveryHint(action: string): string {
  if (isPromptModeActionOnHold(action)) return ''

  const canUse: string[] = []
  if (HR_ALLOWED_ACTIONS.has(action)) canUse.push('HR agent')
  if (BRAIN_SCHOLAR_ALLOWED_ACTIONS.has(action)) canUse.push('Brain/Atlas agent')
  if (BUILDER_ALLOWED_ACTIONS.has(action)) canUse.push('Builder agent (developer domain)')
  if (FLOW_ALLOWED_ACTIONS.has(action)) canUse.push('Loop flows agent')
  const domains: ArtifactCapabilityDomain[] = ['marketing', 'analyst', 'developer', 'operations']
  for (const d of domains) {
    const allowed = resolveManagedActionAllowlist(d, 'employee')
    if (allowed.has(action)) canUse.push(`${d} domain agents`)
  }
  if (canUse.length === 0) return ''
  return ` Available to: ${[...new Set(canUse)].join(', ')}. Use ask_agent or delegate_to_agent to reach a teammate who can help.`
}

export function isArtifactActionAllowed(
  policy: ArtifactCapabilityPolicy,
  action: string,
): { allowed: boolean; reason?: string } {
  if (isPromptModeActionOnHold(action)) {
    return {
      allowed: false,
      reason: `Action "${action}" is on hold and is not available for PromptMode agents.`,
    }
  }

  if (policy.profile === 'system_hr') {
    if (!HR_ALLOWED_ACTIONS.has(action)) {
      const hint = resolveActionRecoveryHint(action)
      return { allowed: false, reason: `Action "${action}" is not available for HR agents.${hint}` }
    }
    return { allowed: true }
  }

  if (HR_AUDIT_ACTIONS.has(action)) {
    return { allowed: false, reason: 'Action is not available for this agent.' }
  }

  if (policy.profile === 'system_brain') {
    if (!BRAIN_SCHOLAR_ALLOWED_ACTIONS.has(action)) {
      const hint = resolveActionRecoveryHint(action)
      return {
        allowed: false,
        reason: `Action "${action}" is not available for Brain agents.${hint}`,
      }
    }
    return { allowed: true }
  }

  if (policy.profile === 'system_builder') {
    if (!BUILDER_ALLOWED_ACTIONS.has(action)) {
      const hint = resolveActionRecoveryHint(action)
      return {
        allowed: false,
        reason: `Action "${action}" is not available for Builder agents.${hint}`,
      }
    }
    return { allowed: true }
  }

  if (policy.profile === 'system_flows') {
    if (!FLOW_ALLOWED_ACTIONS.has(action)) {
      const hint = resolveActionRecoveryHint(action)
      return {
        allowed: false,
        reason: `Action "${action}" is not available for Flows agents.${hint}`,
      }
    }
    return { allowed: true }
  }

  if (policy.profile === 'vibey_ceo') {
    const promotedAllow = resolvePromotedVibeyAllowlist()
    if (!promotedAllow.has(action)) {
      const hint = resolveActionRecoveryHint(action)
      return {
        allowed: false,
        reason: `Action "${action}" is not available for Vibey CEO.${hint}`,
      }
    }
    return { allowed: true }
  }

  if (TEAM_ACTIONS.has(action)) {
    return {
      allowed: false,
      reason: `Action "${action}" is restricted to the HR agent. Use ask_agent to reach the HR agent for team management tasks.`,
    }
  }

  if (action === 'create_mission') {
    return {
      allowed: false,
      reason:
        'Action "create_mission" is not available directly because mission creation is owned by Vibey. Use delegate_to_agent with target_agent_key "vibey" and include the complete create_mission payload in task_description. Continue the current conversation after delegation instead of sending the user to Mission Control.',
    }
  }

  if (MISSION_MANAGER_ACTIONS.has(action)) {
    return {
      allowed: false,
      reason: `Action "${action}" is restricted to Vibey mission manager.`,
    }
  }

  if (SKILL_ACTIONS.has(action)) {
    return { allowed: true }
  }

  const allowedActions = resolveManagedActionAllowlist(policy.domain, policy.level)
  if (!allowedActions.has(action)) {
    const hint = resolveActionRecoveryHint(action)
    return {
      allowed: false,
      reason: `Action "${action}" is not available for ${policy.domain} domain agents (level: ${policy.level}).${hint}`,
    }
  }

  return { allowed: true }
}

export function isIntegrationSubActionAllowed(
  policy: ArtifactCapabilityPolicy,
  service: string,
  integrationAction: string,
): { allowed: boolean; reason?: string } {
  const normalizedService = service.trim().toLowerCase()
  const normalizedAction = integrationAction.trim()

  if (!normalizedService || !normalizedAction) {
    return { allowed: false, reason: 'Both service and integration_action are required.' }
  }

  if (policy.profile === 'system_hr') {
    return { allowed: false, reason: 'system_hr cannot use integrations.' }
  }

  if (policy.profile === 'system_builder') {
    return { allowed: true }
  }

  if (policy.profile === 'system_flows') {
    const allowed =
      normalizedService.length > 0 &&
      ['get_integration', 'search_available_integrations', 'check_integration_connection'].includes(
        normalizedAction,
      )
    return allowed
      ? { allowed: true }
      : { allowed: false, reason: 'system_flows can only inspect integration availability.' }
  }

  if (normalizedService === 'scrapecreators') {
    if (policy.profile === 'vibey_ceo') {
      return { allowed: true }
    }
    if (policy.profile === 'managed_domain' && policy.domain === 'marketing') {
      return { allowed: true }
    }
    return {
      allowed: false,
      reason:
        'Social Analysis is only for marketing-domain agents or Vibey. Use ask_agent to reach a marketing teammate for social analysis.',
    }
  }

  if (
    normalizedService === 'dataforseo' ||
    normalizedService === 'seo_research' ||
    normalizedService === 'seo-research' ||
    normalizedService === 'seoresearch'
  ) {
    if (policy.profile === 'vibey_ceo') {
      return { allowed: true }
    }
    if (
      policy.profile === 'managed_domain' &&
      (policy.domain === 'marketing' || policy.domain === 'analyst')
    ) {
      return { allowed: true }
    }
    return {
      allowed: false,
      reason:
        'SEO Research is only for marketing-domain agents, analyst-domain agents, or Vibey. Use ask_agent to reach a marketing or analyst teammate for SEO research.',
    }
  }

  if (
    normalizedService === 'searchapi' ||
    normalizedService === 'ads_intelligence' ||
    normalizedService === 'ads-intelligence' ||
    normalizedService === 'adsintelligence'
  ) {
    if (policy.profile === 'vibey_ceo') {
      return { allowed: true }
    }
    if (policy.profile === 'managed_domain' && policy.domain === 'marketing') {
      return { allowed: true }
    }
    return {
      allowed: false,
      reason:
        'Ads Intelligence is only for marketing-domain agents or Vibey. Use ask_agent to reach a marketing teammate for ad-library research.',
    }
  }

  if (policy.profile === 'vibey_ceo') {
    return { allowed: true }
  }

  return { allowed: normalizedService.length > 0 && normalizedAction.length > 0 }
}
