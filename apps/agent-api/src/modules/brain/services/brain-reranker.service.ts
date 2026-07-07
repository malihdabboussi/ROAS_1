import { randomUUID } from 'node:crypto'
import { Injectable, Logger, Optional } from '@nestjs/common'
import {
  normalizeProviderBillingUsage,
  readOpenRouterGenerationId,
  readOpenRouterRequestId,
  type BrainRetrievalCandidate,
} from '@vibey/api-shared'
import { ProviderBillingAttemptsService } from '../../billing/services/provider-billing-attempts.service'
import { EmbeddingService } from './embedding.service'

type QuerySignals = {
  normalized: string
  terms: string[]
  quotedPhrases: string[]
  properNouns: string[]
  numbers: string[]
  negatedTerms: string[]
}

export type BrainRerankerUsageSummary = {
  model: string | null
  calls: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  providerCostUsd: number
  userCostUsd: number
  marginUsd: number
  estimatedCredits: number
  costUnknownCount: number
  generationIds: string[]
}

export type BrainRerankerBillingContext = { userId: string; orgId?: string | null }

type OpenRouterChatResponse = {
  id?: string
  choices?: Array<{ message?: { content?: string } }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
    cost?: number
    total_cost?: number
  }
}

type OpenRouterGenerationResponse = {
  data?: {
    total_cost?: number
    cost?: number
    native_tokens_prompt?: number
    native_tokens_completion?: number
    tokens_prompt?: number
    tokens_completion?: number
    total_tokens?: number
  }
}

@Injectable()
export class BrainRerankerService {
  private readonly logger = new Logger(BrainRerankerService.name)
  private readonly usage: BrainRerankerUsageSummary = {
    model: null,
    calls: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    providerCostUsd: 0,
    userCostUsd: 0,
    marginUsd: 0,
    estimatedCredits: 0,
    costUnknownCount: 0,
    generationIds: [],
  }

  constructor(
    @Optional() private readonly embedding?: EmbeddingService,
    @Optional() private readonly providerBillingAttempts?: ProviderBillingAttemptsService,
  ) {}

  getUsageSummary(): BrainRerankerUsageSummary {
    return {
      ...this.usage,
      providerCostUsd: Number(this.usage.providerCostUsd.toFixed(8)),
      userCostUsd: Number(this.usage.userCostUsd.toFixed(8)),
      marginUsd: Number(this.usage.marginUsd.toFixed(8)),
      estimatedCredits: this.usage.userCostUsd > 0 ? Math.ceil(this.usage.userCostUsd * 200) : 0,
      generationIds: [...this.usage.generationIds],
    }
  }

  resetUsageSummary(): void {
    this.usage.model = null
    this.usage.calls = 0
    this.usage.promptTokens = 0
    this.usage.completionTokens = 0
    this.usage.totalTokens = 0
    this.usage.providerCostUsd = 0
    this.usage.userCostUsd = 0
    this.usage.marginUsd = 0
    this.usage.estimatedCredits = 0
    this.usage.costUnknownCount = 0
    this.usage.generationIds = []
  }

  async rerank(
    query: string,
    candidates: BrainRetrievalCandidate[],
    limit: number,
    billing?: BrainRerankerBillingContext,
  ): Promise<BrainRetrievalCandidate[]> {
    if (process.env.BRAIN_LLM_RERANKER === '1' && candidates.length > 0) {
      const llmRanked = await this.rerankWithLlm(query, candidates, limit, billing)
      if (llmRanked) return llmRanked
      throw new Error('Brain LLM reranker returned no usable ranking')
    }
    return this.rerankDeterministic(query, candidates, limit)
  }

  rerankDeterministic(
    query: string,
    candidates: BrainRetrievalCandidate[],
    limit: number,
  ): BrainRetrievalCandidate[] {
    const signals = this.extractQuerySignals(query)
    return candidates
      .map((candidate) => {
        const rerank = this.scoreCandidate(signals, candidate)
        return {
          ...candidate,
          scores: {
            ...candidate.scores,
            rerank,
            final: rerank,
          },
        }
      })
      .sort((a, b) => b.scores.final - a.scores.final)
      .slice(0, limit)
  }

