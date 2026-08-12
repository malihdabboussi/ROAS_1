import { isAction, type Action } from './actions.js'
import type { Domain } from './domains.js'
import { ACTION_TO_DOMAIN } from './registry.js'

export type SystemActionOwner = 'vibey' | 'atlas' | 'hr' | 'loop' | 'delegator'
export type ActionOwner = SystemActionOwner | 'managed'

export type ActionFamily =
  | 'artifact.presentation'
  | 'artifact.funnel'
  | 'artifact.form'
  | 'artifact.website'
  | 'artifact.ad'
  | 'artifact.sequence'
  | 'artifact.blog'
  | 'artifact.social'
  | 'artifact.document'
  | 'artifact.canvas'
  | 'contact'
  | 'task'
  | 'space.context'
  | 'space.schema'
  | 'space.research'
  | 'mission'
  | 'flow'
  | 'brain.memory'
  | 'brain.ingestion'
  | 'brain.router'
  | 'brain.narrative'
  | 'brain.model'
  | 'strategy'
  | 'integration'
  | 'integration.calendar'
  | 'team'
  | 'project'
  | 'mcp'
  | 'communication'
  | 'campaign'
  | 'content'
  | 'media'
  | 'custom_db'
  | 'skill'
  | 'mission.manager'
  | 'general'

export type ActionOperation =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'publish'
  | 'send'
  | 'delegate'
  | 'ask'
  | 'ingest'
  | 'search'
  | 'manage'
  | 'execute'

export type DelegateResolution = 'exact_system_agent' | 'actual_access_lookup' | 'none'
export type ActionAccessProof = 'canExecuteAction'

export interface ActionContract {
  action: Action
  domain: Domain
  family: ActionFamily
  operation: ActionOperation
  exclusiveOwner?: SystemActionOwner
  sharedOwners?: readonly ActionOwner[]
  userPolicyAddable: boolean
  requiresExplicitUserIntent: boolean
  forbiddenUnlessExplicit: boolean
  hideFromArtifactTurns: boolean
  delegateResolution: DelegateResolution
  delegateTargetAction?: Action
  nearMissActions: readonly Action[]
  skillKeys: readonly string[]
  schemaRef?: string
  userVisibleResult: string
  accessProof: ActionAccessProof
}

export interface InlineAccessRequestContract {
  type: 'agent_access_request'
  agent_key: string
  agent_name: string | null
  missing_capability: {
    kind: 'action_domain'
    id: Domain
  }
  required_action: Action
  reason: string
  approve_action: 'agent_policy_allow_extra'
}

type ExplicitActionContract = Omit<ActionContract, 'action' | 'domain'> & {
  domain?: Domain
}

function makeContract(action: Action, contract: ExplicitActionContract): ActionContract {
  return {
    action,
    domain: contract.domain ?? ACTION_TO_DOMAIN[action],
    ...contract,
  }
}

function presentationContract(operation: ActionOperation): ExplicitActionContract {
  return {
    family: 'artifact.presentation',
    operation,
    sharedOwners: ['vibey', 'managed'],
    userPolicyAddable: true,
    requiresExplicitUserIntent: operation !== 'read',
    forbiddenUnlessExplicit: false,
    hideFromArtifactTurns: false,
    delegateResolution: 'actual_access_lookup',
    delegateTargetAction: operation === 'read' ? undefined : 'create_presentation',
    nearMissActions: ['create_brain_page', 'create_strategy_node', 'save_user_memory'],
    skillKeys: ['presentation-builder', 'vibey-api'],
    schemaRef: `ACTION_SCHEMAS.${operation === 'create' ? 'create_presentation' : 'update_presentation'}`,
    userVisibleResult: 'Presentation work',
    accessProof: 'canExecuteAction',
  }
}

function funnelContract(operation: ActionOperation): ExplicitActionContract {
  return {
    family: 'artifact.funnel',
    operation,
    sharedOwners: ['vibey', 'managed'],
    userPolicyAddable: true,
    requiresExplicitUserIntent: operation !== 'read',
    forbiddenUnlessExplicit: operation === 'delete',
    hideFromArtifactTurns: false,
    delegateResolution: 'actual_access_lookup',
    delegateTargetAction: operation === 'read' ? undefined : 'create_funnel',
    nearMissActions: ['create_website', 'add_website_page'],
    skillKeys: ['funnel-builder', 'vibey-api'],
    schemaRef: `ACTION_SCHEMAS.${operation === 'create' ? 'create_funnel' : operation === 'read' ? 'list_funnels' : 'update_funnel_page'}`,
    userVisibleResult: 'Funnel work',
    accessProof: 'canExecuteAction',
  }
}

function formContract(
  operation: ActionOperation,
  schemaAction?:
    | 'create_form'
    | 'list_forms'
    | 'update_form'
    | 'publish_form'
    | 'attach_form_asset',
): ExplicitActionContract {
  return {
    family: 'artifact.form',
    operation,
    sharedOwners: ['vibey', 'managed'],
    userPolicyAddable: true,
    requiresExplicitUserIntent: operation !== 'read',
    forbiddenUnlessExplicit: false,
    hideFromArtifactTurns: false,
    delegateResolution: 'actual_access_lookup',
    delegateTargetAction: operation === 'read' ? undefined : 'create_form',
    nearMissActions: ['create_funnel', 'create_task', 'create_space_field'],
    skillKeys: ['vibey-api'],
    schemaRef: `ACTION_SCHEMAS.${schemaAction ?? (operation === 'create' ? 'create_form' : operation === 'read' ? 'list_forms' : operation === 'publish' ? 'publish_form' : 'update_form')}`,
    userVisibleResult: 'Form work',
    accessProof: 'canExecuteAction',
  }
}

