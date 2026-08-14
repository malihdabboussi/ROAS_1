import { canonicalizeIntegrationId } from '../../shared/utils/integration-id.util'
import { VALID_ACTIONS } from '../dtos/artifact-action.dto'
import {
  parseConversationIdFromSessionKey,
  parseDreamOpsSessionKey,
} from './artifact-action.registry'
import { validateIgStoryRenderPreflight } from './artifact-ig-story-preflight'
import {
  PRESENTATION_ACTION_PREFLIGHT_OVERRIDES,
  PRESENTATION_ACTION_PREFLIGHTS,
} from './artifact-presentation-action-preflight'
import {
  WEBINAR_LAUNCH_BIBLE_PREFLIGHT_OVERRIDES,
  WEBINAR_LAUNCH_BIBLE_PREFLIGHTS,
} from './artifact-webinar-launch-bible-preflight'

type ArtifactAction = (typeof VALID_ACTIONS)[number]

export type ActionPreflightCoverageMode =
  | 'schema_only'
  | 'static_preflight'
  | 'async_preflight'
  | 'external_dynamic_schema'

export type ActionPreflightCoverage = {
  mode: ActionPreflightCoverageMode
  reason: string
}

export type ActionPreflightFailure = {
  error: string
  errorCode?: string
  agentDiagnosis?: string
  agentInstruction?: string
  correction?: Record<string, unknown>
  userExplanation?: Record<string, unknown>
  observability?: Record<string, unknown>
}

type ActionPreflightContext = {
  host?: Record<string, any>
  sessionKey?: string
  onProgress?: (message: string) => void | Promise<void>
}

type ActionPreflightValidator = (
  data: Record<string, unknown>,
  context?: ActionPreflightContext,
) => ActionPreflightFailure | null | Promise<ActionPreflightFailure | null>

const ACTION_PREFLIGHT_OVERRIDES: Partial<Record<ArtifactAction, ActionPreflightCoverage>> = {
  ...PRESENTATION_ACTION_PREFLIGHT_OVERRIDES,
  ...WEBINAR_LAUNCH_BIBLE_PREFLIGHT_OVERRIDES,
  analyze_video: {
    mode: 'static_preflight',
    reason:
      'Video analysis has source, transcript, frame, and numeric settings that must be valid before media download.',
  },
  transcribe_audio: {
    mode: 'static_preflight',
    reason:
      'Audio transcription has source settings that must be valid before media download and ffmpeg work.',
  },
  process_media: {
    mode: 'static_preflight',
    reason:
      'Media operations have operation-specific fields that must be valid before media download or ffmpeg work.',
  },
  get_meta_ads_insights: {
    mode: 'static_preflight',
    reason:
      'Meta insights must distinguish the active ROAS campaign scope from child Meta hierarchy rows and validate reporting periods before API work.',
  },
  create_contact: {
    mode: 'static_preflight',
    reason: 'Contact creation requires a valid email address before CRM insert work starts.',
  },
  update_contact: {
    mode: 'static_preflight',
    reason:
      'Contact tag and custom field replacements require an explicit confirmation flag before CRM update work starts.',
  },
  add_contact_note: {
    mode: 'static_preflight',
    reason:
      'Contact note creation requires non-empty note content and a valid note tint before CRM insert work starts.',
  },
  update_contact_note: {
    mode: 'static_preflight',
    reason:
      'Contact note updates require a concrete content or tint change before CRM update work starts.',
  },
  use_integration: {
    mode: 'external_dynamic_schema',
    reason:
      'Integration calls use provider capability metadata and connection readiness before Composio or legacy execution.',
  },
  use_mcp_tool: {
    mode: 'external_dynamic_schema',
    reason:
      'MCP tool calls validate server/tool readiness and cached inputSchema before calling the remote tool.',
  },
  atlas_save_brain_context: {
    mode: 'static_preflight',
    reason:
      'Customer Brain saves through Atlas require a contact or durable source identity before routing.',
  },
  save_customer_memory: {
    mode: 'static_preflight',
    reason:
      'Customer memories can be contact-linked or source-anchored, but contactless writes must carry durable source identity.',
  },
  ingest_customer_brain_text: {
    mode: 'static_preflight',
    reason:
      'Customer text ingestion can be contact-linked or source-anchored, but contactless writes must carry durable source identity.',
  },
  ingest_customer_brain_link: {
    mode: 'static_preflight',
    reason:
      'Customer link ingestion uses the URL as durable source identity when no contact is supplied.',
  },
  propose_company_brain_signal: {
    mode: 'static_preflight',
    reason: 'Company signal proposals must carry evidence refs or source metadata before review.',
  },
  create_company_brain_object: {
    mode: 'static_preflight',
    reason:
      'Durable Company Cortex objects require reviewed signal lineage, evidence refs, and retrieval rules before insert.',
  },
  apply_canvas_operations: {
    mode: 'static_preflight',
    reason:
      'Canvas mutation batches require a valid revision and supported normalized operations before database execution.',
  },
  build_campaign_blueprint: {
    mode: 'static_preflight',
    reason:
      'Campaign blueprints require a supported archetype and semantically valid assets and placeholders before Canvas execution.',
  },
  complete_canvas_placeholder: {
    mode: 'static_preflight',
    reason:
      'Placeholder completion requires a valid Canvas node and a coherent canonical resource reference.',
  },
  dream_inspect_agent: {
    mode: 'static_preflight',
    reason:
      'Dream Ops tools are internal to Jaime Dream Ops sessions and require HR dream identity.',
  },
  dream_search_evidence: {
    mode: 'static_preflight',
    reason:
      'Dream Ops tools are internal to Jaime Dream Ops sessions and require HR dream identity.',
  },
  dream_propose_skill_create: {
    mode: 'static_preflight',
    reason:
      'Dream Ops proposal tools are internal to Jaime Dream Ops sessions and require HR dream identity.',
  },
  dream_propose_skill_update: {
    mode: 'static_preflight',
    reason:
      'Dream Ops proposal tools are internal to Jaime Dream Ops sessions and require HR dream identity.',
  },
  dream_propose_skill_resource_update: {
    mode: 'static_preflight',
    reason:
      'Dream Ops proposal tools are internal to Jaime Dream Ops sessions and require HR dream identity.',
  },
  dream_propose_agent_file_update: {
    mode: 'static_preflight',
    reason:
      'Dream Ops proposal tools are internal to Jaime Dream Ops sessions and require HR dream identity.',
  },
  dream_route_out: {
    mode: 'static_preflight',
    reason:
      'Dream Ops route-out tools are internal to Jaime Dream Ops sessions and require HR dream identity.',
  },
  dream_finish: {
    mode: 'static_preflight',
    reason:
      'Dream Ops finish tools are internal to Jaime Dream Ops sessions and require HR dream identity.',
  },
}

