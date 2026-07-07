import { afterEach, describe, expect, it, vi } from 'vitest'
import { deriveProjectSessionKey } from '@vibey/api-shared'
import { ProjectsRepository } from '../repositories/projects.repository'
import { ProjectPublishService } from './project-publish.service'
import { ProjectsService } from './projects.service'

function createProjectRepoQuery(result: { data?: unknown; error?: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    single: vi.fn().mockResolvedValue(result),
  }
  return query
}

describe('ProjectsService publish pipeline session key', () => {
  afterEach(() => {
    delete process.env.VIBEY_SESSION_KEY
  })

  it('sets a project-bound session key on Vercel instead of the root secret', async () => {
    process.env.VIBEY_SESSION_KEY = 'root-secret'
    const projectId = 'project-1'
    const userId = 'user-1'
    const sourceQuery = createProjectRepoQuery({
      data: {
        storage_path: 'user-1/project-1',
        manifest: { files: ['package.json'] },
      },
      error: null,
    })
    const deployStatusQuery = createProjectRepoQuery({ error: null })
    const publishConfigQuery = createProjectRepoQuery({
      data: {
        vercel_project_id: null,
        domain_id: null,
        supabase_api_url: null,
        supabase_anon_key: null,
      },
      error: null,
    })
    const finalUpdateQuery = createProjectRepoQuery({ error: null })
    const projectRepoQueries = [
      sourceQuery,
      deployStatusQuery,
      publishConfigQuery,
      finalUpdateQuery,
    ]
    const download = vi.fn().mockResolvedValue({
      data: new Blob([JSON.stringify({ scripts: { build: 'next build' } })]),
      error: null,
    })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'project_repos') return projectRepoQueries.shift() ?? finalUpdateQuery
        if (table === 'domains') {
          return createProjectRepoQuery({ data: null, error: null })
        }
        return createProjectRepoQuery({ error: null })
      }),
      storage: { from: vi.fn(() => ({ download })) },
    }
    const vercelDeploy = {
      isConfigured: true,
      ensureVercelProject: vi.fn().mockResolvedValue({ projectId: 'vercel-project' }),
      setProjectEnvVars: vi.fn().mockResolvedValue(undefined),
      uploadFiles: vi.fn().mockResolvedValue([{ path: 'package.json' }]),
      createDeployment: vi.fn().mockResolvedValue({
        success: true,
        deploymentId: 'deployment-1',
        deploymentUrl: 'https://deployment.vercel.app',
      }),
      waitForDeployment: vi.fn().mockResolvedValue({
        ready: true,
        url: 'https://deployment.vercel.app',
      }),
      healthCheck: vi.fn().mockResolvedValue({ healthy: true, issues: [] }),
      addDomainToProject: vi.fn().mockResolvedValue(undefined),
    }
    const repository = new ProjectsRepository({ applyScope: vi.fn() } as never)
    const publishService = new ProjectPublishService(repository, vercelDeploy as never)
    const service = new ProjectsService(
      {} as never,
      repository,
      vercelDeploy as never,
      publishService,
    )

    await (
      service as never as {
        runPublishPipeline: (
          supabase: unknown,
          userId: string,
          projectId: string,
          slug: string,
        ) => Promise<void>
      }
    ).runPublishPipeline(supabase, userId, projectId, 'demo')

    expect(vercelDeploy.setProjectEnvVars).toHaveBeenCalledWith(
      'vercel-project',
      expect.objectContaining({
        VIBEY_PROJECT_ID: projectId,
        VIBEY_SESSION_KEY: deriveProjectSessionKey(projectId, 'root-secret'),
      }),
    )
    expect(vercelDeploy.setProjectEnvVars.mock.calls[0][1].VIBEY_SESSION_KEY).not.toBe(
      'root-secret',
    )
  })
})

