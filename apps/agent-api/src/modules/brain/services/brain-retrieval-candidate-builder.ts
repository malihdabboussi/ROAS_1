import type {
  BrainAccessSource,
  BrainCandidateKind,
  BrainRetrievalCandidate,
  BrainRetrievalSearchInput,
  BrainSearchFamily,
} from '@vibey/api-shared'
import { temporalCandidateMetadata } from '@vibey/api-shared'
import type { BrainRetrievalBrainRow } from '../repositories/brain-retrieval-access.repository'

type AccessMetadata = {
  effective_access: 'query' | 'train'
  access_source: BrainAccessSource
}

type CandidateInput = BrainRetrievalSearchInput & {
  brain: BrainRetrievalBrainRow
  query: string
  accessMetadata: AccessMetadata
}

const SNAPSHOT_SEMANTIC_WEIGHT = 0.7
const SNAPSHOT_GRAPH_WEIGHT = 0.3
const RRF_K = 60
const RRF_SCORE_SCALE = 30

export class BrainRetrievalCandidateBuilder {
  memoryCandidate(input: CandidateInput, row: Record<string, unknown>): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: input.family,
      kind: 'memory',
      title: String(row.content ?? '').slice(0, 80),
      content: String(row.content ?? ''),
      sourceType: (row.source_type as string | null) ?? null,
      sourceId: (row.source_id as string | null) ?? null,
      sourceTitle: (row.source_title as string | null) ?? null,
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(input.query, String(row.content ?? ''), row),
      matchReason: 'Matched memory content',
    })
  }
  snapshotCandidate(input: CandidateInput, row: Record<string, unknown>): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: input.family,
      kind: 'snapshot',
      title: String(row.name ?? ''),
      content: String(row.core ?? ''),
      sourceType: (row.source_type as string | null) ?? null,
      sourceId: (row.source_id as string | null) ?? null,
      sourceTitle: (row.source as string | null) ?? null,
      semantic: Number(row.similarity ?? 0),
      graph: Number(row.graph_score ?? 0),
      lexical: this.lexicalScore(input.query, `${row.name ?? ''} ${row.core ?? ''}`, row),
      matchReason: 'Matched neural snapshot',
    })
  }
  skCandidate(input: CandidateInput, row: Record<string, unknown>): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: 'agent',
      kind: 'sk_entry',
      title: String(row.title ?? ''),
      content: String(row.content ?? ''),
      sourceType: 'sk_source',
      sourceId: (row.source_id as string | null) ?? null,
      sourceTitle: (row.source_title as string | null) ?? null,
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(input.query, `${row.title ?? ''} ${row.content ?? ''}`, row),
      matchReason: 'Matched agent Brain knowledge',
    })
  }
  companyCandidate(input: CandidateInput, row: Record<string, unknown>): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: 'company',
      kind: 'company_object',
      title: String(row.title ?? ''),
      content: String(row.truth ?? ''),
      sourceType: 'company_cortex_object',
      sourceId: String(row.id ?? ''),
      sourceTitle: String(row.title ?? ''),
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(input.query, `${row.title ?? ''} ${row.truth ?? ''}`, row),
      matchReason: 'Matched company Brain object',
    })
  }
  narrativePageCandidate(
    input: CandidateInput,
    row: Record<string, unknown>,
  ): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: input.family,
      kind: 'narrative_page',
      title: String(row.title ?? ''),
      content: String(row.summary ?? row.content_md ?? ''),
      sourceType: 'narrative_page',
      sourceId: String(row.id ?? ''),
      sourceTitle: String(row.title ?? ''),
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(input.query, `${row.title ?? ''} ${row.summary ?? ''}`, row),
      matchReason: 'Matched Brain narrative page',
    })
  }
  beliefCandidate(input: CandidateInput, row: Record<string, unknown>): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: input.family,
      kind: 'belief_pattern',
      title: String(row.pattern_name ?? ''),
      content: String(row.description ?? ''),
      sourceType: 'belief_pattern',
      sourceId: String(row.id ?? ''),
      sourceTitle: String(row.pattern_name ?? ''),
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(
        input.query,
        `${row.pattern_name ?? ''} ${row.description ?? ''}`,
        row,
      ),
      matchReason: 'Matched Brain belief pattern',
    })
  }
  perspectiveCandidate(input: CandidateInput, row: Record<string, unknown>): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: input.family,
      kind: 'perspective',
      title: String(row.name ?? ''),
      content: String(row.description ?? row.narrative_md ?? ''),
      sourceType: 'perspective',
      sourceId: String(row.id ?? ''),
      sourceTitle: String(row.name ?? ''),
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(input.query, `${row.name ?? ''} ${row.description ?? ''}`, row),
      matchReason: 'Matched Brain perspective',
    })
  }
  companySignalCandidate(
    input: CandidateInput,
    row: Record<string, unknown>,
  ): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: 'company',
      kind: 'company_signal',
      title: String(row.signal_type ?? 'Company signal'),
      content: String(row.truth ?? ''),
      sourceType: 'company_cortex_signal',
      sourceId: String(row.id ?? ''),
      sourceTitle: String(row.signal_type ?? 'Company signal'),
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(
        input.query,
        `${row.signal_type ?? ''} ${row.truth ?? ''} ${row.reason ?? ''}`,
        row,
      ),
      matchReason: 'Matched company Brain signal',
    })
  }
  customerAvatarCandidate(
    input: CandidateInput,
    row: Record<string, unknown>,
  ): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: 'customer',
      kind: 'customer_avatar',
      title: String(row.name ?? 'Customer avatar'),
      content: String(row.summary ?? row.narrative_md ?? ''),
      sourceType: 'customer_avatar',
      sourceId: String(row.id ?? ''),
      sourceTitle: String(row.name ?? 'Customer avatar'),
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(
        input.query,
        `${row.name ?? ''} ${row.summary ?? ''} ${row.narrative_md ?? ''}`,
        row,
      ),
      matchReason: 'Matched Customer Brain avatar',
    })
  }
  avatarAxisCandidate(input: CandidateInput, row: Record<string, unknown>): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: 'customer',
      kind: 'avatar_axis',
      title: String(row.name ?? 'Avatar discriminator axis'),
      content: String(row.description ?? ''),
      sourceType: 'avatar_discriminator_axis',
      sourceId: String(row.id ?? ''),
      sourceTitle: String(row.name ?? 'Avatar discriminator axis'),
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(
        input.query,
        `${row.name ?? ''} ${row.description ?? ''} ${row.high_end_signature ?? ''} ${row.low_end_signature ?? ''}`,
        row,
      ),
      matchReason: 'Matched Customer Brain avatar discriminator axis',
    })
  }
  evidenceChunkCandidate(
    input: CandidateInput,
    row: Record<string, unknown>,
  ): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: input.family,
      kind: 'evidence_chunk',
      title: String(row.source_title ?? row.source_type ?? 'Evidence chunk'),
      content: String(row.content ?? ''),
      sourceType: (row.source_type as string | null) ?? null,
      sourceId: (row.source_id as string | null) ?? null,
      sourceTitle: (row.source_title as string | null) ?? null,
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(
        input.query,
        `${row.contextual_prefix ?? ''} ${row.content ?? ''}`,
        row,
      ),
      matchReason: 'Matched original Brain evidence chunk',
    })
  }
  timelineItemCandidate(
    input: CandidateInput,
    row: Record<string, unknown>,
  ): BrainRetrievalCandidate {
    return this.baseCandidate(input, row, {
      family: input.family,
      kind: 'timeline_item',
      title: String(row.title ?? ''),
      content: String(row.description ?? row.title ?? ''),
      sourceType: (row.source_type as string | null) ?? 'brain_timeline_item',
      sourceId: (row.source_id as string | null) ?? String(row.id ?? ''),
      sourceTitle: (row.source_title as string | null) ?? String(row.timeline_title ?? ''),
      semantic: Number(row.similarity ?? 0),
      lexical: this.lexicalScore(
        input.query,
        `${row.timeline_title ?? ''} ${row.title ?? ''} ${row.description ?? ''}`,
        row,
      ),
      matchReason: 'Matched Brain timeline milestone',
    })
  }
  mergeRankedRows(
    first: Array<Record<string, unknown>>,
    second: Array<Record<string, unknown>>,
  ): Array<Record<string, unknown>> {
    const rows = new Map<string, Record<string, unknown>>()
    first.forEach((row, index) => {
      const id = String(row.id ?? '')
      if (!id) return
      rows.set(id, {
        ...(rows.get(id) ?? {}),
        ...row,
        semantic_rank: index + 1,
      })
    })
    second.forEach((row, index) => {
      const id = String(row.id ?? '')
      if (!id) return
      rows.set(id, {
        ...(rows.get(id) ?? {}),
        ...row,
        lexical_rank: index + 1,
      })
    })
    return [...rows.values()]
  }
  private baseCandidate(
    input: CandidateInput,
    row: Record<string, unknown>,
    data: {
      family: BrainSearchFamily
      kind: BrainCandidateKind
      title: string
      content: string
      sourceType: string | null
      sourceId: string | null
      sourceTitle: string | null
      semantic: number
      graph?: number
      lexical: number
      matchReason: string
    },
  ): BrainRetrievalCandidate {
    const graph = data.graph ?? 0
    const graphAdjusted =
      data.semantic > 0 || graph > 0
        ? data.semantic * SNAPSHOT_SEMANTIC_WEIGHT + graph * SNAPSHOT_GRAPH_WEIGHT
        : 0
    const rrf =
      this.rrfScore(row.semantic_rank) +
      this.rrfScore(row.lexical_rank) +
      this.rrfScore(row.graph_rank)
    const strongest = Math.max(data.semantic, data.lexical, graphAdjusted)
    const final = Math.min(
      1,
      Math.max(strongest, rrf * RRF_SCORE_SCALE) + this.metadataTieBreaker(row),
    )
    return {
      id: String(row.id),
      brain_id: input.brain.id,
      brain_scope: input.brain.scope,
      brain_owner_id: input.brain.owner_id,
      org_id: input.brain.org_id,
      effective_access: input.accessMetadata.effective_access,
      access_source: input.accessMetadata.access_source,
      family: data.family,
      kind: data.kind,
      title: data.title,
      content: data.content,
      snippet: data.content.slice(0, 240),
      source_type: data.sourceType,
      source_id: data.sourceId,
      source_title: data.sourceTitle,
      metadata: this.metadataForCandidate(row),
      temporal: temporalCandidateMetadata(row),
      lane: data.kind,
      scores: {
        ...(data.semantic > 0 ? { semantic: data.semantic } : {}),
        ...(data.lexical > 0 ? { lexical: data.lexical } : {}),
        ...(graph > 0 ? { graph } : {}),
        final,
      },
      match_reasons: [data.matchReason],
      evidence_refs: this.evidenceRefs(row),
      related: [],
    }
  }
  private evidenceRefs(row: Record<string, unknown>): Array<Record<string, unknown>> {
    const metadata = row.metadata as Record<string, unknown> | undefined
    const fromMetadata = metadata?.evidence_refs
    if (Array.isArray(fromMetadata)) return fromMetadata as Array<Record<string, unknown>>
    if (Array.isArray(row.evidence_refs)) return row.evidence_refs as Array<Record<string, unknown>>
    if (Array.isArray(row.source_refs)) return row.source_refs as Array<Record<string, unknown>>
    const refs: Array<Record<string, unknown>> = []
    if (row.proof) refs.push({ type: 'proof', text: row.proof })
    if (row.challenge) refs.push({ type: 'challenge', text: row.challenge })
    if (row.source) refs.push({ type: 'source', title: row.source })
    if (Array.isArray(row.source_signal_ids)) {
      for (const id of row.source_signal_ids) refs.push({ type: 'source_signal', id })
    }
    return refs
  }
  private metadataForCandidate(row: Record<string, unknown>): Record<string, unknown> {
    const metadata =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? { ...(row.metadata as Record<string, unknown>) }
        : {}
    for (const key of [
      'memory_type',
      'entry_type',
      'object_type',
      'domain',
      'confidence',
      'significance',
      'significance_score',
      'mastery',
      'tags',
      'status',
      'retrieval_rule',
      'source_signal_ids',
      'episode_id',
      'occurred_at',
      'occurred_until',
      'asserted_at',
      'valid_from',
      'valid_until',
      'effective_from',
      'effective_until',
      'evidence_started_at',
      'evidence_ended_at',
      'temporal_status',
      'temporal_confidence',
      'temporal_source',
    ]) {
      if (row[key] !== undefined && metadata[key] === undefined) metadata[key] = row[key]
    }
    return metadata
  }
  private rrfScore(rank: unknown): number {
    const numericRank = Number(rank ?? 0)
    return numericRank > 0 ? 1 / (RRF_K + numericRank) : 0
  }
  private metadataTieBreaker(row: Record<string, unknown>): number {
    const confidence = this.normalizedNumber(row.confidence)
    const significance = this.normalizedNumber(row.significance ?? row.significance_score)
    const mastery = this.normalizedNumber(row.mastery)
    return confidence * 0.03 + significance * 0.03 + mastery * 0.03
  }
  private normalizedNumber(value: unknown): number {
    const numeric = Number(value ?? 0)
    if (!Number.isFinite(numeric) || numeric <= 0) return 0
    return Math.min(numeric, 1)
  }
  private lexicalScore(query: string, content: string, row: Record<string, unknown>): number {
    const q = query.trim().toLowerCase()
    const text = content.toLowerCase()
    if (!q || !text) return 0
    const terms = q.split(/\s+/).filter(Boolean)
    if (terms.length === 0) return 0
    const rank = Number(row.lexical_rank ?? 0)
    const rankScore = rank > 0 ? 1 / (60 + rank) : 0
    if (text.includes(q)) return Math.max(1, rankScore)
    const hits = terms.filter((term) => text.includes(term)).length
    return Math.max(hits / terms.length, rankScore)
  }
}
