import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreateProgramInput, ProgramRow, UpdateProgramInput } from '../dto/programs.dto'
import { ProgramsRepository } from '../repositories/programs.repository'

@Injectable()
export class ProgramsService {
  constructor(private readonly programsRepo: ProgramsRepository) {}

  async list(supabase: SupabaseClient, orgId?: string | null): Promise<ProgramRow[]> {
    if (orgId) {
      await this.programsRepo.ensureOrgSystemPrograms(supabase, orgId)
    }
    const rows = await this.programsRepo.list(supabase, orgId)
    const counts = await this.programsRepo.countCampaignsByProgramIds(
      supabase,
      rows.map((r) => r.id),
      orgId,
    )
    return rows.map((row) => ({ ...row, campaign_count: counts[row.id] ?? 0 }))
  }

  async getById(supabase: SupabaseClient, id: string, orgId?: string | null): Promise<ProgramRow> {
    const row = await this.programsRepo.findById(supabase, id, orgId)
    if (!row) throw new NotFoundException('Program not found')
    const counts = await this.programsRepo.countCampaignsByProgramIds(supabase, [row.id], orgId)
    return { ...row, campaign_count: counts[row.id] ?? 0 }
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
    })
  }

  async update(
    supabase: SupabaseClient,
    id: string,
    input: UpdateProgramInput,
    orgId?: string | null,
  ): Promise<ProgramRow> {
    const existing = await this.programsRepo.findById(supabase, id, orgId)
    if (!existing) throw new NotFoundException('Program not found')
    if (existing.system_kind && input.name && input.name !== existing.name) {
      throw new ForbiddenException('System program name cannot be changed')
    }
    const updated = await this.programsRepo.update(supabase, id, input, orgId)
    if (!updated) throw new NotFoundException('Program not found')
    return updated
  }

  async delete(
    supabase: SupabaseClient,
    id: string,
    orgId?: string | null,
  ): Promise<{ deleted: true }> {
    const existing = await this.programsRepo.findById(supabase, id, orgId)
    if (!existing) throw new NotFoundException('Program not found')
    if (existing.system_kind) {
      throw new ForbiddenException('System programs cannot be deleted')
    }
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
}