function websiteContract(operation: ActionOperation): ExplicitActionContract {
  return {
    family: 'artifact.website',
    operation,
    sharedOwners: ['vibey', 'managed'],
    userPolicyAddable: true,
    requiresExplicitUserIntent: operation !== 'read',
    forbiddenUnlessExplicit: operation === 'delete',
    hideFromArtifactTurns: false,
    delegateResolution: 'actual_access_lookup',
    delegateTargetAction: operation === 'read' ? undefined : 'create_website',
    nearMissActions: ['create_funnel', 'add_funnel_page'],
    skillKeys: ['website-builder', 'vibey-api'],
    schemaRef: `ACTION_SCHEMAS.${operation === 'create' ? 'create_website' : operation === 'read' ? 'list_websites' : 'update_website_page'}`,
    userVisibleResult: 'Website work',
    accessProof: 'canExecuteAction',
  }
}

function taskContract(operation: ActionOperation): ExplicitActionContract {
  return {
    family: 'task',
    operation,
    sharedOwners: ['vibey', 'loop', 'delegator', 'managed'],
    userPolicyAddable: true,
    requiresExplicitUserIntent: operation !== 'read',
    forbiddenUnlessExplicit: false,
    hideFromArtifactTurns: false,
    delegateResolution: 'actual_access_lookup',
    delegateTargetAction: operation === 'read' ? undefined : 'create_task',
    nearMissActions: ['create_mission'],
    skillKeys: ['vibey-api'],
    schemaRef: `ACTION_SCHEMAS.${operation === 'create' ? 'create_task' : 'update_task'}`,
    userVisibleResult: 'Task work',
    accessProof: 'canExecuteAction',
  }
}

function contactContract(action: Action, operation: ActionOperation): ExplicitActionContract {
  const isRead = operation === 'read'
  return {
    family: 'contact',
    operation,
    sharedOwners: ['vibey', 'delegator', 'managed'],
    userPolicyAddable: true,
    requiresExplicitUserIntent: !isRead,
    forbiddenUnlessExplicit: false,
    hideFromArtifactTurns: false,
    delegateResolution: 'actual_access_lookup',
    delegateTargetAction: isRead ? undefined : 'create_contact',
    nearMissActions: ['create_task', 'save_customer_memory', 'search_customer_brain'],
    skillKeys: ['vibey-api'],
    schemaRef: `ACTION_SCHEMAS.${action}`,
    userVisibleResult: isRead ? 'CRM contact read' : 'CRM contact write',
    accessProof: 'canExecuteAction',
  }
}

function spaceSchemaContract(
  action: Action,
  operation: Extract<ActionOperation, 'create' | 'update'>,
): ExplicitActionContract {
  return {
    family: 'space.schema',
    operation,
    sharedOwners: ['vibey', 'loop', 'managed'],
    userPolicyAddable: true,
    requiresExplicitUserIntent: true,
    forbiddenUnlessExplicit: false,
    hideFromArtifactTurns: false,
    delegateResolution: 'actual_access_lookup',
    delegateTargetAction: action,
    nearMissActions: ['create_task', 'update_task'],
    skillKeys: ['vibey-api'],
    schemaRef: `ACTION_SCHEMAS.${action}`,
    userVisibleResult: 'Space schema field',
    accessProof: 'canExecuteAction',
  }
}

function spaceResearchContract(action: Action): ExplicitActionContract {
  return {
    family: 'space.research',
    operation: 'search',
    sharedOwners: ['vibey', 'managed'],
    userPolicyAddable: true,
    requiresExplicitUserIntent: true,
    forbiddenUnlessExplicit: false,
    hideFromArtifactTurns: false,
    delegateResolution: 'actual_access_lookup',
    delegateTargetAction: action,
    nearMissActions: ['search_space_context', 'list_space_view_items'],
    skillKeys: ['vibey-api'],
    schemaRef: `ACTION_SCHEMAS.${action}`,
    userVisibleResult: 'Space research search',
    accessProof: 'canExecuteAction',
  }
}

function atlasIngestionContract(action: Action): ExplicitActionContract {
  return {
    family: 'brain.ingestion',
    operation: 'ingest',
    exclusiveOwner: 'atlas',
    userPolicyAddable: false,
    requiresExplicitUserIntent: true,
    forbiddenUnlessExplicit: true,
    hideFromArtifactTurns: true,
    delegateResolution: 'exact_system_agent',
    delegateTargetAction: action,
    nearMissActions: ['save_user_memory', 'create_presentation'],
    skillKeys: ['brain-scholar', 'vibey-api'],
    schemaRef: `ACTION_SCHEMAS.${action}`,
    userVisibleResult: 'Brain ingestion',
    accessProof: 'canExecuteAction',
  }
}

function companyCortexReadContract(
  action: Action,
  operation: 'read' | 'search',
): ExplicitActionContract {
  return {
    family: 'brain.memory',
    operation,
    sharedOwners: ['vibey', 'atlas', 'hr', 'delegator', 'managed'],
    userPolicyAddable: true,
    requiresExplicitUserIntent: false,
    forbiddenUnlessExplicit: false,
    hideFromArtifactTurns: false,
    delegateResolution: 'none',
    nearMissActions: ['search_user_brain', 'get_brain_belief_patterns', 'get_brain_perspectives'],
    skillKeys: ['brain-scholar', 'company-cortex-formation', 'vibey-api'],
    schemaRef: `ACTION_SCHEMAS.${action}`,
    userVisibleResult: 'Company Cortex read',
    accessProof: 'canExecuteAction',
  }
}

