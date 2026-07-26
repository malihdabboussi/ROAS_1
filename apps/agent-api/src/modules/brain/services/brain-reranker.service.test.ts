import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BrainRetrievalCandidate } from '@vibey/api-shared'
import { BrainRerankerService } from './brain-reranker.service'

function candidate(overrides: Partial<BrainRetrievalCandidate>): BrainRetrievalCandidate {
  return {
    id: 'candidate',
    brain_id: 'brain-1',
    brain_scope: 'user',
    brain_owner_id: 'user-1',
    org_id: null,
    effective_access: 'query',
    access_source: 'owner',
    family: 'user',
    kind: 'memory',
    title: 'Candidate',
    content: 'Candidate content',
    snippet: 'Candidate content',
    source_type: null,
    source_id: null,
    source_title: null,
    metadata: {},
    scores: { final: 0.5 },
    match_reasons: [],
    evidence_refs: [],
    related: [],
    ...overrides,
  }
}

describe('BrainRerankerService', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('prioritizes exact title evidence over a vague semantic match', async () => {
    const service = new BrainRerankerService()
    const result = await service.rerank(
      'Approval before mutation',
      [
        candidate({
          id: 'semantic-vague',
          title: 'General workspace behavior',
          content: 'Agents sometimes work with workspace objects.',
          scores: { semantic: 0.72, final: 0.72 },
        }),
        candidate({
          id: 'exact-title',
          title: 'Approval before mutation',
          content: 'Agents ask before creating workspace tasks.',
          source_id: 'source-1',
          source_title: 'Company operating standard',
          metadata: { confidence: 0.9 },
          evidence_refs: [{ type: 'decision', id: 'decision-1' }],
          scores: { lexical: 0.68, final: 0.68 },
        }),
      ],
      2,
    )

    expect(result[0]!.id).toBe('exact-title')
    expect(result[0]!.scores.rerank).toBeGreaterThan(result[1]!.scores.rerank ?? 0)
  })

  it('keeps low-confidence unrelated memories below stronger evidence', async () => {
    const service = new BrainRerankerService()
    const result = await service.rerank(
      'pricing decision',
      [
        candidate({
          id: 'weak-memory',
          title: 'Random pricing thought',
          content: 'Maybe pricing could change someday.',
          metadata: { confidence: 0.1 },
          scores: { semantic: 0.5, final: 0.5 },
        }),
        candidate({
          id: 'strong-evidence',
          title: 'Pricing decision',
          content: 'Launch price was approved.',
          source_id: 'source-2',
          source_title: 'Pricing meeting',
          metadata: { confidence: 0.8 },
          evidence_refs: [{ type: 'quote', text: 'Approved launch price' }],
          scores: { lexical: 0.5, final: 0.5 },
        }),
      ],
      2,
    )

    expect(result[0]!.id).toBe('strong-evidence')
  })

  it('boosts proper-noun matches over generic semantic decoys', async () => {
    const service = new BrainRerankerService()
    const result = await service.rerank(
      'What did Almanac approve for launch?',
      [
        candidate({
          id: 'generic-launch',
          title: 'Launch approval',
          content: 'The team approved launch copy and brand direction.',
          scores: { semantic: 0.82, final: 0.82 },
        }),
        candidate({
          id: 'almanac-launch',
          title: 'Almanac launch approval',
          content: 'Almanac approved the launch plan.',
          source_id: 'source-almanac',
          source_title: 'Almanac planning note',
          scores: { lexical: 0.72, final: 0.72 },
        }),
      ],
      2,
    )

    expect(result[0]!.id).toBe('almanac-launch')
  })

  it('penalizes explicitly negated decoy terms', async () => {
    const service = new BrainRerankerService()
    const result = service.rerankDeterministic(
      'Which launch decision was not Core Web Vitals?',
      [
        candidate({
          id: 'core-web-vitals',
          title: 'Core Web Vitals launch decision',
          content: 'The Core Web Vitals launch decision was approved.',
          scores: { semantic: 0.85, final: 0.85 },
        }),
        candidate({
          id: 'non-cwv',
          title: 'Launch decision',
          content: 'The Almanac launch decision was approved.',
          source_id: 'source-launch',
          source_title: 'Launch decision notes',
          scores: { lexical: 0.7, final: 0.7 },
        }),
      ],
      2,
    )

    expect(result[0]!.id).toBe('non-cwv')
  })

  it('does not fail reranking when OpenRouter generation cost body is empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => '',
    } as Response)
    const service = new BrainRerankerService()
    const cost = await (
      service as unknown as {
        fetchOpenRouterGenerationCost(key: string, generationId: string): Promise<number | null>
      }
    ).fetchOpenRouterGenerationCost('key', 'generation-id')

    expect(cost).toBeNull()
  })

  it('caps reranker output and uses minimal reasoning', async () => {
    vi.stubEnv('BRAIN_LLM_RERANKER', '1')
    vi.stubEnv('BRAIN_LLM_RERANKER_MODEL', 'google/gemini-3.5-flash')
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key')
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'generation-id',
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    ranked: [{ id: 'candidate', score: 0.9, reason: 'Direct evidence' }],
                  }),
                },
              },
            ],
            usage: { prompt_tokens: 100, completion_tokens: 40, total_tokens: 140 },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { total_cost: 0.001 } }), { status: 200 }),
      )
    const recordAttempt = vi.fn(async () => undefined)
    const service = new BrainRerankerService(undefined, { recordAttempt } as never)

    const result = await service.rerank('Candidate evidence', [candidate({})], 1, {
      userId: 'user-1',
    })

    const request = fetchMock.mock.calls[0]?.[1]
    const payload = JSON.parse(String(request?.body)) as Record<string, unknown>
    expect(payload).toMatchObject({
      max_completion_tokens: 1200,
      reasoning: { effort: 'minimal', exclude: true },
    })
    expect(result[0]?.id).toBe('candidate')
    expect(recordAttempt).toHaveBeenCalledTimes(2)
  })
})
