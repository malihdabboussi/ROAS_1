import { TransferServiceBase02 } from './transfer-service-02.base'
import { BadRequestException, ForbiddenException } from '@nestjs/common'
import {
  MOVABLE_ARTIFACT_TABLES,
  type MovableArtifactTable,
  type TransferContext,
  type TransferExecuteResult,
  type TransferMode,
  type TransferPreviewResult,
} from '../transfer.types'

export abstract class TransferServiceBase03 extends TransferServiceBase02 {

  protected async copySpaceItems(
    sourceSpaceId: string,
    targetSpaceId: string,
    targetOrgId: string | null,
    userId: string,
  ): Promise<Map<string, string>> {
    const { data: items, error } = await this.transferSpaceRepository.listSpaceItems(
      this.supabase,
      sourceSpaceId,
    )
    if (error) throw new BadRequestException(`Failed to load space items: ${error.message}`)

    const remap = new Map<string, string>()
    for (const item of items ?? []) {
      const {
        id: oldId,
        created_at: _ca,
        updated_at: _ua,
        share_token: _shareToken,
        parent_item_id: _parent,
        recurrence_parent_id: _recurrenceParent,
        ...rest
      } = item as any
      const { data: inserted, error: insertErr } =
        await this.transferSpaceRepository.insertCopiedSpaceItem(this.supabase, {
          ...rest,
          space_id: targetSpaceId,
          org_id: targetOrgId,
          user_id: userId,
          parent_item_id: null,
          recurrence_parent_id: null,
          share_link_enabled: false,
          share_token: null,
        })
      if (insertErr || !inserted) {
        throw new BadRequestException(`Failed to copy space item: ${insertErr?.message}`)
      }
      remap.set(String(oldId), String(inserted.id))
    }

    for (const item of items ?? []) {
      const newId = remap.get(String((item as any).id))
      if (!newId) continue
      const update: Record<string, string> = {}
      const parentId = (item as any).parent_item_id
      const recurrenceParentId = (item as any).recurrence_parent_id
      if (parentId && remap.has(String(parentId))) {
        update.parent_item_id = remap.get(String(parentId))!
      }
      if (recurrenceParentId && remap.has(String(recurrenceParentId))) {
        update.recurrence_parent_id = remap.get(String(recurrenceParentId))!
      }
      if (Object.keys(update).length > 0) {
        const { error: updateErr } = await this.transferSpaceRepository.updateSpaceItem(
          this.supabase,
          newId,
          update,
        )
        if (updateErr) {
          throw new BadRequestException(
            `Failed to restore copied item hierarchy: ${updateErr.message}`,
          )
        }
      }
    }

    return remap
  }

  protected async copySelectedSpaceItems(
    itemIds: string[],
    targetSpaceId: string,
    targetOrgId: string | null,
    userId: string,
  ): Promise<Map<string, string>> {
    const { data: items, error } = await this.transferSpaceRepository.listSelectedSpaceItems(
      this.supabase,
      itemIds,
    )
    if (error) throw new BadRequestException(`Failed to load view items: ${error.message}`)

    const remap = new Map<string, string>()
    for (const item of items ?? []) {
      const {
        id: oldId,
        created_at: _ca,
        updated_at: _ua,
        share_token: _shareToken,
        parent_item_id: _parent,
        recurrence_parent_id: _recurrenceParent,
        ...rest
      } = item as any
      const { data: inserted, error: insertErr } =
        await this.transferSpaceRepository.insertCopiedSpaceItem(this.supabase, {
          ...rest,
          space_id: targetSpaceId,
          org_id: targetOrgId,
          user_id: userId,
          parent_item_id: null,
          recurrence_parent_id: null,
          share_link_enabled: false,
          share_token: null,
        })
      if (insertErr || !inserted) {
        throw new BadRequestException(`Failed to copy view item: ${insertErr?.message}`)
      }
      remap.set(String(oldId), String(inserted.id))
    }
    return remap
  }

