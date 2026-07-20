import type { ChatScope } from '@vibey/api-shared'
import { VALID_ACTIONS } from '../dtos/artifact-action.dto'

export type ArtifactAction = (typeof VALID_ACTIONS)[number]

export type ArtifactActionHandler = (
  data: Record<string, unknown>,
  sessionKey?: string,
  onProgress?: (message: string) => void | Promise<void>,
) => Promise<unknown> | unknown

export type ArtifactActionScopeMode = 'auto' | 'global'

export interface ArtifactActiveFlowBuild {
  sessionId?: string | null
  spaceId?: string | null
  targetAutomationId?: string | null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function normalizeScopeId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function describeScope(scope: ChatScope): string {
  const label =
    scope.scope_kind === 'personal'
      ? 'personal space'
      : scope.scope_kind === 'campaign'
        ? 'campaign space'
        : scope.scope_kind === 'shared_space'
          ? 'shared space'
          : scope.scope_kind
  return `${label} (space_id=${scope.space_id ?? 'none'}, campaign_id=${scope.campaign_id ?? 'none'})`
}

const GLOBAL_SCOPE_ACTIONS = new Set<string>([
  'save_user_memory',
  'search_user_brain',
  'search_brain_context',
  'ingest_user_brain_link',
  'ingest_user_brain_text',
  'ingest_user_brain_document',
  'ingest_agent_brain_text',
  'ingest_agent_brain_link',
  'resolve_agent_brain',
  'search_agent_brain',
  'list_available_brain_scopes',
  'list_user_brain_memories',
  'list_agent_brain_domains',
  'get_agent_brain_gaps',
  'list_agent_brain_imports',
  'crystallize_user_brain',
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
  'create_agent_skill',
  'update_agent_skill',
  'delete_agent_skill',
  'create_agent_skill_resource',
  'update_agent_skill_resource',
  'delete_agent_skill_resource',
  'copy_skill_resource',
  'upload_skill_asset',
  'list_mcp_servers',
  'list_mcp_tools',
  'use_mcp_tool',
  'add_mcp_server',
  'remove_mcp_server',
  'list_mcp_resources',
  'read_mcp_resource',
  'send_user_message',
  'ask_agent',
  'delegate_to_agent',
  'approve_agent_hire',
  'brainstorm_agents',
  'discover_channel_context',
  'set_channel_context',
  'dream_inspect_agent',
  'dream_search_evidence',
  'dream_propose_skill_create',
  'dream_propose_skill_update',
  'dream_propose_skill_resource_update',
  'dream_propose_agent_file_update',
  'dream_route_out',
  'dream_finish',
])

const READ_ONLY_CROSS_SCOPE_ACTIONS = new Set<string>([
  'list_spaces',
  'get_space',
  'search_space_context',
  'list_space_views',
  'get_space_view',
  'list_space_view_items',
  'get_space_item',
  'list_tasks',
  'get_task',
  // Client package knowledge must be readable even when the Team chat is stuck on General.
  'search_campaign_brain',
  'list_available_brain_scopes',
])

export function getActionScopeMode(action: string): ArtifactActionScopeMode {
  return GLOBAL_SCOPE_ACTIONS.has(action) ? 'global' : 'auto'
}

export function parseConversationIdFromSessionKey(sessionKey?: string): string | null {
  if (!sessionKey) return null
  let base = sessionKey
  const dblIdx = base.indexOf('::')
  if (dblIdx !== -1) base = base.substring(0, dblIdx)
  const matches = base.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)
  if (!matches?.length) return null
  const n = matches.length
  // Delegation keys end with :conversationId:delegationId (both UUIDs); conversation is second-to-last.
  // Chat keys are ...-userId-conversationId with optional org UUID(s) in gatewayAgentId — conversation is always last.
  if (base.includes(':delegation:')) {
    if (n < 2) return null
    return matches[n - 2] ?? null
  }
  return matches[n - 1] ?? null
}

function parseScopeIdFromSessionKey(sessionKey: string | undefined, marker: 'campaign' | 'space') {
  if (!sessionKey) return null
  const token = `::${marker}:`
  if (!sessionKey.includes(token)) return null
  const after = sessionKey.split(token)[1]?.trim()
  const segment = after?.includes('::') ? after.split('::')[0] : after
  return segment && UUID_RE.test(segment) ? segment : null
}

