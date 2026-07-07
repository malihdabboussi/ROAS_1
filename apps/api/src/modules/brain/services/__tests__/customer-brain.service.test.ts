import { describe, expect, it, vi } from 'vitest'
import { CustomerBrainRepository } from '../../repositories/customer-brain.repository'
import { CustomerBrainService } from '../customer-brain.service'

function makeBrainQuery(result: {
  existing?: Record<string, unknown> | null
  created?: Record<string, unknown> | null
  updated?: Record<string, unknown> | null
  error?: { message: string } | null
}) {
  const query: Record<string, unknown> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({
      data: result.existing ?? null,
      error: result.error ?? null,
    })),
    single: vi.fn(async () => ({
      data: result.updated ?? result.created ?? null,
      error: result.error ?? null,
    })),
  }
  return query
}

describe('CustomerBrainService', () => {
  it('creates a customer brain when none exists for the org', async () => {
    const created = {
      id: 'brain-customer',
      owner_id: 'user-1',
      org_id: 'org-1',
      cortex_max: true,
    }
    const query = makeBrainQuery({ existing: null, created })
    const client = { from: vi.fn(() => query) }
    const service = new CustomerBrainService(new CustomerBrainRepository({ client } as any))

    await expect(
      service.getOrCreateCustomerBrain({ ownerId: 'user-1', orgId: 'org-1' }),
    ).resolves.toEqual(created)

    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: 'user-1',
        org_id: 'org-1',
        scope: 'customer',
        cortex_max: true,
      }),
    )
  })

  it('toggles customer brain enablement on the resolved brain', async () => {
    const existing = {
      id: 'brain-customer',
      owner_id: 'user-1',
      org_id: null,
      cortex_max: true,
    }
    const updated = { ...existing, cortex_max: false }
    const query = makeBrainQuery({ existing, updated })
    const client = { from: vi.fn(() => query) }
    const service = new CustomerBrainService(new CustomerBrainRepository({ client } as any))

    await expect(
      service.setCustomerBrainEnabled({ ownerId: 'user-1', orgId: null, enabled: false }),
    ).resolves.toEqual(updated)

    expect(query.update).toHaveBeenCalledWith({ cortex_max: false })
    expect(query.eq).toHaveBeenCalledWith('id', 'brain-customer')
  })
})
