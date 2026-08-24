import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

/**
 * Vibey Backend Action Tool Plugin
 *
 * Registers the internal action surface used by Vibey to create, update,
 * and manage platform assets, Spaces, Flows, Brain context, team actions,
 * and campaign work. The platform handles identity and context automatically.
 */

export const PLUGIN_LOCAL_ACTIONS = [
  'ask_clarification',
  'create_chat_plan',
  'update_chat_plan',
] as const

export const ON_HOLD_PROMPTMODE_ACTIONS = [
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
  'supabase_list_tables',
  'supabase_run_sql',
  'supabase_create_table',
  'supabase_insert_rows',
  'supabase_update_rows',
  'supabase_delete_rows',
] as const

const ON_HOLD_PROMPTMODE_ACTION_SET = new Set<string>(ON_HOLD_PROMPTMODE_ACTIONS)
const DREAM_OPS_ACTIONS = [
  'dream_inspect_agent',
  'dream_search_evidence',
  'dream_propose_skill_create',
  'dream_propose_skill_update',
  'dream_propose_skill_resource_update',
  'dream_propose_agent_file_update',
  'dream_route_out',
  'dream_finish',
] as const
const DREAM_OPS_ACTION_SET = new Set<string>(DREAM_OPS_ACTIONS)
const SCOPED_ALLOWLIST_BACKFILL_ACTIONS: Array<{ whenAllowed: string; alsoAllow: string }> = [
  { whenAllowed: 'analyze_video', alsoAllow: 'transcribe_audio' },
]

