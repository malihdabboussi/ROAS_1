import { BadRequestException, forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SpaceRetrievalIndexService } from '../../space-retrieval/services/space-retrieval-index.service'
import {
  buildPageGraderEvidenceRows,
  buildPageGraderSeedMemories,
  buildPageGraderSourceMemories,
  computePageGraderPackageContentHash,
  PAGE_GRADER_MEMORY_BATCH,
  pageGraderStringValue,
  resolvePageGraderKnowledgeSourceType,
  type PageGraderEvidenceRow,
  type PageGraderMemoryRow,
  type PageGraderPackage,
} from './page-grader-brain-package-build'

export type PageGraderPackageIngestResult = {
  brainId: string
  contentHash: string
  memoriesInserted: number
  memoriesSkipped: number
  evidenceUpserted: number
  knowledgeIndexed: number
  skippedUnchanged: boolean
}

@Injectable()
export class PageGraderBrainPackageIngestService {
  private readonly logger = new Logger(PageGraderBrainPackageIngestService.name)

  constructor(
    @Inject(forwardRef(() => SpaceRetrievalIndexService))
    private readonly spaceRetrievalIndex: SpaceRetrievalIndexService,
  ) {}

  async ingestPackage(
    supabase: SupabaseClient,
    input: {
      userId: string
      orgId?: string | null
      campaignId: string
      spaceId?: string | null
      package: PageGraderPackage
      force?: boolean
    },
  ): Promise<PageGraderPackageIngestResult> {
    const pkg = input.package
    const pageGraderClientId = pageGraderStringValue(
      pkg.envelope?.page_grader_client_id,
      pkg.page_grader_client_id,
      pkg.client?.id,
    )
    if (!pageGraderClientId) {
      throw new BadRequestException('package must include a Page Grader client id')
    }

    const contentHash = computePageGraderPackageContentHash(pkg)
    const campaign = await this.loadCampaign(supabase, input.campaignId)
    const existingHash = this.readStoredContentHash(campaign)
    if (!input.force && existingHash && existingHash === contentHash) {
      const brainId = await this.resolveBrainId(supabase, input.campaignId)
      return {
        brainId,
        contentHash,
        memoriesInserted: 0,
        memoriesSkipped: 0,
        evidenceUpserted: 0,
        knowledgeIndexed: 0,
        skippedUnchanged: true,
      }
    }

    const brainId = await this.resolveBrainId(supabase, input.campaignId)
    await supabase
      .from('ns_brains')
      .update({ scope: 'campaign', name: pageGraderStringValue(campaign.name) || 'Campaign' })
      .eq('id', brainId)

    const seeds = buildPageGraderSeedMemories(pkg, pageGraderClientId)
    const sources = buildPageGraderSourceMemories(pkg, pageGraderClientId)
    const evidence = buildPageGraderEvidenceRows(pkg, pageGraderClientId)
    const memories = [...seeds, ...sources]

    const { inserted, skipped } = await this.upsertMemories(supabase, brainId, memories)
    const evidenceUpserted = await this.upsertEvidence(supabase, brainId, evidence)

    const spaceId =
      (typeof input.spaceId === 'string' && input.spaceId.trim()) ||
      (await this.resolveCampaignSpaceId(supabase, input.campaignId))

    let knowledgeIndexed = 0
    if (spaceId) {
      await this.ensureSpaceIndexed(supabase, {
        userId: input.userId,
        orgId: input.orgId ?? null,
        spaceId,
      })
      knowledgeIndexed = await this.indexKnowledgeObjects(supabase, {
        userId: input.userId,
        orgId: input.orgId ?? null,
        spaceId,
        campaignId: input.campaignId,
        pageGraderClientId,
        rows: [...seeds, ...sources],
      })
    } else {
      this.logger.warn(
        `Page Grader ingest skipped Campaign Knowledge index — no space for campaign ${input.campaignId}`,
      )
    }

    await this.stampCampaignSync(supabase, campaign, {
      pageGraderClientId,
      uniqueClientId: pageGraderStringValue(
        pkg.envelope?.unique_client_id,
        pkg.unique_client_id,
        pkg.client?.unique_client_id,
      ),
      packageVersion:
        pageGraderStringValue(pkg.envelope?.package_version, pkg.package_version) || '1',
      exportedAt:
        pageGraderStringValue(pkg.envelope?.exported_at, pkg.exported_at) ||
        new Date().toISOString(),
      contentHash,
      status: 'succeeded',
    })

    await this.recordSucceededSyncJob(supabase, {
      userId: input.userId,
      orgId: input.orgId ?? null,
      campaignId: input.campaignId,
      brainId,
      clientName: pageGraderStringValue(campaign.name) || pageGraderClientId,
      pageGraderClientId,
      contentHash,
      memoriesInserted: inserted,
      memoriesSkipped: skipped,
      knowledgeIndexed,
    })

    this.logger.log(
      JSON.stringify({
        feature: 'page_grader_brain_package_ingest',
        campaign_id: input.campaignId,
        brain_id: brainId,
        content_hash: contentHash,
        memories_inserted: inserted,
        memories_skipped: skipped,
        evidence_upserted: evidenceUpserted,
        knowledge_indexed: knowledgeIndexed,
      }),
    )

    return {
      brainId,
      contentHash,
      memoriesInserted: inserted,
      memoriesSkipped: skipped,
      evidenceUpserted,
      knowledgeIndexed,
      skippedUnchanged: false,
    }
  }

