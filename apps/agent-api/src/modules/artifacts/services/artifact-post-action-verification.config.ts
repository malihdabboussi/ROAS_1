export type ArtifactPostActionVerificationPolicyStatus = 'required' | 'not_required'
export type ArtifactPostActionVerificationActionClassification =
  | ArtifactPostActionVerificationPolicyStatus
  | 'unclassified'

export type ArtifactPostActionVerificationStrategy =
  | 'db_readback'
  | 'asset_ref'
  | 'url_accessible'
  | 'provider_ack'
  | 'validation_result'
  | 'presentation_contract'

export interface ArtifactPostActionVerificationPolicy {
  status: ArtifactPostActionVerificationPolicyStatus
  reason: string
  strategies: ArtifactPostActionVerificationStrategy[]
}

const READ_ONLY_PREFIXES = [
  'describe_',
  'search_',
  'get_',
  'list_',
  'read_',
  'check_',
  'show_',
  'summarize_',
  'audit_',
  'compare_',
  'discover_',
  'brainstorm_',
] as const

const REQUIRED_WRITE_PREFIXES = [
  'create_',
  'update_',
  'patch_',
  'delete_',
  'add_',
  'append_',
  'attach_',
  'detach_',
  'apply_',
  'extract_',
  'write_',
  'set_',
  'unpublish_',
  'publish_',
  'prepare_',
  'propose_',
  'save_',
  'use_',
  'initiate_',
  'generate_',
  'edit_',
  'analyze_',
  'run_',
  'validate_',
  'process_',
  'import_',
  'restart_',
  'fetch_',
  'define_',
  'copy_',
  'upload_',
  'schedule_',
  'crystallize_',
  'ingest_',
  'transfer_',
  'assign_',
  'archive_',
  'link_',
  'unlink_',
  'log_',
  'merge_',
  'connect_',
  'disconnect_',
  'resolve_',
  'bulk_',
  'send_',
  'ask_',
  'delegate_',
  'approve_',
  'answer_',
  'compile_',
  'activate_',
  'retry_',
  'trash_',
  'cancel_',
  'reassign_',
  'unassign_',
  'upsert_',
  'remove_',
  'evaluate_',
  'atlas_',
  'supabase_',
] as const

const EXPLICIT_REQUIRED_ACTIONS = new Set([
  'dream_propose_skill_create',
  'dream_propose_skill_update',
  'dream_propose_skill_resource_update',
  'dream_propose_agent_file_update',
  'dream_route_out',
  'dream_finish',
])

const STATUS_ONLY_ACTIONS = new Map<string, string>([
  ['get_media_generation_status', 'status-only poll; it does not create or update output'],
  ['get_video_status', 'status-only poll; generated output is verified by generation actions'],
  ['get_meta_ad_status', 'external status read; publish actions verify side effects'],
  ['get_project_logs', 'runtime log read; it does not create or update output'],
  ['get_project_errors', 'runtime error read; it does not create or update output'],
  ['get_delivery_estimate', 'estimate read; it does not create or update output'],
  ['get_capabilities', 'capability read; it does not create or update output'],
])

const INTENTIONALLY_NOT_REQUIRED_ACTIONS = new Map<string, string>([
  ['supabase_list_tables', 'read-only Supabase schema lookup'],
  ['transcribe_audio', 'direct transcript output; it does not persist a separate artifact'],
  ['dream_inspect_agent', 'read-only Dream Ops agent inspection'],
  ['dream_search_evidence', 'read-only Dream Ops evidence lookup'],
])

const URL_OUTPUT_ACTIONS = new Set<string>([
  'attach_form_asset',
  'publish_form',
  'write_funnel_file',
  'patch_funnel_file',
  'attach_funnel_asset',
  'write_presentation_file',
  'patch_presentation_file',
  'attach_presentation_asset',
  'create_file',
  'update_file',
  'patch_file',
  'fetch_project_url',
  'upload_skill_asset',
  'save_document',
  'create_pdf',
  'create_docx',
  'generate_image',
  'edit_image',
  'generate_video',
  'generate_visual_html',
  'process_media',
])

