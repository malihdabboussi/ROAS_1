import { ForbiddenException, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  SupabaseServiceClient,
  type BrainRetrievalCandidate,
  type BrainRetrievalSearchResult,
  type BrainSearchFamily,
  type RequestScope,
} from '@vibey/api-shared'
import { BrainEvalProbeRepository } from '../repositories/brain-eval-probe.repository'
import { BrainContextService } from './brain-context.service'
import { BrainRetrievalService } from './brain-retrieval.service'

export type EvalProbeBody = {
  query: string
  agentKey?: string
  limit?: number
  phrases?: string[]
}

type EvalProbeFamilyResult = {
  count: number
  context_sufficient: boolean
  candidates: BrainRetrievalCandidate[]
  missing: string[]
}

type GroundTruthCounts = {
  in_memories: number
  in_cortex: number
  in_pages: number
  total: number
}

export type EvalProbeResponse = {
  preloadText: string
  preloadTextLength: number
  perFamily: Record<BrainSearchFamily, EvalProbeFamilyResult | null>
  groundTruth?: Record<string, GroundTruthCounts>
  brainIdsScanned?: string[]
  latencyMs: number
}

const ENABLE_FLAG = 'BRAIN_EVAL_PROBE_ENABLED'

const ALLOWED_CONFIG_KEYS = new Set<string>([
  'BRAIN_LLM_RERANKER',
  'BRAIN_LLM_RERANKER_MODEL',
  'BRAIN_MULTI_QUERY_RETRIEVAL',
  'BRAIN_EVIDENCE_CHUNKS',
])

@Injectable()
export class BrainEvalProbeService {
  private readonly logger = new Logger(BrainEvalProbeService.name)

  constructor(
    private readonly brainContext: BrainContextService,
    private readonly retrieval: BrainRetrievalService,
    private readonly svc: SupabaseServiceClient,
    private readonly repository: BrainEvalProbeRepository = new BrainEvalProbeRepository(),
  ) {}

  async configure(body: { env?: Record<string, string | null> }): Promise<{
    applied: Record<string, string | null>
    current: Record<string, string | undefined>
  }> {
    this.assertEnabled()
    const applied: Record<string, string | null> = {}
    for (const [key, value] of Object.entries(body?.env ?? {})) {
      if (!ALLOWED_CONFIG_KEYS.has(key)) {
        this.logger.warn(`configure: refusing to set non-allowed key "${key}"`)
        continue
      }
      if (value === null) {
        delete process.env[key]
        applied[key] = null
      } else {
        process.env[key] = String(value)
        applied[key] = String(value)
      }
    }
    const current: Record<string, string | undefined> = {}
    for (const key of ALLOWED_CONFIG_KEYS) {
      current[key] = process.env[key]
    }
    this.logger.log(`[brain-eval] runtime config updated: ${JSON.stringify(applied)}`)
    return { applied, current }
  }

  async probe(
    body: EvalProbeBody,
    user: { id: string; email: string },
    userSupabase: SupabaseClient,
    scope: RequestScope,
  ): Promise<EvalProbeResponse> {
    this.assertEnabled()
    if (!body?.query || typeof body.query !== 'string') {
      throw new ForbiddenException('query is required')
    }
    const query = body.query.trim()
    const agentKey = body.agentKey ?? 'vibey'
    const orgId = scope.orgId ?? null
    const startedAt = Date.now()

    const families: BrainSearchFamily[] = ['user', 'agent', 'customer', 'company']
    const perFamily = {} as Record<BrainSearchFamily, EvalProbeFamilyResult | null>

    const phrases = Array.isArray(body.phrases)
      ? body.phrases.filter(
          (item): item is string => typeof item === 'string' && item.trim().length > 0,
        )
      : []

    const brainIdsPromise =
      phrases.length > 0 ? this.resolveBrainIds(user.id, orgId) : Promise.resolve([])

    const [preloadText, brainIds, ...familyResults] = await Promise.all([
      this.brainContext
        .buildFullContext(user.id, agentKey, query, orgId, false, true, false)
        .catch((err) => {
          this.logger.warn(`buildFullContext failed: ${err}`)
          return ''
        }),
      brainIdsPromise,
      ...families.map((family) =>
        this.searchFamily(family, query, user.id, orgId, agentKey, userSupabase, body.limit),
      ),
    ])

    for (let i = 0; i < families.length; i += 1) {
      perFamily[families[i]!] = familyResults[i] ?? null
    }

    const groundTruth =
      phrases.length > 0 ? await this.groundTruthCheck(phrases, orgId, brainIds) : undefined

    return {
      preloadText,
      preloadTextLength: preloadText.length,
      perFamily,
      groundTruth,
      brainIdsScanned: phrases.length > 0 ? brainIds : undefined,
      latencyMs: Date.now() - startedAt,
    }
  }