export const ACTION_PREFLIGHT_COVERAGE: Record<ArtifactAction, ActionPreflightCoverage> =
  Object.fromEntries(
    VALID_ACTIONS.map((action) => [
      action,
      ACTION_PREFLIGHT_OVERRIDES[action] ?? {
        mode: 'schema_only',
        reason: 'The hard action schema fully validates this action before dispatch.',
      },
    ]),
  ) as Record<ArtifactAction, ActionPreflightCoverage>

export const ACTION_PREFLIGHTS: Partial<Record<ArtifactAction, ActionPreflightValidator>> = {
  ...PRESENTATION_ACTION_PREFLIGHTS,
  ...WEBINAR_LAUNCH_BIBLE_PREFLIGHTS,
  analyze_video: validateAnalyzeVideoPreflight,
  transcribe_audio: validateTranscribeAudioPreflight,
  process_media: validateProcessMediaPreflight,
  get_meta_ads_insights: validateMetaAdsInsightsPreflight,
  create_contact: validateCreateContactPreflight,
  update_contact: validateUpdateContactPreflight,
  add_contact_note: validateAddContactNotePreflight,
  update_contact_note: validateUpdateContactNotePreflight,
  use_integration: validateUseIntegrationPreflight,
  use_mcp_tool: validateUseMcpToolPreflight,
  atlas_save_brain_context: validateAtlasSaveBrainContextPreflight,
  save_customer_memory: validateCustomerMemorySourcePreflight,
  ingest_customer_brain_text: validateCustomerMemorySourcePreflight,
  ingest_customer_brain_link: validateCustomerMemorySourcePreflight,
  propose_company_brain_signal: validateProposeCompanyBrainSignalPreflight,
  create_company_brain_object: validateCreateCompanyBrainObjectPreflight,
  apply_canvas_operations: validateCanvasOperationsPreflight,
  build_campaign_blueprint: validateCampaignBlueprintPreflight,
  complete_canvas_placeholder: validateCanvasPlaceholderCompletionPreflight,
  dream_inspect_agent: validateDreamOpsSessionPreflight,
  dream_search_evidence: validateDreamOpsSessionPreflight,
  dream_propose_skill_create: validateDreamOpsSessionPreflight,
  dream_propose_skill_update: validateDreamOpsSessionPreflight,
  dream_propose_skill_resource_update: validateDreamOpsSessionPreflight,
  dream_propose_agent_file_update: validateDreamOpsSessionPreflight,
  dream_route_out: validateDreamOpsSessionPreflight,
  dream_finish: validateDreamOpsSessionPreflight,
}

function validateCanvasOperationsPreflight(
  data: Record<string, unknown>,
): ActionPreflightFailure | null {
  if (!Number.isInteger(data.base_revision) || (data.base_revision as number) < 0) {
    return failure('base_revision must be a non-negative integer.', 'CANVAS_REVISION_INVALID')
  }
  if (
    !Array.isArray(data.operations) ||
    data.operations.length < 1 ||
    data.operations.length > 100
  ) {
    return failure(
      'operations must contain between 1 and 100 Canvas operations.',
      'CANVAS_BATCH_INVALID',
    )
  }
  const supported = new Set([
    'create_item',
    'update_item',
    'delete_item',
    'create_connector',
    'delete_connector',
    'update_viewport',
  ])
  const invalid = data.operations.find(
    (operation) =>
      typeof operation !== 'object' ||
      operation === null ||
      !supported.has((operation as Record<string, unknown>).op as string),
  )
  return invalid
    ? failure('Every Canvas operation must use a supported op value.', 'CANVAS_OPERATION_INVALID')
    : null
}

