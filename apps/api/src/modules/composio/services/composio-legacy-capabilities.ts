import { GHL_LEGACY_CAPABILITY_ENTRIES } from '../ghl-legacy-capabilities.partial'
import { SCRAPECREATORS_LEGACY_ENTRIES } from '../scrapecreators-legacy-capabilities.partial'
import type { LegacyCapabilityRow } from './composio-capability-catalog.types'
export { INTEGRATION_DOMAIN_MAP } from './composio-capability-catalog.types'
import { WORDPRESS_LEGACY_CAPABILITIES } from './wordpress-legacy-capabilities.partial'
import { CALENDLY_LEGACY_CAPABILITIES } from './calendly-legacy-capabilities.partial'
import { STRIPE_LEGACY_CAPABILITIES } from './stripe-legacy-capabilities.partial'
import { PAYPAL_LEGACY_CAPABILITIES } from './paypal-legacy-capabilities.partial'
import { FATHOM_LEGACY_CAPABILITIES } from './fathom-legacy-capabilities.partial'
import { FIREFLIES_LEGACY_CAPABILITIES } from './fireflies-legacy-capabilities.partial'
import { DROPBOX_LEGACY_CAPABILITIES } from './dropbox-legacy-capabilities.partial'
import { YOUTUBE_LEGACY_CAPABILITIES } from './youtube-legacy-capabilities.partial'
import { FANBASIS_LEGACY_CAPABILITIES } from './fanbasis-legacy-capabilities.partial'
import { SLACK_LEGACY_CAPABILITIES } from './slack-legacy-capabilities.partial'
import { ACTIVE_CAMPAIGN_LEGACY_CAPABILITIES_1 } from './active-campaign-legacy-capabilities-1.partial'
import { ACTIVE_CAMPAIGN_LEGACY_CAPABILITIES_2 } from './active-campaign-legacy-capabilities-2.partial'
import { ACTIVE_CAMPAIGN_LEGACY_CAPABILITIES_3 } from './active-campaign-legacy-capabilities-3.partial'
import { ACTIVE_CAMPAIGN_LEGACY_CAPABILITIES_4 } from './active-campaign-legacy-capabilities-4.partial'

function scrapecreatorsLegacyCapabilityRows(): LegacyCapabilityRow[] {
  return SCRAPECREATORS_LEGACY_ENTRIES.map((entry) => ({
    integration_id: 'scrapecreators',
    execution_mode: 'legacy',
    examples: [],
    metadata: { manual_capability_copy: true },
    domains: [],
    ...entry,
  }))
}

export const LEGACY_INTEGRATION_CAPABILITIES: LegacyCapabilityRow[] = [
  ...WORDPRESS_LEGACY_CAPABILITIES,
  ...CALENDLY_LEGACY_CAPABILITIES,
  ...STRIPE_LEGACY_CAPABILITIES,
  ...PAYPAL_LEGACY_CAPABILITIES,
  ...FATHOM_LEGACY_CAPABILITIES,
  ...FIREFLIES_LEGACY_CAPABILITIES,
  ...DROPBOX_LEGACY_CAPABILITIES,
  ...YOUTUBE_LEGACY_CAPABILITIES,
  ...FANBASIS_LEGACY_CAPABILITIES,
  ...SLACK_LEGACY_CAPABILITIES,
  ...ACTIVE_CAMPAIGN_LEGACY_CAPABILITIES_1,
  ...ACTIVE_CAMPAIGN_LEGACY_CAPABILITIES_2,
  ...ACTIVE_CAMPAIGN_LEGACY_CAPABILITIES_3,
  ...ACTIVE_CAMPAIGN_LEGACY_CAPABILITIES_4,
  ...GHL_LEGACY_CAPABILITY_ENTRIES,
  ...scrapecreatorsLegacyCapabilityRows(),
]
