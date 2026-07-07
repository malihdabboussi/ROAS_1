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

function makeRecordingSupabase() {
  const avatarInserts: Record<string, unknown>[] = []
  const membershipUpserts: Array<{
    payload: Array<Record<string, unknown>>
    options: Record<string, unknown>
  }> = []

  return {
    calls: { avatarInserts, membershipUpserts },
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'customer_avatars') {
          return {
            insert(payload: Record<string, unknown>) {
              avatarInserts.push(payload)
              return {
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: { id: 'avatar-1' }, error: null }),
                })),
              }
            },
          }
        }
        if (table === 'customer_avatar_memberships') {
          return {
            upsert(payload: Array<Record<string, unknown>>, options: Record<string, unknown>) {
              membershipUpserts.push({ payload, options })
              return Promise.resolve({ error: null })
            },
          }
        }
        return {}
      }),
    } as any,
  }
}

function avatarDraft(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Source Backed Operators',
    summary: 'Operators with source-backed buying proof.',
    narrative_md: 'They want proof before rollout.',
    status: 'active',
    strength: 0.7,
    confidence: 0.8,
    member_customer_unit_ids: ['entity-1', 'entity-2', 'source-1'],
    member_contact_ids: ['contact-1'],
    member_strength: { 'entity-1': 0.9, 'entity-2': 0.8, 'source-1': 0.7 },
    dominant_perspective_ids: [],
    dominant_belief_ids: [],
    dominant_pain_points: [],
    emotional_signature: null,
    blind_spots: null,
    discriminator_profile: {},
    needs_profile: null,
    evidence_distribution: null,
    lineage: null,
    contrast_profile: null,
    discriminator_questions: [],
    offer_ids: [],
    declared_avatar_id: null,
    ...overrides,
  }
}

describe('BrainOpsProcessor customer avatar synthesis', () => {
  it('writes customer-unit avatar membership and keeps known-contact projection', async () => {
    const processor = makeProcessor()
    const recorder = makeRecordingSupabase()

    const result = await processor.applyAvatarDecision(recorder.supabase, {
      decision: {
        brain_id: 'brain-1',
        new_avatars: [avatarDraft()],
        avatar_updates: [],
        proposed_axes: [],
        log_event: null,
      },
      brainId: 'brain-1',
      orgId: 'org-1',
      existingAvatars: [],
      validContactIds: new Set(['contact-1']),
      validCustomerUnitIds: new Set(['entity-1', 'entity-2', 'source-1']),
      customerEntityIds: new Set(['entity-1', 'entity-2']),
      contactIdByUnitId: new Map([['entity-1', 'contact-1']]),
      validPerspectiveIds: new Set(),
      validBeliefIds: new Set(),
      validAxisIds: new Set(),
    })

    expect(result).toMatchObject({ newAvatars: 1 })
    expect(recorder.calls.avatarInserts[0]).toMatchObject({
      member_customer_unit_ids: ['entity-1', 'entity-2', 'source-1'],
      member_contact_ids: ['contact-1'],
    })
    expect(recorder.calls.membershipUpserts[0].options).toMatchObject({
      onConflict: 'avatar_id,member_key',
    })
    expect(recorder.calls.membershipUpserts[0].payload).toEqual([
      expect.objectContaining({
        avatar_id: 'avatar-1',
        brain_id: 'brain-1',
        member_key: 'entity-1',
        member_kind: 'customer_entity',
        customer_entity_id: 'entity-1',
        contact_id: 'contact-1',
        strength: 0.9,
      }),
      expect.objectContaining({
        member_key: 'entity-2',
        customer_entity_id: 'entity-2',
        contact_id: null,
        strength: 0.8,
      }),
      expect.objectContaining({
        member_key: 'source-1',
        member_kind: 'source_identity',
        customer_entity_id: null,
        contact_id: null,
        customer_source_identity_id: 'source-1',
        strength: 0.7,
      }),
    ])
  })

  it('maps legacy member_contact_ids to customer units during rollout', async () => {
    const processor = makeProcessor()
    const recorder = makeRecordingSupabase()

    await processor.applyAvatarDecision(recorder.supabase, {
      decision: {
        brain_id: 'brain-1',
        new_avatars: [
          avatarDraft({
            member_customer_unit_ids: [],
            member_contact_ids: ['contact-1', 'contact-2', 'contact-3'],
            member_strength: { 'contact-1': 0.9, 'contact-2': 0.8, 'contact-3': 0.7 },
          }),
        ],
        avatar_updates: [],
        proposed_axes: [],
        log_event: null,
      },
      brainId: 'brain-1',
      orgId: 'org-1',
      existingAvatars: [],
      validContactIds: new Set(['contact-1', 'contact-2', 'contact-3']),
      validCustomerUnitIds: new Set(['entity-1', 'entity-2', 'entity-3']),
      customerEntityIds: new Set(['entity-1', 'entity-2', 'entity-3']),
      contactIdByUnitId: new Map([
        ['entity-1', 'contact-1'],
        ['entity-2', 'contact-2'],
        ['entity-3', 'contact-3'],
      ]),
      validPerspectiveIds: new Set(),
      validBeliefIds: new Set(),
      validAxisIds: new Set(),
    })

    expect(recorder.calls.avatarInserts[0]).toMatchObject({
      member_customer_unit_ids: ['entity-1', 'entity-2', 'entity-3'],
      member_contact_ids: ['contact-1', 'contact-2', 'contact-3'],
    })
    expect(recorder.calls.membershipUpserts[0].payload.map((row) => row.strength)).toEqual([
      0.9,
      0.8,
      0.7,
    ])
  })
})