function companyCortexWriteContract(
  action: Action,
  operation: 'create' | 'update' | 'delete',
): ExplicitActionContract {
  return {
    family: 'brain.model',
    operation,
    exclusiveOwner: 'atlas',
    sharedOwners: ['vibey', 'atlas'],
    userPolicyAddable: false,
    requiresExplicitUserIntent: true,
    forbiddenUnlessExplicit: true,
    hideFromArtifactTurns: true,
    delegateResolution: 'exact_system_agent',
    delegateTargetAction: action,
    nearMissActions: ['get_company_brain_objects', 'search_company_brain'],
    skillKeys: ['brain-scholar', 'company-cortex-formation', 'vibey-api'],
    schemaRef: `ACTION_SCHEMAS.${action}`,
    userVisibleResult: 'Company Cortex write',
    accessProof: 'canExecuteAction',
  }
}

function customerBrainContract(
  action: Action,
  operation: 'create' | 'read' | 'search' | 'ingest',
): ExplicitActionContract {
  const isWrite = operation === 'create' || operation === 'ingest'
  return {
    family: isWrite ? 'brain.ingestion' : 'brain.memory',
    operation,
    exclusiveOwner: isWrite ? 'atlas' : undefined,
    sharedOwners: isWrite ? ['atlas'] : ['vibey', 'atlas', 'hr', 'delegator', 'managed'],
    userPolicyAddable: !isWrite,
    requiresExplicitUserIntent: isWrite,
    forbiddenUnlessExplicit: isWrite,
    hideFromArtifactTurns: isWrite,
    delegateResolution: isWrite ? 'exact_system_agent' : 'none',
    delegateTargetAction: isWrite ? action : undefined,
    nearMissActions: ['save_user_memory', 'search_user_brain', 'search_company_brain'],
    skillKeys: ['brain-scholar', 'vibey-api'],
    schemaRef: `ACTION_SCHEMAS.${action}`,
    userVisibleResult: isWrite ? 'Customer Brain write' : 'Customer Brain read',
    accessProof: 'canExecuteAction',
  }
}

function vibeyMissionManagerContract(
  action: Action,
  operation: ActionOperation = 'manage',
): ExplicitActionContract {
  return {
    family: 'mission.manager',
    operation,
    exclusiveOwner: 'vibey',
    userPolicyAddable: false,
    requiresExplicitUserIntent: false,
    forbiddenUnlessExplicit: false,
    hideFromArtifactTurns: true,
    delegateResolution: 'exact_system_agent',
    delegateTargetAction: action,
    nearMissActions: ['get_mission', 'list_mission_subtasks', 'retry_mission'],
    skillKeys: ['vibey-api'],
    schemaRef: `ACTION_SCHEMAS.${action}`,
    userVisibleResult: 'Mission manager action',
    accessProof: 'canExecuteAction',
  }
}

function flowContract(action: Action, operation: ActionOperation): ExplicitActionContract {
  const isRead = operation === 'read' || operation === 'search'
  return {
    family: 'flow',
    operation,
    exclusiveOwner: 'loop',
    userPolicyAddable: false,
    requiresExplicitUserIntent: !isRead,
    forbiddenUnlessExplicit: !isRead,
    hideFromArtifactTurns: false,
    delegateResolution: 'exact_system_agent',
    delegateTargetAction: action,
    nearMissActions: ['search_flow_capabilities', 'list_flows', 'get_flow'],
    skillKeys: ['flow-builder', 'vibey-api'],
    schemaRef: `ACTION_SCHEMAS.${action}`,
    userVisibleResult: 'Flow builder action',
    accessProof: 'canExecuteAction',
  }
}

function hrAuditContract(action: Action): ExplicitActionContract {
  return {
    family: 'team',
    operation: 'read',
    exclusiveOwner: 'hr',
    userPolicyAddable: false,
    requiresExplicitUserIntent: false,
    forbiddenUnlessExplicit: false,
    hideFromArtifactTurns: true,
    delegateResolution: 'exact_system_agent',
    delegateTargetAction: action,
    nearMissActions: ['list_team', 'list_agent_skills'],
    skillKeys: ['hr-agent', 'vibey-api'],
    schemaRef: `ACTION_SCHEMAS.${action}`,
    userVisibleResult: 'Team capability audit',
    accessProof: 'canExecuteAction',
  }
}

function dreamOpsContract(action: Action, operation: ActionOperation): ExplicitActionContract {
  const isAgentFileProposal = action === 'dream_propose_agent_file_update'
  return {
    family: isAgentFileProposal ? 'team' : 'skill',
    operation,
    exclusiveOwner: 'hr',
    userPolicyAddable: false,
    requiresExplicitUserIntent: false,
    forbiddenUnlessExplicit: false,
    hideFromArtifactTurns: true,
    delegateResolution: 'exact_system_agent',
    delegateTargetAction: action,
    nearMissActions: ['create_agent_skill', 'update_agent_skill', 'update_agent'],
    skillKeys: ['hr-agent', 'vibey-api'],
    schemaRef: `ACTION_SCHEMAS.${action}`,
    userVisibleResult: 'Agent learning proposal',
    accessProof: 'canExecuteAction',
  }
}

function calendarContract(action: Action, operation: ActionOperation): ExplicitActionContract {
  const isRead = operation === 'read'
  return {
    family: 'integration.calendar',
    operation,
    userPolicyAddable: true,
    requiresExplicitUserIntent: !isRead,
    forbiddenUnlessExplicit: operation === 'delete',
    hideFromArtifactTurns: false,
    delegateResolution: 'none',
    nearMissActions: ['create_task', 'update_task', 'use_integration'],
    skillKeys: ['vibey-api'],
    schemaRef: `ACTION_SCHEMAS.${action}`,
    userVisibleResult: isRead ? 'Calendar events' : 'Calendar event',
    accessProof: 'canExecuteAction',
  }
}