  private async rerankWithLlm(
    query: string,
    candidates: BrainRetrievalCandidate[],
    limit: number,
    billing?: BrainRerankerBillingContext,
  ): Promise<BrainRetrievalCandidate[] | null> {
    const startedAt = Date.now()
    const prompt = [
      'Rerank Brain retrieval candidates for answer usefulness and direct evidence.',
      'Return ONLY JSON: {"ranked":[{"id":"...","score":0.93,"reason":"..."}]}',
      `Query: ${query}`,
      'Candidates:',
      JSON.stringify(
        candidates.slice(0, Math.min(20, candidates.length)).map((candidate) => ({
          id: candidate.id,
          kind: candidate.kind,
          title: candidate.title,
          snippet: candidate.snippet,
          source_type: candidate.source_type,
          source_title: candidate.source_title,
          scores: candidate.scores,
          match_reasons: candidate.match_reasons,
          evidence_refs: candidate.evidence_refs.slice(0, 3),
        })),
      ),
    ].join('\n')
    let attempts = 1
    try {
      const raw = await this.callRerankerLlm(prompt, billing)
      const parsed = this.parseRerankJson(raw)
      if (!parsed?.ranked?.length) {
        attempts = 2
        const retryRaw = await this.callRerankerLlm(prompt, billing)
        const retryParsed = this.parseRerankJson(retryRaw)
        if (!retryParsed?.ranked?.length) {
          throw new Error(
            `Brain LLM reranker returned no usable ranking: ${retryRaw.slice(0, 500)}`,
          )
        }
        const retryRanked = this.applyLlmRanking(candidates, retryParsed, limit)
        this.logRerankerTiming('rerank_with_llm', Date.now() - startedAt, {
          candidate_count: candidates.length,
          returned_count: retryRanked.length,
          parse_attempts: attempts,
          prompt_chars: prompt.length,
        })
        return retryRanked
      }

      const ranked = this.applyLlmRanking(candidates, parsed, limit)
      this.logRerankerTiming('rerank_with_llm', Date.now() - startedAt, {
        candidate_count: candidates.length,
        returned_count: ranked.length,
        parse_attempts: attempts,
        prompt_chars: prompt.length,
      })
      return ranked
    } catch (err) {
      this.logRerankerTiming('rerank_with_llm', Date.now() - startedAt, {
        status: 'error',
        candidate_count: candidates.length,
        parse_attempts: attempts,
        prompt_chars: prompt.length,
        error: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
      })
      throw err
    }
  }

