import { buildPlatformWebhookUrl } from '@/lib/platform/platform-urls'
import type { Integration } from './integrations.types'

/**
 * `is_active` = Library-connectable on ROAS today (native OAuth/API-key path, or
 * Composio toolkit row with auth_config_id). Inactive rows still appear in Library
 * as Coming Soon so users are not offered a Connect that fails.
 */
const STANDARD_INTEGRATIONS: Integration[] = [
  {
    id: 'linkedin',
    provider: 'linkedin',
    name: 'LinkedIn',
    description: 'Connect LinkedIn to read profile/page data and publish social content.',
    category: 'social',
    is_active: true,
  },
  {
    id: 'instagram',
    provider: 'instagram',
    name: 'Instagram',
    description: 'Connect Instagram to manage social posting and media insights.',
    category: 'social',
    is_active: true,
  },
  {
    id: 'facebook',
    provider: 'facebook',
    name: 'Facebook',
    description: 'Connect Facebook to manage pages, posts, and audience engagement.',
    category: 'social',
    is_active: false,
  },
  {
    id: 'youtube',
    provider: 'youtube',
    name: 'YouTube',
    description: 'Connect YouTube to read channel/video data and publish supported content.',
    category: 'social',
    is_active: true,
  },
  {
    id: 'higgsfield',
    provider: 'higgsfield',
    name: 'Higgsfield',
    description:
      'Connect Higgsfield so ROAS agents and missions can create and manage video assets.',
    category: 'automation',
    auth_type: 'oauth2',
    is_active: true,
  },
  {
    id: 'twitter',
    provider: 'twitter',
    name: 'X (Twitter)',
    description: 'Connect X to publish and read social conversations and post performance.',
    category: 'social',
    is_active: false,
  },
  {
    id: 'tiktok',
    provider: 'tiktok',
    name: 'TikTok',
    description: 'Connect TikTok to access social performance data and publishing actions.',
    category: 'social',
    is_active: false,
  },
  {
    id: 'reddit',
    provider: 'reddit',
    name: 'Reddit',
    description: 'Connect Reddit to monitor subreddits, post content, and engage with communities.',
    category: 'social',
    is_active: false,
  },
  {
    id: 'meta',
    provider: 'meta',
    name: 'Meta Ads',
    description: 'Connect Meta to publish Facebook and Instagram ads directly from ROAS.',
    category: 'ads_analytics',
    is_active: true,
  },
  {
    id: 'google_ads',
    provider: 'google_ads',
    name: 'Google Ads',
    description:
      'Connect Google Ads to manage campaigns, ad groups, keywords, and performance reports.',
    category: 'ads_analytics',
    is_active: false,
  },
  {
    id: 'google_analytics',
    provider: 'google_analytics',
    name: 'Google Analytics',
    description:
      'Connect Google Analytics to access website traffic, audience data, and conversion insights.',
    category: 'ads_analytics',
    is_active: false,
  },
  {
    id: 'google_search_console',
    provider: 'google_search_console',
    name: 'Google Search Console',
    description:
      'Connect Google Search Console to monitor search performance, indexing, and site health.',
    category: 'ads_analytics',
    is_active: false,
  },
  {
    id: 'gmail',
    provider: 'gmail',
    name: 'Gmail',
    description: 'Connect Gmail to manage emails, drafts, and inbox operations.',
    category: 'email_marketing',
    is_active: false,
  },
  {
    id: 'outlook',
    provider: 'outlook',
    name: 'Microsoft Outlook',
    description:
      'Connect Outlook to read and send email, manage calendar, contacts, and mailbox settings.',
    category: 'email_marketing',
    is_active: true,
  },
  {
    id: 'slack',
    provider: 'slack',
    name: 'Slack',
    description: 'Connect Slack so your agents can respond in Slack channels and DMs.',
    category: 'email_marketing',
    is_active: true,
  },
  {
    id: 'mailchimp',
    provider: 'mailchimp',
    name: 'Mailchimp',
    description: 'Connect Mailchimp to manage email lists, campaigns, and audience segments.',
    category: 'email_marketing',
    is_active: false,
  },
  {
    id: 'kit',
    provider: 'kit',
    name: 'Kit (ConvertKit)',
    description: 'Connect Kit to manage email subscribers, automations, and broadcasts.',
    category: 'email_marketing',
    is_active: false,
  },
  {
    id: 'active_campaign',
    provider: 'active_campaign',
    name: 'ActiveCampaign',
    description:
      'Connect ActiveCampaign to manage contacts, automations, deals, and email marketing campaigns.',
    category: 'email_marketing',
    auth_type: 'api_key',
    connection_fields: [
      {
        name: 'full',
        label: 'API URL',
        placeholder: 'https://youraccount.api-us1.com',
        required: true,
      },
      {
        name: 'generic_api_key',
        label: 'API Key',
        placeholder: 'Enter your ActiveCampaign API key',
        required: true,
      },
    ],
    is_active: true,
  },
  {
    id: 'gohighlevel',
    provider: 'gohighlevel',
    name: 'GoHighLevel',
    description:
      'Connect GoHighLevel with a Private Integration Token for CRM, email, and automations.',
    category: 'email_marketing',
    auth_type: 'api_key',
    connection_fields: [
      {
        name: 'generic_api_key',
        label: 'Private Integration Token',
        placeholder: 'pit_…',
        required: true,
        helpTitle: 'Create a Private Integration Token',
        helpText:
          'In GoHighLevel open the sub-account, then Settings → Private Integrations. Enable it in Labs if the page is missing. Copy the token immediately — HighLevel shows it once.',
        helpSteps: [
          'Open the GHL sub-account → Settings → Private Integrations',
          'Create an integration and select only the scopes you need',
          'Copy the token, then paste the Location ID from the URL after /location/',
        ],
      },
      {
        name: 'location_id',
        label: 'Location ID',
        placeholder: 'Sub-account location ID',
        required: true,
      },
    ],
    is_active: true,
  },
  {
    id: 'stripe',
    provider: 'stripe',
    name: 'Stripe',
    description:
      'Connect Stripe to manage products, prices, payment links, refunds, and analytics.',
    category: 'payments',
    is_active: true,
  },
  {
    id: 'paypal',
    provider: 'paypal',
    name: 'PayPal',
    description:
      'Connect PayPal to view transactions, payments, refunds, and balance via Log in with PayPal.',
    category: 'payments',
    is_active: true,
  },
  {
    id: 'whop',
    provider: 'whop',
    name: 'Whop',
    description: 'Connect Whop to manage memberships, payments, plans, and community members.',
    category: 'payments',
    auth_type: 'api_key',
    connection_fields: [
      {
        name: 'generic_api_key',
        label: 'API Key',
        placeholder: 'whop_xxxxxxxxxxxx',
        required: true,
      },
    ],
    is_active: false,
  },
  {
    id: 'fanbasis',
    provider: 'fanbasis',
    name: 'FanBasis',
    description:
      'Connect FanBasis to manage products, checkout sessions, subscriptions, customers, and discount codes.',
    category: 'payments',
    auth_type: 'api_key',
    is_active: true,
  },
  {
    id: 'hubspot',
    provider: 'hubspot',
    name: 'HubSpot',
    description: 'Connect HubSpot to manage contacts, deals, campaigns, and CRM workflows.',
    category: 'crm',
    is_active: true,
  },
  {
    id: 'salesforce',
    provider: 'salesforce',
    name: 'Salesforce',
    description: 'Connect Salesforce to manage leads, accounts, opportunities, and CRM data.',
    category: 'crm',
    is_active: true,
  },
  {
    id: 'google_drive',
    provider: 'google_drive',
    name: 'Google Drive',
    description: 'Connect Google Drive to browse, upload, and sync files with your campaigns.',
    category: 'productivity',
    is_active: true,
  },
  {
    id: 'dropbox',
    provider: 'dropbox',
    name: 'Dropbox',
    description: 'Connect Dropbox to browse, upload, and sync files with your campaigns.',
    category: 'productivity',
    is_active: true,
  },
  {
    id: 'google_sheets',
    provider: 'google_sheets',
    name: 'Google Sheets',
    description: 'Connect Google Sheets to read, write, and manage spreadsheet data.',
    category: 'productivity',
    is_active: true,
  },
  {
    id: 'airtable',
    provider: 'airtable',
    name: 'Airtable',
    description:
      'Connect Airtable to manage bases, tables, records, comments, fields, and attachments.',
    category: 'productivity',
    auth_type: 'oauth2',
    is_active: true,
  },
  {
    id: 'google_docs',
    provider: 'google_docs',
    name: 'Google Docs',
    description: 'Connect Google Docs to create, read, and edit documents.',
    category: 'productivity',
    is_active: false,
  },
  {
    id: 'google_calendar',
    provider: 'google_calendar',
    name: 'Google Calendar',
    description: 'Connect Google Calendar to manage events, schedules, and availability.',
    category: 'productivity',
    is_active: true,
  },
  {
    id: 'google_workspace',
    provider: 'google_workspace',
    name: 'Google Workspace',
    description:
      'Connect your Google Workspace (admin) so Pixel can map work emails to teammates and agents can read calendars by person — not on every member Home Agenda.',
    category: 'productivity',
    auth_type: 'api_key',
    is_active: true,
    connection_fields: [
      {
        name: 'service_account_json',
        label: 'Service account JSON',
        placeholder: 'Paste the full service account key JSON',
        required: true,
        multiline: true,
        helpTitle: 'Domain-wide delegation',
        helpText:
          'Create a Google Cloud service account, enable Admin SDK + Calendar APIs, then authorize the client ID in Google Admin → Security → API controls → Domain-wide delegation with readonly Directory and Calendar scopes.',
        helpSteps: [
          'Google Admin Console → Security → Access and data control → API controls → Domain-wide delegation',
          'Add the service account client ID',
          'Scopes: https://www.googleapis.com/auth/admin.directory.user.readonly, https://www.googleapis.com/auth/calendar.readonly',
          'Paste the service account JSON key here and the Workspace admin email used for Directory impersonation',
        ],
      },
      {
        name: 'workspace_admin_email',
        label: 'Workspace admin email',
        placeholder: 'admin@yourdomain.com',
        required: true,
        helpText:
          'A Super Admin email in your Workspace that the service account can impersonate for Directory sync.',
      },
    ],
  },
  {
    id: 'wordpress',
    provider: 'wordpress',
    name: 'WordPress',
    description:
      'Connect WordPress.com, Jetpack, or self-hosted WordPress sites to publish posts, pages, categories, tags, and media.',
    category: 'productivity',
    is_active: true,
  },
  {
    id: 'calendly',
    provider: 'calendly',
    name: 'Calendly',
    description:
      'Connect Calendly to manage event types, schedule meetings, and embed scheduling widgets in funnels.',
    category: 'productivity',
    is_active: true,
  },
  {
    id: 'clickup',
    provider: 'clickup',
    name: 'ClickUp',
    description: 'Connect ClickUp to manage tasks, projects, and team workflows.',
    category: 'productivity',
    is_active: false,
  },
  {
    id: 'notion',
    provider: 'notion',
    name: 'Notion',
    description: 'Connect Notion to manage pages, databases, and workspace content.',
    category: 'productivity',
    is_active: true,
  },
  {
    id: 'canva',
    provider: 'canva',
    name: 'Canva',
    description:
      'Connect Canva to manage designs, templates, brand assets, and creative workflows.',
    category: 'productivity',
    is_active: true,
  },
  {
    id: 'zoom',
    provider: 'zoom',
    name: 'Zoom',
    description: 'Connect Zoom to manage meetings, webinars, and recordings.',
    category: 'productivity',
    is_active: true,
  },
  {
    id: 'fathom',
    provider: 'fathom',
    name: 'Fathom',
    description: 'Connect Fathom AI to sync meeting recordings, transcripts, and action items.',
    category: 'productivity',
    is_active: true,
  },
  {
    id: 'fireflies',
    provider: 'fireflies',
    name: 'Fireflies',
    description:
      'Connect Fireflies AI to sync meeting transcripts, summaries, and action items. After connecting, paste the ROAS webhook address shown on the card into Fireflies → Settings → Developer → Webhooks so new meetings arrive on their own.',
    category: 'productivity',
    auth_type: 'api_key',
    connection_fields: [
      {
        name: 'api_key',
        label: 'Fireflies API Key',
        placeholder: 'From Fireflies → Settings → Developer',
        required: true,
      },
      {
        name: 'webhook_secret',
        label: 'Webhook signing secret',
        placeholder: '16 to 32 characters, set in Fireflies Developer settings (optional)',
        required: false,
      },
    ],
    is_active: true,
  },
  {
    id: 'read_ai',
    provider: 'read_ai',
    name: 'Read AI',
    description:
      'Connect Read AI so meeting reports, transcripts, and action items flow into your brain and Meetings. In Read AI → Integrations → Webhooks, create a webhook pointing at the ROAS address shown on the card and paste its signing key here. Needs a Read AI Pro or Enterprise plan.',
    category: 'productivity',
    auth_type: 'api_key',
    connection_fields: [
      {
        name: 'signing_key',
        label: 'Webhook signing key',
        placeholder: 'Copied from the webhook you created in Read AI',
        required: true,
      },
    ],
    is_active: true,
  },
  {
    id: 'github',
    provider: 'github',
    name: 'GitHub',
    description: 'Connect repositories so agents can read code, commit changes, and create PRs.',
    category: 'developer',
    is_active: true,
  },
  {
    id: 'cursor',
    provider: 'cursor',
    name: 'Cursor',
    description: `Connect Cursor Cloud Agents to write code and open PRs from Space automations. Grant Cursor GitHub access to your repo in the Cursor dashboard. Register webhook URL: ${buildPlatformWebhookUrl('/api/integrations/cursor/webhook')}`,
    category: 'developer',
    auth_type: 'api_key',
    connection_fields: [
      { name: 'api_key', label: 'Cursor API Key', placeholder: 'key_…', required: true },
      {
        name: 'webhook_secret',
        label: 'Webhook Secret',
        placeholder: 'From Cursor dashboard (optional)',
        required: false,
      },
    ],
    is_active: true,
  },
  {
    id: 'supabase',
    provider: 'supabase',
    name: 'Supabase',
    description:
      'Connect your Supabase account to provision databases and auth for Spaces projects.',
    category: 'developer',
    is_active: true,
  },
  {
    id: 'vercel',
    provider: 'vercel',
    name: 'Vercel',
    description: 'Connect Vercel to manage deployments, domains, and project settings.',
    category: 'developer',
    auth_type: 'api_key',
    connection_fields: [
      {
        name: 'bearer_token',
        label: 'Vercel Access Token',
        placeholder: 'Enter your Vercel access token',
        required: true,
      },
    ],
    is_active: false,
  },
  {
    id: 'page_grader',
    provider: 'page_grader',
    name: 'The ROAS Portal',
    description:
      'Connect The ROAS Portal to send Space tasks as client workload (funnel, copy, design).',
    category: 'productivity',
    auth_type: 'api_key',
    connection_fields: [
      {
        name: 'full',
        label: 'API Base URL',
        placeholder: 'https://mjaxhuehopzbsuhmseeg.supabase.co/functions/v1/roas-api',
        required: true,
      },
      {
        name: 'generic_api_key',
        label: 'API Key',
        placeholder: 'Enter your ROAS Portal API key',
        required: true,
      },
    ],
    is_active: true,
  },
]