const SUPPORTED_ACTIONS = [
  'describe_action',
  'create_offer',
  'update_offer_step',
  'get_offer',
  'list_offers',
  'delete_offer',
  'list_custom_fields',
  'create_ad',
  'update_ad',
  'list_ads',
  'get_ad',
  'delete_ad',
  'create_ad_campaign',
  'get_ad_campaign',
  'create_ad_set',
  'get_ad_set',
  'update_ad_campaign',
  'update_ad_set',
  'create_funnel',
  'create_website',
  'add_funnel_page',
  'add_website_page',
  'update_funnel_page',
  'update_website_page',
  'set_website_layout',
  'get_funnel',
  'get_website',
  'list_funnels',
  'list_websites',
  'delete_funnel',
  'delete_website',
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
  'create_presentation',
  'get_presentation',
  'update_presentation',
  'patch_presentation',
  'update_presentation_slide',
  'add_presentation_slide',
  'list_presentations',
  'delete_presentation',
  'list_presentation_files',
  'read_presentation_file',
  'write_presentation_file',
  'patch_presentation_file',
  'delete_presentation_file',
  'show_presentation_file',
  'list_presentation_assets',
  'attach_presentation_asset',
  'detach_presentation_asset',
  'apply_presentation_element_edit',
  'add_presentation_anchor',
  'extract_presentation_tweaks',
  'update_presentation_tweaks',
  'create_sequence',
  'get_sequence',
  'update_sequence',
  'add_sequence_email',
  'update_sequence_email',
  'list_sequences',
  'delete_sequence',
  'delete_sequence_email',
  'prepare_email_send',
  'prepare_sequence_send',
  'create_avatar',
  'get_avatar',
  'update_avatar',
  'list_avatars',
  'delete_avatar',
  'create_theme',
  'get_theme',
  'update_theme',
  'list_themes',
  'delete_theme',
  'extract_website_theme',
  'read_document',
  'define_object_type',
  'list_object_types',
  'get_object_type',
  'update_object_type',
  'create_object',
  'update_object',
  'list_objects',
  'get_object',
  'delete_object',
  'list_agent_skills',
  'create_agent_skill',
  'update_agent_skill',
  'delete_agent_skill',
  'create_agent_skill_resource',
  'update_agent_skill_resource',
  'delete_agent_skill_resource',
  'copy_skill_resource',
  'save_document',
  'list_emails',
  'save_email',
  'get_email',
  'update_email',
  'delete_email',
  'get_document',
  'update_document',
  'delete_document',
  'create_pdf',
  'create_docx',
  'list_documents',
  'patch_state',
  'check_meta_connection',
  'check_integration_connection',
  'list_meta_ad_accounts',
  'list_meta_pages',
  'publish_ad_to_meta',
  'save_meta_defaults',
  'get_meta_ad_status',
  'get_daily_report_data',
  'get_meta_ads_insights',
  'get_delivery_estimate',
  'get_capabilities',
  'get_integration',
  'search_available_integrations',
  'initiate_integration_connect',
  'list_calendar_events',
  'get_person_agenda',
  'list_org_upcoming',
  'get_person_briefing',
  'create_calendar_event',
  'update_calendar_event',
  'delete_calendar_event',
  'use_integration',
  'get_media_generation_status',
  'generate_image',
  'generate_video',
  'get_video_status',
  'analyze_video',
  'transcribe_audio',
  'analyze_image',
  'extract_url_transcript',
  'process_media',
  'list_spaces',
  'get_space',
  'create_space_field',
  'update_space_field',
  'append_space_field_option',
  'create_space_status',
  'create_space_category',
  'create_space_tag',
  'create_space_view',
  'update_space_view',
  'list_tasks',
  'get_task',
  'create_task',
  'update_task',
  'delete_task',
  'add_task_comment',
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
  'create_mission',
  'list_missions',
  'get_mission',
  'get_mission_plan',
  'get_mission_logs',
  'get_mission_deliverables',
  'compile_webinar_launch_bible',
  'update_mission',
  'add_mission_comment',
  'list_mission_subtasks',
  'update_mission_subtask',
  'retry_mission',
  'trash_mission',
  'create_agent',
  'get_agent',
  'update_agent',
  'list_team',
  'list_campaign_team',
  'assign_agent_to_campaign',
  'unassign_agent_from_campaign',
  'save_user_memory',
  'transfer_brain_node',
  'delete_brain_node',
  'search_user_brain',
  'synthesize_user_brain_topic',
  'search_brain_context',
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
  'ingest_agent_brain_text',
  'ingest_agent_brain_link',
  'ingest_user_brain_document',
  'ingest_fathom_meeting',
  'ingest_fireflies_transcript',
  'transfer_brain_by_source',
  'assign_user_memory_source',
  'save_customer_memory',
  'search_customer_brain',
  'ingest_customer_brain_text',
  'ingest_customer_brain_link',
  'list_customer_brain_memories',
  'list_customer_avatars',
  'get_brain_pages',
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
  'update_campaign_context',
  'create_awareness_point',
  'update_awareness',
  ...PLUGIN_LOCAL_ACTIONS,
  'send_user_message',
  'create_social_post',
  'get_social_post',
  'schedule_social_post',
  'update_social_post',
  'list_social_posts',
  'delete_social_post',
  'publish_social_post',
  'create_blog_post',
  'update_blog_post',
  'list_blog_posts',
  'get_blog_post',
  'delete_blog_post',
  'get_social_post_template',
  'list_social_post_templates',
  'list_campaign_media',
  'list_mcp_servers',
  'list_mcp_tools',
  'use_mcp_tool',
  'add_mcp_server',
  'remove_mcp_server',
  'list_mcp_resources',
  'read_mcp_resource',
  'ask_agent',
  'delegate_to_agent',
  'approve_agent_hire',
  'brainstorm_agents',
  'create_campaign',
  'update_campaign',
  'list_campaigns',
  'get_campaign',
  'save_member_note',
  'get_member_notes',
  'search_vibey_docs',
  'patch_ad',
  'get_sequence_email',
  'upload_skill_asset',
  'read_space_document',
  'list_meta_audiences',
  'create_meta_custom_audience',
  'create_meta_lookalike_audience',
  'list_meta_pixel_events',
  'create_meta_pixel_event',
  'edit_image',
  'list_canvas_nodes',
  'get_canvas_board',
  'build_campaign_blueprint',
  'complete_canvas_placeholder',
  'apply_canvas_operations',
  'generate_ad_set',
  'search_conversations',
  'search_space_context',
  'generate_visual_html',
  'list_space_views',
  'get_space_view',
  'list_space_view_items',
  'get_space_item',
  'run_social_research_search',
  'run_ads_research_search',
  'search_ads_research_advertisers',
  'list_contacts',
  'get_contact',
  'create_contact',
  'update_contact',
  'add_contact_note',
  'update_contact_note',
  'get_contact_activity',
  'list_contact_communications',
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
  'audit_team_agents_and_skills',
  'compare_team_skill_coverage',
  'summarize_agent_capabilities',
  'atlas_save_brain_context',
  'get_brain_timelines',
  'get_brain_timeline_items',
  'create_brain_timeline',
  'upsert_brain_timeline_items',
  'archive_brain_timeline',
  'create_strategy_node',
  'list_strategy_nodes',
  'bulk_create_ads',
  'generate_ad_copy',
  'get_campaign_main_dashboard',
  'get_campaign_social_analytics',
  'get_campaign_stripe_overview',
  'discover_channel_context',
  'set_channel_context',
  ...DREAM_OPS_ACTIONS,
]

