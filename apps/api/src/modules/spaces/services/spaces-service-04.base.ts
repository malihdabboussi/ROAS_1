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
import { SpacesServiceBase03 } from './spaces-service-03.base'

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

export abstract class SpacesServiceBase04 extends SpacesServiceBase03 {
  /**
   * Move or copy a task into another space.
   * - move: rewrites `space_id` on the item AND its descendant subtasks (preserves IDs).
   * - copy: clones the item (and its direct subtasks) into the target space (new IDs).
   */
  async transferItemToSpace(
    supabase: SupabaseClient,
    userId: string,
    sourceSpaceId: string,
    itemId: string,
    targetSpaceId: string,
    mode: 'move' | 'copy',
    orgId?: string | null,
    orgRole?: import('@vibey/api-shared').OrgRole | null,
  ) {
    if (sourceSpaceId === targetSpaceId) {
      throw new BadRequestException('Source and target space are the same')
    }
    await this.permissionsService.assertCanAccessItem(
      supabase,
      userId,
      orgRole,
      sourceSpaceId,
      itemId,
      'edit',
      orgId,
    )
    await this.permissionsService.assertCanAccessSpace(
      supabase,
      userId,
      orgRole,
      targetSpaceId,
      'edit',
      orgId,
    )

    const item = (await this.repo.findItemById(supabase, sourceSpaceId, itemId)) as Record<
      string,
      unknown
    > | null
    if (!item) throw new BadRequestException('Space item not found')

    if (mode === 'move') {
      const updatedRoot = await this.repo.moveItemToSpace(
        supabase,
        itemId,
        sourceSpaceId,
        targetSpaceId,
      )
      const descendants = await this.collectDescendantIds(supabase, sourceSpaceId, itemId)
      await this.repo.moveItemsToSpace(supabase, descendants, sourceSpaceId, targetSpaceId)

      return updatedRoot
    }

    // copy
    const insertPayload = this.buildItemCopyPayload(item, targetSpaceId, userId, orgId, null)
    const createdRoot = await this.repo.createPreparedItem(supabase, insertPayload)

    const subs = await this.repo.findSubtasksByParentId(supabase, sourceSpaceId, itemId)
    if (subs && subs.length > 0) {
      const subPayloads = (subs as Record<string, unknown>[]).map((s) =>
        this.buildItemCopyPayload(s, targetSpaceId, userId, orgId, String(createdRoot.id)),
      )
      await this.repo.createPreparedItems(supabase, subPayloads)
    }

    return createdRoot
  }

  /** Recursively collect descendant item IDs (subtasks + their subtasks) within a space. */
  protected async collectDescendantIds(
    supabase: SupabaseClient,
    spaceId: string,
    rootItemId: string,
  ): Promise<string[]> {
    const out: string[] = []
    let frontier: string[] = [rootItemId]
    while (frontier.length > 0) {
      const ids = await this.repo.findChildItemIds(supabase, spaceId, frontier)
      if (ids.length === 0) break
      out.push(...ids)
      frontier = ids
    }
    return out
  }

  /** Strip identity/timestamp columns and rewrite ownership for an item duplicated into another space. */
  protected buildItemCopyPayload(
    src: Record<string, unknown>,
    targetSpaceId: string,
    userId: string,
    orgId: string | null | undefined,
    parentItemId: string | null,
  ): Record<string, unknown> {
    const {
      id: _id,
      created_at: _ca,
      updated_at: _ua,
      space_id: _sid,
      user_id: _uid,
      org_id: _oid,
      parent_item_id: _pid,
      linked_mission_id: _lmid,
      recurrence_parent_id: _rpid,
      ...rest
    } = src
    return {
      ...rest,
      space_id: targetSpaceId,
      user_id: userId,
      org_id: resolveScopedOrgId({ orgId: orgId ?? null }),
      parent_item_id: parentItemId,
    }
  }

  async listSubtasks(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    parentItemId: string,
    orgId?: string | null,
  ) {
    const parent = await this.repo.findItemById(supabase, spaceId, parentItemId)
    if (!parent) throw new BadRequestException('Parent item not found')
    return this.repo.findSubtasksByParentId(supabase, spaceId, parentItemId)
  }

  async acceptSuggestion(
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
    const item = await this.repo.findItemById(supabase, spaceId, itemId)
    if (!item) throw new BadRequestException('Space item not found')
    if (item.source !== 'agent_suggested') {
      throw new BadRequestException('Only agent-suggested items can be accepted')
    }
    const data = await this.repo.updateSuggestionState(supabase, spaceId, itemId, 'accepted')

    this.logActivities(supabase, [
      {
        item_id: itemId,
        space_id: spaceId,
        user_id: userId,
        org_id: orgId ?? null,
        event_type: 'field_change',
        payload: { field: 'suggestion_state', from: null, to: 'accepted' },
      },
    ])

    return data
  }

  async dismissSuggestion(
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
    const item = await this.repo.findItemById(supabase, spaceId, itemId)
    if (!item) throw new BadRequestException('Space item not found')
    if (item.source !== 'agent_suggested') {
      throw new BadRequestException('Only agent-suggested items can be dismissed')
    }
    const data = await this.repo.updateSuggestionState(supabase, spaceId, itemId, 'dismissed')

    this.logActivities(supabase, [
      {
        item_id: itemId,
        space_id: spaceId,
        user_id: userId,
        org_id: orgId ?? null,
        event_type: 'field_change',
        payload: { field: 'suggestion_state', from: null, to: 'dismissed' },
      },
    ])

    return data
  }

