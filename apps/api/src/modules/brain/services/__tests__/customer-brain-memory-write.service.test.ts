import { describe, expect, it, vi } from 'vitest'
import { CustomerBrainRepository } from '../../repositories/customer-brain.repository'
import { CustomerBrainMemoryWriteService } from '../customer-brain-memory-write.service'

function makeClient() {
  const calls: Array<{ table: string; insert?: unknown }> = []

  const makeQuery = (table: string) => {
    const query: Record<string, unknown> = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      is: vi.fn(() => query),
      insert: vi.fn((value: unknown) => {
        calls.push({ table, insert: value })
        return query
      }),
      maybeSingle: vi.fn(async () => {
        if (table === 'ns_brains') {
          return {
            data: { id: 'brain-1', owner_id: 'user-1', org_id: null, scope: 'customer' },
            error: null,
          }
        }
        if (table === 'contacts') {
          return { data: { id: 'contact-1', user_id: 'user-1', org_id: null }, error: null }
        }
        if (table === 'ns_memories') {
          return { data: { id: 'memory-existing' }, error: null }
        }
        return { data: null, error: null }
      }),
      single: vi.fn(async () => {
        if (table === 'ns_memories') {
          return {
            data: null,
            error: { message: 'duplicate key value violates unique constraint' },
          }
        }
        return { data: null, error: null }
      }),
    }
    return query
  }

  return {
    calls,
    client: { from: vi.fn((table: string) => makeQuery(table)) },
  }
}

describe('CustomerBrainMemoryWriteService', () => {
  it('returns the existing memory id when a duplicate manual customer memory is written', async () => {
    const { client } = makeClient()
    const brainOpsHook = { onCustomerMemoriesSaved: vi.fn(async () => undefined) }
    const customerBrain = { getOrCreateCustomerBrain: vi.fn() }
    const evidenceIngestion = {
      writeServiceEvidenceChunks: vi.fn(async () => ({ chunks_inserted: 1 })),
    }
    const service = new CustomerBrainMemoryWriteService(
      new CustomerBrainRepository({ client } as any),
      brainOpsHook as any,
      customerBrain as any,
      evidenceIngestion as any,
    )

    await expect(
      service.addTextMemory('user-1', { orgId: null, orgRole: null } as any, {
        brainId: 'brain-1',
        title: 'Call note',
        content: 'Customer cares about implementation speed.',
        contactId: 'contact-1',
        sourceType: 'manual',
      }),
    ).resolves.toEqual({
      success: true,
      memory_id: 'memory-existing',
      brain_id: 'brain-1',
      contact_id: 'contact-1',
    })

    expect(brainOpsHook.onCustomerMemoriesSaved).toHaveBeenCalledWith('brain-1', 1)
    expect(evidenceIngestion.writeServiceEvidenceChunks).not.toHaveBeenCalled()
  })
})