  protected parseViewEntityId(entityId: string): { spaceId: string; viewId: string } {
    const [spaceId, ...viewParts] = entityId.split(':')
    const viewId = viewParts.join(':')
    if (!spaceId || !viewId)
      throw new BadRequestException('View transfer id must be <spaceId>:<viewId>')
    return { spaceId, viewId }
  }

  protected resolveView(space: any, viewId: string): any {
    const views = Array.isArray(space.schema?.views) ? space.schema.views : []
    const view = views.find((candidate: any) => candidate.id === viewId)
    if (!view) throw new BadRequestException('View not found')
    return view
  }

  protected async createSpaceForView(
    sourceSpace: any,
    view: any,
    userId: string,
    targetOrgId: string | null,
    targetCampaignId?: string,
  ): Promise<any> {
    const sourceSchema = sourceSpace.schema ?? {
      version: 1,
      fields: [],
      views: [],
    }
    const { data, error } = await this.transferSpaceRepository.createSpaceForView(
      this.supabase,
      {
        org_id: targetOrgId,
        user_id: userId,
        title: view.name || `${sourceSpace.title} view`,
        description: sourceSpace.description ?? null,
        campaign_id: targetCampaignId ?? null,
        is_template: false,
        visibility: 'private',
        schema: {
          ...sourceSchema,
          views: [{ ...view, pinned_to_start: false }],
        },
      },
    )
    if (error || !data)
      throw new BadRequestException(`Failed to create target space: ${error?.message}`)
    return data
  }

  protected async removeViewFromSpace(space: any, viewId: string) {
    const schema = space.schema ?? { version: 1, fields: [], views: [] }
    const views = Array.isArray(schema.views) ? schema.views : []
    if (views.length <= 1) {
      throw new BadRequestException('Cannot move the last view out of a space')
    }
    const nextSchema = { ...schema, views: views.filter((view: any) => view.id !== viewId) }
    const { error } = await this.transferViewRepository.updateSpaceSchema(
      this.supabase,
      space.id,
      nextSchema,
    )
    if (error) throw new BadRequestException(`Failed to remove source view: ${error.message}`)
  }

  protected async resolveViewTransferSet(
    space: any,
    view: any,
  ): Promise<{
    kind: 'space_items' | 'artifact'
    table: string
    ids: string[]
    warnings: string[]
  }> {
    const taskViewTypes = new Set([
      'list',
      'table',
      'kanban',
      'gallery',
      'missions',
      'docs',
      'contacts',
      'instagram_research',
      'tiktok_research',
      'youtube_research',
      'twitter_research',
    ])
    if (taskViewTypes.has(view.type)) {
      return this.resolveSpaceItemViewTransferSet(space, view)
    }

    const tableByViewType: Record<string, string> = {
      funnels: 'funnels',
      websites: 'funnels',
      offers: 'offers',
      ads: 'ads',
      ad_campaigns: 'ad_campaigns',
      sequences: 'sequences',
      presentations: 'presentations',
      avatars: 'avatars',
      social_posts: 'social_posts',
    }
    const table = tableByViewType[view.type]
    if (!table) {
      throw new BadRequestException(`Cannot transfer view type: ${String(view.type)}`)
    }
    if (!space.campaign_id) {
      throw new BadRequestException('Artifact views require a campaign-backed source space')
    }
    const ids = await this.resolveArtifactViewIds(table, String(space.campaign_id), view)
    return { kind: 'artifact', table, ids, warnings: [] }
  }

  protected async resolveSpaceItemViewTransferSet(
    space: any,
    view: any,
  ): Promise<{ kind: 'space_items'; table: string; ids: string[]; warnings: string[] }> {
    const { data, error } = await this.transferRepository.listSpaceItemsForView(
      this.supabase,
      space.id,
      view.type,
    )
    if (error) throw new BadRequestException(`Failed to resolve view items: ${error.message}`)

    const fields = Array.isArray(space.schema?.fields) ? space.schema.fields : []
    const statusField = fields.find((field: any) => field.id === 'status')
    const ids = (data ?? [])
      .filter(
        (item: any) =>
          view.show_closed_tasks === true || !this.isClosedSpaceItem(item, statusField),
      )
      .map((item: any) => String(item.id))
    return { kind: 'space_items', table: 'space_items', ids, warnings: [] }
  }

