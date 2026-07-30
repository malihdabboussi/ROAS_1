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
import { SpacesServiceBase02 } from './spaces-service-02.base'

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

export abstract class SpacesServiceBase03 extends SpacesServiceBase02 {
  /**
   * Fires the automation triggers implied by an item PATCH (status / priority /
   * assignee / dates / tags / custom fields). Shared by `updateItem` and
   * `updateItemsBatch` so batched writes keep per-item automation semantics.
   */
  protected fireUpdateItemAutomations(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    itemId: string,
    orgId: string | null | undefined,
    oldItem: Record<string, unknown> | null,
    dto: UpdateSpaceItemDto,
  ): void {
    const itemIsSubtask = !!(oldItem as { parent_item_id?: string | null } | null)?.parent_item_id

    if (dto.status !== undefined && oldItem && oldItem.status !== dto.status) {
      this.fireAutomation(
        {
          type: 'status_change',
          from: String(oldItem.status),
          to: dto.status,
          is_subtask: itemIsSubtask,
        },
        supabase,
        userId,
        spaceId,
        itemId,
        orgId,
      )
    }

    if (
      dto.priority !== undefined &&
      dto.priority !== null &&
      oldItem &&
      oldItem.priority !== dto.priority
    ) {
      this.fireAutomation(
        {
          type: 'priority_changed',
          from: oldItem.priority != null ? String(oldItem.priority) : undefined,
          to: dto.priority,
          is_subtask: itemIsSubtask,
        },
        supabase,
        userId,
        spaceId,
        itemId,
        orgId,
      )
    }

    if (
      oldItem &&
      (dto.assignees !== undefined ||
        dto.assignee_type !== undefined ||
        dto.assignee_id !== undefined)
    ) {
      const oldAssignees = this.itemAssignees(oldItem)
      const nextAssignees =
        dto.assignees !== undefined
          ? this.normalizeAssignees(dto.assignees)
          : dto.assignee_type === 'human' || dto.assignee_type === 'agent'
            ? [
                {
                  type: dto.assignee_type,
                  id: String(dto.assignee_id ?? oldItem.assignee_id ?? ''),
                },
              ].filter((assignee) => assignee.id.length > 0)
            : dto.assignee_type === 'unassigned'
              ? []
              : oldAssignees
      if (!this.assigneesEqual(oldAssignees, nextAssignees)) {
        const diff = this.assigneeDiff(oldAssignees, nextAssignees)
        const nextPrimary = nextAssignees[0] ?? null
        this.fireAutomation(
          {
            type: 'assignee_changed',
            from_type: oldAssignees[0]?.type ?? 'unassigned',
            from_id: oldAssignees[0]?.id,
            to_type: nextPrimary?.type ?? 'unassigned',
            to_id: nextPrimary?.id,
            from_assignees: oldAssignees,
            to_assignees: nextAssignees,
            added_assignees: diff.added,
            removed_assignees: diff.removed,
            is_subtask: itemIsSubtask,
          },
          supabase,
          userId,
          spaceId,
          itemId,
          orgId,
        )
      }
    }

    if (dto.due_date !== undefined && oldItem && oldItem.due_date !== dto.due_date) {
      this.fireAutomation(
        {
          type: 'due_date_changed',
          from: oldItem.due_date != null ? String(oldItem.due_date) : undefined,
          to: dto.due_date != null ? String(dto.due_date) : undefined,
          is_subtask: itemIsSubtask,
        },
        supabase,
        userId,
        spaceId,
        itemId,
        orgId,
      )
    }

    if (dto.start_date !== undefined && oldItem && oldItem.start_date !== dto.start_date) {
      this.fireAutomation(
        {
          type: 'start_date_changed',
          from: oldItem.start_date != null ? String(oldItem.start_date) : undefined,
          to: dto.start_date != null ? String(dto.start_date) : undefined,
          is_subtask: itemIsSubtask,
        },
        supabase,
        userId,
        spaceId,
        itemId,
        orgId,
      )
    }

    if (dto.custom_data !== undefined && oldItem) {
      const oldCustom = (oldItem.custom_data ?? {}) as Record<string, unknown>
      const nextCustomData = dto.custom_data ?? {}

      const oldTags = Array.isArray(oldCustom.tags) ? (oldCustom.tags as unknown[]).map(String) : []
      const newTagsRaw = (nextCustomData as Record<string, unknown>).tags
      const newTags = Array.isArray(newTagsRaw) ? (newTagsRaw as unknown[]).map(String) : oldTags
      if ('tags' in nextCustomData) {
        const oldSet = new Set(oldTags)
        const newSet = new Set(newTags)
        for (const tag of newTags) {
          if (!oldSet.has(tag)) {
            this.fireAutomation(
              { type: 'tag_added', tag, is_subtask: itemIsSubtask },
              supabase,
              userId,
              spaceId,
              itemId,
              orgId,
            )
          }
        }
        for (const tag of oldTags) {
          if (!newSet.has(tag)) {
            this.fireAutomation(
              { type: 'tag_removed', tag, is_subtask: itemIsSubtask },
              supabase,
              userId,
              spaceId,
              itemId,
              orgId,
            )
          }
        }
      }

      for (const [key, val] of Object.entries(nextCustomData)) {
        if (key === 'tags') continue
        const oldVal = oldCustom[key]
        if (JSON.stringify(oldVal) !== JSON.stringify(val)) {
          this.fireAutomation(
            {
              type: 'field_changed',
              field_id: key,
              from: oldVal != null ? String(oldVal) : undefined,
              to: val != null ? String(val) : undefined,
              is_subtask: itemIsSubtask,
            },
            supabase,
            userId,
            spaceId,
            itemId,
            orgId,
          )
        }
      }
    }
  }

