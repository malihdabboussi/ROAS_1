import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveScopedOrgId } from '@vibey/api-shared'
import { ArtifactTasksRepository } from '../repositories/artifact-tasks.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { listTasksForAgent } from './artifact-my-tasks.helper'
import { buildHydratedSpaceItemResponse } from './artifact-space-item-get.helper'
import { ArtifactTaskActivityHelper } from './artifact-task-activity-helper'
import { resolveAgentAssigneePayload } from './artifact-task-assignee-resolver'
import { pickTaskPayload } from './artifact-task-payload-helper'
import { ArtifactTaskSchemaHelper } from './artifact-task-schema-helper'
import { ArtifactTaskSpaceResolver } from './artifact-task-space-resolver'
import { parseSpaceItemLimit, shouldIncludeSpaceItemCount } from './space-item-query.util'

@Injectable()
export class ArtifactTasksService {
  private readonly taskSchema = new ArtifactTaskSchemaHelper()
  private readonly taskActivity: ArtifactTaskActivityHelper
  private readonly taskSpaces: ArtifactTaskSpaceResolver

  constructor(
    private readonly tasksRepository: ArtifactTasksRepository = new ArtifactTasksRepository(),
  ) {
    this.taskActivity = new ArtifactTaskActivityHelper(this.tasksRepository)
    this.taskSpaces = new ArtifactTaskSpaceResolver(this.tasksRepository, this.taskSchema)
  }

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      list_spaces: (data, sessionKey) => this.listSpaces(target, data, sessionKey),
      get_space: (data, sessionKey) => this.getSpace(target, data, sessionKey),
      list_space_views: (data, sessionKey) => this.listSpaceViews(target, data, sessionKey),
      get_space_view: (data, sessionKey) => this.getSpaceView(target, data, sessionKey),
      list_space_view_items: (data, sessionKey) =>
        this.listSpaceViewItems(target, data, sessionKey),
      get_space_item: (data, sessionKey) => this.getSpaceItem(target, data, sessionKey),
      list_tasks: (data, sessionKey) => this.listTasks(target, data, sessionKey),
      get_task: (data, sessionKey) => this.getTask(target, data, sessionKey),
      create_task: (data, sessionKey) => this.createTask(target, data, sessionKey),
      update_task: (data, sessionKey) => this.updateTask(target, data, sessionKey),
      delete_task: (data, sessionKey) => this.deleteTask(target, data, sessionKey),
      add_task_comment: (data, sessionKey) => this.addTaskComment(target, data, sessionKey),
    }
  }

  private resolveContext(target: Record<string, any>, sessionKey?: string) {
    const userId = target.resolveUserId(sessionKey)
    const orgId = (target.resolveOrgId?.(sessionKey) as string | null | undefined) ?? null
    return { userId, orgId }
  }

  private async getUserClient(
    target: Record<string, any>,
    userId: string,
    sessionKey?: string,
  ): Promise<SupabaseClient> {
    return (await target.getUserClient(userId, sessionKey as string)) as SupabaseClient
  }

  private async indexSpaceSource(
    target: Record<string, any>,
    supabase: SupabaseClient,
    input: {
      sourceType: 'space_task' | 'space_activity'
      sourceId: string
      userId: string
      orgId?: string | null
    },
  ): Promise<void> {
    const indexer = target.spaceAssetIndexService as
      | {
          indexSource: (client: SupabaseClient, payload: typeof input) => Promise<unknown>
        }
      | undefined
    if (!indexer) return
    await indexer.indexSource(supabase, input)
  }

  private parseLimit(value: unknown, fallback = 50, max = 100): number {
    const parsed = Number(value ?? fallback)
    if (!Number.isFinite(parsed)) return fallback
    return Math.min(Math.max(Math.trunc(parsed), 1), max)
  }

  private async loadSpace(supabase: SupabaseClient, spaceId: string) {
    const { data, error } = await this.tasksRepository.findSpace(supabase, spaceId)
    if (error) throw error
    return (data as Record<string, unknown> | null) ?? null
  }

  private async loadTask(supabase: SupabaseClient, spaceId: string, taskId: string) {
    const { data, error } = await this.tasksRepository.findTask(supabase, { spaceId, taskId })
    if (error) throw error
    return (data as Record<string, unknown> | null) ?? null
  }

  private async assertParentIsValid(
    supabase: SupabaseClient,
    spaceId: string,
    parentItemId: unknown,
    taskId?: string,
  ): Promise<string | null> {
    if (parentItemId === undefined || parentItemId === null || parentItemId === '') return null
    const parentId = String(parentItemId)
    if (taskId && parentId === taskId) throw new Error('Task cannot be its own parent')
    const parent = await this.loadTask(supabase, spaceId, parentId)
    if (!parent) throw new Error('Parent task not found')
    if (parent.parent_item_id && parent.parent_item_id !== taskId) {
      throw new Error('Subtasks cannot be nested more than one level deep')
    }
    return parentId
  }

  private async listSpaces(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const { userId, orgId } = this.resolveContext(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const limit = this.parseLimit(input.limit)
    const campaignId = await this.taskSpaces.resolveCampaignIdIfAny(
      target,
      supabase,
      input,
      userId,
      sessionKey,
    )

    const { data, error } = await this.tasksRepository.listSpaces(supabase, {
      userId,
      orgId,
      campaignId,
      general: input.general === true || input.general === 'true',
      limit,
    })
    if (error) throw error
    return { success: true, spaces: data ?? [] }
  }

  private async getSpace(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const spaceId = String(input.space_id ?? '').trim()
    if (!spaceId) return { success: false, error: 'space_id is required' }
    const { userId } = this.resolveContext(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const space = await this.loadSpace(supabase, spaceId)
    if (!space) return { success: false, error: 'Space not found' }
    return { success: true, space }
  }

  private async listSpaceViews(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const spaceId = String(input.space_id ?? '').trim()
    if (!spaceId) return { success: false, error: 'space_id is required' }
    const { userId } = this.resolveContext(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const space = await this.loadSpace(supabase, spaceId)
    if (!space) return { success: false, error: 'Space not found' }

    const requestedType = this.taskSchema.stringFrom(input.view_type)?.toLowerCase() ?? null
    let views = this.taskSchema.viewsFromSpace(space)
    if (requestedType) {
      views = views.filter((view) => String(view.type ?? '').toLowerCase() === requestedType)
    }
    return { success: true, space_id: spaceId, views }
  }

  private async getSpaceView(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const spaceId = String(input.space_id ?? '').trim()
    const viewId = String(input.view_id ?? '').trim()
    if (!spaceId) return { success: false, error: 'space_id is required' }
    if (!viewId) return { success: false, error: 'view_id is required' }
    const { userId } = this.resolveContext(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const space = await this.loadSpace(supabase, spaceId)
    if (!space) return { success: false, error: 'Space not found' }
    const view = this.taskSchema.findSpaceView(space, viewId)
    if (!view) return { success: false, error: 'Space view not found' }
    return { success: true, space_id: spaceId, view }
  }

  private async listSpaceViewItems(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const spaceId = String(input.space_id ?? '').trim()
    const viewId = String(input.view_id ?? '').trim()
    if (!spaceId) return { success: false, error: 'space_id is required' }
    if (!viewId) return { success: false, error: 'view_id is required' }
    const { userId } = this.resolveContext(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const limit = parseSpaceItemLimit(input.limit, 50, 250)
    const space = await this.loadSpace(supabase, spaceId)
    if (!space) return { success: false, error: 'Space not found' }
    const schema = this.taskSchema.schemaFromSpace(space)
    const normalized = this.taskSchema.normalizeListInputAgainstSchema(schema, input)
    if (normalized.error) return { success: false, error: normalized.error }
    const queryInput = normalized.input ?? input
    const view = this.taskSchema.findSpaceView(space, viewId)
    if (!view) return { success: false, error: 'Space view not found' }

    const filters = this.taskSchema.recordFrom(queryInput.filters)
    const explicitType =
      this.taskSchema.stringFrom(queryInput.item_type) ??
      this.taskSchema.stringFrom(filters.item_type) ??
      this.taskSchema.stringFrom(filters._view_type) ??
      this.taskSchema.stringFrom(filters.view_type)
    const typeCandidates = explicitType
      ? this.taskSchema.viewTypeAliases(explicitType)
      : this.taskSchema.viewTypeCandidates(view)
    const additionalFilters = typeCandidates.size > 0 ? { _view_type: [...typeCandidates] } : {}
    const { data, error, count } = await this.tasksRepository.listSpaceItems(supabase, {
      spaceId,
      queryInput,
      additionalFilters,
      limit,
    })
    if (error) throw error
    const items = this.taskSchema
      .filterSpaceItemsForInput(
        (data ?? []) as unknown as Record<string, unknown>[],
        view,
        queryInput,
      )
      .map((item) => this.taskSchema.decorateSpaceItemForAgent(item, schema))
    return {
      success: true,
      space_id: spaceId,
      view,
      schema_summary: this.taskSchema.taskSchemaSummary(schema),
      items,
      ...(shouldIncludeSpaceItemCount(input) ? { total_count: count ?? items.length } : {}),
    }
  }

  private async getSpaceItem(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const spaceId = String(input.space_id ?? '').trim()
    const itemId = String(input.item_id ?? '').trim()
    if (!spaceId) return { success: false, error: 'space_id is required' }
    if (!itemId) return { success: false, error: 'item_id is required' }
    const { userId } = this.resolveContext(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    return buildHydratedSpaceItemResponse({
      supabase,
      spaceId,
      itemId,
      query: input,
      tasksRepository: this.tasksRepository,
      taskSchema: this.taskSchema,
      loadTask: (client, sid, tid) => this.loadTask(client, sid, tid),
      loadSpace: (client, sid) => this.loadSpace(client, sid),
    })
  }

  private async listTasks(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const { userId, orgId } = this.resolveContext(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    return listTasksForAgent({
      supabase,
      query: input,
      userId,
      orgId,
      limit: parseSpaceItemLimit(input.limit, 50, 250),
      repository: this.tasksRepository,
      schema: this.taskSchema,
      loadSpace: (spaceId) => this.loadSpace(supabase, spaceId),
    })
  }

  private async getTask(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const spaceId = String(input.space_id ?? '').trim()
    const taskId = String(input.task_id ?? '').trim()
    if (!spaceId) return { success: false, error: 'space_id is required' }
    if (!taskId) return { success: false, error: 'task_id is required' }
    const { userId } = this.resolveContext(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const task = await this.loadTask(supabase, spaceId, taskId)
    if (!task) return { success: false, error: 'Task not found' }

    const parent =
      typeof task.parent_item_id === 'string'
        ? await this.loadTask(supabase, spaceId, task.parent_item_id)
        : null
    const { data: subtasks, error: subtasksError } = await this.tasksRepository.listSubtasks(
      supabase,
      { spaceId, parentItemId: taskId },
    )
    if (subtasksError) throw subtasksError
    const { data: activity, error: activityError } = await this.tasksRepository.listActivity(
      supabase,
      { spaceId, itemId: taskId },
    )
    if (activityError) throw activityError

    return { success: true, task, parent, subtasks: subtasks ?? [], activity: activity ?? [] }
  }

  private async createTask(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const { userId, orgId } = this.resolveContext(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const { spaceId, created: spaceWasCreated } = await this.taskSpaces.resolveOrEnsureSpaceId(
      target,
      supabase,
      input,
      userId,
      orgId,
      sessionKey,
    )
    const space = await this.loadSpace(supabase, spaceId)
    if (!space) return { success: false, error: 'Space not found' }

    const schema = this.taskSchema.schemaFromSpace(space)
    await this.taskSpaces.ensureTaskView(supabase, spaceId, schema)
    const normalizeResult = this.taskSchema.normalizeTaskWriteInputAgainstSchema(schema, input)
    if (normalizeResult.error) return { success: false, error: normalizeResult.error }
    const normalizedInput = normalizeResult.input ?? input

    const statusField = this.taskSchema.fieldsById(schema).get('status')
    const closedStatuses = this.taskSchema.closedStatusIds(statusField)
    const requestedStatus =
      typeof normalizedInput.status === 'string' ? normalizedInput.status : null
    if (requestedStatus && closedStatuses.has(requestedStatus)) {
      return {
        success: false,
        error:
          'create_task cannot create tasks in a closed status. Create the task first, then use update_task only if the user explicitly asked to mark it complete.',
      }
    }

    const validation = this.taskSchema.validateAgainstSchema(schema, normalizedInput)
    if (validation.error) return { success: false, error: validation.error }
    await this.assertParentIsValid(supabase, spaceId, normalizedInput.parent_item_id)
    const creationAttachments = this.taskActivity.resolveTaskCreationAttachments(
      target,
      normalizedInput,
      sessionKey,
    )

    const payload = {
      ...pickTaskPayload(normalizedInput, true),
      space_id: spaceId,
      user_id: userId,
      org_id: resolveScopedOrgId({ orgId }),
      source: 'agent',
    } as Record<string, unknown>
    const slackProvenance = this.taskActivity.resolveSlackTaskProvenance(
      target,
      normalizedInput.title,
      sessionKey,
    )
    if (slackProvenance) {
      const customData =
        payload.custom_data &&
        typeof payload.custom_data === 'object' &&
        !Array.isArray(payload.custom_data)
          ? (payload.custom_data as Record<string, unknown>)
          : {}
      payload.custom_data = { ...customData, action_provenance: slackProvenance }
    }
    if (payload.status === undefined) {
      const defaultStatus = this.taskSchema.defaultNewTaskStatusId(statusField)
      if (defaultStatus) payload.status = defaultStatus
    }
    const assigneeError = await resolveAgentAssigneePayload(
      this.tasksRepository,
      supabase,
      userId,
      orgId ?? null,
      normalizedInput,
      payload,
    )
    if (assigneeError) return { success: false, error: assigneeError }
    const { data, error } = await this.tasksRepository.createTask(supabase, payload)
    if (error) throw error
    const activityMeta = this.taskActivity.resolveAgentActivityMeta(target, sessionKey)
    const createdPayload: Record<string, unknown> = { title: data.title, snapshot: data }
    if (creationAttachments.length > 0) createdPayload.attachments = creationAttachments
    const createdActivity = await this.taskActivity.createActivity(supabase, {
      item_id: String(data.id),
      space_id: spaceId,
      user_id: userId,
      org_id: orgId ?? null,
      event_type: 'created',
      payload: createdPayload,
      snapshot: data as Record<string, unknown>,
      ...activityMeta,
    })
    if (creationAttachments.length > 0) {
      await this.indexSpaceSource(target, supabase, {
        sourceType: 'space_activity',
        sourceId: String((createdActivity as Record<string, unknown>).id),
        userId,
        orgId,
      })
    }
    if (normalizedInput.parent_item_id) {
      await this.taskActivity.createActivity(supabase, {
        item_id: String(normalizedInput.parent_item_id),
        space_id: spaceId,
        user_id: userId,
        org_id: orgId ?? null,
        event_type: 'added_subtask',
        payload: { subtask_id: String(data.id), title: data.title ?? '' },
        ...activityMeta,
      })
    }
    await this.indexSpaceSource(target, supabase, {
      sourceType: 'space_task',
      sourceId: String(data.id),
      userId,
      orgId,
    })
    return {
      success: true,
      task: data,
      space_id: spaceId,
      ensured_space: spaceWasCreated
        ? { id: spaceId, created: true }
        : { id: spaceId, created: false },
      warnings: validation.warnings,
    }
  }

  private async updateTask(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const spaceId = String(input.space_id ?? '').trim()
    const taskId = String(input.task_id ?? '').trim()
    if (!spaceId) return { success: false, error: 'space_id is required' }
    if (!taskId) return { success: false, error: 'task_id is required' }
    const { userId, orgId } = this.resolveContext(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const space = await this.loadSpace(supabase, spaceId)
    if (!space) return { success: false, error: 'Space not found' }
    const existing = await this.loadTask(supabase, spaceId, taskId)
    if (!existing) return { success: false, error: 'Task not found' }

    const schema = this.taskSchema.schemaFromSpace(space)
    const normalizeResult = this.taskSchema.normalizeTaskWriteInputAgainstSchema(schema, input)
    if (normalizeResult.error) return { success: false, error: normalizeResult.error }
    const normalizedInput = normalizeResult.input ?? input

    const validation = this.taskSchema.validateAgainstSchema(schema, normalizedInput)
    if (validation.error) return { success: false, error: validation.error }
    await this.assertParentIsValid(supabase, spaceId, normalizedInput.parent_item_id, taskId)

    const updates = pickTaskPayload(normalizedInput, false) as Record<string, unknown>
    const assigneeError = await resolveAgentAssigneePayload(
      this.tasksRepository,
      supabase,
      userId,
      orgId ?? null,
      normalizedInput,
      updates,
    )
    if (assigneeError) return { success: false, error: assigneeError }
    if (normalizedInput.custom_data !== undefined) {
      const existingCustom =
        existing.custom_data &&
        typeof existing.custom_data === 'object' &&
        !Array.isArray(existing.custom_data)
          ? (existing.custom_data as Record<string, unknown>)
          : {}
      updates.custom_data = {
        ...existingCustom,
        ...((normalizedInput.custom_data ?? {}) as Record<string, unknown>),
      }
    }
    if (Object.keys(updates).length === 0) return { success: false, error: 'No updates provided' }

    const { data, error } = await this.tasksRepository.updateTask(supabase, {
      spaceId,
      taskId,
      updates,
    })
    if (error) throw error

    const activityMeta = this.taskActivity.resolveAgentActivityMeta(target, sessionKey)
    await this.taskActivity.createActivities(
      supabase,
      this.taskActivity
        .buildTaskUpdateActivity(existing, updates, {
          item_id: taskId,
          space_id: spaceId,
          user_id: userId,
          org_id: orgId ?? null,
        })
        .map((entry) => ({ ...entry, ...activityMeta })),
    )
    await this.indexSpaceSource(target, supabase, {
      sourceType: 'space_task',
      sourceId: taskId,
      userId,
      orgId,
    })
    return { success: true, task: data, warnings: validation.warnings }
  }

  private async deleteTask(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const spaceId = String(input.space_id ?? '').trim()
    const taskId = String(input.task_id ?? '').trim()
    if (!spaceId) return { success: false, error: 'space_id is required' }
    if (!taskId) return { success: false, error: 'task_id is required' }
    const { userId } = this.resolveContext(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const task = await this.loadTask(supabase, spaceId, taskId)
    if (!task) return { success: false, error: 'Task not found' }
    return {
      success: true,
      status: 'pending_approval',
      ui_blocks: [
        this.taskActivity.buildDeleteConfirmBlock({
          action: 'delete_task',
          entityType: 'task',
          entityId: taskId,
          entityName: String(task.title ?? 'Untitled Task'),
        }),
      ],
    }
  }

  private async addTaskComment(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const spaceId = String(input.space_id ?? '').trim()
    const taskId = String(input.task_id ?? '').trim()
    const message = String(input.message ?? '').trim()
    if (!spaceId) return { success: false, error: 'space_id is required' }
    if (!taskId) return { success: false, error: 'task_id is required' }
    if (!message) return { success: false, error: 'message is required' }
    const { userId, orgId } = this.resolveContext(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const task = await this.loadTask(supabase, spaceId, taskId)
    if (!task) return { success: false, error: 'Task not found' }

    const payload: Record<string, unknown> = { message }
    if (Array.isArray(input.mentions)) payload.mentions = input.mentions
    if (Array.isArray(input.attachments)) payload.attachments = input.attachments
    const activity = await this.taskActivity.createActivity(supabase, {
      item_id: taskId,
      space_id: spaceId,
      user_id: userId,
      org_id: orgId ?? null,
      event_type: 'comment',
      payload,
      ...this.taskActivity.resolveAgentActivityMeta(target, sessionKey),
    })
    await this.indexSpaceSource(target, supabase, {
      sourceType: 'space_activity',
      sourceId: String(activity.id),
      userId,
      orgId,
    })
    return { success: true, activity }
  }
}
