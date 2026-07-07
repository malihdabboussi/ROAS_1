import { describe, expect, it, vi } from 'vitest'
import { ArtifactCustomerBrainService } from './artifact-customer-brain.service'

function makeTarget() {
  const inserts: Array<{ table: string; value: Record<string, unknown> }> = []
  const tableCalls: string[] = []
  const serviceClient = {
    from(table: string) {
      tableCalls.push(table)
      const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        is: vi.fn(() => chain),
        insert: vi.fn((value: Record<string, unknown>) => {
          inserts.push({ table, value })
          return chain
        }),
        upsert: vi.fn((value: Record<string, unknown>) => {
          inserts.push({ table, value })
          return chain
        }),
        maybeSingle: vi.fn(async () => {
          if (table === 'ns_brains') {
            return {
              data: {
                id: 'customer-brain-1',
                owner_id: 'user-1',
                org_id: 'org-1',
                scope: 'customer',
              },
              error: null,
            }
          }
          if (table === 'contacts') {
            return {
              data: { id: 'contact-1', user_id: 'user-1', org_id: 'org-1' },
              error: null,
            }
          }
          return { data: null, error: null }
        }),
        single: vi.fn(async () => {
          if (table === 'customer_entities') {
            return { data: { id: 'customer-entity-1' }, error: null }
          }
          if (table === 'customer_source_identities') {
            return { data: { id: 'customer-source-identity-1' }, error: null }
          }
          return { data: { id: 'memory-1' }, error: null }
        }),
      }
      return chain
    },
  }

  return {
    inserts,
    tableCalls,
    target: {
      serviceClient,
      embeddingService: { getEmbedding: vi.fn().mockResolvedValue(null) },
      resolveUserId: vi.fn(() => 'user-1'),
      resolveOrgId: vi.fn(() => 'org-1'),
      getUserClient: vi.fn().mockResolvedValue({
        rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      }),
    },
  }
}

describe('ArtifactCustomerBrainService', () => {
  it('persists optional Fathom speaker and metadata on save_customer_memory', async () => {
    const service = new ArtifactCustomerBrainService()
    const { target, inserts } = makeTarget()
    const handlers = service.getHandlers(target)

    const result = await handlers.save_customer_memory(
      {
        brain_id: 'customer-brain-1',
        contact_id: 'contact-1',
        content: 'Customer wants a weekly rollout summary after onboarding calls.',
        memory_type: 'insight',
        source_type: 'fathom_call',
        source_id: 'meeting-1',
        source_title: 'Customer onboarding',
        speaker: 'Maria Lopez',
        metadata: {
          meeting_id: 'meeting-1',
          attendee_email: 'maria@example.com',
          routing_confidence: 0.91,
        },
      },
      'agent:org:org-1:brain_ops:atlas:user-1:outbox-1::org:org-1',
    )

    expect(result).toMatchObject({
      success: true,
      memory_id: 'memory-1',
      brain_id: 'customer-brain-1',
      contact_id: 'contact-1',
      customer_entity_id: 'customer-entity-1',
      customer_source_identity_id: 'customer-source-identity-1',
      customer_resolution_status: 'linked_contact',
    })
    expect(inserts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'ns_memories',
          value: expect.objectContaining({
            speaker: 'Maria Lopez',
            customer_entity_id: 'customer-entity-1',
            customer_source_identity_id: 'customer-source-identity-1',
            customer_resolution_status: 'linked_contact',
            metadata: expect.objectContaining({
              user_id: 'user-1',
              meeting_id: 'meeting-1',
              attendee_email: 'maria@example.com',
              routing_confidence: 0.91,
            }),
          }),
        }),
      ]),
    )
  })

  it('saves source-anchored customer memories without a contact', async () => {
    const service = new ArtifactCustomerBrainService()
    const { target, inserts, tableCalls } = makeTarget()
    const handlers = service.getHandlers(target)

    const result = await handlers.save_customer_memory(
      {
        brain_id: 'customer-brain-1',
        content: 'Public widget visitor asked for clearer weekly rollout updates after onboarding.',
        memory_type: 'insight',
        source_type: 'widget_chat',
        source_id: 'conversation-1',
        source_title: 'Public widget chat',
        visitor_id: 'visitor-1',
      },
      'agent:org:org-1:brain_ops:atlas:user-1:outbox-1::org:org-1',
    )

    expect(result).toMatchObject({
      success: true,
      memory_id: 'memory-1',
      brain_id: 'customer-brain-1',
      contact_id: null,
      customer_entity_id: 'customer-entity-1',
      customer_source_identity_id: 'customer-source-identity-1',
      customer_resolution_status: 'unlinked_source',
    })
    expect(tableCalls).not.toContain('contacts')
    expect(inserts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'ns_memories',
          value: expect.objectContaining({
            contact_id: null,
            source_type: 'widget_chat',
            source_id: 'conversation-1',
            customer_entity_id: 'customer-entity-1',
            customer_source_identity_id: 'customer-source-identity-1',
            customer_resolution_status: 'unlinked_source',
            metadata: expect.objectContaining({
              identity_resolution: expect.objectContaining({
                status: 'unlinked_source',
                contact_id: null,
                customer_entity_id: 'customer-entity-1',
                customer_source_identity_id: 'customer-source-identity-1',
                source_anchor_field: 'source_id',
                source_anchor_value: 'conversation-1',
              }),
            }),
          }),
        }),
      ]),
    )
    expect(inserts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'customer_entities',
          value: expect.objectContaining({
            brain_id: 'customer-brain-1',
            entity_key: 'source:widget_chat:conversation-1',
            entity_type: 'source_identity',
            primary_contact_id: null,
          }),
        }),
        expect.objectContaining({
          table: 'customer_source_identities',
          value: expect.objectContaining({
            brain_id: 'customer-brain-1',
            customer_entity_id: 'customer-entity-1',
            source_type: 'widget_chat',
            source_id: 'conversation-1',
            contact_id: null,
          }),
        }),
      ]),
    )
  })

  it('rejects contactless customer memories without durable source identity', async () => {
    const service = new ArtifactCustomerBrainService()
    const { target, inserts } = makeTarget()
    const handlers = service.getHandlers(target)

    const result = await handlers.save_customer_memory(
      {
        brain_id: 'customer-brain-1',
        content: 'Customer asked for clearer weekly rollout updates after onboarding.',
        memory_type: 'insight',
      },
      'agent:org:org-1:brain_ops:atlas:user-1:outbox-1::org:org-1',
    )

    expect(result).toMatchObject({
      success: false,
      error: expect.stringMatching(/contact_id or durable source identity/i),
    })
    expect(inserts).toEqual([])
  })
})
