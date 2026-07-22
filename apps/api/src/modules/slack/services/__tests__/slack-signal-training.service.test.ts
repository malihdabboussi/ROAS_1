import { describe, expect, it, vi } from 'vitest'
import { SlackSignalTrainingService } from '../slack-signal-training.service'

vi.mock('../../../brain/services/embedding.service', () => ({ EmbeddingService: class {} }))

describe('SlackSignalTrainingService', () => {
  it('creates only internal Shadow actions and stores reusable routing guidance', async () => {
    const people = [
      { id: 'janine-id', display_name: 'Janine', relationship_kind: 'internal' },
      { id: 'nefi-id', display_name: 'Nefi', relationship_kind: 'internal' },
      { id: 'betty-id', display_name: 'Betty', relationship_kind: 'internal' },
      { id: 'client-id', display_name: 'Josh', relationship_kind: 'external' },
    ]
    const peopleRepository = {
      listPeople: vi.fn().mockResolvedValue(people),
      listShadowActions: vi.fn().mockResolvedValue([
        {
          id: 'signal-1',
          target_member_id: null,
          proposed_content: 'Josh asked for payment, replay, and book details.',
          rationale: 'Three questions have no reply.',
          source_channel_id: 'C1',
          source_message_ts: '100.1',
          metadata: {},
        },
      ]),
      createShadowAction: vi
        .fn()
        .mockImplementation((_client, input) => Promise.resolve({ id: input.targetMemberId })),
      reviewShadowAction: vi.fn().mockResolvedValue({ id: 'signal-1', status: 'approved' }),
    }
    const rules = { createRule: vi.fn().mockResolvedValue({ id: 'rule-1' }) }
    const gemini = {
      callGeminiWithUsage: vi.fn().mockResolvedValue({
        text: JSON.stringify({
          actions: [
            { recipient_names: ['Janine'], message: 'Please handle the payment link.' },
            { recipient_names: ['Nefi', 'Betty'], message: 'Please find the replay.' },
            { recipient_names: ['Josh'], message: 'We will get back to you.' },
          ],
        }),
      }),
    }
    const service = new SlackSignalTrainingService(
      peopleRepository as never,
      rules as never,
      gemini as never,
    )

    const result = await service.train({
      supabase: {} as never,
      orgId: 'org-1',
      userId: 'admin-1',
      signalId: 'signal-1',
      instruction:
        'Ask Janine about payment, Nefi and Betty about the replay, and Nate about the book.',
      saveAsRule: true,
    })

    expect(result.actions).toHaveLength(2)
    expect(peopleRepository.createShadowAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        targetMemberId: 'nefi-id',
        metadata: expect.objectContaining({
          additional_recipient_member_ids: ['betty-id'],
          parent_signal_id: 'signal-1',
        }),
      }),
    )
    expect(rules.createRule).toHaveBeenCalledOnce()
  })
})
