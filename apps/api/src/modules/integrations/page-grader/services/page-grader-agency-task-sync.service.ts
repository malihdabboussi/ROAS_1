import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { PageGraderApiService } from './page-grader-api.service'

export type PageGraderClientScope = {
  campaign_id: string
  campaign_name?: string
  space_id?: string | null
  space_title?: string | null
}

export type PageGraderCampaignSpaceMapping = {
  page_grader_campaign_id: string
  space_id: string
  space_title: string
}

type TaskThread = {
  comments: Array<Record<string, unknown>>
  portal_comments: Array<Record<string, unknown>>
  attachments: Array<Record<string, unknown>>
  activity: Array<Record<string, unknown>>
}

@Injectable()
export class PageGraderAgencyTaskSyncService {
  constructor(private readonly api: PageGraderApiService) {}

  async syncTaskThreadActivity(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    clientId: string,
    taskId: string,
    spaceItemId: string,
    thread: TaskThread,
  ): Promise<void> {
    const itemResult = await supabase
      .from('space_items')
      .select('id, space_id, custom_data')
      .eq('id', spaceItemId)
      .maybeSingle()
    if (itemResult.error) throw new BadRequestException(itemResult.error.message)
    const item = itemResult.data as Record<string, unknown> | null
    const custom = recordValue(item?.custom_data)
    if (
      !item ||
      stringValue(custom.page_grader_work_id) !== taskId ||
      stringValue(custom.page_grader_client_id) !== clientId
    ) {
      throw new BadRequestException('The mirrored task does not match this Page Grader task')
    }
    const spaceId = stringValue(item.space_id)
    const existing = await supabase
      .from('space_item_activity')
      .select('id')
      .eq('item_id', spaceItemId)
      .eq('payload->external_mirror->>provider', 'clickup')
    if (existing.error) throw new BadRequestException(existing.error.message)
    const ids = (existing.data ?? []).map((row) => String(row.id))
    if (ids.length > 0) {
      const deleted = await supabase.from('space_item_activity').delete().in('id', ids)
      if (deleted.error) throw new BadRequestException(deleted.error.message)
    }
    const seenClickUpComments = new Set(
      thread.comments.map((row) => stringValue(row.clickup_comment_id)).filter(Boolean),
    )
    const rows = [
      ...thread.comments.map((comment) =>
        buildExternalCommentRow({
          comment,
          itemId: spaceItemId,
          spaceId,
          userId,
          orgId: scope.orgId ?? null,
          source: 'clickup',
        }),
      ),
      ...thread.portal_comments.flatMap((comment) => {
        const clickupCommentId = stringValue(comment.clickup_comment_id)
        if (clickupCommentId && seenClickUpComments.has(clickupCommentId)) return []
        return [
          buildExternalCommentRow({
            comment,
            itemId: spaceItemId,
            spaceId,
            userId,
            orgId: scope.orgId ?? null,
            source: 'portal',
          }),
        ]
      }),
      ...thread.activity.map((activity) => ({
        item_id: spaceItemId,
        space_id: spaceId,
        user_id: userId,
        org_id: scope.orgId ?? null,
        actor_kind: 'system',
        event_type: 'field_change',
        created_at: nullableString(activity.occurred_at) ?? new Date().toISOString(),
        payload: {
          field: stringValue(activity.field) || 'task',
          from: activity.before_value ?? null,
          to: activity.after_value ?? null,
          external_actor_name: stringValue(activity.actor_name) || 'ClickUp',
          external_read_only: true,
          external_mirror: {
            provider: 'clickup',
            kind: 'activity',
            id: stringValue(activity.clickup_history_id),
          },
        },
      })),
    ]
    if (thread.attachments.length > 0) {
      rows.push(
        buildAttachmentActivityRow({
          attachments: thread.attachments,
          itemId: spaceItemId,
          spaceId,
          userId,
          orgId: scope.orgId ?? null,
          taskId,
        }),
      )
    }
    if (rows.length > 0) {
      const inserted = await supabase.from('space_item_activity').insert(rows)
      if (inserted.error) throw new BadRequestException(inserted.error.message)
    }
  }

