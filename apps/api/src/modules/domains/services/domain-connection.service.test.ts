import { describe, expect, it, vi } from 'vitest'
import { DomainsCacheRepository } from '../repositories/domains-cache.repository'
import { DomainsRepository } from '../repositories/domains.repository'
import { DomainConnectionService } from './domain-connection.service'
import { DomainProjectConnectionService } from './domain-project-connection.service'

function createQuery(result: { data?: unknown; error?: unknown }) {
  const query = {
    select: vi.fn(() => query),
    update: vi.fn(() => query),
    eq: vi.fn(() => query),
    single: vi.fn().mockResolvedValue(result),
  }
  return query
}

function createService(vercelDeploy: unknown, vercelIntegration: unknown) {
  const projectConnectionService = new DomainProjectConnectionService(
    new DomainsRepository(),
    vercelDeploy as never,
    vercelIntegration as never,
  )

  return new DomainConnectionService(
    new DomainsRepository(),
    new DomainsCacheRepository(),
    projectConnectionService,
  )
}

describe('DomainConnectionService project disconnection', () => {
  it('moves a custom domain from the funnels Vercel project to the app project', async () => {
    const domainLookup = createQuery({
      data: { id: 'domain-1', domain_name: 'custom.example.com' },
      error: null,
    })
    const projectLookup = createQuery({
      data: {
        id: 'project-1',
        name: 'Project One',
        slug: 'project-one',
        is_published: true,
        vercel_project_id: 'vercel-project-1',
      },
      error: null,
    })
    const updateProject = createQuery({ error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'domains') return domainLookup
        if (table === 'project_repos') {
          const projectRepoCallCount = supabase.from.mock.calls.filter(
            ([name]) => name === 'project_repos',
          ).length
          if (projectRepoCallCount === 1) return projectLookup
          return updateProject
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
    }
    const vercelDeploy = {
      addDomainToProject: vi.fn().mockResolvedValue({ success: true }),
    }
    const vercelIntegration = {
      removeDomain: vi.fn().mockResolvedValue({ success: true }),
    }
    const service = createService(vercelDeploy, vercelIntegration)

    const result = await service.connectToProject(supabase as never, 'user-1', {
      domain_id: 'domain-1',
      project_id: 'project-1',
    })

    expect(vercelIntegration.removeDomain).toHaveBeenCalledWith('custom.example.com')
    expect(vercelDeploy.addDomainToProject).toHaveBeenCalledWith(
      'vercel-project-1',
      'custom.example.com',
    )
    expect(updateProject.update).toHaveBeenCalledWith({
      domain_id: 'domain-1',
      published_url: 'https://custom.example.com',
      updated_at: expect.any(String),
    })
    expect(result).toMatchObject({
      success: true,
      connected: true,
      project: { id: 'project-1', name: 'Project One' },
      published_url: 'https://custom.example.com',
    })
  })

  it('restores a custom project domain back to the funnels Vercel project', async () => {
    const projectLookup = createQuery({
      data: {
        id: 'project-1',
        name: 'Project One',
        slug: 'project-one',
        is_published: true,
        vercel_project_id: 'vercel-project-1',
      },
      error: null,
    })
    const currentDomainLookup = createQuery({ data: { domain_id: 'domain-1' }, error: null })
    const domainLookup = createQuery({
      data: { id: 'domain-1', domain_name: 'custom.example.com' },
      error: null,
    })
    const updateProject = createQuery({ error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'domains') return domainLookup
        if (table === 'project_repos') {
          const projectRepoCallCount = supabase.from.mock.calls.filter(
            ([name]) => name === 'project_repos',
          ).length
          if (projectRepoCallCount === 1) return projectLookup
          if (projectRepoCallCount === 2) return currentDomainLookup
          return updateProject
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
    }
    const vercelDeploy = {
      removeDomainFromProject: vi.fn().mockResolvedValue(undefined),
    }
    const vercelIntegration = {
      addDomain: vi.fn().mockResolvedValue(undefined),
    }
    const service = createService(vercelDeploy, vercelIntegration)

    const result = await service.disconnectFromProject(supabase as never, 'user-1', {
      project_id: 'project-1',
    })

    expect(vercelDeploy.removeDomainFromProject).toHaveBeenCalledWith(
      'vercel-project-1',
      'custom.example.com',
    )
    expect(vercelIntegration.addDomain).toHaveBeenCalledWith('custom.example.com')
    expect(updateProject.update).toHaveBeenCalledWith({
      domain_id: null,
      published_url: expect.stringMatching(/^https:\/\/project-one.*$/),
      updated_at: expect.any(String),
    })
    expect(result).toMatchObject({
      success: true,
      disconnected: true,
      project: { id: 'project-1', name: 'Project One' },
    })
  })
})
