import type { LegacyCapabilityRow } from './composio-capability-catalog.types'

export const ACTIVE_CAMPAIGN_LEGACY_CAPABILITIES_2: LegacyCapabilityRow[] = [
  {
      action_slug: 'update_deal_note',
      display_name: 'Update Deal Note',
      description: 'Update a deal note by ID.',
      parameters: {
        id: { type: 'string', required: true },
        dealNote: { type: 'object', required: true },
      },
    },
  {
      action_slug: 'delete_deal_note',
      display_name: 'Delete Deal Note',
      description: 'Delete a deal note by ID.',
      parameters: { id: { type: 'string', required: true } },
    },
  {
      action_slug: 'list_pipelines',
      display_name: 'List Pipelines',
      description: 'List all deal pipelines.',
      parameters: { limit: { type: 'number' } },
    },
  {
      action_slug: 'get_pipeline',
      display_name: 'Get Pipeline',
      description: 'Retrieve a pipeline by ID.',
      parameters: { id: { type: 'string', required: true } },
    },
  {
      action_slug: 'create_pipeline',
      display_name: 'Create Pipeline',
      description: 'Create a new deal pipeline.',
      parameters: { dealGroup: { type: 'object', required: true } },
    },
  {
      action_slug: 'delete_pipeline',
      display_name: 'Delete Pipeline',
      description: 'Delete a pipeline by ID.',
      parameters: { id: { type: 'string', required: true } },
    },
  {
      action_slug: 'list_stages',
      display_name: 'List Stages',
      description: 'List all deal stages.',
      parameters: { limit: { type: 'number' } },
    },
  {
      action_slug: 'get_stage',
      display_name: 'Get Stage',
      description: 'Retrieve a deal stage by ID.',
      parameters: { id: { type: 'string', required: true } },
    },
  {
      action_slug: 'create_stage',
      display_name: 'Create Stage',
      description: 'Create a new deal stage.',
      parameters: { dealStage: { type: 'object', required: true } },
    },
  {
      action_slug: 'update_stage',
      display_name: 'Update Stage',
      description: 'Update a deal stage by ID.',
      parameters: {
        id: { type: 'string', required: true },
        dealStage: { type: 'object', required: true },
      },
    },
  {
      action_slug: 'delete_stage',
      display_name: 'Delete Stage',
      description: 'Delete a deal stage by ID.',
      parameters: { id: { type: 'string', required: true } },
    },
  {
      action_slug: 'list_deal_custom_fields',
      display_name: 'List Deal Custom Fields',
      description: 'List all custom field definitions for deals.',
      parameters: { limit: { type: 'number' } },
    },
  {
      action_slug: 'get_deal_custom_field',
      display_name: 'Get Deal Custom Field',
      description: 'Retrieve a deal custom field definition.',
      parameters: { id: { type: 'string', required: true } },
    },
  {
      action_slug: 'create_deal_custom_field',
      display_name: 'Create Deal Custom Field',
      description: 'Create a custom field for deals.',
      parameters: { dealCustomFieldMetum: { type: 'object', required: true } },
    },
  {
      action_slug: 'update_deal_custom_field',
      display_name: 'Update Deal Custom Field',
      description: 'Update a deal custom field.',
      parameters: {
        id: { type: 'string', required: true },
        dealCustomFieldMetum: { type: 'object', required: true },
      },
    },
  {
      action_slug: 'delete_deal_custom_field',
      display_name: 'Delete Deal Custom Field',
      description: 'Delete a deal custom field.',
      parameters: { id: { type: 'string', required: true } },
    },
  {
      action_slug: 'list_accounts',
      display_name: 'List Accounts',
      description: 'List all accounts (organizations).',
      parameters: { limit: { type: 'number' }, search: { type: 'string' } },
    },
  {
      action_slug: 'get_account',
      display_name: 'Get Account',
      description: 'Retrieve an account by ID.',
      parameters: { id: { type: 'string', required: true } },
    },
  {
      action_slug: 'create_account',
      display_name: 'Create Account',
      description: 'Create a new account.',
      parameters: { account: { type: 'object', required: true } },
    },
  {
      action_slug: 'update_account',
      display_name: 'Update Account',
      description: 'Update an account by ID.',
      parameters: {
        id: { type: 'string', required: true },
        account: { type: 'object', required: true },
      },
    },
  {
      action_slug: 'delete_account',
      display_name: 'Delete Account',
      description: 'Delete an account by ID.',
      parameters: { id: { type: 'string', required: true } },
    },
  {
      action_slug: 'create_account_note',
      display_name: 'Create Account Note',
      description: 'Add a note to an account.',
      parameters: { accountNote: { type: 'object', required: true } },
    },
  {
      action_slug: 'list_automations',
      display_name: 'List Automations',
      description: 'List all automations.',
      parameters: { limit: { type: 'number' } },
    },
  {
      action_slug: 'add_contact_to_automation',
      display_name: 'Add Contact to Automation',
      description: 'Add a contact to an automation.',
      parameters: { contactAutomation: { type: 'object', required: true } },
    },
  {
      action_slug: 'remove_contact_from_automation',
      display_name: 'Remove Contact from Automation',
      description: 'Remove a contact from an automation.',
      parameters: { id: { type: 'string', required: true } },
    },
  {
      action_slug: 'list_campaigns',
      display_name: 'List Campaigns',
      description: 'List all email campaigns.',
      parameters: { limit: { type: 'number' } },
    },
  {
      action_slug: 'get_campaign',
      display_name: 'Get Campaign',
      description: 'Retrieve a campaign by ID.',
      parameters: { id: { type: 'string', required: true } },
    },
  {
      action_slug: 'create_campaign',
      display_name: 'Create Campaign',
      description: 'Create a new email campaign.',
      parameters: { campaign: { type: 'object', required: true } },
    },
  {
      action_slug: 'update_campaign',
      display_name: 'Update Campaign',
      description: 'Update a campaign by ID.',
      parameters: {
        id: { type: 'string', required: true },
        campaign: { type: 'object', required: true },
      },
    },
  {
      action_slug: 'get_campaign_links',
      display_name: 'Get Campaign Links',
      description: 'Get links associated with a campaign.',
      parameters: { id: { type: 'string', required: true } },
    },
  {
      action_slug: 'list_messages',
      display_name: 'List Messages',
      description: 'List all messages.',
      parameters: { limit: { type: 'number' } },
    },
  {
      action_slug: 'get_message',
      display_name: 'Get Message',
      description: 'Retrieve a message by ID.',
      parameters: { id: { type: 'string', required: true } },
    },
  {
      action_slug: 'create_message',
      display_name: 'Create Message',
      description: 'Create a new message.',
      parameters: { message: { type: 'object', required: true } },
    },
  {
      action_slug: 'update_message',
      display_name: 'Update Message',
      description: 'Update a message by ID.',
      parameters: {
        id: { type: 'string', required: true },
        message: { type: 'object', required: true },
      },
    },
  {
      action_slug: 'delete_message',
      display_name: 'Delete Message',
      description: 'Delete a message by ID.',
      parameters: { id: { type: 'string', required: true } },
    }
].map((entry) => ({
  integration_id: 'active_campaign',
  execution_mode: 'legacy',
  examples: [],
  metadata: {},
  domains: [],
  ...entry,
}))
