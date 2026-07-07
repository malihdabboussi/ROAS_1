import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { GitHubIntegration } from '../integrations/github.integration'
import { GitHubReposRepository } from '../repositories/github-repos.repository'
import { GitHubOAuthService } from './github-oauth.service'

@Injectable()
export class GitHubApiService {
  constructor(
    private readonly github: GitHubIntegration,
    private readonly oauth: GitHubOAuthService,
    private readonly repositories: GitHubReposRepository,
  ) {}

  async listRepos(supabase: SupabaseClient, userId: string) {
    const { token } = await this.oauth.getInstallationTokenForUser(supabase, userId)
    const repos = await this.github.listInstallationRepos(token)
    return repos.map((r) => ({
      id: r.id,
      full_name: r.full_name,
      name: r.name,
      owner: r.owner.login,
      default_branch: r.default_branch,
      private: r.private,
      html_url: r.html_url,
      description: r.description,
    }))
  }

  async getRepoContents(
    supabase: SupabaseClient,
    userId: string,
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ) {
    await this.verifyRepoAccess(supabase, userId, owner, repo)
    const { token } = await this.oauth.getInstallationTokenForUser(supabase, userId)
    return this.github.getRepoContents(token, owner, repo, path, ref)
  }

  async createBranch(
    supabase: SupabaseClient,
    userId: string,
    owner: string,
    repo: string,
    branch: string,
    fromBranch?: string,
  ) {
    await this.verifyRepoAccess(supabase, userId, owner, repo)
    const { token } = await this.oauth.getInstallationTokenForUser(supabase, userId)

    const sourceBranch = fromBranch || (await this.getDefaultBranch(supabase, userId, owner, repo))
    const branchData = await this.github.getBranch(token, owner, repo, sourceBranch)
    await this.github.createBranch(token, owner, repo, branch, branchData.commit.sha)

    return { success: true, branch, from: sourceBranch, sha: branchData.commit.sha }
  }

  async commitFiles(
    supabase: SupabaseClient,
    userId: string,
    owner: string,
    repo: string,
    branch: string,
    message: string,
    files: { path: string; content: string }[],
  ) {
    await this.verifyRepoAccess(supabase, userId, owner, repo)
    const { token } = await this.oauth.getInstallationTokenForUser(supabase, userId)

    const result = await this.github.commitMultipleFiles(token, owner, repo, branch, message, files)
    return { success: true, sha: result.sha, files_count: files.length }
  }

  async createPullRequest(
    supabase: SupabaseClient,
    userId: string,
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base?: string,
  ) {
    await this.verifyRepoAccess(supabase, userId, owner, repo)
    const { token } = await this.oauth.getInstallationTokenForUser(supabase, userId)

    const baseBranch = base || (await this.getDefaultBranch(supabase, userId, owner, repo))
    const pr = await this.github.createPullRequest(
      token,
      owner,
      repo,
      title,
      body,
      head,
      baseBranch,
    )

    return {
      success: true,
      pr_number: pr.number,
      html_url: pr.html_url,
      title: pr.title,
      state: pr.state,
      head: pr.head.ref,
      base: pr.base.ref,
    }
  }

  async listPullRequests(
    supabase: SupabaseClient,
    userId: string,
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open',
  ) {
    await this.verifyRepoAccess(supabase, userId, owner, repo)
    const { token } = await this.oauth.getInstallationTokenForUser(supabase, userId)

    const prs = await this.github.listPullRequests(token, owner, repo, state)
    return prs.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      html_url: pr.html_url,
      head: pr.head.ref,
      base: pr.base.ref,
      user: pr.user.login,
      created_at: pr.created_at,
      merged_at: pr.merged_at,
    }))
  }

  async createRepo(
    supabase: SupabaseClient,
    userId: string,
    name: string,
    description: string,
    isPrivate: boolean,
    autoInit: boolean,
    org?: string,
  ) {
    const { token, installationId } = await this.oauth.getInstallationTokenForUser(supabase, userId)
    const repo = await this.github.createRepo(
      token,
      org || null,
      name,
      description,
      isPrivate,
      autoInit,
    )

    await this.repositories.upsertCreatedRepo(supabase, userId, installationId, repo)

    return {
      success: true,
      id: repo.id,
      full_name: repo.full_name,
      html_url: repo.html_url,
      default_branch: repo.default_branch,
      private: repo.private,
    }
  }

  // ── Helpers ──

  private async verifyRepoAccess(
    supabase: SupabaseClient,
    userId: string,
    owner: string,
    repo: string,
  ): Promise<void> {
    const fullName = `${owner}/${repo}`
    const data = await this.repositories.findActiveRepo(supabase, userId, fullName)

    if (!data) {
      throw new BadRequestException(
        `No access to repository ${fullName}. Ensure it is included in your GitHub App installation.`,
      )
    }
  }

  private async getDefaultBranch(
    supabase: SupabaseClient,
    userId: string,
    owner: string,
    repo: string,
  ): Promise<string> {
    const fullName = `${owner}/${repo}`
    return (await this.repositories.findDefaultBranch(supabase, userId, fullName)) || 'main'
  }
}