export function getSupportedActionsForTests(): string[] {
  return [...SUPPORTED_ACTIONS]
}

export function getOnHoldActionsForTests(): string[] {
  return [...ON_HOLD_PROMPTMODE_ACTIONS]
}

function filterActiveSupportedActions(actions: Iterable<unknown>): string[] {
  const filtered: string[] = []
  const seen = new Set<string>()
  for (const action of actions) {
    if (typeof action !== 'string') continue
    if (ON_HOLD_PROMPTMODE_ACTION_SET.has(action)) continue
    if (!SUPPORTED_ACTIONS.includes(action)) continue
    if (seen.has(action)) continue
    seen.add(action)
    filtered.push(action)
  }
  for (const backfill of SCOPED_ALLOWLIST_BACKFILL_ACTIONS) {
    if (!seen.has(backfill.whenAllowed) || seen.has(backfill.alsoAllow)) continue
    if (ON_HOLD_PROMPTMODE_ACTION_SET.has(backfill.alsoAllow)) continue
    if (!SUPPORTED_ACTIONS.includes(backfill.alsoAllow)) continue
    seen.add(backfill.alsoAllow)
    filtered.push(backfill.alsoAllow)
  }
  return filtered
}

function parseDreamOpsSessionKey(
  sessionKey: string,
): { agentKey: string; userId: string; runId: string; orgId: string } | null {
  if (!sessionKey.includes(':dream_ops:')) return null
  const base = sessionKey.split('::')[0] ?? ''
  const parts = base.split(':')
  if (parts.length < 6 || parts[0] !== 'agent' || parts[2] !== 'dream_ops') return null
  const agentKey = parts[3]?.trim()
  const userId = parts[4]?.trim()
  const runId = parts[5]?.trim()
  const orgId = sessionKey.includes('::org:')
    ? sessionKey.split('::org:')[1]?.split('::')[0]?.trim()
    : ''
  if (!agentKey || !userId || !runId || !orgId) return null
  return { agentKey, userId, runId, orgId }
}

/**
 * Plugin-local actions (ask_clarification, chat plans) execute inside this
 * plugin and never reach the backend action policy, so scoped
 * ALLOWED_ACTIONS.json files — generated from the backend policy — never
 * contain them. Merge them back so scoped agents keep the interactive chat
 * surface; text channels stay prompt-gated (channel-action.policy.ts) and the
 * stream proxy degrades their UI blocks to plain text.
 */
export function withPluginLocalActions(actions: readonly string[]): string[] {
  const merged = [...actions]
  const seen = new Set(actions)
  for (const action of PLUGIN_LOCAL_ACTIONS) {
    if (seen.has(action)) continue
    seen.add(action)
    merged.push(action)
  }
  return merged
}

function actionsForSession(actions: readonly string[], sessionKey: string): string[] {
  const dreamSession = parseDreamOpsSessionKey(sessionKey)
  const base = actions.filter((action) => !DREAM_OPS_ACTION_SET.has(action))
  if (dreamSession?.agentKey !== 'hr') return base
  const seen = new Set(base)
  for (const action of DREAM_OPS_ACTIONS) {
    if (seen.has(action)) continue
    seen.add(action)
    base.push(action)
  }
  return base
}

