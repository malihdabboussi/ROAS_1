import { SpacesServiceBase06 } from './spaces-service-06.base'
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
import { applySpeakerRemapToMeetingItem } from './fathom-speaker-remap'
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

export abstract class SpacesServiceBase07 extends SpacesServiceBase06 {

  async listUserState(supabase: SupabaseClient, userId: string) {
    return this.userStateRepo.listUserState(supabase, userId)
  }

  async upsertUserState(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    patch: { is_favorite?: boolean; is_hidden?: boolean },
  ) {
    return this.userStateRepo.upsertUserState(supabase, userId, spaceId, patch)
  }

  /**
   * Bind a junk diarization label (Speaker N) to a portal/calendar person and
   * refresh Attendees multi_select on the meeting item.
   */
  async remapMeetingSpeaker(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    itemId: string,
    body: {
      speaker_key: string
      label: string
      email?: string | null
      contact_id?: string | null
    },
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

    try {
      return await applySpeakerRemapToMeetingItem({
        supabase,
        repo: {
          findSpaceById: (sb, uid, sid, oid) => this.repo.findSpaceById(sb, uid, sid, oid),
          updateSpace: (sb, uid, sid, patch, oid) => this.repo.updateSpace(sb, uid, sid, patch, oid),
          updateItem: (sb, uid, sid, iid, patch, oid) =>
            this.repo.updateItem(sb, uid, sid, iid, patch as never, oid),
        },
        userId,
        orgId: orgId ?? null,
        spaceId,
        itemId,
        item,
        speakerKey: body.speaker_key,
        binding: {
          label: body.label,
          email: body.email ?? null,
          contact_id: body.contact_id ?? null,
        },
      })
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error))
    }
  }
}
