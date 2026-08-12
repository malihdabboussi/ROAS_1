import type { Action } from './actions.js'
import { ACTIONS } from './actions.js'
import type { Domain } from './domains.js'
import { DOMAINS } from './domains.js'

export const MCP_BASE_SCOPE = 'mcp:tools' as const

export type McpBaseScope = typeof MCP_BASE_SCOPE
export type McpScope = McpBaseScope | Domain
export type McpOrgRole = 'owner' | 'admin' | 'creator' | 'editor' | 'viewer'

export interface McpToolCatalogEntry {
  toolName: string
  action: Action
  requiredScopes: McpScope[]
  description: string
  inputMode: 'action_schema'
}

export type McpPermissionLevel = 'none' | 'read' | 'write'

export interface McpPermissionGroup {
  id: string
  label: string
  description: string
  readScopes: McpScope[]
  writeScopes: McpScope[]
  includedActions: Action[]
}

export interface McpPermissionGroupGrant extends McpPermissionGroup {
  level: McpPermissionLevel
}

export const MCP_V1_TOOL_CATALOG = [
  {
    toolName: 'describe_vibey_action',
    action: 'describe_action',
    requiredScopes: [MCP_BASE_SCOPE, 'communicate'],
    description: 'Describe the input contract for a Vibey action.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'search_vibey_docs',
    action: 'search_vibey_docs',
    requiredScopes: [MCP_BASE_SCOPE, 'communicate'],
    description:
      'Search Vibey product documentation for guidance on features, actions, and policies.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'search_brains',
    action: 'search_brain_context',
    requiredScopes: [MCP_BASE_SCOPE, 'read_brain_personal'],
    description: 'Search the authenticated user brain context.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'search_user_brain',
    action: 'search_user_brain',
    requiredScopes: [MCP_BASE_SCOPE, 'read_brain_personal'],
    description: 'Search user brain memories.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'list_user_brain_memories',
    action: 'list_user_brain_memories',
    requiredScopes: [MCP_BASE_SCOPE, 'read_brain_personal'],
    description: 'List recent user brain memories.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'save_user_memory',
    action: 'save_user_memory',
    requiredScopes: [MCP_BASE_SCOPE, 'write_user_memory'],
    description: 'Save a memory to the authenticated user brain.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'atlas_save_brain_context',
    action: 'atlas_save_brain_context',
    requiredScopes: [
      MCP_BASE_SCOPE,
      'write_user_memory',
      'edit_brain_customer',
      'edit_brain_company',
      'write_brain',
      'edit_campaign',
      'manage_content',
    ],
    description: 'Save knowledge to the right Brain or context surface through Atlas routing.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'search_customer_brain',
    action: 'search_customer_brain',
    requiredScopes: [MCP_BASE_SCOPE, 'read_brain_customer'],
    description: 'Search customer brain memories available to the authenticated user.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'search_agent_brain',
    action: 'search_agent_brain',
    requiredScopes: [MCP_BASE_SCOPE, 'read_brain_agent'],
    description: 'Search agent brain content available to the authenticated user.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'list_accessible_brains',
    action: 'list_available_brain_scopes',
    requiredScopes: [MCP_BASE_SCOPE, 'read_brain_personal'],
    description: 'List accessible user and agent Brain scopes.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'resolve_agent_brain',
    action: 'resolve_agent_brain',
    requiredScopes: [MCP_BASE_SCOPE, 'read_brain_agent'],
    description: 'Resolve an agent id/key to an Agent Brain id.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'list_agents',
    action: 'list_team',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_own_skills'],
    description: 'List available Vibey agents so a client can choose an agent_key.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'list_agent_skills',
    action: 'list_agent_skills',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_own_skills'],
    description: 'List skills for one Vibey agent before creating a new skill.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'create_agent_skill',
    action: 'create_agent_skill',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_own_skills'],
    description: 'Create a new skill for one existing Vibey agent.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'create_agent_skill_reference',
    action: 'create_agent_skill_resource',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_own_skills'],
    description: 'Attach a text or markdown reference file to an existing agent skill.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'upload_agent_skill_image_reference',
    action: 'upload_skill_asset',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_own_skills'],
    description:
      'Upload an image URL or asset_ref into skill-assets and attach it as an image reference on an existing agent skill.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'search_company_brain',
    action: 'search_company_brain',
    requiredScopes: [MCP_BASE_SCOPE, 'read_brain_company'],
    description: 'Search company brain content available to the authenticated user.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'propose_company_brain_signal',
    action: 'propose_company_brain_signal',
    requiredScopes: [MCP_BASE_SCOPE, 'edit_brain_company'],
    description: 'Propose company brain knowledge for human review before formation.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'save_space_document',
    action: 'save_document',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_content'],
    description: 'Save a document into the active Vibey space context.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'create_docx_document',
    action: 'create_docx',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_content'],
    description: 'Create a downloadable Word DOCX document in the active Vibey context.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'list_documents',
    action: 'list_documents',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_content'],
    description: 'List documents in the active Vibey context.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'get_document',
    action: 'get_document',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_content'],
    description: 'Read a saved Vibey conversation document.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'read_space_document',
    action: 'read_space_document',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_content'],
    description: 'Read a document from a Vibey space.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'search_conversations',
    action: 'search_conversations',
    requiredScopes: [MCP_BASE_SCOPE, 'read_space_context'],
    description: 'Search the authenticated user’s Vibey conversation history by title.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'search_space_context',
    action: 'search_space_context',
    requiredScopes: [MCP_BASE_SCOPE, 'read_space_context'],
    description: 'Search semantic context across the active Vibey Space.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'list_spaces',
    action: 'list_spaces',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_tasks_missions'],
    description: 'List Vibey Spaces, optionally filtered by campaign.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'get_space',
    action: 'get_space',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_tasks_missions'],
    description: 'Read one Vibey Space by id.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'list_space_views',
    action: 'list_space_views',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_tasks_missions'],
    description: 'List the configured views inside a Vibey Space.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'get_space_view',
    action: 'get_space_view',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_tasks_missions'],
    description: 'Read one configured view inside a Vibey Space.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'list_space_view_items',
    action: 'list_space_view_items',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_tasks_missions'],
    description: 'List items inside a Space view.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'get_space_item',
    action: 'get_space_item',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_tasks_missions'],
    description: 'Read one item from a Vibey Space.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'list_contacts',
    action: 'list_contacts',
    requiredScopes: [MCP_BASE_SCOPE, 'read_contacts'],
    description: 'List org-scoped CRM contacts.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'get_contact',
    action: 'get_contact',
    requiredScopes: [MCP_BASE_SCOPE, 'read_contacts'],
    description: 'Read one org-scoped CRM contact.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'create_contact',
    action: 'create_contact',
    requiredScopes: [MCP_BASE_SCOPE, 'edit_contacts'],
    description: 'Create a minimal manual CRM contact.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'update_contact',
    action: 'update_contact',
    requiredScopes: [MCP_BASE_SCOPE, 'edit_contacts'],
    description: 'Update CRM contact fields.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'add_contact_note',
    action: 'add_contact_note',
    requiredScopes: [MCP_BASE_SCOPE, 'edit_contacts'],
    description: 'Add an internal note to a CRM contact.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'update_contact_note',
    action: 'update_contact_note',
    requiredScopes: [MCP_BASE_SCOPE, 'edit_contacts'],
    description: 'Update an internal CRM contact note.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'get_contact_activity',
    action: 'get_contact_activity',
    requiredScopes: [MCP_BASE_SCOPE, 'read_contacts'],
    description: 'Read CRM contact timeline activity.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'list_contact_communications',
    action: 'list_contact_communications',
    requiredScopes: [MCP_BASE_SCOPE, 'read_contacts'],
    description: 'List contact emails and widget, Telegram, or app conversations.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'create_space_field',
    action: 'create_space_field',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_tasks_missions'],
    description: 'Create a user field in a Vibey Space schema.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'update_space_field',
    action: 'update_space_field',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_tasks_missions'],
    description: 'Rename a user Space field, replace select options, or show a field in views.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'append_space_field_option',
    action: 'append_space_field_option',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_tasks_missions'],
    description: 'Append one option to an existing Space select or multi-select field.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'create_space_status',
    action: 'create_space_status',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_tasks_missions'],
    description: 'Append one status option to a Space status field.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'create_space_category',
    action: 'create_space_category',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_tasks_missions'],
    description: 'Append one category option, creating the default category field if needed.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'create_space_tag',
    action: 'create_space_tag',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_tasks_missions'],
    description: 'Append one tag option to a Space tags field.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'create_space_view',
    action: 'create_space_view',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_tasks_missions'],
    description: 'Create a configured view in a Vibey Space schema.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'update_space_view',
    action: 'update_space_view',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_tasks_missions'],
    description: 'Rename or reconfigure an existing Vibey Space view.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'list_tasks',
    action: 'list_tasks',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_tasks_missions'],
    description: 'List tasks inside a Vibey Space.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'get_task',
    action: 'get_task',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_tasks_missions'],
    description: 'Read one task inside a Vibey Space.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'create_campaign',
    action: 'create_campaign',
    requiredScopes: [MCP_BASE_SCOPE, 'edit_campaign'],
    description: 'Create a Vibey campaign.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'list_campaigns',
    action: 'list_campaigns',
    requiredScopes: [MCP_BASE_SCOPE, 'read_campaign'],
    description: 'List Vibey campaigns available to the authenticated user.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'get_campaign',
    action: 'get_campaign',
    requiredScopes: [MCP_BASE_SCOPE, 'read_campaign'],
    description: 'Read one Vibey campaign by id.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'search_campaign_brain',
    action: 'search_campaign_brain',
    requiredScopes: [MCP_BASE_SCOPE, 'read_campaign'],
    description:
      'Search the campaign brain (ns_memories) for client research, onboarding intake, and strategy knowledge.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'create_funnel',
    action: 'create_funnel',
    requiredScopes: [MCP_BASE_SCOPE, 'write_marketing_artifacts'],
    description: 'Create a single-purpose Vibey funnel or standalone page artifact.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'create_website',
    action: 'create_website',
    requiredScopes: [MCP_BASE_SCOPE, 'write_marketing_artifacts'],
    description: 'Create a first-class Vibey website artifact.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'list_funnels',
    action: 'list_funnels',
    requiredScopes: [MCP_BASE_SCOPE, 'read_marketing_artifacts'],
    description: 'List funnels for the active Vibey campaign.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'list_forms',
    action: 'list_forms',
    requiredScopes: [MCP_BASE_SCOPE, 'read_marketing_artifacts'],
    description: 'List native Forms for the active Vibey campaign.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'get_form',
    action: 'get_form',
    requiredScopes: [MCP_BASE_SCOPE, 'read_marketing_artifacts'],
    description: 'Read one native Vibey Form.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'create_form',
    action: 'create_form',
    requiredScopes: [MCP_BASE_SCOPE, 'write_marketing_artifacts'],
    description: 'Create a native Vibey Form with schema, settings, colors, and image URLs.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'update_form',
    action: 'update_form',
    requiredScopes: [MCP_BASE_SCOPE, 'write_marketing_artifacts'],
    description: 'Update a native Vibey Form schema, settings, visibility, or metadata.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'attach_form_asset',
    action: 'attach_form_asset',
    requiredScopes: [MCP_BASE_SCOPE, 'write_marketing_artifacts'],
    description: 'Attach an uploaded or campaign media image to a native Vibey Form slot.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'publish_form',
    action: 'publish_form',
    requiredScopes: [MCP_BASE_SCOPE, 'write_marketing_artifacts'],
    description: 'Publish a native Vibey Form and return its public URL.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'unpublish_form',
    action: 'unpublish_form',
    requiredScopes: [MCP_BASE_SCOPE, 'write_marketing_artifacts'],
    description: 'Move a native Vibey Form back to draft status.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'list_form_responses',
    action: 'list_form_responses',
    requiredScopes: [MCP_BASE_SCOPE, 'read_marketing_artifacts'],
    description: 'List recent responses for one native Vibey Form.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'list_websites',
    action: 'list_websites',
    requiredScopes: [MCP_BASE_SCOPE, 'read_marketing_artifacts'],
    description: 'List first-class websites for the active Vibey campaign.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'add_funnel_page',
    action: 'add_funnel_page',
    requiredScopes: [MCP_BASE_SCOPE, 'write_marketing_artifacts'],
    description: 'Add a page to an existing Vibey funnel.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'add_website_page',
    action: 'add_website_page',
    requiredScopes: [MCP_BASE_SCOPE, 'write_marketing_artifacts'],
    description: 'Add a website-safe page to an existing Vibey website.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'update_funnel_page',
    action: 'update_funnel_page',
    requiredScopes: [MCP_BASE_SCOPE, 'write_marketing_artifacts'],
    description: 'Update a page in an existing Vibey funnel.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'update_website_page',
    action: 'update_website_page',
    requiredScopes: [MCP_BASE_SCOPE, 'write_marketing_artifacts'],
    description: 'Update a page in an existing Vibey website.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'create_email_sequence',
    action: 'create_sequence',
    requiredScopes: [MCP_BASE_SCOPE, 'write_marketing_artifacts'],
    description: 'Create an email sequence.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'list_sequences',
    action: 'list_sequences',
    requiredScopes: [MCP_BASE_SCOPE, 'read_marketing_artifacts'],
    description: 'List email sequences for the active Vibey campaign.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'add_sequence_email',
    action: 'add_sequence_email',
    requiredScopes: [MCP_BASE_SCOPE, 'write_marketing_artifacts'],
    description: 'Add an email to an existing sequence.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'create_mission',
    action: 'create_mission',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_tasks_missions'],
    description: 'Create a Vibey mission.',
    inputMode: 'action_schema',
  },
  {
    toolName: 'list_missions',
    action: 'list_missions',
    requiredScopes: [MCP_BASE_SCOPE, 'manage_tasks_missions'],
    description: 'List Vibey missions available to the authenticated user.',
    inputMode: 'action_schema',
  },
] as const satisfies readonly McpToolCatalogEntry[]

