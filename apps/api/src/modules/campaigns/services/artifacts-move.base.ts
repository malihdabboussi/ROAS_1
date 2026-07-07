import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactsAdSetsBase } from './artifacts-ad-sets.base'

export class ArtifactsMoveBase extends ArtifactsAdSetsBase {
  // ─── Campaign asset summary (for delete dialog) ───

  async getCampaignAssetSummary(supabase: SupabaseClient, campaignId: string) {
    const { offers, funnels, ads, sequences, presentations, avatars } =
      await this.artifactMoveRepo.getCampaignAssetSummary(supabase, campaignId)

    return {
      offers: (offers ?? []).map((o: Record<string, unknown>) => ({
        id: String(o.id),
        name: typeof o.name === 'string' ? o.name : 'Untitled Offer',
      })),
      funnels: (funnels ?? []).map((f: Record<string, unknown>) => ({
        id: String(f.id),
        name: typeof f.name === 'string' ? f.name : 'Untitled Funnel',
      })),
      ads: (ads ?? []).map((a: Record<string, unknown>) => ({
        id: String(a.id),
        name: typeof a.headline === 'string' ? a.headline : 'Untitled Ad',
      })),
      sequences: (sequences ?? []).map((s: Record<string, unknown>) => ({
        id: String(s.id),
        name: typeof s.name === 'string' ? s.name : 'Untitled Sequence',
      })),
      presentations: (presentations ?? []).map((l: Record<string, unknown>) => ({
        id: String(l.id),
        name: typeof l.name === 'string' ? l.name : 'Untitled Presentation',
      })),
      avatars: (avatars ?? []).map((a: Record<string, unknown>) => ({
        id: String(a.id),
        name: typeof a.name === 'string' ? a.name : 'Untitled Avatar',
      })),
    }
  }

  // ─── Move artifact to another campaign ───

  protected readonly MOVABLE_TABLES = [
    'offers',
    'funnels',
    'forms',
    'ads',
    'sequences',
    'presentations',
    'avatars',
    'emails',
  ] as const

  async moveArtifactToCampaign(
    supabase: SupabaseClient,
    table: string,
    artifactId: string,
    targetCampaignId: string,
  ) {
    if (!this.MOVABLE_TABLES.includes(table as (typeof this.MOVABLE_TABLES)[number])) {
      throw new BadRequestException(`Cannot move artifacts from table: ${table}`)
    }

    await this.artifactMoveRepo.moveArtifactToCampaign(
      supabase,
      table,
      artifactId,
      targetCampaignId,
    )
    return { success: true }
  }

  async copyArtifactToCampaign(
    supabase: SupabaseClient,
    table: string,
    artifactId: string,
    targetCampaignId: string,
  ) {
    if (!this.MOVABLE_TABLES.includes(table as (typeof this.MOVABLE_TABLES)[number])) {
      throw new BadRequestException(`Cannot copy artifacts from table: ${table}`)
    }

    const row = await this.artifactMoveRepo.findArtifactRow(supabase, table, artifactId)
    if (!row) {
      throw new NotFoundException('Artifact not found')
    }

    const lineageCampaigns = await this.resolveLineageCampaignIdsForRow(supabase, table, artifactId)
    if (lineageCampaigns.includes(targetCampaignId)) {
      throw new BadRequestException('Artifact already exists in this campaign (same lineage)')
    }

    if (table === 'funnels') {
      throw new BadRequestException(
        'Copy is not supported for funnels yet (pages would not be duplicated). Use Move instead.',
      )
    }

    const payload = this.buildArtifactCopyInsertPayload(
      table,
      row as Record<string, unknown>,
      targetCampaignId,
      artifactId,
    )
    const inserted = await this.artifactMoveRepo.insertArtifactCopy(supabase, table, payload)

    if (table === 'sequences' && inserted?.id) {
      const emails = await this.artifactMoveRepo.listSequenceEmailRows(supabase, artifactId)
      if (emails?.length) {
        const rows = emails.map((em: Record<string, unknown>) => {
          const { id: _id, sequence_id: _sid, created_at: _ca, updated_at: _ua, ...rest } = em
          return { ...rest, sequence_id: inserted.id }
        })
        await this.artifactMoveRepo.insertSequenceEmailRows(supabase, rows)
      }
    }
    if (table === 'presentations' && inserted?.id) {
      const [files, assets] = await Promise.all([
        this.listPresentationFiles(supabase, artifactId),
        this.listPresentationAssets(supabase, artifactId),
      ])
      if (files.length > 0) {
        const rows = files.map((file: Record<string, unknown>) => ({
          presentation_id: inserted.id,
          user_id: row.user_id,
          org_id: row.org_id ?? null,
          path: file.path,
          content: file.content,
          mime_type: file.mime_type,
          role: file.role,
          size_bytes: file.size_bytes,
        }))
        await this.artifactMoveRepo.insertPresentationFileRows(supabase, rows)
      }
      if (assets.length > 0) {
        const rows = assets.map((asset: Record<string, unknown>) => ({
          presentation_id: inserted.id,
          media_asset_id: asset.media_asset_id,
          user_id: row.user_id,
          org_id: row.org_id ?? null,
          path: asset.path,
          mime_type: asset.mime_type,
          role: asset.role,
          size_bytes: asset.size_bytes,
        }))
        await this.artifactMoveRepo.insertPresentationAssetRows(supabase, rows)
      }
    }

    return { success: true }
  }

