/** User-facing toast messages for settings/workspace errors */
export const SETTINGS_TOAST_ERRORS = {
  INTEGRATION_CONNECT_FAILED: {
    userMessage: "Couldn't connect. Try again.",
  },
  INTEGRATION_REFRESH_FAILED: {
    userMessage: "Couldn't refresh integration. Try again.",
  },
  INTEGRATION_DISCONNECT_FAILED: {
    userMessage: "Couldn't disconnect. Try again.",
  },
  INTEGRATION_REMOVE_FAILED: {
    userMessage: "Couldn't remove integration. Try again.",
  },
  BRAIN_UPDATE_FAILED: {
    userMessage: "Couldn't update. Try again.",
  },
  BRAIN_SYNC_FAILED: {
    userMessage: 'Sync failed. Try again.',
  },
  EMAIL_SETTINGS_SAVE_FAILED: {
    userMessage: "Couldn't save settings. Try again.",
  },
  GHL_REQUIRED: {
    userMessage: 'Connect GoHighLevel in Integrations first.',
  },
  EMAIL_PROVIDER_UPDATE_FAILED: {
    userMessage: "Couldn't update email provider. Try again.",
  },
  EMAIL_LOG_ARCHIVE_FAILED: {
    userMessage: "Couldn't archive email log. Try again.",
  },
  PROFILE_LOAD_FAILED: {
    userMessage: "Couldn't load profile. Try again.",
  },
  PROFILE_SAVE_FAILED: {
    userMessage: "Couldn't save profile. Try again.",
  },
  AVATAR_UPLOAD_FAILED: {
    userMessage: "Couldn't upload avatar. Try again.",
  },
  THEME_ARCHIVE_FAILED: {
    userMessage: "Couldn't archive theme. Try again.",
  },
  THEME_RESTORE_FAILED: {
    userMessage: "Couldn't restore theme. Try again.",
  },
  USAGE_LOAD_FAILED: {
    userMessage: "Couldn't load usage. Try again.",
  },
  INTEGRATION_CONNECTION_FAILED: {
    userMessage: 'Connection failed. Please try again.',
  },
  INTEGRATIONS_LOAD_FAILED: {
    userMessage: 'Failed to load integrations.',
  },
} as const

/** OAuth return success messages by provider (lowercase) */
export const INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER: Record<string, string> = {
  gohighlevel: 'GoHighLevel connected',
  github: 'GitHub connected',
  stripe: 'Stripe connected',
  paypal: 'PayPal connected',
  meta: 'Meta connected',
  calendly: 'Calendly connected',
  google_drive: 'Google Drive connected',
  dropbox: 'Dropbox connected',
  fathom: 'Fathom connected',
  slack: 'Slack connected',
  outlook: 'Microsoft Outlook connected',
  supabase: 'Supabase connected',
  wordpress: 'WordPress connected',
  openai_codex: 'OpenAI Codex connected',
  anthropic_claude: 'Claude Subscription connected',
  airtable: 'Airtable connected',
}

export const INTEGRATION_CONNECT_SUCCESS_FALLBACK = 'Integration connected'

/** User-facing toast messages for settings success */
export const SETTINGS_TOAST_SUCCESS = {
  INTEGRATION_CONNECTED: {
    userMessage: 'Connected.',
  },
  META_CONNECTED: {
    userMessage: 'Meta connected.',
  },
  INTEGRATION_DISCONNECTED: {
    userMessage: 'Integration disconnected.',
  },
  INTEGRATION_REMOVED: {
    userMessage: 'Integration removed.',
  },
  BRAIN_SYNCED: {
    userMessage: 'Synced.',
  },
  EMAIL_SETTINGS_SAVED: {
    userMessage: 'Settings saved.',
  },
  EMAIL_PROVIDER_GHL: {
    userMessage: 'Emails will now be sent via GoHighLevel.',
  },
  EMAIL_PROVIDER_VIBEY: {
    userMessage: 'Emails will now be sent via Vibey (SendGrid).',
  },
  EMAIL_LOG_ARCHIVED: {
    userMessage: 'Email log archived.',
  },
  EMAIL_LOG_RESTORED: {
    userMessage: 'Email log restored.',
  },
} as const

/** Returns "{name} connected" for API-key integrations */
export function getIntegrationConnectedMessage(name: string): string {
  return `${name} connected`
}
