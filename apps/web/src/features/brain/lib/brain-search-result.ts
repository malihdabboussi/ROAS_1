import type { BrainMemory } from '../types'

/**
 * A hit from `/api/brain/search` or `/api/brain/search/image`. The API scores
 * hits with `significance_score` and omits timestamps, so a hit is not yet a
 * `BrainMemory` even though it carries most of the same fields.
 */
export type BrainSearchHit = Partial<
  Omit<BrainMemory, 'significance' | 'significance_score' | 'confidence'>
> & {
  id: string
  significance?: number | string | null
  significance_score?: number | string | null
  confidence?: number | string | null
}

const DEFAULT_SIGNIFICANCE = 0.6
const DEFAULT_CONFIDENCE = 0.8

function toUnit(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

/**
 * Normalises a search hit into the `BrainMemory` shape the graph and node
 * detail modal read, so a hit picked from the search dock renders the same
 * metric bars as a node clicked on the canvas.
 */
export function searchHitToBrainMemory(hit: BrainSearchHit): BrainMemory {
  const { significance, significance_score, confidence, ...rest } = hit
  const significanceValue = toUnit(significance ?? significance_score, DEFAULT_SIGNIFICANCE)
  return {
    ...rest,
    id: hit.id,
    content: hit.content ?? hit.core ?? '',
    memory_type: hit.memory_type ?? 'fact',
    source_type: hit.source_type ?? '',
    significance: significanceValue,
    significance_score: significanceValue,
    confidence: toUnit(confidence, DEFAULT_CONFIDENCE),
    tags: Array.isArray(hit.tags) ? hit.tags : [],
    recalled_count: hit.recalled_count ?? 0,
    created_at: hit.created_at ?? '',
    updated_at: hit.updated_at ?? hit.created_at ?? '',
  }
}