  protected isClosedSpaceItem(item: any, statusField: any): boolean {
    const opt = statusField?.options?.find((candidate: any) => candidate.id === item.status)
    const group = opt?.group
    if (group === 'done' || group === 'closed') return true
    return item.status === 'done' || item.status === 'archived'
  }

  protected async resolveArtifactViewIds(
    table: string,
    campaignId: string,
    view: any,
  ): Promise<string[]> {
    const { data, error } = await this.transferRepository.listArtifactRowsForView(
      this.supabase,
      table,
      campaignId,
      view.type,
    )
    if (error)
      throw new BadRequestException(`Failed to resolve artifact view rows: ${error.message}`)
    return (data ?? [])
      .filter((row: any) => this.artifactRowMatchesView(row, view))
      .map((row: any) => String(row.id))
  }

  protected artifactRowMatchesView(row: any, view: any): boolean {
    const config = this.artifactConfigForView(view)
    if (!config) return true
    if (config.search_query) {
      const q = String(config.search_query).trim().toLowerCase()
      const haystack = JSON.stringify(row).toLowerCase()
      if (q && !haystack.includes(q)) return false
    }
    const filterMap: Record<string, string> = {
      status_filters: 'status',
      processing_status_filters: 'processing_status',
      funnel_type_filters: 'funnel_type',
      platform_filters: 'platform',
      placement_filters: 'placement',
      source_filters: 'source',
      objective_filters: 'objective',
      trigger_filters: 'trigger',
      avatar_type_filters: 'avatar_type',
      offer_id_filters: 'offer_id',
      post_type_filters: 'post_type',
      ad_set_id_filters: 'ad_set_id',
    }
    for (const [filterKey, rowKey] of Object.entries(filterMap)) {
      const values = config[filterKey]
      if (Array.isArray(values) && values.length > 0 && !values.includes(row[rowKey])) return false
    }
    return true
  }

  protected artifactConfigForView(view: any): any {
    const keyByType: Record<string, string> = {
      funnels: 'funnels_config',
      websites: 'websites_config',
      offers: 'offers_config',
      ads: 'ads_config',
      ad_campaigns: 'ad_campaigns_config',
      sequences: 'sequences_config',
      presentations: 'presentations_config',
      avatars: 'avatars_config',
      social_posts: 'social_posts_config',
    }
    return view[keyByType[view.type]] ?? null
  }

  // ─── Validation ───

  protected async validatePermissions(
    userId: string,
    source: TransferContext,
    target: TransferContext,
    mode: TransferMode,
  ) {
    if (mode === 'move') {
      if (source.org_id) {
        const role = await this.transferRepository.getOrgRole(this.supabase, userId, source.org_id)
        if (!role) throw new ForbiddenException('Not a member of the source organization')
        if (!['owner', 'admin'].includes(role)) {
          throw new ForbiddenException('Admin role required to move content out of an organization')
        }
      }
      if (target.org_id) {
        const role = await this.transferRepository.getOrgRole(this.supabase, userId, target.org_id)
        if (!role) throw new ForbiddenException('Not a member of the target organization')
        if (!['owner', 'admin'].includes(role)) {
          throw new ForbiddenException('Admin role required to move content into an organization')
        }
      }
      return
    }

    if (source.org_id) {
      const role = await this.transferRepository.getOrgRole(this.supabase, userId, source.org_id)
      if (!role) throw new ForbiddenException('Not a member of the source organization')
    }
    if (target.org_id) {
      const role = await this.transferRepository.getOrgRole(this.supabase, userId, target.org_id)
      if (!role) throw new ForbiddenException('Not a member of the target organization')
      if (!['owner', 'admin', 'creator'].includes(role)) {
        throw new ForbiddenException(
          'Creator role or above required to copy content into an organization',
        )
      }
    }
  }