export function resolveActionScope(
  target: Record<string, any>,
  sessionKey?: string,
): ChatScope | null {
  const conversationId = parseConversationIdFromSessionKey(sessionKey)
  const requestScope =
    conversationId && typeof target.requestContext?.getScope === 'function'
      ? target.requestContext.getScope(conversationId)
      : null
  if (requestScope) return requestScope

  const spaceId = parseScopeIdFromSessionKey(sessionKey, 'space')
  const campaignId = parseScopeIdFromSessionKey(sessionKey, 'campaign')
  if (!spaceId && !campaignId) return null
  return {
    space_id: spaceId,
    campaign_id: campaignId,
    scope_kind: campaignId ? 'campaign' : spaceId ? 'personal' : 'unknown',
    org_id: typeof target.resolveOrgId === 'function' ? target.resolveOrgId(sessionKey) : null,
  }
}

export function withScopeDefaults(
  action: string,
  data: Record<string, unknown>,
  scope: ChatScope | null,
): Record<string, unknown> {
  if (!scope || getActionScopeMode(action) === 'global') return data
  const next = { ...data }
  if (next.space_id === undefined && scope.space_id) next.space_id = scope.space_id
  if (next.campaign_id === undefined && scope.campaign_id) next.campaign_id = scope.campaign_id
  return next
}

export function parseBrainOpsTargetBrainIdFromSessionKey(sessionKey?: string): string | null {
  if (!sessionKey || !sessionKey.includes(':brain_ops:')) return null
  const token = '::brain:'
  if (!sessionKey.includes(token)) return null
  const after = sessionKey.split(token)[1]?.trim()
  const segment = after?.includes('::') ? after.split('::')[0] : after
  return segment && UUID_RE.test(segment) ? segment : null
}

export type DreamOpsSessionContext = {
  mode: 'dream_ops'
  agentKey: string
  userId: string
  runId: string
  orgId: string
}

export function parseDreamOpsSessionKey(sessionKey?: string): DreamOpsSessionContext | null {
  if (!sessionKey || !sessionKey.includes(':dream_ops:')) return null
  const base = sessionKey.split('::')[0] ?? ''
  const parts = base.split(':')
  if (parts.length < 6 || parts[0] !== 'agent' || parts[2] !== 'dream_ops') return null

  const agentKey = parts[3]?.trim()
  const userId = parts[4]?.trim()
  const runId = parts[5]?.trim()
  const orgToken = '::org:'
  const orgId = sessionKey.includes(orgToken)
    ? sessionKey.split(orgToken)[1]?.split('::')[0]?.trim()
    : ''
  if (!agentKey || !userId || !runId || !orgId) return null
  return { mode: 'dream_ops', agentKey, userId, runId, orgId }
}

export function withBrainOpsActionDefaults(
  action: string,
  data: Record<string, unknown>,
  sessionKey?: string,
): Record<string, unknown> {
  const brainScopedActions = new Set([
    'save_customer_memory',
    'get_brain_timelines',
    'get_brain_timeline_items',
    'create_brain_timeline',
    'upsert_brain_timeline_items',
    'archive_brain_timeline',
  ])
  if (!brainScopedActions.has(action)) return data
  const targetBrainId = parseBrainOpsTargetBrainIdFromSessionKey(sessionKey)
  if (!targetBrainId) return data
  return { ...data, brain_id: targetBrainId }
}

const FLOW_BUILD_SESSION_ACTIONS = new Set<string>([
  'create_flow_clarification',
  'update_flow_plan',
  'answer_flow_clarification',
  'validate_flow_plan',
  'compile_flow_plan',
  'evaluate_flow_plan',
])

export function withFlowBuildDefaults(
  action: string,
  data: Record<string, unknown>,
  activeBuild: ArtifactActiveFlowBuild | null,
): Record<string, unknown> {
  if (!activeBuild || !FLOW_BUILD_SESSION_ACTIONS.has(action)) return data
  const next = { ...data }
  if (next.session_id === undefined && activeBuild.sessionId) {
    next.session_id = activeBuild.sessionId
  }
  if (next.space_id === undefined && activeBuild.spaceId) {
    next.space_id = activeBuild.spaceId
  }
  if (next.target_automation_id === undefined && activeBuild.targetAutomationId) {
    next.target_automation_id = activeBuild.targetAutomationId
  }
  return next
}

