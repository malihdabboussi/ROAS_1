import { BadRequestException, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { TransferCampaignCopyRepository } from '../repositories/transfer-campaign-copy.repository'
import { TransferRepository } from '../repositories/transfer.repository'
import { TransferSpaceRepository } from '../repositories/transfer-space.repository'
import { TransferViewRepository } from '../repositories/transfer-view.repository'
import {
  CHILD_TABLES_NO_ORG_ID,
  CHILD_TABLES_WITH_ORG_ID,
  SPACE_CHILD_TABLES_WITH_ORG_ID,
  type TransferContext,
  type TransferExecuteResult,
  type TransferMode,
  type TransferOptions,
  type TransferPreviewResult,
} from '../transfer.types'

export abstract class TransferServiceBase01 {
  // Abstract declarations for methods implemented by later base classes.
  protected abstract copyCampaign(...args: any[]): any;
  protected abstract copyRow(...args: any[]): any;
  protected abstract copyChildRows(...args: any[]): any;
  protected abstract copyConfigRows(...args: any[]): any;
  protected abstract copyFunnelsWithPages(...args: any[]): any;
  protected abstract copyAdSets(...args: any[]): any;
  protected abstract copyAds(...args: any[]): any;
  protected abstract copyChildRowsByParent(...args: any[]): any;
  protected abstract sanitizeMetaFields(...args: any[]): any;
  protected abstract moveSpace(...args: any[]): any;
  protected abstract copySpace(...args: any[]): any;
  protected abstract copySpaceItems(...args: any[]): any;
  protected abstract copySelectedSpaceItems(...args: any[]): any;
  protected abstract parseViewEntityId(...args: any[]): any;
  protected abstract resolveView(...args: any[]): any;
  protected abstract createSpaceForView(...args: any[]): any;
  protected abstract removeViewFromSpace(...args: any[]): any;
  protected abstract resolveViewTransferSet(...args: any[]): any;
  protected abstract resolveSpaceItemViewTransferSet(...args: any[]): any;
  protected abstract isClosedSpaceItem(...args: any[]): any;
  protected abstract resolveArtifactViewIds(...args: any[]): any;
  protected abstract artifactRowMatchesView(...args: any[]): any;
  protected abstract artifactConfigForView(...args: any[]): any;
  protected abstract validatePermissions(...args: any[]): any;
  protected abstract validateArtifactTable(...args: any[]): any;
  protected abstract validateNotSameContext(...args: any[]): any;
  protected abstract contextKey(...args: any[]): any;
  protected abstract loadCampaign(...args: any[]): any;
  protected abstract loadSpace(...args: any[]): any;
  protected abstract spaceContext(...args: any[]): any;
  protected abstract spaceTargetOrgId(...args: any[]): any;
  abstract previewProject(...args: any[]): any;
  abstract executeProjectTransfer(...args: any[]): any;
  protected abstract findLinkedDomains(...args: any[]): any;
  protected abstract findLinkedEmailDomains(...args: any[]): any;
  protected abstract countLinkedContacts(...args: any[]): any;
  // End generated abstract declarations.

  protected readonly logger = new Logger('TransferService')
  protected readonly supabase: SupabaseClient
  constructor(
    protected readonly svc: SupabaseServiceClient,
    protected readonly transferRepository: TransferRepository,
    protected readonly transferViewRepository: TransferViewRepository,
    protected readonly transferCampaignCopyRepository: TransferCampaignCopyRepository,
    protected readonly transferSpaceRepository: TransferSpaceRepository,
  ) {
    this.supabase = svc.client
  }

  // ─── Preview ───

  async previewCampaign(
    campaignId: string,
    userId: string,
    targetContext: TransferContext,
    mode: TransferMode,
  ): Promise<TransferPreviewResult> {
    const campaign = await this.loadCampaign(campaignId)
    const sourceContext: TransferContext = { org_id: campaign.org_id ?? null }

    this.validateNotSameContext(sourceContext, targetContext)
    await this.validatePermissions(userId, sourceContext, targetContext, mode)

    const children: Record<string, number> = {}
    const warnings: string[] = []

    for (const table of [...CHILD_TABLES_WITH_ORG_ID, ...CHILD_TABLES_NO_ORG_ID]) {
      children[table] = await this.transferRepository.countCampaignRows(
        this.supabase,
        table,
        campaignId,
      )
    }

    const activeMissions = await this.transferRepository.countActiveCampaignMissions(
      this.supabase,
      campaignId,
    )
    if (activeMissions > 0) {
      warnings.push(`${activeMissions} active mission(s) will be paused during transfer`)
    }

    const domains = await this.findLinkedDomains(campaignId)
    if (domains.length > 0) {
      warnings.push(
        `${domains.length} funnel(s) use custom domains that should also be transferred`,
      )
    }

    const emailDomains = await this.findLinkedEmailDomains(campaignId, campaign.user_id)
    if (emailDomains.length > 0) {
      warnings.push(`Campaign has email sequences using ${emailDomains.length} email domain(s)`)
    }

    const contacts = await this.countLinkedContacts(campaignId, campaign.user_id)

    if (mode === 'copy') {
      warnings.push('Copy creates new records — missions and deliverables are not duplicated')
    }

    return {
      entity: { id: campaign.id, name: campaign.name, type: 'campaign' },
      source_context: sourceContext,
      target_context: targetContext,
      mode,
      children,
      warnings,
      linked_resources: { domains, email_domains: emailDomains, contacts },
    }
  }

  async previewArtifact(
    table: string,
    artifactId: string,
    userId: string,
    targetContext: TransferContext,
    mode: TransferMode,
  ): Promise<TransferPreviewResult> {
    this.validateArtifactTable(table)

    const artifact = await this.transferRepository.loadArtifactPreview(
      this.supabase,
      table,
      artifactId,
    )
    if (!artifact) throw new BadRequestException('Artifact not found')

    const sourceContext: TransferContext = { org_id: (artifact as any).org_id ?? null }
    this.validateNotSameContext(sourceContext, targetContext)
    await this.validatePermissions(userId, sourceContext, targetContext, mode)

    const name = (artifact as any).name || (artifact as any).title || table
    return {
      entity: { id: artifact.id, name: String(name), type: 'artifact' },
      source_context: sourceContext,
      target_context: targetContext,
      mode,
      children: {},
      warnings: [],
      linked_resources: { domains: [], email_domains: [], contacts: 0 },
    }
  }

  async previewSpace(
    spaceId: string,
    userId: string,
    targetContext: TransferContext,
    mode: TransferMode,
  ): Promise<TransferPreviewResult> {
    const space = await this.loadSpace(spaceId)
    const sourceContext = this.spaceContext(space, userId)
    this.validateNotSameContext(sourceContext, targetContext)
    await this.validatePermissions(userId, sourceContext, targetContext, mode)

    const children: Record<string, number> = {}
    for (const table of SPACE_CHILD_TABLES_WITH_ORG_ID) {
      children[table] = await this.transferRepository.countSpaceRows(this.supabase, table, spaceId)
    }

    const viewCount = Array.isArray(space.schema?.views) ? space.schema.views.length : 0
    const warnings: string[] = []
    if (children.space_shares && children.space_shares > 0) {
      warnings.push(`${children.space_shares} space share(s) will be removed during transfer`)
    }
    if (children.space_item_shares && children.space_item_shares > 0) {
      warnings.push(`${children.space_item_shares} item share(s) will be removed during transfer`)
    }

    return {
      entity: { id: space.id, name: space.title, type: 'space' },
      source_context: sourceContext,
      target_context: targetContext,
      mode,
      children: { ...children, views: viewCount },
      warnings,
      linked_resources: { domains: [], email_domains: [], contacts: 0 },
    }
  }

  async previewView(
    entityId: string,
    userId: string,
    targetContext: TransferContext,
    mode: TransferMode,
  ): Promise<TransferPreviewResult> {
    const { spaceId, viewId } = this.parseViewEntityId(entityId)
    const space = await this.loadSpace(spaceId)
    const sourceContext = this.spaceContext(space, userId)
    this.validateNotSameContext(sourceContext, targetContext)
    await this.validatePermissions(userId, sourceContext, targetContext, mode)

    const view = this.resolveView(space, viewId)
    const transferSet = await this.resolveViewTransferSet(space, view)
    return {
      entity: { id: entityId, name: view.name, type: 'view' },
      source_context: sourceContext,
      target_context: targetContext,
      mode,
      children: { [transferSet.table]: transferSet.ids.length, views: 1 },
      warnings: transferSet.warnings,
      linked_resources: { domains: [], email_domains: [], contacts: 0 },
    }
  }

  // ─── Execute: Campaign ───

  async executeCampaignTransfer(
    campaignId: string,
    userId: string,
    targetContext: TransferContext,
    mode: TransferMode,
    opts?: TransferOptions,
  ): Promise<TransferExecuteResult> {
    const campaign = await this.loadCampaign(campaignId)
    const sourceContext: TransferContext = { org_id: campaign.org_id ?? null }

    this.validateNotSameContext(sourceContext, targetContext)
    await this.validatePermissions(userId, sourceContext, targetContext, mode)

    if (mode === 'move') {
      return this.moveCampaign(campaign, targetContext, opts)
    }
    return this.copyCampaign(campaign, userId, targetContext, opts)
  }

  // ─── Execute: Artifact ───

  async executeArtifactTransfer(
    table: string,
    artifactId: string,
    userId: string,
    targetContext: TransferContext,
    mode: TransferMode,
    targetCampaignId?: string,
  ): Promise<TransferExecuteResult> {
    this.validateArtifactTable(table)

    const artifact = await this.transferRepository.loadArtifact(this.supabase, table, artifactId)
    if (!artifact) throw new BadRequestException('Artifact not found')

    const sourceContext: TransferContext = { org_id: (artifact as any).org_id ?? null }
    this.validateNotSameContext(sourceContext, targetContext)
    await this.validatePermissions(userId, sourceContext, targetContext, mode)

    if (targetCampaignId) {
      const targetCampaign = await this.loadCampaign(targetCampaignId)
      const targetCampaignCtx: TransferContext = { org_id: targetCampaign.org_id ?? null }
      if (this.contextKey(targetCampaignCtx) !== this.contextKey(targetContext)) {
        throw new BadRequestException('Target campaign does not belong to the target context')
      }
    }

    const transferred: Record<string, number> = {}
    const targetOrgId = targetContext.org_id

    if (mode === 'move') {
      const updatePayload: Record<string, any> = {
        org_id: targetOrgId,
        updated_at: new Date().toISOString(),
      }
      if (targetCampaignId) updatePayload.campaign_id = targetCampaignId

      const { error: moveErr } = await this.transferRepository.moveArtifact(
        this.supabase,
        table,
        artifactId,
        updatePayload,
      )
      if (moveErr) throw new Error(`Failed to move artifact: ${moveErr.message}`)
      transferred[table] = 1
    } else {
      const { error: copyErr } = await this.transferRepository.copyArtifact(
        this.supabase,
        table,
        artifact,
        targetOrgId,
        targetCampaignId,
      )
      if (copyErr) throw new Error(`Failed to copy artifact: ${copyErr.message}`)
      transferred[table] = 1
    }

    this.logger.log(
      `${mode} artifact ${table}/${artifactId} to context ${this.contextKey(targetContext)}`,
    )
    return { success: true, entity_id: artifactId, mode, transferred }
  }

  // ─── Execute: Media ───

  async executeMediaTransfer(
    mediaId: string,
    userId: string,
    targetContext: TransferContext,
    mode: TransferMode,
    targetCampaignId?: string,
  ): Promise<TransferExecuteResult> {
    const asset = await this.transferRepository.loadMediaAsset(this.supabase, mediaId)
    if (!asset) throw new BadRequestException('Media asset not found')

    const sourceContext: TransferContext = { org_id: (asset as any).org_id ?? null }
    this.validateNotSameContext(sourceContext, targetContext)
    await this.validatePermissions(userId, sourceContext, targetContext, mode)

    const transferred: Record<string, number> = {}
    const targetOrgId = targetContext.org_id

    if (mode === 'move') {
      const updatePayload: Record<string, any> = { org_id: targetOrgId }
      if (targetCampaignId) updatePayload.campaign_id = targetCampaignId

      const { error: moveErr } = await this.transferRepository.moveMediaAsset(
        this.supabase,
        mediaId,
        updatePayload,
      )
      if (moveErr) throw new Error(`Failed to move media: ${moveErr.message}`)
      transferred.media_assets = 1
    } else {
      const { error: copyErr } = await this.transferRepository.copyMediaAsset(
        this.supabase,
        asset,
        targetOrgId,
        targetCampaignId,
      )
      if (copyErr) throw new Error(`Failed to copy media: ${copyErr.message}`)
      transferred.media_assets = 1
    }

    this.logger.log(`${mode} media ${mediaId} to context ${this.contextKey(targetContext)}`)
    return { success: true, entity_id: mediaId, mode, transferred }
  }

  // ─── Execute: Space ───

  async executeSpaceTransfer(
    spaceId: string,
    userId: string,
    targetContext: TransferContext,
    mode: TransferMode,
  ): Promise<TransferExecuteResult> {
    const space = await this.loadSpace(spaceId)
    const sourceContext = this.spaceContext(space, userId)

    this.validateNotSameContext(sourceContext, targetContext)
    await this.validatePermissions(userId, sourceContext, targetContext, mode)

    if (mode === 'move') {
      return this.moveSpace(space, userId, targetContext)
    }
    return this.copySpace(space, userId, targetContext)
  }

  // ─── Execute: View ───

  async executeViewTransfer(
    entityId: string,
    userId: string,
    targetContext: TransferContext,
    mode: TransferMode,
    opts?: TransferOptions,
  ): Promise<TransferExecuteResult> {
    const { spaceId, viewId } = this.parseViewEntityId(entityId)
    const space = await this.loadSpace(spaceId)
    const sourceContext = this.spaceContext(space, userId)
    this.validateNotSameContext(sourceContext, targetContext)
    await this.validatePermissions(userId, sourceContext, targetContext, mode)

    const view = this.resolveView(space, viewId)
    const transferSet = await this.resolveViewTransferSet(space, view)
    if (transferSet.ids.length === 0) {
      return { success: true, entity_id: entityId, mode, transferred: { [transferSet.table]: 0 } }
    }

    const targetOrgId = this.spaceTargetOrgId(targetContext, userId)
    const targetSpace = opts?.target_space_id
      ? await this.loadSpace(opts.target_space_id)
      : await this.createSpaceForView(space, view, userId, targetOrgId, opts?.target_campaign_id)
    const targetSpaceId = String(targetSpace.id)
    const transferred: Record<string, number> = { views: 1 }

    if (transferSet.kind === 'space_items') {
      if (mode === 'move') {
        const { count, error } = await this.transferViewRepository.moveSpaceItemsToSpace(
          this.supabase,
          transferSet.ids,
          targetSpaceId,
          targetOrgId,
        )
        if (error) throw new BadRequestException(`Failed to move view items: ${error.message}`)
        transferred.space_items = count ?? 0
      } else {
        const itemRemap = await this.copySelectedSpaceItems(
          transferSet.ids,
          targetSpaceId,
          targetOrgId,
          userId,
        )
        transferred.space_items = itemRemap.size
      }
    } else {
      if (!opts?.target_campaign_id) {
        throw new BadRequestException('target_campaign_id is required for artifact view transfers')
      }
      for (const id of transferSet.ids) {
        await this.executeArtifactTransfer(
          transferSet.table,
          id,
          userId,
          targetContext,
          mode,
          opts.target_campaign_id,
        )
      }
      transferred[transferSet.table] = transferSet.ids.length
    }

    if (mode === 'move') {
      await this.removeViewFromSpace(space, viewId)
    }

    return { success: true, entity_id: targetSpaceId, mode, transferred }
  }

  // ─── Move Campaign (protected) ───

  protected async moveCampaign(
    campaign: any,
    targetContext: TransferContext,
    opts?: TransferOptions,
  ): Promise<TransferExecuteResult> {
    const campaignId = String(campaign.id)
    const targetOrgId = targetContext.org_id
    const transferred: Record<string, number> = {}
    const excluded = new Set(opts?.exclude_tables ?? [])

    await this.transferRepository.pauseActiveCampaignMissions(this.supabase, campaignId)

    const { error: campaignErr } = await this.transferRepository.moveCampaignRow(
      this.supabase,
      campaignId,
      targetOrgId,
    )
    if (campaignErr) throw new Error(`Failed to move campaign: ${campaignErr.message}`)
    transferred.campaigns = 1

    for (const table of CHILD_TABLES_WITH_ORG_ID) {
      if (excluded.has(table)) continue
      const { count, error } = await this.transferRepository.moveCampaignChildRows(
        this.supabase,
        table,
        campaignId,
        targetOrgId,
      )
      if (error) {
        this.logger.warn(`Failed to move ${table}: ${error.message}`)
        transferred[table] = 0
        continue
      }
      transferred[table] = count
    }

    if (opts?.include_domains?.length) {
      for (const domainId of opts.include_domains) {
        await this.transferRepository.moveDomain(this.supabase, domainId, targetOrgId)
      }
      transferred.domains = opts.include_domains.length
    }

    if (opts?.include_email_domains?.length) {
      for (const edId of opts.include_email_domains) {
        await this.transferRepository.moveEmailDomain(this.supabase, edId, targetOrgId)
      }
      transferred.email_domains = opts.include_email_domains.length
    }

    if (opts?.include_contacts) {
      const contactIds = await this.transferRepository.listCampaignContactIds(
        this.supabase,
        campaignId,
      )
      if (contactIds.length > 0) {
        await this.transferRepository.moveContacts(this.supabase, contactIds, targetOrgId)
        transferred.contacts = contactIds.length
      }
    }

    await this.transferRepository.moveCampaignUsageEvents(this.supabase, campaignId, targetOrgId)

    this.logger.log(`Moved campaign ${campaignId} to ${this.contextKey(targetContext)}`)
    return { success: true, entity_id: campaignId, mode: 'move', transferred }
  }
}
