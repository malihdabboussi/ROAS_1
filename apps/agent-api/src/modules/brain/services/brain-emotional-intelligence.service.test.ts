import { describe, expect, it, vi } from 'vitest'
import { EmotionalIntelligenceService } from './emotional-intelligence.service'

function makeThenableQuery(result: unknown) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    is: vi.fn(() => query),
    gte: vi.fn(() => query),
    not: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(result)),
  }
  return query
}

describe('EmotionalIntelligenceService', () => {
  it('records an emotional observation after validating the memory exists', async () => {
    const responseInsert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: { id: 'response-1', emotion: 'determination' },
          error: null,
        })),
      })),
    }))
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ns_memories') {
          return makeThenableQuery({ data: { id: 'memory-1' }, error: null })
        }
        if (table === 'ns_emotional_responses') {
          return { insert: responseInsert }
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    }
    const service = new EmotionalIntelligenceService({ callGemini: vi.fn() } as any)

    await expect(
      service.recordObservation(supabase as any, {
        memory_id: 'memory-1',
        observer_id: 'observer-1',
        subject_id: 'subject-1',
        emotion: ' Determination ',
        valence: 5,
        intensity: -1,
        context: 'coaching',
        session_key: 'session-1',
      }),
    ).resolves.toEqual({
      status: 'recorded',
      response: { id: 'response-1', emotion: 'determination' },
    })

    expect(responseInsert).toHaveBeenCalledWith({
      memory_id: 'memory-1',
      observer_id: 'observer-1',
      subject_id: 'subject-1',
      emotion: 'determination',
      valence: 1,
      intensity: 0,
      context: 'coaching',
      session_key: 'session-1',
    })
  })

  it('builds an emotional profile and scopes charged memories to the default brain', async () => {
    const chargedQuery = makeThenableQuery({
      data: [
        {
          id: 'memory-1',
          content: 'Launch calm.',
          source_emotion: 'confidence',
          emotional_valence: 0.6,
          emotional_intensity: 0.8,
        },
      ],
      error: null,
    })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ns_emotional_responses') {
          return makeThenableQuery({
            data: [
              { id: 'r1', emotion: 'focus', valence: 0.4, intensity: 0.8 },
              { id: 'r2', emotion: 'focus', valence: 0.2, intensity: 0.6 },
            ],
            error: null,
          })
        }
        if (table === 'ns_belief_patterns') {
          return makeThenableQuery({ data: [{ id: 'belief-1' }], error: null })
        }
        if (table === 'ns_perspectives') {
          return makeThenableQuery({ data: [{ id: 'perspective-1' }], error: null })
        }
        if (table === 'ns_brains') {
          return makeThenableQuery({ data: { id: 'brain-default' }, error: null })
        }
        if (table === 'ns_memories') return chargedQuery
        throw new Error(`Unexpected table ${table}`)
      }),
    }
    const service = new EmotionalIntelligenceService({ callGemini: vi.fn() } as any)

    const result = await service.getEmotionalProfile(supabase as any, 'subject-1')

    expect(result).toMatchObject({
      subject_id: 'subject-1',
      dominant_emotions: [{ emotion: 'focus', count: 2, avgValence: 0.3, avgIntensity: 0.7 }],
      active_beliefs: [{ id: 'belief-1' }],
      perspectives: [{ id: 'perspective-1' }],
      most_charged_memories: [{ id: 'memory-1' }],
      summary: {
        total_responses: 2,
        active_beliefs: 1,
        active_perspectives: 1,
      },
    })
    expect(chargedQuery.eq).toHaveBeenCalledWith('brain_id', 'brain-default')
  })

  it('creates belief patterns from clustered emotional responses', async () => {
    const insertPattern = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: { id: 'belief-new' },
          error: null,
        })),
      })),
    }))
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ns_emotional_responses') {
          return makeThenableQuery({
            data: [
              {
                id: 'r1',
                memory_id: 'm1',
                emotion: 'focus',
                valence: 0.4,
                intensity: 0.7,
                context: 'session',
              },
              {
                id: 'r2',
                memory_id: 'm2',
                emotion: 'focus',
                valence: 0.3,
                intensity: 0.8,
                context: 'session',
              },
              {
                id: 'r3',
                memory_id: 'm3',
                emotion: 'focus',
                valence: 0.2,
                intensity: 0.6,
                context: 'session',
              },
            ],
            error: null,
          })
        }
        if (table === 'ns_memories') {
          return makeThenableQuery({
            data: [
              { id: 'm1', content: 'Prefers clear priorities.', source_emotion: 'focus' },
              { id: 'm2', content: 'Repeats calm launch language.', source_emotion: 'focus' },
              { id: 'm3', content: 'Avoids noisy execution.', source_emotion: 'focus' },
            ],
            error: null,
          })
        }
        if (table === 'ns_belief_patterns') {
          return {
            select: vi.fn(() => makeThenableQuery({ data: [], error: null })),
            insert: insertPattern,
          }
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    }
    const embedding = {
      callGemini: vi.fn(async () =>
        JSON.stringify([
          {
            pattern_name: 'Calm execution bias',
            description: 'The subject prefers calm, clear execution.',
            emotional_signature: { dominant_emotion: 'focus' },
            supporting_response_ids: ['r1', 'r2', 'r3'],
            strength: 0.7,
          },
        ]),
      ),
    }
    const service = new EmotionalIntelligenceService(embedding as any)

    await expect(service.detectPatterns(supabase as any, 'subject-1', 7, 'org-1')).resolves.toEqual(
      {
        status: 'analyzed',
        patterns_processed: 1,
        details: [{ id: 'belief-new', action: 'created', pattern_name: 'Calm execution bias' }],
      },
    )

    expect(embedding.callGemini).toHaveBeenCalledWith(expect.any(String), undefined, {
      userId: 'subject-1',
      orgId: 'org-1',
    })
    expect(insertPattern).toHaveBeenCalledWith(
      expect.objectContaining({
        subject_id: 'subject-1',
        pattern_name: 'Calm execution bias',
        strength: 0.7,
        status: 'active',
        supporting_memories: ['m1', 'm2', 'm3'],
        supporting_responses: ['r1', 'r2', 'r3'],
      }),
    )
  })
})