  async syncWorkspaceTasks(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    clientId: string,
    tasks: Array<Record<string, unknown>>,
    mapping: PageGraderClientScope,
    campaignSpaces: PageGraderCampaignSpaceMapping[],
  ) {
    const result = {
      synced: 0,
      skipped: 0,
      errors: [] as Array<{ task_id: string; error: string }>,
      itemIds: new Map<string, string>(),
    }
    if (tasks.length === 0) return result
    const spacesByCampaign = new Map(
      campaignSpaces.map((row) => [row.page_grader_campaign_id, row.space_id]),
    )
    await mapWithConcurrency(tasks, 8, async (task) => {
      const taskId = stringValue(task.id)
      const campaignId = stringValue(task.campaign_id)
      const spaceId = campaignId ? spacesByCampaign.get(campaignId) : stringValue(mapping.space_id)
      if (!taskId || !spaceId) {
        result.skipped += 1
        return
      }
      try {
        const itemId = await this.upsertMirroredTask({
          supabase,
          userId,
          scope,
          clientId,
          task,
          taskId,
          campaignId,
          spaceId,
        })
        result.itemIds.set(taskId, itemId)
        result.synced += 1
      } catch (error) {
        result.errors.push({
          task_id: taskId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    })
    return result
  }

  private async upsertMirroredTask(input: {
    supabase: SupabaseClient
    userId: string
    scope: RequestScope
    clientId: string
    task: Record<string, unknown>
    taskId: string
    campaignId: string
    spaceId: string
  }): Promise<string> {
    const { supabase, userId, scope, clientId, task, taskId, campaignId, spaceId } = input
    const source = stringValue(task.source)
    const externalId = stringValue(task.external_id)
    let existing: Record<string, unknown> | null = null
    if (source === 'roas' && externalId) {
      const lookup = await supabase
        .from('space_items')
        .select('*')
        .eq('id', externalId)
        .maybeSingle()
      if (lookup.error) throw new Error(lookup.error.message)
      existing = (lookup.data as Record<string, unknown> | null) ?? null
    }
    if (!existing) {
      const lookup = await supabase
        .from('space_items')
        .select('*')
        .eq('custom_data->>page_grader_work_id', taskId)
        .limit(1)
        .maybeSingle()
      if (lookup.error) throw new Error(lookup.error.message)
      existing = (lookup.data as Record<string, unknown> | null) ?? null
    }
    const payload = buildMirroredTaskPayload({
      task,
      existing,
      clientId,
      taskId,
      campaignId,
      spaceId,
    })
    let itemId = ''
    if (existing?.id) {
      const updated = await supabase
        .from('space_items')
        .update(payload)
        .eq('id', String(existing.id))
        .select('id')
        .single()
      if (updated.error) throw new Error(updated.error.message)
      itemId = String(updated.data.id)
    } else {
      const maxSort = await supabase
        .from('space_items')
        .select('sort_order')
        .eq('space_id', spaceId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (maxSort.error) throw new Error(maxSort.error.message)
      const inserted = await supabase
        .from('space_items')
        .insert({
          ...payload,
          user_id: userId,
          org_id: scope.orgId ?? null,
          sort_order:
            typeof maxSort.data?.sort_order === 'number' ? maxSort.data.sort_order + 1 : 0,
        })
        .select('id')
        .single()
      if (inserted.error) throw new Error(inserted.error.message)
      itemId = String(inserted.data.id)
    }
    if (stringValue(task.roas_space_item_id) !== itemId) {
      await this.api
        .updateWorkspaceEntity(
          userId,
          `/clients/${encodeURIComponent(clientId)}/tasks/${encodeURIComponent(taskId)}`,
          { roas_space_item_id: itemId },
        )
        .catch(() => undefined)
    }
    return itemId
  }
}

function buildExternalCommentRow(input: {
  comment: Record<string, unknown>
  itemId: string
  spaceId: string
  userId: string
  orgId: string | null
  source: 'clickup' | 'portal'
}) {
  const { comment, source } = input
  const profile = recordValue(comment.profiles)
  const isClickUp = source === 'clickup'
  return {
    item_id: input.itemId,
    space_id: input.spaceId,
    user_id: input.userId,
    org_id: input.orgId,
    actor_kind: 'system',
    event_type: 'comment',
    created_at:
      nullableString(isClickUp ? comment.clickup_created_at : comment.created_at) ??
      nullableString(comment.hydrated_at) ??
      new Date().toISOString(),
    payload: {
      message: isClickUp
        ? stringValue(comment.body_html, comment.body_text)
        : stringValue(comment.body),
      external_actor_name: isClickUp
        ? stringValue(comment.author_name, comment.author_email) || 'ClickUp user'
        : stringValue(profile.display_name, profile.email) || 'Portal user',
      external_actor_avatar_url: nullableString(
        isClickUp ? comment.author_avatar_url : profile.avatar_url,
      ),
      external_read_only: true,
      external_mirror: {
        provider: 'clickup',
        kind: isClickUp ? 'comment' : 'portal_comment',
        id: stringValue(isClickUp ? comment.clickup_comment_id : comment.id),
      },
    },
  }
}

function buildAttachmentActivityRow(input: {
  attachments: Array<Record<string, unknown>>
  itemId: string
  spaceId: string
  userId: string
  orgId: string | null
  taskId: string
}) {
  return {
    item_id: input.itemId,
    space_id: input.spaceId,
    user_id: input.userId,
    org_id: input.orgId,
    actor_kind: 'system',
    event_type: 'field_change',
    created_at:
      input.attachments
        .map((row) => nullableString(row.clickup_created_at))
        .filter((value): value is string => Boolean(value))
        .sort()[0] ?? new Date().toISOString(),
    payload: {
      field: 'attachments',
      from: [],
      to: input.attachments.map((attachment) => ({
        id: stringValue(attachment.clickup_attachment_id),
        name: stringValue(attachment.title) || 'Attachment',
        url: stringValue(attachment.url),
        mime_type: nullableString(attachment.mimetype),
        thumbnail_url:
          stringValue(attachment.thumbnail_large_url, attachment.thumbnail_small_url) || null,
      })),
      external_actor_name: 'ClickUp',
      external_read_only: true,
      external_mirror: {
        provider: 'clickup',
        kind: 'attachments',
        id: input.taskId,
      },
    },
  }
}

function buildMirroredTaskPayload(input: {
  task: Record<string, unknown>
  existing: Record<string, unknown> | null
  clientId: string
  taskId: string
  campaignId: string
  spaceId: string
}) {
  const { task, existing, clientId, taskId, campaignId, spaceId } = input
  const source = stringValue(task.source)
  return {
    space_id: spaceId,
    title: stringValue(task.task_description) || 'Untitled task',
    status: roasTaskStatus(task.status ?? task.clickup_status),
    priority: roasTaskPriority(task.priority),
    due_date: nullableString(task.due_date),
    description: nullableString(task.notes),
    notes: nullableString(task.blocked_reason),
    custom_data: {
      ...recordValue(existing?.custom_data),
      page_grader_work_id: taskId,
      page_grader_client_id: clientId,
      page_grader_campaign_id: campaignId || null,
      clickup_task_id: stringValue(task.clickup_task_id) || null,
      clickup_task_url: stringValue(task.clickup_task_url) || null,
      page_grader: {
        work_id: taskId,
        client_id: clientId,
        campaign_id: campaignId || null,
        clickup_task_id: stringValue(task.clickup_task_id) || null,
        clickup_task_url: stringValue(task.clickup_task_url) || null,
        source,
        synced_at: new Date().toISOString(),
      },
    },
    // `space_items.source` is intentionally a small, database-enforced set of
    // creation modes. Keep the external provider in `custom_data.page_grader`
    // and use the canonical manual mode for mirrored operational tasks.
    source: 'manual',
    updated_at: new Date().toISOString(),
  }
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function stringValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function roasTaskStatus(value: unknown): string {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
  if (
    ['complete', 'complete / live', 'completed', 'closed', 'done', 'shipped'].includes(normalized)
  )
    return 'done'
  if (['in progress', 'in progress / builder', 'in_progress', 'building'].includes(normalized))
    return 'in_progress'
  if (['review', 'in review', 'in_review', 'approved qc'].includes(normalized)) return 'in_review'
  if (['cancelled', 'canceled', 'archived'].includes(normalized)) return 'archived'
  return 'todo'
}

function roasTaskPriority(value: unknown): string {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
  if (normalized === 'urgent' || normalized === 'high' || normalized === 'low') return normalized
  return 'medium'
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  const output = new Array<R>(values.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++
      output[index] = await mapper(values[index] as T)
    }
  })
  await Promise.all(workers)
  return output
}