const MCP_V1_DOMAIN_SCOPES = Array.from(
  new Set(
    MCP_V1_TOOL_CATALOG.flatMap((tool) => tool.requiredScopes).filter(
      (scope) => scope !== MCP_BASE_SCOPE,
    ),
  ),
) as Domain[]

export const MCP_PERMISSION_GROUPS = [
  {
    id: 'assistant_context',
    label: 'Assistant context',
    description: 'Inspect Vibey action contracts so the MCP client knows how to call tools.',
    readScopes: ['communicate'],
    writeScopes: [],
    includedActions: ['describe_action', 'search_vibey_docs'],
  },
  {
    id: 'personal_brain',
    label: 'Personal brain',
    description: 'Search and save memories in your personal brain.',
    readScopes: ['read_brain_personal'],
    writeScopes: ['write_user_memory'],
    includedActions: [
      'search_brain_context',
      'search_user_brain',
      'list_user_brain_memories',
      'list_available_brain_scopes',
      'save_user_memory',
    ],
  },
  {
    id: 'customer_brain',
    label: 'Customer brain',
    description: 'Search customer intelligence available to this account.',
    readScopes: ['read_brain_customer'],
    writeScopes: ['edit_brain_customer'],
    includedActions: ['search_customer_brain'],
  },
  {
    id: 'agent_brain',
    label: 'Agent brain',
    description: 'Find, resolve, and search agent brain content available to this account.',
    readScopes: ['read_brain_agent'],
    writeScopes: ['write_brain'],
    includedActions: ['search_agent_brain', 'resolve_agent_brain'],
  },
  {
    id: 'company_brain',
    label: 'Company brain',
    description: 'Search Company Brain and propose reviewed company knowledge signals.',
    readScopes: ['read_brain_company'],
    writeScopes: ['edit_brain_company'],
    includedActions: ['search_company_brain', 'propose_company_brain_signal'],
  },
  {
    id: 'agent_skills',
    label: 'Agent skills',
    description:
      'List agents, inspect skills, create skills, and attach text or image references to skills.',
    readScopes: ['manage_own_skills'],
    writeScopes: ['manage_own_skills'],
    includedActions: [
      'list_team',
      'list_agent_skills',
      'create_agent_skill',
      'create_agent_skill_resource',
      'upload_skill_asset',
    ],
  },
  {
    id: 'atlas_brain_save_router',
    label: 'Atlas brain save router',
    description:
      'Route save requests to user, customer, company, agent, campaign, or Space context.',
    readScopes: [],
    writeScopes: [
      'write_user_memory',
      'edit_brain_customer',
      'edit_brain_company',
      'write_brain',
      'edit_campaign',
      'manage_content',
    ],
    includedActions: ['atlas_save_brain_context'],
  },
  {
    id: 'space_content',
    label: 'Space content',
    description: 'List, read, and save documents in the active Vibey space.',
    readScopes: ['manage_content'],
    writeScopes: ['manage_content'],
    includedActions: [
      'save_document',
      'create_docx',
      'list_documents',
      'get_document',
      'read_space_document',
    ],
  },
  {
    id: 'space_retrieval',
    label: 'Space retrieval',
    description:
      'Search semantic Space context before reading exact documents, tasks, or missions.',
    readScopes: ['read_space_context'],
    writeScopes: [],
    includedActions: ['search_space_context', 'search_conversations'],
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    description: 'Read and create campaigns from the MCP client.',
    readScopes: ['read_campaign'],
    writeScopes: ['edit_campaign'],
    includedActions: ['list_campaigns', 'get_campaign', 'create_campaign', 'search_campaign_brain'],
  },
  {
    id: 'contacts',
    label: 'Contacts',
    description: 'List, read, create, update, and annotate org-scoped CRM contacts.',
    readScopes: ['read_contacts'],
    writeScopes: ['edit_contacts'],
    includedActions: [
      'list_contacts',
      'get_contact',
      'get_contact_activity',
      'list_contact_communications',
      'create_contact',
      'update_contact',
      'add_contact_note',
      'update_contact_note',
    ],
  },
  {
    id: 'marketing_assets',
    label: 'Marketing assets',
    description: 'Read and create funnels, forms, websites, and email sequences.',
    readScopes: ['read_marketing_artifacts'],
    writeScopes: ['write_marketing_artifacts'],
    includedActions: [
      'list_funnels',
      'list_forms',
      'get_form',
      'list_websites',
      'create_funnel',
      'create_form',
      'update_form',
      'attach_form_asset',
      'publish_form',
      'unpublish_form',
      'list_form_responses',
      'create_website',
      'add_funnel_page',
      'add_website_page',
      'update_funnel_page',
      'update_website_page',
      'list_sequences',
      'create_sequence',
      'add_sequence_email',
    ],
  },
  {
    id: 'missions',
    label: 'Spaces, tasks, and missions',
    description: 'Browse Spaces and tasks, and read or create Vibey missions.',
    readScopes: ['manage_tasks_missions'],
    writeScopes: ['manage_tasks_missions'],
    includedActions: [
      'list_spaces',
      'get_space',
      'list_space_views',
      'get_space_view',
      'list_space_view_items',
      'get_space_item',
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
      'list_missions',
      'create_mission',
    ],
  },
] as const satisfies readonly McpPermissionGroup[]

