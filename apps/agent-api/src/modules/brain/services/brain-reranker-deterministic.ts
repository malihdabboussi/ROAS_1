import type { BrainRetrievalCandidate } from '@vibey/api-shared'

type QuerySignals = {
  normalized: string
  terms: string[]
  quotedPhrases: string[]
  properNouns: string[]
  numbers: string[]
  negatedTerms: string[]
}

const STOPWORDS = new Set([
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

export function rerankDeterministicCandidates(
  query: string,
  candidates: BrainRetrievalCandidate[],
  limit: number,
): BrainRetrievalCandidate[] {
  const signals = extractQuerySignals(query)
  return candidates
    .map((candidate) => {
      const rerank = scoreCandidate(signals, candidate)
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

function scoreCandidate(signals: QuerySignals, candidate: BrainRetrievalCandidate): number {
  const baseScore = candidate.scores.final
  const sourceQualityBonus = scoreSourceQuality(candidate)
  const exactTitleMatchBonus = scoreExactTitleMatch(signals, candidate)
  const confidenceBonus = scoreConfidence(candidate)
  const relatedBonus = Math.min(candidate.related.length * 0.02, 0.08)
  const entityPenalty = scoreEntityMismatch(signals, candidate)
  const negationPenalty = scoreNegation(signals, candidate)
  const genericPenalty = scoreGenericOverlap(signals, candidate)

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

function scoreSourceQuality(candidate: BrainRetrievalCandidate): number {
  let bonus = 0
  if (candidate.source_id) bonus += 0.03
  if (candidate.source_title) bonus += 0.03
  if (candidate.evidence_refs.length > 0) bonus += 0.05
  return bonus
}

function scoreExactTitleMatch(signals: QuerySignals, candidate: BrainRetrievalCandidate): number {
  if (!signals.normalized) return 0
  const title = normalize(candidate.title)
  const sourceTitle = normalize(candidate.source_title ?? '')
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
    const text = candidateSearchText(candidate)
    if (signals.properNouns.every((term) => text.includes(term))) return 0.25
  }
  return 0
}

function scoreConfidence(candidate: BrainRetrievalCandidate): number {
  const confidence = Number(candidate.metadata.confidence ?? candidate.metadata.mastery ?? 0)
  if (!Number.isFinite(confidence) || confidence <= 0) return 0
  return Math.min(confidence, 1) * 0.05
}

function scoreEntityMismatch(signals: QuerySignals, candidate: BrainRetrievalCandidate): number {
  const requiredEntities = [...signals.properNouns, ...signals.numbers].filter(
    (term) => !signals.negatedTerms.includes(term),
  )
  if (requiredEntities.length === 0) return 0
  const text = candidateSearchText(candidate)
  const missing = requiredEntities.filter((term) => !text.includes(term)).length
  return missing === 0 ? 0 : -Math.min(0.35, missing * 0.18)
}

function scoreNegation(signals: QuerySignals, candidate: BrainRetrievalCandidate): number {
  if (signals.negatedTerms.length === 0) return 0
  const text = candidateSearchText(candidate)
  return signals.negatedTerms.some((term) => text.includes(term)) ? -0.5 : 0
}

function scoreGenericOverlap(signals: QuerySignals, candidate: BrainRetrievalCandidate): number {
  const activeProperNouns = signals.properNouns.filter(
    (term) => !signals.negatedTerms.includes(term),
  )
  if (activeProperNouns.length === 0 || signals.terms.length === 0) return 0
  const text = candidateSearchText(candidate)
  const genericHits = signals.terms.filter((term) => text.includes(term)).length
  const entityHits = activeProperNouns.filter((term) => text.includes(term)).length
  return genericHits >= 2 && entityHits === 0 ? -0.2 : 0
}

function extractQuerySignals(query: string): QuerySignals {
  const normalized = normalize(query)
  const quotedPhrases = [...query.matchAll(/"([^"]+)"/g)]
    .map((match) => normalize(match[1] ?? ''))
    .filter(Boolean)
  const numbers = [
    ...new Set((query.match(/\b\d+(?:\.\d+)?\b/g) ?? []).map((value) => normalize(value))),
  ]
  const properNouns = extractProperNouns(query)
  const terms = [
    ...new Set(
      normalized
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 3 && !STOPWORDS.has(term) && !properNouns.includes(term)),
    ),
  ]
  return {
    normalized,
    terms,
    quotedPhrases,
    properNouns,
    numbers,
    negatedTerms: extractNegatedTerms(normalized),
  }
}

function extractProperNouns(query: string): string[] {
  const tokens = query.match(/\b[A-Z][A-Za-z0-9_-]{2,}\b|\b[A-Z]{2,}\b/g) ?? []
  return [
    ...new Set(
      tokens
        .map((token) => normalize(token))
        .filter((token) => token.length >= 3 && !STOPWORDS.has(token)),
    ),
  ]
}

function extractNegatedTerms(normalizedQuery: string): string[] {
  const terms: string[] = []
  const patterns = [
    /\bnot\s+((?:[a-z0-9_-]{3,}\s*){1,4})/g,
    /\bwithout\s+((?:[a-z0-9_-]{3,}\s*){1,4})/g,
    /\bexcluding\s+((?:[a-z0-9_-]{3,}\s*){1,4})/g,
    /\bexcept\s+((?:[a-z0-9_-]{3,}\s*){1,4})/g,
  ]
  for (const pattern of patterns) {
    for (const match of normalizedQuery.matchAll(pattern)) {
      for (const term of (match[1] ?? '').split(/\s+/).filter(Boolean)) {
        if (!STOPWORDS.has(term)) terms.push(term)
      }
    }
  }
  return [...new Set(terms)]
}

function candidateSearchText(candidate: BrainRetrievalCandidate): string {
  return normalize(
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

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