function validateCampaignBlueprintPreflight(
  data: Record<string, unknown>,
): ActionPreflightFailure | null {
  if (typeof data.campaign_label !== 'string' || data.campaign_label.trim().length === 0) {
    return failure(
      'campaign_label must describe the campaign requested in chat.',
      'CAMPAIGN_BLUEPRINT_LABEL_INVALID',
    )
  }
  if (typeof data.blueprint_id !== 'string' || data.blueprint_id.trim().length === 0) {
    return failure('blueprint_id must be a non-empty string.', 'CAMPAIGN_BLUEPRINT_ID_INVALID')
  }
  const stages = Array.isArray(data.stages) ? data.stages : []
  if (stages.length < 2 || stages.length > 20) {
    return failure(
      'stages must contain between 2 and 20 chat-derived campaign stages.',
      'CAMPAIGN_BLUEPRINT_STAGES_INVALID',
    )
  }
  const stageKeys = new Set<string>()
  const invalidStage = stages.find((entry) => {
    if (typeof entry !== 'object' || entry === null) return true
    const value = entry as Record<string, unknown>
    if (
      typeof value.key !== 'string' ||
      value.key.trim().length === 0 ||
      typeof value.label !== 'string' ||
      value.label.trim().length === 0 ||
      stageKeys.has(value.key)
    ) {
      return true
    }
    stageKeys.add(value.key)
    return false
  })
  if (invalidStage) {
    return failure(
      'Every campaign blueprint stage requires a unique non-empty key and label.',
      'CAMPAIGN_BLUEPRINT_STAGE_INVALID',
    )
  }
  const assets = Array.isArray(data.assets) ? data.assets : []
  const gaps = Array.isArray(data.gaps) ? data.gaps : []
  const invalidEntry = [...assets, ...gaps].find((entry) => {
    if (typeof entry !== 'object' || entry === null) return true
    const value = entry as Record<string, unknown>
    return (
      typeof value.title !== 'string' ||
      value.title.trim().length === 0 ||
      typeof value.stage_key !== 'string' ||
      !stageKeys.has(value.stage_key)
    )
  })
  if (invalidEntry) {
    return failure(
      'Every campaign blueprint asset and gap requires a non-empty title and stage_key.',
      'CAMPAIGN_BLUEPRINT_ENTRY_INVALID',
    )
  }
  const connections = Array.isArray(data.connections) ? data.connections : []
  const invalidConnection = connections.find((entry) => {
    if (typeof entry !== 'object' || entry === null) return true
    const value = entry as Record<string, unknown>
    return (
      typeof value.source_stage_key !== 'string' ||
      typeof value.target_stage_key !== 'string' ||
      !stageKeys.has(value.source_stage_key) ||
      !stageKeys.has(value.target_stage_key)
    )
  })
  if (invalidConnection) {
    return failure(
      'Every campaign blueprint connection must reference two declared stage keys.',
      'CAMPAIGN_BLUEPRINT_CONNECTION_INVALID',
    )
  }
  const invalidGap = gaps.find((entry) => {
    const value = entry as Record<string, unknown>
    return typeof value.asset_type !== 'string' || typeof value.brief !== 'string'
  })
  return invalidGap
    ? failure(
        'Every campaign blueprint gap requires asset_type and brief.',
        'CAMPAIGN_BLUEPRINT_GAP_INVALID',
      )
    : null
}

function validateCanvasPlaceholderCompletionPreflight(
  data: Record<string, unknown>,
): ActionPreflightFailure | null {
  if (typeof data.node_id !== 'string' || data.node_id.trim().length === 0) {
    return failure('node_id must be a non-empty UUID.', 'CANVAS_PLACEHOLDER_NODE_INVALID')
  }
  if (typeof data.title !== 'string' || data.title.trim().length === 0) {
    return failure('title must be a non-empty string.', 'CANVAS_PLACEHOLDER_TITLE_INVALID')
  }
  const hasResourceId = typeof data.resource_id === 'string' && data.resource_id.trim().length > 0
  const hasResourceType =
    typeof data.resource_type === 'string' && data.resource_type.trim().length > 0
  if (hasResourceId !== hasResourceType) {
    return failure(
      'resource_id and resource_type must be provided together.',
      'CANVAS_PLACEHOLDER_RESOURCE_INVALID',
    )
  }
  return null
}

export function describeActionPreflightContract(action: string): ActionPreflightCoverage {
  return (
    ACTION_PREFLIGHT_COVERAGE[action as ArtifactAction] ?? {
      mode: 'schema_only',
      reason: 'Unknown actions are rejected before dispatch.',
    }
  )
}

export async function validateActionPreflight(
  action: string,
  data: Record<string, unknown>,
  context?: ActionPreflightContext,
): Promise<ActionPreflightFailure | null> {
  const validator = ACTION_PREFLIGHTS[action as ArtifactAction]
  if (!validator) return null
  return validator(data, context)
}

const CUSTOMER_SOURCE_ANCHOR_FIELDS = [
  'customer_source_identity_id',
  'customerSourceIdentityId',
  'source_identity',
  'sourceIdentity',
  'source_id',
  'sourceId',
  'source_url',
  'sourceUrl',
  'url',
  'conversation_id',
  'conversationId',
  'visitor_id',
  'visitorId',
  'telegram_chat_id',
  'telegramChatId',
  'meeting_id',
  'meetingId',
] as const

function customerSourceAnchorValue(
  data: Record<string, unknown>,
  context?: ActionPreflightContext,
): string {
  for (const field of CUSTOMER_SOURCE_ANCHOR_FIELDS) {
    const value = stringValue(data[field])
    if (value) return value
  }
  if (isRecord(data.metadata)) {
    for (const field of CUSTOMER_SOURCE_ANCHOR_FIELDS) {
      const value = stringValue(data.metadata[field])
      if (value) return value
    }
  }
  return parseConversationIdFromSessionKey(context?.sessionKey) ?? ''
}

