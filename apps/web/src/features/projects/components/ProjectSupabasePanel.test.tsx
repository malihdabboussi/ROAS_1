import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProjectRepo } from '../types'
import { ProjectSupabasePanel } from './ProjectSupabasePanel'

const mocks = vi.hoisted(() => ({
  connectSupabase: vi.fn(),
  getSupabaseStatus: vi.fn(),
  linkExistingSupabaseProject: vi.fn(),
  listSupabaseOrganizations: vi.fn(),
  listSupabaseProjects: vi.fn(),
  provisionSupabaseProject: vi.fn(),
  listTables: vi.fn(),
}))

vi.mock('../services/supabase-integration.service', () => ({
  connectSupabase: mocks.connectSupabase,
  getSupabaseStatus: mocks.getSupabaseStatus,
  linkExistingSupabaseProject: mocks.linkExistingSupabaseProject,
  listSupabaseOrganizations: mocks.listSupabaseOrganizations,
  listSupabaseProjects: mocks.listSupabaseProjects,
  provisionSupabaseProject: mocks.provisionSupabaseProject,
  listTables: mocks.listTables,
}))

function buildProject(overrides: Partial<ProjectRepo> = {}): ProjectRepo {
  return {
    id: 'project-1',
    user_id: 'user-1',
    conversation_id: 'conversation-1',
    name: 'Launch App',
    description: null,
    storage_path: 'projects/project-1',
    entry_point: '/app/page.tsx',
    dependencies: {},
    manifest: {},
    source: 'agent',
    source_meta: {},
    status: 'ready',
    deploy_status: 'running',
    deploy_error: null,
    last_deployed_at: null,
    slug: null,
    is_published: false,
    published_url: null,
    domain_id: null,
    vercel_project_id: null,
    vercel_deployment_id: null,
    vercel_deployment_url: null,
    publish_status: 'unpublished',
    publish_error: null,
    supabase_project_ref: null,
    supabase_project_name: null,
    supabase_region: null,
    supabase_api_url: null,
    supabase_anon_key: null,
    created_at: '2026-06-30T00:00:00.000Z',
    updated_at: '2026-06-30T00:00:00.000Z',
    ...overrides,
  }
}

describe('ProjectSupabasePanel', () => {
  beforeEach(() => {
    mocks.getSupabaseStatus.mockResolvedValue({
      connected: true,
      status: 'connected',
      connectedAt: '2026-06-30T00:00:00.000Z',
    })
    mocks.connectSupabase.mockResolvedValue('https://supabase.example/oauth')
    mocks.listSupabaseOrganizations.mockResolvedValue([{ id: 'org-1', name: 'Vibey HQ' }])
    mocks.listSupabaseProjects.mockResolvedValue([
      {
        id: 'supabase-project-1',
        organization_id: 'org-1',
        name: 'Existing Database',
        region: 'eu-west-1',
        created_at: '2026-06-30T00:00:00.000Z',
        status: 'ACTIVE_HEALTHY',
      },
    ])
    mocks.provisionSupabaseProject.mockResolvedValue({
      ref: 'new-project-ref',
      name: 'Launch App',
      region: 'us-east-1',
      api_url: 'https://new-project-ref.supabase.co',
      anon_key: null,
      service_role_key: null,
    })
    mocks.linkExistingSupabaseProject.mockResolvedValue({
      ref: 'supabase-project-1',
      name: 'Existing Database',
      region: 'eu-west-1',
      api_url: 'https://supabase-project-1.supabase.co',
      anon_key: null,
      service_role_key: null,
    })
    mocks.listTables.mockResolvedValue([
      {
        name: 'profiles',
        rowCount: 2,
        columns: [
          {
            name: 'id',
            dataType: 'uuid',
            isNullable: false,
            isPrimaryKey: true,
            defaultValue: null,
          },
        ],
      },
    ])
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('connects a disconnected Supabase account through the OAuth redirect', async () => {
    const originalLocation = window.location
    const locationMock = { ...originalLocation, href: 'http://localhost/projects/project-1' }
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: locationMock,
    })
    mocks.getSupabaseStatus.mockResolvedValue({
      connected: false,
      status: null,
      connectedAt: null,
    })

    render(<ProjectSupabasePanel project={buildProject()} onProjectUpdated={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Connect Supabase Account' }))

    await waitFor(() => {
      expect(mocks.connectSupabase).toHaveBeenCalledWith('http://localhost/projects/project-1')
    })
    expect(window.location.href).toBe('https://supabase.example/oauth')

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  it('creates a new Supabase project and refreshes the project', async () => {
    const onProjectUpdated = vi.fn()

    render(<ProjectSupabasePanel project={buildProject()} onProjectUpdated={onProjectUpdated} />)

    fireEvent.click(await screen.findByRole('button', { name: 'New Project' }))
    expect(await screen.findByText('Create New Supabase Project')).toBeInTheDocument()
    expect(screen.getByText('Vibey HQ')).toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue('Launch App'), {
      target: { value: '  Customer Portal  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create Project' }))

    await waitFor(() => {
      expect(mocks.provisionSupabaseProject).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'org-1',
          name: 'Customer Portal',
          region: 'us-east-1',
          vibey_project_id: 'project-1',
        }),
      )
    })
    expect(mocks.provisionSupabaseProject.mock.calls[0]?.[0].db_pass).toHaveLength(24)
    expect(onProjectUpdated).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Add a Database')).toBeInTheDocument()
  })

  it('links an existing Supabase project and shows failures without render loops', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onProjectUpdated = vi.fn()
    let commits = 0
    mocks.linkExistingSupabaseProject.mockRejectedValueOnce(new Error('Link failed'))

    render(
      <Profiler id="project-supabase-panel" onRender={() => (commits += 1)}>
        <ProjectSupabasePanel project={buildProject()} onProjectUpdated={onProjectUpdated} />
      </Profiler>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Link Existing' }))
    expect(await screen.findByText('Link Existing Supabase Project')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Choose a project/ }))
    fireEvent.click(await screen.findByRole('option', { name: /Existing Database/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Link Project' }))

    expect(await screen.findByText('Link failed')).toBeInTheDocument()
    expect(onProjectUpdated).not.toHaveBeenCalled()
    expect(commits).toBeLessThan(25)
    expect(consoleErrorSpy.mock.calls.flat().join('\n')).not.toMatch(
      /maximum update depth|too many re-renders/i,
    )

    consoleErrorSpy.mockRestore()
  })

  it('delegates to the database browser when a project is already linked', async () => {
    render(
      <ProjectSupabasePanel
        project={buildProject({
          supabase_project_ref: 'linked-ref',
          supabase_project_name: 'Linked Database',
        })}
        onProjectUpdated={vi.fn()}
      />,
    )

    expect(await screen.findByText('Linked Database')).toBeInTheDocument()
    expect(await screen.findByText('profiles')).toBeInTheDocument()
    expect(mocks.getSupabaseStatus).not.toHaveBeenCalled()
    expect(mocks.listTables).toHaveBeenCalledWith('linked-ref')
  })
})
