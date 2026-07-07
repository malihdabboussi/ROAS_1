export type LegacyCapabilityRow = {
  integration_id: string
  action_slug: string
  execution_mode: 'legacy'
  display_name: string
  description: string
  parameters: Record<string, unknown>
  examples: Array<Record<string, unknown>>
  metadata: Record<string, unknown>
  domains: string[]
  route_config?: Record<string, unknown> | null
}

export const INTEGRATION_DOMAIN_MAP: Record<string, string[]> = {
  instagram: ['marketing'],
  linkedin: ['marketing'],
  youtube: ['marketing'],
  tiktok: ['marketing'],
  twitter: ['marketing'],
  facebook: ['marketing'],
  meta: ['marketing'],
  stripe: ['marketing', 'analyst'],
  paypal: ['shared', 'analyst'],
  calendly: ['shared'],
  fathom: ['shared'],
  fireflies: ['shared'],
  gohighlevel: ['marketing'],
  google_drive: ['shared'],
  google_docs: ['shared'],
  google_sheets: ['shared'],
  google_ads: ['marketing', 'analyst'],
  google_search_console: ['marketing', 'analyst'],
  dropbox: ['shared'],
  github: ['developer'],
  slack: ['shared'],
  google_analytics: ['marketing', 'analyst'],
  google_calendar: ['shared'],
  gmail: ['shared'],
  outlook: ['shared'],
  clickup: ['shared'],
  notion: ['shared'],
  airtable: ['shared'],
  reddit: ['marketing'],
  mailchimp: ['marketing'],
  kit: ['marketing'],
  klaviyo: ['marketing'],
  hubspot: ['marketing', 'analyst'],
  salesforce: ['marketing', 'analyst'],
  zoom: ['shared'],
  canva: ['marketing'],
  vercel: ['developer'],
  active_campaign: ['marketing'],
  whop: ['marketing', 'analyst'],
  scrapecreators: ['marketing'],
  fanbasis: ['marketing', 'analyst'],
  elevenlabs: ['shared'],
  wordpress: ['marketing', 'shared'],
}