function validateCustomerMemorySourcePreflight(
  data: Record<string, unknown>,
  context?: ActionPreflightContext,
): ActionPreflightFailure | null {
  const contactId = stringValue(data.contact_id ?? data.contactId)
  if (contactId || customerSourceAnchorValue(data, context)) return null
  return failure(
    'contact_id or durable source identity is required for Customer Brain memory',
    'CUSTOMER_MEMORY_SOURCE_REQUIRED',
  )
}

function validateAtlasSaveBrainContextPreflight(
  data: Record<string, unknown>,
  context?: ActionPreflightContext,
): ActionPreflightFailure | null {
  const targetBrain = stringValue(data.target_brain ?? data.targetBrain).toLowerCase()
  if (targetBrain !== 'customer') return null
  return validateCustomerMemorySourcePreflight(data, context)
}

function validateProposeCompanyBrainSignalPreflight(
  data: Record<string, unknown>,
): ActionPreflightFailure | null {
  const evidenceRefs = Array.isArray(data.evidence_refs)
    ? data.evidence_refs.filter((ref) => isRecord(ref))
    : []
  const hasSourceMetadata =
    stringValue(data.source) ||
    stringValue(data.source_type) ||
    stringValue(data.source_id) ||
    stringValue(data.source_url) ||
    stringValue(data.source_title) ||
    stringValue(data.title)
  if (evidenceRefs.length === 0 && !hasSourceMetadata) {
    return failure(
      'evidence_refs or source metadata are required for propose_company_brain_signal',
      'COMPANY_SIGNAL_EVIDENCE_REQUIRED',
    )
  }
  return null
}

function validateCreateCompanyBrainObjectPreflight(
  data: Record<string, unknown>,
): ActionPreflightFailure | null {
  const sourceSignalIds = Array.isArray(data.source_signal_ids)
    ? data.source_signal_ids.filter(
        (id): id is string => typeof id === 'string' && id.trim().length > 0,
      )
    : []
  if (sourceSignalIds.length === 0) {
    return failure(
      'source_signal_ids are required for create_company_brain_object',
      'COMPANY_OBJECT_SIGNAL_LINEAGE_REQUIRED',
    )
  }
  const evidenceRefs = Array.isArray(data.evidence_refs)
    ? data.evidence_refs.filter((ref) => isRecord(ref))
    : []
  if (evidenceRefs.length === 0) {
    return failure(
      'evidence_refs are required for create_company_brain_object',
      'COMPANY_OBJECT_EVIDENCE_REQUIRED',
    )
  }
  const retrievalRule = isRecord(data.retrieval_rule) ? data.retrieval_rule : null
  if (
    !retrievalRule ||
    !stringValue(retrievalRule.trigger) ||
    !stringValue(retrievalRule.context_form)
  ) {
    return failure(
      'retrieval_rule.trigger and retrieval_rule.context_form are required for create_company_brain_object',
      'COMPANY_OBJECT_RETRIEVAL_RULE_REQUIRED',
    )
  }
  return null
}

function validateDreamOpsSessionPreflight(
  _data: Record<string, unknown>,
  context?: ActionPreflightContext,
): ActionPreflightFailure | null {
  const session = parseDreamOpsSessionKey(context?.sessionKey)
  if (session?.mode === 'dream_ops' && session.agentKey === 'hr') return null
  return failure(
    'Dream Ops tools are only available inside Jaime HR dream_ops sessions.',
    'DREAM_OPS_SESSION_REQUIRED',
  )
}

function failure(error: string, code = 'ARTIFACT_ACTION_PREFLIGHT'): ActionPreflightFailure {
  return {
    error,
    errorCode: code,
    agentDiagnosis: 'The payload failed action-specific preflight before runtime work started.',
    agentInstruction:
      'Do not retry the same payload. Inspect describe_action output, correct the named field, and retry once.',
    correction: {
      summary: 'Correct the action-specific field named by preflight validation.',
      next_tool_preference: ['describe_action'],
    },
    observability: { fingerprint: 'artifact.action_preflight' },
  }
}

function validateMetaAdsInsightsPreflight(
  data: Record<string, unknown>,
): ActionPreflightFailure | null {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  const campaignId = stringValue(data.campaign_id ?? data.campaignId)
  if (campaignId && !uuid.test(campaignId)) {
    return {
      ...failure('campaign_id must be the active ROAS campaign UUID, never a Meta numeric ID'),
      agentInstruction:
        'Keep campaign_id as the active ROAS campaign UUID. For ad-set insights, pass the campaign-level response row.id as ad_campaign_id. Never pass row.meta_id in campaign_id.',
    }
  }

  const level = stringValue(data.level || 'campaign').toLowerCase()
  if (!['campaign', 'adset', 'ad'].includes(level)) {
    return failure('level must be campaign, adset, or ad')
  }
  if (level === 'adset') {
    const adCampaignId = stringValue(data.ad_campaign_id ?? data.adCampaignId)
    if (!adCampaignId || !uuid.test(adCampaignId)) {
      return {
        ...failure('ad_campaign_id must be the local UUID from the campaign-level response row.id'),
        agentInstruction:
          'Call campaign-level insights first, keep campaign_id as the active ROAS campaign UUID, then pass the selected response row.id as ad_campaign_id.',
      }
    }
  }
  if (level === 'ad') {
    const adSetId = stringValue(data.ad_set_id ?? data.adSetId)
    if (!adSetId || !uuid.test(adSetId)) {
      return {
        ...failure('ad_set_id must be the local UUID from the ad-set response row.id'),
        agentInstruction:
          'Call ad-set insights first, then pass the selected response row.id as ad_set_id. Never pass row.meta_id.',
      }
    }
  }

  const preset = stringValue(data.date_preset ?? data.datePreset)
  if (
    preset &&
    !['last_7d', 'last_14d', 'last_30d', 'previous_30d', 'this_month', 'last_month'].includes(
      preset,
    )
  ) {
    return failure('date_preset is unsupported; use exact start_date and end_date instead')
  }
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return null
}

