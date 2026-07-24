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
  let programsRepo: { findById: ReturnType<typeof vi.fn> }
  let permissionsRepo: {
    listSharesForPrograms: ReturnType<typeof vi.fn>
    listShares: ReturnType<typeof vi.fn>
    upsertShare: ReturnType<typeof vi.fn>
    deleteShare: ReturnType<typeof vi.fn>
    setVisibility: ReturnType<typeof vi.fn>
  }
  let service: ProgramPermissionsService

  beforeEach(() => {
    programsRepo = { findById: vi.fn() }
    permissionsRepo = {
      listSharesForPrograms: vi.fn().mockResolvedValue([]),
      listShares: vi.fn().mockResolvedValue([]),
      upsertShare: vi.fn(),
      deleteShare: vi.fn(),
      setVisibility: vi.fn(),
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
