import { TransferServiceBase01 } from './transfer-service-01.base'
import { BadRequestException } from '@nestjs/common'
import {
  CHILD_TABLES_NO_ORG_ID,
  type TransferContext,
  type TransferExecuteResult,
  type TransferOptions,
} from '../transfer.types'

export abstract class TransferServiceBase02 extends TransferServiceBase01 {

  // ─── Copy Campaign (protected) ───

  protected async copyCampaign(
    campaign: any,
    userId: string,
    targetContext: TransferContext,
    opts?: TransferOptions,
  ): Promise<TransferExecuteResult> {
    const originalId = String(campaign.id)
    const targetOrgId = targetContext.org_id
    const transferred: Record<string, number> = {}
    const idRemap = new Map<string, string>()
    const excluded = new Set(opts?.exclude_tables ?? [])

    const newCampaign = await this.copyRow('campaigns', campaign, {
      org_id: targetOrgId,
      name: `${campaign.name} (Copy)`,
    })
    transferred.campaigns = 1
    idRemap.set(originalId, String(newCampaign.id))
    const newCampaignId = String(newCampaign.id)

    for (const table of [
      'offers',
      'presentations',
      'sequences',
      'social_posts',
      'blog_posts',
      'leads',
    ] as const) {
      if (excluded.has(table)) continue
      const count = await this.copyChildRows(table, originalId, newCampaignId, targetOrgId, idRemap)
      if (count > 0) transferred[table] = count
    }

    if (!excluded.has('avatars')) {
      const avatarCount = await this.copyChildRows(
        'avatars',
        originalId,
        newCampaignId,
        targetOrgId,
        idRemap,
        {
          remap: { offer_id: idRemap },
        },
      )
      if (avatarCount > 0) transferred.avatars = avatarCount
    }

    if (!excluded.has('funnels')) {
      const funnelCount = await this.copyFunnelsWithPages(
        originalId,
        newCampaignId,
        targetOrgId,
        idRemap,
      )
      if (funnelCount > 0) transferred.funnels = funnelCount
    }

    if (!excluded.has('sequences')) {
      const seqEmailCount = await this.copyChildRowsByParent(
        'sequence_emails',
        'sequence_id',
        originalId,
        idRemap,
      )
      if (seqEmailCount > 0) transferred.sequence_emails = seqEmailCount
    }

    if (!excluded.has('ad_campaigns')) {
      const adCampCount = await this.copyChildRows(
        'ad_campaigns',
        originalId,
        newCampaignId,
        targetOrgId,
        idRemap,
      )
      if (adCampCount > 0) transferred.ad_campaigns = adCampCount

      const adSetCount = await this.copyAdSets(originalId, newCampaignId, targetOrgId, idRemap)
      if (adSetCount > 0) transferred.ad_sets = adSetCount

      const adsCount = await this.copyAds(originalId, newCampaignId, targetOrgId, idRemap)
      if (adsCount > 0) transferred.ads = adsCount
    }

    if (!excluded.has('media_assets')) {
      const mediaCount = await this.copyChildRows(
        'media_assets',
        originalId,
        newCampaignId,
        targetOrgId,
        idRemap,
      )
      if (mediaCount > 0) transferred.media_assets = mediaCount
    }

    for (const table of CHILD_TABLES_NO_ORG_ID) {
      if (excluded.has(table)) continue
      const count = await this.copyConfigRows(table, originalId, newCampaignId)
      if (count > 0) transferred[table] = count
    }

    this.logger.log(
      `Copied campaign ${originalId} -> ${newCampaignId} to ${this.contextKey(targetContext)}`,
    )
    return { success: true, entity_id: newCampaignId, mode: 'copy', transferred }
  }

  // ─── Copy helpers ───

  protected async copyRow(table: string, source: any, overrides: Record<string, any>): Promise<any> {
    const { data, error } = await this.transferCampaignCopyRepository.copyRow(
      this.supabase,
      table,
      source,
      overrides,
    )
    if (error || !data) throw new Error(`Failed to copy ${table}: ${error?.message}`)
    return data
  }

  protected async copyChildRows(
    table: string,
    sourceCampaignId: string,
    newCampaignId: string,
    targetOrgId: string | null,
    idRemap: Map<string, string>,
    opts?: { remap?: Record<string, Map<string, string>> },
  ): Promise<number> {
    const rows = await this.transferCampaignCopyRepository.listCampaignRows(
      this.supabase,
      table,
      sourceCampaignId,
    )
    if (!rows.length) return 0

    let copied = 0
    for (const row of rows) {
      const { id: oldId, created_at: _ca, updated_at: _ua, deleted_at: _da, ...rest } = row as any
      const copy: Record<string, any> = { ...rest, campaign_id: newCampaignId }

      if ('org_id' in rest) copy.org_id = targetOrgId

      if (opts?.remap) {
        for (const [fkCol, remapMap] of Object.entries(opts.remap)) {
          if (copy[fkCol] && remapMap.get(String(copy[fkCol]))) {
            copy[fkCol] = remapMap.get(String(copy[fkCol]))
          }
        }
      }

      const { data: inserted, error } = await this.transferCampaignCopyRepository.insertCopiedRow(
        this.supabase,
        table,
        copy,
      )
      if (error) {
        this.logger.warn(`Copy ${table} row failed: ${error.message}`)
        continue
      }
      if (inserted) {
        idRemap.set(String(oldId), String(inserted.id))
        copied++
      }
    }
    return copied
  }