function booleanValue(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === 1) return true
  if (value === 'false' || value === 0) return false
  return null
}

function requireString(data: Record<string, unknown>, key: string): ActionPreflightFailure | null {
  return stringValue(data[key]) ? null : failure(`${key} is required`)
}

function validateCreateContactPreflight(
  data: Record<string, unknown>,
): ActionPreflightFailure | null {
  const email = stringValue(data.email).toLowerCase()
  if (!email) return failure('email is required')
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? null
    : failure('email must be a valid email address')
}

const NOTE_CARD_TINTS = new Set([
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'slate',
])

function validateUpdateContactPreflight(
  data: Record<string, unknown>,
): ActionPreflightFailure | null {
  const replacesArrays =
    Object.prototype.hasOwnProperty.call(data, 'tags') ||
    Object.prototype.hasOwnProperty.call(data, 'custom_fields')
  if (!replacesArrays) return null

  return data.confirm_replace_arrays === true || data.confirmReplaceArrays === true
    ? null
    : failure(
        'confirm_replace_arrays must be true when update_contact replaces tags or custom_fields',
      )
}

function validateNoteTint(data: Record<string, unknown>): ActionPreflightFailure | null {
  if (
    !Object.prototype.hasOwnProperty.call(data, 'card_tint') &&
    !Object.prototype.hasOwnProperty.call(data, 'cardTint')
  ) {
    return null
  }
  const raw = data.card_tint ?? data.cardTint
  if (raw === null) return null
  const tint = stringValue(raw)
  if (!tint) return null
  return NOTE_CARD_TINTS.has(tint)
    ? null
    : failure(`card_tint must be one of: ${Array.from(NOTE_CARD_TINTS).join(', ')}`)
}

function validateAddContactNotePreflight(
  data: Record<string, unknown>,
): ActionPreflightFailure | null {
  if (!stringValue(data.content)) return failure('content is required')
  return validateNoteTint(data)
}

function validateUpdateContactNotePreflight(
  data: Record<string, unknown>,
): ActionPreflightFailure | null {
  const hasContent = Object.prototype.hasOwnProperty.call(data, 'content')
  const hasTint =
    Object.prototype.hasOwnProperty.call(data, 'card_tint') ||
    Object.prototype.hasOwnProperty.call(data, 'cardTint')
  if (!hasContent && !hasTint) return failure('content or card_tint is required')
  if (hasContent && !stringValue(data.content)) return failure('content cannot be empty')
  return validateNoteTint(data)
}

function requirePositiveNumber(
  data: Record<string, unknown>,
  key: string,
): ActionPreflightFailure | null {
  const value = numberValue(data[key])
  return value !== null && value > 0 ? null : failure(`${key} must be a positive number`)
}

function requireNumberInRange(
  data: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
): ActionPreflightFailure | null {
  const value = numberValue(data[key])
  return value !== null && value >= min && value <= max
    ? null
    : failure(`${key} must be between ${min} and ${max}`)
}

function requireInputs(
  data: Record<string, unknown>,
  min: number,
  max = 20,
): ActionPreflightFailure | null {
  const inputs = data.inputs
  if (!Array.isArray(inputs)) return failure('inputs must be an array')
  if (inputs.length < min || inputs.length > max) {
    return failure(`inputs must include between ${min} and ${max} items`)
  }
  const invalid = inputs.find((input) => !isRecord(input) || !stringValue(input.url))
  return invalid ? failure('each inputs item must include a non-empty url') : null
}

const PROCESS_MEDIA_OPERATIONS = new Set([
  'probe',
  'trim',
  'concat',
  'convert',
  'extract_audio',
  'add_audio',
  'resize',
  'compose',
  'audio_effect',
  'speed',
  'overlay',
  'crop',
  'thumbnail',
  'text_overlay',
  'transition',
  'color_grade',
  'blur',
  'vignette',
  'sharpen',
  'denoise',
  'reverse',
  'loop',
  'chroma_key',
  'split_screen',
  'subtitle_burn',
  'silence_remove',
  'frame_extract',
  'waveform',
  'render_validate_messaging',
  'render_ig_story',
  'render_static_ad',
])

const STATIC_AD_TEMPLATE_IDS = new Set([
  'hero_framing',
  'identity_callout',
  'case_study',
  'workshop_event',
  'tweet_receipt',
  'chat_receipt',
  'press_authority',
  'fake_news',
  'myth_vs_system',
  'offer_stack',
])

const AUDIO_EFFECTS = new Set([
  'reverb',
  'echo',
  'fade_in',
  'fade_out',
  'volume',
  'pitch',
  'normalize',
  'bass_boost',
  'speed',
])

