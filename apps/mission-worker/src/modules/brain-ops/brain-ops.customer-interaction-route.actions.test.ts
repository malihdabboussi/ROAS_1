import { describe, expect, it, vi } from 'vitest'
import type { InteractionEnvelopeV1 } from '@vibey/api-shared'
import { BrainOpsProcessor } from './brain-ops.processor'

function makeProcessor(overrides: Record<string, unknown> = {}) {
  const processor = new BrainOpsProcessor(
    { callOpenClawRaw: vi.fn() } as any,
    { getClient: vi.fn(() => ({})) } as any,
    {} as any,
    {} as any,
    { extractAndSave: vi.fn() } as any,
  ) as any
  Object.assign(processor, overrides)
  return processor
}

function makeBrainScopeClient(brainRow: Record<string, unknown> | null) {
  return {
    from: vi.fn((table: string) => {
      const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        maybeSingle: vi.fn().mockResolvedValue({
          data: table === 'ns_brains' ? brainRow : null,
          error: null,
        }),
      }
      return query
    }),
  }
}

function envelope(overrides: Partial<InteractionEnvelopeV1> = {}): InteractionEnvelopeV1 {
  return {
    v: 1,
    channel: 'telegram',
    source_id: 'conv-1',
    title: 'Telegram Chat',
    window: { from: '2026-06-10T10:00:00.000Z', to: '2026-06-10T11:00:00.000Z' },
    participants: [
      {
        role: 'customer',
        name: 'Lead One',
        identifiers: [{ kind: 'telegram_chat_id', value: '12345' }],
      },
    ],
    content: {
      format: 'transcript',
      text: 'Customer: I want to scale my coaching business',
      message_count: 3,
    },
    ...overrides,
  }
}

function job(payload: Record<string, unknown>) {
  return {
    data: {
      outboxId: 'outbox-1',
      brainId: 'brain-1',
      userId: 'user-1',
      orgId: 'org-1',
      eventType: 'customer_interaction_route',
      payload,
    },
  } as any
}