  protected async copyConfigRows(
    table: string,
    sourceCampaignId: string,
    newCampaignId: string,
  ): Promise<number> {
    const rows = await this.transferCampaignCopyRepository.listCampaignRows(
      this.supabase,
      table,
      sourceCampaignId,
    )
    if (!rows.length) return 0

    const copies = rows.map((row: any) => {
      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = row
      return { ...rest, campaign_id: newCampaignId }
    })
    const { error } = await this.transferCampaignCopyRepository.insertConfigRows(
      this.supabase,
      table,
      copies,
    )
    if (error) {
      this.logger.warn(`Copy config ${table} failed: ${error.message}`)
      return 0
    }
    return copies.length
  }

  protected async copyFunnelsWithPages(
    sourceCampaignId: string,
    newCampaignId: string,
    targetOrgId: string | null,
    idRemap: Map<string, string>,
  ): Promise<number> {
    const funnels = await this.transferCampaignCopyRepository.listCampaignRows(
      this.supabase,
      'funnels',
      sourceCampaignId,
    )
    if (!funnels.length) return 0

    let count = 0
    for (const funnel of funnels) {
      const oldFunnelId = String(funnel.id)
      const {
        id: _fid,
        created_at: _fca,
        updated_at: _fua,
        domain_id: _did,
        published_url: _pu,
        home_page_id: _hpi,
        ...funnelData
      } = funnel as any

      const funnelCopy: Record<string, any> = {
        ...funnelData,
        campaign_id: newCampaignId,
        org_id: targetOrgId,
        domain_id: null,
        published_url: null,
        home_page_id: null,
      }
      if (funnelCopy.offer_id && idRemap.has(String(funnelCopy.offer_id))) {
        funnelCopy.offer_id = idRemap.get(String(funnelCopy.offer_id))
      }

      const newFunnel = await this.transferCampaignCopyRepository.insertCopiedFunnel(
        this.supabase,
        funnelCopy,
      )
      if (!newFunnel) continue

      idRemap.set(oldFunnelId, String(newFunnel.id))
      count++

      const pages = await this.transferCampaignCopyRepository.listFunnelPages(
        this.supabase,
        oldFunnelId,
      )
      if (pages.length) {
        const pageCopies = pages.map((p: any) => {
          const { id: _pid, created_at: _pca, updated_at: _pua, ...pageData } = p
          return { ...pageData, funnel_id: String(newFunnel.id) }
        })
        await this.transferCampaignCopyRepository.insertRows(
          this.supabase,
          'funnel_pages',
          pageCopies,
        )
      }
    }
    return count
  }

  protected async copyAdSets(
    sourceCampaignId: string,
    newCampaignId: string,
    targetOrgId: string | null,
    idRemap: Map<string, string>,
  ): Promise<number> {
    const adSets = await this.transferCampaignCopyRepository.listCampaignRows(
      this.supabase,
      'ad_sets',
      sourceCampaignId,
    )
    if (!adSets.length) return 0

    let count = 0
    for (const adSet of adSets) {
      const oldId = String(adSet.id)
      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = adSet as any
      const copy: Record<string, any> = { ...rest, campaign_id: newCampaignId }
      if ('org_id' in rest) copy.org_id = targetOrgId
      if (copy.ad_campaign_id && idRemap.has(String(copy.ad_campaign_id))) {
        copy.ad_campaign_id = idRemap.get(String(copy.ad_campaign_id))
      }
      this.sanitizeMetaFields(copy)

      const { data: inserted } = await this.transferCampaignCopyRepository.insertCopiedRow(
        this.supabase,
        'ad_sets',
        copy,
      )
      if (inserted) {
        idRemap.set(oldId, String(inserted.id))
        count++
      }
    }
    return count
  }

  protected async copyAds(
    sourceCampaignId: string,
    newCampaignId: string,
    targetOrgId: string | null,
    idRemap: Map<string, string>,
  ): Promise<number> {
    const ads = await this.transferCampaignCopyRepository.listCampaignRows(
      this.supabase,
      'ads',
      sourceCampaignId,
    )
    if (!ads.length) return 0

    let count = 0
    for (const ad of ads) {
      const oldId = String(ad.id)
      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = ad as any
      const copy: Record<string, any> = { ...rest, campaign_id: newCampaignId }

      if (copy.ad_set_id && idRemap.has(String(copy.ad_set_id))) {
        copy.ad_set_id = idRemap.get(String(copy.ad_set_id))
      }
      if (copy.image_asset_id && idRemap.has(String(copy.image_asset_id))) {
        copy.image_asset_id = idRemap.get(String(copy.image_asset_id))
      }
      this.sanitizeMetaFields(copy)

      const { data: inserted } = await this.transferCampaignCopyRepository.insertCopiedRow(
        this.supabase,
        'ads',
        copy,
      )
      if (inserted) {
        idRemap.set(oldId, String(inserted.id))
        count++
      }
    }
    return count
  }