const TRANSITIONS = new Set(['fade', 'dissolve', 'wipe', 'slide', 'zoom'])
const COLOR_PRESETS = new Set([
  'vintage',
  'lighter',
  'darker',
  'increase_contrast',
  'negative',
  'cross_process',
])

function validateProcessMediaPreflight(
  data: Record<string, unknown>,
): ActionPreflightFailure | null {
  const operation = stringValue(data.operation)
  if (!operation) return failure('operation is required')
  if (!PROCESS_MEDIA_OPERATIONS.has(operation)) {
    return failure(`operation must be one of: ${Array.from(PROCESS_MEDIA_OPERATIONS).join(', ')}`)
  }

  if (operation === 'probe') return requireString(data, 'url')
  if (operation === 'render_validate_messaging') {
    if (!Array.isArray(data.lines) || data.lines.length === 0 || data.lines.length > 8) {
      return failure('render_validate_messaging requires 1 to 8 lines')
    }
    if (!/^#[0-9a-f]{6}$/i.test(stringValue(data.brand_color))) {
      return failure('brand_color must be a six-digit hex color')
    }
    for (const field of ['brand_bg_light', 'brand_bg_dark'] as const) {
      const value = stringValue(data[field])
      if (value && !/^#[0-9a-f]{6}$/i.test(value)) {
        return failure(`${field} must be a six-digit hex color when provided`)
      }
    }
    const invalidIndex = data.lines.findIndex((input) => {
      if (!input || typeof input !== 'object' || Array.isArray(input)) return true
      const line = input as Record<string, unknown>
      const text = stringValue(line.text)
      const highlight = stringValue(line.highlight)
      return (
        !/^if\s+(?:you(?:'ve|'re| are)|your)\b/i.test(text) ||
        !highlight ||
        !text.toLowerCase().includes(highlight.toLowerCase())
      )
    })
    return invalidIndex === -1
      ? null
      : failure(
          `lines[${invalidIndex}] must contain identity-callout text and an exact highlight substring`,
        )
  }
  if (operation === 'render_ig_story') return validateIgStoryRenderPreflight(data)
  if (operation === 'render_static_ad') {
    const templateId = stringValue(data.template_id)
    if (!STATIC_AD_TEMPLATE_IDS.has(templateId)) {
      return failure('template_id must name one of the ten static-ad-book templates')
    }
    if (data.aspect_ratio !== '4:5' && data.aspect_ratio !== '9:16') {
      return failure('aspect_ratio must be 4:5 or 9:16')
    }
    if (!isRecord(data.spec) || Object.keys(data.spec).length === 0) {
      return failure('spec must be a non-empty object')
    }
    const invalidKey = Object.keys(data.spec).find((key) => !/^[A-Z][A-Z0-9_]*$/.test(key))
    return invalidKey ? failure(`spec key ${invalidKey} must be an uppercase template token`) : null
  }
  if (operation === 'trim')
    return requireString(data, 'url') ?? requirePositiveNumber(data, 'duration_seconds')
  if (operation === 'concat') return requireInputs(data, 2)
  if (operation === 'convert') return requireString(data, 'url')
  if (operation === 'extract_audio') return requireString(data, 'url')
  if (operation === 'add_audio')
    return requireString(data, 'video_url') ?? requireString(data, 'audio_url')
  if (operation === 'resize') {
    const resolution = stringValue(data.resolution)
    return (
      requireString(data, 'url') ??
      (/^\d+x\d+$/.test(resolution) ? null : failure('resolution must use WIDTHxHEIGHT format'))
    )
  }
  if (operation === 'compose') return requireInputs(data, 1)
  if (operation === 'audio_effect') {
    const effect = stringValue(data.effect)
    return (
      requireString(data, 'url') ??
      (AUDIO_EFFECTS.has(effect) ? null : failure('effect is not supported for audio_effect'))
    )
  }
  if (operation === 'speed') {
    return requireString(data, 'url') ?? requireNumberInRange(data, 'factor', 0.01, 100)
  }
  if (operation === 'overlay')
    return requireString(data, 'url') ?? requireString(data, 'overlay_url')
  if (operation === 'crop') {
    return (
      requireString(data, 'url') ??
      requirePositiveNumber(data, 'width') ??
      requirePositiveNumber(data, 'height')
    )
  }
  if (operation === 'thumbnail') {
    const timestamp = numberValue(data.timestamp)
    return (
      requireString(data, 'url') ??
      (timestamp !== null && timestamp >= 0 ? null : failure('timestamp must be zero or greater'))
    )
  }
  if (operation === 'text_overlay') return requireString(data, 'url') ?? requireString(data, 'text')
  if (operation === 'transition') {
    const transition = stringValue(data.transition)
    return (
      requireString(data, 'url') ??
      requireString(data, 'url2') ??
      (TRANSITIONS.has(transition) ? null : failure('transition is not supported')) ??
      requireNumberInRange(data, 'duration', 0.01, 5)
    )
  }
  if (operation === 'color_grade') {
    const preset = stringValue(data.preset)
    const hasAdjustment = [
      'brightness',
      'contrast',
      'saturation',
      'gamma',
      'hue',
      'temperature',
      'preset',
    ].some((key) => data[key] !== undefined && data[key] !== null)
    return (
      requireString(data, 'url') ??
      (hasAdjustment ? null : failure('color_grade requires at least one adjustment or preset')) ??
      (preset && !COLOR_PRESETS.has(preset) ? failure('preset is not supported') : null)
    )
  }
  if (operation === 'blur')
    return requireString(data, 'url') ?? requirePositiveNumber(data, 'strength')
  if (operation === 'vignette')
    return requireString(data, 'url') ?? requirePositiveNumber(data, 'angle')
  if (operation === 'sharpen')
    return requireString(data, 'url') ?? requirePositiveNumber(data, 'amount')
  if (operation === 'denoise')
    return requireString(data, 'url') ?? requirePositiveNumber(data, 'strength')
  if (operation === 'reverse') return requireString(data, 'url')
  if (operation === 'loop')
    return requireString(data, 'url') ?? requireNumberInRange(data, 'count', 2, 20)
  if (operation === 'chroma_key')
    return requireString(data, 'url') ?? requireString(data, 'background_url')
  if (operation === 'split_screen') return requireInputs(data, 2, 4)
  if (operation === 'subtitle_burn') {
    return (
      requireString(data, 'url') ??
      (stringValue(data.subtitle_content) || stringValue(data.subtitle_url)
        ? null
        : failure('subtitle_content or subtitle_url is required'))
    )
  }
  if (operation === 'silence_remove') return requireString(data, 'url')
  if (operation === 'frame_extract') {
    return (
      requireString(data, 'url') ??
      requirePositiveNumber(data, 'interval_seconds') ??
      (data.max_frames === undefined ? null : requireNumberInRange(data, 'max_frames', 1, 50))
    )
  }
  if (operation === 'waveform') {
    return (
      requireString(data, 'url') ??
      (data.width === undefined ? null : requirePositiveNumber(data, 'width')) ??
      (data.height === undefined ? null : requirePositiveNumber(data, 'height'))
    )
  }
  return null
}

