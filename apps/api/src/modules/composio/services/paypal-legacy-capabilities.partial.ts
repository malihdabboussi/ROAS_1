import type { LegacyCapabilityRow } from './composio-capability-catalog.types'

export const PAYPAL_LEGACY_CAPABILITIES: LegacyCapabilityRow[] = [
  {
    integration_id: 'paypal',
    action_slug: 'search_transactions',
    execution_mode: 'legacy',
    display_name: 'Search PayPal transactions',
    description:
      'Search PayPal transactions by date range (RFC3339 start_date and end_date, max 31 days). Optional filters: transaction_id, transaction_status, transaction_type.',
    parameters: {
      start_date: { type: 'string', required: true },
      end_date: { type: 'string', required: true },
      transaction_id: { type: 'string' },
      transaction_status: { type: 'string' },
      transaction_type: { type: 'string' },
      page: { type: 'number' },
      page_size: { type: 'number' },
    },
    examples: [],
    metadata: {},
    domains: [],
  },
  {
    integration_id: 'paypal',
    action_slug: 'get_transaction',
    execution_mode: 'legacy',
    display_name: 'Get PayPal transaction',
    description:
      'Get PayPal transaction details by transaction ID. Optional start_date and end_date (RFC3339) narrow the search window (defaults to last 30 days).',
    parameters: {
      transactionId: { type: 'string', required: true },
      start_date: { type: 'string' },
      end_date: { type: 'string' },
    },
    examples: [],
    metadata: {},
    domains: [],
  },
  {
    integration_id: 'paypal',
    action_slug: 'get_balance',
    execution_mode: 'legacy',
    display_name: 'Get PayPal balances',
    description:
      'Get PayPal reporting balances. Optional as_of_time (RFC3339) and currency_code (ISO 4217).',
    parameters: {
      as_of_time: { type: 'string' },
      currency_code: { type: 'string' },
    },
    examples: [],
    metadata: {},
    domains: [],
  }
]
