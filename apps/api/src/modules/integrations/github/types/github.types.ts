export type GitHubInstallationTokenResponse = {
  token: string
  expires_at: string
  permissions: Record<string, string>
  repository_selection: 'all' | 'selected'
}

export type GitHubOAuthTokenResponse = {
  access_token: string
  token_type: string
  scope: string
}

export type GitHubUserIntegration = {
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
    installation_id?: number
    app_id?: number
    github_user_id?: number
    github_login?: string
    setup_action?: string
  } | null
}

export type GitHubRepo = {
  id: number
  full_name: string
  name: string
  owner: { login: string }
  default_branch: string
  private: boolean
  html_url: string
  description: string | null
}

export type GitHubRepoContent = {
  name: string
  path: string
  sha: string
  size: number
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  content?: string
  encoding?: string
  html_url: string
}

export type GitHubBranch = {
  name: string
  commit: { sha: string; url: string }
  protected: boolean
}

export type GitHubPullRequest = {
  id: number
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed'
  html_url: string
  head: { ref: string; sha: string }
  base: { ref: string; sha: string }
  user: { login: string }
  created_at: string
  updated_at: string
  merged_at: string | null
}

export type GitHubCommitFileChange = {
  path: string
  content: string
  encoding?: 'utf-8' | 'base64'
}
