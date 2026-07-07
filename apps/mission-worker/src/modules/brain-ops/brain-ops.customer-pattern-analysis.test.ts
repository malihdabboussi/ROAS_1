import { describe, expect, it, vi } from 'vitest'
import { BrainOpsProcessor } from './brain-ops.processor'

function makeProcessor() {
  return new BrainOpsProcessor(
    { callOpenClawRaw: vi.fn() } as any,
    { getClient: vi.fn(() => ({})) } as any,
    {} as any,
    {} as any,
    { extractAndSave: vi.fn() } as any,
  ) as any
}

function makeMemory(
  id: string,
  contactId: string | null,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    content: `${contactId ?? id} memory`,
    contact_id: contactId,
    customer_entity_id: null,
    customer_source_identity_id: null,
    customer_resolution_status: contactId ? 'linked_contact' : 'unlinked_source',
    source_type: 'call',
    source_title: null,
    emotional_valence: null,
    emotional_intensity: null,
    created_at: '2026-06-13T10:00:00.000Z',
    occurred_at: '2026-06-13T10:00:00.000Z',
    occurred_until: null,
    asserted_at: '2026-06-13T10:00:00.000Z',
    ...overrides,
  }
}

function makeRecordingSupabase() {
  const updates: Record<string, unknown>[] = []
  const inserts: Record<string, unknown>[] = []
  const eq = vi.fn().mockResolvedValue({ data: null, error: null })
  const insert = vi.fn((payload: Record<string, unknown>) => {
    inserts.push(payload)
    return {
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { id: 'created-belief' }, error: null }),
      })),
    }
  })
  const update = vi.fn((payload: Record<string, unknown>) => {
    updates.push(payload)
    return { eq }
  })
  return {
    supabase: { from: vi.fn(() => ({ insert, update })) } as any,
    updates,
    inserts,
    update,
    insert,
  }
}