const MCP_PERMISSION_GROUP_SCOPE_SET = new Set<string>(
  MCP_PERMISSION_GROUPS.flatMap((group) => [...group.readScopes, ...group.writeScopes]),
)

const MCP_PERMISSION_GROUP_BY_ID = new Map<string, McpPermissionGroup>(
  MCP_PERMISSION_GROUPS.map((group) => [group.id, group]),
)

const MCP_GRANTABLE_DOMAIN_SCOPES = Array.from(
  new Set([...MCP_V1_DOMAIN_SCOPES, ...MCP_PERMISSION_GROUP_SCOPE_SET]),
) as Domain[]

export const MCP_V1_SCOPES = [MCP_BASE_SCOPE, ...MCP_GRANTABLE_DOMAIN_SCOPES] as const

const CREATOR_EDITOR_SCOPES: McpScope[] = [
  MCP_BASE_SCOPE,
  'communicate',
  'read_campaign',
  'edit_campaign',
  'read_marketing_artifacts',
  'write_marketing_artifacts',
  'manage_content',
  'read_space_context',
  'read_contacts',
  'edit_contacts',
  'manage_tasks_missions',
  'read_brain_personal',
  'read_brain_agent',
  'read_brain_company',
  'read_brain_customer',
  'write_user_memory',
]

