import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'

type GitHubRepoRow = Record<string, unknown>

@Injectable()
export class GitHubReposRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  async listActiveRepos(
    client: SupabaseClient,
    userId: string,
  ): Promise<{ repo_full_name: string; repo_id: number; default_branch: string }[]> {
    const { data } = await client
      .from('github_repos')
      .select('repo_full_name, repo_id, default_branch')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('repo_full_name')
    return (data ?? []) as { repo_full_name: string; repo_id: number; default_branch: string }[]
  }

  async findActiveRepo(
    client: SupabaseClient,
    userId: string,
    fullName: string,
  ): Promise<GitHubRepoRow | null> {
    const { data, error } = await client
      .from('github_repos')
      .select('id')
      .eq('user_id', userId)
      .eq('repo_full_name', fullName)
      .eq('is_active', true)
      .maybeSingle()
    if (error) return null
    return (data as GitHubRepoRow | null) ?? null
  }

  async findDefaultBranch(
    client: SupabaseClient,
    userId: string,
    fullName: string,
  ): Promise<string | null> {
    const { data } = await client
      .from('github_repos')
      .select('default_branch')
      .eq('user_id', userId)
      .eq('repo_full_name', fullName)
      .eq('is_active', true)
      .maybeSingle()

    return (data?.default_branch as string | null | undefined) ?? null
  }

  async upsertCreatedRepo(
    client: SupabaseClient,
    userId: string,
    installationId: number,
    repo: { id: number; full_name: string; default_branch: string },
  ): Promise<void> {
    await client.from('github_repos').upsert(
      {
        user_id: userId,
        installation_id: installationId,
        repo_full_name: repo.full_name,
        repo_id: repo.id,
        default_branch: repo.default_branch,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,repo_id' },
    )
  }

  async syncInstallationRepos(
    userId: string,
    installationId: number,
    repos: { id: number; full_name: string; default_branch: string }[],
  ): Promise<void> {
    const admin = this.serviceClient.client
    for (const repo of repos) {
      await admin.from('github_repos').upsert(
        {
          user_id: userId,
          installation_id: installationId,
          repo_full_name: repo.full_name,
          repo_id: repo.id,
          default_branch: repo.default_branch,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,repo_id' },
      )
    }
  }

  async markReposInactive(client: SupabaseClient, userId: string): Promise<void> {
    await client
      .from('github_repos')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
  }
}
