import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ErrorReporter, reportAppError } from '@vibey/api-shared'
import type {
  GitHubBranch,
  GitHubInstallationTokenResponse,
  GitHubPullRequest,
  GitHubRepo,
  GitHubRepoContent,
} from '../types/github.types'

@Injectable()
export class GitHubIntegration {
  private readonly logger = new Logger(GitHubIntegration.name)

  private readonly appId: string
  private readonly privateKey: string
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly webhookSecret: string

  private readonly API_BASE = 'https://api.github.com'

  constructor(
    private readonly config: ConfigService,
    private readonly errorReporter: ErrorReporter,
  ) {
    this.appId = this.config.get<string>('GITHUB_APP_ID') || ''
    this.privateKey = (this.config.get<string>('GITHUB_APP_PRIVATE_KEY') || '').replace(
      /\\n/g,
      '\n',
    )
    this.clientId = this.config.get<string>('GITHUB_APP_CLIENT_ID') || ''
    this.clientSecret = this.config.get<string>('GITHUB_APP_CLIENT_SECRET') || ''
    this.webhookSecret = this.config.get<string>('GITHUB_APP_WEBHOOK_SECRET') || ''
  }

  isConfigured(): boolean {
    return !!(this.appId && this.privateKey && this.clientId && this.clientSecret)
  }

  private throwGitHubError(status: number, detail: string, path: string): never {
    const message = `GitHub API failed (${status}): ${detail}`
    const err = new Error(message)
    reportAppError(
      this.errorReporter,
      {
        app: process.env.APP_NAME ?? 'api',
        category: 'integration',
        feature: 'integrations/github',
        error_code: `upstream_http_${status}`,
        message,
        context: { path, status },
      },
      err,
    )
    throw err
  }

  getClientId(): string {
    return this.clientId
  }

  buildInstallUrl(state: string): string {
    if (!this.clientId) {
      throw new BadRequestException('Missing GitHub App configuration')
    }
    return `https://github.com/apps/${this.config.get<string>('GITHUB_APP_SLUG') || 'vibey'}/installations/new?state=${encodeURIComponent(state)}`
  }

  async getInstallationToken(installationId: number): Promise<GitHubInstallationTokenResponse> {
    if (!this.appId || !this.privateKey) {
      throw new BadRequestException('Missing GitHub App configuration')
    }

    const { createAppAuth } = await import('@octokit/auth-app')
    const auth = createAppAuth({
      appId: this.appId,
      privateKey: this.privateKey,
    })

    const installationAuth = await auth({
      type: 'installation',
      installationId,
    })

    return {
      token: installationAuth.token,
      expires_at: installationAuth.expiresAt ?? new Date(Date.now() + 3600 * 1000).toISOString(),
      permissions: (installationAuth as Record<string, unknown>).permissions as Record<
        string,
        string
      >,
      repository_selection: ((installationAuth as Record<string, unknown>).repositorySelection ??
        'selected') as 'all' | 'selected',
    }
  }

  async listInstallationRepos(token: string): Promise<GitHubRepo[]> {
    const repos: GitHubRepo[] = []
    let page = 1
    const perPage = 100

    while (true) {
      const response = await fetch(
        `${this.API_BASE}/installation/repositories?per_page=${perPage}&page=${page}`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      )

      const raw = await response.text()
      if (!response.ok) {
        this.throwGitHubError(response.status, raw.slice(0, 200), '/installation/repositories')
      }

      const parsed = JSON.parse(raw) as { repositories: GitHubRepo[]; total_count: number }
      repos.push(...parsed.repositories)
      if (repos.length >= parsed.total_count) break
      page++
    }

    return repos
  }

