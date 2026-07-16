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
import { isFlowsConceptSpaceSchema } from '../constants/flows-concept-space.constants'
import { resolveDocMentionLinkPreviews } from '../lib/resolve-doc-mention-previews'
import { sanitizeCommentHtml } from '../lib/sanitize-comment'
import { syncDocEditToConversationDocument } from '../lib/sync-doc-conversation-copy'
import { SpaceAutomationRunsRepository } from '../repositories/space-automation-runs.repository'
import { SpacesGeneralCampaignRepository } from '../repositories/spaces-general-campaign.repository'
import { SpacesRepository } from '../repositories/spaces.repository'
import { SpacesUserStateRepository } from '../repositories/spaces-user-state.repository'
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

export abstract class SpacesServiceBase01 {
  // Abstract declarations for methods implemented by later base classes.
  abstract createItem(...args: any[]): any;
  protected abstract buildDuplicateItemPayload(...args: any[]): any;
  protected abstract insertDuplicatedItem(...args: any[]): any;
  abstract duplicateItem(...args: any[]): any;
  abstract updateItem(...args: any[]): any;
  protected abstract fireUpdateItemAutomations(...args: any[]): any;
  abstract updateItemsBatch(...args: any[]): any;
  abstract deleteItem(...args: any[]): any;
  abstract transferItemToSpace(...args: any[]): any;
  protected abstract collectDescendantIds(...args: any[]): any;
  protected abstract buildItemCopyPayload(...args: any[]): any;
  abstract listSubtasks(...args: any[]): any;
  abstract acceptSuggestion(...args: any[]): any;
  abstract dismissSuggestion(...args: any[]): any;
  abstract enforceSuggestionRateLimit(...args: any[]): any;
  protected abstract fireAutomation(...args: any[]): any;
  protected abstract normalizeAssignees(...args: any[]): any;
  protected abstract itemAssignees(...args: any[]): any;
  protected abstract assigneesEqual(...args: any[]): any;
  protected abstract assigneeDiff(...args: any[]): any;
  protected abstract logActivities(...args: any[]): any;
  abstract pushToAgent(...args: any[]): any;
  abstract visualizeDocItem(...args: any[]): any;
  protected abstract composeMissionDescription(...args: any[]): any;
  protected abstract resolveTagLabels(...args: any[]): any;
  protected abstract itemBodyText(...args: any[]): any;
  protected abstract resolveCommentLinkPreviews(...args: any[]): any;
  abstract listActivity(...args: any[]): any;
  abstract addComment(...args: any[]): any;
  abstract updateComment(...args: any[]): any;
  abstract deleteComment(...args: any[]): any;
  abstract invokeAgentOnTask(...args: any[]): any;
  abstract cancelAgentOnTask(...args: any[]): any;
  protected abstract fireTaskAgentInvocation(...args: any[]): any;
  protected abstract isDocItem(...args: any[]): any;
  protected abstract spaceItemSourceType(...args: any[]): any;
  protected abstract spaceViewSourceId(...args: any[]): any;
  protected abstract spaceViews(...args: any[]): any;
  protected abstract replaceSpaceViewIndex(...args: any[]): any;
  protected abstract reconcileSpaceViewIndex(...args: any[]): any;
  protected abstract validateParentHierarchy(...args: any[]): any;
  abstract listRecentCompletedAutomationRuns(...args: any[]): any;
  abstract listUserState(...args: any[]): any;
  abstract upsertUserState(...args: any[]): any;
  // End generated abstract declarations.




  protected readonly logger = new Logger('SpacesService')
  protected readonly generalCampaignRepo: SpacesGeneralCampaignRepository
  protected readonly automationRunsRepo: SpaceAutomationRunsRepository
  protected readonly userStateRepo: SpacesUserStateRepository

  constructor(
    protected readonly repo: SpacesRepository,
    protected readonly permissionsService: SpacePermissionsService,
    protected readonly automationService: SpaceAutomationService | null,
    protected readonly userAgentApi: UserAgentApiService,
    protected readonly linkPreview: LinkPreviewService,
    protected readonly creditsService: CreditsService,
    protected readonly notifications: SpaceNotificationsService,
    protected readonly spaceRetrievalIndex: SpaceRetrievalIndexService,
    generalCampaignRepo?: SpacesGeneralCampaignRepository,
    automationRunsRepo?: SpaceAutomationRunsRepository,
    userStateRepo?: SpacesUserStateRepository,
  ) {
    this.generalCampaignRepo = generalCampaignRepo ?? new SpacesGeneralCampaignRepository()
    this.automationRunsRepo = automationRunsRepo ?? new SpaceAutomationRunsRepository()
    this.userStateRepo = userStateRepo ?? new SpacesUserStateRepository()
  }

  async list(supabase: SupabaseClient, userId: string, query: SpaceQuery, orgId?: string | null) {
    return this.repo.findAllSpaces(supabase, userId, query, orgId)
  }

  async listPage(
    supabase: SupabaseClient,
    userId: string,
    query: SpaceQuery,
    orgId?: string | null,
  ) {
    return this.repo.findSpacesPage(supabase, userId, query, orgId)
  }

