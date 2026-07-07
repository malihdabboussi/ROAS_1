/**
 * Canonicalize integration ids across agent-api entry points.
 *
 * The agent can send `activecampaign`, `active-campaign`, or `google-drive`, but the DB and
 * the main API use snake_case (`active_campaign`, `google_drive`). Normalizing at the boundary
 * means `check_integration_connection`, `get_integration`, `initiate_integration_connect`, and
 * `use_integration` all hit the same row instead of missing and pretending the integration
 * does not exist.
 */
const SOCIAL_ANALYSIS_INTERNAL_ID = 'scrapecreators'
const SOCIAL_ANALYSIS_AGENT_ID = 'social_analysis'
const SEO_RESEARCH_INTERNAL_ID = 'dataforseo'
const SEO_RESEARCH_AGENT_ID = 'seo_research'

const INTEGRATION_ID_ALIASES: Record<string, string> = {
  activecampaign: 'active_campaign',
  'active-campaign': 'active_campaign',
  googledrive: 'google_drive',
  'google-drive': 'google_drive',
  googlesheets: 'google_sheets',
  'google-sheets': 'google_sheets',
  googledocs: 'google_docs',
  'google-docs': 'google_docs',
  googleads: 'google_ads',
  'google-ads': 'google_ads',
  googleanalytics: 'google_analytics',
  'google-analytics': 'google_analytics',
  googlecalendar: 'google_calendar',
  'google-calendar': 'google_calendar',
  googlesearchconsole: 'google_search_console',
  'google-search-console': 'google_search_console',
  socialanalysis: SOCIAL_ANALYSIS_INTERNAL_ID,
  social_analysis: SOCIAL_ANALYSIS_INTERNAL_ID,
  'social-analysis': SOCIAL_ANALYSIS_INTERNAL_ID,
  seoresearch: SEO_RESEARCH_INTERNAL_ID,
  seo_research: SEO_RESEARCH_INTERNAL_ID,
  'seo-research': SEO_RESEARCH_INTERNAL_ID,
}

export function canonicalizeIntegrationId(rawId: string | null | undefined): string {
  const id = String(rawId ?? '')
    .trim()
    .toLowerCase()
  if (!id) return ''
  return INTEGRATION_ID_ALIASES[id] ?? id
}

export function toAgentFacingIntegrationId(rawId: string | null | undefined): string {
  const id = canonicalizeIntegrationId(rawId)
  if (id === SOCIAL_ANALYSIS_INTERNAL_ID) return SOCIAL_ANALYSIS_AGENT_ID
  if (id === SEO_RESEARCH_INTERNAL_ID) return SEO_RESEARCH_AGENT_ID
  return id
}