  async enforceSuggestionRateLimit(supabase: SupabaseClient, spaceId: string): Promise<void> {
    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const count = await this.repo.countRecentAgentSuggestions(supabase, spaceId, sinceIso)
    if (count >= 10) {
      throw new BadRequestException(
        'This space has hit the daily limit of 10 agent suggestions. Accept or dismiss older ones first.',
      )
    }
  }

  protected fireAutomation(
    event: TriggerEvent,
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    itemId: string,
    orgId?: string | null,
  ): void {
    if (!this.automationService) return
    this.automationService
      .evaluate(event, {
        supabase,
        userId,
        orgId: orgId ?? null,
        spaceId,
        itemId,
        depth: 0,
      })
      .catch((err) => this.logger.error(`Automation eval failed: ${err}`))
  }

  protected normalizeAssignees(value: unknown): SpaceItemAssignee[] {
    if (!Array.isArray(value)) return []
    const out: SpaceItemAssignee[] = []
    const seen = new Set<string>()
    for (const item of value) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue
      const raw = item as Record<string, unknown>
      const type = raw.type === 'human' || raw.type === 'agent' ? raw.type : null
      const id = typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : null
      if (!type || !id) continue
      const key = `${type}:${id}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ type, id })
    }
    return out
  }

  protected itemAssignees(item: Record<string, unknown> | null | undefined): SpaceItemAssignee[] {
    const assignees = this.normalizeAssignees(item?.assignees)
    if (assignees.length > 0) return assignees
    if (
      (item?.assignee_type === 'human' || item?.assignee_type === 'agent') &&
      typeof item.assignee_id === 'string' &&
      item.assignee_id.length > 0
    ) {
      return [{ type: item.assignee_type, id: item.assignee_id }]
    }
    return []
  }

  protected assigneesEqual(a: SpaceItemAssignee[], b: SpaceItemAssignee[]): boolean {
    const serialize = (items: SpaceItemAssignee[]) =>
      items
        .map((item) => `${item.type}:${item.id}`)
        .sort()
        .join('|')
    return serialize(a) === serialize(b)
  }

  protected assigneeDiff(
    from: SpaceItemAssignee[],
    to: SpaceItemAssignee[],
  ): { added: SpaceItemAssignee[]; removed: SpaceItemAssignee[] } {
    const fromKeys = new Set(from.map((item) => `${item.type}:${item.id}`))
    const toKeys = new Set(to.map((item) => `${item.type}:${item.id}`))
    return {
      added: to.filter((item) => !fromKeys.has(`${item.type}:${item.id}`)),
      removed: from.filter((item) => !toKeys.has(`${item.type}:${item.id}`)),
    }
  }

  protected logActivities(supabase: SupabaseClient, entries: ActivityInsert[]): void {
    if (entries.length === 0) return
    this.repo
      .createActivities(supabase, entries)
      .catch((err) => this.logger.error(`Activity log failed: ${err}`))
    this.notifications.dispatch(entries)
  }

  async pushToAgent(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    itemId: string,
    orgId?: string | null,
    body?: PushToAgentBody,
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
    const item = await this.repo.findItemById(supabase, spaceId, itemId)
    if (!item) throw new BadRequestException('Space item not found')
    if (item.linked_mission_id) throw new BadRequestException('Item already linked to a mission')

    const space = await this.repo.findSpaceById(supabase, userId, spaceId, orgId)

    const inc = body?.include ?? {}
    const description = this.composeMissionDescription(item, space, inc, body?.extra_notes)
    const tags = this.resolveTagLabels(item, space)

    const missionInsert: Record<string, unknown> = {
      title: item.title,
      brief: item.description || this.itemBodyText(item) || undefined,
      description: description || undefined,
      status: 'inbox',
      priority: item.priority,
      user_id: userId,
      org_id: resolveScopedOrgId({ orgId: orgId ?? null }),
      idempotency_key: randomUUID(),
      assigned_agent_key: item.assignee_type === 'agent' ? item.assignee_id : undefined,
      due_date: item.due_date || undefined,
      campaign_id: space?.campaign_id || undefined,
      tags: tags.length > 0 ? tags : undefined,
      input: {
        space_item_id: itemId,
        space_id: spaceId,
        ...(body?.preferred_agent_keys?.length
          ? { preferred_agent_keys: body.preferred_agent_keys }
          : {}),
      },
    }

    const mission = await this.repo.createMissionFromSpaceItem(supabase, missionInsert)
    const updated = await this.repo.linkItemToMission(supabase, spaceId, itemId, mission.id)

    const actBase = { item_id: itemId, space_id: spaceId, user_id: userId, org_id: orgId ?? null }
    const pushEntries: ActivityInsert[] = []
    const oldStatus = item.status as string
    if (oldStatus !== 'in_progress') {
      pushEntries.push({
        ...actBase,
        event_type: 'status_change',
        payload: { from: oldStatus, to: 'in_progress' },
      })
    }
    pushEntries.push({
      ...actBase,
      event_type: 'field_change',
      payload: { field: 'linked_mission_id', from: null, to: mission.id },
    })
    this.logActivities(supabase, pushEntries)

    return updated
  }
}
