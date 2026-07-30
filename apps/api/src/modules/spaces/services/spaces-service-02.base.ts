import { randomUUID } from 'node:crypto'
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveScopedOrgId } from '@vibey/api-shared'
import { CreditsService } from '../../billing/services/credits.service'
import { extractUrlsFromHtml } from '../../link-preview/lib/extract-urls'
import { LinkPreviewService } from '../../link-preview/services/link-preview.service'
import { markManualMeetingCallKind } from '../../meetings/domain/meeting-call-kind'
import { SpaceRetrievalIndexService } from '../../space-retrieval/services/space-retrieval-index.service'
import { UserAgentApiService } from '../../user-agent-api/services/user-agent-api.service'
import type {
  BatchUpdateSpaceItemsDto,
  CreateSpaceDto,
  CreateSpaceItemDto,
  DuplicateSpaceItemDto,
  EnsureSpaceViewDto,
  InvokeTaskAgentBody,
  PushToAgentBody,
  RecentAutomationRunsQuery,
  SpaceItemQuery,
  SpaceQuery,
  UpdateSpaceDto,
  UpdateSpaceItemDto,
  VisualizeDocBody,
} from '../dto'
import { buildArtifactViewDef } from '../lib/build-artifact-view-def'
import { resolveDocMentionLinkPreviews } from '../lib/resolve-doc-mention-previews'
import { sanitizeCommentHtml } from '../lib/sanitize-comment'
import { syncDocEditToConversationDocument } from '../lib/sync-doc-conversation-copy'
import { SpacesRepository } from '../repositories/spaces.repository'
import { diffUpdateActivity, type ActivityInsert } from '../space-item-activity.helpers'
import { sanitizeAssigneesForWrite } from '../utils/sanitize-assignees'
import { SpaceAutomationService, type TriggerEvent } from './space-automation.service'
import { SpaceNotificationsService } from './space-notifications.service'
import { SpacePermissionsService } from './space-permissions.service'
import { SpacesServiceBase01 } from './spaces-service-01.base'

const MAX_DOC_NESTING_LEVEL = 5
const MAX_TASK_NESTING_LEVEL = 2

const DEFAULT_SPACE_SCHEMA = {
  version: 1,
  icon: 'layout-grid',
  fields: [
    { id: 'title', name: 'Name', type: 'text', system: true, required: true },
    {
      id: 'status',
      name: 'Status',
      type: 'select',
      system: true,
      required: true,
      options: [
        { id: 'todo', label: 'To Do', color: 'cyan', group: 'not_started' },
        { id: 'in_progress', label: 'In Progress', color: 'amber', group: 'active' },
        { id: 'in_review', label: 'In Review', color: 'violet', group: 'active' },
        { id: 'done', label: 'Completed', color: 'emerald', group: 'closed' },
        { id: 'archived', label: 'Closed', color: 'slate', group: 'closed' },
      ],
    },
    {
      id: 'priority',
      name: 'Priority',
      type: 'select',
      system: true,
      required: true,
      options: [
        { id: 'low', label: 'Low', color: 'slate' },
        { id: 'medium', label: 'Medium', color: 'blue' },
        { id: 'high', label: 'High', color: 'orange' },
        { id: 'urgent', label: 'Urgent', color: 'red' },
      ],
    },
    { id: 'assignee', name: 'Assignee', type: 'assignee', system: true },
    { id: 'due_date', name: 'Due Date', type: 'date', system: true },
    { id: 'tags', name: 'Tags', type: 'multi_select', system: true, options: [] },
  ],
  // Every space starts with a List view so items added before any manual view
  // setup (e.g. agent-created tasks) are immediately visible.
  views: [
    {
      id: 'list',
      type: 'list',
      name: 'List',
      visible_fields: ['status', 'title', 'priority', 'assignee', 'due_date', 'tags'],
    },
  ],
}

type SpaceItemAssignee = { type: 'human' | 'agent'; id: string }

