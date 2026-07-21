/**
 * Maps an integration provider/id (e.g. `google_drive`, `slack`, `meta`) to a logo asset under
 * `/public/Integrations/...`. Single source of truth shared by `IntegrationCard` and any other
 * surface that needs to render a real brand logo for a connected integration.
 */
export function getIntegrationLogoPath(provider: string): string | null {
  switch (provider.toLowerCase()) {
    case 'gohighlevel':
      return '/Integrations/GHL.png'
    case 'airtable':
      return '/Integrations/Airtable.png'
    case 'stripe':
      return '/Integrations/Stripe.png'
    case 'paypal':
      return '/Integrations/PayPal.png'
    case 'github':
      return '/Integrations/GitHub.png'
    case 'meta':
    case 'meta ads':
    case 'facebook':
      return '/Integrations/Meta.png'
    case 'google_drive':
      return '/Integrations/GoogleDrive.png'
    case 'calendly':
      return '/Integrations/Calendly.png'
    case 'dropbox':
      return '/Integrations/Dropbox.png'
    case 'fathom':
      return '/Integrations/Fathom.png'
    case 'fireflies':
      return '/Integrations/Fireflies.png'
    case 'slack':
      return '/Integrations/Slack.png'
    case 'telegram':
      return '/Integrations/Telegram.png'
    case 'cursor':
      return '/Integrations/Cursor.png'
    case 'linkedin':
      return '/Integrations/LinkedIn.png'
    case 'instagram':
      return '/Integrations/Instagram.png'
    case 'twitter':
    case 'x':
      return '/Integrations/Twitter.png'
    case 'youtube':
      return '/Integrations/YouTube.png'
    case 'tiktok':
      return '/Integrations/TikTok.png'
    case 'google_analytics':
      return '/Integrations/GoogleAnalytics.png'
    case 'google_calendar':
      return '/Integrations/GoogleCalendar.png'
    case 'google_workspace':
      return '/Integrations/GoogleCalendar.png'
    case 'gmail':
      return '/Integrations/Gmail.png'
    case 'outlook':
      return '/Integrations/Outlook.png'
    case 'clickup':
      return '/Integrations/ClickUp.png'
    case 'notion':
      return '/Integrations/Notion.png'
    case 'reddit':
      return '/Integrations/Reddit.png'
    case 'mailchimp':
      return '/Integrations/Mailchimp.png'
    case 'kit':
      return '/Integrations/Kit.png'
    case 'hubspot':
      return '/Integrations/HubSpot.png'
    case 'salesforce':
      return '/Integrations/Salesforce.png'
    case 'zoom':
      return '/Integrations/Zoom.png'
    case 'google_ads':
      return '/Integrations/GoogleAds.png'
    case 'google_search_console':
      return '/Integrations/GoogleSearchConsole.png'
    case 'google_sheets':
      return '/Integrations/GoogleSheets.png'
    case 'google_docs':
      return '/Integrations/GoogleDocs.png'
    case 'canva':
      return '/Integrations/Canva.png'
    case 'vercel':
      return '/Integrations/Vercel.png'
    case 'active_campaign':
    case 'activecampaign':
      return '/Integrations/ActiveCampaign.png'
    case 'whop':
      return '/Integrations/Whop.png'
    case 'fanbasis':
      return '/Integrations/FanBasis.png'
    case 'elevenlabs':
      return '/Integrations/ElevenLabs.png'
    case 'supabase':
      return '/Integrations/Supabase.png'
    case 'wordpress':
      return '/Integrations/WordPress.png'
    default:
      return null
  }
}
