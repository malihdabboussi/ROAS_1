export type ProjectDeployStatus =
  | 'pending'
  | 'syncing'
  | 'installing'
  | 'starting'
  | 'running'
  | 'stopped'
  | 'error'

export type ProjectPublishStatus =
  | 'unpublished'
  | 'building'
  | 'deploying'
  | 'published'
  | 'draft'
  | 'failed'

export interface ProjectRepo {
  id: string
  user_id: string
  conversation_id: string | null
  name: string
  description: string | null
  storage_path: string
  entry_point: string
  dependencies: Record<string, string>
  manifest: Record<string, unknown>
  source: 'github' | 'agent' | 'upload'
  source_meta: Record<string, unknown>
  status: 'building' | 'ready' | 'error' | 'running' | 'stopped'
  deploy_status: ProjectDeployStatus
  deploy_error: string | null
  last_deployed_at: string | null
  slug: string | null
  is_published: boolean
  published_url: string | null
  domain_id: string | null
  vercel_project_id: string | null
  vercel_deployment_id: string | null
  vercel_deployment_url: string | null
  publish_status: ProjectPublishStatus
  publish_error: string | null
  supabase_project_ref: string | null
  supabase_project_name: string | null
  supabase_region: string | null
  supabase_api_url: string | null
  supabase_anon_key: string | null
  created_at: string
  updated_at: string
}

export type ColumnInfo = {
  name: string
  dataType: string
  isNullable: boolean
  isPrimaryKey: boolean
  defaultValue: string | null
}

export type TableInfo = {
  name: string
  columns: ColumnInfo[]
  rowCount: number
}

export type AuthUser = {
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

export type AuthConfig = {
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

export interface GitHubRepoSummary {
  id: number
  full_name: string
  name: string
  owner: string
  default_branch: string
  private: boolean
  html_url: string
  description: string | null
}