export function validateScopeForAction(
  action: string,
  data: Record<string, unknown>,
  scope: ChatScope | null,
): { ok: true } | { ok: false; error: string } {
  if (!scope || getActionScopeMode(action) === 'global') return { ok: true }
  if (!scope.space_id && !scope.campaign_id) return { ok: true }
  if (data.scope_override === true) return { ok: true }

  const declaredSpace = normalizeScopeId(data.space_id)
  const declaredCampaign = normalizeScopeId(data.campaign_id)
  const spaceMismatch = declaredSpace !== null && declaredSpace !== scope.space_id
  const campaignMismatch = declaredCampaign !== null && declaredCampaign !== scope.campaign_id
  if (!spaceMismatch && !campaignMismatch) return { ok: true }
  if (READ_ONLY_CROSS_SCOPE_ACTIONS.has(action)) return { ok: true }

  return {
    ok: false,
    error:
      `Scope mismatch. The user is currently in ${describeScope(scope)}. ` +
      `You sent space_id=${declaredSpace ?? 'none'}, campaign_id=${declaredCampaign ?? 'none'}. ` +
      'Either omit those fields (they default to the active scope) or pass scope_override:true ' +
      'if the user explicitly asked for a different scope.',
  }
}

export const ACTION_METHOD_MAP: Record<ArtifactAction, string> = {
  describe_action: 'describeAction',
  search_vibey_docs: 'searchVibeyDocs',
  create_offer: 'createOffer',
  update_offer_step: 'updateOfferStep',
  get_offer: 'getOffer',
  list_offers: 'listOffers',
  delete_offer: 'deleteOffer',
  list_custom_fields: 'listCustomFields',
  create_ad: 'createAd',
  update_ad: 'updateAd',
  patch_ad: 'patchAd',
  list_ads: 'listAds',
  get_ad: 'getAd',
  delete_ad: 'deleteAd',
  create_ad_campaign: 'createAdCampaign',
  create_ad_set: 'createAdSet',
  get_ad_campaign: 'getAdCampaign',
  get_ad_set: 'getAdSet',
  update_ad_campaign: 'updateAdCampaignOnMeta',
  update_ad_set: 'updateAdSetOnMeta',
  create_funnel: 'createFunnel',
  add_funnel_page: 'addFunnelPage',
  update_funnel_page: 'updateFunnelPage',
  set_website_layout: 'setWebsiteLayout',
  get_funnel: 'getFunnel',
  list_funnels: 'listFunnels',
  delete_funnel: 'deleteFunnel',
  list_forms: 'listForms',
  get_form: 'getForm',
  create_form: 'createForm',
  update_form: 'updateForm',
  attach_form_asset: 'attachFormAsset',
  publish_form: 'publishForm',
  unpublish_form: 'unpublishForm',
  list_form_responses: 'listFormResponses',
  list_funnel_files: 'listFunnelFiles',
  read_funnel_file: 'readFunnelFile',
  write_funnel_file: 'writeFunnelFile',
  patch_funnel_file: 'patchFunnelFile',
  delete_funnel_file: 'deleteFunnelFile',
  list_funnel_assets: 'listFunnelAssets',
  attach_funnel_asset: 'attachFunnelAsset',
  detach_funnel_asset: 'detachFunnelAsset',
  apply_funnel_element_edit: 'applyFunnelElementEdit',
  add_funnel_anchor: 'addFunnelAnchor',
  extract_funnel_tweaks: 'extractFunnelTweaks',
  update_funnel_tweaks: 'updateFunnelTweaks',
  create_website: 'createWebsite',
  add_website_page: 'addWebsitePage',
  update_website_page: 'updateWebsitePage',
  get_website: 'getWebsite',
  list_websites: 'listWebsites',
  delete_website: 'deleteWebsite',
  create_presentation: 'createPresentation',
  update_presentation: 'updatePresentation',
  patch_presentation: 'patchPresentation',
  update_presentation_slide: 'updatePresentationSlide',
  add_presentation_slide: 'addPresentationSlide',
  list_presentations: 'listPresentations',
  get_presentation: 'getPresentation',
  delete_presentation: 'deletePresentation',
  list_presentation_files: 'listPresentationFiles',
  read_presentation_file: 'readPresentationFile',
  write_presentation_file: 'writePresentationFile',
  patch_presentation_file: 'patchPresentationFile',
  delete_presentation_file: 'deletePresentationFile',
  show_presentation_file: 'readPresentationFile',
  list_presentation_assets: 'listPresentationAssets',
  attach_presentation_asset: 'attachPresentationAsset',
  detach_presentation_asset: 'detachPresentationAsset',
  apply_presentation_element_edit: 'applyPresentationElementEdit',
  add_presentation_anchor: 'addPresentationAnchor',
  extract_presentation_tweaks: 'extractPresentationTweaks',
  update_presentation_tweaks: 'updatePresentationTweaks',
  create_sequence: 'createSequence',
  add_sequence_email: 'addSequenceEmail',
  update_sequence_email: 'updateSequenceEmail',
  get_sequence: 'getSequence',
  get_sequence_email: 'getSequenceEmail',
  update_sequence: 'updateSequence',
  list_sequences: 'listSequences',
  delete_sequence: 'deleteSequence',
  delete_sequence_email: 'deleteSequenceEmail',
  prepare_email_send: 'prepareEmailSend',
  prepare_sequence_send: 'prepareSequenceSend',
  create_avatar: 'createAvatar',
  get_avatar: 'getAvatar',
  update_avatar: 'updateAvatar',
  list_avatars: 'listAvatars',
  delete_avatar: 'deleteAvatar',
  create_theme: 'createTheme',
  list_themes: 'listThemes',
  get_theme: 'getTheme',
  update_theme: 'updateTheme',
  delete_theme: 'deleteTheme',
  extract_website_theme: 'extractWebsiteTheme',
  create_project: 'createProject',
  get_project: 'getProject',
  list_projects: 'listProjects',
  create_file: 'createFile',
  update_file: 'updateFile',
  read_file: 'readFile',
  read_document: 'readDocument',
  delete_file: 'deleteFile',
  list_project_files: 'listProjectFiles',
  update_project_deps: 'updateProjectDeps',
  import_github_repo: 'importGithubRepo',
  get_project_logs: 'getProjectLogs',
  restart_project: 'restartProject',
  fetch_project_url: 'fetchProjectUrl',
  patch_file: 'patchFile',
  search_project_files: 'searchProjectFiles',
  list_project_directory: 'listProjectDirectory',
  get_project_errors: 'getProjectErrors',
  define_object_type: 'defineObjectType',
  list_object_types: 'listObjectTypes',
  get_object_type: 'getObjectType',
  update_object_type: 'updateObjectType',
  create_object: 'createObject',
  update_object: 'updateObject',
  list_objects: 'listObjects',
  get_object: 'getObject',
  delete_object: 'deleteObject',
  list_agent_skills: 'listAgentSkills',
  create_agent_skill: 'createAgentSkill',
  update_agent_skill: 'updateAgentSkill',
  delete_agent_skill: 'deleteAgentSkill',
  create_agent_skill_resource: 'createAgentSkillResource',
  update_agent_skill_resource: 'updateAgentSkillResource',
  delete_agent_skill_resource: 'deleteAgentSkillResource',
  copy_skill_resource: 'copySkillResource',
  upload_skill_asset: 'uploadSkillAsset',
  save_document: 'saveDocument',
  list_emails: 'listEmails',
  save_email: 'saveEmail',
  get_email: 'getEmail',
  update_email: 'updateEmail',
  delete_email: 'deleteEmail',
  create_pdf: 'createPdf',
  create_docx: 'createDocx',
  list_documents: 'listDocuments',
  get_document: 'getDocument',
  read_space_document: 'readSpaceDocument',
  update_document: 'updateDocument',
  delete_document: 'deleteDocument',
  patch_state: 'patchState',
  check_meta_connection: 'checkMetaConnection',
  check_integration_connection: 'checkIntegrationConnection',
  list_meta_ad_accounts: 'listMetaAdAccounts',
  list_meta_pages: 'listMetaPages',
  publish_ad_to_meta: 'publishAdToMeta',
  save_meta_defaults: 'saveMetaDefaults',
  get_meta_ad_status: 'getMetaAdStatus',
  get_meta_ads_insights: 'getMetaAdsInsights',
  get_delivery_estimate: 'getDeliveryEstimate',
  list_meta_audiences: 'listMetaAudiences',
  create_meta_custom_audience: 'createMetaCustomAudience',
  create_meta_lookalike_audience: 'createMetaLookalikeAudience',
  list_meta_pixel_events: 'listMetaPixelEvents',
  create_meta_pixel_event: 'createMetaPixelEvent',
  get_capabilities: 'getIntegrationCapabilities',
  use_integration: 'useIntegration',
  get_integration: 'getIntegration',
  search_available_integrations: 'searchAvailableIntegrations',
  initiate_integration_connect: 'initiateIntegrationConnect',
  list_calendar_events: 'listCalendarEvents',
  create_calendar_event: 'createCalendarEvent',
  update_calendar_event: 'updateCalendarEvent',
  delete_calendar_event: 'deleteCalendarEvent',
  get_media_generation_status: 'getMediaGenerationStatus',
  generate_image: 'generateImage',
  edit_image: 'editImage',
  list_canvas_nodes: 'listCanvasNodes',
  generate_ad_set: 'generateAdSet',
  generate_video: 'generateVideo',
  get_video_status: 'getVideoStatus',
  analyze_video: 'analyzeVideo',
  transcribe_audio: 'transcribeAudio',
  analyze_image: 'analyzeImage',
  extract_url_transcript: 'extractUrlTranscript',
  list_spaces: 'listSpaces',
  search_space_context: 'searchSpaceContext',
  generate_visual_html: 'generateVisualHtml',
  get_space: 'getSpace',
  list_space_views: 'listSpaceViews',
  get_space_view: 'getSpaceView',
  list_space_view_items: 'listSpaceViewItems',
  get_space_item: 'getSpaceItem',
  create_space_field: 'createSpaceField',
  update_space_field: 'updateSpaceField',
  append_space_field_option: 'appendSpaceFieldOption',
  create_space_status: 'createSpaceStatus',
  create_space_category: 'createSpaceCategory',
  create_space_tag: 'createSpaceTag',
  create_space_view: 'createSpaceView',
  update_space_view: 'updateSpaceView',
  run_social_research_search: 'runSocialResearchSearch',
  run_ads_research_search: 'runAdsResearchSearch',
  search_ads_research_advertisers: 'searchAdsResearchAdvertisers',
  list_contacts: 'listContacts',
  get_contact: 'getContact',
  create_contact: 'createContact',
  update_contact: 'updateContact',
  add_contact_note: 'addContactNote',
  update_contact_note: 'updateContactNote',
  get_contact_activity: 'getContactActivity',
  list_contact_communications: 'listContactCommunications',
  list_tasks: 'listTasks',
  get_task: 'getTask',
  create_task: 'createTask',
  update_task: 'updateTask',
  delete_task: 'deleteTask',
  add_task_comment: 'addTaskComment',
  search_flow_capabilities: 'searchFlowCapabilities',
  get_flow_capability: 'getFlowCapability',
  list_flows: 'listFlows',
  get_flow: 'getFlow',
  create_flow_draft: 'createFlowDraft',
  update_flow_draft: 'updateFlowDraft',
  validate_flow_draft: 'validateFlowDraft',
  publish_flow: 'publishFlow',
  get_flow_build_context: 'getFlowBuildContext',
  create_flow_clarification: 'createFlowClarification',
  create_flow_plan: 'createFlowPlan',
  update_flow_plan: 'updateFlowPlan',
  answer_flow_clarification: 'answerFlowClarification',
  validate_flow_plan: 'validateFlowPlan',
  compile_flow_plan: 'compileFlowPlan',
  list_flow_blueprints: 'listFlowBlueprints',
  get_flow_blueprint: 'getFlowBlueprint',
  create_flow_blueprint_draft: 'createFlowBlueprintDraft',
  validate_flow_blueprint: 'validateFlowBlueprint',
  activate_flow_blueprint: 'activateFlowBlueprint',
  evaluate_flow_plan: 'evaluateFlowPlan',
  create_mission: 'createMission',
  list_missions: 'listMissions',
  get_mission: 'getMission',
  get_mission_plan: 'getMissionPlan',
  get_mission_logs: 'getMissionLogs',
  get_mission_deliverables: 'getMissionDeliverables',
  compile_webinar_launch_bible: 'compileWebinarLaunchBible',
  update_mission: 'updateMission',
  add_mission_comment: 'addMissionComment',
  list_mission_subtasks: 'listMissionSubtasks',
  update_mission_subtask: 'updateMissionSubtask',
  retry_mission: 'retryMission',
  trash_mission: 'trashMission',
  answer_mission_question: 'answerMissionQuestion',
  summarize_mission_state: 'summarizeMissionState',
  attach_mission_context: 'attachMissionContext',
  show_mission_deliverable: 'showMissionDeliverable',
  create_mission_subtask: 'createMissionSubtask',
  edit_mission_subtask: 'editMissionSubtask',
  cancel_mission_subtask: 'cancelMissionSubtask',
  retry_mission_subtask: 'retryMissionSubtask',
  reassign_mission_subtask: 'reassignMissionSubtask',
  prepare_mission_replan: 'prepareMissionReplan',
  approve_mission: 'approveMission',
  create_agent: 'hrCreateAgent',
  get_agent: 'hrGetAgent',
  update_agent: 'hrUpdateAgent',
  list_team: 'hrListTeam',
  audit_team_agents_and_skills: 'auditTeamAgentsAndSkills',
  compare_team_skill_coverage: 'compareTeamSkillCoverage',
  summarize_agent_capabilities: 'summarizeAgentCapabilities',
  list_campaign_team: 'listCampaignTeam',
  assign_agent_to_campaign: 'assignAgentToCampaign',
  unassign_agent_from_campaign: 'unassignAgentFromCampaign',
  save_user_memory: 'saveMemory',
  atlas_save_brain_context: 'atlasSaveBrainContext',
  search_user_brain: 'searchMemory',
  search_brain_context: 'searchBrainContext',
  update_campaign_context: 'updateCampaignContext',
  create_awareness_point: 'createAwarenessPoint',
  update_awareness: 'updateAwareness',
  create_social_post: 'createSocialPost',
  schedule_social_post: 'scheduleSocialPost',
  update_social_post: 'updateSocialPost',
  list_social_posts: 'listSocialPosts',
  get_social_post: 'getSocialPost',
  delete_social_post: 'deleteSocialPost',
  publish_social_post: 'publishSocialPost',
  create_blog_post: 'createBlogPost',
  update_blog_post: 'updateBlogPost',
  list_blog_posts: 'listBlogPosts',
  get_blog_post: 'getBlogPost',
  delete_blog_post: 'deleteBlogPost',
  get_social_post_template: 'getSocialPostTemplate',
  list_social_post_templates: 'listSocialPostTemplates',
  list_campaign_media: 'listCampaignMedia',
  search_agent_brain: 'searchSkEntries',
  search_campaign_brain: 'searchCampaignBrain',
  get_brain_stats: 'getBrainStats',
  resolve_agent_brain: 'resolveAgentSkBrain',
  list_available_brain_scopes: 'listBrainScopes',
  list_user_brain_memories: 'listRecentMemories',
  list_agent_brain_domains: 'listBrainDomains',
  get_agent_brain_gaps: 'getBrainGaps',
  list_agent_brain_imports: 'listBrainImports',
  crystallize_user_brain: 'triggerCrystallization',
  ingest_user_brain_link: 'ingestBrainLink',
  ingest_user_brain_text: 'ingestBrainText',
  ingest_user_brain_document: 'ingestUserDocument',
  ingest_agent_brain_text: 'ingestSkText',
  ingest_agent_brain_link: 'ingestSkLink',
  ingest_fathom_meeting: 'ingestFathomMeeting',
  ingest_fireflies_transcript: 'ingestFirefliesTranscript',
  transfer_brain_node: 'transferBrainNode',
  transfer_brain_by_source: 'transferBrainBySource',
  assign_user_memory_source: 'assignMemorySource',
  delete_brain_node: 'deleteBrainNode',
  save_customer_memory: 'saveCustomerMemory',
  search_customer_brain: 'searchCustomerBrain',
  ingest_customer_brain_text: 'ingestCustomerBrainText',
  ingest_customer_brain_link: 'ingestCustomerBrainLink',
  list_customer_brain_memories: 'listCustomerBrainMemories',
  list_customer_avatars: 'listCustomerAvatars',
  get_brain_pages: 'getNarrativePages',
  get_brain_timelines: 'getBrainTimelines',
  get_brain_timeline_items: 'getBrainTimelineItems',
  create_brain_timeline: 'createBrainTimeline',
  upsert_brain_timeline_items: 'upsertBrainTimelineItems',
  archive_brain_timeline: 'archiveBrainTimeline',
  create_brain_page: 'createNarrativePage',
  patch_brain_page: 'patchNarrativePage',
  update_brain_page: 'updateNarrativePage',
  archive_brain_page: 'archiveNarrativePage',
  link_brain_pages: 'linkNarrativePages',
  unlink_brain_pages: 'unlinkNarrativePages',
  get_brain_log: 'getBrainLog',
  log_brain_event: 'logBrainEvent',
  get_company_brain_objects: 'getCompanyCortexObjects',
  get_company_brain_object_edges: 'getCompanyCortexObjectEdges',
  search_company_brain: 'searchCompanyCortex',
  propose_company_brain_signal: 'proposeCompanyCortexSignal',
  create_company_brain_object: 'createCompanyCortexObject',
  update_company_brain_object: 'updateCompanyCortexObject',
  archive_company_brain_object: 'archiveCompanyCortexObject',
  create_company_brain_edge: 'createCompanyCortexEdge',
  delete_company_brain_edge: 'deleteCompanyCortexEdge',
  get_brain_belief_patterns: 'getBeliefPatterns',
  create_brain_belief_pattern: 'createBeliefPattern',
  update_brain_belief_pattern: 'updateBeliefPattern',
  archive_brain_belief_pattern: 'archiveBeliefPattern',
  merge_brain_belief_patterns: 'mergeBeliefPatterns',
  connect_brain_belief_to_memory: 'connectBeliefToMemory',
  disconnect_brain_belief_from_memory: 'disconnectBeliefFromMemory',
  get_brain_perspectives: 'getPerspectives',
  create_brain_perspective: 'createPerspective',
  update_brain_perspective: 'updatePerspective',
  archive_brain_perspective: 'archivePerspective',
  connect_brain_belief_to_perspective: 'connectBeliefToPerspective',
  disconnect_brain_belief_from_perspective: 'disconnectBeliefFromPerspective',
  get_brain_lint: 'getBrainLint',
  run_brain_lint: 'runBrainLint',
  resolve_brain_lint: 'resolveBrainLint',
  create_strategy_node: 'createStrategyNode',
  list_strategy_nodes: 'listStrategyNodes',
  bulk_create_ads: 'bulkCreateAds',
  generate_ad_copy: 'generateAdCopy',
  get_daily_report_data: 'getDailyReportData',
  get_campaign_main_dashboard: 'getCampaignMainDashboard',
  get_campaign_social_analytics: 'getCampaignSocialAnalytics',
  get_campaign_stripe_overview: 'getCampaignStripeOverview',
  dream_inspect_agent: 'dreamInspectAgent',
  dream_search_evidence: 'dreamSearchEvidence',
  dream_propose_skill_create: 'dreamProposeSkillCreate',
  dream_propose_skill_update: 'dreamProposeSkillUpdate',
  dream_propose_skill_resource_update: 'dreamProposeSkillResourceUpdate',
  dream_propose_agent_file_update: 'dreamProposeAgentFileUpdate',
  dream_route_out: 'dreamRouteOut',
  dream_finish: 'dreamFinish',
  validate_project: 'validateProject',
  process_media: 'processMedia',
  list_mcp_servers: 'listMcpServers',
  list_mcp_tools: 'listMcpTools',
  use_mcp_tool: 'useMcpTool',
  add_mcp_server: 'addMcpServer',
  remove_mcp_server: 'removeMcpServer',
  list_mcp_resources: 'listMcpResources',
  read_mcp_resource: 'readMcpResource',
  send_user_message: 'sendUserMessage',
  ask_agent: 'askAgent',
  delegate_to_agent: 'delegateToAgent',
  approve_agent_hire: 'approveAgentHire',
  brainstorm_agents: 'brainstormAgents',
  create_campaign: 'createCampaign',
  update_campaign: 'updateCampaign',
  list_campaigns: 'listCampaigns',
  get_campaign: 'getCampaign',
  save_member_note: 'saveMemberNote',
  get_member_notes: 'getMemberNotes',
  discover_channel_context: 'discoverChannelContext',
  set_channel_context: 'setChannelContext',
  supabase_list_tables: 'supabaseListTables',
  supabase_run_sql: 'supabaseRunSql',
  supabase_create_table: 'supabaseCreateTable',
  supabase_insert_rows: 'supabaseInsertRows',
  supabase_update_rows: 'supabaseUpdateRows',
  supabase_delete_rows: 'supabaseDeleteRows',
}
