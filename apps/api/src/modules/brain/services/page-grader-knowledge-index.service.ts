import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SpaceRetrievalIndexService } from '../../space-retrieval/services/space-retrieval-index.service'
import { EmbeddingService } from './embedding.service'
import {
  resolvePageGraderKnowledgeSourceType,
  type PageGraderMemoryRow,
} from './page-grader-brain-package-build'

const INDEX_CONCURRENCY = 6
const BILLING_BATCH_SIZE = 250

@Injectable()
export class PageGraderKnowledgeIndexService {
  private readonly logger = new Logger(PageGraderKnowledgeIndexService.name)

  constructor(
    @Inject(forwardRef(() => SpaceRetrievalIndexService))
    private readonly spaceRetrievalIndex: SpaceRetrievalIndexService,
    private readonly embedding: EmbeddingService,
  ) {}

  async index(
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
    for (
      let billingOffset = 0;
      billingOffset < input.rows.length;
      billingOffset += BILLING_BATCH_SIZE
    ) {
      const billingRows = input.rows.slice(billingOffset, billingOffset + BILLING_BATCH_SIZE)
      const billingBatch = this.embedding.createEmbeddingBillingBatch({
        userId: input.userId,
        orgId: input.orgId,
      })
      try {
        for (let offset = 0; offset < billingRows.length; offset += INDEX_CONCURRENCY) {
          const batch = billingRows.slice(offset, offset + INDEX_CONCURRENCY)
          const batchCounts = await Promise.all(
            batch.map((row) => this.indexRow(supabase, input, row, billingBatch)),
          )
          indexed += batchCounts.reduce((total, count) => total + count, 0)
        }
      } finally {
        await this.embedding.settleEmbeddingBillingBatch(billingBatch)
      }
    }
    return indexed
  }

  private async indexRow(
    supabase: SupabaseClient,
    input: {
      userId: string
      orgId: string | null
      spaceId: string
      campaignId: string
      pageGraderClientId: string
    },
    row: PageGraderMemoryRow,
    billingBatch: ReturnType<EmbeddingService['createEmbeddingBillingBatch']>,
  ): Promise<number> {
    const sourceType = resolvePageGraderKnowledgeSourceType({
      memorySourceType: row.source_type,
      sourceTitle: row.source_title,
    })
    const sourceId = `pg:${input.pageGraderClientId}:${row.content_hash.slice(0, 24)}`
    try {
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
        billingBatch,
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
      return result.indexed
    } catch (error) {
      this.logger.warn(
        `Page Grader knowledge index failed for ${sourceId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
      return 0
    }
  }
}
