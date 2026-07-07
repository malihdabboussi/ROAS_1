import type { LegacyCapabilityRow } from './composio-capability-catalog.types'

export const ACTIVE_CAMPAIGN_LEGACY_CAPABILITIES_4: LegacyCapabilityRow[] = [
  {
      action_slug: 'delete_address',
      display_name: 'Delete Address',
      description: 'Delete an address by ID.',
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