  private applyLlmRanking(
    candidates: BrainRetrievalCandidate[],
    parsed: { ranked?: Array<{ id?: string; score?: number; reason?: string }> },
    limit: number,
  ): BrainRetrievalCandidate[] {
    const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]))
    const ranked: BrainRetrievalCandidate[] = []
    for (const item of parsed.ranked ?? []) {
      if (!item.id || !byId.has(item.id)) continue
      const score = typeof item.score === 'number' && Number.isFinite(item.score) ? item.score : 0
      const candidate = byId.get(item.id)!
      ranked.push({
        ...candidate,
        scores: { ...candidate.scores, rerank: score, final: score },
        match_reasons: item.reason
          ? [...candidate.match_reasons, `LLM rerank: ${item.reason}`]
          : candidate.match_reasons,
      })
    }
    for (const candidate of candidates) {
      if (!ranked.some((item) => item.id === candidate.id)) ranked.push(candidate)
    }
    return ranked.sort((a, b) => b.scores.final - a.scores.final).slice(0, limit)
  }

  private async callRerankerLlm(
    prompt: string,
    billing?: BrainRerankerBillingContext,
  ): Promise<string> {
    const openRouterKey = process.env.OPENROUTER_API_KEY?.trim()
    const model = process.env.BRAIN_LLM_RERANKER_MODEL?.trim() || 'deepseek/deepseek-chat-v3.1'
    if (!billing?.userId) {
      throw new Error('Brain LLM reranker requires a customer billing owner')
    }
    if (openRouterKey) {
      if (!this.providerBillingAttempts) {
        throw new Error('Provider billing attempts service is required for Brain LLM reranker')
      }
      const startedAt = Date.now()
      const attemptKey = ['brain-reranker', model, randomUUID()].join(':')
      await this.providerBillingAttempts.recordAttempt({
        attemptKey,
        sourceApp: 'agent-api',
        sourcePath: 'brain/brain-reranker',
        billingOwnerType: billing.orgId ? 'org' : 'personal',
        userId: billing.userId,
        orgId: billing.orgId ?? null,
        feature: 'brain',
        action: 'rerank',
        serviceType: 'text',
        provider: 'openrouter',
        requestedModel: model,
        metadata: { prompt_chars: prompt.length },
      })
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'You rerank retrieval candidates. Always return valid JSON.',
            },
            { role: 'user', content: prompt },
          ],
        }),
      })
      const providerGenerationId = readOpenRouterGenerationId(res.headers)
      const providerRequestId = readOpenRouterRequestId(res.headers)
      if (!res.ok) {
        this.logRerankerTiming('openrouter_chat_completion', Date.now() - startedAt, {
          status: 'error',
          model,
          http_status: res.status,
          prompt_chars: prompt.length,
        })
        throw new Error(`Brain LLM reranker failed for ${model}: ${res.status} ${await res.text()}`)
      }
      const data = (await res.json()) as OpenRouterChatResponse
      const usage = normalizeProviderBillingUsage({
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
      })
      await this.providerBillingAttempts.recordAttempt({
        attemptKey,
        sourceApp: 'agent-api',
        sourcePath: 'brain/brain-reranker',
        billingOwnerType: billing.orgId ? 'org' : 'personal',
        userId: billing.userId,
        orgId: billing.orgId ?? null,
        feature: 'brain',
        action: 'rerank',
        serviceType: 'text',
        provider: 'openrouter',
        requestedModel: model,
        resolvedModel: model,
        providerGenerationId: providerGenerationId ?? data.id ?? null,
        providerRequestId,
        inputTokens: usage.input,
        outputTokens: usage.output,
        cacheReadTokens: usage.cacheRead,
        cacheWriteTokens: usage.cacheWrite,
        totalTokens: usage.totalTokens,
        providerCostUsd: this.numberOrNull(data.usage?.total_cost ?? data.usage?.cost),
        metadata: {
          prompt_chars: prompt.length,
          openrouter_response_id: data.id ?? null,
          openrouter_usage: data.usage ?? null,
        },
      })
      this.logRerankerTiming('openrouter_chat_completion', Date.now() - startedAt, {
        model,
        http_status: res.status,
        prompt_chars: prompt.length,
        generation_id_present: typeof data.id === 'string' && data.id.length > 0,
        prompt_tokens: data.usage?.prompt_tokens ?? 0,
        completion_tokens: data.usage?.completion_tokens ?? 0,
        total_tokens: data.usage?.total_tokens ?? 0,
      })
      await this.recordOpenRouterUsage(openRouterKey, model, data)
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error(`Brain LLM reranker returned empty content for ${model}`)
      return content
    }
    if (this.embedding) {
      const startedAt = Date.now()
      const content = await this.embedding.callGemini(prompt, undefined, billing)
      this.logRerankerTiming('gemini_reranker_completion', Date.now() - startedAt, {
        prompt_chars: prompt.length,
      })
      return content
    }
    throw new Error('Brain LLM reranker has no model provider configured')
  }

  private parseRerankJson(
    raw: string,
  ): { ranked?: Array<{ id?: string; score?: number; reason?: string }> } | null {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return { ranked: parsed }
      return parsed
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) return null
      try {
        return JSON.parse(match[0])
      } catch {
        return null
      }
    }
  }

  private async recordOpenRouterUsage(
    openRouterKey: string,
    model: string,
    data: OpenRouterChatResponse,
  ): Promise<void> {
    this.usage.model = model
    this.usage.calls += 1
    const promptTokens = data.usage?.prompt_tokens ?? 0
    const completionTokens = data.usage?.completion_tokens ?? 0
    const totalTokens = data.usage?.total_tokens ?? promptTokens + completionTokens
    this.usage.promptTokens += promptTokens
    this.usage.completionTokens += completionTokens
    this.usage.totalTokens += totalTokens

    if (data.id) this.usage.generationIds.push(data.id)
    const responseCost = this.numberOrNull(data.usage?.total_cost ?? data.usage?.cost)
    let generationCost: number | null = null
    if (data.id) {
      const costStartedAt = Date.now()
      generationCost = await this.fetchOpenRouterGenerationCost(openRouterKey, data.id)
      this.logRerankerTiming('openrouter_generation_cost_lookup', Date.now() - costStartedAt, {
        model,
        generation_id_present: true,
        cost_found: generationCost !== null,
      })
    }
    const exactCost = generationCost ?? responseCost
    if (exactCost === null) {
      this.usage.costUnknownCount += 1
      return
    }
    this.usage.providerCostUsd += exactCost
    this.usage.userCostUsd += exactCost * 2
    this.usage.marginUsd += exactCost
    this.usage.estimatedCredits = Math.ceil(this.usage.userCostUsd * 200)
  }

  private async fetchOpenRouterGenerationCost(
    openRouterKey: string,
    generationId: string,
  ): Promise<number | null> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
      const res = await fetch(
        `https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(generationId)}`,
        {
          headers: { Authorization: `Bearer ${openRouterKey}` },
        },
      )
      if (!res.ok) continue
      const raw = await res.text()
      if (!raw.trim()) return null
      let data: OpenRouterGenerationResponse
      try {
        data = JSON.parse(raw) as OpenRouterGenerationResponse
      } catch {
        return null
      }
      const cost = this.numberOrNull(data.data?.total_cost ?? data.data?.cost)
      if (cost !== null) return cost
    }
    return null
  }

  private numberOrNull(value: unknown): number | null {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : null
  }

  private logRerankerTiming(
    stage: string,
    latencyMs: number,
    extra?: Record<string, unknown>,
  ): void {
    this.logger.log(
      JSON.stringify({
        feature: 'brain_reranker_timing_v1',
        stage,
        latency_ms: latencyMs,
        ...(extra ?? {}),
      }),
    )
  }

  private scoreCandidate(signals: QuerySignals, candidate: BrainRetrievalCandidate): number {
    const baseScore = candidate.scores.final
    const sourceQualityBonus = this.sourceQualityBonus(candidate)
    const exactTitleMatchBonus = this.exactTitleMatchBonus(signals, candidate)
    const confidenceBonus = this.confidenceBonus(candidate)
    const relatedBonus = Math.min(candidate.related.length * 0.02, 0.08)
    const entityPenalty = this.entityMismatchPenalty(signals, candidate)
    const negationPenalty = this.negationPenalty(signals, candidate)
    const genericPenalty = this.genericOverlapPenalty(signals, candidate)

    return (
      baseScore +
      sourceQualityBonus +
      exactTitleMatchBonus +
      confidenceBonus +
      relatedBonus +
      entityPenalty +
      negationPenalty +
      genericPenalty
    )
  }

  private sourceQualityBonus(candidate: BrainRetrievalCandidate): number {
    let bonus = 0
    if (candidate.source_id) bonus += 0.03
    if (candidate.source_title) bonus += 0.03
    if (candidate.evidence_refs.length > 0) bonus += 0.05
    return bonus
  }

  private exactTitleMatchBonus(signals: QuerySignals, candidate: BrainRetrievalCandidate): number {
    if (!signals.normalized) return 0
    const title = this.normalize(candidate.title)
    const sourceTitle = this.normalize(candidate.source_title ?? '')
    if (!title) return 0
    if (title === signals.normalized) return 0.45
    if (title.includes(signals.normalized)) return 0.3
    if (sourceTitle === signals.normalized || sourceTitle.includes(signals.normalized)) return 0.25
    if (
      signals.quotedPhrases.some((phrase) => title.includes(phrase) || sourceTitle.includes(phrase))
    ) {
      return 0.25
    }
    if (signals.properNouns.length > 0) {
      const text = this.candidateSearchText(candidate)
      const allProperNounsMatch = signals.properNouns.every((term) => text.includes(term))
      if (allProperNounsMatch) return 0.25
    }
    return 0
  }

  private confidenceBonus(candidate: BrainRetrievalCandidate): number {
    const confidence = Number(candidate.metadata.confidence ?? candidate.metadata.mastery ?? 0)
    if (!Number.isFinite(confidence) || confidence <= 0) return 0
    return Math.min(confidence, 1) * 0.05
  }

  private entityMismatchPenalty(signals: QuerySignals, candidate: BrainRetrievalCandidate): number {
    const requiredEntities = [...signals.properNouns, ...signals.numbers].filter(
      (term) => !signals.negatedTerms.includes(term),
    )
    if (requiredEntities.length === 0) return 0
    const text = this.candidateSearchText(candidate)
    const missing = requiredEntities.filter((term) => !text.includes(term)).length
    if (missing === 0) return 0
    return -Math.min(0.35, missing * 0.18)
  }

  private negationPenalty(signals: QuerySignals, candidate: BrainRetrievalCandidate): number {
    if (signals.negatedTerms.length === 0) return 0
    const text = this.candidateSearchText(candidate)
    return signals.negatedTerms.some((term) => text.includes(term)) ? -0.5 : 0
  }

  private genericOverlapPenalty(signals: QuerySignals, candidate: BrainRetrievalCandidate): number {
    const activeProperNouns = signals.properNouns.filter(
      (term) => !signals.negatedTerms.includes(term),
    )
    if (activeProperNouns.length === 0 || signals.terms.length === 0) return 0
    const text = this.candidateSearchText(candidate)
    const genericHits = signals.terms.filter((term) => text.includes(term)).length
    const entityHits = activeProperNouns.filter((term) => text.includes(term)).length
    if (genericHits >= 2 && entityHits === 0) return -0.2
    return 0
  }

  private extractQuerySignals(query: string): QuerySignals {
    const normalized = this.normalize(query)
    const quotedPhrases = [...query.matchAll(/"([^"]+)"/g)]
      .map((match) => this.normalize(match[1] ?? ''))
      .filter(Boolean)
    const numbers = [
      ...new Set((query.match(/\b\d+(?:\.\d+)?\b/g) ?? []).map((value) => this.normalize(value))),
    ]
    const properNouns = this.extractProperNouns(query)
    const terms = [
      ...new Set(
        normalized
          .split(/\s+/)
          .map((term) => term.trim())
          .filter(
            (term) =>
              term.length >= 3 && !this.stopwords().has(term) && !properNouns.includes(term),
          ),
      ),
    ]
    return {
      normalized,
      terms,
      quotedPhrases,
      properNouns,
      numbers,
      negatedTerms: this.extractNegatedTerms(normalized),
    }
  }

  private extractProperNouns(query: string): string[] {
    const tokens = query.match(/\b[A-Z][A-Za-z0-9_-]{2,}\b|\b[A-Z]{2,}\b/g) ?? []
    return [
      ...new Set(
        tokens
          .map((token) => this.normalize(token))
          .filter((token) => token.length >= 3 && !this.stopwords().has(token)),
      ),
    ]
  }

  private extractNegatedTerms(normalizedQuery: string): string[] {
    const terms: string[] = []
    const patterns = [
      /\bnot\s+((?:[a-z0-9_-]{3,}\s*){1,4})/g,
      /\bwithout\s+((?:[a-z0-9_-]{3,}\s*){1,4})/g,
      /\bexcluding\s+((?:[a-z0-9_-]{3,}\s*){1,4})/g,
      /\bexcept\s+((?:[a-z0-9_-]{3,}\s*){1,4})/g,
    ]
    for (const pattern of patterns) {
      for (const match of normalizedQuery.matchAll(pattern)) {
        const phrase = match[1] ?? ''
        for (const term of phrase.split(/\s+/).filter(Boolean)) {
          if (!this.stopwords().has(term)) terms.push(term)
        }
      }
    }
    return [...new Set(terms)]
  }

  private candidateSearchText(candidate: BrainRetrievalCandidate): string {
    return this.normalize(
      [
        candidate.title,
        candidate.source_title,
        candidate.content,
        candidate.snippet,
        candidate.metadata.domain,
        candidate.metadata.object_type,
        candidate.metadata.entry_type,
      ]
        .filter((value) => value !== undefined && value !== null)
        .join(' '),
    )
  }

  private normalize(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private stopwords(): Set<string> {
    return new Set([
      'what',
      'which',
      'where',
      'when',
      'why',
      'does',
      'was',
      'were',
      'not',
      'should',
      'would',
      'could',
      'about',
      'brain',
      'agent',
      'tell',
      'give',
      'with',
      'from',
      'that',
      'this',
      'into',
      'before',
      'after',
      'decision',
      'brief',
      'brand',
      'copy',
    ])
  }
}
