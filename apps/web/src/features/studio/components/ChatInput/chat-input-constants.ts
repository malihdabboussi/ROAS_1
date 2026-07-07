export const CONTEXT_BREAKDOWN_PANEL_ENABLED =
  process.env.NEXT_PUBLIC_CONTEXT_BREAKDOWN_PANEL_ENABLED ??
  (process.env.NODE_ENV === 'production' ? 'false' : 'true')

export const SLASH_SECTION_PREVIEW = 3
export const AT_SECTION_PREVIEW = 5
/** Collapsed @-menu groups (artifacts + media): items per type before "Show N more". */
export const MENU_GROUP_PREVIEW = 5
export const PLUS_SUBMENU_CLOSE_DELAY_MS = 240
export const PLUS_MENU_GAP = 2
export const PLUS_SUBMENU_GAP = 2
export const PLUS_MENU_WIDTH = 220
export const PLUS_MENU_HEIGHT_CAP = 320
export const PLUS_MENU_HEIGHT_ESTIMATE = 200
export const MODEL_DROPDOWN_WIDTH = 240
export const MODEL_DROPDOWN_HEIGHT_CAP = 360
export const MODEL_HOVER_CARD_WIDTH = 280
export const MODEL_EDIT_PANEL_WIDTH = 240
export const DEFAULT_ESTIMATED_CONTEXT_WINDOW = 200_000

export const INTEGRATION_ICONS: Record<string, string> = {
  meta: '/Integrations/Meta.png',
  stripe: '/Integrations/Stripe.png',
  paypal: '/Integrations/PayPal.png',
  github: '/Integrations/GitHub.png',
  google_drive: '/Integrations/GoogleDrive.png',
  dropbox: '/Integrations/Dropbox.png',
  calendly: '/Integrations/Calendly.png',
  gohighlevel: '/Integrations/GHL.png',
  fathom: '/Integrations/Fathom.png',
  fireflies: '/Integrations/Fireflies.png',
  slack: '/Integrations/Slack.png',
  linkedin: '/Integrations/LinkedIn.png',
  instagram: '/Integrations/Instagram.png',
  youtube: '/Integrations/YouTube.png',
  twitter: '/Integrations/Twitter.png',
  tiktok: '/Integrations/TikTok.png',
  google_analytics: '/Integrations/GoogleAnalytics.png',
  google_calendar: '/Integrations/GoogleCalendar.png',
  gmail: '/Integrations/Gmail.png',
  outlook: '/Integrations/Outlook.png',
  clickup: '/Integrations/ClickUp.png',
  notion: '/Integrations/Notion.png',
  facebook: '/Integrations/Facebook.png',
  reddit: '/Integrations/Reddit.png',
  mailchimp: '/Integrations/Mailchimp.png',
  kit: '/Integrations/Kit.png',
  hubspot: '/Integrations/HubSpot.png',
  salesforce: '/Integrations/Salesforce.png',
  zoom: '/Integrations/Zoom.png',
  google_ads: '/Integrations/GoogleAds.png',
  google_search_console: '/Integrations/GoogleSearchConsole.png',
  google_sheets: '/Integrations/GoogleSheets.png',
  google_docs: '/Integrations/GoogleDocs.png',
  canva: '/Integrations/Canva.png',
  vercel: '/Integrations/Vercel.png',
  active_campaign: '/Integrations/ActiveCampaign.png',
  whop: '/Integrations/Whop.png',
  elevenlabs: '/Integrations/ElevenLabs.png',
}

export const INTEGRATION_NAMES: Record<string, string> = {
  meta: 'Meta',
  stripe: 'Stripe',
  paypal: 'PayPal',
  github: 'GitHub',
  google_drive: 'Google Drive',
  dropbox: 'Dropbox',
  calendly: 'Calendly',
  gohighlevel: 'GoHighLevel',
  fathom: 'Fathom',
  fireflies: 'Fireflies',
  slack: 'Slack',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  youtube: 'YouTube',
  twitter: 'X (Twitter)',
  tiktok: 'TikTok',
  google_analytics: 'Google Analytics',
  google_calendar: 'Google Calendar',
  gmail: 'Gmail',
  outlook: 'Microsoft Outlook',
  clickup: 'ClickUp',
  notion: 'Notion',
  facebook: 'Facebook',
  reddit: 'Reddit',
  mailchimp: 'Mailchimp',
  kit: 'Kit (ConvertKit)',
  hubspot: 'HubSpot',
  salesforce: 'Salesforce',
  zoom: 'Zoom',
  google_ads: 'Google Ads',
  google_search_console: 'Google Search Console',
  google_sheets: 'Google Sheets',
  google_docs: 'Google Docs',
  canva: 'Canva',
  vercel: 'Vercel',
  active_campaign: 'ActiveCampaign',
  whop: 'Whop',
  elevenlabs: 'ElevenLabs',
}

export const CONNECT_ENDPOINTS: Record<string, string> = {
  meta: '/api/integrations/meta/connect',
  stripe: '/api/integrations/stripe/connect',
  paypal: '/api/integrations/paypal/connect',
  dropbox: '/api/integrations/dropbox/connect',
  calendly: '/api/integrations/calendly/connect',
  gohighlevel: '/api/integrations/lhg/connect',
  fathom: '/api/integrations/fathom/connect',
}

export const SUGGESTED_INTEGRATIONS = ['meta', 'stripe', 'google_drive', 'calendly', 'github']