  async ensureDefault(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    const existing = await this.repo.findAllSpaces(
      supabase,
      userId,
      { limit: 1, paginated: false },
      orgId,
    )
    if (existing[0]) return existing[0]
    return this.repo.createSpace(
      supabase,
      userId,
      {
        title: 'My Tasks',
        visibility: 'private',
        schema: DEFAULT_SPACE_SCHEMA as unknown as CreateSpaceDto['schema'],
      },
      orgId,
    )
  }

  async ensureGeneral(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    const generalCampaignId = await this.findOrCreateGeneralCampaignId(supabase, userId, orgId)

    const existing = await this.repo.findSpacesByCampaignForOwner(
      supabase,
      userId,
      generalCampaignId,
      orgId,
    )
    // Flow concepts is a Flows sandbox only — never treat it as the personal default.
    const preferred = existing.find((space) => !isFlowsConceptSpaceSchema(space.schema))
    if (preferred) return preferred

    return this.repo.createSpace(
      supabase,
      userId,
      {
        title: 'New Workspace',
        visibility: 'private',
        campaign_id: generalCampaignId,
        schema: {
          ...DEFAULT_SPACE_SCHEMA,
          views: [
            ...DEFAULT_SPACE_SCHEMA.views,
            {
              id: 'docs',
              type: 'docs',
              name: 'Docs',
              group_by: 'category',
              docs_config: { pinned_item_ids: [], display_mode: 'grid' },
              visible_fields: ['title', 'category'],
            },
          ],
        } as unknown as CreateSpaceDto['schema'],
      },
      orgId,
    )
  }