function cloneJson<T>(value: T): T {
  return value == null ? value : (JSON.parse(JSON.stringify(value)) as T)
}

export abstract class SpacesServiceBase02 extends SpacesServiceBase01 {
  async createItem(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    dto: CreateSpaceItemDto,
    orgId?: string | null,
    orgRole?: import('@vibey/api-shared').OrgRole | null,
  ) {
    await this.permissionsService.assertCanAccessSpace(
      supabase,
      userId,
      orgRole,
      spaceId,
      'edit',
      orgId,
    )
    if (dto.recurrence && !dto.due_date) {
      throw new BadRequestException('Recurring space items require a due_date')
    }
    if (dto.parent_item_id) {
      await this.validateParentHierarchy(
        supabase,
        spaceId,
        dto.parent_item_id,
        null,
        this.isDocItem(dto.custom_data),
      )
    }
    if (dto.source === 'agent_suggested') {
      await this.enforceSuggestionRateLimit(supabase, spaceId)
    }
    await sanitizeAssigneesForWrite(this.repo, supabase, userId, orgId, dto)
    const createDto = { ...dto }
    if (createDto.sort_order === undefined) {
      const maxSort = await this.repo.maxSortOrderForParent(
        supabase,
        spaceId,
        dto.parent_item_id ?? null,
      )
      createDto.sort_order = maxSort + 1
    }
    const created = await this.repo.createItem(supabase, userId, spaceId, createDto, orgId)
    await this.spaceRetrievalIndex.indexSource(supabase, {
      sourceType: this.spaceItemSourceType(created.custom_data),
      sourceId: created.id,
      userId,
      orgId,
      spaceId,
    })

    const actBase = { space_id: spaceId, user_id: userId, org_id: orgId ?? null }
    const createdPayload: Record<string, unknown> = { title: created.title }
    if (dto.form_id) {
      createdPayload.source = 'form'
      createdPayload.form_id = dto.form_id
    }
    const actEntries: ActivityInsert[] = [
      { ...actBase, item_id: created.id, event_type: 'created', payload: createdPayload },
    ]
    if (dto.parent_item_id) {
      actEntries.push({
        ...actBase,
        item_id: dto.parent_item_id,
        event_type: 'added_subtask',
        payload: { subtask_id: created.id, title: created.title ?? '' },
      })
    }
    this.logActivities(supabase, actEntries)

    this.fireAutomation(
      {
        type: 'task_created',
        in_status: created.status ?? 'todo',
        is_subtask: !!(created as { parent_item_id?: string | null }).parent_item_id,
      },
      supabase,
      userId,
      spaceId,
      created.id,
      orgId,
    )

    if (dto.form_id) {
      this.fireAutomation(
        {
          type: 'form_submitted',
          form_id: dto.form_id,
          answers: (dto.custom_data ?? {}) as Record<string, unknown>,
        },
        supabase,
        userId,
        spaceId,
        created.id,
        orgId,
      )
    }

    return created
  }

  protected buildDuplicateItemPayload(
    item: Record<string, unknown>,
    opts: {
      title: string
      userId: string
      spaceId: string
      orgId?: string | null
      parentItemId: string | null
      include: NonNullable<DuplicateSpaceItemDto['include']>
    },
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      title: opts.title,
      space_id: opts.spaceId,
      user_id: opts.userId,
      org_id: resolveScopedOrgId({ orgId: opts.orgId ?? null }),
      parent_item_id: opts.parentItemId,
    }

