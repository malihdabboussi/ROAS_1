import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveScopedOrgId } from '@vibey/api-shared'
import { ArtifactTasksRepository } from '../repositories/artifact-tasks.repository'
import { DEFAULT_TASK_SPACE_SCHEMA } from './artifact-task-default-space-schema'
import { DEFAULT_TASK_LIST_VIEW, schemaHasTaskView } from './artifact-task-schema-helper'
import type { ArtifactTaskSchemaHelper, SpaceSchema } from './artifact-task-schema-helper'

export class ArtifactTaskSpaceResolver {
  constructor(
    private readonly tasksRepository: ArtifactTasksRepository,
    private readonly taskSchema: ArtifactTaskSchemaHelper,
  ) {}

  async resolveCampaignIdIfAny(
    target: Record<string, any>,
    supabase: SupabaseClient,
    data: Record<string, unknown>,
    userId: string,
    sessionKey?: string,
  ): Promise<string | null> {
    if (data.general === true || data.general === 'true') return null
    if (typeof target.resolveCampaignId !== 'function') return null
    try {
      const campaignId = await target.resolveCampaignId(supabase, data, userId, sessionKey)
      return typeof campaignId === 'string' && campaignId.trim() ? campaignId : null
    } catch {
      return null
    }
  }

  async resolveOrEnsureSpaceId(
    target: Record<string, any>,
    supabase: SupabaseClient,
    input: Record<string, unknown>,
    userId: string,
    orgId: string | null,
    sessionKey: string | undefined,
  ): Promise<{ spaceId: string; created: boolean }> {
    const explicit = String(input.space_id ?? '').trim()
    if (explicit) return { spaceId: explicit, created: false }
    const campaignId = await this.resolveCampaignIdIfAny(
      target,
      supabase,
      input,
      userId,
      sessionKey,
    )
    const existing = await this.findExistingTaskSpace(supabase, userId, orgId, campaignId)
    if (existing) return { spaceId: String(existing.id), created: false }
    const created = await this.createDefaultTaskSpace(supabase, userId, orgId, campaignId)
    return { spaceId: String(created.id), created: true }
  }

  async ensureTaskView(
    supabase: SupabaseClient,
    spaceId: string,
    schema: SpaceSchema,
  ): Promise<void> {
    if (schemaHasTaskView(schema)) return
    const views = Array.isArray(schema.views) ? schema.views : []
    const nextViews = [...views, DEFAULT_TASK_LIST_VIEW]
    const { error } = await this.tasksRepository.updateSpaceSchema(supabase, {
      spaceId,
      schema: { ...schema, views: nextViews },
    })
    if (!error) schema.views = nextViews
  }

  private async findExistingTaskSpace(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    campaignId: string | null,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.tasksRepository.listCandidateTaskSpaces(supabase, {
      userId,
      orgId,
      campaignId,
    })
    if (error) throw error
    const rows = (data ?? []) as Record<string, unknown>[]
    return rows.find((row) => schemaHasTaskView(this.taskSchema.schemaFromSpace(row))) ?? null
  }

  private async createDefaultTaskSpace(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    campaignId: string | null,
  ): Promise<Record<string, unknown>> {
    const payload: Record<string, unknown> = {
      user_id: userId,
      org_id: resolveScopedOrgId({ orgId }),
      title: campaignId ? 'Campaign Tasks' : 'My Tasks',
      visibility: 'private',
      campaign_id: campaignId ?? null,
      schema: DEFAULT_TASK_SPACE_SCHEMA,
    }
    const { data, error } = await this.tasksRepository.createSpace(supabase, payload)
    if (error) throw error
    return data as Record<string, unknown>
  }
}