  protected async copyChildRowsByParent(
    table: string,
    parentFkCol: string,
    sourceCampaignId: string,
    idRemap: Map<string, string>,
  ): Promise<number> {
    const parentOldIds = [...idRemap.entries()].filter(([_old, _new]) => true).map(([old]) => old)

    if (!parentOldIds.length) return 0

    const rows = await this.transferCampaignCopyRepository.listRowsByParentIds(
      this.supabase,
      table,
      parentFkCol,
      parentOldIds,
    )
    if (!rows.length) return 0

    let count = 0
    for (const row of rows) {
      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = row as any
      const copy = { ...rest }
      if (copy[parentFkCol] && idRemap.has(String(copy[parentFkCol]))) {
        copy[parentFkCol] = idRemap.get(String(copy[parentFkCol]))
      }
      const { error } = await this.transferCampaignCopyRepository.insertRow(
        this.supabase,
        table,
        copy,
      )
      if (!error) count++
    }
    return count
  }

  protected sanitizeMetaFields(row: Record<string, any>) {
    const metaKeyPrefixes = ['meta_', 'fb_', 'facebook_']
    for (const key of Object.keys(row)) {
      if (metaKeyPrefixes.some((p) => key.startsWith(p))) {
        row[key] = null
      }
    }
    if (row.status === 'active' || row.status === 'published') {
      row.status = 'draft'
    }
    if (row.external_id) row.external_id = null
  }

  // ─── Space helpers ───

  protected async moveSpace(
    space: any,
    userId: string,
    targetContext: TransferContext,
  ): Promise<TransferExecuteResult> {
    const spaceId = String(space.id)
    const targetOrgId = this.spaceTargetOrgId(targetContext, userId)
    const transferred: Record<string, number> = {}

    const { error: spaceErr } = await this.transferSpaceRepository.moveSpaceRow(
      this.supabase,
      spaceId,
      targetOrgId,
    )
    if (spaceErr) throw new BadRequestException(`Failed to move space: ${spaceErr.message}`)
    transferred.spaces = 1

    const { count: itemCount, error: itemErr } = await this.transferSpaceRepository.moveSpaceOrgRows(
      this.supabase,
      'space_items',
      spaceId,
      targetOrgId,
    )
    if (itemErr) throw new BadRequestException(`Failed to move space items: ${itemErr.message}`)
    transferred.space_items = itemCount ?? 0

    const { count: activityCount, error: activityErr } = await this.transferSpaceRepository.moveSpaceOrgRows(
      this.supabase,
      'space_item_activity',
      spaceId,
      targetOrgId,
    )
    if (activityErr) {
      throw new BadRequestException(`Failed to move space activity: ${activityErr.message}`)
    }
    transferred.space_item_activity = activityCount ?? 0

    const { count: itemShareCount, error: itemShareErr } = await this.transferSpaceRepository.deleteSpaceRows(
      this.supabase,
      'space_item_shares',
      spaceId,
    )
    if (itemShareErr) {
      throw new BadRequestException(`Failed to clear item shares: ${itemShareErr.message}`)
    }
    transferred.space_item_shares = itemShareCount ?? 0

    const { count: spaceShareCount, error: spaceShareErr } = await this.transferSpaceRepository.deleteSpaceRows(
      this.supabase,
      'space_shares',
      spaceId,
    )
    if (spaceShareErr) {
      throw new BadRequestException(`Failed to clear space shares: ${spaceShareErr.message}`)
    }
    transferred.space_shares = spaceShareCount ?? 0

    this.logger.log(`Moved space ${spaceId} to ${this.contextKey(targetContext)}`)
    return { success: true, entity_id: spaceId, mode: 'move', transferred }
  }

  protected async copySpace(
    space: any,
    userId: string,
    targetContext: TransferContext,
  ): Promise<TransferExecuteResult> {
    const sourceSpaceId = String(space.id)
    const targetOrgId = this.spaceTargetOrgId(targetContext, userId)
    const transferred: Record<string, number> = {}
    const { data: copiedSpace, error: spaceErr } = await this.transferSpaceRepository.copySpace(
      this.supabase,
      space,
      targetOrgId,
      userId,
    )
    if (spaceErr || !copiedSpace) {
      throw new BadRequestException(`Failed to copy space: ${spaceErr?.message}`)
    }
    transferred.spaces = 1

    const itemRemap = await this.copySpaceItems(
      sourceSpaceId,
      String(copiedSpace.id),
      targetOrgId,
      userId,
    )
    transferred.space_items = itemRemap.size

    this.logger.log(
      `Copied space ${sourceSpaceId} -> ${String(copiedSpace.id)} to ${this.contextKey(targetContext)}`,
    )
    return { success: true, entity_id: String(copiedSpace.id), mode: 'copy', transferred }
  }
}