function formatStructuredValue(value: unknown): string {
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

function pushStructuredLine(lines: string[], label: string, value: unknown): void {
  if (value === undefined || value === null || value === '') return
  lines.push('', `${label}:`, formatStructuredValue(value))
}

function formatClassifiedError(result: Record<string, unknown>): {
  text: string
  isClassified: boolean
} {
  const errorClass = result.error_class as string | undefined
  if (!errorClass) return { text: JSON.stringify(result, null, 2), isClassified: false }

  const errorCode = result.error_code as string | undefined
  const retryable = result.retryable === true
  const error = String(result.error ?? 'Operation failed')
  const guidance = String(result.agent_instruction ?? result.agent_guidance ?? '')
  const userHint =
    typeof result.user_explanation === 'object' && result.user_explanation
      ? (result.user_explanation as Record<string, unknown>).sentence
      : result.user_hint

  const lines = [
    `ERROR [${errorCode ?? errorClass}] - ${retryable ? 'RETRYABLE' : 'NOT RETRYABLE'}`,
    '',
    error,
    '',
    `CLASS: ${errorClass}`,
  ]
  pushStructuredLine(lines, 'RELIABILITY', result.reliability)
  pushStructuredLine(lines, 'EFFECT STATE', result.effect_state)
  pushStructuredLine(lines, 'RETRY POLICY', result.retry_policy)
  pushStructuredLine(lines, 'DIAGNOSIS', result.agent_diagnosis)
  pushStructuredLine(lines, 'CORRECTION', result.correction)
  pushStructuredLine(lines, 'FALLBACK', result.fallback)
  pushStructuredLine(lines, 'GUIDANCE', guidance)
  pushStructuredLine(lines, 'SUGGESTED USER MESSAGE', userHint)
  pushStructuredLine(lines, 'DO NOT SAY TO USER', result.forbidden_user_framing)
  return { text: lines.join('\n'), isClassified: true }
}

function buildLocalValidationContract(error: string, action?: string): Record<string, unknown> {
  const suffix = action ? ` for action "${action}"` : ''
  return {
    success: false,
    error,
    error_code: 'VIBEY_BACKEND_LOCAL_VALIDATION',
    error_class: 'validation_error',
    reliability: 'high_confidence',
    effect_state: 'failed_before_effect',
    retry_policy: {
      mode: 'retry_with_corrected_payload',
      max_attempts: 1,
      stop_after_same_error: true,
      reason: `The local tool payload is missing required data${suffix}.`,
    },
    correction: {
      summary: 'Correct the missing or invalid tool fields before retrying.',
      next_tool_preference: ['describe_action'],
    },
    fallback: null,
    agent_diagnosis: `The vibey_backend plugin rejected the payload before calling the backend${suffix}.`,
    agent_instruction:
      'Do not repeat the same payload. Correct the missing or invalid fields, then retry once. If the user needs to know, say you are correcting the inputs; do not describe this as an internal or platform issue.',
    user_explanation: {
      intent: 'correct_and_retry',
      sentence: 'I need to correct the action inputs before I can run that step.',
    },
    forbidden_user_framing: [
      'platform error',
      'platform problem',
      'platform rendering issue',
      'backend problem',
      'internal issue',
    ],
    observability: {
      fingerprint: 'vibey_backend.local_validation',
      report_level: 'info',
    },
    retryable: true,
  }
}

function classifiedToolResult(contract: Record<string, unknown>) {
  const { text } = formatClassifiedError(contract)
  return {
    content: [{ type: 'text', text }],
    details: { status: 'error', ...contract },
  }
}

function localValidationResult(error: string, action?: string) {
  return classifiedToolResult(buildLocalValidationContract(error, action))
}

function resolveBackendActionPayload(
  action: string,
  data: Record<string, unknown>,
): { action: string; data: Record<string, unknown> } {
  if (action !== 'transcribe_audio') {
    return { action, data }
  }
  return {
    action: 'analyze_video',
    data: {
      ...data,
      extract_frames: false,
      transcribe: true,
    },
  }
}

export function parseAgentIdentityFromSessionKey(
  sessionKey: string,
): { agentKey: string; orgId?: string; userId?: string } | null {
  if (!sessionKey.startsWith('agent:')) return null
  const parts = sessionKey.split(':')
  const key = parts[1] || null
  if (!key) return null
  if (key === 'default' || key === 'main') return { agentKey: 'vibey' }
  const orgPrefixMatch = key?.match(
    /^org-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+)$/i,
  )
  if (orgPrefixMatch && orgPrefixMatch[1]) {
    return {
      agentKey: orgPrefixMatch[1],
      orgId: key.slice(4, -(orgPrefixMatch[1].length + 1)),
    }
  }
  const userPrefixMatch = key?.match(
    /^user-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+)$/i,
  )
  if (userPrefixMatch && userPrefixMatch[1]) {
    return {
      agentKey: userPrefixMatch[1],
      userId: key.slice(5, -(userPrefixMatch[1].length + 1)),
    }
  }
  return { agentKey: key }
}

