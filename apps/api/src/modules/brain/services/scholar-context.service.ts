import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ScholarContextRepository } from '../repositories/scholar-context.repository'
import { EmbeddingService, type BrainGeminiBillingContext } from './embedding.service'

interface ExtractionContext {
  relatedMemories: Array<{ content: string; memory_type: string; significance: number }>
  brainStats: { totalMemories: number; totalSkEntries: number; topDomains: string[] }
  sourceType: string
}

@Injectable()
export class ScholarContextService {
  private readonly logger = new Logger(ScholarContextService.name)

  constructor(
    private readonly embedding: EmbeddingService,
    private readonly scholarContextRepository: ScholarContextRepository,
  ) {}

  async gatherExtractionContext(
    supabase: SupabaseClient,
    userId: string,
    contentPreview: string,
    sourceType: string = 'document',
    orgId?: string | null,
  ): Promise<ExtractionContext> {
    const billing: BrainGeminiBillingContext = { userId, orgId }
    const [relatedMemories, brainStats] = await Promise.all([
      this.fetchRelatedMemories(supabase, userId, contentPreview, billing),
      this.fetchBrainStats(supabase, userId),
    ])
    return { relatedMemories, brainStats, sourceType }
  }

  buildContextBlock(ctx: ExtractionContext): string {
    const lines: string[] = []
    lines.push(`## User Brain Context`)
    lines.push(`Source type: ${ctx.sourceType}`)
    lines.push(
      `Brain size: ${ctx.brainStats.totalMemories} memories, ${ctx.brainStats.totalSkEntries} SK entries`,
    )
    if (ctx.brainStats.topDomains.length > 0) {
      lines.push(`Top domains: ${ctx.brainStats.topDomains.join(', ')}`)
    }
    if (ctx.relatedMemories.length > 0) {
      lines.push(`\n### Related existing knowledge (avoid duplicating these):`)
      for (const mem of ctx.relatedMemories) {
        lines.push(`- [${mem.memory_type}] ${mem.content.slice(0, 200)}`)
      }
    }
    return lines.join('\n')
  }

  private async fetchRelatedMemories(
    supabase: SupabaseClient,
    userId: string,
    contentPreview: string,
    billing?: BrainGeminiBillingContext,
  ): Promise<Array<{ content: string; memory_type: string; significance: number }>> {
    try {
      const preview = contentPreview.slice(0, 500)
      const vector = await this.embedding.getEmbedding(preview, {
        taskType: 'RETRIEVAL_QUERY',
        billing,
      })
      if (!vector) return []
      const data = await this.scholarContextRepository.searchRelatedMemories(
        supabase,
        userId,
        vector,
      )
      return (data ?? []).map((row: Record<string, unknown>) => ({
        content: String(row.content ?? ''),
        memory_type: String(row.memory_type ?? 'fact'),
        significance: Number(row.significance ?? 0),
      }))
    } catch (err) {
      this.logger.warn(`Failed to fetch related memories: ${err}`)
      return []
    }
  }

  private async fetchBrainStats(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{ totalMemories: number; totalSkEntries: number; topDomains: string[] }> {
    try {
      const stats = await this.scholarContextRepository.loadBrainStats(supabase, userId)
      const domainCounts = new Map<string, number>()
      for (const domain of stats.domains) {
        domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1)
      }
      const topDomains = [...domainCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([domain]) => domain)
      return {
        totalMemories: stats.totalMemories,
        totalSkEntries: stats.totalSkEntries,
        topDomains,
      }
    } catch (err) {
      this.logger.warn(`Failed to fetch brain stats: ${err}`)
      return { totalMemories: 0, totalSkEntries: 0, topDomains: [] }
    }
  }
}
