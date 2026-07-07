export type IntegrationIdentityToolEntry = {
  tool: string
  extract: (data: Record<string, unknown>) => string | null
}

export const CONNECTION_IDENTITY_TOOL_MAP: Record<string, IntegrationIdentityToolEntry> = {
  gmail: {
    tool: 'GMAIL_GET_PROFILE',
    extract: (d) => {
      const rd = d.response_data as Record<string, unknown> | undefined
      return (
        (rd?.emailAddress as string | undefined) ?? (d.emailAddress as string | undefined) ?? null
      )
    },
  },
  google_calendar: {
    tool: 'GMAIL_GET_PROFILE',
    extract: (d) => {
      const rd = d.response_data as Record<string, unknown> | undefined
      return (
        (rd?.emailAddress as string | undefined) ?? (d.emailAddress as string | undefined) ?? null
      )
    },
  },
  google_drive: {
    tool: 'GMAIL_GET_PROFILE',
    extract: (d) => {
      const rd = d.response_data as Record<string, unknown> | undefined
      return (
        (rd?.emailAddress as string | undefined) ?? (d.emailAddress as string | undefined) ?? null
      )
    },
  },
  google_sheets: {
    tool: 'GMAIL_GET_PROFILE',
    extract: (d) => {
      const rd = d.response_data as Record<string, unknown> | undefined
      return (
        (rd?.emailAddress as string | undefined) ?? (d.emailAddress as string | undefined) ?? null
      )
    },
  },
  google_docs: {
    tool: 'GMAIL_GET_PROFILE',
    extract: (d) => {
      const rd = d.response_data as Record<string, unknown> | undefined
      return (
        (rd?.emailAddress as string | undefined) ?? (d.emailAddress as string | undefined) ?? null
      )
    },
  },
  google_ads: {
    tool: 'GMAIL_GET_PROFILE',
    extract: (d) => {
      const rd = d.response_data as Record<string, unknown> | undefined
      return (
        (rd?.emailAddress as string | undefined) ?? (d.emailAddress as string | undefined) ?? null
      )
    },
  },
  google_analytics: {
    tool: 'GMAIL_GET_PROFILE',
    extract: (d) => {
      const rd = d.response_data as Record<string, unknown> | undefined
      return (
        (rd?.emailAddress as string | undefined) ?? (d.emailAddress as string | undefined) ?? null
      )
    },
  },
  google_search_console: {
    tool: 'GMAIL_GET_PROFILE',
    extract: (d) => {
      const rd = d.response_data as Record<string, unknown> | undefined
      return (
        (rd?.emailAddress as string | undefined) ?? (d.emailAddress as string | undefined) ?? null
      )
    },
  },
  linkedin: {
    tool: 'LINKEDIN_GET_MY_INFO',
    extract: (d) => {
      const rd = (d.response_dict ?? d) as Record<string, unknown>
      const first = rd.localizedFirstName ?? rd.firstName ?? ''
      const last = rd.localizedLastName ?? rd.lastName ?? ''
      const name = `${first} ${last}`.trim()
      return name || ((rd.email as string) ?? null)
    },
  },
  slack: {
    tool: 'SLACK_AUTH_TEST',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      const team = rd.team as string | undefined
      const user = rd.user as string | undefined
      if (team && user) return `${team} — ${user}`
      return team ?? user ?? null
    },
  },
  notion: {
    tool: 'NOTION_FETCH_LOGGED_IN_USER_INFO',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      return (rd.name as string) ?? (rd.email as string) ?? null
    },
  },
  airtable: {
    tool: 'AIRTABLE_GET_USER_INFO',
    extract: (d) => {
      const rd = (d.response_data ?? d.response_dict ?? d) as Record<string, unknown>
      const user = rd.user as Record<string, unknown> | undefined
      return (
        (rd.email as string) ??
        (rd.email_address as string) ??
        (user?.email as string) ??
        (rd.name as string) ??
        (user?.name as string) ??
        (rd.id as string) ??
        (user?.id as string) ??
        null
      )
    },
  },
  outlook: {
    tool: 'OUTLOOK_USERS_GET_MY_PROFILE',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      return (
        (rd.mail as string) ??
        (rd.userPrincipalName as string) ??
        (rd.displayName as string) ??
        null
      )
    },
  },
  instagram: {
    tool: 'INSTAGRAM_GET_USER_INFO',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      const username = rd.username as string | undefined
      return username ? `@${username}` : null
    },
  },
  github: {
    tool: 'GITHUB_GET_THE_AUTHENTICATED_USER',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      return (rd.login as string) ?? (rd.email as string) ?? (rd.name as string) ?? null
    },
  },
  facebook: {
    tool: 'FACEBOOK_GET_CURRENT_USER',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      return (rd.name as string) ?? (rd.email as string) ?? null
    },
  },
  youtube: {
    tool: 'YOUTUBE_LIST_AUTHENTICATED_CHANNELS',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      const items = rd.items as Array<Record<string, unknown>> | undefined
      const snippet = items?.[0]?.snippet as Record<string, unknown> | undefined
      return (snippet?.title as string) ?? (snippet?.customUrl as string) ?? null
    },
  },
  hubspot: {
    tool: 'HUBSPOT_GET_ACCOUNT_INFO',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      return (
        (rd.portalId as string) ?? (rd.hub_domain as string) ?? (rd.companyName as string) ?? null
      )
    },
  },
  reddit: {
    tool: 'REDDIT_ADS_GET_ME',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      const name = rd.name as string | undefined
      return name ? `u/${name}` : null
    },
  },
  zoom: {
    tool: 'ZOOM_GET_USER',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      return (rd.email as string) ?? (rd.display_name as string) ?? null
    },
  },
  clickup: {
    tool: 'CLICKUP_GET_AUTHORIZED_USER',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      const user = rd.user as Record<string, unknown> | undefined
      return (user?.email as string) ?? (user?.username as string) ?? (rd.email as string) ?? null
    },
  },
  mailchimp: {
    tool: 'MAILCHIMP_GET_USER_METADATA',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      const login = rd.login as Record<string, unknown> | undefined
      return (
        (rd.account_name as string) ??
        (rd.email as string) ??
        (typeof login?.email === 'string' ? login.email : null) ??
        null
      )
    },
  },
  salesforce: {
    tool: 'SALESFORCE_GET_USER_INFO',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      return (rd.email as string) ?? (rd.display_name as string) ?? (rd.name as string) ?? null
    },
  },
  canva: {
    tool: 'CANVA_RETRIEVE_USER_PROFILE_DATA',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      const profile = rd.profile as Record<string, unknown> | undefined
      return (profile?.display_name as string) ?? (rd.display_name as string) ?? null
    },
  },
  twitter: {
    tool: 'TWITTER_USER_LOOKUP_ME',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      const dataObj = rd.data as Record<string, unknown> | undefined
      const username = dataObj?.username ?? rd.username
      return username ? `@${username}` : ((rd.name as string) ?? null)
    },
  },
  tiktok: {
    tool: 'TIKTOK_GET_USER_STATS',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      const dataObj = rd.data as Record<string, unknown> | undefined
      const user = dataObj?.user as Record<string, unknown> | undefined
      const username = user?.uniqueId ?? user?.nickname ?? rd.username ?? rd.display_name
      return username ? `@${String(username)}` : null
    },
  },
  calendly: {
    tool: 'CALENDLY_GET_CURRENT_USER',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      const resource = rd.resource as Record<string, unknown> | undefined
      return (
        (resource?.email as string) ??
        (resource?.name as string) ??
        (rd.email as string) ??
        (rd.name as string) ??
        null
      )
    },
  },
  kit: {
    tool: 'KIT_GET_CREATOR_PROFILE',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      return (rd.name as string) ?? (rd.email_address as string) ?? null
    },
  },
  dropbox: {
    tool: 'DROPBOX_GET_ABOUT_ME',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      const name = rd.name as Record<string, unknown> | undefined
      return (rd.email as string) ?? (name?.display_name as string) ?? null
    },
  },
  vercel: {
    tool: 'VERCEL_GET_AUTH_USER',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      const user = rd.user as Record<string, unknown> | undefined
      return (
        (user?.email as string) ??
        (user?.username as string) ??
        (user?.name as string) ??
        (rd.email as string) ??
        (rd.username as string) ??
        null
      )
    },
  },
  whop: {
    tool: 'WHOP_RETRIEVE_AUTHORIZED_USER',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      return (rd.username as string) ?? (rd.email as string) ?? null
    },
  },
  elevenlabs: {
    tool: 'ELEVENLABS_GET_USER_INFO',
    extract: (d) => {
      const rd = (d.response_data ?? d) as Record<string, unknown>
      return (rd.email as string) ?? (rd.first_name as string) ?? null
    },
  },
}

