/**
 * GoHighLevel legacy capabilities: Vibey lead sync.
 */
import type { GhlLegacyRow } from './ghl-legacy-capabilities.shared.partial'
import { p } from './ghl-legacy-capabilities.shared.partial'

export const GHL_LEGACY_VIBE_LEAD_CAPABILITY_ENTRIES: GhlLegacyRow[] = [
  {
    integration_id: 'gohighlevel',
    action_slug: 'upsert_lead_contact',
    execution_mode: 'legacy',
    display_name: 'Upsert Lead Contact',
    description:
      'Create or update a GoHighLevel CRM contact from a Vibey lead and persist ghl_contact_id on the lead.',
    parameters: p({
      leadId: { type: 'string', required: true },
      email: { type: 'string', required: true },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      phone: { type: 'string' },
    }),
    examples: [],
    metadata: {},
    domains: [],
  },
]
