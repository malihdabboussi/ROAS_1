import { ForbiddenException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProgramRow } from '../../dto/programs.dto'
import { ProgramPermissionsRepository } from '../../repositories/program-permissions.repository'
import { ProgramsRepository } from '../../repositories/programs.repository'
import { ProgramPermissionsService } from '../program-permissions.service'

function program(partial: Partial<ProgramRow> & Pick<ProgramRow, 'id' | 'visibility'>): ProgramRow {
  return {
    org_id: 'org-1',
    user_id: null,
    name: 'Video Ops',
    slug: 'video-ops',
    system_kind: null,
    icon: null,
    icon_color: null,
    sort_order: 100,
    config: {},
    created_by: null,
    created_at: '',
    updated_at: '',
    deleted_at: null,
    ...partial,
  }
}

describe('ProgramPermissionsService', () => {
  const supabase = {} as never
  let programsRepo: {
    findById: ReturnType<typeof vi.fn>
    listByIds: ReturnType<typeof vi.fn>
  }
  let permissionsRepo: {
    listSharesForPrograms: ReturnType<typeof vi.fn>
    listShares: ReturnType<typeof vi.fn>
    upsertShare: ReturnType<typeof vi.fn>
    deleteShare: ReturnType<typeof vi.fn>
    setVisibility: ReturnType<typeof vi.fn>
    findProgramIdsByCampaignIds: ReturnType<typeof vi.fn>
  }
  let service: ProgramPermissionsService

  beforeEach(() => {
    programsRepo = { findById: vi.fn(), listByIds: vi.fn().mockResolvedValue([]) }
    permissionsRepo = {
      listSharesForPrograms: vi.fn().mockResolvedValue([]),
      listShares: vi.fn().mockResolvedValue([]),
      upsertShare: vi.fn(),
      deleteShare: vi.fn(),
      setVisibility: vi.fn(),
      findProgramIdsByCampaignIds: vi.fn().mockResolvedValue(new Map()),
    }
    service = new ProgramPermissionsService(
      permissionsRepo as unknown as ProgramPermissionsRepository,
      programsRepo as unknown as ProgramsRepository,
    )
  })

  it('grants workspace view to any org member and edit to editors', () => {
    const row = program({ id: 'p1', visibility: 'workspace' })
    expect(service.resolveProgramLevelFromRow(row, 'u1', 'viewer', null)).toBe('view')
    expect(service.resolveProgramLevelFromRow(row, 'u1', 'editor', null)).toBe('edit')
  })

  it('hides private programs from non-ACL members', () => {
    const row = program({ id: 'p1', visibility: 'private', created_by: 'owner-1' })
    expect(service.resolveProgramLevelFromRow(row, 'u1', 'editor', null)).toBeNull()
    expect(service.resolveProgramLevelFromRow(row, 'owner-1', 'viewer', null)).toBe('edit')
    expect(service.resolveProgramLevelFromRow(row, 'u1', 'editor', 'view')).toBe('view')
  })

  it('treats selected like private for ACL, with org admin break-glass', () => {
    const row = program({ id: 'p1', visibility: 'selected', created_by: 'owner-1' })
    expect(service.resolveProgramLevelFromRow(row, 'u1', 'viewer', null)).toBeNull()
    expect(service.resolveProgramLevelFromRow(row, 'u1', 'admin', null)).toBe('edit')
    expect(service.resolveProgramLevelFromRow(row, 'u1', 'viewer', 'edit')).toBe('edit')
  })

  it('asserts access and throws Forbidden when missing', async () => {
    programsRepo.findById.mockResolvedValue(
      program({ id: 'p1', visibility: 'private', created_by: 'owner-1' }),
    )
    await expect(
      service.assertProgramAccess(supabase, 'p1', 'u1', 'viewer', 'view', 'org-1'),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('excludes campaigns in inaccessible private programs when batch filtering', async () => {
    programsRepo.listByIds.mockResolvedValue([
      program({ id: 'p-open', visibility: 'workspace' }),
      program({ id: 'p-locked', visibility: 'private', created_by: 'owner-1' }),
    ])
    const campaigns = [
      { id: 'c-open', program_id: 'p-open' },
      { id: 'c-locked', program_id: 'p-locked' },
      { id: 'c-none', program_id: null },
    ]
    const visible = await service.filterAccessibleCampaignsByProgram(
      supabase,
      campaigns,
      'u1',
      'editor',
      'org-1',
      'view',
    )
    // Batches program resolution in a single listByIds call (no per-program findById).
    expect(programsRepo.listByIds).toHaveBeenCalledTimes(1)
    expect(programsRepo.findById).not.toHaveBeenCalled()
    expect(visible.map((c) => c.id)).toEqual(['c-open', 'c-none'])
  })

  it('blocks moving a space into a campaign in a private program without access', async () => {
    permissionsRepo.findProgramIdsByCampaignIds.mockResolvedValue(
      new Map([
        ['c-source', null],
        ['c-target', 'p-locked'],
      ]),
    )
    programsRepo.findById.mockResolvedValue(
      program({ id: 'p-locked', visibility: 'private', created_by: 'owner-1' }),
    )
    await expect(
      service.assertSpaceCampaignMoveAccess(
        supabase,
        'c-source',
        'c-target',
        'u1',
        'editor',
        'edit',
        'org-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('allows moving a space between workspace campaigns', async () => {
    permissionsRepo.findProgramIdsByCampaignIds.mockResolvedValue(
      new Map([
        ['c-source', 'p-open'],
        ['c-target', 'p-open'],
      ]),
    )
    programsRepo.findById.mockResolvedValue(program({ id: 'p-open', visibility: 'workspace' }))
    await expect(
      service.assertSpaceCampaignMoveAccess(
        supabase,
        'c-source',
        'c-target',
        'u1',
        'editor',
        'edit',
        'org-1',
      ),
    ).resolves.toBeUndefined()
    // Deduplicates identical program on both ends → single access assertion.
    expect(programsRepo.findById).toHaveBeenCalledTimes(1)
  })

  it('sets created_by when flipping creator-less program to private', async () => {
    programsRepo.findById.mockResolvedValue(program({ id: 'p1', visibility: 'workspace' }))
    permissionsRepo.setVisibility.mockResolvedValue(
      program({ id: 'p1', visibility: 'private', created_by: 'admin-1' }),
    )
    await service.setVisibility(supabase, 'p1', 'private', 'admin-1', 'admin', 'org-1')
    expect(permissionsRepo.setVisibility).toHaveBeenCalledWith(
      supabase,
      'p1',
      'private',
      'org-1',
      'admin-1',
    )
  })
})