describe('BrainOpsProcessor customer_interaction_route', () => {
  it('rejects jobs whose brain owner does not match the job user (scope gate)', async () => {
    const client = makeBrainScopeClient({
      id: 'brain-1',
      owner_id: 'someone-else',
      org_id: 'org-1',
      scope: 'customer',
    })
    const markOutboxFailed = vi.fn().mockResolvedValue(undefined)
    const processor = makeProcessor({
      markOutboxFailed,
      isCortexMaxEnabled: vi.fn().mockResolvedValue(true),
    })
    processor.databaseService.getClient.mockReturnValue(client)

    const result = await processor.process(job({ envelope: envelope() }))

    expect(result.success).toBe(false)
    expect(result.error).toContain('Brain job user mismatch')
    expect(markOutboxFailed).toHaveBeenCalled()
  })

  it('throws on an invalid envelope payload', async () => {
    const processor = makeProcessor()

    await expect(
      processor.processCustomerInteractionRoute(job({ envelope: { v: 99 } })),
    ).rejects.toThrow(/envelope/i)
  })

  it('marks done with skipped output when the transcript is empty', async () => {
    const markOutboxDone = vi.fn()
    const processor = makeProcessor({ markOutboxDone })

    const result = await processor.processCustomerInteractionRoute(
      job({
        envelope: envelope({ content: { format: 'transcript', text: '   ', message_count: 0 } }),
      }),
    )

    expect(result.success).toBe(true)
    expect(result.output).toMatchObject({ skipped: 'no_transcript' })
    expect(markOutboxDone).toHaveBeenCalledWith('outbox-1')
  })

  it('takes the cheap path for a single telegram source linked to an existing contact', async () => {
    const markOutboxDone = vi.fn()
    const bump = vi.fn()
    const resolveExistingContactByIdentifier = vi.fn().mockResolvedValue({
      id: 'contact-1',
      email: null,
      first_name: 'Lead',
      last_name: 'One',
      contact_type: 'lead',
      contact_type_source: 'integration',
      contact_type_confidence: 0.4,
      business_name: null,
    })
    const processor = makeProcessor({
      markOutboxDone,
      bumpCustomerMemoryCounterAndMaybeEnqueue: bump,
      resolveExistingContactByIdentifier,
    })
    processor.customerInteractionExtraction.extractAndSave.mockResolvedValue({
      status: 'ok',
      memories_created: 2,
      memory_ids: ['m1', 'm2'],
    })

    const result = await processor.processCustomerInteractionRoute(job({ envelope: envelope() }))

    expect(resolveExistingContactByIdentifier).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        orgId: 'org-1',
        kind: 'telegram_chat_id',
        value: '12345',
      }),
    )
    expect(processor.customerInteractionExtraction.extractAndSave).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ brainId: 'brain-1', contactId: 'contact-1' }),
    )
    expect(processor.openclawGateway.callOpenClawRaw).not.toHaveBeenCalled()
    expect(bump).toHaveBeenCalledWith('brain-1', 'user-1', 'org-1', 2)
    expect(markOutboxDone).toHaveBeenCalledWith('outbox-1')
    expect(result.output).toMatchObject({ customer_memories_written: 2, path: 'extraction' })
  })

  it('takes the cheap path with contact_id null for a single source-only customer', async () => {
    const processor = makeProcessor({
      markOutboxDone: vi.fn(),
      bumpCustomerMemoryCounterAndMaybeEnqueue: vi.fn(),
      resolveExistingContactByIdentifier: vi.fn().mockResolvedValue(null),
    })
    processor.customerInteractionExtraction.extractAndSave.mockResolvedValue({
      status: 'ok',
      memories_created: 1,
      memory_ids: ['m1'],
    })

    const result = await processor.processCustomerInteractionRoute(job({ envelope: envelope() }))

    expect(processor.customerInteractionExtraction.extractAndSave).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ brainId: 'brain-1', contactId: null }),
    )
    expect(processor.openclawGateway.callOpenClawRaw).not.toHaveBeenCalled()
    expect(result.output).toMatchObject({ customer_memories_written: 1, path: 'extraction' })
  })

  it('takes the cheap path for a single known email contact (widget)', async () => {
    const resolveOrCreateContactByIdentifier = vi.fn().mockResolvedValue({ id: 'contact-9' })
    const processor = makeProcessor({
      markOutboxDone: vi.fn(),
      bumpCustomerMemoryCounterAndMaybeEnqueue: vi.fn(),
      resolveOrCreateContactByIdentifier,
    })
    processor.customerInteractionExtraction.extractAndSave.mockResolvedValue({
      status: 'ok',
      memories_created: 1,
      memory_ids: ['m1'],
    })

    await processor.processCustomerInteractionRoute(
      job({
        envelope: envelope({
          channel: 'widget',
          participants: [
            {
              role: 'customer',
              name: 'Visitor',
              identifiers: [{ kind: 'email', value: 'lead@example.com' }],
            },
          ],
        }),
      }),
    )

    expect(resolveOrCreateContactByIdentifier).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ kind: 'email', value: 'lead@example.com', channel: 'widget' }),
    )
    expect(processor.openclawGateway.callOpenClawRaw).not.toHaveBeenCalled()
  })

  it('does not bump synthesis counters when the cheap path writes nothing', async () => {
    const bump = vi.fn()
    const processor = makeProcessor({
      markOutboxDone: vi.fn(),
      bumpCustomerMemoryCounterAndMaybeEnqueue: bump,
      resolveExistingContactByIdentifier: vi.fn().mockResolvedValue(null),
    })
    processor.customerInteractionExtraction.extractAndSave.mockResolvedValue({
      status: 'skipped',
      memories_created: 0,
      memory_ids: [],
    })

    const result = await processor.processCustomerInteractionRoute(job({ envelope: envelope() }))

    expect(result.output).toMatchObject({ customer_memories_written: 0 })
    expect(bump).not.toHaveBeenCalled()
  })

  it('throws when the cheap path extraction errors so the outbox can retry', async () => {
    const processor = makeProcessor({
      resolveExistingContactByIdentifier: vi.fn().mockResolvedValue(null),
    })
    processor.customerInteractionExtraction.extractAndSave.mockResolvedValue({
      status: 'error',
      reason: 'LLM returned invalid JSON',
      memories_created: 0,
    })

    await expect(
      processor.processCustomerInteractionRoute(job({ envelope: envelope() })),
    ).rejects.toThrow(/extraction failed/i)
  })

  it('routes multi-participant interactions through Atlas with the routing contract', async () => {
    const markOutboxDone = vi.fn()
    const bump = vi.fn()
    const processor = makeProcessor({
      markOutboxDone,
      bumpCustomerMemoryCounterAndMaybeEnqueue: bump,
      buildInteractionRoutingBundle: vi.fn().mockResolvedValue({
        hostName: 'Host',
        hostEmail: 'host@example.com',
        hostAliases: ['host@example.com'],
        offers: [],
        existingContacts: [],
        routedContacts: [
          {
            contact_id: 'contact-1',
            email: 'client@example.com',
            name: 'Client One',
            existing_contact_type: 'customer',
            existing_contact_type_source: 'integration',
            existing_contact_type_confidence: 0.9,
            business_name: null,
          },
        ],
        sourceIdentities: [
          {
            source_type: 'email',
            source_id: 'client@example.com',
            identity_kind: 'email',
            name: 'Client One',
            role: 'unknown',
          },
        ],
        recentUserBrainContext: '(no capsule yet)',
        attendees: [{ email: 'client@example.com', name: 'Client One' }],
        transcript: 'Client One: I want help scaling.',
        meetingTitle: 'Client Call',
        meetingStartedAt: '2026-06-10T10:00:00.000Z',
      }),
    })
    processor.openclawGateway.callOpenClawRaw.mockResolvedValue({
      content: 'saved',
      toolSteps: [
        {
          name: 'campaign_capability',
          label: 'Saving customer memory',
          status: 'completed',
          action: 'save_customer_memory',
          isError: false,
          result: { success: true, memory_id: 'memory-1', brain_id: 'brain-1' },
        },
      ],
    })

    const multiEnvelope = envelope({
      channel: 'fathom',
      source_id: 'meeting-1',
      participants: [
        { role: 'team', name: 'Host', identifiers: [{ kind: 'email', value: 'host@example.com' }] },
        {
          role: 'unknown',
          name: 'Client One',
          identifiers: [{ kind: 'email', value: 'client@example.com' }],
        },
      ],
      content: {
        format: 'transcript',
        text: 'Client One: I want help scaling.',
        message_count: 1,
      },
    })

    const result = await processor.processCustomerInteractionRoute(job({ envelope: multiEnvelope }))

    expect(processor.openclawGateway.callOpenClawRaw).toHaveBeenCalledTimes(1)
    const prompt = processor.openclawGateway.callOpenClawRaw.mock.calls[0][3] as string
    expect(prompt).toContain('ALLOWED_CUSTOMER_CONTACTS')
    expect(prompt).toContain('ALLOWED_CUSTOMER_SOURCE_IDENTITIES')
    expect(prompt).toContain('I want help scaling.')
    expect(processor.openclawGateway.callOpenClawRaw.mock.calls[0][6]).toMatchObject({
      channel: 'brain-ops',
      targetBrainId: 'brain-1',
    })
    expect(processor.customerInteractionExtraction.extractAndSave).not.toHaveBeenCalled()
    expect(bump).toHaveBeenCalledWith('brain-1', 'user-1', 'org-1', 1)
    expect(markOutboxDone).toHaveBeenCalledWith('outbox-1')
    expect(result.output).toMatchObject({ customer_memories_written: 1, path: 'atlas' })
  })

  it('fails the Atlas path when save_customer_memory actions fail', async () => {
    const processor = makeProcessor({
      buildInteractionRoutingBundle: vi.fn().mockResolvedValue({
        hostName: 'Host',
        hostEmail: null,
        hostAliases: [],
        offers: [],
        existingContacts: [],
        routedContacts: [],
        sourceIdentities: [],
        recentUserBrainContext: '(none)',
        attendees: [],
        transcript: 'Client: help me.',
        meetingTitle: 'Client',
        meetingStartedAt: null,
      }),
    })
    processor.openclawGateway.callOpenClawRaw.mockResolvedValue({
      content: '',
      toolSteps: [
        {
          name: 'campaign_capability',
          label: 'Saving customer memory',
          status: 'failed',
          action: 'save_customer_memory',
          isError: true,
          error: 'contact_id does not belong to this workspace',
        },
      ],
    })

    await expect(
      processor.processCustomerInteractionRoute(
        job({
          envelope: envelope({
            participants: [
              { role: 'customer', name: 'A', identifiers: [] },
              { role: 'customer', name: 'B', identifiers: [] },
            ],
          }),
        }),
      ),
    ).rejects.toThrow(/save_customer_memory action failed/)
  })

  it('keeps the save_customer_memory action contract in the channel-parameterized routing prompt', () => {
    const processor = makeProcessor()
    const prompt = processor.buildRoutingPrompt(
      {
        hostName: 'Brian Mark',
        hostEmail: 'brian@example.com',
        hostAliases: ['brian@example.com'],
        offers: [{ name: 'PT DOM', price: null }],
        existingContacts: [],
        routedContacts: [
          {
            contact_id: 'contact-1',
            email: 'client@example.com',
            name: 'Client One',
            existing_contact_type: 'unknown',
            existing_contact_type_source: 'integration',
            existing_contact_type_confidence: 0.2,
            business_name: null,
          },
        ],
        sourceIdentities: [
          {
            source_type: 'email',
            source_id: 'client@example.com',
            identity_kind: 'email',
            name: 'Client One',
            role: 'unknown',
          },
        ],
        recentUserBrainContext: '(no capsule yet)',
        attendees: [{ email: 'client@example.com', name: 'Client One' }],
        transcript: 'Client One: I want help scaling.',
        meetingTitle: 'Client Chat',
        meetingStartedAt: '2026-06-10T10:00:00Z',
      },
      'brain-1',
      'conv-1',
      'telegram',
    )

    expect(prompt).toContain('## CUSTOMER_BRAIN')
    expect(prompt).toContain('brain_id: brain-1')
    expect(prompt).toContain('"brain_id": "brain-1"')
    expect(prompt).toContain('Do not return a routing JSON object')
    expect(prompt).toContain('"action": "save_customer_memory"')
    expect(prompt).toContain('contact_id=contact-1')
    expect(prompt).toContain('Use contact_id only when it appears in ALLOWED_CUSTOMER_CONTACTS')
    expect(prompt).toContain('ALLOWED_CUSTOMER_SOURCE_IDENTITIES')
    expect(prompt).toContain('source_id=client@example.com')
    expect(prompt).toContain('Telegram conversation')
    expect(prompt).toContain('telegram_chat')
  })

  it('counts successful save_customer_memory tool results', () => {
    const processor = makeProcessor()

    const outcome = processor.summarizeCustomerMemoryActions([
      {
        name: 'campaign_capability',
        label: 'Saving customer memory',
        status: 'completed',
        action: 'save_customer_memory',
        isError: false,
        result: { success: true, memory_id: 'memory-1', brain_id: 'brain-1' },
      },
    ])

    expect(outcome).toMatchObject({
      customerMemoriesWritten: 1,
      failedCustomerMemoryCalls: 0,
      memoryIds: ['memory-1'],
    })
  })

  it('takes the cheap path with the interaction source id when no participant identifier exists', async () => {
    const processor = makeProcessor({
      markOutboxDone: vi.fn(),
      bumpCustomerMemoryCounterAndMaybeEnqueue: vi.fn(),
    })
    processor.customerInteractionExtraction.extractAndSave.mockResolvedValue({
      status: 'ok',
      memories_created: 1,
      memory_ids: ['m1'],
    })

    const result = await processor.processCustomerInteractionRoute(
      job({
        envelope: envelope({
          participants: [{ role: 'customer', name: 'Mystery', identifiers: [] }],
        }),
      }),
    )

    expect(processor.customerInteractionExtraction.extractAndSave).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ contactId: null }),
    )
    expect(processor.openclawGateway.callOpenClawRaw).not.toHaveBeenCalled()
    expect(result.output).toMatchObject({ path: 'extraction' })
  })
})
