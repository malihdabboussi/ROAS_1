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
import { SpacesServiceBase04 } from './spaces-service-04.base'

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

export abstract class SpacesServiceBase05 extends SpacesServiceBase04 {
  async visualizeDocItem(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    itemId: string,
    body: VisualizeDocBody,
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
    const customData =
      item.custom_data && typeof item.custom_data === 'object' && !Array.isArray(item.custom_data)
        ? (item.custom_data as Record<string, unknown>)
        : {}
    if (customData._view_type !== 'doc') {
      throw new BadRequestException('Space item is not a doc')
    }

    const pendingCustomData = {
      ...customData,
      _doc_visual_status: 'generating',
      _doc_visual_last_error: null,
    }
    await this.repo.updateItemBySpaceId(supabase, spaceId, itemId, {
      custom_data: pendingCustomData,
      updated_at: new Date().toISOString(),
    })

    const space = await this.repo.findSpaceById(supabase, userId, spaceId, orgId)
    const campaignId =
      typeof (space as Record<string, unknown> | null)?.campaign_id === 'string'
        ? String((space as Record<string, unknown>).campaign_id)
        : null
    const gatewayAgentId = orgId ? `org-${orgId}-vibey` : 'vibey'
    const sessionKey = [
      `agent:${gatewayAgentId}:${gatewayAgentId}-${userId}-${itemId}`,
      campaignId ? `campaign:${campaignId}` : null,
      `space:${spaceId}`,
      orgId ? `org:${orgId}` : null,
    ]
      .filter(Boolean)
      .join('::')

    try {
      const response = await this.userAgentApi.invoke(
        userId,
        '/api/artifacts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-openclaw-internal': 'true',
            'x-session-key': sessionKey,
          },
          body: JSON.stringify({
            action: 'generate_visual_html',
            data: {
              item_id: itemId,
              space_id: spaceId,
              ...(body.style_hint ? { style_hint: body.style_hint } : {}),
              ...(body.prompt ? { prompt: body.prompt } : {}),
              ...(body.force !== undefined ? { force: body.force } : {}),
            },
          }),
        },
        {
          timeoutMs: 600_000,
          logTag: `visual_doc item=${itemId}`,
        },
      )
      const result = (await response.json().catch(() => null)) as Record<string, unknown> | null
      if (!response.ok) {
        throw new Error(String(result?.message ?? result?.error ?? 'Visual doc generation failed'))
      }
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Visual doc generation failed'
      await this.repo.updateItemBySpaceId(supabase, spaceId, itemId, {
        custom_data: {
          ...pendingCustomData,
          _doc_visual_status: 'error',
          _doc_visual_last_error: message,
        },
        updated_at: new Date().toISOString(),
      })
      throw new BadRequestException(message)
    }
  }

  protected composeMissionDescription(
    item: Record<string, unknown>,
    space: Record<string, unknown> | null,
    include: Record<string, boolean>,
    extraNotes?: string,
  ): string {
    const lines: string[] = []

    if (include.status && item.status) {
      lines.push(`Status: ${item.status}`)
    }
    if (include.priority && item.priority) {
      lines.push(`Priority: ${item.priority}`)
    }
    if (include.due_date) {
      if (item.start_date) lines.push(`Start date: ${item.start_date}`)
      if (item.due_date) lines.push(`Due date: ${item.due_date}`)
    }
    if (include.tags) {
      const labels = this.resolveTagLabels(item, space)
      if (labels.length > 0) lines.push(`Tags: ${labels.join(', ')}`)
    }
    if (include.notes) {
      const longText = (item.description as string | null) || this.itemBodyText(item)
      if (longText) lines.push(`\nDescription:\n${longText}`)
    }
    if (include.custom_fields) {
      const custom = (item.custom_data ?? {}) as Record<string, unknown>
      const schema = (space as Record<string, unknown> | null)?.schema as
        | { fields?: { id: string; name: string; type: string }[] }
        | undefined
      const fieldDefs = schema?.fields ?? []
      for (const [key, val] of Object.entries(custom)) {
        if (key === 'tags') continue
        if (val == null || val === '') continue
        const def = fieldDefs.find((f) => f.id === key)
        const label = def?.name ?? key
        lines.push(`${label}: ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`)
      }
    }

    if (extraNotes) {
      lines.push(`\nAdditional instructions:\n${extraNotes}`)
    }

    return lines.join('\n')
  }

  protected resolveTagLabels(
    item: Record<string, unknown>,
    space: Record<string, unknown> | null,
  ): string[] {
    const custom = (item.custom_data ?? {}) as Record<string, unknown>
    const tagIds = Array.isArray(custom.tags) ? (custom.tags as string[]) : []
    if (tagIds.length === 0) return []

    const schema = (space as Record<string, unknown> | null)?.schema as
      | { fields?: { id: string; options?: { id: string; label: string }[] }[] }
      | undefined
    const tagsField = schema?.fields?.find((f) => f.id === 'tags')
    const options = tagsField?.options ?? []
    return tagIds.map((id) => options.find((o) => o.id === id)?.label ?? id).filter(Boolean)
  }

  protected itemBodyText(item: Record<string, unknown>): string | null {
    const custom = (item.custom_data ?? {}) as Record<string, unknown>
    const isDoc = custom._view_type === 'doc'
    const value = isDoc ? item.doc_body : item.notes
    return typeof value === 'string' && value.length > 0 ? value : null
  }

  protected async resolveCommentLinkPreviews(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    safeMessage: string,
    mentions?:
      | {
          type: string
          entity_id?: string
          label?: string
        }[]
      | undefined,
  ) {
    const urls = extractUrlsFromHtml(safeMessage, 5)
    let urlPreviews: Awaited<ReturnType<LinkPreviewService['resolveMany']>> = []
    if (urls.length > 0) {
      try {
        urlPreviews = await this.linkPreview.resolveMany(urls, {
          supabase,
          userId,
          orgId,
        })
      } catch (err) {
        this.logger.warn(`Link preview enrichment failed: ${err}`)
      }
    }

    let docPreviews: Awaited<ReturnType<typeof resolveDocMentionLinkPreviews>> = []
    try {
      docPreviews = await resolveDocMentionLinkPreviews(
        this.repo,
        supabase,
        this.linkPreview,
        { userId, orgId },
        mentions,
        safeMessage,
      )
    } catch (err) {
      this.logger.warn(`Doc mention preview enrichment failed: ${err}`)
    }

    return [...urlPreviews, ...docPreviews]
  }

  async listActivity(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    itemId: string,
    orgId?: string | null,
  ) {
    const item = await this.repo.findItemById(supabase, spaceId, itemId)
    if (!item) throw new BadRequestException('Space item not found')
    return this.repo.findActivityByItemId(supabase, spaceId, itemId)
  }

  async addComment(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    itemId: string,
    dto: {
      message: string
      attachments?: { filename: string; mimeType: string; sizeBytes?: number; fileUrl: string }[]
      mentions?: {
        type:
          | 'user'
          | 'agent'
          | 'task'
          | 'doc'
          | 'channel'
          | 'space'
          | 'mission'
          | 'person'
          | 'conversation'
        user_id?: string
        agent_key?: string
        entity_id?: string
        label?: string
      }[]
      skill_keys?: string[]
    },
    orgId?: string | null,
    orgRole?: import('@vibey/api-shared').OrgRole | null,
  ) {
    // Posting a comment on a task requires edit; viewers can only read activity.
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

    const safeMessage = sanitizeCommentHtml(dto.message)
    const payload: Record<string, unknown> = { message: safeMessage }
    if (dto.attachments?.length) payload.attachments = dto.attachments
    if (dto.mentions?.length) payload.mentions = dto.mentions
    if (dto.skill_keys?.length) payload.skill_keys = dto.skill_keys

    const previews = await this.resolveCommentLinkPreviews(
      supabase,
      userId,
      orgId ?? null,
      safeMessage,
      dto.mentions,
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
    await this.spaceRetrievalIndex.indexSource(supabase, {
      sourceType: 'space_activity',
      sourceId: activityRow.id,
      userId,
      orgId,
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

    const agentMentions = (dto.mentions ?? []).filter((m) => m.type === 'agent' && m.agent_key)
    const conversationRefs = (dto.mentions ?? [])
      .filter((m) => m.type === 'conversation' && m.entity_id)
      .map((m) => ({
        id: m.entity_id!,
        label: m.label?.trim() || 'Conversation',
      }))
    const space =
      agentMentions.length > 0
        ? await this.repo.findSpaceById(supabase, userId, spaceId, orgId)
        : null
    const campaignId =
      typeof (space as Record<string, unknown> | null)?.campaign_id === 'string'
        ? String((space as Record<string, unknown>).campaign_id)
        : null
    for (const mention of agentMentions) {
      const plainText = safeMessage.replace(/<[^>]+>/g, '').trim()
      await this.fireTaskAgentInvocation({
        item_id: itemId,
        space_id: spaceId,
        agent_key: mention.agent_key!,
        user_id: userId,
        org_id: orgId ?? null,
        campaign_id: campaignId,
        prompt: plainText,
        skill_keys: dto.skill_keys?.length ? dto.skill_keys : undefined,
        conversation_refs: conversationRefs.length > 0 ? conversationRefs : undefined,
      })
    }

    return activityRow
  }

  async updateComment(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    itemId: string,
    activityId: string,
    dto: { message?: string; attachment_rename?: { file_url: string; filename: string } },
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
      throw new ForbiddenException('You can only edit your own comments.')
    }
    if (activity.event_type !== 'comment' && activity.event_type !== 'user.comment') {
      throw new BadRequestException('Only comments can be edited.')
    }

    const existingPayload =
      activity.payload && typeof activity.payload === 'object' && !Array.isArray(activity.payload)
        ? (activity.payload as Record<string, unknown>)
        : {}

    const payload: Record<string, unknown> = { ...existingPayload }

    if (dto.attachment_rename) {
      const { file_url, filename } = dto.attachment_rename
      const attachments = Array.isArray(payload.attachments)
        ? (payload.attachments as Array<Record<string, unknown>>)
        : []
      const target = attachments.find((a) => a?.fileUrl === file_url)
      if (!target) throw new BadRequestException('Attachment not found in this comment')
      payload.attachments = attachments.map((a) =>
        a?.fileUrl === file_url ? { ...a, filename } : a,
      )
    }

    if (dto.message !== undefined) {
      const safeMessage = sanitizeCommentHtml(dto.message)
      payload.message = safeMessage
      delete payload.mentions

      const urls = extractUrlsFromHtml(safeMessage, 5)
      if (urls.length > 0) {
        try {
          const previews = await this.linkPreview.resolveMany(urls, {
            supabase,
            userId,
            orgId: orgId ?? null,
          })
          if (previews.length > 0) payload.previews = previews
          else delete payload.previews
        } catch (err) {
          this.logger.warn(`Link preview enrichment failed: ${err}`)
        }
      } else {
        delete payload.previews
      }
    }

    const updated = await this.repo.updateActivity(supabase, activityId, { payload })
    await this.spaceRetrievalIndex.indexSource(supabase, {
      sourceType: 'space_activity',
      sourceId: activityId,
      userId,
      orgId,
    })
    return updated
  }
}
