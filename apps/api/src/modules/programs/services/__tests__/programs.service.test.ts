import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProgramsRepository } from '../../repositories/programs.repository'
import { ProgramPermissionsService } from '../program-permissions.service'
import { ProgramsService } from '../programs.service'

describe('ProgramsService', () => {
  const supabase = {} as never
  let repo: {
    list: ReturnType<typeof vi.fn>
    findById: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    softDelete: ReturnType<typeof vi.fn>
    countCampaignsByProgramIds: ReturnType<typeof vi.fn>
    ensureOrgSystemPrograms: ReturnType<typeof vi.fn>
    findPersonalDefaultForUser: ReturnType<typeof vi.fn>
  }
  let permissions: {
    filterAccessiblePrograms: ReturnType<typeof vi.fn>
    assertProgramAccess: ReturnType<typeof vi.fn>
    setVisibility: ReturnType<typeof vi.fn>
  }
  let service: ProgramsService

  beforeEach(() => {
    repo = {
      list: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      countCampaignsByProgramIds: vi.fn().mockResolvedValue({}),
      ensureOrgSystemPrograms: vi.fn().mockResolvedValue(undefined),
      findPersonalDefaultForUser: vi.fn().mockResolvedValue(null),
    }
    permissions = {
      filterAccessiblePrograms: vi.fn(async (_s, rows) =>
        rows.map((row: { id: string }) => ({ ...row, effective_level: 'edit' })),
      ),
      assertProgramAccess: vi.fn().mockResolvedValue('edit'),
      setVisibility: vi.fn(),
    }
    service = new ProgramsService(
      repo as unknown as ProgramsRepository,
      permissions as unknown as ProgramPermissionsService,
    )
  })

  it('lists programs with campaign counts after ensuring org system programs', async () => {
    repo.list.mockResolvedValue([
      {
        id: 'p1',
        org_id: 'org-1',
        user_id: null,
        name: 'Clients',
        slug: 'clients',
        system_kind: 'clients',
        icon: 'users',
        icon_color: null,
        sort_order: 0,
        config: {},
        visibility: 'workspace',
        created_by: null,
        created_at: '2026-07-22T00:00:00.000Z',
        updated_at: '2026-07-22T00:00:00.000Z',
        deleted_at: null,
      },
    ])
    repo.countCampaignsByProgramIds.mockResolvedValue({ p1: 2 })
    repo.findPersonalDefaultForUser.mockResolvedValue({
      id: 'personal-prog',
      org_id: 'org-1',
      user_id: null,
      name: 'Personal',
      slug: 'personal-user1',
      system_kind: null,
      icon: 'house',
      icon_color: null,
      sort_order: 50,
      config: { personal_default: true },
      visibility: 'private',
      created_by: 'user-1',
      created_at: '',
      updated_at: '',
      deleted_at: null,
    })

    const result = await service.list(supabase, 'user-1', 'admin', 'org-1')
    expect(repo.ensureOrgSystemPrograms).toHaveBeenCalledWith(supabase, 'org-1')
    expect(repo.findPersonalDefaultForUser).toHaveBeenCalledWith(supabase, 'user-1', 'org-1')
    expect(result[0]?.campaign_count).toBe(2)
  })

  it('ensures a private personal program when missing', async () => {
    repo.findPersonalDefaultForUser.mockResolvedValue(null)
    repo.create.mockResolvedValue({
      id: 'p-personal',
      org_id: 'org-1',
      user_id: null,
      name: 'Personal',
      slug: 'personal-user1user1',
      system_kind: null,
      icon: 'house',
      icon_color: null,
      sort_order: 50,
      config: { personal_default: true },
      visibility: 'private',
      created_by: 'user-1',
      created_at: '',
      updated_at: '',
      deleted_at: null,
    })
    const created = await service.ensureUserPersonalProgram(supabase, 'user-1', 'org-1')
    expect(repo.create).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        name: 'Personal',
        visibility: 'private',
        created_by: 'user-1',
        config: { personal_default: true },
      }),
    )
    expect(created.id).toBe('p-personal')
  })

  it('rejects deleting system programs', async () => {
    repo.findById.mockResolvedValue({
      id: 'p1',
      org_id: 'org-1',
      user_id: null,
      name: 'Clients',
      slug: 'clients',
      system_kind: 'clients',
      icon: null,
      icon_color: null,
      sort_order: 0,
      config: {},
      visibility: 'workspace',
      created_by: null,
      created_at: '',
      updated_at: '',
      deleted_at: null,
    })
    await expect(service.delete(supabase, 'p1', 'user-1', 'admin', 'org-1')).rejects.toThrow(
      'System programs cannot be deleted',
    )
  })

  it('creates a custom program with derived slug and created_by', async () => {
    repo.create.mockResolvedValue({
      id: 'p2',
      org_id: 'org-1',
      user_id: null,
      name: 'Video Ops',
      slug: 'video-ops',
      system_kind: null,
      icon: null,
      icon_color: null,
      sort_order: 100,
      config: {},
      visibility: 'workspace',
      created_by: 'user-1',
      created_at: '',
      updated_at: '',
      deleted_at: null,
    })
    const created = await service.create(supabase, 'user-1', { name: 'Video Ops' }, 'org-1')
    expect(repo.create).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        slug: 'video-ops',
        name: 'Video Ops',
        orgId: 'org-1',
        created_by: 'user-1',
        visibility: 'workspace',
      }),
    )
    expect(created.slug).toBe('video-ops')
  })

  it('merges validated work-view preferences into existing Program config', async () => {
    repo.findById.mockResolvedValue({
      id: 'p2',
      org_id: 'org-1',
      user_id: null,
      name: 'Video Ops',
      slug: 'video-ops',
      system_kind: null,
      icon: null,
      icon_color: null,
      sort_order: 100,
      config: { personal_default: true, retained: 'yes' },
      visibility: 'private',
      created_by: 'user-1',
      created_at: '',
      updated_at: '',
      deleted_at: null,
    })
    repo.update.mockResolvedValue({
      id: 'p2',
      config: {
        personal_default: true,
        retained: 'yes',
        visible_program_views: ['overview', 'board'],
      },
    })

    await service.update(
      supabase,
      'p2',
      { config: { visible_program_views: ['overview', 'board'] } },
      'user-1',
      'admin',
      'org-1',
    )

    expect(repo.update).toHaveBeenCalledWith(
      supabase,
      'p2',
      {
        config: {
          personal_default: true,
          retained: 'yes',
          visible_program_views: ['overview', 'board'],
        },
      },
      'org-1',
    )
  })
})
