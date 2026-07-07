import { Injectable } from '@nestjs/common'
import type { BrainRetrievalCandidate } from '@vibey/api-shared'

type QuerySignals = {
  normalized: string
  terms: string[]
  properNouns: string[]
  quotedPhrases: string[]
}

@Injectable()
export class BrainRetrievalQueryExpansionService {
  shouldRunMultiQuery(
    query: string,
    ranked: BrainRetrievalCandidate[],
    contextSufficient: boolean,
  ): boolean {
    if (!this.multiQueryEnabled()) return false
    const topScore = ranked[0]?.scores.final ?? 0
    return (
      this.queryIsAbstract(query) ||
      this.queryLooksParaphrased(query) ||
      !contextSufficient ||
      topScore < 0.62
    )
  }

  multiQueryEnabled(): boolean {
    return process.env.BRAIN_MULTI_QUERY_RETRIEVAL === '1'
  }

  buildDeterministicQueryVariants(query: string): string[] {
    const signals = this.extractQuerySignals(query)
    const variants: string[] = []
    if (signals.properNouns.length > 0) {
      variants.push([...signals.properNouns, ...signals.terms.slice(0, 4)].join(' '))
    }
    if (signals.quotedPhrases.length > 0) {
      variants.push([...signals.quotedPhrases, ...signals.properNouns].join(' '))
    }
    if (/\brelationship between\b/i.test(query)) {
      variants.push(query.replace(/\brelationship between\b/i, 'connected to'))
    }
    if (/\bwhy\b|\bhow\b|\bconnected\b|\brelate[sd]?\b|\bloop\b/i.test(query)) {
      variants.push(
        [...signals.properNouns, ...signals.terms.slice(0, 5), 'source evidence'].join(' '),
      )
    }
    return [
      ...new Set(
        variants
          .map((variant) => variant.trim().replace(/\s+/g, ' '))
          .filter((variant) => variant && variant.toLowerCase() !== query.toLowerCase()),
      ),
    ].slice(0, 3)
  }

  mergeCandidatesByBestScore(
    candidates: BrainRetrievalCandidate[],
  ): BrainRetrievalCandidate[] {
    const byId = new Map<string, BrainRetrievalCandidate>()
    for (const candidate of candidates) {
      const existing = byId.get(candidate.id)
      if (!existing || candidate.scores.final > existing.scores.final) {
        byId.set(candidate.id, candidate)
      }
    }
    return [...byId.values()]
  }

  balanceLaneCandidates(
    candidates: BrainRetrievalCandidate[],
    candidateLimit: number,
  ): BrainRetrievalCandidate[] {
    const byLane = new Map<string, BrainRetrievalCandidate[]>()
    for (const candidate of candidates) {
      const lane = candidate.lane ?? candidate.kind
      byLane.set(lane, [...(byLane.get(lane) ?? []), candidate])
    }
    for (const laneCandidates of byLane.values()) {
      laneCandidates.sort((a, b) => b.scores.final - a.scores.final)
    }

    const laneQuota = Math.max(2, Math.ceil(candidateLimit / Math.max(1, byLane.size * 2)))
    const selected = new Map<string, BrainRetrievalCandidate>()
    for (const laneCandidates of byLane.values()) {
      for (const candidate of laneCandidates.slice(0, laneQuota)) {
        selected.set(candidate.id, candidate)
      }
    }
    for (const candidate of candidates.sort((a, b) => b.scores.final - a.scores.final)) {
      if (selected.size >= candidateLimit) break
      selected.set(candidate.id, candidate)
    }
    return [...selected.values()].sort((a, b) => b.scores.final - a.scores.final)
  }

  importantQueryTerms(query: string): string[] {
    const stopwords = new Set([
      'what',
      'which',
      'where',
      'when',
      'does',
      'should',
      'would',
      'could',
      'about',
      'agent',
      'brain',
      'rule',
      'say',
      'says',
      'many',
      'much',
      'know',
      'knows',
      'before',
      'after',
      'enough',
    ])
    return [
      ...new Set(
        query
          .toLowerCase()
          .split(/[^a-z0-9_-]+/)
          .map((term) => term.trim())
          .filter((term) => term.length >= 3 && !stopwords.has(term)),
      ),
    ].slice(0, 8)
  }

  private queryIsAbstract(query: string): boolean {
    return /\bwhy\b|\bhow\b|\bprinciple\b|\bstrategy\b|\brelationship\b|\bconnected\b|\bpattern\b|\btheme\b|\bmoat\b|\bloop\b/i.test(
      query,
    )
  }

  private queryLooksParaphrased(query: string): boolean {
    return /\bsame\b|\bsimilar\b|\bconnected\b|\brelate[sd]?\b|\bmean\b|\bimply\b|\bstand for\b|\bpointing to\b/i.test(
      query,
    )
  }

  private extractQuerySignals(query: string): QuerySignals {
    const normalized = query.trim().toLowerCase().replace(/\s+/g, ' ')
    const quotedPhrases = [...query.matchAll(/"([^"]+)"/g)]
      .map((match) =>
        String(match[1] ?? '')
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean)
    const properNouns = [
      ...new Set(
        (query.match(/\b[A-Z][A-Za-z0-9_-]{2,}\b|\b[A-Z]{2,}\b/g) ?? [])
          .map((term) => term.toLowerCase())
          .filter((term) => term.length >= 3),
      ),
    ]
    const terms = this.importantQueryTerms(query).filter((term) => !properNouns.includes(term))
    return { normalized, terms, properNouns, quotedPhrases }
  }
}