  private assertEnabled(): void {
    if (process.env[ENABLE_FLAG]?.trim() !== '1') {
      throw new ForbiddenException(`Probe disabled. Set ${ENABLE_FLAG}=1 to enable.`)
    }
  }

  private async resolveBrainIds(userId: string, orgId: string | null): Promise<string[]> {
    try {
      const { data, error } = await this.repository.listBrainIds(this.svc.client, {
        userId,
        orgId,
      })
      if (error) {
        this.logger.warn(`resolveBrainIds failed: ${error.message}`)
        return []
      }
      return (data ?? [])
        .map((row) => (typeof row.id === 'string' ? row.id : null))
        .filter((id): id is string => id != null)
    } catch (err) {
      this.logger.warn(`resolveBrainIds threw: ${err}`)
      return []
    }
  }

  private async groundTruthCheck(
    phrases: string[],
    orgId: string | null,
    brainIds: string[],
  ): Promise<Record<string, GroundTruthCounts>> {
    const result: Record<string, GroundTruthCounts> = {}
    await Promise.all(
      phrases.map(async (phrase) => {
        const trimmed = phrase.trim()
        if (!trimmed) {
          result[phrase] = { in_memories: 0, in_cortex: 0, in_pages: 0, total: 0 }
          return
        }
        const pattern = `%${trimmed.replace(/[%_]/g, '\\$&')}%`
        const countMemories = async (): Promise<number> => {
          try {
            return this.repository.countMemoriesContaining(this.svc.client, { brainIds, pattern })
          } catch (err) {
            this.logger.warn(`groundTruth memories failed for "${trimmed}": ${err}`)
            return 0
          }
        }
        const countCortex = async (): Promise<number> => {
          try {
            return this.repository.countCompanyCortexContaining(this.svc.client, {
              orgId,
              pattern,
            })
          } catch (err) {
            this.logger.warn(`groundTruth cortex failed for "${trimmed}": ${err}`)
            return 0
          }
        }
        const countPages = async (): Promise<number> => {
          try {
            return this.repository.countNarrativePagesContaining(this.svc.client, {
              brainIds,
              pattern,
            })
          } catch (err) {
            this.logger.warn(`groundTruth pages failed for "${trimmed}": ${err}`)
            return 0
          }
        }
        const [memories, cortex, pages] = await Promise.all([
          countMemories(),
          countCortex(),
          countPages(),
        ])
        result[phrase] = {
          in_memories: memories,
          in_cortex: cortex,
          in_pages: pages,
          total: memories + cortex + pages,
        }
      }),
    )
    return result
  }

  private async searchFamily(
    family: BrainSearchFamily,
    query: string,
    userId: string,
    orgId: string | null,
    agentKey: string,
    userSupabase: SupabaseClient,
    limit?: number,
  ): Promise<EvalProbeFamilyResult | null> {
    try {
      const result: BrainRetrievalSearchResult = await this.retrieval.search({
        supabase: this.svc.client,
        userClient: userSupabase,
        family,
        query,
        userId,
        orgId,
        requiredAccess: 'query',
        agentKey,
        limit: Math.min(Math.max(limit ?? 20, 1), 50),
      })
      return {
        count: result.count,
        context_sufficient: result.context_sufficient,
        candidates: result.results,
        missing: result.missing,
      }
    } catch (err) {
      this.logger.warn(`probe search ${family} failed: ${err}`)
      return null
    }
  }
}