export function loadAllowedActions(
  agentKey: string,
  orgId?: string,
  userId?: string,
): string[] | null {
  const roots = [
    process.env.AGENTS_BASE_DIR,
    '/app/agents',
    join(process.cwd(), '.local', 'agents'),
  ].filter((root): root is string => typeof root === 'string' && root.trim().length > 0)
  const candidates = roots.flatMap((root) => [
    ...(orgId
      ? [join(root, 'orgs', orgId, agentKey, 'skills', 'vibey-api', 'ALLOWED_ACTIONS.json')]
      : []),
    ...(userId
      ? [join(root, 'users', userId, agentKey, 'skills', 'vibey-api', 'ALLOWED_ACTIONS.json')]
      : []),
    join(root, agentKey, 'skills', 'vibey-api', 'ALLOWED_ACTIONS.json'),
  ])
  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue
    try {
      const raw = readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.allowed_actions) && parsed.allowed_actions.length > 0) {
        return filterActiveSupportedActions(parsed.allowed_actions)
      }
    } catch {}
  }
  return null
}

export default function register(api: any) {
  const config = api.config?.plugins?.entries?.['vibey-backend']?.config ?? {}
  // Env wins over baked-in openclaw.json config: deploy targets (Railway, Fly, local)
  // set VIBEY_BACKEND_URL once instead of patching the image config per environment.
  const envBackendUrl =
    typeof process.env.VIBEY_BACKEND_URL === 'string' ? process.env.VIBEY_BACKEND_URL.trim() : ''
  const backendUrl = (envBackendUrl || config.backendUrl || 'http://localhost:3003').replace(
    /\/+$/,
    '',
  )
  const backendUrlSource = envBackendUrl ? 'env' : config.backendUrl ? 'config' : 'default'
  api.logger?.info?.(`[vibey-backend] backendUrl=${backendUrl} source=${backendUrlSource}`)

  api.registerTool((ctx: { sessionKey?: string }) => {
    const sessionKey = ctx?.sessionKey ?? ''
    const agentIdentity = parseAgentIdentityFromSessionKey(sessionKey)
    const scopedActions = agentIdentity
      ? loadAllowedActions(agentIdentity.agentKey, agentIdentity.orgId, agentIdentity.userId)
      : null
    const effectiveActions = actionsForSession(
      scopedActions ? withPluginLocalActions(scopedActions) : SUPPORTED_ACTIONS,
      sessionKey,
    )

    return {
      name: 'vibey_backend',
      description:
        'Execute a Vibey backend action. Read your vibey-api skill for available actions, parameters, and usage examples.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description:
              'The action to perform. Read skills/vibey-api/SKILL.md for your available actions.',
            enum: [...effectiveActions],
          },
          label: {
            type: 'string',
            description:
              'A short, user-facing label describing what you are doing (e.g. "Crafting your irresistible offer"). This is shown to the user in the progress timeline. Keep it friendly, concise, and in your Vibey voice. No emojis.',
          },
          data: {
            type: 'object',
            description:
              'Action-specific data. See action descriptions above for required fields per action.',
            additionalProperties: true,
          },
        },
        required: ['action', 'label', 'data'],
      },
      async execute(
        _id: string,
        params: { action: string; label: string; data?: Record<string, unknown> },
        _signal?: unknown,
        onUpdate?: (partial: Record<string, unknown>) => void,
      ) {
        const { action, label, data } = params
        const inputData = data ?? {}

        const validationError = (() => {
          if (!data || typeof data !== 'object') {
            return `Action "${action}" requires a data object.`
          }
          if (action === 'add_funnel_page') {
            if (typeof inputData.funnel_id !== 'string' || !inputData.funnel_id.trim()) {
              return 'add_funnel_page requires data.funnel_id (non-empty string).'
            }
            const hasFiles = Array.isArray(inputData.files) && inputData.files.length > 0
            if (!hasFiles) {
              return 'add_funnel_page requires data.files (HTML bundle with an index.html entry). TSX generated_html is retired.'
            }
          }
          if (action === 'update_funnel_page') {
            if (typeof inputData.funnel_page_id !== 'string' || !inputData.funnel_page_id.trim()) {
              return 'update_funnel_page requires data.funnel_page_id (non-empty string).'
            }
          }
          return null
        })()

        if (action === 'ask_clarification' || action === 'create_flow_clarification') {
          const questions = Array.isArray(inputData?.questions)
            ? inputData.questions
            : Array.isArray((inputData?.clarification as Record<string, unknown>)?.questions)
              ? ((inputData.clarification as Record<string, unknown>).questions as unknown[])
              : Array.isArray(inputData?.items)
                ? (inputData.items as unknown[])
                : []
          if (questions.length === 0) {
            return localValidationResult(
              `${action} requires data.questions (non-empty array). Got: ` +
                JSON.stringify(inputData?.questions ?? 'undefined'),
              action,
            )
          }
          for (let qi = 0; qi < questions.length; qi++) {
            const q = questions[qi]
            if (!q?.id || !q?.text || !q?.type) {
              return localValidationResult(
                `questions[${qi}] is missing required fields. Got: id=${JSON.stringify(q?.id)}, text=${JSON.stringify(q?.text)}, type=${JSON.stringify(q?.type)}. Each question needs { id: string, text: string, type: "single_choice"|"multiple_choice", options: [...], required?: boolean }.`,
                action,
              )
            }
            if (!Array.isArray(q.options) || q.options.length === 0) {
              return localValidationResult(
                `questions[${qi}] ("${q.id}") needs 1-5 options. Got: ${JSON.stringify(q.options ?? 'undefined')}. Each option needs { id: string, label: string, description?: string }.`,
                action,
              )
            }
            if (q.options.length > 5) {
              return localValidationResult(
                `questions[${qi}] ("${q.id}") has ${q.options.length} options (max 5). Remove some options or split into multiple questions.`,
                action,
              )
            }
            for (let oi = 0; oi < q.options.length; oi++) {
              const o = q.options[oi]
              if (!o?.id || typeof o.id !== 'string' || !o.id.trim()) {
                return localValidationResult(
                  `questions[${qi}] ("${q.id}") options[${oi}] has missing or empty id. Got: ${JSON.stringify(o?.id ?? 'undefined')}. Each option needs { id: string, label: string }.`,
                  action,
                )
              }
              if (!o?.label || typeof o.label !== 'string' || !o.label.trim()) {
                return localValidationResult(
                  `questions[${qi}] ("${q.id}") options[${oi}] has missing or empty label. Got: ${JSON.stringify(o?.label ?? 'undefined')}. Each option needs { id: string, label: string }.`,
                  action,
                )
              }
            }
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  clarification: {
                    title:
                      inputData?.title ||
                      (inputData?.clarification as Record<string, unknown>)?.title ||
                      'Quick question',
                    introMessage:
                      inputData?.intro_message ||
                      (inputData?.clarification as Record<string, unknown>)?.intro_message ||
                      '',
                    questions: questions.map((q: any) => ({
                      id: q.id,
                      text: q.text,
                      type: q.type,
                      options: (q.options || []).map((o: any) => ({
                        id: o.id,
                        label: o.label,
                        description: o.description,
                      })),
                      required: q.required ?? true,
                    })),
                  },
                }),
              },
            ],
          }
        }

        if (action === 'create_chat_plan') {
          const title = typeof inputData?.title === 'string' ? inputData.title.trim() : ''
          if (!title) {
            return localValidationResult(
              'create_chat_plan requires data.title (non-empty string).',
              action,
            )
          }
          const items = Array.isArray(inputData?.items) ? inputData.items : []
          if (items.length === 0 || items.length > 12) {
            return localValidationResult(
              'create_chat_plan requires data.items (1-12 items).',
              action,
            )
          }
          for (const item of items) {
            if (!item?.id || !item?.title) {
              return localValidationResult('Each plan item needs id and title.', action)
            }
          }
          const planId = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  chat_plan: {
                    plan_id: planId,
                    title,
                    summary: typeof inputData?.summary === 'string' ? inputData.summary : undefined,
                    items: items.map((item: any) => ({
                      id: item.id,
                      title: item.title,
                      status: 'pending',
                    })),
                    plan_status: 'active',
                    version: 1,
                  },
                }),
              },
            ],
          }
        }

        if (action === 'update_chat_plan') {
          const planId = typeof inputData?.plan_id === 'string' ? inputData.plan_id.trim() : ''
          if (!planId) {
            return localValidationResult('update_chat_plan requires data.plan_id.', action)
          }
          const items = Array.isArray(inputData?.items) ? inputData.items : []
          if (items.length === 0) {
            return localValidationResult(
              'update_chat_plan requires data.items with at least one status update.',
              action,
            )
          }
          const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'skipped']
          for (const item of items) {
            if (!item?.id || !item?.status || !validStatuses.includes(item.status)) {
              return localValidationResult(
                `Each item needs id and status (${validStatuses.join(', ')}).`,
                action,
              )
            }
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  chat_plan_update: {
                    plan_id: planId,
                    title: typeof inputData?.title === 'string' ? inputData.title : undefined,
                    items: items.map((item: any) => ({
                      id: item.id,
                      title: typeof item.title === 'string' ? item.title : undefined,
                      status: item.status,
                      note: typeof item.note === 'string' ? item.note : undefined,
                    })),
                    plan_status:
                      typeof inputData?.plan_status === 'string'
                        ? inputData.plan_status
                        : undefined,
                  },
                }),
              },
            ],
          }
        }

        if (!effectiveActions.includes(action)) {
          return localValidationResult(
            `Action "${action}" is not available for this agent right now. Read skills/vibey-api/SKILL.md for your available actions.`,
            action,
          )
        }
        if (!label || !label.trim()) {
          return localValidationResult('Action label is required for this operation.', action)
        }
        if (validationError) {
          return localValidationResult(validationError, action)
        }

        try {
          const signal =
            _signal && typeof _signal === 'object' && 'aborted' in _signal
              ? (_signal as AbortSignal)
              : undefined
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-openclaw-internal': 'true',
          }
          if (sessionKey) {
            headers['x-session-key'] = sessionKey
          }
          const backendPayload = resolveBackendActionPayload(action, inputData)

          const response = await fetch(`${backendUrl}/api/artifacts/stream`, {
            method: 'POST',
            headers,
            body: JSON.stringify(backendPayload),
            signal,
          })

          if (!response.ok) {
            const responseText = await response.text()
            let result: any
            try {
              result = JSON.parse(responseText)
            } catch {
              result = { raw: responseText }
            }
            if (result && typeof result === 'object' && result.error_class) {
              return classifiedToolResult(result)
            }
            const errorMessage = String(
              result?.error || result?.message || `Request failed with status ${response.status}`,
            )
            return {
              content: [{ type: 'text', text: errorMessage }],
            }
          }

          const contentType = response.headers.get('content-type') || ''
          if (!contentType.includes('text/event-stream') || !response.body) {
            const responseText = await response.text()
            let result: any
            try {
              result = JSON.parse(responseText)
            } catch {
              result = { raw: responseText }
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            }
          }

          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          let finalResult: any = null
          let streamError: any = null

          while (true) {
            if (signal?.aborted) {
              await reader.cancel().catch(() => {})
              throw new DOMException('This operation was aborted', 'AbortError')
            }
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const payload = line.slice(6).trim()
              if (!payload || payload === '[DONE]') continue
              let evt: any
              try {
                evt = JSON.parse(payload)
              } catch {
                continue
              }
              if (evt?.type === 'progress' && typeof evt?.message === 'string') {
                onUpdate?.({ message: evt.message })
              } else if (evt?.type === 'result') {
                finalResult = evt.result
              } else if (evt?.type === 'error') {
                if (evt?.error && typeof evt.error === 'object') {
                  streamError = evt.error
                } else if (typeof evt?.message === 'string') {
                  streamError = { success: false, error: evt.message }
                } else {
                  streamError = { success: false, error: 'Operation failed' }
                }
              }
            }
          }

          if (streamError) {
            if (streamError && typeof streamError === 'object' && streamError.error_class) {
              return classifiedToolResult(streamError)
            }
            return {
              content: [{ type: 'text', text: JSON.stringify(streamError, null, 2) }],
            }
          }

          if (
            finalResult &&
            typeof finalResult === 'object' &&
            finalResult.success === false &&
            finalResult.error_class
          ) {
            return classifiedToolResult(finalResult)
          }

          const isA2A =
            action === 'ask_agent' ||
            action === 'delegate_to_agent' ||
            action === 'brainstorm_agents'
          if (isA2A && finalResult && typeof finalResult === 'object') {
            const { turns, ...withBlocks } = finalResult as Record<string, unknown>
            return {
              content: [{ type: 'text', text: JSON.stringify(withBlocks, null, 2) }],
            }
          }

          return {
            content: [{ type: 'text', text: JSON.stringify(finalResult ?? {}, null, 2) }],
          }
        } catch (error: any) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return {
              content: [
                {
                  type: 'text',
                  text: 'This operation was aborted',
                },
              ],
            }
          }
          // Throwing (instead of returning text) makes pi-agent-core mark the
          // toolResult isError: true, so traces, Sentry spans, and run status
          // reflect the failure instead of recording a fake-successful step.
          const errorCode = error?.code ?? error?.cause?.code
          if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND') {
            throw new Error(
              [
                'ERROR [BACKEND_UNREACHABLE] - NOT RETRYABLE',
                '',
                `Internal transport failure while calling the backend action endpoint (${errorCode}).`,
                '',
                'CLASS: backend_unreachable',
                '',
                'RELIABILITY:',
                'high_confidence',
                '',
                'EFFECT STATE:',
                'failed_before_effect',
                '',
                'RETRY POLICY:',
                JSON.stringify(
                  {
                    mode: 'do_not_retry_terminal',
                    max_attempts: 0,
                    stop_after_same_error: true,
                    reason: 'The tool cannot reach the backend action endpoint from this runtime.',
                  },
                  null,
                  2,
                ),
                '',
                'GUIDANCE:',
                'Do not retry this same action. Tell the user you cannot complete that action from here right now, then continue with a useful alternative that does not depend on this backend call.',
                '',
                'SUGGESTED USER MESSAGE:',
                'I cannot complete that action from here right now. I can keep drafting or outline the next steps while this is unavailable.',
                '',
                'DO NOT SAY TO USER:',
                JSON.stringify(
                  ['platform error', 'platform problem', 'backend problem', 'internal issue'],
                  null,
                  2,
                ),
              ].join('\n'),
            )
          }

          const detail = error instanceof Error ? error.message : String(error)
          throw new Error(
            [
              'ERROR [BACKEND_REQUEST_FAILED] - RETRYABLE',
              '',
              `The request to the Vibey backend failed: ${detail}`,
              '',
              'RETRY POLICY:',
              JSON.stringify(
                {
                  mode: 'retry_after_delay',
                  max_attempts: 1,
                  stop_after_same_error: true,
                  reason: 'A single retry can succeed for transient transport failures.',
                },
                null,
                2,
              ),
              '',
              'GUIDANCE:',
              'You may retry this action once. If it fails again, stop retrying, avoid platform/internal wording, and offer a useful fallback.',
              '',
              'DO NOT SAY TO USER:',
              JSON.stringify(
                ['platform error', 'platform problem', 'backend problem', 'internal issue'],
                null,
                2,
              ),
            ].join('\n'),
          )
        }
      },
    }
  })
}
