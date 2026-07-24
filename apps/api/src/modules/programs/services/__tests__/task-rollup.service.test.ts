import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TaskRollupRepository } from '../../repositories/task-rollup.repository'
import { ProgramPermissionsService } from '../program-permissions.service'
import { TaskRollupService } from '../task-rollup.service'

describe('TaskRollupService', () => {
  const supabase = {} as never
  let repo: {
    listCampaigns: ReturnType<typeof vi.fn>
    listSpacesForCampaigns: ReturnType<typeof vi.fn>
    listOpenSpaceItems: ReturnType<typeof vi.fn>
    listProgramsByIds: ReturnType<typeof vi.fn>
    mapItems: TaskRollupRepository['mapItems']
  }
  let permissions: {
    assertProgramAccess: ReturnType<typeof vi.fn>
    filterAccessibleCampaignsByProgram: ReturnType<typeof vi.fn>
  }
  let service: TaskRollupService

  beforeEach(() => {
    const realRepo = new TaskRollupRepository()
    repo = {
      listCampaigns: vi.fn(),
      listSpacesForCampaigns: vi.fn(),
      listOpenSpaceItems: vi.fn(),
      listProgramsByIds: vi.fn().mockResolvedValue([{ id: 'prog-1', name: 'Clients' }]),
      mapItems: realRepo.mapItems.bind(realRepo),
    }
    permissions = {
      assertProgramAccess: vi.fn().mockResolvedValue('view'),
      filterAccessibleCampaignsByProgram: vi.fn(async (_s, campaigns) => campaigns),
    }
    service = new TaskRollupService(
      repo as unknown as TaskRollupRepository,
      permissions as unknown as ProgramPermissionsService,
    )
  })

  it('returns empty when no campaigns match', async () => {
    repo.listCampaigns.mockResolvedValue([])
    await expect(
      service.list(supabase, 'user-1', { view: 'all', limit: 50 }, 'org-1'),
    ).resolves.toEqual([])
  })

  it('filters my view to the current human assignee', async () => {
    repo.listCampaigns.mockResolvedValue([{ id: 'c1', name: 'Sakha', program_id: 'prog-1' }])
    repo.listSpacesForCampaigns.mockResolvedValue([
      { id: 's1', title: 'General', campaign_id: 'c1' },
    ])
    repo.listOpenSpaceItems.mockResolvedValue([
      {
        id: 'i1',
        title: 'Mine',
        status: 'todo',
        due_date: '2026-07-23',
        assignee_type: 'human',
        assignee_id: 'user-1',
        assignees: [{ type: 'human', id: 'user-1' }],
        space_id: 's1',
        created_at: '2026-07-01',
        updated_at: null,
        suggestion_state: null,
        parent_item_id: null,
      },
      {
        id: 'i2',
        title: 'Theirs',
        status: 'todo',
        due_date: null,
        assignee_type: 'human',
        assignee_id: 'user-2',
        assignees: [{ type: 'human', id: 'user-2' }],
        space_id: 's1',
        created_at: '2026-07-01',
        updated_at: null,
        suggestion_state: null,
        parent_item_id: null,
      },
    ])

    const mine = await service.list(supabase, 'user-1', { view: 'my', limit: 50 }, 'org-1')
    expect(mine.map((r) => r.id)).toEqual(['i1'])
    expect(mine[0]?.program_name).toBe('Clients')
    expect(mine[0]?.source_url).toContain('/spaces?space=s1&item=i1')

    const all = await service.list(supabase, 'user-1', { view: 'all', limit: 50 }, 'org-1')
    expect(all.map((r) => r.id)).toEqual(['i1', 'i2'])
  })

  it('scopes campaigns by program_id before loading items', async () => {
    repo.listCampaigns.mockResolvedValue([])
    await service.list(
      supabase,
      'user-1',
      { view: 'all', program_id: 'prog-1', limit: 20 },
      'org-1',
      'viewer',
    )
    expect(permissions.assertProgramAccess).toHaveBeenCalledWith(
      supabase,
      'prog-1',
      'user-1',
      'viewer',
      'view',
      'org-1',
    )
    expect(repo.listCampaigns).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({ programId: 'prog-1', orgId: 'org-1' }),
    )
    expect(repo.listSpacesForCampaigns).not.toHaveBeenCalled()
  })

  it('filters campaigns under inaccessible programs before loading spaces', async () => {
    repo.listCampaigns.mockResolvedValue([
      { id: 'c1', name: 'Visible', program_id: 'prog-1' },
      { id: 'c2', name: 'Hidden', program_id: 'prog-private' },
    ])
    permissions.filterAccessibleCampaignsByProgram.mockResolvedValue([
      { id: 'c1', name: 'Visible', program_id: 'prog-1' },
    ])
    repo.listSpacesForCampaigns.mockResolvedValue([])
    await service.list(supabase, 'user-1', { view: 'all', limit: 50 }, 'org-1', 'viewer')
    expect(repo.listSpacesForCampaigns).toHaveBeenCalledWith(supabase, ['c1'])
  })
})