const VIEWER_SCOPES: McpScope[] = [
  MCP_BASE_SCOPE,
  'communicate',
  'read_campaign',
  'read_marketing_artifacts',
  'manage_content',
  'read_space_context',
  'read_contacts',
  'read_brain_personal',
  'read_brain_agent',
  'read_brain_company',
  'read_brain_customer',
]

export const MCP_ORG_ROLE_SCOPE_CEILINGS: Record<McpOrgRole, McpScope[]> = {
  owner: [...MCP_V1_SCOPES],
  admin: [...MCP_V1_SCOPES],
  creator: CREATOR_EDITOR_SCOPES,
  editor: CREATOR_EDITOR_SCOPES,
  viewer: VIEWER_SCOPES,
}

const MCP_SCOPE_SET = new Set<string>(MCP_V1_SCOPES)
const MCP_TOOL_BY_NAME: Map<string, McpToolCatalogEntry> = new Map(
  MCP_V1_TOOL_CATALOG.map((tool) => [tool.toolName, tool]),
)
const MCP_TOOL_BY_ACTION: Map<string, McpToolCatalogEntry> = new Map(
  MCP_V1_TOOL_CATALOG.map((tool) => [tool.action, tool]),
)
const ACTION_SET = new Set<string>(ACTIONS)
const DOMAIN_SET = new Set<string>(DOMAINS)