function validateAnalyzeVideoPreflight(
  data: Record<string, unknown>,
): ActionPreflightFailure | null {
  const mediaUrl =
    stringValue(data.media_url) ||
    stringValue(data.file_url) ||
    stringValue(data.url) ||
    stringValue(data.video_url)
  if (!mediaUrl) return failure('media_url is required for analyze_video')

  const extractFrames = booleanValue(data.extract_frames)
  const transcribe = booleanValue(data.transcribe)
  if (extractFrames === false && transcribe === false) {
    return failure('extract_frames and transcribe cannot both be false')
  }

  if (data.frame_count !== undefined) {
    const frameCount = numberValue(data.frame_count)
    if (
      frameCount === null ||
      frameCount < 1 ||
      frameCount > 200 ||
      !Number.isInteger(frameCount)
    ) {
      return failure('frame_count must be an integer between 1 and 200')
    }
  }
  if (data.frame_interval_seconds !== undefined) {
    return requirePositiveNumber(data, 'frame_interval_seconds')
  }
  return null
}

function validateTranscribeAudioPreflight(
  data: Record<string, unknown>,
): ActionPreflightFailure | null {
  const mediaUrl =
    stringValue(data.media_url) ||
    stringValue(data.file_url) ||
    stringValue(data.url) ||
    stringValue(data.audio_url) ||
    stringValue(data.video_url)
  return mediaUrl ? null : failure('media_url is required for transcribe_audio')
}

async function validateUseIntegrationPreflight(
  data: Record<string, unknown>,
  context?: ActionPreflightContext,
): Promise<ActionPreflightFailure | null> {
  const service = canonicalizeIntegrationId(stringValue(data.service))
  if (!service) return failure('service is required')
  const actionSlug = stringValue(data.integration_action)
  if (!actionSlug) return failure('integration_action is required')
  const params = data.params
  if (params !== undefined && !isRecord(params)) return failure('params must be an object')

  const host = context?.host
  if (!host?.integrationsRepository || typeof host.getUserClient !== 'function') return null

  try {
    const userId = String(host.resolveUserId?.(context?.sessionKey) ?? '').trim()
    const supabase = await host.getUserClient(userId, context?.sessionKey as string)
    const agentDomain =
      typeof host.resolveAgentDomain === 'function'
        ? await host.resolveAgentDomain(context?.sessionKey)
        : null
    const capabilities = await host.integrationsRepository.listDetailedCapabilities(supabase, {
      integrationId: service,
      domain: agentDomain,
    })
    if (capabilities.error) return failure(capabilities.error.message)
    const rows = Array.isArray(capabilities.data) ? capabilities.data : []
    if (rows.length > 0) {
      const capability = rows.find((row) => stringValue(row.action_slug) === actionSlug)
      if (!capability) {
        return failure(
          `${actionSlug} is not available for ${service}. Call get_integration and use an exact action_slug.`,
        )
      }
      const missing = extractRequiredCapabilityParams(capability.parameters).filter(
        (param) => !isPresent((params as Record<string, unknown> | undefined)?.[param]),
      )
      if (missing.length > 0) {
        return failure(`params.${missing.join(', params.')} required for ${service}.${actionSlug}`)
      }
    }

    const composioConfig =
      typeof host.resolveComposioConfig === 'function'
        ? await host.resolveComposioConfig(service, '')
        : null
    if (composioConfig?.execution_mode === 'composio') {
      const orgId =
        typeof host.resolveOrgId === 'function' ? host.resolveOrgId(context?.sessionKey) : null
      const statusRows = await host.integrationsRepository.listIntegrationStatusRows(supabase, {
        integrationId: service,
        userId,
        orgId,
      })
      if (statusRows.error) return failure(statusRows.error.message)
      const rowsForStatus = Array.isArray(statusRows.data) ? statusRows.data : []
      const connected = rowsForStatus.some((row) => {
        const status = stringValue(row.status).toLowerCase()
        return status === 'connected' && row.agent_enabled !== false
      })
      if (!connected) {
        return failure(`${service} is not connected or enabled for agent use`)
      }
    }
  } catch {
    return null
  }

  return null
}

