import { describe, expect, it, vi } from 'vitest'
import { CompanyCortexRepository } from '../../repositories/company-cortex.repository'

type QueryCall = {
  table: string
  action: string
  payload?: Record<string, unknown>
  filters?: Array<{ method: string; column: string; value: unknown }>
}

function makeSupabase(input: {
  existingBrain?: Record<string, unknown> | null
  createdBrain?: Record<string, unknown>
  calls: QueryCall[]
}) {
  const makeChain = (table: string) => {
    const filters: Array<{ method: string; column: string; value: unknown }> = []
    let pendingInsert: Record<string, unknown> | null = null
    const chain: Record<string, unknown> = {
      select() {
        input.calls.push({ table, action: 'select', filters: [...filters] })
        return chain
      },
      eq(column: string, value: unknown) {
        filters.push({ method: 'eq', column, value })
        return chain
      },
      is(column: string, value: unknown) {
        filters.push({ method: 'is', column, value })
        return chain
      },
      insert(payload: Record<string, unknown>) {
        pendingInsert = payload
        input.calls.push({ table, action: 'insert', payload, filters: [...filters] })
        return chain
      },
      async maybeSingle() {
        input.calls.push({ table, action: 'maybeSingle', filters: [...filters] })
        return { data: input.existingBrain ?? null, error: null }
      },
      async single() {
        input.calls.push({
          table,
          action: 'single',
          payload: pendingInsert ?? undefined,
          filters: [...filters],
        })
        return {
          data: input.createdBrain ?? {
            id: 'company-brain-created',
            owner_id: 'owner-1',
            org_id: 'org-1',
            scope: 'company',
            cortex_max: true,
          },
          error: null,
        }
      },
    }
    return chain
  }

  return { from: (table: string) => makeChain(table) }
}

async function loadCompanyCortexService() {
  const modulePath = '../company-cortex.service'
  const mod = await import(modulePath)
  expect(mod.CompanyCortexService).toBeTypeOf('function')
  return mod.CompanyCortexService as new (repository: CompanyCortexRepository) => {
    getOrCreateCompanyCortex(input: {
      ownerId: string
      orgId: string | null
    }): Promise<Record<string, unknown>>
  }
}

describe('CompanyCortexService contract', () => {
  it('resolves exactly one org-scoped Company Cortex brain by scope and org_id', async () => {
    const CompanyCortexService = await loadCompanyCortexService()
    const calls: QueryCall[] = []
    const supabase = makeSupabase({
      existingBrain: {
        id: 'company-brain-1',
        owner_id: 'owner-1',
        org_id: 'org-1',
        scope: 'company',
        cortex_max: true,
      },
      calls,
    })

    const service = new CompanyCortexService(
      new CompanyCortexRepository({ client: supabase } as any),
    )
    const result = await service.getOrCreateCompanyCortex({ ownerId: 'owner-1', orgId: 'org-1' })

    expect(result).toMatchObject({ id: 'company-brain-1', org_id: 'org-1', scope: 'company' })
    expect(calls.some((call) => call.table === 'ns_brains')).toBe(true)
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'ns_brains',
          action: 'maybeSingle',
          filters: expect.arrayContaining([
            { method: 'eq', column: 'scope', value: 'company' },
            { method: 'eq', column: 'org_id', value: 'org-1' },
          ]),
        }),
      ]),
    )
    expect(
      calls.some((call) =>
        call.filters?.some((filter) => filter.column === 'is_default' && filter.value === true),
      ),
    ).toBe(false)
  })

  it('creates a company-scoped brain when the org has none', async () => {
    const CompanyCortexService = await loadCompanyCortexService()
    const calls: QueryCall[] = []
    const supabase = makeSupabase({ existingBrain: null, calls })

    const service = new CompanyCortexService(
      new CompanyCortexRepository({ client: supabase } as any),
    )
    await service.getOrCreateCompanyCortex({ ownerId: 'owner-1', orgId: 'org-1' })

    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'ns_brains',
          action: 'insert',
          payload: expect.objectContaining({
            owner_id: 'owner-1',
            org_id: 'org-1',
            scope: 'company',
            is_default: false,
            cortex_max: true,
          }),
        }),
      ]),
    )
  })

  it('does not create a Company Cortex for personal-only scope', async () => {
    const CompanyCortexService = await loadCompanyCortexService()
    const calls: QueryCall[] = []
    const supabase = makeSupabase({ existingBrain: null, calls })
    const service = new CompanyCortexService(
      new CompanyCortexRepository({ client: supabase } as any),
    )

    await expect(
      service.getOrCreateCompanyCortex({ ownerId: 'owner-1', orgId: null }),
    ).rejects.toThrow(/org/i)
    expect(calls.some((call) => call.action === 'insert')).toBe(false)
  })

  it('does not route Company Cortex writes through campaign_nodes', async () => {
    const CompanyCortexService = await loadCompanyCortexService()
    const calls: QueryCall[] = []
    const supabase = makeSupabase({ existingBrain: null, calls })
    const service = new CompanyCortexService(
      new CompanyCortexRepository({ client: supabase } as any),
    )

    await service.getOrCreateCompanyCortex({ ownerId: 'owner-1', orgId: 'org-1' })

    expect(calls.some((call) => call.table === 'campaign_nodes')).toBe(false)
  })
})

void vi