  protected buildArtifactCopyInsertPayload(
    table: string,
    row: Record<string, unknown>,
    targetCampaignId: string,
    copiedFromId: string,
  ): Record<string, unknown> {
    const omit = new Set(['id', 'created_at', 'updated_at'])
    const copy: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(row)) {
      if (omit.has(k)) continue
      copy[k] = v
    }
    copy.campaign_id = targetCampaignId
    copy.copied_from_id = copiedFromId
    copy.updated_at = new Date().toISOString()

    if (table === 'funnels') {
      if (copy.slug != null && String(copy.slug).length > 0) {
        copy.slug = `${String(copy.slug)}-copy-${Math.random().toString(36).slice(2, 8)}`
      }
      copy.published_url = null
      copy.domain_id = null
    }
    if (table === 'presentations') {
      if (copy.slug != null && String(copy.slug).length > 0) {
        copy.slug = `${String(copy.slug)}-copy-${Math.random().toString(36).slice(2, 8)}`
      }
    }
    if (table === 'forms') {
      // share_token is unique + has a DB default — strip so the new row gets a fresh token.
      delete copy.share_token
      copy.published_url = null
      copy.status = 'draft'
      if (copy.slug != null && String(copy.slug).length > 0) {
        copy.slug = `${String(copy.slug)}-copy-${Math.random().toString(36).slice(2, 8)}`
      }
    }

    return copy
  }

  /** All distinct campaign_ids for this artifact and its copy lineage (same tree via copied_from_id). */
  protected async resolveLineageCampaignIdsForRow(
    supabase: SupabaseClient,
    table: string,
    artifactId: string,
  ): Promise<string[]> {
    const start = await this.artifactMoveRepo.findLineageStart(supabase, table, artifactId)
    if (!start) return []

    let rootId = start.id as string
    let parentId = (start as { copied_from_id?: string | null }).copied_from_id ?? null
    const upVisited = new Set<string>()
    while (parentId && !upVisited.has(parentId)) {
      upVisited.add(parentId)
      rootId = parentId
      const p = await this.artifactMoveRepo.findLineageParent(supabase, table, parentId)
      parentId = (p as { copied_from_id?: string | null } | null)?.copied_from_id ?? null
    }

    const treeIds = new Set<string>()
    const queue = [rootId]
    while (queue.length) {
      const id = queue.pop()!
      if (treeIds.has(id)) continue
      treeIds.add(id)
      const children = await this.artifactMoveRepo.listLineageChildren(supabase, table, id)
      for (const c of children ?? []) {
        const cid = (c as { id?: string }).id
        if (cid) queue.push(cid)
      }
    }

    const rows = await this.artifactMoveRepo.listLineageCampaignRows(supabase, table, [...treeIds])

    const campSet = new Set<string>()
    for (const r of rows ?? []) {
      const cid = (r as { campaign_id?: string | null }).campaign_id
      if (cid) campSet.add(cid)
    }
    return [...campSet]
  }

  /** Batch-resolve campaign IDs per artifact, including copies (copied_from_id lineage). */
  async resolveArtifactCampaigns(
    supabase: SupabaseClient,
    items: Array<{ table: string; id: string }>,
  ): Promise<{ campaigns: Record<string, string[]> }> {
    const campaigns: Record<string, string[]> = {}
    if (!items?.length) return { campaigns }

    const grouped = new Map<string, Set<string>>()
    for (const raw of items) {
      const tbl = String(raw.table ?? '')
      const id = String(raw.id ?? '').trim()
      if (!tbl || !id) continue
      if (!this.MOVABLE_TABLES.includes(tbl as (typeof this.MOVABLE_TABLES)[number])) continue
      if (!grouped.has(tbl)) grouped.set(tbl, new Set())
      grouped.get(tbl)!.add(id)
    }

    for (const [tbl, idSet] of grouped) {
      for (const artifactId of idSet) {
        const key = `${tbl}:${artifactId}`
        const ids = await this.resolveLineageCampaignIdsForRow(supabase, tbl, artifactId)
        campaigns[key] = ids
      }
    }
    return { campaigns }
  }
}
