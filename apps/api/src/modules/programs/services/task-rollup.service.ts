import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TaskRollupItem, TaskRollupQuery } from '../dto/task-rollup.dto'
import { TaskRollupRepository } from '../repositories/task-rollup.repository'

@Injectable()
export class TaskRollupService {
  constructor(private readonly taskRollupRepo: TaskRollupRepository) {}

  async list(
    supabase: SupabaseClient,
    userId: string,
    query: TaskRollupQuery,
    orgId?: string | null,
  ): Promise<TaskRollupItem[]> {
    const campaigns = await this.taskRollupRepo.listCampaigns(supabase, {
      orgId,
      programId: query.program_id,
      campaignId: query.campaign_id,
    })
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
      // Over-fetch slightly so client-side "my" filter still fills the limit.
      limit: query.view === 'my' ? Math.min(500, query.limit * 3) : query.limit,
    })

    const visible = items.filter((item) => {
      if (item.suggestion_state === 'dismissed') return false
      if (query.view !== 'my') return true
      return isAssignedToUser(item.assignee_type, item.assignee_id, item.assignees, userId)
    })

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

function isAssignedToUser(
  assigneeType: string | null,
  assigneeId: string | null,
  assignees: unknown,
  userId: string,
): boolean {
  if (assigneeType === 'human' && assigneeId === userId) return true
  if (!Array.isArray(assignees)) return false
  return assignees.some((entry) => {
    if (!entry || typeof entry !== 'object') return false
    return (
      (entry as { type?: unknown }).type === 'human' && (entry as { id?: unknown }).id === userId
    )
  })
}
