export interface IntegrationFeature {
  title: string
  description: string
  icon: string
}

export interface Integration {
  id: string
  name: string
  description: string
  logo_url?: string
  provider: string
  category?:
    | 'social'
    | 'ads_analytics'
    | 'email_marketing'
    | 'payments'
    | 'crm'
    | 'productivity'
    | 'developer'
    | 'communication'
    | 'analytics'
    | 'automation'
    | 'admin'
    | 'data'
  is_active: boolean
  auth_type?: 'oauth2' | 'api_key'
  connection_fields?: Array<{
    name: string
    label: string
    placeholder?: string
    required?: boolean
    /** Use a multi-line textarea (e.g. service account JSON). */
    multiline?: boolean
    helpTitle?: string
    helpText?: string
    helpCommand?: string
    helpSteps?: string[]
  }>
  oauth_config?: {
    authorization_url: string
    token_url: string
    scopes: string[]
  }
  features?: IntegrationFeature[]
  capabilities?: string[]
  documentation_url?: string
  setup_guide?: string
}

export interface UserIntegration {
  id: string
  user_id?: string
  /** Null means personal-account row; set when the connection belongs to an org workspace. */
  org_id?: string | null
  integration_id: string
  provider: string
  status: 'connected' | 'error' | 'pending' | 'disconnected' | 'needs_reconnect'
  scope_mode?: 'personal' | 'org_shared'
  is_default?: boolean
  connection_label?: string | null
  created_at?: string
  last_sync_at?: string
  error_message?: string
  metadata?: Record<string, unknown>
  access_token?: string
  refresh_token?: string
  expires_at?: string
}

export type IntegrationsTab = 'library' | 'manage' | 'org'