  async getRepoContents(
    token: string,
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<GitHubRepoContent | GitHubRepoContent[]> {
    const url = new URL(`${this.API_BASE}/repos/${owner}/${repo}/contents/${path}`)
    if (ref) url.searchParams.set('ref', ref)

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    const raw = await response.text()
    if (!response.ok) {
      this.throwGitHubError(response.status, raw.slice(0, 200), `/repos/${owner}/${repo}/contents`)
    }

    return JSON.parse(raw) as GitHubRepoContent | GitHubRepoContent[]
  }

  async getBranch(
    token: string,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<GitHubBranch> {
    const response = await fetch(
      `${this.API_BASE}/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )

    const raw = await response.text()
    if (!response.ok) {
      this.throwGitHubError(response.status, raw.slice(0, 200), `/repos/${owner}/${repo}/branches/${branch}`)
    }

    return JSON.parse(raw) as GitHubBranch
  }

  async createBranch(
    token: string,
    owner: string,
    repo: string,
    branch: string,
    sha: string,
  ): Promise<void> {
    const response = await fetch(`${this.API_BASE}/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
    })

    const raw = await response.text()
    if (!response.ok) {
      this.throwGitHubError(response.status, raw.slice(0, 200), `/repos/${owner}/${repo}/git/refs`)
    }
  }

  async createOrUpdateFile(
    token: string,
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string,
    existingSha?: string,
  ): Promise<{ sha: string }> {
    const body: Record<string, unknown> = {
      message,
      content: Buffer.from(content, 'utf-8').toString('base64'),
      branch,
    }
    if (existingSha) body.sha = existingSha

    const response = await fetch(`${this.API_BASE}/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(body),
    })

    const raw = await response.text()
    if (!response.ok) {
      this.throwGitHubError(response.status, raw.slice(0, 200), `/repos/${owner}/${repo}/contents/${path}`)
    }

    const parsed = JSON.parse(raw) as { content: { sha: string } }
    return { sha: parsed.content.sha }
  }

  async commitMultipleFiles(
    token: string,
    owner: string,
    repo: string,
    branch: string,
    message: string,
    files: { path: string; content: string }[],
  ): Promise<{ sha: string }> {
    const branchData = await this.getBranch(token, owner, repo, branch)
    const baseTreeSha = branchData.commit.sha

    const treeItems = files.map((f) => ({
      path: f.path,
      mode: '100644' as const,
      type: 'blob' as const,
      content: f.content,
    }))

    const treeResp = await fetch(`${this.API_BASE}/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
    })

    const treeRaw = await treeResp.text()
    if (!treeResp.ok) {
      this.throwGitHubError(treeResp.status, treeRaw.slice(0, 200), `/repos/${owner}/${repo}/git/trees`)
    }
    const tree = JSON.parse(treeRaw) as { sha: string }

    const commitResp = await fetch(`${this.API_BASE}/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        message,
        tree: tree.sha,
        parents: [baseTreeSha],
      }),
    })

    const commitRaw = await commitResp.text()
    if (!commitResp.ok) {
      throw new Error(
        `GitHub create commit failed (${commitResp.status}): ${commitRaw.slice(0, 200)}`,
      )
    }
    const commit = JSON.parse(commitRaw) as { sha: string }

    const refResp = await fetch(
      `${this.API_BASE}/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ sha: commit.sha }),
      },
    )

    const refRaw = await refResp.text()
    if (!refResp.ok) {
      this.throwGitHubError(refResp.status, refRaw.slice(0, 200), `/repos/${owner}/${repo}/git/refs/heads/${branch}`)
    }

    return { sha: commit.sha }
  }

  async createRepo(
    token: string,
    org: string | null,
    name: string,
    description: string,
    isPrivate: boolean,
    autoInit: boolean,
  ): Promise<GitHubRepo> {
    const url = org ? `${this.API_BASE}/orgs/${org}/repos` : `${this.API_BASE}/user/repos`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        name,
        description,
        private: isPrivate,
        auto_init: autoInit,
      }),
    })

    const raw = await response.text()
    if (!response.ok) {
      this.throwGitHubError(response.status, raw.slice(0, 200), '/user/repos')
    }

    return JSON.parse(raw) as GitHubRepo
  }

  async createPullRequest(
    token: string,
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string,
  ): Promise<GitHubPullRequest> {
    const response = await fetch(`${this.API_BASE}/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ title, body, head, base }),
    })

    const raw = await response.text()
    if (!response.ok) {
      this.throwGitHubError(response.status, raw.slice(0, 200), `/repos/${owner}/${repo}/pulls`)
    }

    return JSON.parse(raw) as GitHubPullRequest
  }

  async listPullRequests(
    token: string,
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open',
  ): Promise<GitHubPullRequest[]> {
    const response = await fetch(
      `${this.API_BASE}/repos/${owner}/${repo}/pulls?state=${state}&per_page=30`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )

    const raw = await response.text()
    if (!response.ok) {
      this.throwGitHubError(response.status, raw.slice(0, 200), `/repos/${owner}/${repo}/pulls`)
    }

    return JSON.parse(raw) as GitHubPullRequest[]
  }
}