const ADMIN_INTEGRATIONS: Integration[] = [
  {
    id: 'openai_codex',
    provider: 'openai_codex',
    name: 'OpenAI Codex',
    description:
      'Admin-only connection for using your OpenAI subscription on Codex models without spending ROAS model credits.',
    category: 'admin',
    is_active: true,
  },
  {
    id: 'anthropic_claude',
    provider: 'anthropic_claude',
    name: 'Claude Subscription',
    description:
      'Admin-only connection for using your Claude subscription on Claude models without spending ROAS model credits.',
    category: 'admin',
    auth_type: 'api_key',
    connection_fields: [
      {
        name: 'setup_token',
        label: 'Claude setup-token',
        placeholder: 'sk-ant-oat01-...',
        required: true,
        helpTitle: 'Where to get it',
        helpText:
          'This is generated by the Claude Code CLI. It is not an Anthropic Console API key.',
        helpCommand: 'claude setup-token',
        helpSteps: [
          'Open a terminal on any machine where Claude Code is signed in to your Claude subscription.',
          'Run the command and copy the full token it prints.',
          'Paste it here. ROAS accepts the token that starts with sk-ant-oat01-.',
        ],
      },
    ],
    is_active: true,
  },
]

export function getAvailableIntegrations(isPlatformAdmin: boolean): Integration[] {
  return isPlatformAdmin ? [...STANDARD_INTEGRATIONS, ...ADMIN_INTEGRATIONS] : STANDARD_INTEGRATIONS
}
