import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { BrainRuntimeRepository } from '../repositories/brain-runtime.repository'
import { EmbeddingService } from './embedding.service'

const BELIEF_LIMIT = 6
const PERSPECTIVE_LIMIT = 3
const TENSION_LIMIT = 5
const SPOTLIGHT_PAGE_LIMIT = 2
const WIKI_MATCH_THRESHOLD = 0.3

interface BeliefRow {
  id: string
  pattern_name: string
  description: string | null
  strength: number
  status: string
  supporting_memories?: string[]
  emotional_signature?: Record<string, unknown>
  updated_at?: string
}

interface PerspectiveRow {
  id: string
  name: string
  description: string | null
  strength: number
  status: string
  blind_spots?: string | null
  influence_areas?: string[]
  updated_at?: string
}

interface SpotlightPageRow {
  title: string
  content_md?: string
  summary?: string | null
}

@Injectable()
export class BrainSpotlightService {
  private readonly logger = new Logger(BrainSpotlightService.name)
  private readonly supabase: SupabaseClient

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly embedding: EmbeddingService,
    private readonly repository: BrainRuntimeRepository,
  ) {
    this.supabase = svc.client
  }

  async buildSpotlightContext(
    userId: string,
    query?: string,
    orgId?: string | null,
    precomputedEmbedding?: number[] | null,
  ): Promise<string> {
    try {
      return await this.buildUserContext(userId, query, orgId, precomputedEmbedding)
    } catch (err) {
      this.logger.warn(`Spotlight context failed: ${err}`)
      return ''
    }
  }

  async buildBrainSpotlightContext(
    brainId: string,
    heading: string,
    query?: string,
    userId?: string,
    orgId?: string | null,
    precomputedEmbedding?: number[] | null,
  ): Promise<string> {
    try {
      return await this.buildContextForBrain(
        brainId,
        heading,
        query,
        userId,
        orgId,
        precomputedEmbedding,
      )
    } catch (err) {
      this.logger.warn(`Brain spotlight context failed: ${err}`)
      return ''
    }
  }

  private async buildUserContext(
    userId: string,
    query?: string,
    orgId?: string | null,
    precomputedEmbedding?: number[] | null,
  ): Promise<string> {
    const { data: brain } = await this.repository.findDefaultSpotlightBrain(this.supabase, userId)
    if (!brain?.id) return ''

    return this.buildContextForBrain(
      brain.id,
      'SPOTLIGHT — active identity context for this turn:',
      query,
      userId,
      orgId,
      precomputedEmbedding,
      brain.cortex_max === true,
    )
  }

  private async buildContextForBrain(
    brainId: string,
    heading: string,
    query?: string,
    userId?: string,
    orgId?: string | null,
    precomputedEmbedding?: number[] | null,
    cortexMax?: boolean,
  ): Promise<string> {
    const brain =
      cortexMax === undefined
        ? await this.repository
            .findBrainCortexFlag(this.supabase, brainId)
            .then((r) => r.data)
        : { cortex_max: cortexMax }

    const trimmedQuery = query?.trim()
    const embedding =
      trimmedQuery && precomputedEmbedding !== undefined
        ? precomputedEmbedding
        : trimmedQuery
          ? await this.embedding.getEmbedding(trimmedQuery, {
              taskType: 'RETRIEVAL_QUERY',
              ...(userId ? { billing: { userId, orgId } } : {}),
            })
          : null

    const [perspectivesRes, beliefsRes, tensionsRes, pagesRes] = await Promise.all([
      this.repository.listSpotlightPerspectives<PerspectiveRow>(this.supabase, {
        brainId,
        limit: PERSPECTIVE_LIMIT,
      }),
      this.repository.listSpotlightBeliefs<BeliefRow>(this.supabase, {
        brainId,
        limit: BELIEF_LIMIT,
      }),
      this.repository.listSpotlightTensions<BeliefRow>(this.supabase, {
        brainId,
        limit: TENSION_LIMIT,
      }),
      brain?.cortex_max === true && embedding
        ? this.repository.searchSpotlightNarrativePages<SpotlightPageRow>(this.supabase, {
            brainId,
            embedding,
            threshold: WIKI_MATCH_THRESHOLD,
            count: SPOTLIGHT_PAGE_LIMIT,
          })
        : Promise.resolve({ data: null, error: null }),
    ])

    return this.formatSpotlight({
      heading,
      perspectives: (perspectivesRes.data ?? []) as PerspectiveRow[],
      beliefs: (beliefsRes.data ?? []) as BeliefRow[],
      tensions: (tensionsRes.data ?? []) as BeliefRow[],
      pages: (pagesRes.data ?? []) as SpotlightPageRow[],
    })
  }

  private formatSpotlight(input: {
    heading: string
    perspectives: PerspectiveRow[]
    beliefs: BeliefRow[]
    tensions: BeliefRow[]
    pages: SpotlightPageRow[]
  }): string {
    const { heading, perspectives, beliefs, tensions, pages } = input
    if (!perspectives.length && !beliefs.length && !tensions.length && !pages.length) return ''

    const parts: string[] = [heading]
    if (perspectives.length) {
      parts.push('\nActive perspectives:')
      for (const p of perspectives) {
        const blindSpot = p.blind_spots ? ` Blind spot: ${p.blind_spots}` : ''
        parts.push(
          `- ${p.name} (${Math.round((p.strength ?? 0) * 100)}%): ${p.description ?? ''}${blindSpot}`,
        )
      }
    }
    if (beliefs.length) {
      parts.push('\nCore beliefs:')
      for (const b of beliefs) {
        const memoryCount = Array.isArray(b.supporting_memories) ? b.supporting_memories.length : 0
        const status = b.status === 'challenged' ? 'CHALLENGED' : b.status
        parts.push(
          `- ${b.pattern_name} (${status}, ${Math.round((b.strength ?? 0) * 100)}%, ${memoryCount} supporting memories): ${b.description ?? ''}`,
        )
      }
    }
    if (tensions.length) {
      parts.push('\nCurrent tensions:')
      for (const t of tensions) {
        parts.push(`- ${t.pattern_name}: ${t.description ?? 'This belief has been challenged.'}`)
      }
    }
    if (pages.length) {
      parts.push('\nRelevant Cortex pages:')
      for (const p of pages) {
        parts.push(`- ${p.title}: ${p.summary ?? String(p.content_md ?? '').slice(0, 500)}`)
      }
    }
    return parts.join('\n')
  }
}