  protected validateArtifactTable(table: string) {
    if (!MOVABLE_ARTIFACT_TABLES.includes(table as MovableArtifactTable)) {
      throw new BadRequestException(`Cannot transfer artifacts from table: ${table}`)
    }
  }

  protected validateNotSameContext(source: TransferContext, target: TransferContext) {
    if (this.contextKey(source) === this.contextKey(target)) {
      throw new BadRequestException('Source and target contexts are the same')
    }
  }

  protected contextKey(ctx: TransferContext): string {
    return ctx.org_id ?? 'personal'
  }

  // ─── Data loaders ───

  protected async loadCampaign(campaignId: string): Promise<any> {
    const campaign = await this.transferRepository.loadCampaign(this.supabase, campaignId)
    if (!campaign) throw new BadRequestException('Campaign not found')
    return campaign
  }

  protected async loadSpace(spaceId: string): Promise<any> {
    const space = await this.transferRepository.loadSpace(this.supabase, spaceId)
    if (!space) throw new BadRequestException('Space not found')
    return space
  }

  protected spaceContext(space: any, userId: string): TransferContext {
    return { org_id: String(space.org_id) === userId ? null : (space.org_id ?? null) }
  }

  protected spaceTargetOrgId(targetContext: TransferContext, _userId: string): string | null {
    return targetContext.org_id ?? null
  }

  // ─── Project Transfer ───

  async previewProject(
    projectId: string,
    userId: string,
    targetContext: TransferContext,
    mode: TransferMode,
  ): Promise<TransferPreviewResult> {
    const project = await this.transferRepository.loadProjectPreview(this.supabase, projectId)
    if (!project) throw new BadRequestException('Project not found')

    const sourceContext: TransferContext = { org_id: project.org_id ?? null }
    this.validateNotSameContext(sourceContext, targetContext)
    await this.validatePermissions(userId, sourceContext, targetContext, mode)

    const warnings: string[] = []
    if (mode === 'copy') {
      warnings.push('Copy duplicates the project metadata — storage files are not duplicated')
    }

    return {
      entity: { id: project.id, name: project.name, type: 'project' },
      source_context: sourceContext,
      target_context: targetContext,
      mode,
      children: {},
      warnings,
      linked_resources: { domains: [], email_domains: [], contacts: 0 },
    }
  }

  async executeProjectTransfer(
    projectId: string,
    userId: string,
    targetContext: TransferContext,
    mode: TransferMode,
  ): Promise<TransferExecuteResult> {
    const project = await this.transferRepository.loadProject(this.supabase, projectId)
    if (!project) throw new BadRequestException('Project not found')

    const sourceContext: TransferContext = { org_id: project.org_id ?? null }
    this.validateNotSameContext(sourceContext, targetContext)
    await this.validatePermissions(userId, sourceContext, targetContext, mode)

    const newOrgId = targetContext.org_id ?? null

    if (mode === 'move') {
      const { error: updateErr } = await this.transferRepository.moveProject(
        this.supabase,
        projectId,
        newOrgId,
      )
      if (updateErr) throw new BadRequestException(`Move failed: ${updateErr.message}`)

      return { success: true, entity_id: projectId, mode, transferred: { project_repos: 1 } }
    }

    const { data: copied, error: copyErr } = await this.transferRepository.copyProject(
      this.supabase,
      project,
      newOrgId,
    )
    if (copyErr || !copied) throw new BadRequestException(`Copy failed: ${copyErr?.message}`)

    return { success: true, entity_id: copied.id, mode, transferred: { project_repos: 1 } }
  }

  protected async findLinkedDomains(campaignId: string) {
    return this.transferRepository.findLinkedDomains(this.supabase, campaignId)
  }

  protected async findLinkedEmailDomains(campaignId: string, userId: string) {
    return this.transferRepository.findLinkedEmailDomains(this.supabase, campaignId, userId)
  }
}
