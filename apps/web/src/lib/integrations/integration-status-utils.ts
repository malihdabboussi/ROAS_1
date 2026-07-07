import type { UserIntegration } from './integrations.types'

export function mapComposioToolkitToIntegrationId(toolkitSlug: string): string | null {
  const slug = toolkitSlug.trim().toLowerCase()
  if (!slug) return null

  const mapping: Record<string, string> = {
    'google-drive': 'google_drive',
    googledrive: 'google_drive',
    googleanalytics: 'google_analytics',
    'google-analytics': 'google_analytics',
    google_analytics: 'google_analytics',
    googlecalendar: 'google_calendar',
    'google-calendar': 'google_calendar',
    gmail: 'gmail',
    outlook: 'outlook',
    linkedin: 'linkedin',
    instagram: 'instagram',
    twitter: 'twitter',
    youtube: 'youtube',
    tiktok: 'tiktok',
    slack: 'slack',
    github: 'github',
    clickup: 'clickup',
    notion: 'notion',
    facebook: 'facebook',
    reddit: 'reddit',
    mailchimp: 'mailchimp',
    kit: 'kit',
    klaviyo: 'klaviyo',
    hubspot: 'hubspot',
    salesforce: 'salesforce',
    zoom: 'zoom',
    googledocs: 'google_docs',
    'google-docs': 'google_docs',
    google_docs: 'google_docs',
    googlesheets: 'google_sheets',
    'google-sheets': 'google_sheets',
    google_sheets: 'google_sheets',
    airtable: 'airtable',
    googleads: 'google_ads',
    'google-ads': 'google_ads',
    google_ads: 'google_ads',
    google_search_console: 'google_search_console',
    'google-search-console': 'google_search_console',
    canva: 'canva',
    vercel: 'vercel',
    active_campaign: 'active_campaign',
    activecampaign: 'active_campaign',
    'active-campaign': 'active_campaign',
    whop: 'whop',
    wordpress: 'wordpress',
  }

  return mapping[slug] || null
}

export function normalizeComposioAccountStatus(
  status: string | null | undefined,
): UserIntegration['status'] {
  const normalized = String(status ?? '')
    .trim()
    .toUpperCase()
  if (normalized === 'ACTIVE') return 'connected'
  if (normalized === 'INITIATED' || normalized === 'PENDING') return 'pending'
  if (normalized === 'FAILED' || normalized === 'ERROR') return 'error'
  if (normalized === 'EXPIRED' || normalized === 'INACTIVE' || normalized === 'REVOKED')
    return 'needs_reconnect'
  return 'disconnected'
}

export function normalizeIntegrationStatus(
  status: string | null | undefined,
): UserIntegration['status'] {
  const normalized = String(status ?? '')
    .trim()
    .toLowerCase()
  if (normalized === 'connected') return 'connected'
  if (normalized === 'pending') return 'pending'
  if (normalized === 'error') return 'error'
  if (normalized === 'needs_reconnect' || normalized === 'needs-reconnect') return 'needs_reconnect'
  return 'disconnected'
}

export function getAdminSubscriptionDisconnectPath(integrationId: string): string | null {
  const normalized = integrationId.trim().toLowerCase()
  if (normalized === 'openai_codex') return '/api/integrations/openai-codex/disconnect'
  if (normalized === 'anthropic_claude') return '/api/integrations/anthropic-claude/disconnect'
  return null
}

export function resolveComposioConnectionId(
  metadata: Record<string, unknown> | undefined,
): string | null {
  if (!metadata) return null

  const candidates = [
    metadata.connection_id,
    metadata.composio_connected_account_id,
    metadata.connected_account_id,
  ]

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }

  return null
}
