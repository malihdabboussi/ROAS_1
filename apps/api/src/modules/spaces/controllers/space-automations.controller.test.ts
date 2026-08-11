import { describe, expect, it, vi } from 'vitest'
import { SpaceAutomationReadService } from '../services/space-automation-read.service'
import { SpaceAutomationReadController } from './space-automation-read.controller'

function createQuery(result: Record<string, unknown> = { data: null, error: null }) {
  const resolved = Promise.resolve(result)
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
  }
  query.then = resolved.then.bind(resolved)
  return query
}

function createController() {
  const permissionsService = {
    assertCanAccessSpace: vi.fn().mockResolvedValue('admin'),
  }

  return {
    controller: new SpaceAutomationReadController(
      { previewAutomation: vi.fn(), dryRun: vi.fn() } as never,
      new SpaceAutomationReadService(permissionsService as never) as never,
    ),
    permissionsService,
  }
}

describe('Space automation preview', () => {
  it('routes preview=true through the full send-safe preview pipeline without an item', async () => {
    const automationService = {
      previewAutomation: vi.fn().mockResolvedValue({ preview: true, action_results: [] }),
      dryRun: vi.fn(),
    }
    const controller = new SpaceAutomationReadController(automationService as never, {} as never)

    await expect(
      controller.test(
        { id: 'user-1' },
        {} as never,
        { id: 'space-1' },
        { automationId: 'automation-1' },
        {},
        { preview: true },
        { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' },
      ),
    ).resolves.toEqual({ preview: true, action_results: [] })
    expect(automationService.previewAutomation).toHaveBeenCalledWith(
      'automation-1',
      expect.objectContaining({ spaceId: 'space-1', orgId: 'org-1' }),
    )
    expect(automationService.dryRun).not.toHaveBeenCalled()
  })
})

describe('SpaceAutomationsController direct data routes', () => {
  it('lists Fathom self, org-shared users, and teams with connected members', async () => {
    const selfQuery = createQuery({
      data: [{ id: 'self-integration', status: 'connected', scope_mode: 'self', org_id: 'org-1' }],
      error: null,
    })
    const sharedIntegrationsQuery = createQuery({
      data: [{ id: 'shared-integration', user_id: 'user-2' }],
      error: null,
    })
    const profilesQuery = createQuery({
      data: [{ id: 'user-2', full_name: 'Ada Lovelace', email: 'ada@example.com' }],
      error: null,
    })
    const teamsQuery = createQuery({
      data: [{ id: 'team-1', name: 'Marketing', color: 'gold', icon: 'sparkles' }],
      error: null,
    })
    const teamMembersQuery = createQuery({
      data: [{ team_id: 'team-1', user_id: 'user-2' }],
      error: null,
    })
    const connectedMembersQuery = createQuery({ data: [{ user_id: 'user-2' }], error: null })
    const userIntegrationsQueries = [selfQuery, sharedIntegrationsQuery, connectedMembersQuery]
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'user_integrations') return userIntegrationsQueries.shift() ?? createQuery()
        if (table === 'profiles') return profilesQuery
        if (table === 'agent_teams') return teamsQuery
        if (table === 'agent_team_members') return teamMembersQuery
        return createQuery()
      }),
    }
    const { controller, permissionsService } = createController()

    await expect(
      controller.listFathomSources(
        { id: 'user-1' },
        supabase as never,
        { id: 'space-1' },
        { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' },
      ),
    ).resolves.toEqual({
      self: { user_integration_id: 'self-integration', scope_mode: 'self' },
      users: [
        {
          user_integration_id: 'shared-integration',
          user_id: 'user-2',
          display_name: 'Ada Lovelace',
        },
      ],
      teams: [{ team_id: 'team-1', name: 'Marketing', icon: 'sparkles', color: 'gold' }],
    })
    expect(permissionsService.assertCanAccessSpace).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'admin',
      'space-1',
      'edit',
      'org-1',
    )
    expect(sharedIntegrationsQuery.eq).toHaveBeenCalledWith('scope_mode', 'org_shared')
    expect(profilesQuery.in).toHaveBeenCalledWith('id', ['user-2'])
    expect(teamMembersQuery.in).toHaveBeenCalledWith('team_id', ['team-1'])
    expect(connectedMembersQuery.in).toHaveBeenCalledWith('user_id', ['user-2'])
  })

  it('lists the latest automation runs for a space', async () => {
    const runsQuery = createQuery({ data: [{ id: 'run-1' }], error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'space_automation_runs') return runsQuery
        return createQuery()
      }),
    }
    const { controller } = createController()

    await expect(
      controller.listRuns({ id: 'user-1' }, supabase as never, { id: 'space-1' }),
    ).resolves.toEqual([{ id: 'run-1' }])
    expect(runsQuery.eq).toHaveBeenCalledWith('space_id', 'space-1')
    expect(runsQuery.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(runsQuery.limit).toHaveBeenCalledWith(100)
  })
})
