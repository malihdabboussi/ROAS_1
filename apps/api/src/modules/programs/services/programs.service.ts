import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrgRole } from '@vibey/api-shared'
import type { CreateProgramInput, ProgramRow, UpdateProgramInput } from '../dto/programs.dto'
import { ProgramsRepository } from '../repositories/programs.repository'
import { ProgramUserStateRepository } from '../repositories/program-user-state.repository'
import { ProgramPermissionsService } from './program-permissions.service'

@Injectable()
export class ProgramsService {
  constructor(
    private readonly programsRepo: ProgramsRepository,
    private readonly programPermissions: ProgramPermissionsService,
    private readonly programUserStateRepo: ProgramUserStateRepository,
  ) {}

  async list(
    supabase: SupabaseClient,
    userId: string,
    orgRole: OrgRole | null | undefined,
    orgId?: string | null,
  ): Promise<ProgramRow[]> {
    if (orgId) {
      await this.programsRepo.ensureOrgSystemPrograms(supabase, orgId)
      await this.ensureUserPersonalProgram(supabase, userId, orgId)
    }
    const rows = await this.programsRepo.list(supabase, orgId)
    const accessible = await this.programPermissions.filterAccessiblePrograms(
      supabase,
      rows,
      userId,
      orgRole,
    )
    const counts = await this.programsRepo.countCampaignsByProgramIds(
      supabase,
      accessible.map((r) => r.id),
      orgId,
    )
    const userState = await this.programUserStateRepo.list(supabase, userId)
    const favoriteIds = new Set(
      userState.filter((row) => row.is_favorite).map((row) => String(row.program_id)),
    )
    return accessible.map((row) => ({
      ...row,
      campaign_count: counts[row.id] ?? 0,
      is_favorite: favoriteIds.has(row.id),
    }))
  }

  async updateUserState(
    supabase: SupabaseClient,
    programId: string,
    userId: string,
    isFavorite: boolean,
    orgRole: OrgRole | null | undefined,
    orgId?: string | null,
  ) {
    await this.programPermissions.assertProgramAccess(
      supabase,
      programId,
      userId,
      orgRole,
      'view',
      orgId,
    )
    return this.programUserStateRepo.upsert(supabase, userId, programId, isFavorite)
  }

  /**
   * Per-user Private Program used as the "make campaign personal" target.
   * Does not use system_kind=personal (unique per org) — tags via config.personal_default.
   */
  async ensureUserPersonalProgram(
    supabase: SupabaseClient,
    userId: string,
    orgId: string,
  ): Promise<ProgramRow> {
    const existing = await this.programsRepo.findPersonalDefaultForUser(supabase, userId, orgId)
    if (existing) return existing
    const slug = `personal-${userId.replace(/-/g, '').slice(0, 12)}`
    try {
      return await this.programsRepo.create(supabase, {
        orgId,
        userId,
        name: 'Personal',
        slug,
        icon: 'house',
        sort_order: 50,
        visibility: 'private',
        created_by: userId,
        config: { personal_default: true },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.toLowerCase().includes('duplicate')) {
        const again = await this.programsRepo.findPersonalDefaultForUser(supabase, userId, orgId)
        if (again) return again
      }
      throw err
    }
  }

  async getById(
    supabase: SupabaseClient,
    id: string,
    userId: string,
    orgRole: OrgRole | null | undefined,
    orgId?: string | null,
  ): Promise<ProgramRow> {
    const row = await this.programsRepo.findById(supabase, id, orgId)
    if (!row) throw new NotFoundException('Program not found')
    const level = await this.programPermissions.assertProgramAccess(
      supabase,
      id,
      userId,
      orgRole,
      'view',
      orgId,
    )
    const counts = await this.programsRepo.countCampaignsByProgramIds(supabase, [row.id], orgId)
    return { ...row, campaign_count: counts[row.id] ?? 0, effective_level: level }
  }

  async create(
    supabase: SupabaseClient,
    userId: string,
    input: CreateProgramInput,
    orgId?: string | null,
  ): Promise<ProgramRow> {
    const slug =
      input.slug ??
      input.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)
    if (!slug) throw new BadRequestException('Could not derive a valid slug from name')

    return this.programsRepo.create(supabase, {
      orgId,
      userId,
      name: input.name,
      slug,
      icon: input.icon,
      icon_color: input.icon_color,
      sort_order: input.sort_order,
      visibility: input.visibility ?? 'workspace',
      created_by: userId,
    })
  }

  async update(
    supabase: SupabaseClient,
    id: string,
    input: UpdateProgramInput,
    userId: string,
    orgRole: OrgRole | null | undefined,
    orgId?: string | null,
  ): Promise<ProgramRow> {
    const existing = await this.programsRepo.findById(supabase, id, orgId)
    if (!existing) throw new NotFoundException('Program not found')
    await this.programPermissions.assertProgramAccess(supabase, id, userId, orgRole, 'edit', orgId)
    if (existing.system_kind && input.name && input.name !== existing.name) {
      throw new ForbiddenException('System program name cannot be changed')
    }

    if (input.visibility && input.visibility !== existing.visibility) {
      await this.programPermissions.setVisibility(
        supabase,
        id,
        input.visibility,
        userId,
        orgRole,
        orgId,
      )
    }

    const { visibility: _visibility, config, ...fields } = input
    const rest = config
      ? {
          ...fields,
          config: {
            ...existing.config,
            ...config,
          },
        }
      : fields
    const updated =
      Object.keys(rest).length > 0
        ? await this.programsRepo.update(supabase, id, rest, orgId)
        : await this.programsRepo.findById(supabase, id, orgId)
    if (!updated) throw new NotFoundException('Program not found')
    return updated
  }

  async delete(
    supabase: SupabaseClient,
    id: string,
    userId: string,
    orgRole: OrgRole | null | undefined,
    orgId?: string | null,
  ): Promise<{ deleted: true }> {
    const existing = await this.programsRepo.findById(supabase, id, orgId)
    if (!existing) throw new NotFoundException('Program not found')
    if (existing.system_kind) {
      throw new ForbiddenException('System programs cannot be deleted')
    }
    const isAdmin = orgRole === 'owner' || orgRole === 'admin'
    const isCreator = existing.created_by != null && existing.created_by === userId
    if (!isAdmin && !isCreator) {
      throw new ForbiddenException('Only the program owner or an org admin can delete a program')
    }
    await this.programPermissions.assertProgramAccess(supabase, id, userId, orgRole, 'edit', orgId)
    const deleted = await this.programsRepo.softDelete(supabase, id, orgId)
    if (!deleted) throw new NotFoundException('Program not found')
    return { deleted: true }
  }

  async assertProgramInScope(
    supabase: SupabaseClient,
    programId: string | null,
    orgId?: string | null,
  ): Promise<void> {
    if (programId == null) return
    const row = await this.programsRepo.findById(supabase, programId, orgId)
    if (!row) throw new BadRequestException('Program not found in this workspace')
  }

  async assertProgramAccessInScope(
    supabase: SupabaseClient,
    programId: string | null,
    userId: string,
    orgRole: OrgRole | null | undefined,
    required: 'view' | 'edit',
    orgId?: string | null,
  ): Promise<void> {
    if (programId == null) return
    await this.programPermissions.assertProgramAccess(
      supabase,
      programId,
      userId,
      orgRole,
      required,
      orgId,
    )
  }
}
