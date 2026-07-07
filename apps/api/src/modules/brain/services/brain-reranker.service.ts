import { Injectable, Optional } from '@nestjs/common'
import type { BrainRetrievalCandidate } from '@vibey/api-shared'
import { EmbeddingService } from './embedding.service'

type QuerySignals = {
  normalized: string
  terms: string[]
  quotedPhrases: string[]
  properNouns: string[]
  numbers: string[]
  negatedTerms: string[]
}

export type BrainRerankerBillingContext = { userId: string; orgId?: string | null }

@Injectable()
export class BrainRerankerService {
  constructor(@Optional() private readonly embedding?: EmbeddingService) {}

  async rerank(
    query: string,
    candidates: BrainRetrievalCandidate[],
    limit: number,
    billing?: BrainRerankerBillingContext,
  ): Promise<BrainRetrievalCandidate[]> {
    if (process.env.BRAIN_LLM_RERANKER === '1' && this.embedding && candidates.length > 0) {
      if (!billing?.userId) {
        throw new Error('Brain LLM reranker requires a customer billing owner')
      }
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
    billing: BrainRerankerBillingContext,
  ): Promise<BrainRetrievalCandidate[] | null> {
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
    const raw = await this.embedding!.callGemini(prompt, undefined, billing)
    const parsed = JSON.parse(raw) as {
      ranked?: Array<{ id?: string; score?: number; reason?: string }>
    }
    if (!Array.isArray(parsed.ranked)) return null

    const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]))
    const ranked: BrainRetrievalCandidate[] = []
    for (const item of parsed.ranked) {
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