  protected async findOrCreateGeneralCampaignId(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<string> {
    return this.generalCampaignRepo.findOrCreateGeneralCampaignId(supabase, userId, orgId)
  }

  protected filterSpaceViews(space: Record<string, any>, allowedViewIds: string[] | null) {
    if (allowedViewIds === null) return space
    const allowed = new Set(allowedViewIds)
    const schema = space.schema && typeof space.schema === 'object' ? space.schema : {}
    const views = Array.isArray(schema.views)
      ? schema.views.filter((view: any) => allowed.has(view.id))
      : []
    return { ...space, schema: { ...schema, views } }
  }

  async getById(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    orgId?: string | null,
    orgRole?: import('@vibey/api-shared').OrgRole | null,
  ) {
    const space = await this.repo.findSpaceByIdForAccess(supabase, spaceId)
    if (!space) throw new BadRequestException('Space not found')
    const scope = await this.permissionsService.resolveSpaceAccessScope(
      supabase,
      userId,
      orgRole,
      spaceId,
      orgId,
      space.schema,
    )
    // FE permission hook reads `effective_level` and `can_delete_space`
    // (org admin/owner only) instead of duplicating the matrix.
    const canDeleteSpace = orgId ? orgRole === 'admin' || orgRole === 'owner' : true
    return {
      ...this.filterSpaceViews(space, scope.allowed_view_ids),
      share_meta: scope.allowed_view_ids === null ? undefined : scope,
      effective_level: scope.level,
      can_delete_space: canDeleteSpace,
    }
  }

  async listSharedWithMe(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    return this.repo.findSharedWithMe(supabase, userId, orgId)
  }

  async create(
    supabase: SupabaseClient,
    userId: string,
    dto: CreateSpaceDto,
    orgId?: string | null,
  ) {
    const { default_share_level, ...rest } = dto
    const createDto: Omit<CreateSpaceDto, 'default_share_level'> = { ...rest }
    if (
      createDto.schema != null &&
      typeof createDto.schema === 'object' &&
      !Array.isArray(createDto.schema)
    ) {
      delete (createDto.schema as Record<string, unknown>).automations
      createDto.schema = {
        ...DEFAULT_SPACE_SCHEMA,
        ...(createDto.schema as Record<string, unknown>),
      } as CreateSpaceDto['schema']
    }
    const space = await this.repo.createSpace(supabase, userId, createDto, orgId)
    if (
      default_share_level &&
      default_share_level !== 'view' &&
      dto.visibility === 'team' &&
      orgId
    ) {
      await this.permissionsService.upsertSpaceShare(
        supabase,
        userId,
        space.id,
        {
          entity_type: 'org',
          entity_id: orgId,
          level: default_share_level,
        },
        orgId,
      )
    }
    await this.spaceRetrievalIndex.indexSource(supabase, {
      sourceType: 'space',
      sourceId: space.id,
      userId,
      orgId,
    })
    await this.replaceSpaceViewIndex(supabase, userId, space, orgId)
    return space
  }

  async ensureView(
    supabase: SupabaseClient,
    userId: string,
    dto: EnsureSpaceViewDto,
    orgId?: string | null,
    orgRole?: import('@vibey/api-shared').OrgRole | null,
  ) {
    const candidates = await this.repo.findSpacesByCampaignForOwner(
      supabase,
      userId,
      dto.campaign_id,
      orgId,
    )
    const sortByViewCount = (a: any, b: any) => {
      const aViews = Array.isArray(a?.schema?.views) ? a.schema.views.length : 0
      const bViews = Array.isArray(b?.schema?.views) ? b.schema.views.length : 0
      return bViews - aViews
    }
    let created = false
    let space = candidates.slice().sort(sortByViewCount)[0] ?? null
    if (!space) {
      space = await this.repo.createSpace(
        supabase,
        userId,
        {
          title: dto.campaign_id ? 'Campaign Space' : 'My space',
          visibility: 'private',
          campaign_id: dto.campaign_id ?? undefined,
          schema: DEFAULT_SPACE_SCHEMA as unknown as CreateSpaceDto['schema'],
        },
        orgId,
      )
      created = true
    }

    const schema =
      space.schema && typeof space.schema === 'object'
        ? (space.schema as Record<string, any>)
        : (DEFAULT_SPACE_SCHEMA as Record<string, any>)
    const views = Array.isArray(schema.views) ? schema.views : []
    const existing = views.find((view: any) => view?.type === dto.view_type)
    if (existing?.id) {
      return { space, view_id: existing.id, created, schema_updated: false }
    }

    // Adding a view to an existing space mutates schema → require admin level.
    await this.permissionsService.assertCanAccessSpace(
      supabase,
      userId,
      orgRole,
      space.id,
      'admin',
      orgId,
    )
    const view = buildArtifactViewDef(dto.view_type, {
      viewName: dto.view_name,
      pinnedToStart: dto.pinned_to_start,
    })
    const nextSchema = { ...schema, views: [...views, view] }
    const updated = await this.repo.updateSpace(
      supabase,
      userId,
      space.id,
      { schema: nextSchema },
      orgId,
    )
    await this.spaceRetrievalIndex.indexSource(supabase, {
      sourceType: 'space_view',
      sourceId: this.spaceViewSourceId(space.id, view.id),
      userId,
      orgId,
      spaceId: space.id,
      row: {
        id: this.spaceViewSourceId(space.id, view.id),
        space_id: space.id,
        campaign_id: updated.campaign_id ?? space.campaign_id ?? null,
        org_id: updated.org_id ?? orgId ?? null,
        title: view.name,
        view,
      },
    })
    return { space: updated, view_id: view.id, created, schema_updated: true }
  }

  async update(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    dto: UpdateSpaceDto,
    orgId?: string | null,
    orgRole?: import('@vibey/api-shared').OrgRole | null,
  ) {
    await this.permissionsService.assertCanAccessSpace(
      supabase,
      userId,
      orgRole,
      spaceId,
      'admin',
      orgId,
    )
    if (
      dto.schema !== undefined &&
      dto.schema &&
      typeof dto.schema === 'object' &&
      !Array.isArray(dto.schema)
    ) {
      delete (dto.schema as Record<string, unknown>).automations
    }
    const previous =
      dto.schema !== undefined
        ? await this.repo.findSpaceById(supabase, userId, spaceId, orgId)
        : null
    const updated = await this.repo.updateSpace(supabase, userId, spaceId, dto, orgId)
    await this.spaceRetrievalIndex.indexSource(supabase, {
      sourceType: 'space',
      sourceId: spaceId,
      userId,
      orgId,
    })
    if (dto.schema !== undefined) {
      await this.reconcileSpaceViewIndex(supabase, userId, previous, updated, orgId)
    }
    return updated
  }

  async delete(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    orgId?: string | null,
    orgRole?: import('@vibey/api-shared').OrgRole | null,
  ) {
    // Stricter than space-level admin: deleting an entire space requires org
    // admin/owner role (or being the personal-context space owner).
    if (orgId) {
      if (orgRole !== 'admin' && orgRole !== 'owner') {
        throw new ForbiddenException(
          'Only org admins or owners can delete a space. Ask an admin to remove it for you.',
        )
      }
    }
    const deleted = await this.repo.deleteSpace(supabase, userId, spaceId, orgId)
    await this.spaceRetrievalIndex.deleteSource(supabase, 'space', spaceId)
    return deleted
  }

  async listItems(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    query: SpaceItemQuery,
    orgId?: string | null,
    orgRole?: import('@vibey/api-shared').OrgRole | null,
  ) {
    await this.permissionsService.assertCanAccessSpace(
      supabase,
      userId,
      orgRole,
      spaceId,
      'view',
      orgId,
    )
    return this.repo.findItemsBySpaceIdForAccess(supabase, spaceId, query)
  }

  async getItem(
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
      'view',
      orgId,
    )
    const item = await this.repo.findItemById(supabase, spaceId, itemId)
    if (!item) throw new BadRequestException('Space item not found')
    return item
  }

  async getItemById(
    supabase: SupabaseClient,
    userId: string,
    itemId: string,
    orgId?: string | null,
    orgRole?: import('@vibey/api-shared').OrgRole | null,
  ) {
    const item = await this.repo.findAccessibleItemById(supabase, userId, orgId, itemId)
    if (!item) throw new BadRequestException('Space item not found')
    await this.permissionsService.assertCanAccessItem(
      supabase,
      userId,
      orgRole,
      String(item.space_id),
      itemId,
      'view',
      orgId,
    )
    return item
  }
}
