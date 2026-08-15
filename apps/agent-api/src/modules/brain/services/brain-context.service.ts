import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveUserBrainSearchQuery } from '@vibey/agent-policy'
import { SupabaseServiceClient } from '@vibey/api-shared'
import type { BrainSearchFamily } from '../../agent-policy/agent-policy.types'
import { AgentPolicyService } from '../../agent-policy/services/agent-policy.service'
import { BrainContextRepository } from '../repositories/brain-context.repository'
import {
  BrainContextSupportService,
  INSUFFICIENT_CONTEXT_STATUS,
  MEMORY_LIMIT,
  PRELOAD_RETRIEVAL_LIMIT,
  SK_LIMIT,
  SNAPSHOT_LIMIT,
  sortByRecency,
  WIKI_MATCH_THRESHOLD,
  WIKI_PAGE_LIMIT,
  type BrainContextTimingMeta,
  type MemoryRow,
  type PrecomputedEmbedding,
  type SkRow,
  type SnapshotRow,
} from './brain-context-support.service'
import { BrainRetrievalService } from './brain-retrieval.service'
import { BrainSpotlightService } from './brain-spotlight.service'
import { CompanyContextCompilerService } from './company-context-compiler.service'
import { EmbeddingService } from './embedding.service'

const WIKI_AGENT_KEYS = new Set(['atlas', 'brain_scholar'])
@Injectable()
export class BrainContextService {
  private readonly logger = new Logger(BrainContextService.name)
  private readonly supabase: SupabaseClient
  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly embedding: EmbeddingService,
    private readonly spotlight: BrainSpotlightService,
    private readonly companyContext: CompanyContextCompilerService,
    private readonly agentPolicy?: AgentPolicyService,
    private readonly retrieval?: BrainRetrievalService,
    private readonly repository: BrainContextRepository = new BrainContextRepository(),
    private readonly support: BrainContextSupportService = new BrainContextSupportService(
      svc,
      embedding,
      companyContext,
      repository,
    ),
  ) {
    this.supabase = svc.client
  }
  async buildUserBrainContext(
    userId: string,
    agentKey?: string,
    query?: string,
    orgId?: string | null,
    precomputedEmbedding?: PrecomputedEmbedding,
  ): Promise<string> {
    const trimmedQuery = resolveUserBrainSearchQuery(query?.trim())
    if (trimmedQuery && this.retrieval) {
      return this.support
        .buildRetrievalContext({
          retrieval: this.retrieval,
          family: 'user',
          heading: 'USER BRAIN — Retrieved Context:',
          userId,
          orgId,
          query: trimmedQuery,
          embedding:
            trimmedQuery === query?.trim()
              ? this.support.retrievalEmbeddingInput(precomputedEmbedding)
              : undefined,
          limit: PRELOAD_RETRIEVAL_LIMIT,
        })
        .catch((err) => {
          this.logger.warn(`User brain retrieval context failed: ${err}`)
          return INSUFFICIENT_CONTEXT_STATUS
        })
    }
    const brainId = this.retrieval
      ? await this.retrieval.resolveUserBrainId(this.supabase, userId, orgId)
      : await this.resolveUserBrainIdLegacy(userId, orgId)
    if (!brainId) return ''
    const useSemantic = !!trimmedQuery
    const billing = { userId, orgId }
    let memories: MemoryRow[]
    let directSnapshots: SnapshotRow[]
    let graphSnapshots: SnapshotRow[]
    if (useSemantic) {
      const embedding = await this.support.getQueryEmbedding(
        trimmedQuery,
        billing,
        precomputedEmbedding,
      )
      if (embedding) {
        const embeddingStr = `[${embedding.join(',')}]`
        const [memRes, snapRes] = await Promise.all([
          this.repository.searchUserMemories(this.supabase, {
            brainId,
            embedding: embeddingStr,
            limit: MEMORY_LIMIT,
          }),
          this.repository.findSimilarSnapshots(this.supabase, {
            brainId,
            embedding: embeddingStr,
            limit: Math.max(SNAPSHOT_LIMIT, 8),
          }),
        ])
        const memIds = ((memRes.data ?? []) as Array<{ id: string }>).map((r) => r.id)
        memories =
          memIds.length > 0 ? await this.support.fetchMemoriesWithRecency(memIds, brainId) : []
        const semanticSeeds = (
          (snapRes.data ?? []) as Array<{ id: string; similarity: number }>
        ).map((r) => ({ id: r.id, score: Number(r.similarity ?? 0) }))
        ;({ direct: directSnapshots, graph: graphSnapshots } =
          await this.support.expandSnapshotsWithGraph(brainId, semanticSeeds))
      } else {
        memories = await this.support.fetchUserBrainTopNMemories(brainId)
        directSnapshots = await this.support.fetchUserBrainTopNSnapshots(brainId)
        graphSnapshots = []
      }
    } else {
      memories = await this.support.fetchUserBrainTopNMemories(brainId)
      directSnapshots = await this.support.fetchUserBrainTopNSnapshots(brainId)
      graphSnapshots = []
    }
    memories.sort(sortByRecency)
    const parts: string[] = []
    if (memories.length) {
      parts.push('USER BRAIN — Key Memories:')
      for (const m of memories) {
        parts.push(`- [${m.memory_type}] ${m.content}`)
      }
    }

    this.support.appendSnapshotSections(parts, 'USER BRAIN', directSnapshots, graphSnapshots)

    if (parts.length === 0) return ''

    this.logger.debug(
      `Injected user brain context: ${memories.length} memories, ${directSnapshots.length} direct snapshots, ${graphSnapshots.length} graph snapshots${useSemantic ? ' (semantic+graph)' : ''}`,
    )
    return parts.join('\n')
  }

  async buildAgentBrainContext(
    userId: string,
    agentKey: string,
    query?: string,
    orgId?: string | null,
    precomputedEmbedding?: PrecomputedEmbedding,
  ): Promise<string> {
    const { brainId } = await this.resolveAgentBrainPresence(userId, agentKey, orgId)

    if (!brainId) return ''

    const trimmedQuery = query?.trim()
    if (trimmedQuery && this.retrieval) {
      return this.support
        .buildRetrievalContext({
          retrieval: this.retrieval,
          family: 'agent',
          heading: 'AGENT BRAIN — Retrieved Context:',
          brainId,
          userId,
          orgId,
          query: trimmedQuery,
          agentKey,
          embedding: this.support.retrievalEmbeddingInput(precomputedEmbedding),
          limit: PRELOAD_RETRIEVAL_LIMIT,
        })
        .catch((err) => {
          this.logger.warn(`Agent brain retrieval context failed: ${err}`)
          return INSUFFICIENT_CONTEXT_STATUS
        })
    }

    const useSemantic = !!trimmedQuery
    const billing = { userId, orgId }

    let skEntries: SkRow[]
    let directSnapshots: SnapshotRow[]
    let graphSnapshots: SnapshotRow[]

    if (useSemantic) {
      const embedding = await this.support.getQueryEmbedding(
        trimmedQuery,
        billing,
        precomputedEmbedding,
      )
      if (embedding) {
        const embeddingStr = `[${embedding.join(',')}]`
        const [skRes, snapRes] = await Promise.all([
          this.repository.searchSkEntries(this.supabase, {
            brainId,
            embedding: embeddingStr,
            limit: SK_LIMIT,
          }),
          this.repository.findSimilarSnapshots(this.supabase, {
            brainId,
            embedding: embeddingStr,
            limit: Math.max(SNAPSHOT_LIMIT, 8),
          }),
        ])

        const skIds = ((skRes.data ?? []) as Array<{ id: string }>).map((r) => r.id)
        skEntries = skIds.length > 0 ? await this.support.fetchSkWithRecency(skIds, brainId) : []

        const semanticSeeds = (
          (snapRes.data ?? []) as Array<{ id: string; similarity: number }>
        ).map((r) => ({ id: r.id, score: Number(r.similarity ?? 0) }))
        ;({ direct: directSnapshots, graph: graphSnapshots } =
          await this.support.expandSnapshotsWithGraph(brainId, semanticSeeds))
      } else {
        skEntries = await this.support.fetchAgentBrainTopNSk(brainId)
        directSnapshots = await this.support.fetchAgentBrainTopNSnapshots(brainId)
        graphSnapshots = []
      }
    } else {
      skEntries = await this.support.fetchAgentBrainTopNSk(brainId)
      directSnapshots = await this.support.fetchAgentBrainTopNSnapshots(brainId)
      graphSnapshots = []
    }

    skEntries.sort(sortByRecency)

    const parts: string[] = []

    if (skEntries.length) {
      parts.push('AGENT BRAIN — Specific Knowledge:')
      for (const e of skEntries) {
        const domainTag = e.domain ? ` [${e.domain}]` : ''
        parts.push(`- [${e.entry_type}]${domainTag} ${e.title}: ${e.content}`)
      }
    }

    const spotlightEmbedding = await this.support.resolvePrecomputedEmbedding(precomputedEmbedding)
    const spotlightContext = await this.spotlight.buildBrainSpotlightContext(
      brainId,
      `AGENT SPOTLIGHT — ${agentKey}'s active Cortex for this turn:`,
      query,
      userId,
      orgId,
      spotlightEmbedding,
    )
    if (spotlightContext) parts.unshift(spotlightContext)

    this.support.appendSnapshotSections(parts, 'AGENT BRAIN', directSnapshots, graphSnapshots)

    if (parts.length === 0) return ''

    this.logger.debug(
      `Injected agent brain context for ${agentKey}: ${skEntries.length} SK entries, ${directSnapshots.length} direct snapshots, ${graphSnapshots.length} graph snapshots${useSemantic ? ' (semantic+graph)' : ''}`,
    )
    return parts.join('\n')
  }

  async resolveAgentBrainPresence(
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<{ hasAgentBrain: boolean; brainId: string | null }> {
    const { data: addon } = await this.repository.findActiveAgentAddonBrainId(this.supabase, {
      userId,
      agentKey,
      orgId,
    })
    let brainId = typeof addon?.brain_id === 'string' && addon.brain_id ? addon.brain_id : null

    if (!brainId) {
      const { data: brain } = await this.repository.findAgentBrainId(this.supabase, {
        userId,
        agentKey,
        orgId,
      })
      brainId = typeof brain?.id === 'string' && brain.id ? brain.id : null
    }

    return { hasAgentBrain: brainId != null, brainId }
  }

  async buildWikiContext(
    userId: string,
    query?: string,
    orgId?: string | null,
    precomputedEmbedding?: PrecomputedEmbedding,
  ): Promise<string> {
    const brainId = this.retrieval
      ? await this.retrieval.resolveUserBrainId(this.supabase, userId, orgId)
      : await this.resolveUserBrainIdLegacy(userId, orgId)
    if (!brainId) return ''

    const { data: brainMeta } = await this.repository.findBrainCortexFlag(this.supabase, brainId)
    if (brainMeta?.cortex_max !== true) return ''

    const trimmedQuery = query?.trim()
    const billing = { userId, orgId }
    const embedding = trimmedQuery
      ? await this.support.getQueryEmbedding(trimmedQuery, billing, precomputedEmbedding)
      : null

    const [capsuleRes, indexRes, searchRes] = await Promise.all([
      this.repository.findCapsuleNarrativePage(this.supabase, brainId),
      this.repository.listNarrativePageIndex(this.supabase, brainId),
      embedding
        ? this.repository.searchNarrativePages(this.supabase, {
            brainId,
            embedding: `[${embedding.join(',')}]`,
            threshold: WIKI_MATCH_THRESHOLD,
            count: WIKI_PAGE_LIMIT,
          })
        : Promise.resolve({ data: null, error: null }),
    ])

    const capsule = capsuleRes.data?.content_md ?? null
    const indexPages = (indexRes.data ?? []) as Array<{
      slug: string
      title: string
      page_type: string
      summary: string | null
    }>
    const matchedPages = (searchRes.data ?? []) as Array<{
      slug: string
      title: string
      content_md: string
      similarity: number
    }>

    if (!capsule && indexPages.length === 0 && matchedPages.length === 0) return ''

    const parts: string[] = []

    if (capsule) {
      parts.push('BRAIN CAPSULE:')
      parts.push(capsule)
    }

    if (indexPages.length > 0) {
      parts.push('\nBRAIN LIBRARY INDEX:')
      for (const p of indexPages) {
        const summary = p.summary ? ` — ${p.summary}` : ''
        parts.push(`- [${p.page_type}] ${p.title}${summary}`)
      }
    }

    if (matchedPages.length > 0) {
      parts.push('\nRELEVANT PAGES:')
      for (const p of matchedPages) {
        parts.push(`\n### ${p.title}`)
        parts.push(p.content_md)
      }
    }

    this.logger.debug(
      `Injected wiki context: capsule=${!!capsule}, index=${indexPages.length} pages, matched=${matchedPages.length} pages`,
    )
    return parts.join('\n')
  }

  async buildFullContext(
    userId: string,
    agentKey?: string,
    query?: string,
    orgId?: string | null,
    skipUserBrain?: boolean,
    userBrainAccess?: boolean,
    useWikiContext?: boolean,
  ): Promise<string> {
    const fullContextStartedAt = Date.now()
    let allowedFamilies: Set<BrainSearchFamily> | null = null
    if (agentKey && typeof this.agentPolicy?.listAllowedBrainSearchFamilies === 'function') {
      try {
        const scope = { orgId: orgId ?? null, userId: orgId ? null : userId }
        allowedFamilies = new Set(
          await this.agentPolicy.listAllowedBrainSearchFamilies(agentKey, scope),
        )
      } catch (err) {
        this.logger.warn(`brain family policy resolve failed: ${err}`)
        allowedFamilies = new Set<BrainSearchFamily>(['agent'])
      }
    }
    const canUseFamily = (family: BrainSearchFamily): boolean =>
      allowedFamilies ? allowedFamilies.has(family) : true
    let hasUserBrainAccess = !skipUserBrain
    if (hasUserBrainAccess && userBrainAccess !== undefined) {
      hasUserBrainAccess = userBrainAccess
    } else if (hasUserBrainAccess && agentKey) {
      if (this.agentPolicy) {
        try {
          hasUserBrainAccess = await this.agentPolicy.canAgentUseCapability(
            agentKey,
            'brain_access',
            'personal',
            { orgId: orgId ?? null, userId: orgId ? null : userId },
          )
        } catch (err) {
          this.logger.warn(`brain_access policy resolve failed: ${err}`)
          hasUserBrainAccess = false
        }
      } else {
        hasUserBrainAccess = false
      }
    }
    hasUserBrainAccess = hasUserBrainAccess && canUseFamily('user')
    const canUseCompanyBrain = canUseFamily('company')
    const canUseAgentBrain = !!agentKey && canUseFamily('agent')
    const canUseCustomerBrain = canUseFamily('customer')

    const trimmedQuery = query?.trim()
    const timingMeta: BrainContextTimingMeta = {
      userId,
      orgId: orgId ?? null,
      agentKey,
      queryChars: trimmedQuery?.length ?? 0,
      useWikiContext,
    }
    this.logContextTiming('full_context_start', timingMeta, 0, {
      skip_user_brain: skipUserBrain === true,
      requested_user_brain_access:
        userBrainAccess === undefined ? 'unspecified' : userBrainAccess === true,
      effective_user_brain_access: hasUserBrainAccess,
      allowed_brain_families: allowedFamilies ? Array.from(allowedFamilies) : 'unscoped',
    })

    let precomputedEmbedding: Promise<number[] | null> | undefined
    const billing = { userId, orgId }
    if (
      trimmedQuery &&
      (hasUserBrainAccess || canUseAgentBrain || canUseCompanyBrain || canUseCustomerBrain)
    ) {
      precomputedEmbedding = this.support.timeContextPart(
        'precompute_embedding',
        timingMeta,
        () =>
          this.embedding.getEmbedding(trimmedQuery, {
            taskType: 'RETRIEVAL_QUERY',
            billing,
          }),
        (embedding) => ({
          embedding_present: Array.isArray(embedding),
          dimensions: Array.isArray(embedding) ? embedding.length : 0,
        }),
      )
    }

    const wikiEligible = useWikiContext || (agentKey != null && WIKI_AGENT_KEYS.has(agentKey))
    const useRetrievalContext = !!trimmedQuery && !!this.retrieval

    const [companyContext, spotlightContext, userContext, agentContext, customerContext] =
      await Promise.all([
        this.support.timeContextPart(
          'company_context',
          timingMeta,
          () =>
            canUseCompanyBrain
              ? this.support.buildCompanyBrainContext({
                  retrieval: this.retrieval,
                  userId,
                  query,
                  orgId,
                  agentKey,
                  precomputedEmbedding,
                })
              : Promise.resolve(''),
          (value) => this.support.contextStringTiming(value),
        ),
        hasUserBrainAccess && !useRetrievalContext
          ? this.support.timeContextPart(
              'spotlight_context',
              timingMeta,
              () =>
                this.support
                  .resolvePrecomputedEmbedding(precomputedEmbedding)
                  .then((embedding) =>
                    this.spotlight.buildSpotlightContext(userId, query, orgId, embedding),
                  ),
              (value) => this.support.contextStringTiming(value),
            )
          : Promise.resolve(''),
        hasUserBrainAccess
          ? this.support.timeContextPart(
              'user_context',
              timingMeta,
              () =>
                (wikiEligible
                  ? this.buildWikiContext(userId, query, orgId, precomputedEmbedding).then(
                      (wiki) =>
                        wiki ||
                        this.buildUserBrainContext(
                          userId,
                          agentKey,
                          query,
                          orgId,
                          precomputedEmbedding,
                        ),
                    )
                  : this.buildUserBrainContext(userId, agentKey, query, orgId, precomputedEmbedding)
                ).catch((err) => {
                  this.logger.warn(`User brain context failed: ${err}`)
                  return ''
                }),
              (value) => this.support.contextStringTiming(value),
            )
          : Promise.resolve(''),
        canUseAgentBrain
          ? this.support.timeContextPart(
              'agent_context',
              timingMeta,
              () =>
                this.buildAgentBrainContext(
                  userId,
                  agentKey,
                  query,
                  orgId,
                  precomputedEmbedding,
                ).catch((err) => {
                  this.logger.warn(`Agent brain context failed: ${err}`)
                  return ''
                }),
              (value) => this.support.contextStringTiming(value),
            )
          : Promise.resolve(''),
        useRetrievalContext && canUseCustomerBrain
          ? this.support.timeContextPart(
              'customer_context',
              timingMeta,
              () =>
                this.support
                  .buildCustomerBrainContext({
                    retrieval: this.retrieval,
                    userId,
                    query,
                    orgId,
                    agentKey,
                    precomputedEmbedding,
                  })
                  .catch((err) => {
                    this.logger.warn(`Customer brain context failed: ${err}`)
                    return ''
                  }),
              (value) => this.support.contextStringTiming(value),
            )
          : Promise.resolve(''),
      ])

    const contextParts: string[] = []
    if (companyContext) contextParts.push(companyContext)
    if (spotlightContext) contextParts.push(spotlightContext)
    if (userContext) contextParts.push(userContext)
    if (agentContext) contextParts.push(agentContext)
    if (customerContext) contextParts.push(customerContext)
    const finalContext = contextParts.join('\n\n')
    this.logContextTiming('full_context_complete', timingMeta, Date.now() - fullContextStartedAt, {
      total_chars: finalContext.length,
      part_count: contextParts.length,
      company_chars: companyContext.length,
      user_chars: userContext.length,
      agent_chars: agentContext.length,
      customer_chars: customerContext.length,
    })
    return finalContext
  }

  private logContextTiming(
    stage: string,
    meta: BrainContextTimingMeta,
    latencyMs: number,
    extra?: Record<string, unknown>,
  ): void {
    if (!this.contextTimingLogsEnabled()) return
    this.logger.log(
      JSON.stringify({
        feature: 'brain_context_timing_v1',
        stage,
        user_id: meta.userId,
        org_id: meta.orgId ?? null,
        agent_key: meta.agentKey ?? null,
        query_chars: meta.queryChars,
        use_wiki_context: meta.useWikiContext === true,
        latency_ms: latencyMs,
        ...(extra ?? {}),
      }),
    )
  }

  private contextTimingLogsEnabled(): boolean {
    const setting = process.env.BRAIN_CONTEXT_TIMING_LOGS
    return setting !== undefined && !['0', 'false', 'off', 'no'].includes(setting.toLowerCase())
  }

  private async resolveUserBrainIdLegacy(
    userId: string,
    orgId?: string | null,
  ): Promise<string | null> {
    const { data: brain } = await this.repository.findDefaultUserBrainId(this.supabase, {
      userId,
      orgId,
    })
    return brain?.id ?? null
  }
}