  /**
   * Batched item PATCH (e.g. drag-and-drop reorder renumbering N siblings).
   * Replaces N independent `updateItem` requests with: ONE space-level
   * permission resolution (per-item checks only for protected/foreign rows), ONE
   * fetch of all affected rows, parallel row updates, one batched activity
   * insert, and the same per-item automation triggers as a single PATCH.
   */
  async updateItemsBatch(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    updates: BatchUpdateSpaceItemsDto['updates'],
    orgId?: string | null,
    orgRole?: import('@vibey/api-shared').OrgRole | null,
  ) {
    if (updates.length === 0) return []
    const ids = updates.map((u) => u.item_id)
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Duplicate item_id in batch update')
    }

    // One space-level permission resolution covers every non-protected item the
    // caller doesn't own; only protected/foreign edge cases pay a per-item check.
    const spaceLevel = await this.permissionsService.resolveEffectiveLevel(
      supabase,
      userId,
      orgRole,
      spaceId,
      undefined,
      orgId,
    )
    const canEditViaSpace = spaceLevel === 'edit' || spaceLevel === 'admin'

    const oldRows = (await this.repo.findItemsByIds(supabase, spaceId, ids)) as Record<
      string,
      unknown
    >[]
    const oldById = new Map(oldRows.map((row) => [String(row.id), row]))

    for (const update of updates) {
      const oldItem = oldById.get(update.item_id)
      if (!oldItem) throw new BadRequestException('Space item not found')
      const dto = update.payload
      if (oldItem.user_id !== userId && (oldItem.is_private || !canEditViaSpace)) {
        await this.permissionsService.assertCanAccessItem(
          supabase,
          userId,
          orgRole,
          spaceId,
          update.item_id,
          'edit',
          orgId,
        )
      }
      if (dto.recurrence !== undefined || dto.due_date !== undefined) {
        const nextRecurrence = dto.recurrence !== undefined ? dto.recurrence : oldItem.recurrence
        const nextDueDate = dto.due_date !== undefined ? dto.due_date : oldItem.due_date
        if (nextRecurrence && !nextDueDate) {
          throw new BadRequestException('Recurring space items require a due_date')
        }
      }
      // Hierarchy validation only when the parent actually changes (a reorder
      // resends unchanged parent ids for every renumbered sibling).
      if (dto.parent_item_id && dto.parent_item_id !== (oldItem.parent_item_id ?? null)) {
        const oldCustomData =
          oldItem.custom_data &&
          typeof oldItem.custom_data === 'object' &&
          !Array.isArray(oldItem.custom_data)
            ? (oldItem.custom_data as Record<string, unknown>)
            : {}
        const nextCustomData = { ...oldCustomData, ...(dto.custom_data ?? {}) }
        await this.validateParentHierarchy(
          supabase,
          spaceId,
          dto.parent_item_id,
          update.item_id,
          this.isDocItem(nextCustomData),
        )
      }
      await sanitizeAssigneesForWrite(this.repo, supabase, userId, orgId, dto)
    }