const EXPLICIT_ACTION_CONTRACTS = {
  create_funnel: funnelContract('create'),
  add_funnel_page: funnelContract('create'),
  update_funnel_page: funnelContract('update'),
  get_funnel: funnelContract('read'),
  list_funnels: funnelContract('read'),
  delete_funnel: funnelContract('delete'),
  list_forms: formContract('read'),
  get_form: formContract('read'),
  create_form: formContract('create'),
  update_form: formContract('update'),
  attach_form_asset: formContract('update', 'attach_form_asset'),
  publish_form: formContract('publish'),
  unpublish_form: formContract('publish'),
  list_form_responses: formContract('read'),

  create_website: websiteContract('create'),
  add_website_page: websiteContract('create'),
  update_website_page: websiteContract('update'),
  get_website: websiteContract('read'),
  list_websites: websiteContract('read'),
  delete_website: websiteContract('delete'),

  create_presentation: presentationContract('create'),
  update_presentation: presentationContract('update'),
  patch_presentation: presentationContract('update'),
  update_presentation_slide: presentationContract('update'),
  add_presentation_slide: presentationContract('create'),
  list_presentation_files: presentationContract('read'),
  read_presentation_file: presentationContract('read'),
  write_presentation_file: presentationContract('update'),
  patch_presentation_file: presentationContract('update'),
  delete_presentation_file: presentationContract('delete'),
  show_presentation_file: presentationContract('read'),
  list_presentation_assets: presentationContract('read'),
  attach_presentation_asset: presentationContract('update'),
  detach_presentation_asset: presentationContract('delete'),
  get_presentation: presentationContract('read'),
  list_presentations: presentationContract('read'),

  create_task: taskContract('create'),
  update_task: taskContract('update'),
  get_task: taskContract('read'),
  list_tasks: taskContract('read'),
  list_space_views: taskContract('read'),
  get_space_view: taskContract('read'),
  list_space_view_items: taskContract('read'),
  get_space_item: taskContract('read'),
  create_space_field: spaceSchemaContract('create_space_field', 'create'),
  update_space_field: spaceSchemaContract('update_space_field', 'update'),
  append_space_field_option: spaceSchemaContract('append_space_field_option', 'update'),
  create_space_status: spaceSchemaContract('create_space_status', 'create'),
  create_space_category: spaceSchemaContract('create_space_category', 'create'),
  create_space_tag: spaceSchemaContract('create_space_tag', 'create'),
  create_space_view: spaceSchemaContract('create_space_view', 'create'),
  update_space_view: spaceSchemaContract('update_space_view', 'update'),
  run_social_research_search: spaceResearchContract('run_social_research_search'),
  run_ads_research_search: spaceResearchContract('run_ads_research_search'),
  search_ads_research_advertisers: spaceResearchContract('search_ads_research_advertisers'),

  list_contacts: contactContract('list_contacts', 'read'),
  get_contact: contactContract('get_contact', 'read'),
  create_contact: contactContract('create_contact', 'create'),
  update_contact: contactContract('update_contact', 'update'),
  add_contact_note: contactContract('add_contact_note', 'create'),
  update_contact_note: contactContract('update_contact_note', 'update'),
  get_contact_activity: contactContract('get_contact_activity', 'read'),
  list_contact_communications: contactContract('list_contact_communications', 'read'),

  search_conversations: {
    family: 'communication',
    operation: 'search',
    sharedOwners: ['vibey', 'loop', 'delegator', 'managed'],
    userPolicyAddable: true,
    requiresExplicitUserIntent: false,
    forbiddenUnlessExplicit: false,
    hideFromArtifactTurns: false,
    delegateResolution: 'actual_access_lookup',
    nearMissActions: ['search_space_context', 'list_contact_communications'],
    skillKeys: ['vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.search_conversations',
    userVisibleResult: 'Conversation history search',
    accessProof: 'canExecuteAction',
  },

  search_space_context: {
    family: 'space.context',
    operation: 'search',
    sharedOwners: ['vibey', 'loop', 'delegator', 'managed'],
    userPolicyAddable: true,
    requiresExplicitUserIntent: false,
    forbiddenUnlessExplicit: false,
    hideFromArtifactTurns: false,
    delegateResolution: 'actual_access_lookup',
    nearMissActions: [
      'list_spaces',
      'get_space',
      'list_space_views',
      'get_space_view',
      'list_space_view_items',
      'get_space_item',
      'list_tasks',
      'get_task',
    ],
    skillKeys: ['vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.search_space_context',
    userVisibleResult: 'Space context search',
    accessProof: 'canExecuteAction',
  },

  search_flow_capabilities: flowContract('search_flow_capabilities', 'search'),
  get_flow_capability: flowContract('get_flow_capability', 'read'),
  list_flows: flowContract('list_flows', 'read'),
  get_flow: flowContract('get_flow', 'read'),
  create_flow_draft: flowContract('create_flow_draft', 'create'),
  update_flow_draft: flowContract('update_flow_draft', 'update'),
  validate_flow_draft: flowContract('validate_flow_draft', 'execute'),
  publish_flow: flowContract('publish_flow', 'publish'),
  get_flow_build_context: flowContract('get_flow_build_context', 'read'),
  create_flow_clarification: flowContract('create_flow_clarification', 'create'),
  create_flow_plan: flowContract('create_flow_plan', 'create'),
  update_flow_plan: flowContract('update_flow_plan', 'update'),
  answer_flow_clarification: flowContract('answer_flow_clarification', 'update'),
  validate_flow_plan: flowContract('validate_flow_plan', 'execute'),
  compile_flow_plan: flowContract('compile_flow_plan', 'execute'),
  list_flow_blueprints: flowContract('list_flow_blueprints', 'read'),
  get_flow_blueprint: flowContract('get_flow_blueprint', 'read'),
  create_flow_blueprint_draft: flowContract('create_flow_blueprint_draft', 'create'),
  validate_flow_blueprint: flowContract('validate_flow_blueprint', 'execute'),
  activate_flow_blueprint: flowContract('activate_flow_blueprint', 'update'),
  evaluate_flow_plan: flowContract('evaluate_flow_plan', 'execute'),

  list_calendar_events: calendarContract('list_calendar_events', 'read'),
  get_person_agenda: calendarContract('get_person_agenda', 'read'),
  list_org_upcoming: calendarContract('list_org_upcoming', 'read'),
  get_person_briefing: calendarContract('get_person_briefing', 'read'),
  create_calendar_event: calendarContract('create_calendar_event', 'create'),
  update_calendar_event: calendarContract('update_calendar_event', 'update'),
  delete_calendar_event: calendarContract('delete_calendar_event', 'delete'),

  save_user_memory: {
    family: 'brain.memory',
    operation: 'create',
    sharedOwners: ['vibey', 'atlas', 'hr', 'managed'],
    userPolicyAddable: true,
    requiresExplicitUserIntent: true,
    forbiddenUnlessExplicit: false,
    hideFromArtifactTurns: false,
    delegateResolution: 'none',
    nearMissActions: ['create_brain_page', 'ingest_user_brain_document', 'create_strategy_node'],
    skillKeys: ['vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.save_user_memory',
    userVisibleResult: 'Regular user memory saved',
    accessProof: 'canExecuteAction',
  },

  atlas_save_brain_context: {
    family: 'brain.router',
    operation: 'create',
    exclusiveOwner: 'atlas',
    sharedOwners: ['atlas'],
    userPolicyAddable: true,
    requiresExplicitUserIntent: true,
    forbiddenUnlessExplicit: false,
    hideFromArtifactTurns: false,
    delegateResolution: 'actual_access_lookup',
    nearMissActions: [
      'save_user_memory',
      'save_customer_memory',
      'propose_company_brain_signal',
      'ingest_agent_brain_text',
      'save_document',
    ],
    skillKeys: ['brain', 'atlas', 'vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.atlas_save_brain_context',
    userVisibleResult: 'Brain context saved',
    accessProof: 'canExecuteAction',
  },

  search_brain_context: {
    family: 'brain.memory',
    operation: 'search',
    sharedOwners: ['vibey', 'atlas', 'hr', 'delegator', 'managed'],
    userPolicyAddable: true,
    requiresExplicitUserIntent: false,
    forbiddenUnlessExplicit: false,
    hideFromArtifactTurns: false,
    delegateResolution: 'none',
    nearMissActions: [
      'search_user_brain',
      'search_agent_brain',
      'search_customer_brain',
      'search_company_brain',
      'search_campaign_brain',
    ],
    skillKeys: ['brain-scholar', 'vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.search_brain_context',
    userVisibleResult: 'Cross-Brain context search',
    accessProof: 'canExecuteAction',
  },

  ingest_user_brain_document: atlasIngestionContract('ingest_user_brain_document'),
  ingest_agent_brain_text: atlasIngestionContract('ingest_agent_brain_text'),

  get_brain_timelines: {
    family: 'brain.model',
    operation: 'read',
    exclusiveOwner: 'atlas',
    userPolicyAddable: false,
    requiresExplicitUserIntent: false,
    forbiddenUnlessExplicit: false,
    hideFromArtifactTurns: true,
    delegateResolution: 'exact_system_agent',
    delegateTargetAction: 'get_brain_timelines',
    nearMissActions: ['get_brain_pages', 'search_brain_context'],
    skillKeys: ['brain-scholar', 'brain-timeline-synthesis', 'vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.get_brain_timelines',
    userVisibleResult: 'Brain timelines read',
    accessProof: 'canExecuteAction',
  },

  get_brain_timeline_items: {
    family: 'brain.model',
    operation: 'read',
    exclusiveOwner: 'atlas',
    userPolicyAddable: false,
    requiresExplicitUserIntent: false,
    forbiddenUnlessExplicit: false,
    hideFromArtifactTurns: true,
    delegateResolution: 'exact_system_agent',
    delegateTargetAction: 'get_brain_timeline_items',
    nearMissActions: ['get_brain_timelines', 'get_brain_pages'],
    skillKeys: ['brain-scholar', 'brain-timeline-synthesis', 'vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.get_brain_timeline_items',
    userVisibleResult: 'Brain timeline items read',
    accessProof: 'canExecuteAction',
  },

  create_brain_timeline: {
    family: 'brain.model',
    operation: 'create',
    exclusiveOwner: 'atlas',
    userPolicyAddable: false,
    requiresExplicitUserIntent: true,
    forbiddenUnlessExplicit: true,
    hideFromArtifactTurns: true,
    delegateResolution: 'exact_system_agent',
    delegateTargetAction: 'create_brain_timeline',
    nearMissActions: ['create_brain_page', 'save_user_memory'],
    skillKeys: ['brain-scholar', 'brain-timeline-synthesis', 'vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.create_brain_timeline',
    userVisibleResult: 'Brain timeline created',
    accessProof: 'canExecuteAction',
  },

  upsert_brain_timeline_items: {
    family: 'brain.model',
    operation: 'update',
    exclusiveOwner: 'atlas',
    userPolicyAddable: false,
    requiresExplicitUserIntent: true,
    forbiddenUnlessExplicit: true,
    hideFromArtifactTurns: true,
    delegateResolution: 'exact_system_agent',
    delegateTargetAction: 'upsert_brain_timeline_items',
    nearMissActions: ['create_brain_timeline', 'log_brain_event'],
    skillKeys: ['brain-scholar', 'brain-timeline-synthesis', 'vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.upsert_brain_timeline_items',
    userVisibleResult: 'Brain timeline items updated',
    accessProof: 'canExecuteAction',
  },

  archive_brain_timeline: {
    family: 'brain.model',
    operation: 'delete',
    exclusiveOwner: 'atlas',
    userPolicyAddable: false,
    requiresExplicitUserIntent: true,
    forbiddenUnlessExplicit: true,
    hideFromArtifactTurns: true,
    delegateResolution: 'exact_system_agent',
    delegateTargetAction: 'archive_brain_timeline',
    nearMissActions: ['archive_brain_page', 'resolve_brain_lint'],
    skillKeys: ['brain-scholar', 'brain-timeline-synthesis', 'vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.archive_brain_timeline',
    userVisibleResult: 'Brain timeline archived',
    accessProof: 'canExecuteAction',
  },

  create_brain_page: {
    family: 'brain.narrative',
    operation: 'create',
    exclusiveOwner: 'atlas',
    userPolicyAddable: false,
    requiresExplicitUserIntent: true,
    forbiddenUnlessExplicit: true,
    hideFromArtifactTurns: true,
    delegateResolution: 'exact_system_agent',
    delegateTargetAction: 'create_brain_page',
    nearMissActions: ['create_presentation', 'save_user_memory'],
    skillKeys: ['brain-scholar', 'vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.create_brain_page',
    userVisibleResult: 'Brain narrative page created',
    accessProof: 'canExecuteAction',
  },

  create_strategy_node: {
    family: 'strategy',
    operation: 'create',
    exclusiveOwner: 'atlas',
    userPolicyAddable: false,
    requiresExplicitUserIntent: true,
    forbiddenUnlessExplicit: true,
    hideFromArtifactTurns: true,
    delegateResolution: 'exact_system_agent',
    delegateTargetAction: 'create_strategy_node',
    nearMissActions: ['create_presentation', 'save_user_memory', 'create_task'],
    skillKeys: ['brain-scholar', 'strategy-modeling', 'vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.create_strategy_node',
    userVisibleResult: 'Strategy model node created',
    accessProof: 'canExecuteAction',
  },

  get_canvas_board: {
    family: 'artifact.canvas',
    operation: 'read',
    sharedOwners: ['managed'],
    userPolicyAddable: true,
    requiresExplicitUserIntent: false,
    forbiddenUnlessExplicit: false,
    hideFromArtifactTurns: false,
    delegateResolution: 'actual_access_lookup',
    nearMissActions: ['list_strategy_nodes', 'get_campaign'],
    skillKeys: ['vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.get_canvas_board',
    userVisibleResult: 'Canvas board loaded',
    accessProof: 'canExecuteAction',
  },

  apply_canvas_operations: {
    family: 'artifact.canvas',
    operation: 'update',
    sharedOwners: ['managed'],
    userPolicyAddable: true,
    requiresExplicitUserIntent: true,
    forbiddenUnlessExplicit: true,
    hideFromArtifactTurns: false,
    delegateResolution: 'actual_access_lookup',
    nearMissActions: ['create_strategy_node', 'get_canvas_board'],
    skillKeys: ['vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.apply_canvas_operations',
    userVisibleResult: 'Canvas updated with editable items',
    accessProof: 'canExecuteAction',
  },

  create_agent: {
    family: 'team',
    operation: 'create',
    exclusiveOwner: 'hr',
    userPolicyAddable: false,
    requiresExplicitUserIntent: true,
    forbiddenUnlessExplicit: true,
    hideFromArtifactTurns: true,
    delegateResolution: 'exact_system_agent',
    delegateTargetAction: 'create_agent',
    nearMissActions: ['approve_agent_hire'],
    skillKeys: ['hr-agent', 'vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.create_agent',
    userVisibleResult: 'Agent identity created',
    accessProof: 'canExecuteAction',
  },

  update_agent: {
    family: 'team',
    operation: 'update',
    exclusiveOwner: 'hr',
    userPolicyAddable: false,
    requiresExplicitUserIntent: true,
    forbiddenUnlessExplicit: true,
    hideFromArtifactTurns: true,
    delegateResolution: 'exact_system_agent',
    delegateTargetAction: 'update_agent',
    nearMissActions: ['approve_agent_hire'],
    skillKeys: ['hr-agent', 'vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.update_agent',
    userVisibleResult: 'Agent identity updated',
    accessProof: 'canExecuteAction',
  },

  approve_agent_hire: {
    family: 'team',
    operation: 'manage',
    sharedOwners: ['vibey', 'hr'],
    userPolicyAddable: false,
    requiresExplicitUserIntent: true,
    forbiddenUnlessExplicit: true,
    hideFromArtifactTurns: true,
    delegateResolution: 'exact_system_agent',
    delegateTargetAction: 'approve_agent_hire',
    nearMissActions: ['create_agent', 'update_agent'],
    skillKeys: ['hr-agent', 'vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.approve_agent_hire',
    userVisibleResult: 'Agent hire approved',
    accessProof: 'canExecuteAction',
  },

  audit_team_agents_and_skills: hrAuditContract('audit_team_agents_and_skills'),
  compare_team_skill_coverage: hrAuditContract('compare_team_skill_coverage'),
  summarize_agent_capabilities: hrAuditContract('summarize_agent_capabilities'),
  dream_inspect_agent: dreamOpsContract('dream_inspect_agent', 'read'),
  dream_search_evidence: dreamOpsContract('dream_search_evidence', 'search'),
  dream_propose_skill_create: dreamOpsContract('dream_propose_skill_create', 'create'),
  dream_propose_skill_update: dreamOpsContract('dream_propose_skill_update', 'update'),
  dream_propose_skill_resource_update: dreamOpsContract(
    'dream_propose_skill_resource_update',
    'update',
  ),
  dream_propose_agent_file_update: dreamOpsContract('dream_propose_agent_file_update', 'update'),
  dream_route_out: dreamOpsContract('dream_route_out', 'manage'),
  dream_finish: dreamOpsContract('dream_finish', 'execute'),

  assign_agent_to_campaign: {
    family: 'team',
    operation: 'manage',
    sharedOwners: ['vibey', 'hr'],
    userPolicyAddable: false,
    requiresExplicitUserIntent: true,
    forbiddenUnlessExplicit: true,
    hideFromArtifactTurns: true,
    delegateResolution: 'exact_system_agent',
    delegateTargetAction: 'assign_agent_to_campaign',
    nearMissActions: ['create_agent', 'update_agent'],
    skillKeys: ['hr-agent', 'vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.assign_agent_to_campaign',
    userVisibleResult: 'Agent assigned to campaign',
    accessProof: 'canExecuteAction',
  },

  unassign_agent_from_campaign: {
    family: 'team',
    operation: 'manage',
    sharedOwners: ['vibey', 'hr'],
    userPolicyAddable: false,
    requiresExplicitUserIntent: true,
    forbiddenUnlessExplicit: true,
    hideFromArtifactTurns: true,
    delegateResolution: 'exact_system_agent',
    delegateTargetAction: 'unassign_agent_from_campaign',
    nearMissActions: ['create_agent', 'update_agent'],
    skillKeys: ['hr-agent', 'vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.unassign_agent_from_campaign',
    userVisibleResult: 'Agent unassigned from campaign',
    accessProof: 'canExecuteAction',
  },

  ask_agent: {
    family: 'communication',
    operation: 'ask',
    sharedOwners: ['vibey', 'atlas', 'hr', 'delegator', 'managed'],
    userPolicyAddable: true,
    requiresExplicitUserIntent: false,
    forbiddenUnlessExplicit: false,
    hideFromArtifactTurns: false,
    delegateResolution: 'none',
    nearMissActions: [],
    skillKeys: ['vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.ask_agent',
    userVisibleResult: 'Agent asked',
    accessProof: 'canExecuteAction',
  },

  delegate_to_agent: {
    family: 'communication',
    operation: 'delegate',
    sharedOwners: ['vibey', 'atlas', 'hr', 'delegator', 'managed'],
    userPolicyAddable: true,
    requiresExplicitUserIntent: false,
    forbiddenUnlessExplicit: false,
    hideFromArtifactTurns: false,
    delegateResolution: 'actual_access_lookup',
    nearMissActions: [],
    skillKeys: ['vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.delegate_to_agent',
    userVisibleResult: 'Task delegated',
    accessProof: 'canExecuteAction',
  },

  describe_action: {
    family: 'communication',
    operation: 'read',
    sharedOwners: ['vibey', 'atlas', 'hr', 'delegator', 'managed'],
    userPolicyAddable: false,
    requiresExplicitUserIntent: false,
    forbiddenUnlessExplicit: false,
    hideFromArtifactTurns: true,
    delegateResolution: 'none',
    nearMissActions: [],
    skillKeys: ['vibey-api'],
    schemaRef: 'ACTION_SCHEMAS.describe_action',
    userVisibleResult: 'Action contract checked',
    accessProof: 'canExecuteAction',
  },

  get_company_brain_objects: companyCortexReadContract('get_company_brain_objects', 'read'),
  get_company_brain_object_edges: companyCortexReadContract(
    'get_company_brain_object_edges',
    'read',
  ),
  search_company_brain: companyCortexReadContract('search_company_brain', 'search'),
  propose_company_brain_signal: companyCortexWriteContract(
    'propose_company_brain_signal',
    'create',
  ),
  create_company_brain_object: companyCortexWriteContract('create_company_brain_object', 'create'),
  update_company_brain_object: companyCortexWriteContract('update_company_brain_object', 'update'),
  archive_company_brain_object: companyCortexWriteContract(
    'archive_company_brain_object',
    'delete',
  ),
  create_company_brain_edge: companyCortexWriteContract('create_company_brain_edge', 'create'),
  delete_company_brain_edge: companyCortexWriteContract('delete_company_brain_edge', 'delete'),
  save_customer_memory: customerBrainContract('save_customer_memory', 'create'),
  search_customer_brain: customerBrainContract('search_customer_brain', 'search'),
  ingest_customer_brain_text: customerBrainContract('ingest_customer_brain_text', 'ingest'),
  ingest_customer_brain_link: customerBrainContract('ingest_customer_brain_link', 'ingest'),
  list_customer_brain_memories: customerBrainContract('list_customer_brain_memories', 'read'),
  list_customer_avatars: customerBrainContract('list_customer_avatars', 'read'),
  answer_mission_question: vibeyMissionManagerContract('answer_mission_question', 'read'),
  summarize_mission_state: vibeyMissionManagerContract('summarize_mission_state', 'read'),
  attach_mission_context: vibeyMissionManagerContract('attach_mission_context', 'create'),
  show_mission_deliverable: vibeyMissionManagerContract('show_mission_deliverable', 'read'),
  create_mission_subtask: vibeyMissionManagerContract('create_mission_subtask', 'create'),
  edit_mission_subtask: vibeyMissionManagerContract('edit_mission_subtask', 'update'),
  cancel_mission_subtask: vibeyMissionManagerContract('cancel_mission_subtask', 'delete'),
  retry_mission_subtask: vibeyMissionManagerContract('retry_mission_subtask', 'execute'),
  reassign_mission_subtask: vibeyMissionManagerContract('reassign_mission_subtask', 'update'),
  prepare_mission_replan: vibeyMissionManagerContract('prepare_mission_replan', 'execute'),
  approve_mission: vibeyMissionManagerContract('approve_mission', 'manage'),
} as const satisfies Partial<Record<Action, ExplicitActionContract>>

export const ACTION_CONTRACTS = Object.fromEntries(
  Object.entries(EXPLICIT_ACTION_CONTRACTS).map(([action, contract]) => [
    action,
    makeContract(action as Action, contract),
  ]),
) as Partial<Record<Action, ActionContract>>

function inferFamily(action: Action, domain: Domain): ActionFamily {
  if (action.includes('funnel')) return 'artifact.funnel'
  if (action.includes('form')) return 'artifact.form'
  if (action.includes('website')) return 'artifact.website'
  if (action.includes('_ad') || action.includes('ad_')) return 'artifact.ad'
  if (action.includes('sequence') || action.includes('email')) return 'artifact.sequence'
  if (action.includes('blog')) return 'artifact.blog'
  if (action.includes('social')) return 'artifact.social'
  if (action.includes('document') || action.includes('pdf')) return 'artifact.document'
  if (domain === 'read_contacts' || domain === 'edit_contacts') return 'contact'
  if (domain === 'read_space_context') return 'space.context'
  if (domain === 'read_flows' || domain === 'manage_flows') return 'flow'
  if (action.includes('task') || action.includes('space')) return 'task'
  if (action.includes('mission')) return 'mission'
  if (domain === 'use_integrations') return 'integration'
  if (domain === 'manage_team_identity' || domain === 'manage_agents') return 'team'
  if (domain === 'code_projects') return 'project'
  if (domain === 'use_mcp') return 'mcp'
  if (domain === 'communicate') return 'communication'
  if (domain === 'custom_db') return 'custom_db'
  if (domain === 'manage_own_skills' || domain === 'manage_team_skills') return 'skill'
  if (domain === 'manage_mission_control') return 'mission.manager'
  if (domain === 'generate_media') return 'media'
  if (domain === 'manage_content') return 'content'
  if (domain === 'edit_campaign' || domain === 'read_campaign') return 'campaign'
  if (
    domain === 'read_brain_personal' ||
    domain === 'read_brain_agent' ||
    domain === 'read_brain_company' ||
    domain === 'read_brain_customer'
  )
    return 'brain.memory'
  if (domain === 'write_brain') return 'brain.ingestion'
  if (
    domain === 'edit_brain_models' ||
    domain === 'edit_brain_company' ||
    domain === 'edit_brain_customer'
  )
    return 'brain.model'
  return 'general'
}

function inferOperation(action: Action): ActionOperation {
  if (
    action.startsWith('create_') ||
    action.startsWith('add_') ||
    action.startsWith('bulk_create_')
  ) {
    return 'create'
  }
  if (action.startsWith('get_') || action.startsWith('list_') || action.startsWith('read_')) {
    return 'read'
  }
  if (action.startsWith('update_') || action.startsWith('patch_') || action.startsWith('set_')) {
    return 'update'
  }
  if (
    action.startsWith('delete_') ||
    action.startsWith('archive_') ||
    action.startsWith('trash_')
  ) {
    return 'delete'
  }
  if (action.startsWith('publish_') || action.startsWith('schedule_')) return 'publish'
  if (action.startsWith('send_')) return 'send'
  if (action.startsWith('search_')) return 'search'
  if (action.startsWith('ingest_')) return 'ingest'
  return 'execute'
}

function fallbackContract(action: Action): ActionContract {
  const domain = ACTION_TO_DOMAIN[action]
  return {
    action,
    domain,
    family: inferFamily(action, domain),
    operation: inferOperation(action),
    userPolicyAddable:
      domain !== 'write_brain' &&
      domain !== 'edit_brain_models' &&
      domain !== 'edit_brain_company' &&
      domain !== 'edit_brain_customer' &&
      domain !== 'manage_team_identity' &&
      domain !== 'manage_mission_control' &&
      domain !== 'read_flows' &&
      domain !== 'manage_flows' &&
      domain !== 'custom_db',
    requiresExplicitUserIntent: inferOperation(action) !== 'read',
    forbiddenUnlessExplicit:
      domain === 'write_brain' ||
      domain === 'edit_brain_models' ||
      domain === 'edit_brain_customer' ||
      inferOperation(action) === 'delete',
    hideFromArtifactTurns:
      domain === 'write_brain' ||
      domain === 'edit_brain_models' ||
      domain === 'edit_brain_company' ||
      domain === 'edit_brain_customer',
    delegateResolution: 'none',
    nearMissActions: [],
    skillKeys: [],
    schemaRef: `ACTION_SCHEMAS.${action}`,
    userVisibleResult: action.replace(/_/g, ' '),
    accessProof: 'canExecuteAction',
  }
}

export function getActionContract(action: Action): ActionContract {
  return ACTION_CONTRACTS[action] ?? fallbackContract(action)
}

export function isUserPolicyAddableAction(action: Action): boolean {
  return getActionContract(action).userPolicyAddable
}

export function getDelegateTargetAction(action: Action): Action | null {
  return getActionContract(action).delegateTargetAction ?? null
}

export function buildInlineAccessRequestContract(input: {
  action: Action
  agentKey: string
  agentName?: string | null
  reason?: string
}): InlineAccessRequestContract | null {
  if (!isAction(input.action)) return null
  const contract = getActionContract(input.action)
  if (!contract.userPolicyAddable) return null
  if (contract.operation === 'delete') return null
  if (contract.domain === 'code_projects' || contract.domain === 'custom_db') return null
  if (
    contract.domain === 'use_mcp' &&
    (input.action === 'add_mcp_server' || input.action === 'remove_mcp_server')
  ) {
    return null
  }
  return {
    type: 'agent_access_request',
    agent_key: input.agentKey,
    agent_name: input.agentName ?? null,
    missing_capability: {
      kind: 'action_domain',
      id: contract.domain,
    },
    required_action: input.action,
    reason:
      input.reason ??
      `${input.agentName ?? input.agentKey} needs ${contract.domain} access to execute ${input.action}.`,
    approve_action: 'agent_policy_allow_extra',
  }
}