export function isMcpScope(scope: string): scope is McpScope {
  return MCP_SCOPE_SET.has(scope)
}

export function getMcpToolByName(toolName: string): McpToolCatalogEntry | undefined {
  return MCP_TOOL_BY_NAME.get(toolName)
}

export function getMcpToolByAction(action: string): McpToolCatalogEntry | undefined {
  return MCP_TOOL_BY_ACTION.get(action)
}

export function getAllowedMcpScopesForOrgRole(
  role: McpOrgRole | null,
  personal: boolean,
): McpScope[] {
  if (personal) return [...MCP_V1_SCOPES]
  if (!role) return []
  return [...MCP_ORG_ROLE_SCOPE_CEILINGS[role]]
}

export function getMcpPermissionGroupsForScopes(
  scopes: readonly string[],
  options: { baseScopeMeansAll?: boolean } = {},
): McpPermissionGroupGrant[] {
  const normalizedScopes =
    options.baseScopeMeansAll && scopes.length === 1 && scopes[0] === MCP_BASE_SCOPE
      ? MCP_V1_SCOPES
      : scopes
  const scopeSet = new Set<string>(normalizedScopes)
  return MCP_PERMISSION_GROUPS.map((group) => {
    const hasWrite = group.writeScopes.some((scope) => scopeSet.has(scope))
    const hasRead = group.readScopes.some((scope) => scopeSet.has(scope))
    return {
      ...group,
      level: hasWrite ? 'write' : hasRead ? 'read' : 'none',
    }
  })
}