async function validateUseMcpToolPreflight(
  data: Record<string, unknown>,
  context?: ActionPreflightContext,
): Promise<ActionPreflightFailure | null> {
  const args = data.arguments ?? data.args ?? {}
  if (!isRecord(args)) return failure('arguments must be an object')
  const toolName = stringValue(data.tool_name ?? data.tool)
  if (!toolName) return failure('tool_name is required')

  const host = context?.host
  const artifactMcpService = host?.artifactMcpService
  const mcpConfig = artifactMcpService?.mcpConfig
  const mcpTool = artifactMcpService?.mcpTool
  const mcpRepository = artifactMcpService?.artifactMcpRepository
  if (!host || !mcpConfig || !mcpTool || !mcpRepository) return null

  try {
    const userId = host.resolveUserId(context?.sessionKey)
    const supabase = await host.getUserClient(userId, context?.sessionKey as string)
    const projectId = await mcpRepository.findFirstProjectId(supabase)
    if (!projectId) return failure('No project context')

    const serverName = stringValue(data.server_name)
    const serverId = stringValue(data.server_id)
    const server = serverId
      ? await mcpConfig.getServer(supabase, serverId)
      : serverName
        ? await mcpConfig.getServerByName(supabase, projectId, serverName)
        : null
    if (!server) return failure('MCP server not found')
    if (!server.enabled || !server.agent_enabled) return failure('MCP server is disabled')

    const cachedTools = Array.isArray(server.cached_tools) ? server.cached_tools : []
    const tools =
      cachedTools.length > 0
        ? cachedTools
        : await mcpTool.listTools(server, supabase, await mcpConfig.getAuthToken(supabase, server))
    const tool = tools.find(
      (candidate: Record<string, unknown>) => stringValue(candidate.name) === toolName,
    )
    if (!tool) return failure(`${toolName} is not available on MCP server ${server.name}`)

    const schemaError = validateJsonSchemaArgs(tool.inputSchema, args)
    if (schemaError) return failure(schemaError)
  } catch {
    return null
  }

  return null
}

function isPresent(value: unknown): boolean {
  return !(
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  )
}

function extractRequiredCapabilityParams(value: unknown): string[] {
  if (!isRecord(value)) return []
  if (Array.isArray(value.required)) {
    return value.required.filter((entry): entry is string => typeof entry === 'string')
  }
  const properties = isRecord(value.properties) ? value.properties : {}
  const direct = Object.entries(properties)
    .filter(([, property]) => isRecord(property) && property.required === true)
    .map(([key]) => key)
  if (direct.length > 0) return direct
  if (Array.isArray(value.parameters)) {
    return value.parameters
      .filter(
        (entry) => isRecord(entry) && entry.required === true && typeof entry.name === 'string',
      )
      .map((entry) => String(entry.name))
  }
  return []
}

function validateJsonSchemaArgs(schema: unknown, args: Record<string, unknown>): string | null {
  if (!isRecord(schema)) return null
  return validateJsonSchemaValue(schema, args, 'arguments')
}

function validateJsonSchemaValue(
  schema: Record<string, unknown>,
  value: unknown,
  path: string,
): string | null {
  const required = Array.isArray(schema.required)
    ? schema.required.filter((entry): entry is string => typeof entry === 'string')
    : []
  if (isRecord(value)) {
    for (const key of required) {
      if (!isPresent(value[key])) return `${path}.${key} is required by MCP inputSchema`
    }
  }

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type
  if (type === 'object' && !isRecord(value)) return `${path} must be an object`
  if (type === 'array' && !Array.isArray(value)) return `${path} must be an array`
  if (type === 'string' && typeof value !== 'string') return `${path} must be a string`
  if (type === 'number' && typeof value !== 'number') return `${path} must be a number`
  if (type === 'integer' && (!Number.isInteger(value) || typeof value !== 'number')) {
    return `${path} must be an integer`
  }
  if (type === 'boolean' && typeof value !== 'boolean') return `${path} must be a boolean`

  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    return `${path} must be one of ${schema.enum.map(String).join(', ')}`
  }

  const properties = isRecord(schema.properties) ? schema.properties : {}
  if (isRecord(value)) {
    if (schema.additionalProperties === false) {
      const unknown = Object.keys(value).find(
        (key) => !Object.prototype.hasOwnProperty.call(properties, key),
      )
      if (unknown) return `${path}.${unknown} is not allowed by MCP inputSchema`
    }
    for (const [key, childSchema] of Object.entries(properties)) {
      if (value[key] === undefined || !isRecord(childSchema)) continue
      const error = validateJsonSchemaValue(childSchema, value[key], `${path}.${key}`)
      if (error) return error
    }
  }

  if (Array.isArray(value) && isRecord(schema.items)) {
    for (let index = 0; index < value.length; index += 1) {
      const error = validateJsonSchemaValue(schema.items, value[index], `${path}[${index}]`)
      if (error) return error
    }
  }

  return null
}
