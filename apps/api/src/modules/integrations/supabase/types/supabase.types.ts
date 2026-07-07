export type SupabaseOAuthTokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

export type SupabaseUserIntegration = {
  id: string
  user_id: string
  integration_id: string
  provider: string
  status: 'pending' | 'connected' | 'error' | 'disconnected'
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  connected_at: string | null
  last_sync_at: string | null
  error_message: string | null
  metadata: {
    code_verifier?: string
    supabase_user_email?: string
  } | null
}

export type SupabaseOrganization = {
  id: string
  name: string
  billing_email?: string
}

export type SupabaseProject = {
  id: string
  organization_id: string
  name: string
  region: string
  created_at: string
  status: string
  database?: {
    host: string
    version: string
  }
}

export type SupabaseProjectApiKey = {
  api_key: string
  name: string
}

export type SupabaseColumnInfo = {
  name: string
  dataType: string
  isNullable: boolean
  isPrimaryKey: boolean
  defaultValue: string | null
}

export type SupabaseTableInfo = {
  name: string
  columns: SupabaseColumnInfo[]
  rowCount: number
}

export type SupabaseQueryResult = {
  rows: Record<string, unknown>[]
  rowCount: number
}

export type SupabaseAuthUser = {
  id: string
  email?: string
  phone?: string
  created_at: string
  last_sign_in_at?: string
  email_confirmed_at?: string
  phone_confirmed_at?: string
  role?: string
  app_metadata: Record<string, unknown>
  user_metadata: Record<string, unknown>
  identities?: { provider: string; id: string }[]
  banned_until?: string | null
}

export type SupabaseAuthConfig = {
  external_email_enabled?: boolean
  external_phone_enabled?: boolean
  external_google_enabled?: boolean
  external_github_enabled?: boolean
  external_apple_enabled?: boolean
  external_discord_enabled?: boolean
  external_twitter_enabled?: boolean
  mailer_autoconfirm?: boolean
  sms_autoconfirm?: boolean
  [key: string]: unknown
}
