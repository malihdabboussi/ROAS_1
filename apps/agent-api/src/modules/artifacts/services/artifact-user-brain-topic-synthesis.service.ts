import { Injectable } from '@nestjs/common'
import type {
  BrainRetrievalCandidate,
  BrainRetrievalSearchInput,
  BrainRetrievalSearchResult,
} from '@vibey/api-shared'

type TopicSection =
  | 'core_beliefs'
  | 'decisions'
  | 'preferences'
  | 'frameworks_and_strategies'
  | 'stories_and_examples'
  | 'perspectives'
  | 'synthesized_context'
  | 'supporting_evidence'

type EvidenceItem = {
  ref: string
  id: string
  kind: BrainRetrievalCandidate['kind']
  memory_type: string | null
  title: string
  excerpt: string
  source_type: string | null
  source_id: string | null
  source_title: string | null
  temporal: BrainRetrievalCandidate['temporal']
  score: number
  match_reasons: string[]
}

const SECTION_ORDER: TopicSection[] = [
  'core_beliefs',
  'decisions',
  'preferences',
  'frameworks_and_strategies',
  'stories_and_examples',
  'perspectives',
  'synthesized_context',
  'supporting_evidence',
]

@Injectable()
export class ArtifactUserBrainTopicSynthesisService {
  async synthesizeTopic(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    if (!target.brainRetrievalService || typeof target.getUserClient !== 'function') {
      throw new Error('Brain retrieval service is unavailable.')
    }

    const topic = this.requiredText(input.topic, 'topic')
    const question = this.optionalText(input.question) ?? `What do I think about ${topic}?`
    const evidenceLimit = this.clampedInteger(input.evidence_limit, 24, 6, 40)
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) ?? null
    const userClient = await target.getUserClient(userId, sessionKey as string)
    const queries = this.buildQueries(topic, question)
    const searchInput = this.searchInput(input)
    const brainId = this.optionalText(input.brain_id)

    const searches = (await Promise.all(
      queries.map((query) =>
        target.brainRetrievalService.search({
          supabase: target.serviceClient,
          userClient,
          family: 'user',
          ...(brainId ? { brainId } : {}),
          query,
          userId,
          orgId,
          requiredAccess: 'query',
          limit: Math.min(Math.max(evidenceLimit, 15), 30),
          ...searchInput,
        } satisfies BrainRetrievalSearchInput & Record<string, unknown>),
      ),
    )) as BrainRetrievalSearchResult[]

    const uniqueCandidates = this.mergeCandidates(searches)
    const selectedCandidates = this.selectEvidence(uniqueCandidates, evidenceLimit)
    const evidence = this.toEvidence(selectedCandidates)
    const sections = this.sectionRefs(selectedCandidates, evidence)
    const gaps = this.uniqueStrings(searches.flatMap((search) => search.missing))
    const confidences = searches.map((search) => search.sufficiency.confidence)
    const contextSufficient =
      evidence.length >= 3 && searches.some((search) => search.context_sufficient)

