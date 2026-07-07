import { SpacesServiceBase05 } from './spaces-service-05.base'
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

export abstract class SpacesServiceBase06 extends SpacesServiceBase05 {

  async deleteComment(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    itemId: string,
    activityId: string,
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

    const activity = await this.repo.findActivityById(supabase, spaceId, itemId, activityId)
    if (!activity) throw new BadRequestException('Activity not found')
    if (activity.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own comments.')
    }
    if (activity.event_type !== 'comment' && activity.event_type !== 'user.comment') {
      throw new BadRequestException('Only comments can be deleted.')
    }

    const deleted = await this.repo.deleteActivity(supabase, activityId)
    await this.spaceRetrievalIndex.deleteSource(supabase, 'space_activity', activityId)
    return deleted
  }

  async invokeAgentOnTask(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    itemId: string,
    body: InvokeTaskAgentBody,
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

    const space = await this.repo.findSpaceById(supabase, userId, spaceId, orgId)
    const agentKey = body.agent_key.trim()
    const agentLabel = (body.agent_label?.trim() || agentKey).slice(0, 200)
    const inc = {
      title: true,
      status: true,
      notes: true,
      priority: true,
      due_date: false,
      tags: false,
      subtasks: false,
      custom_fields: false,
      ...body.include,
    }
    const extraNotesRaw = body.extra_notes?.trim() ?? ''
    const safeExtraNotes = extraNotesRaw ? sanitizeCommentHtml(extraNotesRaw) : ''

    const mentionHtml = `<span class="channel-mention" data-type="mention" data-id="${agentKey.replace(/"/g, '&quot;')}" data-label="${agentLabel.replace(/"/g, '&quot;')}">@${agentLabel.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`
    const rawMessage = safeExtraNotes
      ? safeExtraNotes.startsWith('<p>')
        ? safeExtraNotes.replace(/^<p>/, `<p>${mentionHtml} `)
        : `<p>${mentionHtml} ${safeExtraNotes}</p>`
      : `<p>${mentionHtml}</p>`
    const safeMessage = sanitizeCommentHtml(rawMessage)

    const entityMentions = body.mentions ?? []
    const allMentions = [
      { type: 'agent' as const, agent_key: agentKey, label: agentLabel },
      ...entityMentions,
    ]
    const conversationRefs = entityMentions
      .filter((m) => m.type === 'conversation' && m.entity_id)
      .map((m) => ({
        id: m.entity_id!,
        label: m.label?.trim() || 'Conversation',
      }))

    const payload: Record<string, unknown> = {
      message: safeMessage,
      mentions: allMentions,
      agent_dispatch: {
        agent_key: agentKey,
        include: inc,
        extra_notes: safeExtraNotes || null,
        skill_keys: body.skill_keys ?? [],
      },
    }
    if (body.attachments?.length) payload.attachments = body.attachments

    const previews = await this.resolveCommentLinkPreviews(
      supabase,
      userId,
      orgId ?? null,
      safeMessage,
      allMentions,
    )
    if (previews.length > 0) payload.previews = previews

    const activityRow = await this.repo.createActivity(supabase, {
      item_id: itemId,
      space_id: spaceId,
      user_id: userId,
      org_id: orgId ?? null,
      event_type: 'comment',
      payload,
    })

    this.notifications.dispatch([
      {
        item_id: itemId,
        space_id: spaceId,
        user_id: userId,
        org_id: orgId ?? null,
        event_type: 'comment',
        payload,
      },
    ])

    const campaignId =
      typeof (space as Record<string, unknown> | null)?.campaign_id === 'string'
        ? String((space as Record<string, unknown>).campaign_id)
        : null

    const plainExtra = safeExtraNotes
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const prompt =
      plainExtra.length > 0 ? plainExtra : 'Please work on this task based on the context provided.'

    await this.fireTaskAgentInvocation({
      item_id: itemId,
      space_id: spaceId,
      agent_key: agentKey,
      user_id: userId,
      org_id: orgId ?? null,
      campaign_id: campaignId,
      prompt,
      include: inc,
      extra_notes: plainExtra || undefined,
      skill_keys: body.skill_keys?.length ? body.skill_keys : undefined,
      conversation_refs: conversationRefs.length > 0 ? conversationRefs : undefined,
    })

    return { activity: activityRow, accepted: true }
  }

