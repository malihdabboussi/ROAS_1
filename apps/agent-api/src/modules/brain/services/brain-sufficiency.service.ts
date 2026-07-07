import { Injectable, Optional } from '@nestjs/common'
import type { BrainRetrievalCandidate, BrainSufficiencyResult } from '@vibey/api-shared'
import { EmbeddingService } from './embedding.service'

type EvidenceStrength = 'direct' | 'related' | 'none'

export type BrainSufficiencyBillingContext = { userId: string; orgId?: string | null }

@Injectable()
export class BrainSufficiencyService {
  constructor(@Optional() private readonly embedding?: EmbeddingService) {}

  async evaluate(
    query: string,
    candidates: BrainRetrievalCandidate[],
    billing?: BrainSufficiencyBillingContext,
  ): Promise<BrainSufficiencyResult> {
    const deterministic = this.evaluateDeterministic(query, candidates)
    if (
      process.env.BRAIN_CONTEXT_SUFFICIENCY_LLM !== '1' ||
      !this.embedding ||
      candidates.length === 0
    ) {
      return deterministic
    }
    if (!billing?.userId) {
      throw new Error('Brain sufficiency LLM requires a customer billing owner')
    }
    return (await this.evaluateWithLlm(query, candidates, deterministic, billing)) ?? deterministic
  }

  evaluateDeterministic(
    query: string,
    candidates: BrainRetrievalCandidate[],
  ): BrainSufficiencyResult {
    const trimmedQuery = query.trim()
    if (candidates.length === 0) {
      return this.insufficient(trimmedQuery, 'No Brain evidence was retrieved.')
    }

    const top = candidates[0]
    const evidenceStrength = this.evidenceStrength(trimmedQuery, candidates)
    const directEvidence = evidenceStrength === 'direct'
    const sourceGroundedEvidence = candidates.some((candidate) => this.hasDirectEvidence(candidate))
    const queryCoverage = this.queryCoverage(trimmedQuery, candidates.slice(0, 5))
    const topScore = top?.scores.final ?? 0

    if (evidenceStrength === 'direct') {
      return {
        sufficient: true,
        confidence: Math.min(0.95, Math.max(0.7, topScore)),
        reason: 'Top Brain result is strong source-grounded evidence for the query.',
        missing: [],
        suggested_next_queries: [],
      }
    }

    const missing = [
      ...(directEvidence
        ? []
        : [
            sourceGroundedEvidence
              ? 'No direct source-grounded evidence matched the query.'
              : 'No direct source-grounded evidence found.',
          ]),
      ...(queryCoverage >= 0.5
        ? []
        : ['Important query terms are weakly represented in retrieved context.']),
      ...(topScore >= 0.45 ? [] : ['Top evidence score is below sufficiency threshold.']),
    ]

    return {
      sufficient: false,
      confidence: Math.min(0.6, Math.max(0.1, topScore)),
      reason:
        evidenceStrength === 'related'
          ? 'Related Brain context was found, but it is not enough to answer definitively.'
          : 'Retrieved Brain context is not enough to answer definitively.',
      missing,
      suggested_next_queries: this.suggestNextQueries(trimmedQuery),
    }
  }

  private insufficient(query: string, reason: string): BrainSufficiencyResult {
    return {
      sufficient: false,
      confidence: 0,
      reason,
      missing: ['No matching Brain context found.'],
      suggested_next_queries: this.suggestNextQueries(query),
    }
  }

  private hasDirectEvidence(candidate: BrainRetrievalCandidate): boolean {
    return (
      candidate.evidence_refs.length > 0 ||
      Boolean(candidate.source_id) ||
      Boolean(candidate.source_title) ||
      candidate.kind === 'company_object'
    )
  }

  private evidenceStrength(query: string, candidates: BrainRetrievalCandidate[]): EvidenceStrength {
    const top = candidates[0]
    if (!top) return 'none'

    const topScore = top.scores.final ?? 0
    const topCoverage = this.queryCoverage(query, [top])
    if (this.hasDirectEvidence(top) && topScore >= 0.65 && topCoverage >= 0.35) {
      return 'direct'
    }
    if (this.hasDirectEvidence(top) && topScore >= 0.8 && topCoverage >= 0.3) {
      return 'direct'
    }
    if (topScore >= 0.35 || this.queryCoverage(query, candidates.slice(0, 5)) >= 0.35) {
      return 'related'
    }
    return 'none'
  }

  private queryCoverage(query: string, candidates: BrainRetrievalCandidate[]): number {
    const terms = this.queryTerms(query)
    if (terms.length === 0) return 1

    const haystack = candidates
      .map((candidate) => `${candidate.title} ${candidate.content} ${candidate.snippet}`)
      .join(' ')
      .toLowerCase()
    const hits = terms.filter((term) => haystack.includes(term)).length
    return hits / terms.length
  }

  private queryTerms(query: string): string[] {
    const stopwords = new Set([
      'what',
      'which',
      'where',
      'when',
      'why',
      'does',
      'should',
      'would',
      'could',
      'about',
      'brain',
      'know',
      'knows',
      'before',
      'after',
      'over',
      'time',
      'from',
      'that',
      'this',
      'with',
      'into',
    ])
    return [
      ...new Set(
        query
          .toLowerCase()
          .split(/\s+/)
          .map((term) => term.replace(/[^a-z0-9_-]/g, ''))
          .filter((term) => term.length >= 3 && !stopwords.has(term)),
      ),
    ]
  }

  private suggestNextQueries(query: string): string[] {
    const clean = query.trim()
    if (!clean) return []
    return [clean, `${clean} decision`, `${clean} source evidence`].filter(
      (value, index, arr) => value && arr.indexOf(value) === index,
    )
  }

  private async evaluateWithLlm(
    query: string,
    candidates: BrainRetrievalCandidate[],
    fallback: BrainSufficiencyResult,
    billing: BrainSufficiencyBillingContext,
  ): Promise<BrainSufficiencyResult | null> {
    const prompt = [
      'Decide whether the retrieved Brain context is sufficient to answer the query without guessing.',
      'Return ONLY JSON: {"sufficient":true|false,"confidence":0.0-1.0,"reason":"...","missing":["..."],"suggested_next_queries":["..."]}',
      `Query: ${query}`,
      'Retrieved context:',
      JSON.stringify(
        candidates.slice(0, 8).map((candidate) => ({
          id: candidate.id,
          kind: candidate.kind,
          title: candidate.title,
          snippet: candidate.snippet,
          source_type: candidate.source_type,
          source_title: candidate.source_title,
          evidence_refs: candidate.evidence_refs.slice(0, 3),
          scores: candidate.scores,
        })),
      ),
    ].join('\n')
    const raw = await this.embedding!.callGemini(prompt, undefined, billing)
    const parsed = JSON.parse(raw) as Partial<BrainSufficiencyResult>
    if (typeof parsed.sufficient !== 'boolean') return null
    return {
      sufficient: parsed.sufficient,
      confidence:
        typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)
          ? Math.max(0, Math.min(1, parsed.confidence))
          : fallback.confidence,
      reason:
        typeof parsed.reason === 'string' && parsed.reason.trim() ? parsed.reason : fallback.reason,
      missing: Array.isArray(parsed.missing)
        ? parsed.missing.map(String).filter(Boolean)
        : fallback.missing,
      suggested_next_queries: Array.isArray(parsed.suggested_next_queries)
        ? parsed.suggested_next_queries.map(String).filter(Boolean)
        : fallback.suggested_next_queries,
    }
  }
}