const COMPOSIO_TOOLKIT_INTEGRATION_ID_MAP: Record<string, string> = {
  'google-drive': 'google_drive',
  googledrive: 'google_drive',
  googledocs: 'google_docs',
  'google-docs': 'google_docs',
  google_docs: 'google_docs',
  googlesheets: 'google_sheets',
  'google-sheets': 'google_sheets',
  google_sheets: 'google_sheets',
  googleads: 'google_ads',
  'google-ads': 'google_ads',
  google_ads: 'google_ads',
  google_search_console: 'google_search_console',
  'google-search-console': 'google_search_console',
  googleanalytics: 'google_analytics',
  'google-analytics': 'google_analytics',
  google_analytics: 'google_analytics',
  googlecalendar: 'google_calendar',
  'google-calendar': 'google_calendar',
  gmail: 'gmail',
  outlook: 'outlook',
  github: 'github',
  linkedin: 'linkedin',
  instagram: 'instagram',
  twitter: 'twitter',
  youtube: 'youtube',
  tiktok: 'tiktok',
  slack: 'slack',
  clickup: 'clickup',
  notion: 'notion',
  airtable: 'airtable',
  facebook: 'facebook',
  reddit: 'reddit',
  mailchimp: 'mailchimp',
  kit: 'kit',
  klaviyo: 'klaviyo',
  hubspot: 'hubspot',
  salesforce: 'salesforce',
  canva: 'canva',
  vercel: 'vercel',
  zoom: 'zoom',
  active_campaign: 'active_campaign',
  activecampaign: 'active_campaign',
  'active-campaign': 'active_campaign',
  whop: 'whop',
}

export function mapComposioToolkitToIntegrationId(toolkitSlug: string): string | null {
  const slug = toolkitSlug.trim().toLowerCase()
  if (!slug) return null
  return COMPOSIO_TOOLKIT_INTEGRATION_ID_MAP[slug] ?? null
}