    return {
      success: true as const,
      topic,
      question,
      brain_id: selectedCandidates[0]?.brain_id ?? brainId ?? null,
      synthesis: {
        short_answer_basis: this.shortAnswerBasis(sections),
        ...sections,
      },
      coverage: {
        query_count: queries.length,
        queries,
        retrieved_count: searches.reduce((sum, search) => sum + search.count, 0),
        unique_evidence_count: uniqueCandidates.length,
        selected_evidence_count: evidence.length,
        source_count: new Set(
          evidence.map((item) => `${item.source_type ?? ''}:${item.source_id ?? ''}`),
        ).size,
        context_sufficient: contextSufficient,
        confidence:
          confidences.length > 0
            ? Number(
                (
                  confidences.reduce((sum, confidence) => sum + confidence, 0) / confidences.length
                ).toFixed(3),
              )
            : 0,
      },
      gaps,
      evidence,
    }
  }

  private buildQueries(topic: string, question: string): string[] {
    return this.uniqueStrings([
      question,
      topic,
      `${topic} beliefs decisions preferences`,
      `${topic} strategies frameworks examples`,
    ])
  }

  private searchInput(input: Record<string, unknown>): Partial<BrainRetrievalSearchInput> {
    return {
      ...(this.optionalText(input.time_mode)
        ? {
            time_mode: this.optionalText(input.time_mode) as BrainRetrievalSearchInput['time_mode'],
          }
        : {}),
      ...(this.optionalText(input.as_of) ? { as_of: this.optionalText(input.as_of) } : {}),
      ...(this.optionalText(input.occurred_from)
        ? { occurred_from: this.optionalText(input.occurred_from) }
        : {}),
      ...(this.optionalText(input.occurred_to)
        ? { occurred_to: this.optionalText(input.occurred_to) }
        : {}),
      ...(typeof input.include_historical === 'boolean'
        ? { include_historical: input.include_historical }
        : {}),
    }
  }

  private mergeCandidates(searches: BrainRetrievalSearchResult[]): BrainRetrievalCandidate[] {
    const byKey = new Map<string, BrainRetrievalCandidate>()
    for (const candidate of searches.flatMap((search) => search.results)) {
      const key = `${candidate.brain_id}:${candidate.kind}:${candidate.id}`
      const current = byKey.get(key)
      if (!current || candidate.scores.final > current.scores.final) byKey.set(key, candidate)
    }
    return [...byKey.values()].sort((left, right) => right.scores.final - left.scores.final)
  }

  private selectEvidence(
    candidates: BrainRetrievalCandidate[],
    limit: number,
  ): BrainRetrievalCandidate[] {
    const buckets = new Map<TopicSection, BrainRetrievalCandidate[]>(
      SECTION_ORDER.map((section) => [section, []]),
    )
    for (const candidate of candidates) buckets.get(this.sectionFor(candidate))?.push(candidate)

    const selected: BrainRetrievalCandidate[] = []
    const selectedKeys = new Set<string>()
    for (let round = 0; round < 2 && selected.length < limit; round += 1) {
      for (const section of SECTION_ORDER) {
        const candidate = buckets.get(section)?.[round]
        if (candidate) this.addCandidate(selected, selectedKeys, candidate, limit)
      }
    }
    for (const candidate of candidates) {
      this.addCandidate(selected, selectedKeys, candidate, limit)
      if (selected.length >= limit) break
    }
    return selected
  }

  private addCandidate(
    selected: BrainRetrievalCandidate[],
    selectedKeys: Set<string>,
    candidate: BrainRetrievalCandidate,
    limit: number,
  ): void {
    if (selected.length >= limit) return
    const key = `${candidate.brain_id}:${candidate.kind}:${candidate.id}`
    if (selectedKeys.has(key)) return
    selectedKeys.add(key)
    selected.push(candidate)
  }

  private sectionFor(candidate: BrainRetrievalCandidate): TopicSection {
    if (candidate.kind === 'belief_pattern') return 'core_beliefs'
    if (candidate.kind === 'perspective') return 'perspectives'
    if (candidate.kind === 'snapshot' || candidate.kind === 'narrative_page') {
      return 'synthesized_context'
    }
    const memoryType = String(candidate.metadata.memory_type ?? '').toLowerCase()
    if (memoryType === 'decision') return 'decisions'
    if (memoryType === 'preference') return 'preferences'
    if (memoryType === 'framework') return 'frameworks_and_strategies'
    if (memoryType === 'story' || memoryType === 'event') return 'stories_and_examples'
    return 'supporting_evidence'
  }

  private toEvidence(candidates: BrainRetrievalCandidate[]): EvidenceItem[] {
    return candidates.map((candidate, index) => ({
      ref: `E${index + 1}`,
      id: candidate.id,
      kind: candidate.kind,
      memory_type: this.optionalText(candidate.metadata.memory_type),
      title: candidate.title,
      excerpt: this.excerpt(candidate.snippet || candidate.content),
      source_type: candidate.source_type,
      source_id: candidate.source_id,
      source_title: candidate.source_title,
      temporal: candidate.temporal,
      score: candidate.scores.final,
      match_reasons: candidate.match_reasons,
    }))
  }

  private sectionRefs(
    candidates: BrainRetrievalCandidate[],
    evidence: EvidenceItem[],
  ): Record<TopicSection, string[]> {
    const sections = Object.fromEntries(
      SECTION_ORDER.map((section) => [section, [] as string[]]),
    ) as Record<TopicSection, string[]>
    candidates.forEach((candidate, index) =>
      sections[this.sectionFor(candidate)].push(evidence[index].ref),
    )
    return sections
  }

  private shortAnswerBasis(sections: Record<TopicSection, string[]>): string[] {
    return this.uniqueStrings([
      ...sections.core_beliefs,
      ...sections.decisions,
      ...sections.preferences,
      ...sections.frameworks_and_strategies,
      ...sections.perspectives,
    ]).slice(0, 6)
  }

  private excerpt(value: string): string {
    const normalized = value.replace(/\s+/g, ' ').trim()
    return normalized.length <= 900 ? normalized : `${normalized.slice(0, 897)}...`
  }

  private requiredText(value: unknown, field: string): string {
    const normalized = this.optionalText(value)
    if (!normalized) throw new Error(`${field} is required.`)
    return normalized
  }

  private optionalText(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
  }

  private clampedInteger(value: unknown, fallback: number, min: number, max: number): number {
    const parsed = Number(value ?? fallback)
    if (!Number.isFinite(parsed)) return fallback
    return Math.min(Math.max(Math.floor(parsed), min), max)
  }

  private uniqueStrings(values: Array<string | null | undefined>): string[] {
    return [...new Set(values.filter((value): value is string => Boolean(value)))]
  }
}