const VALIDATION_ACTIONS = new Set<string>([
  'validate_project',
  'validate_flow_draft',
  'validate_flow_plan',
  'validate_flow_blueprint',
  'evaluate_flow_plan',
  'run_brain_lint',
  'resolve_brain_lint',
])

const PRESENTATION_CONTRACT_ACTIONS = new Set<string>([
  'create_presentation',
  'update_presentation',
  'write_presentation_file',
  'patch_presentation_file',
  'delete_presentation_file',
  'attach_presentation_asset',
  'detach_presentation_asset',
  'apply_presentation_element_edit',
  'add_presentation_anchor',
  'update_presentation_tweaks',
])

const EXTERNAL_ACK_ACTION_PREFIXES = [
  'use_',
  'initiate_',
  'send_',
  'ask_',
  'delegate_',
  'approve_',
  'supabase_',
] as const

const EXTERNAL_ACK_ACTIONS = new Set<string>([
  'publish_ad_to_meta',
  'save_meta_defaults',
  'create_meta_custom_audience',
  'create_meta_lookalike_audience',
  'create_meta_pixel_event',
  'create_calendar_event',
  'update_calendar_event',
  'delete_calendar_event',
  'use_mcp_tool',
  'add_mcp_server',
  'remove_mcp_server',
  'create_campaign',
  'update_campaign',
  'assign_agent_to_campaign',
  'unassign_agent_from_campaign',
])

function startsWithAny(action: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => action.startsWith(prefix))
}

function getRequiredStrategies(action: string): ArtifactPostActionVerificationStrategy[] {
  const strategies = new Set<ArtifactPostActionVerificationStrategy>(['db_readback', 'provider_ack'])

  if (URL_OUTPUT_ACTIONS.has(action)) {
    strategies.add('asset_ref')
    strategies.add('url_accessible')
  }

  if (VALIDATION_ACTIONS.has(action)) {
    strategies.add('validation_result')
  }

  if (PRESENTATION_CONTRACT_ACTIONS.has(action)) {
    strategies.add('presentation_contract')
  }

  if (EXTERNAL_ACK_ACTIONS.has(action) || startsWithAny(action, EXTERNAL_ACK_ACTION_PREFIXES)) {
    strategies.add('provider_ack')
  }

  return Array.from(strategies)
}

export function classifyPostActionVerificationAction(
  action: string,
): ArtifactPostActionVerificationActionClassification {
  if (STATUS_ONLY_ACTIONS.has(action) || INTENTIONALLY_NOT_REQUIRED_ACTIONS.has(action)) {
    return 'not_required'
  }

  if (startsWithAny(action, READ_ONLY_PREFIXES)) {
    return 'not_required'
  }

  if (EXPLICIT_REQUIRED_ACTIONS.has(action) || startsWithAny(action, REQUIRED_WRITE_PREFIXES)) {
    return 'required'
  }

  return 'unclassified'
}

export function getPostActionVerificationPolicy(
  action: string,
): ArtifactPostActionVerificationPolicy {
  const status = classifyPostActionVerificationAction(action)

  if (status === 'required') {
    return {
      status,
      reason: 'write/output action must prove the created, updated, or external result technically exists',
      strategies: getRequiredStrategies(action),
    }
  }

  if (STATUS_ONLY_ACTIONS.has(action)) {
    return {
      status: 'not_required',
      reason: STATUS_ONLY_ACTIONS.get(action)!,
      strategies: [],
    }
  }

  if (INTENTIONALLY_NOT_REQUIRED_ACTIONS.has(action)) {
    return {
      status: 'not_required',
      reason: INTENTIONALLY_NOT_REQUIRED_ACTIONS.get(action)!,
      strategies: [],
    }
  }

  if (startsWithAny(action, READ_ONLY_PREFIXES)) {
    return {
      status: 'not_required',
      reason: 'read-only action; it does not create, update, publish, or persist output',
      strategies: [],
    }
  }

  return {
    status: 'not_required',
    reason: 'unclassified action; add an explicit post-action verification policy before enabling',
    strategies: [],
  }
}