    if (opts.include.status) payload.status = item.status
    if (opts.include.priority) payload.priority = item.priority
    if (opts.include.assignees) {
      payload.assignee_type = item.assignee_type
      payload.assignee_id = item.assignee_id
      payload.assignees = cloneJson(item.assignees ?? [])
    }
    if (opts.include.start_date) payload.start_date = item.start_date
    // Recurrence requires due_date, so force-include it when recurrence is selected.
    if (opts.include.due_date || opts.include.recurrence) payload.due_date = item.due_date
    if (opts.include.description) payload.description = item.description
    if (opts.include.notes) payload.notes = item.notes
    const fieldIds = opts.include.custom_field_ids ?? []
    if (fieldIds.length > 0) {
      const source = (item.custom_data ?? {}) as Record<string, unknown>
      const filtered: Record<string, unknown> = {}
      for (const id of fieldIds) {
        if (Object.prototype.hasOwnProperty.call(source, id)) filtered[id] = cloneJson(source[id])
      }
      payload.custom_data = filtered
    }
    if (opts.include.recurrence) payload.recurrence = cloneJson(item.recurrence ?? null)
    if (opts.include.mission) payload.linked_mission_id = item.linked_mission_id

    return payload
  }

  protected async insertDuplicatedItem(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.repo.createPreparedItem(supabase, payload)
  }

  async duplicateItem(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    itemId: string,
    dto: DuplicateSpaceItemDto,
    orgId?: string | null,
    orgRole?: import('@vibey/api-shared').OrgRole | null,
  ) {
    await this.permissionsService.assertCanAccessItem(
      supabase,
      userId,
      orgRole,
      spaceId,
      itemId,
      'edit',
      orgId,
    )

    const item = (await this.repo.findItemById(supabase, spaceId, itemId)) as Record<
      string,
      unknown
    > | null
    if (!item) throw new BadRequestException('Space item not found')

    const include = dto.include ?? {}
    const defaultTitle = `${String(item.title ?? 'Untitled')} (copy)`
    const title =
      typeof dto.title === 'string' && dto.title.trim().length > 0 ? dto.title.trim() : defaultTitle
    const created = await this.insertDuplicatedItem(
      supabase,
      this.buildDuplicateItemPayload(item, {
        title,
        userId,
        spaceId,
        orgId,
        parentItemId: (item.parent_item_id as string | null | undefined) ?? null,
        include,
      }),
    )

    const activityRows: ActivityInsert[] = [
      {
        item_id: String(created.id),
        space_id: spaceId,
        user_id: userId,
        org_id: orgId ?? null,
        event_type: 'created',
        payload: { title: created.title, duplicated_from_item_id: itemId },
      },
    ]

    if (include.comments || include.documents || include.deliverables) {
      const rows = (await this.repo.findActivityByItemId(supabase, spaceId, itemId)) as Record<
        string,
        unknown
      >[]
      for (const row of rows) {
        const eventType = typeof row.event_type === 'string' ? row.event_type : ''
        const isComment = eventType === 'comment' || eventType === 'user.comment'
        const isDeliverable = eventType === 'agent_task_execution'
        const sourcePayload = (row.payload ?? {}) as Record<string, unknown>
        let payload: Record<string, unknown> | null = null

        if (isComment && (include.comments || include.documents)) {
          payload = {}
          if (include.comments) {
            if (sourcePayload.message !== undefined) payload.message = sourcePayload.message
            if (sourcePayload.mentions !== undefined)
              payload.mentions = cloneJson(sourcePayload.mentions)
            if (sourcePayload.previews !== undefined)
              payload.previews = cloneJson(sourcePayload.previews)
          }
          if (include.documents && Array.isArray(sourcePayload.attachments)) {
            payload.attachments = cloneJson(sourcePayload.attachments)
          }
          if (Object.keys(payload).length === 0) payload = null
        } else if (isDeliverable && include.deliverables) {
          payload = cloneJson(sourcePayload)
        }

        if (!payload) continue
        activityRows.push({
          item_id: String(created.id),
          space_id: spaceId,
          user_id: typeof row.user_id === 'string' ? row.user_id : userId,
          org_id: orgId ?? null,
          event_type: eventType,
          payload,
        })
      }
    }

    await this.repo.createActivities(supabase, activityRows)

    if (include.subtasks) {
      const subtasks = (await this.repo.findSubtasksByParentId(
        supabase,
        spaceId,
        itemId,
      )) as Record<string, unknown>[]
      if (subtasks.length > 0) {
        const subPayloads = subtasks.map((subtask) =>
          this.buildDuplicateItemPayload(subtask, {
            title: String(subtask.title ?? 'Untitled'),
            userId,
            spaceId,
            orgId,
            parentItemId: String(created.id),
            include,
          }),
        )
        await this.repo.createPreparedItems(supabase, subPayloads)
      }
    }

    this.fireAutomation(
      {
        type: 'task_created',
        in_status: (created.status as string | null | undefined) ?? 'todo',
        is_subtask: !!(created as { parent_item_id?: string | null }).parent_item_id,
      },
      supabase,
      userId,
      spaceId,
      String(created.id),
      orgId,
    )

    return created
  }

  async updateItem(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    itemId: string,
    dto: UpdateSpaceItemDto,
    orgId?: string | null,
    orgRole?: import('@vibey/api-shared').OrgRole | null,
  ) {
    await this.permissionsService.assertCanAccessItem(
      supabase,
      userId,
      orgRole,
      spaceId,
      itemId,
      'edit',
      orgId,
    )
    const oldItem = (await this.repo.findItemById(supabase, spaceId, itemId)) as Record<
      string,
      unknown
    > | null
    if (!oldItem && (dto.recurrence !== undefined || dto.due_date !== undefined)) {
      throw new BadRequestException('Space item not found')
    }

    if (dto.recurrence !== undefined || dto.due_date !== undefined) {
      const nextRecurrence = dto.recurrence !== undefined ? dto.recurrence : oldItem?.recurrence
      const nextDueDate = dto.due_date !== undefined ? dto.due_date : oldItem?.due_date
      if (nextRecurrence && !nextDueDate) {
        throw new BadRequestException('Recurring space items require a due_date')
      }
    }
    if (dto.parent_item_id) {
      const oldCustomData =
        oldItem && typeof oldItem.custom_data === 'object' && !Array.isArray(oldItem.custom_data)
          ? (oldItem.custom_data as Record<string, unknown>)
          : {}
      const nextCustomData = { ...oldCustomData, ...(dto.custom_data ?? {}) }
      await this.validateParentHierarchy(
        supabase,
        spaceId,
        dto.parent_item_id,
        itemId,
        this.isDocItem(nextCustomData),
      )
    }

    await sanitizeAssigneesForWrite(this.repo, supabase, userId, orgId, dto)
    const writeDto =
      dto.custom_data === undefined
        ? dto
        : {
            ...dto,
            custom_data: markManualMeetingCallKind(dto.custom_data),
          }
    const updated = await this.repo.updateItem(
      supabase,
      userId,
      spaceId,
      itemId,
      writeDto,
      orgId,
    )
    if (dto.doc_body !== undefined || dto.title !== undefined) {
      const sync = await syncDocEditToConversationDocument(
        this.repo,
        supabase,
        updated as Record<string, unknown>,
        dto,
      )
      if (sync.error) {
        this.logger.warn(`Doc edit write-back to conversation document failed: ${sync.error}`)
      }
    }
    const oldSourceType = this.spaceItemSourceType(oldItem?.custom_data)
    const nextSourceType = this.spaceItemSourceType(updated.custom_data)
    if (oldItem && oldSourceType !== nextSourceType) {
      await this.spaceRetrievalIndex.deleteSource(supabase, oldSourceType, itemId)
    }
    await this.spaceRetrievalIndex.indexSource(supabase, {
      sourceType: nextSourceType,
      sourceId: itemId,
      userId,
      orgId,
      spaceId,
    })

    if (oldItem) {
      const activityEntries = diffUpdateActivity(oldItem, dto as Record<string, unknown>, {
        item_id: itemId,
        space_id: spaceId,
        user_id: userId,
        org_id: orgId ?? null,
      })
      this.logActivities(supabase, activityEntries)
    }

    this.fireUpdateItemAutomations(supabase, userId, spaceId, itemId, orgId, oldItem, dto)

    return updated
  }
}