export function getMcpSelectableScopes(): McpScope[] {
  return [MCP_BASE_SCOPE, ...Array.from(MCP_PERMISSION_GROUP_SCOPE_SET)] as McpScope[]
}

export function resolveMcpScopesFromPermissionSelections(
  selections: Record<string, McpPermissionLevel>,
): McpScope[] {
  const selectedScopes = new Set<McpScope>()
  for (const [groupId, level] of Object.entries(selections)) {
    if (level === 'none') continue
    const group = MCP_PERMISSION_GROUP_BY_ID.get(groupId)
    if (!group) throw new Error(`Unknown MCP permission group: ${groupId}`)
    for (const scope of group.readScopes) selectedScopes.add(scope)
    if (level === 'write') {
      for (const scope of group.writeScopes) selectedScopes.add(scope)
    }
  }
  if (selectedScopes.size > 0) selectedScopes.add(MCP_BASE_SCOPE)
  return Array.from(selectedScopes)
}

export function assertNoForbiddenMcpIdentityArgs(args: Record<string, unknown>): void {
  if (Object.prototype.hasOwnProperty.call(args, 'user_id')) {
    throw new Error('MCP tool arguments cannot include user_id')
  }
  if (Object.prototype.hasOwnProperty.call(args, 'org_id')) {
    throw new Error('MCP tool arguments cannot include org_id')
  }
}

export function assertMcpCatalogIntegrity(): void {
  for (const tool of MCP_V1_TOOL_CATALOG) {
    if (!ACTION_SET.has(tool.action)) {
      throw new Error(`Unknown MCP action: ${tool.action}`)
    }
    for (const scope of tool.requiredScopes) {
      if (scope === MCP_BASE_SCOPE) continue
      if (!DOMAIN_SET.has(scope)) {
        throw new Error(`Unknown MCP scope: ${scope}`)
      }
    }
  }
  for (const group of MCP_PERMISSION_GROUPS) {
    for (const action of group.includedActions) {
      if (!ACTION_SET.has(action)) {
        throw new Error(`Unknown MCP permission action: ${action}`)
      }
      if (!MCP_TOOL_BY_ACTION.has(action)) {
        throw new Error(`MCP permission action is not exposed by a tool: ${action}`)
      }
    }
    for (const scope of [...group.readScopes, ...group.writeScopes]) {
      if (!DOMAIN_SET.has(scope)) {
        throw new Error(`Unknown MCP permission scope: ${scope}`)
      }
    }
  }
}
