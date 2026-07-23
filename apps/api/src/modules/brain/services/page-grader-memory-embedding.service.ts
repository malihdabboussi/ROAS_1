import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PageGraderMemoryEmbeddingRepository } from '../repositories/page-grader-memory-embedding.repository'
import { EmbeddingService } from './embedding.service'

type MissingPageGraderMemory = {
  id: string
  content: string
}

export type PageGraderMemoryEmbeddingRepairResult = {
  found: number
  embedded: number
  failed: number
}

const REPAIR_LIMIT = 5_000
const REPAIR_PAGE_SIZE = 1_000
const REPAIR_CONCURRENCY = 6

@Injectable()
export class PageGraderMemoryEmbeddingService {
  private readonly logger = new Logger(PageGraderMemoryEmbeddingService.name)

  constructor(
    private readonly embedding: EmbeddingService,
    private readonly repository: PageGraderMemoryEmbeddingRepository,
  ) {}

  async repairBrain(
    supabase: SupabaseClient,
    input: {
      brainId: string
      userId: string
      orgId: string | null
      limit?: number
    },
  ): Promise<PageGraderMemoryEmbeddingRepairResult> {
    const limit = Math.min(Math.max(input.limit ?? REPAIR_LIMIT, 1), REPAIR_LIMIT)
    const rows = await this.loadMissingMemories(supabase, input.brainId, limit)
    if (rows.length === 0) return { found: 0, embedded: 0, failed: 0 }

    const billingBatch = this.embedding.createEmbeddingBillingBatch({
      userId: input.userId,
      orgId: input.orgId,
    })
    let embedded = 0
    let failed = 0
    try {
      for (let offset = 0; offset < rows.length; offset += REPAIR_CONCURRENCY) {
        const batch = rows.slice(offset, offset + REPAIR_CONCURRENCY)
        const outcomes = await Promise.all(
          batch.map(async (row) => {
            const vector = await this.embedding.getEmbedding(row.content, {
              taskType: 'RETRIEVAL_DOCUMENT',
              billingBatch,
            })
            if (!vector) return false
            const { error: updateError } = await this.repository.updateEmbedding(supabase, {
              memoryId: row.id,
              embedding: `[${vector.join(',')}]`,
            })
            if (updateError) {
              this.logger.warn(
                `Could not persist Page Grader memory embedding ${row.id}: ${updateError.message}`,
              )
              return false
            }
            return true
          }),
        )
        for (const succeeded of outcomes) {
          if (succeeded) embedded += 1
          else failed += 1
        }
      }
    } finally {
      await this.embedding.settleEmbeddingBillingBatch(billingBatch)
    }

    this.logger.log(
      JSON.stringify({
        feature: 'page_grader_memory_embedding_repair',
        brain_id: input.brainId,
        found: rows.length,
        embedded,
        failed,
      }),
    )
    return { found: rows.length, embedded, failed }
  }

  private async loadMissingMemories(
    supabase: SupabaseClient,
    brainId: string,
    limit: number,
  ): Promise<MissingPageGraderMemory[]> {
    const rows: MissingPageGraderMemory[] = []
    for (let offset = 0; offset < limit; offset += REPAIR_PAGE_SIZE) {
      const pageSize = Math.min(REPAIR_PAGE_SIZE, limit - offset)
      const { data, error } = await this.repository.loadMissing(supabase, {
        brainId,
        offset,
        pageSize,
      })
      if (error) {
        throw new BadRequestException(
          `Could not load missing Page Grader embeddings: ${error.message}`,
        )
      }
      const page = (data ?? []) as MissingPageGraderMemory[]
      rows.push(...page)
      if (page.length < pageSize) break
    }
    return rows
  }
}
