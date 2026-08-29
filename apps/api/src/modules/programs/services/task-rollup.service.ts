import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrgRole } from '@vibey/api-shared'
import type { TaskRollupItem, TaskRollupQuery } from '../dto/task-rollup.dto'
import { TaskRollupRepository } from '../repositories/task-rollup.repository'
import { ProgramPermissionsService } from './program-permissions.service'

@Injectable()
export class TaskRollupService {
  constructor(
    private readonly taskRollupRepo: TaskRollupRepository,
    private readonly programPermissions: ProgramPermissionsService,
  ) {}

  async list(
    supabase: SupabaseClient,
    userId: string,
    query: TaskRollupQuery,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ): Promise<TaskRollupItem[]> {
    if (query.program_id) {
      await this.programPermissions.assertProgramAccess(
        supabase,
        query.program_id,
        userId,
        orgRole,
        'view',
        orgId,
      )
    }

    const campaignsRaw = await this.taskRollupRepo.listCampaigns(supabase, {
      orgId,
      programId: query.program_id,
      campaignId: query.campaign_id,
    })
    const campaigns = await this.programPermissions.filterAccessibleCampaignsByProgram(
      supabase,
      campaignsRaw,
      userId,
      orgRole,
      orgId,
      'view',
    )
    if (campaigns.length === 0) return []

    const campaignsById = new Map(campaigns.map((c) => [c.id, c]))
    const spaces = await this.taskRollupRepo.listSpacesForCampaigns(
      supabase,
      campaigns.map((c) => c.id),
    )
    if (spaces.length === 0) return []

    const spacesById = new Map(spaces.map((s) => [s.id, s]))
    const items = await this.taskRollupRepo.listOpenSpaceItems(supabase, {
      spaceIds: spaces.map((s) => s.id),
      orgId,
      assigneeUserId: query.view === 'my' ? userId : undefined,
      excludeNeedsReview: query.focus === 'current',
      limit: query.limit,
    })

    const visible = items.filter((item) => item.suggestion_state !== 'dismissed')

    const programIds = [
      ...new Set(
        campaigns
          .map((c) => c.program_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    ]
    const programs = await this.taskRollupRepo.listProgramsByIds(supabase, programIds)
    const programsById = new Map(programs.map((p) => [p.id, p]))

    return this.taskRollupRepo
      .mapItems({
        items: visible.slice(0, query.limit),
        spacesById,
        campaignsById,
        programsById,
      })
      .sort((a, b) => {
        if (a.due_at && b.due_at) return a.due_at.localeCompare(b.due_at)
        if (a.due_at) return -1
        if (b.due_at) return 1
        return a.title.localeCompare(b.title)
      })
  }
}