  async cancelAgentOnTask(
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

    const internalToken = process.env.INTERNAL_API_TOKEN ?? ''
    if (!internalToken) {
      this.logger.warn('Skipping task agent cancellation — INTERNAL_API_TOKEN not set')
      return { accepted: false, cancelled: false }
    }

    const res = await this.userAgentApi.invoke(
      userId,
      '/api/task-agent/cancel',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': internalToken,
        },
        body: JSON.stringify({
          item_id: itemId,
          space_id: spaceId,
          user_id: userId,
          org_id: orgId ?? null,
        }),
      },
      {
        timeoutMs: 10_000,
        logTag: `task_agent_cancel item=${itemId}`,
      },
    )
    if (!res.ok) {
      this.logger.error(`Task agent cancellation HTTP ${res.status} for item=${itemId}`)
      return { accepted: false, cancelled: false }
    }
    const result = (await res.json().catch(() => ({}))) as {
      accepted?: boolean
      cancelled?: boolean
      activity_id?: string
    }
    return {
      accepted: result.accepted !== false,
      cancelled: result.cancelled === true,
      activity_id: result.activity_id,
    }
  }

  protected async fireTaskAgentInvocation(payload: {
    item_id: string
    space_id: string
    agent_key: string
    user_id: string
    org_id: string | null
    campaign_id: string | null
    prompt: string
    conversation_refs?: Array<{ id: string; label?: string }>
    include?: Record<string, boolean>
    extra_notes?: string
    skill_keys?: string[]
  }): Promise<void> {
    await this.creditsService.assertHasAvailableCredits(payload.user_id, payload.org_id)
    const internalToken = process.env.INTERNAL_API_TOKEN ?? ''
    if (!internalToken) {
      this.logger.warn('Skipping task agent invocation — INTERNAL_API_TOKEN not set')
      return
    }

    void this.userAgentApi
      .invoke(
        payload.user_id,
        '/api/task-agent/invoke',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': internalToken,
          },
          body: JSON.stringify(payload),
        },
        {
          timeoutMs: 600_000,
          logTag: `task_agent agent=${payload.agent_key} item=${payload.item_id}`,
        },
      )
      .then(async (res) => {
        if (!res.ok) {
          this.logger.error(
            `Task agent invocation HTTP ${res.status} for agent=${payload.agent_key} item=${payload.item_id}`,
          )
        }
      })
      .catch((err) => {
        this.logger.error(
          `Task agent invocation failed for agent=${payload.agent_key} item=${payload.item_id}: ${err}`,
        )
      })
  }

  protected isDocItem(customData: unknown): boolean {
    if (!customData || typeof customData !== 'object' || Array.isArray(customData)) return false
    return (customData as Record<string, unknown>)._view_type === 'doc'
  }

  protected spaceItemSourceType(
    customData: unknown,
  ):
    | 'space_doc'
    | 'space_task'
    | 'instagram_research_item'
    | 'tiktok_research_item'
    | 'youtube_research_item'
    | 'twitter_research_item' {
    if (!customData || typeof customData !== 'object' || Array.isArray(customData)) {
      return 'space_task'
    }
    const viewType = (customData as Record<string, unknown>)._view_type
    if (viewType === 'doc') return 'space_doc'
    if (viewType === 'instagram_research') return 'instagram_research_item'
    if (viewType === 'tiktok_research') return 'tiktok_research_item'
    if (viewType === 'youtube_research') return 'youtube_research_item'
    if (viewType === 'twitter_research') return 'twitter_research_item'
    return 'space_task'
  }

  protected spaceViewSourceId(spaceId: string, viewId: string): string {
    return `${spaceId}:${viewId}`
  }

  protected spaceViews(space: Record<string, any> | null | undefined): Array<Record<string, any>> {
    const schema = space?.schema && typeof space.schema === 'object' ? space.schema : null
    return schema && Array.isArray(schema.views) ? schema.views : []
  }

  protected async replaceSpaceViewIndex(
    supabase: SupabaseClient,
    userId: string,
    space: Record<string, any>,
    orgId?: string | null,
  ): Promise<void> {
    for (const view of this.spaceViews(space)) {
      if (!view?.id) continue
      await this.spaceRetrievalIndex.indexSource(supabase, {
        sourceType: 'space_view',
        sourceId: this.spaceViewSourceId(String(space.id), String(view.id)),
        userId,
        orgId,
        spaceId: String(space.id),
        row: {
          id: this.spaceViewSourceId(String(space.id), String(view.id)),
          space_id: space.id,
          campaign_id: space.campaign_id ?? null,
          org_id: space.org_id ?? orgId ?? null,
          title: view.name,
          view,
        },
      })
    }
  }

  protected async reconcileSpaceViewIndex(
    supabase: SupabaseClient,
    userId: string,
    previous: Record<string, any> | null,
    next: Record<string, any>,
    orgId?: string | null,
  ): Promise<void> {
    const nextIds = new Set(this.spaceViews(next).map((view) => String(view.id)))
    for (const view of this.spaceViews(previous)) {
      const viewId = String(view.id ?? '')
      if (viewId && !nextIds.has(viewId)) {
        await this.spaceRetrievalIndex.deleteSource(
          supabase,
          'space_view',
          this.spaceViewSourceId(String(next.id), viewId),
        )
      }
    }
    await this.replaceSpaceViewIndex(supabase, userId, next, orgId)
  }

  protected async validateParentHierarchy(
    supabase: SupabaseClient,
    spaceId: string,
    parentItemId: string,
    itemId: string | null,
    isDocItem: boolean,
  ): Promise<void> {
    if (itemId && parentItemId === itemId) {
      throw new BadRequestException('Item cannot be its own parent')
    }
    const parent = await this.repo.findItemById(supabase, spaceId, parentItemId)
    if (!parent) throw new BadRequestException('Parent item not found')

    const visited = new Set<string>()
    if (itemId) visited.add(itemId)

    let depth = 1
    let cursor = parent
    while (cursor?.parent_item_id) {
      const ancestorId = String(cursor.parent_item_id)
      if (visited.has(ancestorId)) {
        throw new BadRequestException('Invalid parent hierarchy')
      }
      visited.add(ancestorId)
      const ancestor = await this.repo.findItemById(supabase, spaceId, ancestorId)
      if (!ancestor) throw new BadRequestException('Parent item not found')
      cursor = ancestor
      depth += 1
    }

    const childDepth = depth + 1
    const maxDepth = isDocItem ? MAX_DOC_NESTING_LEVEL : MAX_TASK_NESTING_LEVEL
    if (childDepth > maxDepth) {
      if (isDocItem) {
        throw new BadRequestException(
          `Doc pages cannot be nested more than ${MAX_DOC_NESTING_LEVEL} levels deep`,
        )
      }
      throw new BadRequestException('Subtasks cannot be nested more than one level deep')
    }
  }

  async listRecentCompletedAutomationRuns(
    supabase: SupabaseClient,
    query: RecentAutomationRunsQuery,
    workspaceOrgId: string | null,
    userId: string,
  ) {
    const cap = Math.min(Math.max(query.limit ?? 50, 1), 100)
    const feedScope = query.feed_scope ?? 'workspace'

    if (feedScope === 'org' && query.feed_org_id) {
      const isMember = await this.automationRunsRepo.assertActiveOrgMember(
        supabase,
        query.feed_org_id,
        userId,
      )
      if (!isMember) throw new ForbiddenException('Not a member of that organization')
    }

    const list = await this.automationRunsRepo.listRecentCompletedRuns(
      supabase,
      query,
      workspaceOrgId,
      userId,
      cap,
    )

    if (list.length === 0) return []

    const spaceIds = [...new Set(list.map((r) => r.space_id))]
    const automationIds = [
      ...new Set(list.map((r) => r.automation_id).filter((id): id is string => Boolean(id))),
    ]

    const [titleBySpace, nameByAutomation] = await Promise.all([
      this.automationRunsRepo.listSpaceTitles(supabase, spaceIds),
      this.automationRunsRepo.listAutomationNames(supabase, automationIds),
    ])

    return list.map((r) => ({
      id: r.id,
      space_id: r.space_id,
      item_id: r.item_id,
      automation_id: r.automation_id,
      status: r.status,
      created_at: r.created_at,
      automation_name: r.automation_id ? (nameByAutomation.get(r.automation_id) ?? null) : null,
      space_title: titleBySpace.get(r.space_id) ?? null,
    }))
  }
}