describe('ProjectsService repository-backed project operations', () => {
  it('applies request scope when listing projects', async () => {
    const orderedRows = [{ id: 'project-1' }]
    const query = {
      select: vi.fn(() => query),
      order: vi.fn().mockResolvedValue({ data: orderedRows, error: null }),
    }
    const supabase = {
      from: vi.fn(() => query),
    }
    const orgScope = {
      applyScope: vi.fn(() => query),
    }
    const repository = new ProjectsRepository(orgScope as never)
    const service = new ProjectsService({} as never, repository, {} as never, {} as never)

    const result = await service.listProjects(supabase as never, {
      orgId: 'org-1',
      role: 'creator',
      source: 'header',
    })

    expect(result).toEqual(orderedRows)
    expect(supabase.from).toHaveBeenCalledWith('project_repos')
    expect(orgScope.applyScope).toHaveBeenCalledWith(query, {
      orgId: 'org-1',
      role: 'creator',
      source: 'header',
    })
    expect(query.order).toHaveBeenCalledWith('updated_at', { ascending: false })
  })

  it('upserts project file content and stores the normalized file in the manifest', async () => {
    const ownedProjectQuery = {
      select: vi.fn(() => ownedProjectQuery),
      eq: vi.fn(() => ownedProjectQuery),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'project-1',
          user_id: 'user-1',
          storage_path: 'user-1/project-1',
          manifest: { files: ['app/page.tsx'] },
          entry_point: 'app/page.tsx',
        },
        error: null,
      }),
    }
    const manifestUpdateQuery = {
      update: vi.fn(() => manifestUpdateQuery),
      eq: vi.fn(() => manifestUpdateQuery),
    }
    const upload = vi.fn().mockResolvedValue({ error: null })
    const supabase = {
      from: vi.fn(() => manifestUpdateQuery),
      storage: { from: vi.fn(() => ({ upload })) },
    }
    supabase.from.mockReturnValueOnce(ownedProjectQuery as never)
    supabase.from.mockReturnValueOnce(manifestUpdateQuery as never)
    const repository = new ProjectsRepository({ applyScope: vi.fn() } as never)
    const service = new ProjectsService({} as never, repository, {} as never, {} as never)

    const result = await service.upsertProjectFile(
      supabase as never,
      'user-1',
      'project-1',
      '/components/Card.tsx',
      'export function Card() { return null }',
      'org-1',
    )

    expect(result).toEqual({ path: 'components/Card.tsx' })
    expect(upload).toHaveBeenCalledWith(
      'user-1/project-1/components/Card.tsx',
      'export function Card() { return null }',
      { upsert: true, contentType: 'text/tsx' },
    )
    expect(manifestUpdateQuery.update).toHaveBeenCalledWith({
      manifest: { files: ['app/page.tsx', 'components/Card.tsx'] },
      updated_at: expect.any(String),
    })
    expect(manifestUpdateQuery.eq).toHaveBeenCalledWith('id', 'project-1')
    expect(manifestUpdateQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('removes manifest storage files before deleting a project row', async () => {
    const ownedProjectQuery = createProjectRepoQuery({
      data: {
        id: 'project-1',
        user_id: 'user-1',
        storage_path: 'user-1/project-1',
        manifest: { files: ['app/page.tsx', 'package.json'] },
        entry_point: 'app/page.tsx',
      },
      error: null,
    })
    const deleteQuery = createProjectRepoQuery({ error: null })
    const remove = vi.fn().mockResolvedValue({ error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'project_repos') {
          return supabase.from.mock.calls.filter(([name]) => name === 'project_repos').length === 1
            ? ownedProjectQuery
            : deleteQuery
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
      storage: { from: vi.fn(() => ({ remove })) },
    }
    const repository = new ProjectsRepository({ applyScope: vi.fn() } as never)
    const vercelDeploy = { isConfigured: false }
    const service = new ProjectsService(
      {} as never,
      repository,
      vercelDeploy as never,
      {} as never,
    )

    await service.deleteProject(supabase as never, 'user-1', 'project-1', 'org-1')

    expect(remove).toHaveBeenCalledWith([
      'user-1/project-1/app/page.tsx',
      'user-1/project-1/package.json',
    ])
    expect(deleteQuery.delete).toHaveBeenCalled()
    expect(deleteQuery.eq).toHaveBeenCalledWith('id', 'project-1')
    expect(deleteQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
  })
})