  private async loadCampaign(supabase: SupabaseClient, campaignId: string) {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, config, context')
      .eq('id', campaignId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw new BadRequestException(`Could not load campaign: ${error.message}`)
    if (!data) throw new BadRequestException('Campaign not found')
    return data as {
      id: string
      name: string
      config: Record<string, unknown> | null
      context: Record<string, unknown> | null
    }
  }

  private readStoredContentHash(campaign: {
    config: Record<string, unknown> | null
  }): string | null {
    const config = campaign.config && typeof campaign.config === 'object' ? campaign.config : {}
    const external =
      config.external_sources && typeof config.external_sources === 'object'
        ? (config.external_sources as Record<string, unknown>)
        : {}
    const pageGrader =
      external.page_grader && typeof external.page_grader === 'object'
        ? (external.page_grader as Record<string, unknown>)
        : {}
    return pageGraderStringValue(pageGrader.content_hash) || null
  }

  private async resolveBrainId(supabase: SupabaseClient, campaignId: string): Promise<string> {
    const { data, error } = await supabase
      .from('ns_brains')
      .select('id')
      .eq('campaign_id', campaignId)
      .limit(1)
      .maybeSingle()
    if (error) throw new BadRequestException(`Could not load campaign brain: ${error.message}`)
    if (!data?.id) throw new BadRequestException('Campaign brain not found')
    return String(data.id)
  }

  private async upsertMemories(
    supabase: SupabaseClient,
    brainId: string,
    rows: PageGraderMemoryRow[],
  ): Promise<{ inserted: number; skipped: number }> {
    if (rows.length === 0) return { inserted: 0, skipped: 0 }
    const hashes = rows.map((r) => r.content_hash)
    const existing = new Set<string>()
    for (let i = 0; i < hashes.length; i += PAGE_GRADER_MEMORY_BATCH) {
      const chunk = hashes.slice(i, i + PAGE_GRADER_MEMORY_BATCH)
      const { data, error } = await supabase
        .from('ns_memories')
        .select('content_hash')
        .eq('brain_id', brainId)
        .in('content_hash', chunk)
      if (error) throw new BadRequestException(`Could not check memory hashes: ${error.message}`)
      for (const row of data ?? []) {
        if (typeof row.content_hash === 'string') existing.add(row.content_hash)
      }
    }

    const toInsert = rows
      .filter((r) => !existing.has(r.content_hash))
      .map((r) => ({ ...r, brain_id: brainId }))
    let inserted = 0
    for (let i = 0; i < toInsert.length; i += PAGE_GRADER_MEMORY_BATCH) {
      const chunk = toInsert.slice(i, i + PAGE_GRADER_MEMORY_BATCH)
      const { error } = await supabase.from('ns_memories').insert(chunk)
      if (error) throw new BadRequestException(`Could not insert memories: ${error.message}`)
      inserted += chunk.length
    }
    return { inserted, skipped: rows.length - inserted }
  }

  private async upsertEvidence(
    supabase: SupabaseClient,
    brainId: string,
    rows: PageGraderEvidenceRow[],
  ): Promise<number> {
    if (rows.length === 0) return 0
    let upserted = 0
    for (let i = 0; i < rows.length; i += PAGE_GRADER_MEMORY_BATCH) {
      const chunk = rows.slice(i, i + PAGE_GRADER_MEMORY_BATCH).map((r) => ({
        ...r,
        brain_id: brainId,
      }))
      const { error } = await supabase
        .from('ns_brain_evidence_chunks')
        .upsert(chunk, { onConflict: 'brain_id,source_type,source_id,chunk_index' })
      if (error) {
        // Fallback when unique constraint name differs — insert best-effort.
        const { error: insertError } = await supabase.from('ns_brain_evidence_chunks').insert(chunk)
        if (insertError && !insertError.message.toLowerCase().includes('duplicate')) {
          throw new BadRequestException(`Could not upsert evidence: ${insertError.message}`)
        }
      }
      upserted += chunk.length
    }
    return upserted
  }

  private async resolveCampaignSpaceId(
    supabase: SupabaseClient,
    campaignId: string,
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('spaces')
      .select('id, title')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true })
      .limit(20)
    if (error) {
      this.logger.warn(`Could not resolve campaign space: ${error.message}`)
      return null
    }
    const rows = data ?? []
    const general = rows.find(
      (row) =>
        String(row.title ?? '')
          .trim()
          .toLowerCase() === 'general',
    )
    const chosen = general ?? rows[0]
    return chosen?.id ? String(chosen.id) : null
  }

  private async ensureSpaceIndexed(
    supabase: SupabaseClient,
    input: { userId: string; orgId: string | null; spaceId: string },
  ): Promise<void> {
    try {
      await this.spaceRetrievalIndex.indexSource(supabase, {
        sourceType: 'space',
        sourceId: input.spaceId,
        userId: input.userId,
        orgId: input.orgId ?? undefined,
        spaceId: input.spaceId,
        force: true,
      })
    } catch (error) {
      this.logger.warn(
        `Page Grader space hub index failed for ${input.spaceId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }

  private async indexKnowledgeObjects(
    supabase: SupabaseClient,
    input: {
      userId: string
      orgId: string | null
      spaceId: string
      campaignId: string
      pageGraderClientId: string
      rows: PageGraderMemoryRow[]
    },
  ): Promise<number> {
    let indexed = 0
    for (const row of input.rows) {
      const sourceType = resolvePageGraderKnowledgeSourceType({
        memorySourceType: row.source_type,
        sourceTitle: row.source_title,
      })
      const sourceId = `pg:${input.pageGraderClientId}:${row.content_hash.slice(0, 24)}`
      try {
        // Prior dual-write used conversation_document for every row; drop the stale kind.
        if (sourceType !== 'conversation_document') {
          await this.spaceRetrievalIndex.deleteSource(supabase, 'conversation_document', sourceId)
        }
        const result = await this.spaceRetrievalIndex.indexSource(supabase, {
          sourceType,
          sourceId,
          userId: input.userId,
          orgId: input.orgId ?? undefined,
          spaceId: input.spaceId,
          force: true,
          row: {
            id: sourceId,
            title: row.source_title,
            content: row.content,
            space_id: input.spaceId,
            campaign_id: input.campaignId,
            org_id: input.orgId,
            updated_at: new Date().toISOString(),
            metadata: {
              page_grader_client_id: input.pageGraderClientId,
              ingest_kind: 'page_grader_memory',
              content_hash: row.content_hash,
              memory_source_type: row.source_type,
            },
          },
        })
        indexed += result.indexed
      } catch (error) {
        this.logger.warn(
          `Page Grader knowledge index failed for ${sourceId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      }
    }
    return indexed
  }

  private async recordSucceededSyncJob(
    supabase: SupabaseClient,
    input: {
      userId: string
      orgId: string | null
      campaignId: string
      brainId: string
      clientName: string
      pageGraderClientId: string
      contentHash: string
      memoriesInserted: number
      memoriesSkipped: number
      knowledgeIndexed: number
    },
  ) {
    const now = new Date().toISOString()
    const { error } = await supabase.from('brain_import_jobs').insert({
      user_id: input.userId,
      org_id: input.orgId,
      job_type: 'page_grader_brain_sync',
      title: `Page Grader Client Intel - ${input.clientName}`,
      dedupe_key: `page-grader-sync:${input.campaignId}:${input.contentHash}:${now}`,
      payload: {
        campaignId: input.campaignId,
        brainId: input.brainId,
        pageGraderClientId: input.pageGraderClientId,
        contentHash: input.contentHash,
        deterministic: true,
      },
      status: 'succeeded',
      attempts: 1,
      max_attempts: 1,
      next_attempt_at: now,
      result: {
        memories_created: input.memoriesInserted,
        memories_skipped: input.memoriesSkipped,
        knowledge_indexed: input.knowledgeIndexed,
        content_hash: input.contentHash,
      },
      completed_at: now,
      notified_at: now,
    })
    if (error) {
      this.logger.warn(
        `Could not record Page Grader sync job for campaign ${input.campaignId}: ${error.message}`,
      )
    }
  }

  private async stampCampaignSync(
    supabase: SupabaseClient,
    campaign: {
      id: string
      config: Record<string, unknown> | null
      context: Record<string, unknown> | null
    },
    stamp: {
      pageGraderClientId: string
      uniqueClientId: string
      packageVersion: string
      exportedAt: string
      contentHash: string
      status: 'succeeded' | 'failed'
    },
  ) {
    const config = {
      ...(campaign.config && typeof campaign.config === 'object' ? campaign.config : {}),
    }
    const externalSources = {
      ...(config.external_sources && typeof config.external_sources === 'object'
        ? (config.external_sources as Record<string, unknown>)
        : {}),
    }
    externalSources.page_grader = {
      client_id: stamp.pageGraderClientId || null,
      unique_client_id: stamp.uniqueClientId || null,
      package_version: stamp.packageVersion,
      last_exported_at: stamp.exportedAt,
      content_hash: stamp.contentHash,
      last_synced_at: new Date().toISOString(),
      last_sync_status: stamp.status,
    }
    config.source = 'page_grader'
    config.external_sources = externalSources

    const context = {
      ...(campaign.context && typeof campaign.context === 'object' ? campaign.context : {}),
      page_grader_client_id: stamp.pageGraderClientId || null,
      unique_client_id: stamp.uniqueClientId || null,
      roas_brain_package_version: stamp.packageVersion,
      roas_brain_package_exported_at: stamp.exportedAt,
      roas_brain_package_content_hash: stamp.contentHash,
    }

    const { error } = await supabase
      .from('campaigns')
      .update({ config, context })
      .eq('id', campaign.id)
    if (error) throw new BadRequestException(`Could not stamp campaign sync: ${error.message}`)
  }
}