describe('BrainOpsProcessor customer pattern analysis', () => {
  it('parses evidence_type on belief updates and drops invalid tiers', () => {
    const processor = makeProcessor()

    const decision = processor.parsePatternAnalysisDecision(
      JSON.stringify({
        brain_id: 'brain-1',
        new_beliefs: [],
        belief_updates: [
          {
            id: 'belief-1',
            op: 'reinforce',
            supporting_memory_ids: ['memory-1'],
            evidence_type: 'revealed',
            rationale: 'Behavior now supports the belief.',
          },
          {
            id: 'belief-2',
            op: 'reinforce',
            supporting_memory_ids: ['memory-2'],
            evidence_type: 'performative',
            rationale: 'Invalid tier should not pass through.',
          },
        ],
        new_perspectives: [],
        perspective_updates: [],
      }),
      'brain-1',
    )

    expect(decision?.belief_updates[0]).toMatchObject({ evidence_type: 'revealed' })
    expect(decision?.belief_updates[1]).toMatchObject({ evidence_type: null })
  })

  it('promotes an existing belief evidence tier when reinforcement reveals stronger evidence', async () => {
    const processor = makeProcessor()
    const recorder = makeRecordingSupabase()

    const result = await processor.applyPatternAnalysisDecision(recorder.supabase, {
      decision: {
        brain_id: 'brain-1',
        new_beliefs: [],
        belief_updates: [
          {
            id: 'belief-1',
            op: 'reinforce',
            supporting_memory_ids: ['memory-new'],
            evidence_type: 'revealed',
            rationale: 'Behavioral choice corroborates the stated belief.',
          },
        ],
        new_perspectives: [],
        perspective_updates: [],
        log_event: null,
      },
      brainId: 'brain-1',
      existingBeliefs: [
        {
          id: 'belief-1',
          pattern_name: 'Budget authority is invisible until it blocks',
          description: 'Budget owners only become visible when a purchase stalls.',
          status: 'emerging',
          strength: 0.55,
          evidence_type: 'stated',
          reinforcement_count: 0,
          last_reinforced_at: null,
          supporting_memories: ['memory-old'],
        },
      ],
      existingPerspectives: [],
      memories: [makeMemory('memory-old', 'contact-1'), makeMemory('memory-new', 'contact-2')],
      validMemoryIds: new Set(['memory-old', 'memory-new']),
      validCustomerUnitIds: new Set(['contact-1', 'contact-2']),
    })

    expect(result).toMatchObject({ newBeliefs: 0, beliefUpdates: 1 })
    expect(recorder.updates[0]).toMatchObject({
      evidence_type: 'revealed',
      supporting_memories: ['memory-old', 'memory-new'],
      status: 'active',
    })
    expect(recorder.updates[0].strength).toBeCloseTo(0.6)
  })

  it('updates an existing belief instead of inserting a duplicate stronger-tier draft', async () => {
    const processor = makeProcessor()
    const recorder = makeRecordingSupabase()
    const description = 'Customers require internal champions before vendor alignment can move.'

    const result = await processor.applyPatternAnalysisDecision(recorder.supabase, {
      decision: {
        brain_id: 'brain-1',
        new_beliefs: [
          {
            pattern_name: 'Progress requires multi-vendor alignment',
            description,
            emotional_signature: null,
            supporting_memory_ids: ['memory-1', 'memory-2', 'memory-3'],
            supporting_contact_ids: ['contact-1', 'contact-2', 'contact-3'],
            evidence_type: 'revealed',
            discriminator_axis: null,
          },
        ],
        belief_updates: [],
        new_perspectives: [],
        perspective_updates: [],
        log_event: null,
      },
      brainId: 'brain-1',
      existingBeliefs: [
        {
          id: 'belief-existing',
          pattern_name: 'Progress requires multi-vendor alignment',
          description,
          status: 'emerging',
          strength: 0.55,
          evidence_type: 'stated',
          reinforcement_count: 0,
          last_reinforced_at: null,
          supporting_memories: [],
        },
      ],
      existingPerspectives: [],
      memories: [
        makeMemory('memory-1', 'contact-1'),
        makeMemory('memory-2', 'contact-2'),
        makeMemory('memory-3', 'contact-3'),
      ],
      validMemoryIds: new Set(['memory-1', 'memory-2', 'memory-3']),
      validCustomerUnitIds: new Set(['contact-1', 'contact-2', 'contact-3']),
    })

    expect(result).toMatchObject({ newBeliefs: 0, beliefUpdates: 1 })
    expect(recorder.insert).not.toHaveBeenCalled()
    expect(recorder.updates[0]).toMatchObject({
      evidence_type: 'revealed',
      supporting_memories: ['memory-1', 'memory-2', 'memory-3'],
    })
  })

  it('forms new beliefs from distinct source-backed customer units without contacts', async () => {
    const processor = makeProcessor()
    const recorder = makeRecordingSupabase()

    const result = await processor.applyPatternAnalysisDecision(recorder.supabase, {
      decision: {
        brain_id: 'brain-1',
        new_beliefs: [
          {
            pattern_name: 'Anonymous buyers need rollout proof',
            description: 'Source-backed visitors repeatedly ask for proof that rollout work lands.',
            emotional_signature: null,
            supporting_memory_ids: ['memory-1', 'memory-2', 'memory-3'],
            supporting_customer_unit_ids: ['entity-1', 'entity-2', 'entity-3'],
            supporting_contact_ids: [],
            evidence_type: 'stated',
            discriminator_axis: null,
          },
        ],
        belief_updates: [],
        new_perspectives: [],
        perspective_updates: [],
        log_event: null,
      },
      brainId: 'brain-1',
      existingBeliefs: [],
      existingPerspectives: [],
      memories: [
        makeMemory('memory-1', null, { customer_entity_id: 'entity-1' }),
        makeMemory('memory-2', null, { customer_entity_id: 'entity-2' }),
        makeMemory('memory-3', null, { customer_entity_id: 'entity-3' }),
      ],
      validMemoryIds: new Set(['memory-1', 'memory-2', 'memory-3']),
      validCustomerUnitIds: new Set(['entity-1', 'entity-2', 'entity-3']),
    })

    expect(result).toMatchObject({ newBeliefs: 1, beliefUpdates: 0 })
    expect(recorder.inserts[0]).toMatchObject({
      pattern_name: 'Anonymous buyers need rollout proof',
      supporting_memories: ['memory-1', 'memory-2', 'memory-3'],
      strength: 0.55,
    })
  })
})
