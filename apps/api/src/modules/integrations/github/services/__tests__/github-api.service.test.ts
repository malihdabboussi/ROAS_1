import { describe, expect, it, vi } from 'vitest'
import { GitHubApiService } from '../github-api.service'

function createSupabase(rows: Record<string, unknown>) {
  const upserts: Array<{ table: string; row: Record<string, unknown> }> = []
  const client = {
    from: vi.fn((table: string) => {
      const state: Record<string, string> = {}
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((field: string, value: string) => {
          state[field] = value
          return builder
        }),
        maybeSingle: vi.fn(async () => {
          const row = rows[table] as Record<string, unknown> | undefined
          if (
            table === 'github_repos' &&
            row &&
            row.repo_full_name === state.repo_full_name &&
            row.user_id === state.user_id &&
            row.is_active === true
          ) {
            return { data: row, error: null }
          }
          return { data: null, error: null }
        }),
        upsert: vi.fn((row: Record<string, unknown>) => {
          upserts.push({ table, row })
          return { error: null }
        }),
      }
      return builder
    }),
  } as any

  return { client, upserts }
}

describe('GitHubApiService', () => {
  it('creates a branch from the stored default branch after repo access is verified', async () => {
    const { client } = createSupabase({
      github_repos: {
        id: 'repo-row-1',
        user_id: 'user_1',
        repo_full_name: 'vibey/app',
        default_branch: 'develop',
        is_active: true,
      },
    })
    const github = {
      getBranch: vi.fn().mockResolvedValue({ commit: { sha: 'source-sha' } }),
      createBranch: vi.fn().mockResolvedValue(undefined),
    }
    const oauth = {
      getInstallationTokenForUser: vi.fn().mockResolvedValue({ token: 'gh-token' }),
    }
    const repositories = {
      findActiveRepo: vi.fn().mockResolvedValue({ id: 'repo-row-1' }),
      findDefaultBranch: vi.fn().mockResolvedValue('develop'),
    }
    const service = new (GitHubApiService as any)(github, oauth, repositories)

    await expect(
      service.createBranch(client, 'user_1', 'vibey', 'app', 'feature/test'),
    ).resolves.toEqual({
      success: true,
      branch: 'feature/test',
      from: 'develop',
      sha: 'source-sha',
    })

    expect(github.getBranch).toHaveBeenCalledWith('gh-token', 'vibey', 'app', 'develop')
    expect(github.createBranch).toHaveBeenCalledWith(
      'gh-token',
      'vibey',
      'app',
      'feature/test',
      'source-sha',
    )
  })

  it('persists newly created repos with the installation id', async () => {
    const { client, upserts } = createSupabase({})
    const github = {
      createRepo: vi.fn().mockResolvedValue({
        id: 44,
        full_name: 'vibey/new-app',
        html_url: 'https://github.com/vibey/new-app',
        default_branch: 'main',
        private: true,
      }),
    }
    const oauth = {
      getInstallationTokenForUser: vi
        .fn()
        .mockResolvedValue({ token: 'gh-token', installationId: 123 }),
    }
    const repositories = {
      upsertCreatedRepo: vi.fn().mockResolvedValue(undefined),
    }
    const service = new (GitHubApiService as any)(github, oauth, repositories)

    await expect(
      service.createRepo(client, 'user_1', 'new-app', 'New app', true, true, 'vibey'),
    ).resolves.toEqual({
      success: true,
      id: 44,
      full_name: 'vibey/new-app',
      html_url: 'https://github.com/vibey/new-app',
      default_branch: 'main',
      private: true,
    })

    expect(github.createRepo).toHaveBeenCalledWith(
      'gh-token',
      'vibey',
      'new-app',
      'New app',
      true,
      true,
    )
    expect(upserts.length + repositories.upsertCreatedRepo.mock.calls.length).toBe(1)
  })
})