    const updatedRows = await Promise.all(
      updates.map((update) => {
        const oldItem = oldById.get(update.item_id)!
        const payload: Record<string, unknown> = { ...update.payload }
        if (update.payload.custom_data !== undefined) {
          payload.custom_data = {
            ...((oldItem.custom_data ?? {}) as Record<string, unknown>),
            ...markManualMeetingCallKind(update.payload.custom_data ?? {}),
          }
        }
        return this.repo.updateItemPrepared(
          supabase,
          userId,
          spaceId,
          update.item_id,
          payload,
          orgId,
        )
      }),
    )

    await Promise.all(
      updates.map(async (update, i) => {
        if (update.payload.doc_body === undefined && update.payload.title === undefined) return
        const sync = await syncDocEditToConversationDocument(
          this.repo,
          supabase,
          updatedRows[i] as Record<string, unknown>,
          update.payload,
        )
        if (sync.error) {
          this.logger.warn(`Doc edit write-back to conversation document failed: ${sync.error}`)
        }
      }),
    )

    const activityEntries: ActivityInsert[] = []
    for (let i = 0; i < updates.length; i += 1) {
      const update = updates[i]!
      const updated = updatedRows[i]!
      const oldItem = oldById.get(update.item_id)!
      const dto = update.payload

      // Retrieval index embeds title/notes/description/custom_data/parent — a
      // pure sort_order renumber doesn't change indexed content, so skip it.
      const parentChanged =
        dto.parent_item_id !== undefined &&
        (dto.parent_item_id ?? null) !== (oldItem.parent_item_id ?? null)
      const contentRelevant =
        parentChanged ||
        Object.keys(dto).some((key) => key !== 'sort_order' && key !== 'parent_item_id')
      if (contentRelevant) {
        const oldSourceType = this.spaceItemSourceType(oldItem.custom_data)
        const nextSourceType = this.spaceItemSourceType(updated.custom_data)
        if (oldSourceType !== nextSourceType) {
          await this.spaceRetrievalIndex.deleteSource(supabase, oldSourceType, update.item_id)
        }
        await this.spaceRetrievalIndex.indexSource(supabase, {
          sourceType: nextSourceType,
          sourceId: update.item_id,
          userId,
          orgId,
          spaceId,
        })
      }

      activityEntries.push(
        ...diffUpdateActivity(oldItem, dto as Record<string, unknown>, {
          item_id: update.item_id,
          space_id: spaceId,
          user_id: userId,
          org_id: orgId ?? null,
        }),
      )

      this.fireUpdateItemAutomations(supabase, userId, spaceId, update.item_id, orgId, oldItem, dto)
    }

    this.logActivities(supabase, activityEntries)

    return updatedRows
  }

  async deleteItem(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    itemId: string,
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
    if (item?.parent_item_id) {
      this.logActivities(supabase, [
        {
          item_id: String(item.parent_item_id),
          space_id: spaceId,
          user_id: userId,
          org_id: orgId ?? null,
          event_type: 'deleted_subtask',
          payload: { subtask_id: itemId, title: (item.title as string) ?? '' },
        },
      ])
    }
    const deleted = await this.repo.deleteItem(supabase, userId, spaceId, itemId, orgId)
    await this.spaceRetrievalIndex.deleteSource(
      supabase,
      this.spaceItemSourceType(item?.custom_data),
      itemId,
    )
    return deleted
  }
}
